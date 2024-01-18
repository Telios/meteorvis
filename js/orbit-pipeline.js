import {WebGpuContext} from "./webgpu-context.js";

const SCALE_FACTOR = 1.0;

// ported to webGPU from spacekit's KeplerParticle shader
function getOrbitShaderCode() {
    return `
const PARABOLIC_K = 0.01720209895;

struct Orbit {
    a: f32,
    e: f32,
    i: f32,
    om: f32,
    wBar: f32,
    M: f32,
    q: f32,
    a0: f32,
    
    tp: f32, //used for parabolic
    epoch: f32, //used for ellipsoid/hyperbolic
    ma: f32, //used for ellipsoid/hyperbolic
    n: f32, //used for ellipsoid/hyperbolic
};

@group(0) @binding(0)
var<storage, read> orbits: array<Orbit>;

@group(0) @binding(1)
var<storage, read_write> output: array<vec3<f32>>;

@group(0) @binding(2)
var<storage, read> m_or_a0: array<f32>;

@group(0) @binding(3)
var<uniform> jd: f32;

/**
 * Math helper functions, cosh, tanh and sinh are built-in functions in wgsl
 */
// COSH Function (Hyperbolic Cosine)
fn cosh(val: f32) -> f32 {
  let tmp = exp(val);
  let cosH = (tmp + 1.0 / tmp) / 2.0;
  return cosH;
}

// TANH Function (Hyperbolic Tangent)
fn tanh(val: f32) -> f32 {
  let tmp = exp(val);
  let tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);
  return tanH;
}

// SINH Function (Hyperbolic Sine)
fn sinh(val: f32) -> f32 {
  let tmp = exp(val);
  let sinH = (tmp - 1.0 / tmp) / 2.0;
  return sinH;
}

// Cube root helper that assumes param is positive
fn cbrt(x: f32) -> f32 {
    return exp(log(x) / 3.0);
}

/**
 * Functions for calculating time-dependent values.
 */
fn getA0(tp: f32, e: f32, q: f32, jd: f32) -> f32 {
    let d = jd - tp;
    return 0.75 * d * PARABOLIC_K * sqrt((1 + e) / (q * q * q));
}

fn getM(epoch: f32, n: f32, ma: f32, jd: f32) -> f32 {
    let d = jd - epoch;
    return ma + n * d;
}

/**
 * Functions for calculating positions for specific orbit types.
 */
fn getPosNearParabolic(global_id: u32, jd: f32) -> vec3<f32> {
    let orbit = orbits[global_id];
    let e = orbit.e;
    let q = orbit.q;
    let i = orbit.i;
    let om = orbit.om;
    let wBar = orbit.wBar;

    //let a0 = m_or_a0[global_id];
    let tp = orbit.tp;
    let a0 = getA0(tp, e, q, jd);

    // See https://stjarnhimlen.se/comp/ppcomp.html#17
    let b = sqrt(1.0 + a0 * a0);
    let W = cbrt(b + a0) - cbrt(b - a0);
    let f = (1.0 - e) / (1.0 + e);

    let a1 = 2.0 / 3.0 + (2.0 / 5.0) * W * W;
    let a2 = 7.0 / 5.0 + (33.0 / 35.0) * W * W + (37.0 / 175.0) * pow(W, 4.0);
    let a3 = W * W * (432.0 / 175.0 + (956.0 / 1125.0) * W * W + (84.0 / 1575.0) * pow(W, 4.0));

    let C = (W * W) / (1.0 + W * W);
    let g = f * C * C;
    let w = W * (1.0 + f * C * (a1 + a2 * g + a3 * g * g));

    // True anomaly
    let v = 2.0 * atan(w);
    // Heliocentric distance
    let r = (q * (1.0 + w * w)) / (1.0 + w * w * f);

    // Compute heliocentric coords.
    let i_rad = i;
    let o_rad = om;
    let p_rad = wBar;
    let X = r * (cos(o_rad) * cos(v + p_rad - o_rad) - sin(o_rad) * sin(v + p_rad - o_rad) * cos(i_rad));
    let Y = r * (sin(o_rad) * cos(v + p_rad - o_rad) + cos(o_rad) * sin(v + p_rad - o_rad) * cos(i_rad));
    let Z = r * (sin(v + p_rad - o_rad) * sin(i_rad));
    return vec3(X, Y, Z);
}

fn getPosHyperbolic(global_id: u32, jd: f32) -> vec3<f32> {
    let orbit = orbits[global_id];
    let e = orbit.e;
    let a = orbit.a;
    let i = orbit.i;
    let om = orbit.om;
    let wBar = orbit.wBar;
    
    //let M = m_or_a0[global_id];
    let epoch = orbit.epoch;
    let n = orbit.n;
    let ma = orbit.ma;
    let M = getM(epoch, n, ma, jd);
    
    var F0 = M;
    for (var count = 0; count < 100; count++) {
        let F1 = (M + e * (F0 * cosh(F0) - sinh(F0))) / (e * cosh(F0) - 1.0);
        let lastdiff = abs(F1 - F0);
        F0 = F1;

        if (lastdiff < 0.0000001) {
            break;
        }
    }
    let F = F0;

    let v = 2.0 * atan(sqrt((e + 1.0) / (e - 1.0))) * tanh(F / 2.0);
    let r = ${SCALE_FACTOR} * (a * (1.0 - e * e)) / (1.0 + e * cos(v));

    // Compute heliocentric coords.
    let i_rad = i;
    let o_rad = om;
    let p_rad = wBar;
    let X = r * (cos(o_rad) * cos(v + p_rad - o_rad) - sin(o_rad) * sin(v + p_rad - o_rad) * cos(i_rad));
    let Y = r * (sin(o_rad) * cos(v + p_rad - o_rad) + cos(o_rad) * sin(v + p_rad - o_rad) * cos(i_rad));
    let Z = r * (sin(v + p_rad - o_rad) * sin(i_rad));
    return vec3(X, Y, Z);
}

fn getPosEllipsoid(global_id: u32, jd: f32) -> vec3<f32> {
    let orbit = orbits[global_id];
    let i = orbit.i;
    let om = orbit.om;
    let wBar = orbit.wBar;
    let e = orbit.e;
    let a = orbit.a;
    
    //let M = m_or_a0[global_id];
    let epoch = orbit.epoch;
    let n = orbit.n;
    let ma = orbit.ma;
    let M = getM(epoch, n, ma, jd);
    
    let i_rad = i;
    let o_rad = om;
    let p_rad = wBar;

    // Estimate eccentric and true anom using iterative approximation (this is normally an intergral).
    var E0 = M;
    var E1 = M + e * sin(E0);
    var lastdiff = abs(E1-E0);
    E0 = E1;

    for (var count = 0; count < 100; count++) {
        E1 = M + e * sin(E0);
        lastdiff = abs(E1-E0);
        E0 = E1;
        if (lastdiff < 0.0000001) {
            break;
        }
    }

    let E = E0;
    let v = 2.0 * atan(sqrt((1.0+e)/(1.0-e)) * tan(E/2.0));

    // Compute radius vector.
    let r = ${SCALE_FACTOR} * a * (1.0 - e * e) / (1.0 + e * cos(v));

    // Compute heliocentric coords.
    let X = r * (cos(o_rad) * cos(v + p_rad - o_rad) - sin(o_rad) * sin(v + p_rad - o_rad) * cos(i_rad));
    let Y = r * (sin(o_rad) * cos(v + p_rad - o_rad) + cos(o_rad) * sin(v + p_rad - o_rad) * cos(i_rad));
    let Z = r * (sin(v + p_rad - o_rad) * sin(i_rad));
    return vec3(X, Y, Z);
}

fn getPos(global_id: u32, jd: f32) -> vec3<f32> {
    let e = orbits[global_id].e;
    if (e > 0.9 && e < 1.2) {
        return getPosNearParabolic(global_id, jd);
    } else if (e > 1.2) {
        return getPosHyperbolic(global_id, jd);
    }
    return getPosEllipsoid(global_id, jd);
}

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) global_id : vec3u
) {
  if (global_id.x >= ${OrbitPipeline.MAX_NUM_ORBITS}) {
    return;
  }
  output[global_id.x] = getPos(global_id.x, jd);
}`;
}


