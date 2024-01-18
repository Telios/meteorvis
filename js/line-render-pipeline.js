import {Matrix4} from "three";


export class LineRenderer {

}

const shader = `

struct UniformData {
    model: mat4x4f,
}

struct CameraData {
  view: mat4x4f,
  projection: mat4x4f,
}

struct VertexIn {
  position: vec3f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  color: vec4f,
}


@group(0) @binding(0)
var<uniform> cameraData: CameraData;

@group(0) @binding(1)
var<uniform> model: UniformData;

@vertex
fn vertex_main(vertexIn: VertexIn) -> VertexOut {
  var out: VertexOut;
  out.position = cameraData.projection * cameraData.view * uniformData.model * vertexIn.position;
  out.color = vec4f(1.0, 0.0, 1.0, 1.0);
 
}

@fragment
fn fragment_main(vertexOut: VertexOut) -> @location(0) vec4f
{
  
}

`;
export class LineRenderPipeline {
    static UNIFORM_BUFFER_SIZE_IN_FLOATS = 16; //model matrix
    static UNIFORM_BUFFER_SIZE_IN_BYTES = LineRenderPipeline.UNIFORM_BUFFER_SIZE_IN_FLOATS * 4;

    webgpuContext = undefined;

    shaderModule = undefined;
    renderPipeline = undefined;
    renderBindGroup = undefined;

    cameraBuffer;

    uniformBuffer;

    lineObjects = [];

    constructor(webgpuContext) {
        this.webgpuContext = webgpuContext;
    }

    init(cameraBuffer) {
        this.initBuffers(cameraBuffer);
        this.initRenderPipeline();
        this.initRenderPassDescriptor();
    }

    initBuffers(cameraBuffer) {
        this.cameraBuffer = cameraBuffer;

        this.uniformBuffer = this.webGpuContext.device.createBuffer({
            label: "buffer for uniform data of line render pipeline",
            size: LineRenderPipeline.UNIFORM_BUFFER_SIZE_IN_BYTES,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.uniformBufferData = new Float32Array(LineRenderPipeline.UNIFORM_BUFFER_SIZE_IN_FLOATS);
        this.uniformBufferData.set(new Matrix4().indentity());
    }

    initRenderPipeline() {
        this.shaderModule = this.webgpuContext.device.createShaderModule({
            code: shader,
        });

        this.renderPipeline = this.webgpuContext.device.createRenderPipeline({
            label: "line render pipeline",
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

        this.renderBindGroup = this.webgpuContext.device.createBindGroup({
            label: "bind group for line render pipeline",
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: this.cameraBuffer}},
                {binding: 1, resource: {buffer: this.uniformBuffer}},
            ],
        });
    }

    initRenderPassDescriptor() {
        const clearColor = {r: 0.0, g: 0.0, b: 0.0, a: 1.0};

        this.renderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: clearColor,
                    loadOp: "load",
                    storeOp: "store",
                    view: this.canvasContext.getCurrentTexture().createView(),
                },
            ],
        };
    }

    render() {
        this.renderPassDescriptor.colorAttachments[0].view = this.canvasContext.getCurrentTexture().createView();

        const commandEncoder = this.webGpuContext.device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(this.renderPassDescriptor);
        renderPass.setPipeline(this.renderPipeline);
        renderPass.setVertexBuffer(0, this.particleInfoBuffer);
        renderPass.setBindGroup(0, this.renderBindGroup);
        let currentOffset = 0;
        for (const lineObject of this.lineObjects) {
            const length = lineObject.length
            renderPass.draw(length, lineObject.offset);
            currentOffset += length;

        }
        renderPass.end();

        this.webGpuContext.device.queue.submit([commandEncoder.finish()]);
    }



}

class LineObject {
    numPoints

}