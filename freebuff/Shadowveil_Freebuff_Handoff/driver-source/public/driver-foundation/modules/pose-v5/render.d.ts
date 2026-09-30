import { SurfaceRenderer } from './surface.js';
import { type V, type Pose } from './core.js';
export interface AtlasPart {
    id: string;
    src: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface Atlas {
    version: number;
    source_sha256?: string;
    parts: AtlasPart[];
    coverage: Record<string, number>;
}
export interface Camera {
    scale: number;
    x: number;
    y: number;
}
export type Background = 'dark' | 'light' | 'checker' | 'transparent';
export type Images = Record<string, HTMLImageElement>;
export declare function imageLoad(src: string): Promise<HTMLImageElement>;
export declare const cameraFor: (w: number, h: number, zoom?: number) => Camera;
export declare const toWorld: (v: V, c: Camera) => V;
export declare const toScreen: (v: V, c: Camera) => V;
export declare class Renderer {
    canvas: HTMLCanvasElement;
    atlas: Atlas;
    images: Images;
    surfaces: SurfaceRenderer;
    controlFilter: string;
    labels: boolean;
    ctx: CanvasRenderingContext2D;
    camera: Camera;
    width: number;
    height: number;
    dpr: number;
    constructor(canvas: HTMLCanvasElement, atlas: Atlas, images: Images, preferGPU?: boolean);
    resize(w: number, h: number): void;
    background(kind: Background): void;
    draw(p: Pose, bg?: Background, joints?: boolean, selected?: string, zoom?: number, refImage?: HTMLImageElement): void;
    drawControls(p: Pose, selected: string): void;
}
