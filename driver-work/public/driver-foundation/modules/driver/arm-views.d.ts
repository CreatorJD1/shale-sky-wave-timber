/** Anatomical right-arm packets. Same driver pose, one drawing per view. */
import type { DriverPose } from './driver.js';
export interface Pt {
    x: number;
    y: number;
}
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface ArmPacket {
    id: 'front' | 'three-quarter-R' | 'profile-R';
    label: string;
    assetId: string;
    sha256: string;
    width: number;
    height: number;
    yaw: number;
    yawHalf: number;
    shoulder: Pt;
    elbow: Pt;
    wrist: Pt;
    tip: Pt;
    radius: number;
    bones: ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'];
    /** Image-right limit so the arm piece cannot include the chest. */
    armMaxX: number;
    hair: Box;
    eyes: Box;
    mouth: Box;
}
export declare const ARM_PACKETS: ArmPacket[];
export declare function bindingBlocked(flags: string[]): boolean;
export declare function angDist(a: number, b: number): number;
export declare function packetForYaw(yaw: number): ArmPacket | null;
export declare function armAngles(pose: DriverPose): {
    upper: number;
    fore: number;
    hand: number;
};
export declare function armChain(packet: ArmPacket, pose: DriverPose): {
    shoulder: Pt;
    elbow: Pt;
    wrist: Pt;
    tip: Pt;
};
export declare function lifePhase(t: number): {
    blink: number;
    mouth: number;
    hair: number;
};
export declare function armOwnsOnly(): string[];
/** Weights are one owner per segment, normalized. */
export declare function armWeightAudit(): {
    vertices: number;
    invalid: number;
    unweighted: number;
    maxInfluences: number;
    normalized: boolean;
};
export declare class ArmPainter {
    private plate;
    private pctx;
    private keyed;
    constructor();
    private keyedOf;
    draw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, packet: ArmPacket, pose: DriverPose, viewW: number, viewH: number, zoom: number): void;
}
