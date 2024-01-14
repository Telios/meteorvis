import {WebGpuContext} from "./webgpu-context";

const BUFFER_SIZE = 1000;

const shaderCode = `

@group(0) @binding(0)
var<storage, read> input: array<f32>;

@group(0) @binding(1)
var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) global_id : vec3u,
  @builtin(local_invocation_id) local_id : vec3u
) {
  if (global_id.x >= ${BUFFER_SIZE}) {
    return;
  }
  
  output[global_id.x] = input[global_id.x] * 10.0;
}`;

export class TestPipeline {
    computeContext = undefined;

    inputStagingBuffer = undefined;
    inputBuffer = undefined;
    outputBuffer = undefined;
    stagingBuffer = undefined;

    testPipeline = undefined;

    constructor(computeContext) {
        this.computeContext = computeContext;
    }

    async init() {
        await this.initBuffers();
        await this.initPipeline();
    }

    async initBuffers() {
        // test pipeline buffers
        this.inputStagingBuffer = this.computeContext.device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
        });
        this.inputBuffer = this.computeContext.device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.outputBuffer = this.computeContext.device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });
        this.stagingBuffer = this.computeContext.device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    async initPipeline() {
        const bindingNumberToBufferInfo = {
            0: {
                type: "read-only-storage",
                buffer: this.inputBuffer,
            },
            1: {
                type: "storage",
                buffer: this.outputBuffer,
            },
        };
        this.testPipeline = this.computeContext.createComputePipeline(bindingNumberToBufferInfo, shaderCode);
    }

    async uploadInputData() {
        await this.updateInputStagingBuffer();
        await this.updateInputBuffer();
    }

    async runTestPipeline() {
        this.computeContext.encodeAndSubmitCommands(this.testPipeline, Math.ceil(BUFFER_SIZE / 64),
            this.outputBuffer, this.stagingBuffer, BUFFER_SIZE);
        await this.readBack();
    }

    async readBack() {
        await this.stagingBuffer.mapAsync(
            GPUMapMode.READ,
            0,
            BUFFER_SIZE,
        );

        const copyArrayBuffer = this.stagingBuffer.getMappedRange(0, BUFFER_SIZE);
        const data = copyArrayBuffer.slice();
        this.stagingBuffer.unmap();
        console.log(new Float32Array(data));
    }

    async updateInputStagingBuffer() {
        await this.inputStagingBuffer.mapAsync(
            GPUMapMode.WRITE,
            0,
            BUFFER_SIZE,
        );

        const arrayBuffer = this.inputStagingBuffer.getMappedRange(0, BUFFER_SIZE);
        const float32Array = new Float32Array(arrayBuffer);

        for (let i = 0; i < float32Array.length; i++) {
            float32Array[i] = i;
        }

        this.inputStagingBuffer.unmap();
    }

    async updateInputBuffer() {
        const commandEncoder = this.computeContext.device.createCommandEncoder();

        commandEncoder.copyBufferToBuffer(
            this.inputStagingBuffer,
            0,
            this.inputBuffer,
            0,
            BUFFER_SIZE,
        );

        this.computeContext.device.queue.submit([commandEncoder.finish()]);
    }
}

async function testComputePipeline() {
    const computeContext = new WebGpuContext();
    await computeContext.init();

    const computeTest = new TestPipeline(computeContext);
    await computeTest.init();
    await computeTest.uploadInputData();
    await computeTest.runTestPipeline();
}
