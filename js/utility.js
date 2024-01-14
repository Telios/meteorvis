import {Vector3} from "three";

/**
 * Takes cartesian coordinates of the sphere center and a pointer on the sphere surface
 * and returns point's spherical coordinates.
 * @param center {THREE.Vector3}
 * @param point {THREE.Vector3}
 * @returns {(number)[]}
 */
export function toSpherical(center, point) {
    const centerToPoint = new Vector3(point.x, point.y, point.z)
        .sub(center);
    const radius = centerToPoint.length();
    const theta = Math.atan2(centerToPoint.z, centerToPoint.x);
    const phi = Math.acos(centerToPoint.y / radius);
    return [radius, phi, theta];
}

/**
 * Takes a vector representing the sphere center as well as spherical coordinates and computes cartesian coordinates.
 * @param center {THREE.Vector3} the center of the sphere
 * @param radius {number} radius
 * @param phi {number} vertical angle
 * @param theta {number} horizontal angle
 * @returns {THREE.Vector3} representing the coordinates
 */
export function toCartesian(center, radius, phi, theta) {
    const sinPhi = Math.sin(phi);
    return new Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta));
}