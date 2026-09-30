#!/usr/bin/env python3
"""Cut overlapping FK pieces from the locked front plate."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("/workspace/public/puppet/rig/front.png")
OUT = Path("/workspace/public/puppet/cut")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 512, 1100

JOINTS = {
    "torso": (0.5, 0.512),
    "hinge": (0.5, 0.368),
    "neck": (0.506, 0.208),
    "head": (0.506, 0.155),
    "lShoulder": (0.4, 0.254),
    "lElbow": (0.362, 0.368),
    "lWrist": (0.338, 0.5),
    "rShoulder": (0.6, 0.254),
    "rElbow": (0.638, 0.368),
    "rWrist": (0.662, 0.5),
    "lHip": (0.445, 0.512),
    "lKnee": (0.428, 0.722),
    "lAnkle": (0.42, 0.935),
    "rHip": (0.555, 0.512),
    "rKnee": (0.572, 0.722),
    "rAnkle": (0.58, 0.935),
}

# piece: (id, bone, ax, ay, bx, by, radius_px, extra_pad)
# (ax,ay)-(bx,by) in normalized space
PIECES = [
    ("head", "head", 0.506, 0.208, 0.502, 0.072, 50, 6),
    ("chest", "hinge", 0.5, 0.368, 0.506, 0.208, 50, 8),
    ("pelvis", "torso", 0.5, 0.512, 0.5, 0.58, 48, 8),
    ("l-upper", "lShoulder", 0.4, 0.254, 0.362, 0.368, 28, 16),
    ("l-fore", "lElbow", 0.362, 0.368, 0.338, 0.5, 24, 16),
    ("l-hand", "lWrist", 0.338, 0.5, 0.318, 0.565, 22, 12),
    ("r-upper", "rShoulder", 0.6, 0.254, 0.638, 0.368, 28, 16),
    ("r-fore", "rElbow", 0.638, 0.368, 0.662, 0.5, 24, 16),
    ("r-hand", "rWrist", 0.662, 0.5, 0.682, 0.565, 22, 12),
    ("l-thigh", "lHip", 0.445, 0.512, 0.428, 0.722, 32, 14),
    ("l-calf", "lKnee", 0.428, 0.722, 0.42, 0.935, 28, 14),
    ("l-foot", "lAnkle", 0.42, 0.935, 0.412, 0.988, 24, 10),
    ("r-thigh", "rHip", 0.555, 0.512, 0.572, 0.722, 32, 14),
    ("r-calf", "rKnee", 0.572, 0.722, 0.58, 0.935, 28, 14),
    ("r-foot", "rAnkle", 0.58, 0.935, 0.588, 0.988, 24, 10),
]


def dist_seg(px, py, ax, ay, bx, by):
    abx, aby = bx - ax, by - ay
    t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby + 1e-6)
    t = np.clip(t, 0, 1)
    qx, qy = ax + abx * t, ay + aby * t
    return np.hypot(px - qx, py - qy)


im = np.array(Image.open(SRC).convert("RGBA"))
body = im[..., 3] > 8
yy, xx = np.mgrid[0:H, 0:W]
manifest = []

for pid, bone, nax, nay, nbx, nby, radius, pad in PIECES:
    ax, ay, bx, by = nax * W, nay * H, nbx * W, nby * H
    d = dist_seg(xx, yy, ax, ay, bx, by)
    mask = body & (d <= radius)
    if not mask.any():
        print("empty", pid)
        continue
    ys, xs = np.where(mask)
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(W, int(xs.max()) + 1 + pad)
    y1 = min(H, int(ys.max()) + 1 + pad)
    crop = im[y0:y1, x0:x1].copy()
    local = mask[y0:y1, x0:x1]
    # keep a little fringe of the original alpha inside bbox (overlap)
    crop[..., 3] = np.where(local, crop[..., 3], 0)
    crop[crop[..., 3] == 0] = 0
    jx, jy = JOINTS[bone]
    pivot = [jx * W - x0, jy * H - y0]
    dest = OUT / f"{pid}.png"
    Image.fromarray(crop, "RGBA").save(dest)
    manifest.append(
        {
            "id": pid,
            "bone": bone,
            "src": f"/puppet/cut/{pid}.png",
            "x": x0,
            "y": y0,
            "w": x1 - x0,
            "h": y1 - y0,
            "px": pivot[0],
            "py": pivot[1],
        }
    )
    print(pid, dest, crop.shape[1], crop.shape[0], "pivot", [round(p, 1) for p in pivot])

# draw order: far limbs, legs, pelvis, chest, arms, hands, head
order = [
    "l-thigh",
    "r-thigh",
    "l-calf",
    "r-calf",
    "l-foot",
    "r-foot",
    "pelvis",
    "chest",
    "l-upper",
    "r-upper",
    "l-fore",
    "r-fore",
    "l-hand",
    "r-hand",
    "head",
]
by_id = {p["id"]: p for p in manifest}
ordered = [by_id[i] for i in order if i in by_id]
(OUT / "parts.json").write_text(json.dumps({"canvas": [W, H], "parts": ordered}, indent=2))
ts = ['import type { BoneId } from "./types";', "", "export interface CutPart {", "  id: string;", "  bone: BoneId;", "  src: string;", "  x: number; y: number; w: number; h: number; px: number; py: number;", "}", "", "export const CUT_CANVAS = { w: 512, h: 1100 };", "", "export const CUT_PARTS: CutPart[] = ["]
for p in ordered:
    ts.append(
        f'  {{ id: "{p["id"]}", bone: "{p["bone"]}", src: "{p["src"]}", x: {p["x"]}, y: {p["y"]}, w: {p["w"]}, h: {p["h"]}, px: {round(p["px"],2)}, py: {round(p["py"],2)} }},'
    )
ts.append("];")
Path("/workspace/src/lib/puppet/parts.ts").write_text("\n".join(ts) + "\n")
print("parts", len(ordered))

