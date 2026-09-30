/** Small dependency-free right-handed 3D math layer. Angles in degrees at UI boundaries. */
export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
export type Quat = {
    x: number;
    y: number;
    z: number;
    w: number;
};
export declare const v3: (x?: number, y?: number, z?: number) => Vec3;
export declare const plus: (a: Vec3, b: Vec3) => Vec3;
export declare const minus: (a: Vec3, b: Vec3) => Vec3;
export declare const times: (a: Vec3, n: number) => Vec3;
export declare const dot3: (a: Vec3, b: Vec3) => number;
export declare const cross3: (a: Vec3, b: Vec3) => Vec3;
export declare const norm3: (a: Vec3) => number;
export declare const distance3: (a: Vec3, b: Vec3) => number;
export declare const unit3: (a: Vec3) => Vec3;
export declare const identityQ: () => Quat;
export declare const conjugate: (q: Quat) => Quat;
export declare const qScale: (q: Quat, n: number) => Quat;
export declare const qPlus: (a: Quat, b: Quat) => Quat;
export declare const qDot: (a: Quat, b: Quat) => number;
export declare const qNormalize: (q: Quat) => Quat;
export declare function qMul(a: Quat, b: Quat): Quat;
export declare function qAxis(axis: Vec3, deg: number): Quat;
/** XYZ intrinsic convention: q = qx*qy*qz. Persisted rotations are quaternions. */
export declare const fromXYZ: (a: Vec3) => Quat;
export declare function toXYZ(q0: Quat): Vec3;
export declare const rotate3: (q: Quat, p: Vec3) => Vec3;
export declare function qSlerp(a: Quat, b0: Quat, t: number): Quat;
export interface DQ {
    real: Quat;
    dual: Quat;
}
export declare const makeDQ: (q: Quat, t: Vec3) => DQ;
/** Hemisphere-aligned normalized dual-quaternion blending. One application only. */
export declare function transformWeighted(point: Vec3, list: {
    frame: DQ;
    weight: number;
}[]): Vec3;
export interface View3 {
    yaw: number;
    pitch: number;
    zoom: number;
}
/** Orthographic, object-centred camera. Orbit does not mutate any driver transforms. */
export declare function project3(p: Vec3, c: View3): Vec3;
/** Singular values of a 3D triangle mapping, relative to its 2D bind triangle. */
export declare function metric3(bind: {
    x: number;
    y: number;
}[], posed: Vec3[]): {
    min: number;
    max: number;
    area: number;
};
