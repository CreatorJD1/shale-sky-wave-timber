import type { BoneId } from "./types";

export interface CutPart {
  id: string;
  bone: BoneId;
  src: string;
  x: number; y: number; w: number; h: number; px: number; py: number;
}

export const CUT_CANVAS = { w: 512, h: 1100 };

export const CUT_PARTS: CutPart[] = [
  { id: "l-thigh", bone: "lHip", src: "/puppet/cut/l-thigh.png", x: 176, y: 518, w: 95, h: 323, px: 51.84, py: 45.2 },
  { id: "r-thigh", bone: "rHip", src: "/puppet/cut/r-thigh.png", x: 239, y: 518, w: 100, h: 323, px: 45.16, py: 45.2 },
  { id: "l-calf", bone: "lKnee", src: "/puppet/cut/l-calf.png", x: 174, y: 753, w: 82, h: 312, px: 45.14, py: 41.2 },
  { id: "r-calf", bone: "rKnee", src: "/puppet/cut/r-calf.png", x: 259, y: 753, w: 78, h: 313, px: 33.86, py: 41.2 },
  { id: "l-foot", bone: "lAnkle", src: "/puppet/cut/l-foot.png", x: 181, y: 995, w: 65, h: 66, px: 34.04, py: 33.5 },
  { id: "r-foot", bone: "rAnkle", src: "/puppet/cut/r-foot.png", x: 264, y: 995, w: 68, h: 67, px: 32.96, py: 33.5 },
  { id: "pelvis", bone: "torso", src: "/puppet/cut/pelvis.png", x: 200, y: 508, w: 113, h: 185, px: 56.0, py: 55.2 },
  { id: "chest", bone: "hinge", src: "/puppet/cut/chest.png", x: 199, y: 171, w: 118, h: 292, px: 57.0, py: 233.8 },
  { id: "l-upper", bone: "lShoulder", src: "/puppet/cut/l-upper.png", x: 148, y: 236, w: 101, h: 213, px: 56.8, py: 43.4 },
  { id: "r-upper", bone: "rShoulder", src: "/puppet/cut/r-upper.png", x: 264, y: 236, w: 102, h: 213, px: 43.2, py: 43.4 },
  { id: "l-fore", bone: "lElbow", src: "/puppet/cut/l-fore.png", x: 141, y: 365, w: 85, h: 225, px: 44.34, py: 39.8 },
  { id: "r-fore", bone: "rElbow", src: "/puppet/cut/r-fore.png", x: 287, y: 365, w: 84, h: 225, px: 39.66, py: 39.8 },
  { id: "l-hand", bone: "lWrist", src: "/puppet/cut/l-hand.png", x: 145, y: 517, w: 63, h: 108, px: 28.06, py: 33.0 },
  { id: "r-hand", bone: "rWrist", src: "/puppet/cut/r-hand.png", x: 305, y: 517, w: 62, h: 115, px: 33.94, py: 33.0 },
  { id: "head", bone: "head", src: "/puppet/cut/head.png", x: 204, y: 66, w: 111, h: 219, px: 55.07, py: 104.5 },
];
