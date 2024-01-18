import {OrbitPipeline} from "./orbit-pipeline.js"
import {Matrix4} from "three";

const CUBE_VERTICES = [
    -1.0, -1.0, -1.0, 1.0, // triangle 1 : begin
    -1.0, -1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0, 1.0, // triangle 1 : end
    1.0, 1.0, -1.0, 1.0, // triangle 2 : begin
    -1.0, -1.0, -1.0, 1.0,
    -1.0, 1.0, -1.0, 1.0, // triangle 2 : end
    1.0, -1.0, 1.0, 1.0,
    -1.0, -1.0, -1.0, 1.0,
    1.0, -1.0, -1.0, 1.0,
    1.0, 1.0, -1.0, 1.0,
    1.0, -1.0, -1.0, 1.0,
    -1.0, -1.0, -1.0, 1.0,
    -1.0, -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0, 1.0,
    1.0, -1.0, 1.0, 1.0,
    -1.0, -1.0, 1.0, 1.0,
    -1.0, -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0, 1.0,
    -1.0, -1.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, -1.0, -1.0, 1.0,
    1.0, 1.0, -1.0, 1.0,
    1.0, -1.0, -1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, -1.0, 1.0,
    -1.0, 1.0, -1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 1.0,
];

const shaders = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texCoord : vec2f,
  @location(1) particleColor: vec4f,
}

struct ParticleInfo {
  @location(0) size: vec2f,
  @location(1) color: vec4f,
}

struct CameraData {
  view: mat4x4f,
  projection: mat4x4f,
}

struct UniformData {
  model: mat4x4f,
  camera: CameraData,
  canvasResolution: vec2f,
  particleSize: vec2f,
  particleColor: vec4f,
}

@group(0) @binding(0)
var<uniform> cameraData: CameraData;

@group(0) @binding(1)
var<storage, read> positions: array<vec3f>;

@group(0) @binding(2)
var<uniform> uniformData: UniformData;

@vertex
fn vertex_main(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32,
    particleInfo: ParticleInfo,
) -> VertexOut
{
  const points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1)
  );

  let pos = points[vertexIndex];
  let clipPos = cameraData.projection * cameraData.view * vec4f(positions[instanceIndex], 1.0);
  let pointPos = vec4f(pos * particleInfo.size / uniformData.canvasResolution, 0, 0);

  var output : VertexOut;
  output.position = clipPos + pointPos;
  output.texCoord = points[vertexIndex] * 0.5 + 0.5; //transform to [0, 1]
  output.particleColor = particleInfo.color;
  return output;
}

@group(0) @binding(3) var s: sampler;
@group(0) @binding(4) var t: texture_2d<f32>;

