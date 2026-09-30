/** Real normalized bind weights and 2D dual-quaternion skinning.
 * Skinning matrices come from the same FK chain as the controls. Short-lived
 * maps are pose-space joint correctives, not a hidden undeformed sprite.
 */
import { type Pose, type V } from './core.js';
export interface Influence {
    bone: string;
    weight: number;
}
export interface Binding {
    weights: Influence[];
    corrective: number;
    region: string;
    locked: boolean;
}
export interface SkinFrame {
    bind: V;
    world: V;
    angle: number;
}
export type SkinFrames = Record<string, SkinFrame>;
export interface SkinSettings {
    correctives: boolean;
}
export declare const SKIN_DEFAULT: SkinSettings;
export declare const BONE_PALETTE: Record<string, string>;
export declare function normalizeWeights(list: Influence[]): Influence[];
export declare function skinFrames(p: Pose): SkinFrames;
export declare function bindingFor(id: string, v: V): Binding;
export declare function dqSkin(v: V, weights: Influence[], frames: SkinFrames): V;
export declare function skinVertexBound(v: V, b: Binding, frames: SkinFrames, pose: Pose, part: string, corrector: (v: V) => V, enabled?: boolean): V;
/** Only genuine attachment regions are welded; overlapping crossed limbs are not. */
export declare const SEAM_REGIONS: {
    a: string;
    b: string;
    y0: number;
    y1: number;
    kind: string;
}[];
