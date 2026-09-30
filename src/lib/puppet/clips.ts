import { IDLE_BONES, type Bones, type ClipId } from "./types";
import { idleGlance } from "./life";

export const POSES: Record<string, Bones> = {
  idle: { ...IDLE_BONES },
  reset: { ...IDLE_BONES },
  hinge: {
    ...IDLE_BONES,
    torso: 8,
    hinge: 72,
    neck: 18,
    head: -8,
    lShoulder: 20,
    lElbow: 40,
    rShoulder: -16,
    rElbow: -36,
    lHip: 18,
    lKnee: -20,
    rHip: 10,
    rKnee: 16,
  },
  reach: {
    ...IDLE_BONES,
    torso: -6,
    hinge: 12,
    neck: -10,
    head: 6,
    lShoulder: -80,
    lElbow: 20,
    rShoulder: 70,
    rElbow: -24,
    lHip: 8,
    lKnee: -10,
    rHip: -12,
    rKnee: 8,
  },
  collapse: {
    ...IDLE_BONES,
    torso: 14,
    hinge: 88,
    neck: 28,
    head: 10,
    lShoulder: 50,
    lElbow: 70,
    rShoulder: -48,
    rElbow: -64,
    lHip: 28,
    lKnee: -40,
    rHip: 22,
    rKnee: 36,
  },
  twist: {
    ...IDLE_BONES,
    torso: 22,
    hinge: 28,
    neck: -24,
    head: -12,
    lShoulder: 40,
    lElbow: 18,
    rShoulder: 50,
    rElbow: -10,
    lHip: -8,
    lKnee: -12,
    rHip: 16,
    rKnee: 10,
  },
};

export const HINGE_KEYS: { t: number; pose: Bones }[] = [
  { t: 0, pose: POSES.idle },
  { t: 0.14, pose: { ...POSES.idle, hinge: 18, neck: 8 } },
  { t: 0.28, pose: { ...POSES.hinge, hinge: 40 } },
  { t: 0.42, pose: POSES.hinge },
  { t: 0.6, pose: POSES.collapse },
  { t: 0.77, pose: POSES.hinge },
  { t: 1, pose: POSES.idle },
];

export function smoothstep(f: number) {
  const x = Math.max(0, Math.min(1, f));
  return x * x * (3 - 2 * x);
}

export function lerpBones(a: Bones, b: Bones, t: number): Bones {
  const s = smoothstep(t);
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof Bones)[]) {
    out[k] = a[k] + (b[k] - a[k]) * s;
  }
  return out;
}

export function sampleKeys(keys: { t: number; pose: Bones }[], u: number): Bones {
  const t = ((u % 1) + 1) % 1;
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const f = (t - a.t) / Math.max(0.001, b.t - a.t);
  return lerpBones(a.pose, b.pose, f);
}

export function sampleHinge(u: number): Bones {
  return sampleKeys(HINGE_KEYS, u);
}

export const WAVE_KEYS: { t: number; pose: Bones }[] = [
  { t: 0, pose: POSES.idle },
  { t: 0.18, pose: { ...POSES.idle, rShoulder: 48, rElbow: -18, neck: -6, head: 4 } },
  { t: 0.36, pose: { ...POSES.idle, rShoulder: 88, rElbow: -8, neck: -8, head: 6 } },
  { t: 0.52, pose: { ...POSES.idle, rShoulder: 70, rElbow: -36, neck: -4, head: 8 } },
  { t: 0.68, pose: { ...POSES.idle, rShoulder: 96, rElbow: -6, neck: -8, head: 4 } },
  { t: 0.84, pose: { ...POSES.idle, rShoulder: 40, rElbow: -12 } },
  { t: 1, pose: POSES.idle },
];

export function sampleWave(u: number): Bones {
  return sampleKeys(WAVE_KEYS, u);
}

/** Held pose of a clip. The hinge hold is the authored hinge pose, not the collapse it passes through. */
export function poseForClip(id: ClipId): Bones | null {
  if (id === "reach") return POSES.reach;
  if (id === "collapse") return POSES.collapse;
  if (id === "twist") return POSES.twist;
  if (id === "hinge") return POSES.hinge;
  return null;
}

export type TrackKey = { t: number; pose: Bones };

function held(pose: Bones): TrackKey[] {
  return [
    { t: 0, pose: POSES.idle },
    { t: 0.35, pose },
    { t: 0.65, pose },
    { t: 1, pose: POSES.idle },
  ];
}

/** Rest pose for the whole loop. No joint was invented. */
export const IDLE_KEYS: TrackKey[] = [
  { t: 0, pose: POSES.idle },
  { t: 1, pose: POSES.idle },
];

export const REACH_KEYS = held(POSES.reach);
export const COLLAPSE_KEYS = held(POSES.collapse);
export const TWIST_KEYS = held(POSES.twist);

export const CLIP_KEYS: Partial<Record<ClipId, TrackKey[]>> = {
  idle: IDLE_KEYS,
  look: IDLE_KEYS,
  hinge: HINGE_KEYS,
  wave: WAVE_KEYS,
  reach: REACH_KEYS,
  collapse: COLLAPSE_KEYS,
  twist: TWIST_KEYS,
};

/**
 * Only the two blink drawings whose lids match the name.
 * half.png is still open. half2.png is a wink, not a half blink.
 */
export function eyeFor(clip: string, u: number): { open: number; src: string } {
  const t = ((u % 1) + 1) % 1;
  const shut = clip === "idle" && t >= 0.4 && t < 0.58;
  return shut
    ? { open: 0, src: "/puppet/blink/closed.png" }
    : { open: 1, src: "/puppet/blink/open.png" };
}

/** View yaw from the existing glance. Not an iris direction. */
export function gazeFor(clip: string, seconds: number): number | null {
  if (clip === "idle" || clip === "look" || clip === "live") return idleGlance(seconds) ?? 0;
  return null;
}

export type SampledFrame = {
  joints: Bones;
  eyes: { open: number; src: string };
  gaze: number | null;
  mouth: null;
  fingers: null;
  hair: null;
};

export function sampleClip(id: string, seconds: number): SampledFrame | null {
  const keys = CLIP_KEYS[id as ClipId];
  if (!keys) return null;
  const u = ((seconds % 1) + 1) % 1;
  return {
    joints: sampleKeys(keys, u),
    eyes: eyeFor(id, u),
    gaze: gazeFor(id, seconds),
    mouth: null,
    fingers: null,
    hair: null,
  };
}
