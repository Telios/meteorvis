import * as THREE from "three";


// using three.js math classes and inspired by three.js PerspectiveCamera class
export class Camera {
    static CAMERA_UNIFORM_SIZE_IN_FLOATS = 16 + 16;
    static CAMERA_UNIFORM_SIZE_IN_BYTES = 4 * Camera.CAMERA_UNIFORM_SIZE_IN_FLOATS;

    // 3 mat4x4 (16 floats, 4 bytes each) and 2 vec2 (each 2 floats, 4 bytes each)
    static UNIFORM_BUFFER_SIZE = 16 * 4 * 3
        + 2 * 2 * 4
        + 4 * 4; // 1 vec4 (4 floats, 4 bytes each)

    webgpuContext = undefined;
    cameraBuffer = undefined;
    cameraData = undefined;

    near = 0.01;
    far = 100;
    zoom = 1;
    fov = 40; //in degrees
    aspect = 1;

    projection = new THREE.Matrix4();
    model = new THREE.Matrix4().identity();

    constructor(webgpuContext) {
        this.updateProjectionMatrix();
        this.webgpuContext = webgpuContext;
        this.initBuffer();
    }

    updateProjectionMatrix() {
        const near = this.near;
        const top = near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * this.fov) / this.zoom;
        const height = 2 * top;
        const width = this.aspect * height;
        const left = -0.5 * width;
        this.projection.makePerspective(left, left + width, top, top - height, near, this.far, THREE.WebGPUCoordinateSystem);
    }

    getModelMatrix() {
        return this.model;
    }

    getViewMatrix() {
        return this.getModelMatrix().clone().invert(); //TODO very expensive, dont do this (but oh well)
    }

    getProjectionMatrix() {
        return this.projection;
    }

    initBuffer() {
        this.cameraBuffer = this.webgpuContext.device.createBuffer({
            label: "uniform buffer for camera data",
            size: Camera.CAMERA_UNIFORM_SIZE_IN_BYTES,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.cameraData = new Float32Array(Camera.CAMERA_UNIFORM_SIZE_IN_FLOATS);
    }

    update() {
        this.updateData();
        this.updateBuffer();
    }

    updateData() {
        const cameraData = this.cameraData;
        cameraData.set(this.getViewMatrix().elements, 0);
        cameraData.set(this.getProjectionMatrix().elements, 16);
    }

    updateBuffer() {
        this.webgpuContext.device.queue.writeBuffer(this.cameraBuffer, 0, this.cameraData);
    }

    getBuffer() {
        return this.cameraBuffer;
    }
}