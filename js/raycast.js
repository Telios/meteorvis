
const shader = `

struct Hit {
    minT: atomic<u32>,
    index: u32,
}

@group(0) @binding(0)
var<storage, read> positions: array<vec3u>;

@group(0) @binding(1)
var<storage, read_write> hit: Hit;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) global_id : vec3u
) {
  if (global_id.x == 0) {
    atomicStore(&hit.minT, 4294967295);
  }
  storageBarrier();
  //let t = positions[global_id.x].x;
  let t = 100;
  atomicMin(&hit.minT, t);
  storageBarrier();
  let minT = atomicLoad(&hit.minT);
  if (minT == t) {
    hit.index = global_id.x;
  }
}`;

class RaycastPipeline {

    BYTES_PER_HIT = 2 * 4;

    webgpuContext = undefined;
    positionsBuffer = undefined;
    outputBuffer = undefined;

    numHits = 1;

    constructor(webgpuContext) {
        this.webgpuContext = webgpuContext;
    }

    init(positionsBuffer) {
        this.positionsBuffer = positionsBuffer;
        this.outputBuffer = this.webgpuContext.device.createBuffer({
            label: "raycast output buffer",
            size: this.numHits * this.BYTES_PER_HIT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });

        this.outputStagingBuffer = this.webgpuContext.device.createBuffer({
            label: "raycast output staging buffer",
            size: this.numHits * this.BYTES_PER_HIT,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        const orbitPipelineBindingToBufferInfo = {
            0: {type: "read-only-storage", buffer: this.positionsBuffer},
            1: {type: "storage", buffer: this.outputBuffer},
        };
        this.pipelineInfo = this.webgpuContext.createComputePipeline(orbitPipelineBindingToBufferInfo, shader);
    }

    resetOutputBuffer() {
        const outputBufferInitialData = new Uint32Array(2);
        outputBufferInitialData.set([Number.MAX_SAFE_INTEGER, 0], 0);
        this.webgpuContext.device.queue.writeBuffer(this.outputBuffer, 0, outputBufferInitialData);
    }

    run() {
        this.webgpuContext.encodeAndSubmitCommands(this.pipelineInfo, 64,
            this.outputBuffer, this.outputStagingBuffer, this.numHits * this.BYTES_PER_HIT);
    }

    async readBackData() {
        const size = this.numHits * this.BYTES_PER_HIT;
        await this.outputStagingBuffer.mapAsync(GPUMapMode.READ, 0, size);
        const copyArrayBuffer = this.outputStagingBuffer.getMappedRange(0, size);
        const data = copyArrayBuffer.slice();
        this.outputStagingBuffer.unmap();
        const typedData = new Uint32Array(data);
        return {minT: typedData[0], index: typedData[1]};
    }

}

export async function testRaycast(webgpuContext) {

    const numEntries = 10000;
    const testBuffer = webgpuContext.device.createBuffer({
        label: "test buffer",
        size: numEntries * 4 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const testValues = new Uint32Array(numEntries * 4);
    let min = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < numEntries; i += 4) {
        const value = Math.ceil(Math.random() * 10000000);
        testValues[i] = value;
        testValues[i+1] = 5;
        testValues[i+2] = 6;
        testValues[i+3] = 7;
        min = Math.min(min, value);
    }
    console.log("test values", testValues);
    console.log("min: ", min);

    webgpuContext.device.queue.writeBuffer(testBuffer, 0, testValues, 0, testValues.length);
    await webgpuContext.device.queue.onSubmittedWorkDone(); //wait until current queue is done


    const raycastPipeline = new RaycastPipeline(webgpuContext);
    raycastPipeline.init(testBuffer);
    raycastPipeline.resetOutputBuffer();
    raycastPipeline.run();
    const result = await raycastPipeline.readBackData();
    console.log(result);
}