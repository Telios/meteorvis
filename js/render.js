import {WebGpuContext} from "./webgpu-context.js";
import {OrbitPipeline} from "./orbit-pipeline.js";
import {OrbitControls} from "./orbit-controls.js";

import * as THREE from "three";

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

struct UniformData {
  model: mat4x4f,
  view: mat4x4f,
  projection: mat4x4f,
  
  canvasResolution: vec2f,
  particleSize: vec2f,
  particleColor: vec4f,
}

@group(0) @binding(0)
var<storage, read> positions: array<vec3f>;

@group(0) @binding(1)
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
  let clipPos = uniformData.projection * uniformData.view * vec4f(positions[instanceIndex], 1.0);
  let pointPos = vec4f(pos * particleInfo.size / uniformData.canvasResolution, 0, 0);

  var output : VertexOut;
  output.position = clipPos + pointPos;
  output.texCoord = points[vertexIndex] * 0.5 + 0.5; //transform to [0, 1]
  output.particleColor = particleInfo.color;
  return output;
}

@group(0) @binding(2) var s: sampler;
@group(0) @binding(3) var t: texture_2d<f32>;

@fragment
fn fragment_main(vertexOut: VertexOut) -> @location(0) vec4f
{
  return vertexOut.particleColor * textureSample(t, s, vertexOut.texCoord);
}
`;

// using three.js math classes and inspired by three.js PerspectiveCamera class
class Camera {
    // 3 mat4x4 (16 floats, 4 bytes each) and 2 vec2 (each 2 floats, 4 bytes each)
    static UNIFORM_BUFFER_SIZE = 16 * 4 * 3
        + 2 * 2 * 4
        + 4 * 4; // 1 vec4 (4 floats, 4 bytes each)

    near = 0.01;
    far = 100;
    zoom = 1;
    fov = 40; //in degrees
    aspect = 1;

    position = new THREE.Vector3(0.0, 0.0, 0.0);
    rotation = new THREE.Quaternion().identity();
    projection = new THREE.Matrix4();

    constructor() {
        this.updateProjectionMatrix();
    }

    updateProjectionMatrix() {
        const near = this.near;
        const top = near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * this.fov) / this.zoom;
        const height = 2 * top;
        const width = this.aspect * height;
        const left = -0.5 * width;
        this.projection.makePerspective(left, left + width, top, top - height, near, this.far, THREE.WebGPUCoordinateSystem);
    }

    getViewMatrix() {
        const result = new THREE.Matrix4().makeRotationFromQuaternion(this.rotation);
        result.setPosition(this.position.x, this.position.y, this.position.z);
        result.invert(); //TODO very expensive, dont do this (but oh well)
        return result;
    }

    getProjectionMatrix() {
        return this.projection;
    }
}

class RenderPipeline {

    webGpuContext = undefined;

    shaderModule = undefined;
    renderPipeline = undefined;
    renderPassDescriptor = undefined;

    positionStorageBuffer = undefined;
    uniformBuffer = undefined;
    renderBindGroup = undefined;

    particleInfoVertexBuffer = undefined;

    defaultParticleSize = 20.0;
    defaultParticleColor = [1.0, 1.0, 1.0, 1.0];

    particleInfos = [];

    constructor(webGpuContext) {
        this.webGpuContext = webGpuContext;
        this.canvasElement = webGpuContext.canvasElement;
        this.canvasContext = webGpuContext.canvasContext;
    }

    async init(positionStorageBuffer) {
        this.camera = new Camera();
        this.camera.position.z = 5;

        this.shaderModule = this.webGpuContext.device.createShaderModule({
            code: shaders,
        });

        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        this.canvasContext.configure({
            device: this.webGpuContext.device,
            format: this.presentationFormat,
        });


        await this.initTexture("data/meteor_texture.png");
        this.initBuffers(positionStorageBuffer);

        this.initRenderPipeline();
        this.initRenderPassDescriptor();
    }

    initBuffers(positionStorageBuffer) {
        this.positionStorageBuffer = positionStorageBuffer;
        /*const bufferSize = 4 * 4 * CUBE_VERTICES.length; //3 vec3 (4 floats each, each float 4 bytes each)
        this.positionStorageBuffer = this.computeContext.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        const positionData = new Float32Array(bufferSize / 4);
        positionData.set(CUBE_VERTICES);

        this.computeContext.device.queue.writeBuffer(
            this.positionStorageBuffer, 0, positionData, 0, positionData.length
        );*/

        // per orbit 1 size (vec2f, 2 floats a 4 bytes)
        /*this.sizesVertexBuffer = this.webGpuContext.device.createBuffer({
            label: "vertex buffer for sizes",
            size: 4 * 2 * OrbitPipeline.MAX_NUM_ORBITS,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.initSizes();*/

        // per orbit 1 color (vec4f, 4 floats a 4 bytes)
        /*this.colorsVertexBuffer = this.webGpuContext.device.createBuffer({
            label: "vertex buffer for colors",
            size: 4 * 4 * OrbitPipeline.MAX_NUM_ORBITS,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.initColors();*/

        // each has size (2 floats a 4 bytes) and color (4 floats a 4 bytes)
        this.particleInfoVertexBuffer = this.webGpuContext.device.createBuffer({
            label: "vertex buffer for particle info",
            size: 6 * 4 * OrbitPipeline.MAX_NUM_ORBITS,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.initParticleInfoVertexBuffer();

        this.uniformBuffer = this.webGpuContext.device.createBuffer({
            size: Camera.UNIFORM_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.updateUniforms();
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
                {binding: 0, resource: {buffer: this.positionStorageBuffer}},
                {binding: 1, resource: {buffer: this.uniformBuffer}},
                {binding: 2, resource: this.textureSampler},
                {binding: 3, resource: this.texture.createView()},
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
        this.renderPassDescriptor.colorAttachments[0].view = this.canvasContext.getCurrentTexture().createView();

        const commandEncoder = this.webGpuContext.device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(this.renderPassDescriptor);
        renderPass.setPipeline(this.renderPipeline);
        //renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.setVertexBuffer(0, this.particleInfoVertexBuffer);
        renderPass.setBindGroup(0, this.renderBindGroup);
        //renderPass.draw(CUBE_VERTICES.length);
        renderPass.draw(6, numInstances);
        renderPass.end();

        this.webGpuContext.device.queue.submit([commandEncoder.finish()]);
    }

    updateUniforms() {
        //TODO move to camera
        const uniformData = new Float32Array(Camera.UNIFORM_BUFFER_SIZE / 4);
        const modelMatrixOffset = 0;
        const viewMatrixOffset = 16;
        const projectionMatrixOffset = 32;
        const canvasResolutionOffset = 48;
        const particleSizeOffset = 50;
        const particleColorOffset = 52;

        uniformData.set(new THREE.Matrix4().elements, modelMatrixOffset);
        uniformData.set(this.camera.getViewMatrix().elements, viewMatrixOffset);
        uniformData.set(this.camera.getProjectionMatrix().elements, projectionMatrixOffset);
        uniformData.set([this.canvasElement.width, this.canvasElement.height], canvasResolutionOffset);
        uniformData.set([this.defaultParticleSize, this.defaultParticleSize], particleSizeOffset);
        uniformData.set(this.defaultParticleColor, particleColorOffset);

        this.webGpuContext.device.queue.writeBuffer(
            this.uniformBuffer, 0, uniformData, 0, uniformData.length
        );
    }

    async initTexture(texturePath = "data/meteor_texture.png") {

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
        this.particleInfos.set([size, size], 6 * index);
        this.webGpuContext.device.queue.writeBuffer(this.particleInfoVertexBuffer, 4 * floatIndex, this.particleInfos, floatIndex, 2);
    }

    /**
     * Sets particle color.
     * @param index {number} particle index
     * @param color {number[]} particle color as array of the form [r,g,b,a] where each element is between 0 and 1
     */
    setParticleColor(index, color) {
        const floatIndex = index * 6 + 2;
        this.particleInfos.set(color, floatIndex);
        this.webGpuContext.device.queue.writeBuffer(this.particleInfoVertexBuffer, 4 * floatIndex, this.particleInfos, floatIndex, 4);
    }

    initParticleInfoVertexBuffer() {
        this.particleInfos = new Float32Array(OrbitPipeline.MAX_NUM_ORBITS * 6).fill(0.5);
        const defaultParticleSize = this.defaultParticleSize;
        const defaultParticleColor = this.defaultParticleColor;
        for (let index = 0; index < OrbitPipeline.MAX_NUM_ORBITS; index++) {
            const floatIndex = index * 6;
            const sizeAndColor = [defaultParticleSize, defaultParticleSize, ...defaultParticleColor];
            this.particleInfos.set(sizeAndColor, floatIndex);
        }
        this.webGpuContext.device.queue.writeBuffer(this.particleInfoVertexBuffer, 0, this.particleInfos);
    }

}


class Engine {
    canvasElement = undefined;
    webGpuContext = undefined;

    renderPipeline = undefined;
    orbitPipeline = undefined;

    orbits = [];

    async init(canvasElement) {

        this.webGpuContext = new WebGpuContext();
        await this.webGpuContext.init(canvasElement);

        console.log(this.webGpuContext.device.limits);

        this.orbitPipeline = new OrbitPipeline(this.webGpuContext);
        await this.orbitPipeline.init(this.webGpuContext);

        this.renderPipeline = new RenderPipeline(this.webGpuContext);
        await this.renderPipeline.init(this.orbitPipeline.outputBuffer);

        this.webGpuContext.addCanvasResizeListener((w, h) => this.onCanvasResize(w, h));
        this.onCanvasResize(canvasElement.width, canvasElement.height);
    }

    onCanvasResize(width, height) {
        this.renderPipeline.camera.aspect = width / height;
        this.renderPipeline.camera.updateProjectionMatrix();
        this.renderPipeline.updateUniforms();
        console.log("canvas resized, new width=", width, ", new height=", height);
    }

    async update(deltaTime) {
        this.orbitControls.update(deltaTime);
        this.renderPipeline.updateUniforms();
        await this.orbitPipeline.runOrbitPipeline();
    }

    render() {
        this.renderPipeline.render(this.orbits.length);
    }

    async uploadOrbitsToGpu() {
        await this.orbitPipeline.uploadOrbits(this.orbits); //TODO only upload orbits that changed since last time
    }

    setOrbits(orbits) {
        this.orbits = orbits;
    }

    addOrbit(orbit) {
        this.orbits.push(orbit);
        return this.orbits.length - 1;
    }

    async run() {

        //TODO move this somewhere else
        this.orbitControls = new OrbitControls(this.webGpuContext.canvasElement, this.renderPipeline.camera);

        //TODO performance display to extra class
        const frameTimeDisplayElement = document.getElementById("perfDisplayFrameTime");
        const fpsDisplayElement = document.getElementById("perfDisplayFps");
        const fpsDisplayUpdatePeriod = 1000;

        const updateFpsDisplay = (numFrames, duration) => {
            fpsDisplayElement.innerHTML = (numFrames * 1000 / duration).toFixed(1);
            frameTimeDisplayElement.innerHTML = (1000 / numFrames).toFixed(1);
        };

        let framesSinceLastUpdate = 0;
        let lastTime = 0;
        let lastUpdateTime = 0;
        const renderCall = (time) => {
            const deltaTime = time - lastTime;

            this.update(deltaTime);
            this.render();

            const timeSinceLastUpdate = time - lastUpdateTime;
            if (timeSinceLastUpdate > fpsDisplayUpdatePeriod) {
                updateFpsDisplay(framesSinceLastUpdate, timeSinceLastUpdate);
                lastUpdateTime = time;
                framesSinceLastUpdate = 0;
            }
            framesSinceLastUpdate++;
            lastTime = time;

            requestAnimationFrame(renderCall);
        }

        renderCall();
    }

}

export async function testRender(orbits) {

    console.log("orbits: ", orbits);

    const mainContainer = document.getElementById("mainContainer");

    const engine = new Engine();
    await engine.init(mainContainer);

    console.log("upload orbit data...");
    const uploadStartTime = performance.now();
    engine.setOrbits(orbits);
    await engine.uploadOrbitsToGpu();
    await engine.webGpuContext.device.queue.onSubmittedWorkDone(); //wait until current queue is done
    const uploadEndTime = performance.now();
    console.log("...done in ", (uploadEndTime - uploadStartTime), "ms");

    engine.renderPipeline.numOrbits = orbits.length;

    await engine.run();

}