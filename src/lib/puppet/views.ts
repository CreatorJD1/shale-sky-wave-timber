/** Canonical 2.5D view graph. Sheet cuts only. */

export const RIG_W = 512;
export const RIG_H = 1100;
export const RIG_ASPECT = RIG_W / RIG_H;

export interface ViewKey {
  yaw: number;
  src: string;
  flip: boolean;
  label: string;
  mesh: boolean;
}

export const VIEW_KEYS: ViewKey[] = [
  { yaw: 0, src: "/puppet/rig/front.png?v=6", flip: false, label: "Front", mesh: true },
  { yaw: 45, src: "/puppet/rig/qtr.png?v=6", flip: false, label: "3/4", mesh: false },
  { yaw: 90, src: "/puppet/rig/side.png?v=6", flip: false, label: "Side", mesh: false },
  { yaw: 135, src: "/puppet/rig/back.png?v=6", flip: false, label: "Back", mesh: false },
  { yaw: 180, src: "/puppet/rig/back.png?v=6", flip: false, label: "Back", mesh: false },
  { yaw: 225, src: "/puppet/rig/back.png?v=6", flip: true, label: "Back", mesh: false },
  { yaw: 270, src: "/puppet/rig/side.png?v=6", flip: true, label: "Side", mesh: false },
  { yaw: 315, src: "/puppet/rig/qtr.png?v=6", flip: true, label: "3/4", mesh: false },
];

export const HINGE_VIEW = "/puppet/rig/hinge.png?v=6";

export const HINGE_KEYS: ViewKey[] = VIEW_KEYS.map((k) => ({
  ...k,
  src: HINGE_VIEW,
  label: k.yaw === 0 || k.yaw === 180 ? "Hinge" : `Hinge ${k.label}`,
  mesh: false,
}));

export function wrapAngle(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function angDist(a: number, b: number) {
  const d = Math.abs(wrapAngle(a) - wrapAngle(b));
  return Math.min(d, 360 - d);
}

export function nearestFrom(keys: ViewKey[], yaw: number): ViewKey {
  let best = keys[0];
  let bestD = 999;
  for (const key of keys) {
    const d = angDist(yaw, key.yaw);
    if (d < bestD) {
      bestD = d;
      best = key;
    }
  }
  return best;
}

export function nearestView(yaw: number): ViewKey {
  return nearestFrom(VIEW_KEYS, yaw);
}

export function nearestHinge(yaw: number): ViewKey {
  return nearestFrom(HINGE_KEYS, yaw);
}

export function keysForClip(clip: string): ViewKey[] {
  if (clip === "hinge") return HINGE_KEYS;
  return VIEW_KEYS;
}

export function residualYaw(yaw: number, key: ViewKey) {
  let d = wrapAngle(yaw) - key.yaw;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return Math.max(-28, Math.min(28, d));
}

export function meshWeight(yaw: number, hinge: number) {
  const front = 1 - Math.min(1, angDist(yaw, 0) / 26);
  const hingeOk = 1 - Math.min(1, Math.max(0, Math.abs(hinge) - 16) / 22);
  return front * hingeOk;
}

export function stepYaw(yaw: number, dir: -1 | 1, clip = "idle") {
  const keys = keysForClip(clip);
  const cur = nearestFrom(keys, yaw);
  const i = Math.max(0, keys.findIndex((k) => k.yaw === cur.yaw && k.flip === cur.flip));
  return keys[(i + dir + keys.length) % keys.length].yaw;
}

export function viewLabel(yaw: number, hinge = false) {
  return hinge ? nearestHinge(yaw).label : nearestView(yaw).label;
}

/** Faces whose eyes are amber on the viewer's left and green on the right. Joy is omitted: those eyes are swapped. */
export const FACE_OK: { id: string; src: string; mouth: "closed" | "open" }[] = [
  { id: "neutral", src: "/puppet/emotions/neutral.png", mouth: "closed" },
  { id: "anger", src: "/puppet/emotions/anger.png", mouth: "closed" },
  { id: "sorrow", src: "/puppet/emotions/sorrow.png", mouth: "closed" },
  { id: "shock", src: "/puppet/emotions/shock.png", mouth: "open" },
  { id: "smirk", src: "/puppet/emotions/smirk.png", mouth: "closed" },
  { id: "focus", src: "/puppet/emotions/focus.png", mouth: "closed" },
  { id: "soft", src: "/puppet/emotions/soft.png", mouth: "closed" },
];

/** Open or closed only. A rejected emotion falls back to neutral. */
export function expressionSrc(emotion: string, blink = false, open = 1) {
  if (blink || open < 0.5) return "/puppet/blink/closed.png";
  return FACE_OK.find((f) => f.id === emotion)?.src ?? "/puppet/emotions/neutral.png";
}
