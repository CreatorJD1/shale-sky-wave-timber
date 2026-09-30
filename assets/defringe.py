#!/usr/bin/env python3
"""Re-key white paper, eat JPEG halo, foot-lock every sheet view."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

CANON_W, CANON_H, CHAR_H, FEET_Y = 512, 1100, 980, 1052
OUT = Path("/workspace/public/puppet/rig")
SHEET = Path("/workspace/public/puppet/sheet")


def dilate(mask: np.ndarray, n: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(n):
        m = out.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
        out[0, :], out[-1, :], out[:, 0], out[:, -1] = m[0, :], m[-1, :], m[:, 0], m[:, -1]
    return out


def erode(mask: np.ndarray, n: int) -> np.ndarray:
    return ~dilate(~mask, n)


def key_paper(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGBA"))
    r = a[..., 0].astype(np.int16)
    g = a[..., 1].astype(np.int16)
    b = a[..., 2].astype(np.int16)
    luma = (0.299 * r + 0.587 * g + 0.114 * b)
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    paper = ((luma > 214) & (sat < 32)) | ((r > 208) & (g > 208) & (b > 200) & (sat < 22))
    paper = dilate(paper, 1)  # eat 1px JPEG halo
    keep = erode(~paper, 1)
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    # remaining pale rim → fade
    rim = (~keep) & dilate(keep, 2) & (luma > 160)
    alpha = np.where(rim, 40, alpha)
    # despill light pixels that survived
    pale = (alpha > 0) & (luma > 190) & (sat < 40)
    a[..., 0] = np.where(pale, np.clip(r - 40, 0, 255), a[..., 0])
    a[..., 1] = np.where(pale, np.clip(g - 40, 0, 255), a[..., 1])
    a[..., 2] = np.where(pale, np.clip(b - 40, 0, 255), a[..., 2])
    a[..., 3] = np.where(pale, np.minimum(alpha, 90), alpha)
    return Image.fromarray(a, "RGBA")


def place(im: Image.Image) -> Image.Image:
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return Image.new("RGBA", (CANON_W, CANON_H), (0, 0, 0, 0))
    crop = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    scale = CHAR_H / crop.height
    nw = max(1, int(round(crop.width * scale)))
    nh = CHAR_H
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANON_W, CANON_H), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((CANON_W - nw) // 2, FEET_Y - nh))
    return canvas


jobs = {
    "front": SHEET / "front-raw.png",
    "qtr": SHEET / "qtr-raw.png",
    "side": SHEET / "side-raw.png",
    "back": SHEET / "back-raw.png",
    "hinge": SHEET / "hinge-raw.png",
}

for name, src in jobs.items():
    if not src.exists():
        print("missing", src)
        continue
    out = place(key_paper(Image.open(src)))
    dest = OUT / f"{name}.png"
    out.save(dest)
    a = np.array(out)[..., 3]
    ys, xs = np.where(a > 12)
    print(name, "y", int(ys.min()), int(ys.max()), "x", int(xs.min()), int(xs.max()), "h", int(ys.max() - ys.min()))

# keep expression bodies on the clean front
front = (OUT / "front.png").read_bytes()
expr = OUT / "expr"
expr.mkdir(exist_ok=True)
for name in ["neutral", "joy", "anger", "sorrow", "shock", "smirk", "focus", "soft", "blink"]:
    (expr / f"{name}.png").write_bytes(front)
print("expr reset")
