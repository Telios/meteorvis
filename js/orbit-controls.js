import * as Utility from "./utility.js";
import {Vector3, Quaternion, Matrix4, MathUtils, Euler} from "three";

export class OrbitControls {
    dragSensitivity = 0.05;
    orbitSensitivity = 0.25;
    scrollSensitivity = 0.25;

    element = undefined;
    isPointerDown = false;
    isDragging = false;
    lastPointerCoords = [];
    currentPointerCoords = [];

    horizontalAngle = 0;
    verticalAngle = 0;
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
            const cameraPosition = new Vector3().setFromMatrixPosition(this.camera.model);
            const spherical = Utility.toSpherical(this.orbitCenter, cameraPosition);
            spherical[1] = Math.max(Math.min(spherical[1] - orbitFactor * deltaY, Math.PI), 0);
            spherical[2] += orbitFactor * deltaX;
            const cartesian = Utility.toCartesian(this.orbitCenter, spherical[0], spherical[1], spherical[2]);

            this.camera.model.setPosition(cartesian);
            this.camera.model.lookAt(cartesian, this.orbitCenter, new Vector3(0, 1, 0));
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
        const cameraPosition = new Vector3().setFromMatrixPosition(this.camera.getModelMatrix());
        const cameraToOrbitCenter = new Vector3().subVectors(cameraPosition, this.orbitCenter).normalize();
        const newCameraPosition = cameraPosition.addScaledVector(cameraToOrbitCenter, scrollDir * this.scrollSensitivity);
        this.camera.model.setPosition(newCameraPosition);
    }
}