export class OrbitPipeline {
    static FLOATS_PER_ORBIT = 12;
    static BYTES_PER_ORBIT = OrbitPipeline.FLOATS_PER_ORBIT * 4; // 8 floats in orbit struct, 4 bytes per float
    static BYTES_PER_POSITION = 4 * 4; //vec3 has 3 floats, but is aligned to next power of 2 (-> 16)
    static MAX_NUM_ORBITS = 1400000;
    static MAX_ORBIT_INPUT_BUFFER_SIZE_IN_BYTES = OrbitPipeline.MAX_NUM_ORBITS * OrbitPipeline.BYTES_PER_ORBIT;
    static MAX_ORBIT_OUTPUT_BUFFER_SIZE_IN_BYTES = OrbitPipeline.MAX_NUM_ORBITS * OrbitPipeline.BYTES_PER_POSITION; // vec3, 4 byte per float
    static UNIFORM_BUFFER_SIZE_IN_FLOATS = 1;
    static UNIFORM_BUFFER_SIZE_IN_BYTES = OrbitPipeline.UNIFORM_BUFFER_SIZE_IN_FLOATS * 4;

    computeContext = undefined;

    inputStagingBuffer = undefined;
    inputBuffer = undefined;
    outputBuffer = undefined;
    outputStagingBuffer = undefined;
    mOrA0Buffer = undefined;

