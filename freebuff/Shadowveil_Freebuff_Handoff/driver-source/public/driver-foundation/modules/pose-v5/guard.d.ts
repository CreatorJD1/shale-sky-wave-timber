/** Central pose acceptance gate. No input source can bypass this gate in the UI.
 * These envelopes are conservative limits for this FRONT-PLANE artwork, not
 * medical human ranges of motion and not a 3D collision/soft-body simulation.
 */
import { type Pose, type V } from './core.js';
import { type Binding } from './skinning.js';
export interface GuardMesh {
    part: {
        id: string;
        x: number;
        y: number;
        w: number;
        h: number;
    };
    bind: V[];
    bindings: Binding[];
    indices: number[];
    opaque: boolean[];
}
export interface DeformationMetric {
    stretch: number;
    compression: number;
    area: number;
}
export interface GuardHealth {
    valid: boolean;
    opaqueTriangles: number;
    inverted: number;
    overstretched: number;
    compressed: number;
    maxStretch: number;
    minCompression: number;
    maxSeamGap: number;
    rules: string[];
    worst: {
        part: string;
        x: number;
        y: number;
        stretch: number;
        compression: number;
    }[];
}
export interface GuardResult {
    pose: Pose;
    limited: boolean;
    acceptedFraction: number;
    reasons: string[];
    source: string;
    health: GuardHealth;
    requestedHealth?: GuardHealth;
}
export declare const SAFETY_PROFILE: {
    readonly name: "Front-view protected";
    readonly maxTorsoTotal: 22;
    readonly maxSpineEffort: 25;
    readonly maxNeckHead: 23;
    readonly maxHeadWorld: 39;
    readonly maxShoulderTotal: 123;
    readonly maxFootShin: 24;
    readonly maxFootToe: 25;
    readonly minAnkleSeparation: 32;
    readonly pinTolerance: 0.85;
    readonly maxSeamGap: 0.03;
};
export declare function poseViolations(p: Pose, previous?: Pose): string[];
export declare function triangleMetric(a: V, b: V, c: V, A: V, B: V, C: V): DeformationMetric;
/** Per-material *projected mesh* deformation thresholds, exposed in the UI. */
export declare function materialLimits(id: string, v: V): {
    min: number;
    max: number;
    material: string;
};
export declare const CORRECTION_LIMIT_PX = 8;
/** Bounded pose-space shape correction. Stiff material regions resist edge
 * stretch; flexible joint bands have a wider envelope. Welded vertices remain
 * fixed throughout. A failed result is rejected by the triangle guard below.
 * This is a 2D deformation corrector, not tissue/cloth physics. */
export declare function relaxSurface(m: GuardMesh, target: V[]): V[];
export declare function posedMeshes(p: Pose, meshes: GuardMesh[], correctives?: boolean): Map<string, V[]>;
export declare function inspectPose(p: Pose, meshes: GuardMesh[], previous?: Pose, quick?: boolean): GuardHealth;
export declare function interpolatePose(a: Pose, b: Pose, t: number): Pose;
export declare class PoseGuard {
    meshes: GuardMesh[];
    last: GuardResult;
    constructor(meshes: GuardMesh[]);
    accept(previous: Pose, request: Pose, source?: string, transition?: boolean): GuardResult;
}
