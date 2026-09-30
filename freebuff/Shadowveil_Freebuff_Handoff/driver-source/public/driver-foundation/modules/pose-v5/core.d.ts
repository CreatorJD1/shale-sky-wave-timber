/** Front-plane articulated character. Degrees are clockwise in screen coordinates.
 * R and L always mean the character's anatomical side, never the viewer's side.
 * No scale is applied to a skeletal segment. Depth rotation is not simulated.
 */
export type V = {
    x: number;
    y: number;
};
export type Side = 'R' | 'L';
export interface Arm {
    lift: number;
    flex: number;
    wrist: number;
    clavicle: number;
    bend: 1 | -1;
}
export interface Leg {
    hip: number;
    knee: number;
    ankle: number;
    toe: number;
}
export interface Pose {
    version: 5;
    root: V;
    roll: number;
    spine: number;
    chest: number;
    neck: number;
    head: number;
    arms: Record<Side, Arm>;
    legs: Record<Side, Leg>;
    feetPinned: boolean;
    foreground: Side;
    shoulderAssist: boolean;
    reachAssist: boolean;
    softIK: boolean;
}
export declare const RIG_VERSION = "5.0.0";
export declare const REST: {
    readonly root: {
        readonly x: 258.8;
        readonly y: 527;
    };
    readonly neck: {
        readonly x: 258.8;
        readonly y: 230.2;
    };
    readonly head: {
        readonly x: 258.8;
        readonly y: 181.2;
    };
    readonly R: {
        readonly shoulder: {
            readonly x: 183.6;
            readonly y: 279;
        };
        readonly elbow: {
            readonly x: 163;
            readonly y: 408;
        };
        readonly wrist: {
            readonly x: 137;
            readonly y: 550;
        };
        readonly hip: {
            readonly x: 209.8;
            readonly y: 525.6;
        };
        readonly knee: {
            readonly x: 197.2;
            readonly y: 728.6;
        };
        readonly ankle: {
            readonly x: 194.4;
            readonly y: 972.2;
        };
    };
    readonly L: {
        readonly shoulder: {
            readonly x: 335.4;
            readonly y: 279;
        };
        readonly elbow: {
            readonly x: 353;
            readonly y: 408;
        };
        readonly wrist: {
            readonly x: 376;
            readonly y: 550;
        };
        readonly hip: {
            readonly x: 305;
            readonly y: 525.6;
        };
        readonly knee: {
            readonly x: 320.4;
            readonly y: 728.6;
        };
        readonly ankle: {
            readonly x: 327.4;
            readonly y: 972.2;
        };
    };
};
export declare const D: number;
export declare const clamp: (x: number, a: number, b: number) => number;
export declare const wrap: (a: number) => number;
export declare const add: (a: V, b: V) => V;
export declare const sub: (a: V, b: V) => V;
export declare const mul: (a: V, n: number) => V;
export declare const len: (a: V) => number;
export declare const dist: (a: V, b: V) => number;
export declare function rot(v: V, a: number): V;
export declare const heading: (v: V) => number;
export declare const sideSign: (s: Side) => 1 | -1;
export declare const LIMITS: {
    readonly lift: readonly [-6, 112];
    readonly flex: readonly [0, 112];
    readonly wrist: readonly [-24, 24];
    readonly clavicle: readonly [-8, 12];
    readonly hip: readonly [-6, 30];
    readonly knee: readonly [0, 38];
    readonly ankle: readonly [-18, 18];
    readonly toe: readonly [-12, 12];
    readonly roll: readonly [-8, 8];
    readonly spine: readonly [-14, 14];
    readonly chest: readonly [-13, 13];
    readonly neck: readonly [-12, 12];
    readonly head: readonly [-18, 18];
};
export declare function neutral(): Pose;
export declare function copy(p: Pose): Pose;
export declare function sanitize(data: unknown): Pose;
export declare function bodyAngle(p: Pose, y: number): number;
export declare function bodyPoint(p: Pose, v: V): V;
export declare function neckPoint(p: Pose, v: V): V;
export declare function headPoint(p: Pose, v: V): V;
export declare const clavicleBase: (s: Side) => V;
export declare function clavicleAngle(p: Pose, s: Side): number;
export declare function girdlePoint(p: Pose, s: Side, v: V): V;
export interface Chain {
    a: V;
    b: V;
    c: V;
    upper: number;
    lower: number;
    end: number;
}
export declare function armChain(p: Pose, s: Side): Chain;
export declare function legChain(p: Pose, s: Side): Chain;
export declare function palmRest(s: Side): V;
export declare function heelRest(s: Side): V;
export declare function ballRest(s: Side): V;
export declare function toeRest(s: Side): V;
export declare function createPartMapper(p: Pose, id: string): (v: V) => V;
export declare function mapPoint(p: Pose, id: string, v: V): V;
export declare function solveHand(input: Pose, s: Side, target: V, allowPoleSwitch?: boolean): Pose;
export declare function switchElbow(input: Pose, s: Side): Pose;
export declare function solveFoot(input: Pose, s: Side, target: V): Pose;
export declare function pinFeet(input: Pose, t: Record<Side, V>, settlePelvis?: boolean): Pose;
export declare function movePinnedRoot(initial: Pose, desired: V, t: Record<Side, V>): Pose;
export declare function landmarks(p: Pose): Record<string, V>;
export interface HandleDef {
    id: string;
    label: string;
    group: 'body' | 'arms' | 'legs';
    hint: string;
}
export declare const HANDLES: HandleDef[];
export type ControlMode = 'ik' | 'fk';
/** One interaction implementation is used by pointer, keyboard and tests. */
export declare function dragHandle(initial: Pose, current: Pose, id: string, start: V, point: V, mode?: ControlMode): Pose;
/** Presets stay inside the measured mesh envelope. A raised forearm is not a
 * palm-facing wave; that would need replacement hand/depth artwork. */
export declare const PRESETS: readonly ["Neutral", "Relaxed stance", "Forearm lift", "Present", "Hand on hip", "S-curve", "Soft stance", "Counterbalance"];
export declare function preset(name: string): Pose;
/** Small coordinated gesture, not a full shoulder/depth wave. */
export declare function waveAt(seconds: number): Pose;