@fragment
fn fragment_main(vertexOut: VertexOut) -> @location(0) vec4f
{
  return vertexOut.particleColor * textureSample(t, s, vertexOut.texCoord);
}
`;


export class BillboardRenderPipeline {

    static UNIFORM_BUFFER_SIZE_IN_FLOATS = 16 // model: mat4f
        + 16 // view: mat4f TODO deprecated, remove
        + 16 // projection: mat4f TODO deprecated, remove
        + 2 // canvas resolution: vec2f
        + 2 // particle size: vec2f TODO deprecated (per particle size), remove here and from struct
        + 4; // particle color: vec2f TODO deprecated (per particle color), remove here and from struct


    static UNIFORM_BUFFER_SIZE = BillboardRenderPipeline.UNIFORM_BUFFER_SIZE_IN_FLOATS * 4;

    webGpuContext = undefined;

    shaderModule = undefined;
    renderPipeline = undefined;
    renderPassDescriptor = undefined;

    renderBindGroup = undefined;

    positionBuffer = undefined;

    uniformBuffer = undefined;
    uniformData = undefined;

    particleInfoBuffer = undefined;
    particleInfoData = undefined;

    defaultParticleSize = 20.0;
    defaultParticleColor = [1.0, 1.0, 1.0, 1.0];

    shouldUpdateBuffers = true;

    constructor(webGpuContext) {
        this.webGpuContext = webGpuContext;
        this.canvasElement = webGpuContext.canvasElement;
        this.canvasContext = webGpuContext.canvasContext;
    }

    async init(positionBuffer, cameraBuffer, particlePath, defaultParticleSize, defaultParticleColor) {
        this.defaultParticleSize = defaultParticleSize;
        this.defaultParticleColor = defaultParticleColor;

        this.shaderModule = this.webGpuContext.device.createShaderModule({
            code: shaders,
        });

        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        this.canvasContext.configure({
            device: this.webGpuContext.device,
            format: this.presentationFormat,
        });

        await this.initTexture(particlePath);
        this.initBuffers(positionBuffer, cameraBuffer);

        this.initRenderPipeline();
        this.initRenderPassDescriptor();
    }

    initBuffers(positionBuffer, cameraBuffer) {
        this.positionBuffer = positionBuffer;
        this.cameraBuffer = cameraBuffer;

        // each has size (2 floats a 4 bytes) and color (4 floats a 4 bytes)
        this.particleInfoBuffer = this.webGpuContext.device.createBuffer({
            label: "vertex buffer for particle info",
            size: 6 * 4 * OrbitPipeline.MAX_NUM_ORBITS,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.initParticleInfoVertexBuffer();

        this.uniformBuffer = this.webGpuContext.device.createBuffer({
            size: BillboardRenderPipeline.UNIFORM_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.uniformData = new Float32Array(BillboardRenderPipeline.UNIFORM_BUFFER_SIZE_IN_FLOATS);

        this.updateBuffers();
    }

    initRenderPipeline() {

        this.renderPipeline = this.webGpuContext.device.createRenderPipeline({
            label: "render pipeline",
            layout: "auto",
            vertex: {
                module: this.shaderModule,
                entryPoint: "vertex_main",
                buffers: [
                    {
                        stepMode: "instance",
                        arrayStride: 6 * 4,
                        attributes: [
                            {shaderLocation: 0, offset: 0, format: "float32x2"}, // size
                            {shaderLocation: 1, offset: 2 * 4, format: "float32x4"}, // color
                        ],
                    },
                ],
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: navigator.gpu.getPreferredCanvasFormat(),
                        blend: {
                            color: {
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add",
                            },
                            alpha: {
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add",
                            }
                        }
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        this.renderBindGroup = this.webGpuContext.device.createBindGroup({
            label: "render bind group",
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: this.cameraBuffer}},
                {binding: 1, resource: {buffer: this.positionBuffer}},
                {binding: 2, resource: {buffer: this.uniformBuffer}},
                {binding: 3, resource: this.textureSampler},
                {binding: 4, resource: this.texture.createView()},
            ],
        });
    }

    initRenderPassDescriptor() {
        const clearColor = {r: 0.0, g: 0.0, b: 0.0, a: 1.0};

        this.renderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.canvasContext.getCurrentTexture().createView(),
                },
            ],
        };
    }

    render(numInstances) {
        if (this.shouldUpdateBuffers) {
            this.updateBuffers();
            this.shouldUpdateBuffers = false;
        }

        this.renderPassDescriptor.colorAttachments[0].view = this.canvasContext.getCurrentTexture().createView();

        const commandEncoder = this.webGpuContext.device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(this.renderPassDescriptor);
        renderPass.setPipeline(this.renderPipeline);
        //renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.setVertexBuffer(0, this.particleInfoBuffer);
        renderPass.setBindGroup(0, this.renderBindGroup);
        //renderPass.draw(CUBE_VERTICES.length);
        renderPass.draw(6, numInstances);
        renderPass.end();

        this.webGpuContext.device.queue.submit([commandEncoder.finish()]);
    }

    updateBuffers() {
        const modelMatrixOffset = 0;
        const canvasResolutionOffset = 48;
        const particleSizeOffset = 50;
        const particleColorOffset = 52;

        const uniformData = this.uniformData;
        uniformData.set(new Matrix4().elements, modelMatrixOffset);
        uniformData.set([this.canvasElement.width, this.canvasElement.height], canvasResolutionOffset);
        uniformData.set([this.defaultParticleSize, this.defaultParticleSize], particleSizeOffset);
        uniformData.set(this.defaultParticleColor, particleColorOffset);

        this.webGpuContext.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
        this.webGpuContext.device.queue.writeBuffer(this.particleInfoBuffer, 0, this.particleInfoData);
    }
    async initTexture(texturePath) {

        const imageLoaded = new Promise((resolve, reject) => {
            const imageElement = new Image();
            imageElement.addEventListener("load", () => {
                resolve(imageElement);
            });
            imageElement.addEventListener("error", errorEvent => {
                reject(new Error("failed loading images: " + errorEvent.message));
            });
            imageElement.src = texturePath;
        });

        const imageElement = await imageLoaded;
        console.log("successfully loaded texture", texturePath);
        const context = new OffscreenCanvas(imageElement.width, imageElement.height).getContext("2d");
        context.drawImage(imageElement, 0, 0);

        this.texture = this.webGpuContext.device.createTexture({
            size: [imageElement.width, imageElement.height],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.webGpuContext.device.queue.copyExternalImageToTexture(
            {source: context.canvas, flipY: true},
            {texture: this.texture, premultipliedAlpha: true},
            [imageElement.width, imageElement.height],
        );

        this.textureSampler = this.webGpuContext.device.createSampler({
            minFilter: 'linear',
            magFilter: 'linear',
        });

    }

    /**
     * Sets size of particle.
     * @param index {number} particle index
     * @param size {number} particle size
     */
    setParticleSize(index, size) {
        const floatIndex = index * 6;
        this.particleInfoData.set([size, size], floatIndex);
        //this.webGpuContext.device.queue.writeBuffer(this.particleInfoBuffer, 4 * floatIndex, this.particleInfoData, floatIndex, 2);
        this.shouldUpdateBuffers = true;
    }

    /**
     * Sets particle color.
     * @param index {number} particle index
     * @param color {number[]} particle color as array of the form [r,g,b,a] where each element is between 0 and 1
     */
    setParticleColor(index, color) {
        const floatIndex = index * 6 + 2;
        this.particleInfoData.set(color, floatIndex);
        //this.webGpuContext.device.queue.writeBuffer(this.particleInfoBuffer, 4 * floatIndex, this.particleInfoData, floatIndex, 4);
        this.shouldUpdateBuffers = true;
    }

    initParticleInfoVertexBuffer() {
        this.particleInfoData = new Float32Array(OrbitPipeline.MAX_NUM_ORBITS * 6).fill(0.5);
        const defaultParticleSize = this.defaultParticleSize;
        const defaultParticleColor = this.defaultParticleColor;
        for (let index = 0; index < OrbitPipeline.MAX_NUM_ORBITS; index++) {
            const floatIndex = index * 6;
            const sizeAndColor = [defaultParticleSize, defaultParticleSize, ...defaultParticleColor];
            this.particleInfoData.set(sizeAndColor, floatIndex);
        }
        this.webGpuContext.device.queue.writeBuffer(this.particleInfoBuffer, 0, this.particleInfoData);
    }

}