    jdBuffer = undefined;
    jdData = undefined;

    pipeline = undefined;

    ephems = [];
    orbits = [];
    mOrA0Data = [];

    constructor(computeContext) {
        this.computeContext = computeContext;
        console.log("max uniform buffer size: ", this.computeContext.device.limits.maxUniformBufferBindingSize);
        console.log("max storage buffer size: ", this.computeContext.device.limits.maxStorageBufferBindingSize);
    }

    async init() {
        await this.initBuffers();
        await this.initPipeline();
    }

    async initBuffers() {
        // orbit pipeline buffers
        this.inputStagingBuffer = this.computeContext.device.createBuffer({
            label: "input staging bfufer for orbit compute shader",
            size: OrbitPipeline.MAX_ORBIT_INPUT_BUFFER_SIZE_IN_BYTES,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
        });
        this.inputBuffer = this.computeContext.device.createBuffer({
            label: "input buffer for orbit compute shader",
            size: OrbitPipeline.MAX_ORBIT_INPUT_BUFFER_SIZE_IN_BYTES,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.outputBuffer = this.computeContext.device.createBuffer({
            label: "output buffer for orbit compute shader",
            size: OrbitPipeline.MAX_ORBIT_OUTPUT_BUFFER_SIZE_IN_BYTES,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });
        this.outputStagingBuffer = this.computeContext.device.createBuffer({
            label: "output staging buffer for orbit compute shader",
            size: OrbitPipeline.MAX_ORBIT_OUTPUT_BUFFER_SIZE_IN_BYTES,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        this.mOrA0Buffer = this.computeContext.device.createBuffer({
            label: "array for a0 or m",
            size: OrbitPipeline.MAX_NUM_ORBITS * 4, //4 bytes per float
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.mOrA0Data = new Float32Array(OrbitPipeline.MAX_NUM_ORBITS).fill(0);
        this.updateMOrA0Buffer();

        this.jdBuffer = this.computeContext.device.createBuffer({
            label: "uniform buffer for jd",
            size: OrbitPipeline.UNIFORM_BUFFER_SIZE_IN_BYTES,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.jdData = new Float32Array(OrbitPipeline.UNIFORM_BUFFER_SIZE_IN_FLOATS).fill(0);
    }

    async initPipeline() {
        const orbitPipelineBindingToBufferInfo = {
            0: {type: "read-only-storage", buffer: this.inputBuffer},
            1: {type: "storage", buffer: this.outputBuffer},
            2: {type: "read-only-storage", buffer: this.mOrA0Buffer},
            3: {type: "uniform", buffer: this.jdBuffer},
        };
        this.pipeline = this.computeContext.createComputePipeline(orbitPipelineBindingToBufferInfo, getOrbitShaderCode());
    }

    async uploadOrbits(spaceObjects) {
        this.ephems = spaceObjects.map(obj => obj.Ephemeris);
        this.orbits = spaceObjectsToEphemeris(spaceObjects);
        await this.copyOrbitsArrayToStagingBuffer();
        await this.copyOrbitStagingBufferToOrbitInputBuffer();
    }

    async updateMOrA0(jd) {
        const updateMOrA0Start = performance.now();
        const ephems = this.ephems;
        for (let i = 0; i < ephems.length; i++) {
            const ephem = ephems[i];

            if (Spacekit.Orbit.getOrbitType(ephem) === Spacekit.OrbitType.PARABOLIC) {
                this.mOrA0Data[i] = getA0(ephem, jd);
            } else {
                this.mOrA0Data[i] = getM(ephem, jd);
            }
        }
        const updateMOrA0CpuEnd = performance.now();
        this.updateMOrA0Buffer();
        const updateMOrA0End = performance.now();
        //console.log("update M or A0, CPU ", updateMOrA0CpuEnd - updateMOrA0Start,
        //    ", GPU", updateMOrA0End - updateMOrA0CpuEnd);
    }

    async copyOrbitsArrayToStagingBuffer() {
        const orbits = this.orbits;

        if (orbits.length > OrbitPipeline.MAX_NUM_ORBITS) {
            throw Error("Failed to upload orbit data: " + orbits.length + " orbits passed, max is " + OrbitPipeline.MAX_NUM_ORBITS);
        }

        await this.inputStagingBuffer.mapAsync(
            GPUMapMode.WRITE,
            0,
            OrbitPipeline.MAX_ORBIT_INPUT_BUFFER_SIZE_IN_BYTES,
        );

        const stagingBuffer = this.inputStagingBuffer.getMappedRange(0, OrbitPipeline.MAX_ORBIT_INPUT_BUFFER_SIZE_IN_BYTES);

        const float32Array = new Float32Array(stagingBuffer);
        let floatPos = 0;
        for (let i = 0; i < orbits.length; i++) {
            const orbit = orbits[i];
            float32Array[floatPos] = orbit.a;
            float32Array[floatPos + 1] = orbit.e;
            float32Array[floatPos + 2] = orbit.i;
            float32Array[floatPos + 3] = orbit.om;
            float32Array[floatPos + 4] = orbit.wBar;
            float32Array[floatPos + 5] = orbit.M;
            float32Array[floatPos + 6] = orbit.q;
            float32Array[floatPos + 7] = orbit.a0;
            float32Array[floatPos + 8] = orbit.tp;
            float32Array[floatPos + 9] = orbit.epoch;
            float32Array[floatPos + 10] = orbit.ma;
            float32Array[floatPos + 11] = orbit.n;
            floatPos += OrbitPipeline.FLOATS_PER_ORBIT;
        }
        this.inputStagingBuffer.unmap();
    }

    async copyOrbitStagingBufferToOrbitInputBuffer() {
        const commandEncoder = this.computeContext.device.createCommandEncoder();

        commandEncoder.copyBufferToBuffer(
            this.inputStagingBuffer,
            0,
            this.inputBuffer,
            0,
            OrbitPipeline.MAX_ORBIT_INPUT_BUFFER_SIZE_IN_BYTES,
        );

        this.computeContext.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Sets julian date. This is used for calculating the positions-
     * @param jd {number} julian date
     */
    setJd(jd) {
        this.jdData.set([jd]);
    }

    updateJd() {
        this.computeContext.device.queue.writeBuffer(this.jdBuffer, 0, this.jdData);
    }

    setAndUpdateJd(jd) {
        this.setJd(jd);
        this.updateJd();
    }

    async runOrbitPipeline() {
        this.computeContext.encodeAndSubmitCommands(this.pipeline, Math.ceil(this.orbits.length / 64),
            this.outputBuffer, this.outputStagingBuffer, this.orbits.length * OrbitPipeline.BYTES_PER_POSITION);
    }

    async readBackOrbitData() {
        await this.outputStagingBuffer.mapAsync(
            GPUMapMode.READ,
            0,
            OrbitPipeline.MAX_ORBIT_OUTPUT_BUFFER_SIZE_IN_BYTES,
        );

        const copyArrayBuffer = this.outputStagingBuffer.getMappedRange(0, OrbitPipeline.MAX_ORBIT_OUTPUT_BUFFER_SIZE_IN_BYTES);
        const data = copyArrayBuffer.slice();
        this.outputStagingBuffer.unmap();
        const float32Data = new Float32Array(data);

        //TODO this is slow!
        const positionArray = new Array(OrbitPipeline.MAX_NUM_ORBITS).fill(0);
        for (let i = 0; i < OrbitPipeline.MAX_ORBIT_OUTPUT_BUFFER_SIZE_IN_BYTES; i += 4) {
            positionArray[i / 4] = [float32Data[i], float32Data[i + 1], float32Data[i + 2]];
        }

        return positionArray;
    }

    updateMOrA0Buffer() {
        this.computeContext.device.queue.writeBuffer(
            this.mOrA0Buffer, 0, this.mOrA0Data, 0, this.mOrA0Data.length
        );
    }
}


//TODO move this into the shader and pass only single parameter jd!
const PARABOLIC_K = 0.01720209895;

function getA0(ephem, jd) {
    const tp = ephem.get('tp');
    const e = ephem.get('e');
    const q = ephem.get('q');
    const d = jd - tp;
    return 0.75 * d * PARABOLIC_K * Math.sqrt((1 + e) / (q * q * q));
}

function getM(ephem, jd) {
    const d = jd - ephem.get('epoch');
    return ephem.get('ma') + ephem.get('n') * d;
}

export function spaceObjectsToEphemeris(spaceObjects, jd = 123) {
    return spaceObjects.map(spaceObject => spaceObject.Ephemeris)
        .map(ephem => {
            const isParabolic = Spacekit.Orbit.getOrbitType(ephem) === Spacekit.OrbitType.PARABOLIC;
            return {
                a: ephem.get("a"),
                e: ephem.get("e"),
                i: ephem.get("i", "rad"),
                om: ephem.get("om", "rad"),
                wBar: ephem.get("wBar", "rad"),
                q: ephem.get("q"),
                M: 0,
                a0: 0,
                tp: isParabolic ? ephem.get("tp") : 0,
                epoch: isParabolic ? 0 : ephem.get("epoch"),
                ma: isParabolic ? 0 : ephem.get("ma"),
                n: isParabolic ? 0 : ephem.get("n"),
            };
        })
        .slice(0, OrbitPipeline.MAX_NUM_ORBITS);
}

export async function testOrbitPipeline(spaceObjects, jd) {
    const computeContext = new WebGpuContext();
    await computeContext.init(document.getElementById("mainContainer"));

    const orbits = spaceObjectsToEphemeris(spaceObjects, jd);
    console.log("orbits: ", orbits);

    const orbitTest = new OrbitPipeline(computeContext);
    await orbitTest.init();

    console.log("upload orbit data...");
    const uploadStartTime = performance.now();
    await orbitTest.uploadOrbits(spaceObjects);
    await orbitTest.computeContext.device.queue.onSubmittedWorkDone(); //wait until current queue is done
    const uploadEndTime = performance.now();
    console.log("...done in ", (uploadEndTime - uploadStartTime), "ms");

    console.log("run orbit pipeline...");
    const runStartTime = performance.now();
    await orbitTest.runOrbitPipeline();
    await orbitTest.computeContext.device.queue.onSubmittedWorkDone(); //wait until current queue is done
    const runEndTime = performance.now();
    console.log("...done in ", (runEndTime - runStartTime), "ms");

    console.log("download orbit data...");
    const downloadStartTime = performance.now();
    const positions = await orbitTest.readBackOrbitData();
    const downloadEndTime = performance.now();
    console.log("...done in ", (downloadEndTime - downloadStartTime), "ms");
    console.log("asteroid positions: ", positions);


}