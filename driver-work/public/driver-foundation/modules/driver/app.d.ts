import { type DriverPose, type Axis } from './driver.js';
import { type View3 } from './math3.js';
import { type ProjectDoc, type Diagnostic } from './document.js';
import { type LabelBasis } from './labels.js';
export interface MountOptions {
    assets: Record<string, string>;
    assetSetId: string;
    signal?: AbortSignal;
}
export interface DriverAPI {
    getProject(): ProjectDoc;
    setAngle(id: string, axis: Axis, value: number): void;
    setCamera(v: Partial<View3>): void;
    setOverlay(show: boolean): void;
    setLabelBasis(basis: LabelBasis): void;
    setDiagnostic(v: Diagnostic): void;
    setPose(p: DriverPose): void;
    importGuide(text: string, name: string): Promise<void>;
    approveGuide(id: string): void;
    exportProject(): Promise<string>;
    importProject(text: string): Promise<void>;
    save(): Promise<void>;
    undo(): void;
    metrics(): unknown;
    destroy(): void;
    canvas: HTMLCanvasElement;
}
export declare function mount(host: HTMLElement, opts: MountOptions): Promise<DriverAPI>;
