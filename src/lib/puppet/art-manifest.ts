/** Complete 2D sim sprite list. Left-side views are flips of right. */

export type ArtStatus = "have" | "gen" | "todo";

export interface ArtItem {
  id: string;
  pose: string;
  view: string;
  yaw: number;
  file: string;
  status: ArtStatus;
  notes: string;
}

export const ART_MANIFEST: ArtItem[] = [
  // —— Stand / A-pose (source sheet) ——
  { id: "stand-front", pose: "stand", view: "front", yaw: 0, file: "/puppet/rig/front.png", status: "have", notes: "Sheet cut. Master lock." },
  { id: "stand-qtr", pose: "stand", view: "3/4", yaw: 45, file: "/puppet/rig/qtr.png", status: "have", notes: "Sheet cut." },
  { id: "stand-side", pose: "stand", view: "side", yaw: 90, file: "/puppet/rig/side.png", status: "have", notes: "Sheet cut." },
  { id: "stand-qtrback", pose: "stand", view: "3/4 back", yaw: 135, file: "/puppet/rig/qtr-back.png", status: "have", notes: "Generated from back." },
  { id: "stand-back", pose: "stand", view: "back", yaw: 180, file: "/puppet/rig/back.png", status: "have", notes: "Sheet cut." },

  // —— Hinge fold ——
  { id: "hinge-front", pose: "hinge", view: "front", yaw: 0, file: "/puppet/rig/hinge.png", status: "have", notes: "Sheet cut." },
  { id: "hinge-qtr", pose: "hinge", view: "3/4", yaw: 45, file: "/puppet/rig/hinge-qtr.png", status: "have", notes: "Generated from hinge." },
  { id: "hinge-side", pose: "hinge", view: "side", yaw: 90, file: "/puppet/rig/hinge-side.png", status: "have", notes: "Generated from hinge." },
  { id: "hinge-qtrback", pose: "hinge", view: "3/4 back", yaw: 135, file: "/puppet/rig/hinge-back.png", status: "todo", notes: "Flip/gen from hinge-back." },
  { id: "hinge-back", pose: "hinge", view: "back", yaw: 180, file: "/puppet/rig/hinge-back.png", status: "have", notes: "Generated from hinge." },

  // —— Wave ——
  { id: "wave-front", pose: "wave", view: "front", yaw: 0, file: "/puppet/rig/wave.png", status: "gen", notes: "Right hand wave, feet planted." },
  { id: "wave-qtr", pose: "wave", view: "3/4", yaw: 45, file: "/puppet/rig/wave-qtr.png", status: "todo", notes: "After wave-front locks." },
  { id: "wave-side", pose: "wave", view: "side", yaw: 90, file: "/puppet/rig/wave-side.png", status: "todo", notes: "After wave-front locks." },
  { id: "wave-back", pose: "wave", view: "back", yaw: 180, file: "/puppet/rig/wave-back.png", status: "todo", notes: "Optional." },

  // —— Reach ——
  { id: "reach-front", pose: "reach", view: "front", yaw: 0, file: "/puppet/rig/reach.png", status: "gen", notes: "One arm out, full body." },
  { id: "reach-qtr", pose: "reach", view: "3/4", yaw: 45, file: "/puppet/rig/reach-qtr.png", status: "todo", notes: "After reach-front locks." },
  { id: "reach-side", pose: "reach", view: "side", yaw: 90, file: "/puppet/rig/reach-side.png", status: "todo", notes: "After reach-front locks." },

  // —— Crouch / ready (sheet 65479) ——
  { id: "crouch-qtr", pose: "crouch", view: "3/4", yaw: 45, file: "/puppet/rig/crouch.png", status: "have", notes: "Sheet 65479 only. On-model." },
  { id: "crouch-front", pose: "crouch", view: "front", yaw: 0, file: "", status: "todo", notes: "REJECTED — photoreal leather drift. Do not gen from Imagine until it matches ink+mesh." },
  { id: "crouch-side", pose: "crouch", view: "side", yaw: 90, file: "", status: "todo", notes: "REJECTED — photoreal leather drift." },

  // —— Idle life (same silhouette, micro change) ——
  { id: "breath-front", pose: "breath", view: "front", yaw: 0, file: "/puppet/rig/breath.png", status: "gen", notes: "Inhale. Chest/mesh up a hair. Feet locked." },
  { id: "shift-front", pose: "shift", view: "front", yaw: 0, file: "/puppet/rig/shift.png", status: "gen", notes: "Weight on right hip. Feet locked." },
  { id: "blink-front", pose: "blink", view: "front", yaw: 0, file: "/puppet/rig/expr/blink.png", status: "gen", notes: "Same A-pose, lids closed." },

  // —— Face on body (front only; 3/4 later) ——
  { id: "face-joy", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/joy.png", status: "gen", notes: "Smile only. Body is stand-front." },
  { id: "face-anger", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/anger.png", status: "gen", notes: "Frown only." },
  { id: "face-sorrow", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/sorrow.png", status: "gen", notes: "Downturned only." },
  { id: "face-shock", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/shock.png", status: "todo", notes: "After first three lock." },
  { id: "face-smirk", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/smirk.png", status: "todo", notes: "After first three lock." },
  { id: "face-focus", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/focus.png", status: "todo", notes: "After first three lock." },
  { id: "face-soft", pose: "face", view: "front", yaw: 0, file: "/puppet/rig/expr/soft.png", status: "todo", notes: "After first three lock." },
];

export function artCounts() {
  const have = ART_MANIFEST.filter((a) => a.status === "have").length;
  const gen = ART_MANIFEST.filter((a) => a.status === "gen").length;
  const todo = ART_MANIFEST.filter((a) => a.status === "todo").length;
  return { have, gen, todo, total: ART_MANIFEST.length, flips: 8 };
}
