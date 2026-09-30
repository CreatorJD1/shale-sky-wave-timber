#!/usr/bin/env python3
"""Key magenta, drop ghost duplicates, lock expression bodies to the canon frame."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from importlib.machinery import SourceFileLoader

p = SourceFileLoader("proc", "/workspace/assets/process_sprites.py").load_module()

OUT = Path("/workspace/public/puppet/rig/expr")
OUT.mkdir(parents=True, exist_ok=True)

CANON_W, CANON_H, CHAR_H, FEET_Y = 512, 1100, 980, 1052


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


def largest_blob(im: Image.Image) -> Image.Image:
    a = np.array(im)
    alpha = a[..., 3] > 12
    h, w = alpha.shape
    seen = np.zeros_like(alpha, dtype=bool)
    best = None
    best_n = 0
    for y in range(h):
        xs = np.where(alpha[y] & ~seen[y])[0]
        for x in xs:
            if seen[y, x]:
                continue
            stack = [(y, x)]
            cells = []
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                cells.append((cy, cx))
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(cells) > best_n:
                best_n = len(cells)
                best = cells
    if not best:
        return im
    keep = np.zeros_like(alpha)
    for cy, cx in best:
        keep[cy, cx] = True
    a[..., 3] = np.where(keep, a[..., 3], 0)
    return Image.fromarray(a, "RGBA")


jobs = {
    "joy": Path("/workspace/artifacts/imagine_images/7e6b8a9b-6d6d-40ca-8879-f293c67cccd7.jpg"),
    "anger": Path("/workspace/artifacts/imagine_images/8904e786-c698-4ca6-b90f-70f18a4f92d1.jpg"),
    "sorrow": Path("/workspace/artifacts/imagine_images/ef4019f6-9061-4e7b-a9ca-c2764fae60a6.jpg"),
    "shock": Path("/workspace/artifacts/imagine_images/2481977f-8494-4a8d-8c7b-98b0b6396523.jpg"),
    "smirk": Path("/workspace/artifacts/imagine_images/101e776e-ae0e-4cb5-b5e9-877ca7a10ceb.jpg"),
    "focus": Path("/workspace/artifacts/imagine_images/b5475a8b-a817-4c1c-a57e-4f6bd9221509.jpg"),
    "soft": Path("/workspace/artifacts/imagine_images/fb5b390d-69ca-40c3-b71d-f8d5f54d346a.jpg"),
    "blink": Path("/workspace/artifacts/imagine_images/38bf3964-304a-4a90-b358-7de803f74e64.jpg"),
}

for name, src in jobs.items():
    keyed = largest_blob(p.chroma(Image.open(src)))
    placed = place(keyed)
    dest = OUT / f"{name}.png"
    placed.save(dest)
    print("wrote", dest, placed.size)

neutral = Path("/workspace/public/puppet/rig/front.png")
(OUT / "neutral.png").write_bytes(neutral.read_bytes())
print("copied neutral")
