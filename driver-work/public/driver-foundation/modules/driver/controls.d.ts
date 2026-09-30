/** Screen-oriented direct manipulation. Does not change anatomical IDs or image handedness.
 * All pointer distances are CSS pixels; all geometry is in driver bind units.
 * The current screen projection, its inverse and the drawn handles share this module.
 */
import { type DriverRig, type DriverPose, type WorldRig } from './driver.js';
import { type Vec3, type View3 } from './math3.js';
export interface Point2 {
    x: number;
    y: number;
}
export interface ScreenFit {
    x: number;
    y: number;
    scale: number;
}
export declare const AXES: readonly ["x", "y", "z"];
export declare const RING_RADIUS = 34;
/** Exact inverse of project3 = Rx(pitch) * Ry(-yaw). Order matters. */
export declare function cameraToWorld(p: Vec3, camera: View3): Vec3;
export declare function screenDeltaToWorld(dx: number, dy: number, camera: View3, scale: number): Vec3;
export declare function projectScreen(p: Vec3, camera: View3, fit: ScreenFit): Point2;
export declare function anatomicalSide(id: string): 'right' | 'left' | 'midline';
export declare function nodeLabel(id: string): string;
export declare function screenSide(id: string, world: WorldRig, camera: View3): string;
/** A joint sits at a bone's origin: rotating that bone cannot move the joint itself.
 * Place the clicked node by rotating appropriate ANCESTORS. Rotate its own bone with the ring.
 */
export declare function positioningChain(id: string): string[];
export interface NodeGrab {
    bone: string;
    pose: DriverPose;
    camera: View3;
    scale: number;
    start: Vec3;
}
export declare function beginNodeGrab(rig: DriverRig, pose: DriverPose, bone: string, camera: View3, scale: number): NodeGrab;
export interface NodeSolution {
    pose: DriverPose;
    target: Vec3;
    errorPixels: number;
    limited: boolean;
    moved: boolean;
}
/** Camera-plane target solver, NOT a full-body/contact solver. Limb lengths are never edited.
 * Depth is softly regularized to the initial view-plane. Every candidate respects rig limits.
 * The caller must still run the same weighted-surface gate as sliders/imports.
 */
export declare function solveNodeGrab(rig: DriverRig, grab: NodeGrab, dx: number, dy: number): NodeSolution;
export declare function shortestDegrees(degrees: number): number;
/** Camera-normal world rotation converted into the selected bone's current parent space.
 * Positive screen angle is clockwise because screen Y is down; world rotation gets the minus sign.
 */
export declare function rotateInView(rig: DriverRig, pose: DriverPose, bone: string, camera: View3, clockwise: number): DriverPose;
/** Stable target picking: a selected coincident joint wins; otherwise prefer the moving shoulder
 * over its same-position clavicle, then the frontmost node. Neither side is swapped. */
export declare function pickNode(rig: DriverRig, pose: DriverPose, camera: View3, fit: ScreenFit, at: Point2, selected: string, radius?: number): string | null;
