import { type Vec3, type Quat, type DQ, type View3 } from './math3.js';
import type { Surface } from '../pose-v5/surface.js';
export type Axis = 'x' | 'y' | 'z';
export interface DriverBone {
    id: string;
    label: string;
    parent: string | null;
    bind: Vec3;
    limits: Record<Axis, [
        number,
        number
    ]>;
}
export interface DriverRig {
    revision: string;
    units: 'bind-pixels';
    coordinates: 'x-image-right_y-up_z-front';
    status: 'provisional';
    bones: DriverBone[];
}
export interface DriverPose {
    root: Vec3;
    rotations: Record<string, Quat>;
}
export interface WorldBone {
    position: Vec3;
    rotation: Quat;
    skin: DQ;
}
export type WorldRig = Record<string, WorldBone>;
export declare const BIND_ORIGIN: {
    x: 258.8;
    y: 527;
};
export declare const fromBind: (v: {
    x: number;
    y: number;
}, z?: number) => Vec3;
export declare const toBind: (v: Vec3) => {
    x: number;
    y: number;
};
export declare function provisionalRig(): DriverRig;
export declare const neutralDriver: (rig: DriverRig) => DriverPose;
export declare function validateRig(r: DriverRig): boolean;
export declare function constrainPose(rig: DriverRig, raw: DriverPose): {
    pose: DriverPose;
    reasons: string[];
};
export declare function evaluateDriver(rig: DriverRig, p: DriverPose): WorldRig;
export declare const withAngle: (p: DriverPose, id: string, axis: Axis, value: number) => DriverPose;
export declare function interpolatePose(a: DriverPose, b: DriverPose, t: number): DriverPose;
export interface BoundShape {
    points: Map<string, Vec3[]>;
    minScale: number;
    maxScale: number;
    seamGap: number;
    accepted: boolean;
    reasons: string[];
}
export declare function bindSurfaces(world: WorldRig, meshes: Surface[], welds: {
    members: {
        part: string;
        index: number;
    }[];
}[]): BoundShape;
export declare const projectShape: (b: BoundShape, c: View3) => Map<string, {
    x: number;
    y: number;
}[]>;
export declare function artCoverage(p: DriverPose, c: View3, registrationStatus: string): {
    supported: boolean;
    reason: string;
};
