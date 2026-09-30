import { IDLE_BONES, type Bones, type ClipId } from "./types";

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

export function poseForClip(id: ClipId): Bones | null {
  if (id === "reach") return POSES.reach;
  if (id === "collapse") return POSES.collapse;
  if (id === "twist") return POSES.twist;
  if (id === "hinge") return POSES.hinge;
  return null;
}
