import * as Utility from "./utility.js";
import {Vector3, Quaternion, Matrix4} from "three";

export class OrbitControls {
    dragSensitivity = 0.05;
    orbitSensitivity = 0.25;
    scrollSensitivity = 0.25;

    element = undefined;
    isPointerDown = false;
    isDragging = false;
    lastPointerCoords = [];
    currentPointerCoords = [];

    orbitCenter = new Vector3(0.0, 0.0, 0.0);

    constructor(element, camera) {
        this.element = element;
        this.camera = camera;
        this.registerCallbacks();
    }

    registerCallbacks() {
        this.element.addEventListener("pointermove", event => this.pointermoveCallback(event));
        this.element.addEventListener("pointerdown", event => this.pointerdownCallback(event));
        this.element.addEventListener("pointerup", event => this.pointerupCallback(event));
        this.element.addEventListener("wheel", event => this.wheelCallback(event));
        document.addEventListener("keydown", event => this.keydownCallback(event));
        document.addEventListener("keyup", event => this.keyupCallback(event));
    }

    update(deltaTime) {
        if (!this.isPointerDown) {
            return;
        }

        const deltaX = this.currentPointerCoords[0] - this.lastPointerCoords[0];
        const deltaY = this.currentPointerCoords[1] - this.lastPointerCoords[1];
        const timeFactor = deltaTime / 1000;

        if (this.isDragging) {
            const dragFactor = timeFactor * this.dragSensitivity;
            //TODO do relative to camera model coordinate system
            //this.camera.position.x -= dragFactor * deltaX;
            //this.camera.position.y += dragFactor * deltaY;
        } else {
            const orbitFactor = timeFactor * this.orbitSensitivity;
            const spherical = Utility.toSpherical(this.orbitCenter, this.camera.position);
            spherical[1] -= orbitFactor * deltaY;
            spherical[2] += orbitFactor * deltaX;
            const cartesian = Utility.toCartesian(this.orbitCenter, spherical[0], spherical[1], spherical[2]);

            this.camera.position.copy(cartesian);
            const lookAtMatrix = new Matrix4().lookAt(this.camera.position, this.orbitCenter, new Vector3(0, 1, 0));
            this.camera.rotation.setFromRotationMatrix(lookAtMatrix);
        }

        this.lastPointerCoords = this.currentPointerCoords;
    }

    pointermoveCallback(event) {
        if (!this.isPointerDown) {
            return;
        }

        this.currentPointerCoords = [event.clientX, event.clientY];
    }

    pointerupCallback(event) {
        this.isPointerDown = false;
    }

    pointerdownCallback(event) {
        this.isPointerDown = true;
        this.lastPointerCoords = [event.clientX, event.clientY];
        this.currentPointerCoords = [event.clientX, event.clientY];
    }

    keydownCallback(event) {
        if (event.key === "Shift") {
            this.isDragging = true;
        }
    }

    keyupCallback(event) {
        if (event.key === "Shift") {
            this.isDragging = false;
        }
    }

    wheelCallback(event) {
        const deltaY = event.deltaY;
        const scrollDir = Math.sign(deltaY);

        const spherical = Utility.toSpherical(this.orbitCenter, this.camera.position);
        spherical[0] += scrollDir * this.scrollSensitivity;
        const cartesian = Utility.toCartesian(this.orbitCenter, spherical[0], spherical[1], spherical[2]);

        this.camera.position.copy(cartesian);
    }
}