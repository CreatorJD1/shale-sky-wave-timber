#!/usr/bin/env python3
"""Lock every turnaround onto one canonical frame: same height, same feet, no size pop."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path("/workspace/public/puppet/rig")
OUT.mkdir(parents=True, exist_ok=True)

CANON_W = 512
CANON_H = 1100
CHAR_H = 980
FEET_Y = 1052


def bbox(im: Image.Image, thresh: int = 12) -> tuple[int, int, int, int]:
    a = np.array(im.convert("RGBA"))[..., 3]
    ys, xs = np.where(a > thresh)
    if len(xs) == 0:
        return (0, 0, im.width, im.height)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def place(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    x0, y0, x1, y1 = bbox(im)
    crop = im.crop((x0, y0, x1, y1))
    scale = CHAR_H / crop.height
    nw = max(1, int(round(crop.width * scale)))
    nh = CHAR_H
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANON_W, CANON_H), (0, 0, 0, 0))
    x = (CANON_W - nw) // 2
    y = FEET_Y - nh
    canvas.alpha_composite(resized, (x, y))
    return canvas


jobs = {
    "front": Path("/workspace/public/puppet/body-front.png"),
    "qtr": Path("/workspace/public/puppet/views/threequarter.png"),
    "side": Path("/workspace/public/puppet/views/side.png"),
    "back": Path("/workspace/public/puppet/views/back.png"),
    "hinge": Path("/workspace/public/puppet/views/hinge-ref.png"),
}

for name, src in jobs.items():
    if not src.exists():
        print("missing", src)
        continue
    out = place(Image.open(src))
    dest = OUT / f"{name}.png"
    out.save(dest)
    print("wrote", dest, out.size)


meta = OUT / "canon.json"
meta.write_text(
    '{"w":%d,"h":%d,"charH":%d,"feetY":%d,"pxPerHead":%d}\n'
    % (CANON_W, CANON_H, CHAR_H, FEET_Y, CHAR_H // 8)
)
print("canon", CANON_W, CANON_H)
