import * as julian from "./external/julian.js";
import {WebGpuContext} from "./webgpu-context.js";
import {Camera} from "./camera.js";
import {OrbitPipeline} from "./orbit-pipeline.js";
import {OrbitControls} from "./orbit-controls.js";
import {BillboardRenderPipeline} from "./billboard-render-pipeline.js";

export class Engine {
    canvasElement = undefined;
    webGpuContext = undefined;

    renderPipeline = undefined;
    orbitPipeline = undefined;

    spaceObjects = [];

    jd = Number(julian.toJd(new Date())); //in jd
    jdPerSecond = 100;
    isPaused = false;

    onTick = undefined;

    constructor(canvasElement) {
        this.canvasElement = canvasElement;
    }

    async init(options) {
        this.webGpuContext = new WebGpuContext();
        await this.webGpuContext.init(this.canvasElement);

        this.camera = new Camera(this.webGpuContext);
        this.camera.model.setPosition(0, 0, 7);

        this.orbitPipeline = new OrbitPipeline(this.webGpuContext);
        await this.orbitPipeline.init();

        this.renderPipeline = new BillboardRenderPipeline(this.webGpuContext);
        await this.renderPipeline.init(this.orbitPipeline.outputBuffer, this.camera.getBuffer(),
            options.particleTextureUrl, options.particleDefaultSize, options.particleDefaultColor);

        this.webGpuContext.addCanvasResizeListener((w, h) => this.onCanvasResize(w, h));
        this.onCanvasResize(this.canvasElement.width, this.canvasElement.height);
    }

    onCanvasResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        console.log("canvas resized, new width=", width, ", new height=", height);
    }

    async update(deltaTime) {
        this.orbitControls.update(deltaTime);
        this.camera.update();

        if (!this.isPaused) {

            this.jd += deltaTime / 1000 * this.jdPerSecond;
            await this.orbitPipeline.updateMOrA0(this.jd);
            await this.orbitPipeline.runOrbitPipeline();

            if (this.onTick !== undefined) {
                this.onTick();
            }

        }

        //console.log("current jd is ", this.jd);
    }

    render() {

        this.renderPipeline.render(this.spaceObjects.length);
    }

    setSpaceObjects(spaceObjects) {
        this.spaceObjects = spaceObjects;
    }

    async uploadSpaceObjectsToGpu() {
        await this.orbitPipeline.uploadOrbits(this.spaceObjects);
    }

    async setAndUploadSpaceObjects(spaceObjects) {
        this.setSpaceObjects(spaceObjects);
        return this.uploadSpaceObjectsToGpu();
    }

    /**
     * Starts simulation (i.e. JD advances as time passes)
     */
    start() {
        this.isPaused = false;
    }

    /**
     * Stops simulation.
     */
    stop() {
        this.isPaused = true;
    }

    /**
     * Sets current simulation time.
     * @param jd {number} time in julian date
     */
    setJd(jd) {
        this.jd = jd;
    }

    /**
     * Returns current simulation time in JD.
     * @returns {number} time in julian date
     */
    getJd() {
        return this.jd;
    }

    /**
     * Sets current simulation speed.
     * @param jdPerSecond {number} simulation speed in days passing per second, can be fractional
     */
    setJdPerSecond(jdPerSecond) {
        this.jdPerSecond = jdPerSecond;
    }

    /**
     * Returns current simulation speed.
     * @return {number} simulation speed in days passing per second, can be fraction
     */
    getJdPerSecond() {
        return this.jdPerSecond;
    }

    /**
     * Starts simulation and rendering.
     * @returns {Promise<void>}
     */
    async run() {

        //TODO move this somewhere else
        this.orbitControls = new OrbitControls(this.webGpuContext.canvasElement, this.camera);

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

            requestAnimationFrame(renderCall);

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

        }

        renderCall(0);
    }

    /**
     * Returns current simulation time as gregorian date.
     * @returns {Date} current simulation time
     */
    getDate() {
        return julian.convertToDate(this.jd);
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