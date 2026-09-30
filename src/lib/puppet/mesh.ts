import { BONE_IDS, type BoneId, type Bones } from "./types";

export type { BoneId };

export type Vec = { x: number; y: number };

export interface JointDef {
  id: BoneId;
  parent: BoneId | null;
  /** Rest joint in 0–1 image space (A-pose front). */
  x: number;
  y: number;
  /** Implicit tip if this bone has no child along its length. */
  tip?: Vec;
}

/** Joints in registered 512×1100 front space. Measured from the sheet silhouette. */
export const JOINTS: JointDef[] = [
  { id: "torso", parent: null, x: 0.5, y: 0.512 },
  { id: "hinge", parent: "torso", x: 0.5, y: 0.368 },
  { id: "neck", parent: "hinge", x: 0.506, y: 0.208 },
  { id: "head", parent: "neck", x: 0.506, y: 0.155, tip: { x: 0.502, y: 0.085 } },
  { id: "lShoulder", parent: "hinge", x: 0.4, y: 0.254 },
  { id: "lElbow", parent: "lShoulder", x: 0.362, y: 0.368 },
  { id: "lWrist", parent: "lElbow", x: 0.338, y: 0.5, tip: { x: 0.325, y: 0.555 } },
  { id: "rShoulder", parent: "hinge", x: 0.6, y: 0.254 },
  { id: "rElbow", parent: "rShoulder", x: 0.638, y: 0.368 },
  { id: "rWrist", parent: "rElbow", x: 0.662, y: 0.5, tip: { x: 0.675, y: 0.555 } },
  { id: "lHip", parent: "torso", x: 0.445, y: 0.512 },
  { id: "lKnee", parent: "lHip", x: 0.428, y: 0.722 },
  { id: "lAnkle", parent: "lKnee", x: 0.42, y: 0.935, tip: { x: 0.418, y: 0.97 } },
  { id: "rHip", parent: "torso", x: 0.555, y: 0.512 },
  { id: "rKnee", parent: "rHip", x: 0.572, y: 0.722 },
  { id: "rAnkle", parent: "rKnee", x: 0.58, y: 0.935, tip: { x: 0.582, y: 0.97 } },
];

export interface WorldJoint {
  id: BoneId;
  x: number;
  y: number;
  rot: number;
  restX: number;
  restY: number;
}

export function rotate(x: number, y: number, deg: number): Vec {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}

export function computeWorld(angles: Bones, w: number, h: number): Record<BoneId, WorldJoint> {
  const rest: Record<string, JointDef> = {};
  for (const j of JOINTS) rest[j.id] = j;
  const out = {} as Record<BoneId, WorldJoint>;

  const walk = (id: BoneId) => {
    const def = rest[id];
    const rx = def.x * w;
    const ry = def.y * h;
    if (!def.parent) {
      out[id] = { id, x: rx, y: ry, rot: angles[id], restX: rx, restY: ry };
      return;
    }
    if (!out[def.parent]) walk(def.parent);
    const p = out[def.parent];
    const v = rotate(rx - p.restX, ry - p.restY, p.rot);
    out[id] = {
      id,
      x: p.x + v.x,
      y: p.y + v.y,
      rot: p.rot + angles[id],
      restX: rx,
      restY: ry,
    };
  };

  for (const id of BONE_IDS) walk(id);
  return out;
}

export interface Vert {
  x: number;
  y: number;
  u: number;
  v: number;
  bones: { id: BoneId; w: number }[];
}

export interface Mesh {
  cols: number;
  rows: number;
  verts: Vert[];
}

function dist2seg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby + 1e-6)));
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
}

export function buildMesh(w: number, h: number, cols = 18, rows = 42): Mesh {
  const segs: { id: BoneId; ax: number; ay: number; bx: number; by: number; falloff: number }[] = [];
  const wide: BoneId[] = ["torso", "hinge", "neck", "head"];
  for (const j of JOINTS) {
    const ax = j.x * w;
    const ay = j.y * h;
    const ends: Vec[] = JOINTS.filter((c) => c.parent === j.id).map((c) => ({ x: c.x * w, y: c.y * h }));
    if (j.tip) ends.push({ x: j.tip.x * w, y: j.tip.y * h });
    for (const e of ends) {
      const len = Math.hypot(e.x - ax, e.y - ay);
      const falloff = wide.includes(j.id) ? Math.max(40, len * 0.72) : Math.max(20, len * 0.4);
      segs.push({ id: j.id, ax, ay, bx: e.x, by: e.y, falloff });
    }
  }

  const verts: Vert[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * w;
      const v = (j / rows) * h;
      const infl: { id: BoneId; w: number }[] = [];
      for (const s of segs) {
        const d = dist2seg(u, v, s.ax, s.ay, s.bx, s.by);
        const wt = Math.max(0, 1 - d / s.falloff);
        if (wt > 0.04) infl.push({ id: s.id, w: wt * wt });
      }
      infl.sort((a, b) => b.w - a.w);
      const top = infl.slice(0, 4);
      const sum = top.reduce((a, b) => a + b.w, 0) || 1;
      verts.push({
        x: u,
        y: v,
        u,
        v,
        bones: top.map((t) => ({ id: t.id, w: t.w / sum })),
      });
    }
  }
  return { cols, rows, verts };
}

export function skinVertex(vert: Vert, world: Record<BoneId, WorldJoint>): Vec {
  if (vert.bones.length === 0) return { x: vert.x, y: vert.y };
  let x = 0;
  let y = 0;
  for (const b of vert.bones) {
    const j = world[b.id];
    const r = rotate(vert.x - j.restX, vert.y - j.restY, j.rot);
    x += (j.x + r.x) * b.w;
    y += (j.y + r.y) * b.w;
  }
  return { x, y };
}
