/** Deterministic premultiplied-alpha texture rasterizer.
 * Shared triangle edges replace within a part, then each complete part is composited
 * once. This avoids both alpha-darkened seams and Canvas clip-antialias cracks.
 * Does not require WebGL (including on browsers which disable WebGL contexts).
 */
import { type Pose, type V } from './core.js';
import type { Atlas, AtlasPart, Images, Camera } from './render.js';
import { type Binding, type Influence } from './skinning.js';
import { type GuardMesh } from './guard.js';
export interface Surface extends GuardMesh {
    part: AtlasPart;
    texture: Float32Array;
    alpha: Uint8ClampedArray;
    bind: V[];
    bindings: Binding[];
    indices: number[];
    opaque: boolean[];
}
export declare class SurfaceRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    surfaces: Map<string, Surface>;
    diagnostic: 'art' | 'weights' | 'strain' | 'corrective' | 'seams';
    selectedBone: string;
    wireframe: boolean;
    weldGroups: {
        kind: string;
        members: {
            part: string;
            index: number;
        }[];
    }[];
    lastPoints: Map<string, V[]>;
    health: {
        invertedOpaqueTriangles: number;
        totalOpaqueTriangles: number;
        folds: {
            part: string;
            x: number;
            y: number;
        }[];
    };
    sourceHash: string;
    constructor(atlas: Atlas, images: Images);
    draw(p: Pose, k: Camera, w: number, h: number, dpr: number, order: string[], mappedPoints?: Map<string, V[]>): HTMLCanvasElement;
    getMeshes(): GuardMesh[];
    private weldBindings;
    private ramp;
    private bindingColor;
    private strainColor;
    exportSkin(): {
        version: number;
        format: string;
        sourceHash: string;
        canvas: number[];
        palette: {
            [x: string]: string;
        };
        parts: {
            id: string;
            vertices: {
                weights: {
                    bone: string;
                    weight: number;
                }[];
                corrective: number;
                region: string;
                locked: boolean;
                x: number;
                y: number;
            }[];
            triangles: number[];
            opaque: boolean[];
        }[];
        weldGroups: {
            kind: string;
            members: {
                part: string;
                index: number;
            }[];
        }[];
    };
    loadSkin(data: unknown): void;
    auditWeights(): {
        vertices: number;
        invalid: number;
        unweighted: number;
        maxSumError: number;
        maxInfluences: number;
        weldGroups: number;
        weightsNormalized: boolean;
    };
    inspectVertex(point: V): {
        part: string;
        index: number;
        distance: number;
        x: number;
        y: number;
        weights: Influence[];
        corrective: number;
        locked: boolean;
    } | null;
    destroy(): void;
}
