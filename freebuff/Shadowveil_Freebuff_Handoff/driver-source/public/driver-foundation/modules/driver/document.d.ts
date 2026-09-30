import { type LabelBasis } from './labels.js';
import { type DriverRig, type DriverPose } from './driver.js';
import type { View3 } from './math3.js';
export declare const PROJECT_SCHEMA: "character-driver-project/1";
export declare const GUIDE_SCHEMA: "character-driver-guide/1";
export declare const GUIDE_LIMIT: number;
export type Diagnostic = 'art' | 'weights' | 'seams';
export interface ArtTask {
    id: string;
    kind: 'neutral' | 'arm-correction' | 'hand' | 'concealed';
    view: 'front' | 'three-quarter-R' | 'profile-R';
    side: 'R' | 'whole';
    status: 'awaiting-guide';
    dependsOn: string[];
    specification: string;
}
export interface GuideMeta {
    schema: typeof GUIDE_SCHEMA;
    characterId: 'shadowveil';
    revision: string;
    notes: string;
    coordinates?: DriverRig['coordinates'];
    units?: DriverRig['units'];
    landmarks?: Record<string, {
        x: number;
        y: number;
        z: number;
    }>;
}
export interface GuideRecord {
    id: string;
    name: string;
    sha256: string;
    html: string;
    title: string;
    summary: string;
    machine: GuideMeta | null;
    metadataWarning: string;
    status: 'staged' | 'approved';
    receivedAt: string;
}
export interface ProjectDoc {
    schema: typeof PROJECT_SCHEMA;
    id: string;
    characterId: 'shadowveil';
    name: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
    assetSetId: string;
    driver: DriverRig;
    pose: DriverPose;
    registration: {
        id: string;
        driverRevision: string;
        sourceHash: string;
        status: 'provisional' | 'needs-review';
        approvedGuideHash: string | null;
    };
    workspace: {
        camera: View3;
        selectedBone: string;
        showDriver: boolean;
        diagnostic: Diagnostic;
        background: 'dark' | 'light' | 'checker';
        interaction: 'pose' | 'orbit';
        /** UI preference only; absent in legacy 0.1/0.1.1 exports. */
        labelBasis?: LabelBasis;
    };
    guides: GuideRecord[];
    activeGuideId: string | null;
    queue: ArtTask[];
    savedPoses: {
        id: string;
        name: string;
        driverRevision: string;
        pose: DriverPose;
    }[];
}
export declare function firstBatch(): ArtTask[];
export declare function createProject(assetSetId: string, sourceHash: string): ProjectDoc;
export declare function revise(d: ProjectDoc, edit: (next: ProjectDoc) => void): ProjectDoc;
export declare function shaText(text: string): Promise<string>;
/** Strict optional data block. No HTML nodes are attached, scripts evaluated, or URLs fetched. */
export declare function validateGuideMeta(raw: unknown): GuideMeta;
/** This is a text-only extractor, not a sanitizer. Original guide is archived inert. */
export declare function inspectGuideHTML(html: string, name: string): Promise<GuideRecord>;
export declare function stageGuide(d: ProjectDoc, g: GuideRecord): ProjectDoc;
export declare function approveGuide(d: ProjectDoc, id: string): ProjectDoc;
/** Import validation is intentionally closed to this provisional rig revision. A future
 * migration can explicitly add revised proportions. Never silently rebind an old mesh. */
export declare function validateProject(raw: unknown, assetSetId: string, sourceHash: string): Promise<ProjectDoc>;
