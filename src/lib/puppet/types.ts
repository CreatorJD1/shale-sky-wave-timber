export const BONE_IDS = [
  "torso",
  "hinge",
  "neck",
  "head",
  "lShoulder",
  "lElbow",
  "lWrist",
  "rShoulder",
  "rElbow",
  "rWrist",
  "lHip",
  "lKnee",
  "lAnkle",
  "rHip",
  "rKnee",
  "rAnkle",
] as const;

export type BoneId = (typeof BONE_IDS)[number];

export type Bones = Record<BoneId, number>;

export type EmotionId =
  | "neutral"
  | "joy"
  | "anger"
  | "sorrow"
  | "shock"
  | "smirk"
  | "focus"
  | "soft";

export type ClipId = "live" | "idle" | "hinge" | "wave" | "reach" | "crouch" | "collapse" | "twist" | "look" | "walk";

export interface BoneDef {
  id: BoneId;
  label: string;
  group: "Spine" | "Arms" | "Legs";
  min: number;
  max: number;
}

export const BONE_DEFS: BoneDef[] = [
  { id: "hinge", label: "Hinge", group: "Spine", min: -12, max: 96 },
  { id: "torso", label: "Torso", group: "Spine", min: -36, max: 36 },
  { id: "neck", label: "Neck", group: "Spine", min: -48, max: 48 },
  { id: "head", label: "Head", group: "Spine", min: -36, max: 36 },
  { id: "lShoulder", label: "L shldr", group: "Arms", min: -120, max: 80 },
  { id: "lElbow", label: "L elbow", group: "Arms", min: 0, max: 140 },
  { id: "lWrist", label: "L wrist", group: "Arms", min: -70, max: 70 },
  { id: "rShoulder", label: "R shldr", group: "Arms", min: -80, max: 120 },
  { id: "rElbow", label: "R elbow", group: "Arms", min: -140, max: 0 },
  { id: "rWrist", label: "R wrist", group: "Arms", min: -70, max: 70 },
  { id: "lHip", label: "L hip", group: "Legs", min: -40, max: 80 },
  { id: "lKnee", label: "L knee", group: "Legs", min: -140, max: 0 },
  { id: "lAnkle", label: "L ankle", group: "Legs", min: -50, max: 50 },
  { id: "rHip", label: "R hip", group: "Legs", min: -80, max: 40 },
  { id: "rKnee", label: "R knee", group: "Legs", min: 0, max: 140 },
  { id: "rAnkle", label: "R ankle", group: "Legs", min: -50, max: 50 },
];

export const IDLE_BONES: Bones = {
  torso: 0,
  hinge: 0,
  neck: 0,
  head: 0,
  lShoulder: 0,
  lElbow: 0,
  lWrist: 0,
  rShoulder: 0,
  rElbow: 0,
  rWrist: 0,
  lHip: 0,
  lKnee: 0,
  lAnkle: 0,
  rHip: 0,
  rKnee: 0,
  rAnkle: 0,
};

export const EMOTIONS: { id: EmotionId; label: string; src: string }[] = [
  { id: "neutral", label: "Neutral", src: "/puppet/emotions/neutral.png" },
  { id: "joy", label: "Joy", src: "/puppet/emotions/joy.png" },
  { id: "anger", label: "Anger", src: "/puppet/emotions/anger.png" },
  { id: "sorrow", label: "Sorrow", src: "/puppet/emotions/sorrow.png" },
  { id: "shock", label: "Shock", src: "/puppet/emotions/shock.png" },
  { id: "smirk", label: "Smirk", src: "/puppet/emotions/smirk.png" },
  { id: "focus", label: "Focus", src: "/puppet/emotions/focus.png" },
  { id: "soft", label: "Soft", src: "/puppet/emotions/soft.png" },
];

export const CLIPS: {
  id: ClipId;
  label: string;
  kind: "sheet" | "bones" | "live";
  frames?: string[];
  loop?: boolean;
}[] = [
  { id: "live", label: "Live", kind: "live" },
  { id: "idle", label: "Idle", kind: "live" },
  { id: "hinge", label: "Hinge", kind: "bones", loop: true },
  { id: "wave", label: "Wave", kind: "bones", loop: true },
  { id: "reach", label: "Reach", kind: "bones" },
  { id: "collapse", label: "Collapse", kind: "bones" },
  { id: "twist", label: "Twist", kind: "bones" },
];
