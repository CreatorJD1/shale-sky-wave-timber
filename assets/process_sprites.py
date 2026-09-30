#!/usr/bin/env python3
"""Chroma keyed backgrounds and split grids. Sheet cells keep identical size (no per-frame trim)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path("/workspace/public/puppet")
OUT.mkdir(parents=True, exist_ok=True)
RAW = Path("/workspace/artifacts/imagine_images")


def is_key(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    hot = (r > 155) & (g < 60) & (b > 60) & ((r.astype(np.int16) - g.astype(np.int16)) > 90)
    classic = (r > 150) & (b > 150) & (g < 120) & ((r.astype(np.int16) + b.astype(np.int16)) / 2 - g > 70)
    paper = (r > 245) & (g > 245) & (b > 242)
    return hot | classic | paper


def dilate(mask: np.ndarray, n: int = 2) -> np.ndarray:
    out = mask.copy()
    for _ in range(n):
        m = out.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
        out[0, :] = m[0, :]
        out[-1, :] = m[-1, :]
        out[:, 0] = m[:, 0]
        out[:, -1] = m[:, -1]
    return out


def chroma(im: Image.Image) -> Image.Image:
    rgba = np.array(im.convert("RGBA"))
    r, g, b = rgba[..., 0], rgba[..., 1], rgba[..., 2]
    key = dilate(is_key(r, g, b), 2)
    alpha = np.where(key, 0, 255).astype(np.uint8)
    # despill remaining pink rim into nearby ink
    edge = (alpha > 0) & (r > 130) & (g < 90) & (b > 55) & ((r.astype(np.int16) - g.astype(np.int16)) > 50)
    rgba[..., 0] = np.where(edge, np.clip(g.astype(np.int16) + 25, 0, 255), r)
    rgba[..., 2] = np.where(edge, np.clip(g.astype(np.int16) + 30, 0, 255), b)
    rgba[..., 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def trim(im: Image.Image, pad: int = 8) -> Image.Image:
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, int(xs.min()) - pad), min(im.width, int(xs.max()) + pad + 1)
    y0, y1 = max(0, int(ys.min()) - pad), min(im.height, int(ys.max()) + pad + 1)
    return im.crop((x0, y0, x1, y1))


def split_grid(im: Image.Image, rows: int, cols: int) -> list[Image.Image]:
    """Keep every cell the same size so playback stays registered."""
    w, h = im.size
    cw, ch = w // cols, h // rows
    frames = []
    for row in range(rows):
        for col in range(cols):
            cell = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            frames.append(cell)
    return frames


def save(im: Image.Image, rel: str) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("wrote", path, im.size, im.mode)


def run() -> None:
    jobs = [
        ("ccefcc2f-edab-4c64-ba66-40cfa40f8e86.jpg", "body-front.png", None),
        ("c2b33008-6441-41e8-b7a3-e62acfda00d3.jpg", "body-threequarter.png", None),
        ("b9c4ac2f-320b-471e-9079-af1520be67de.jpg", "head.png", None),
        ("5ac37c42-e233-43a3-a93c-4032a779a27d.jpg", None, ("emotions", 2, 2, ["neutral", "joy", "anger", "sorrow"])),
        ("303ea726-fcff-4828-99a2-bba92c80130d.jpg", None, ("emotions", 2, 2, ["shock", "smirk", "focus", "soft"])),
        ("0ed1e1bd-8dd3-423d-bbff-6eec0f54e05c.jpg", None, ("blink", 2, 2, ["open", "half", "closed", "half2"])),
        ("20182391-d26e-492a-bec0-8706969a84d9.jpg", None, ("idle", 2, 2, ["0", "1", "2", "3"])),
        ("4a39f5b9-9070-45d1-a111-7454ea7aa62b.jpg", None, ("hinge", 2, 3, ["0", "1", "2", "3", "4", "5"])),
        ("af835057-a4f6-4efd-8b95-6c8eed79fce2.jpg", None, ("wave", 2, 2, ["0", "1", "2", "3"])),
    ]
    extra = Path("/workspace/artifacts/imagine_images")
    # denser sheets if present
    dense_hinge = sorted(extra.glob("*hinge*"))
    for filename, single, grid in jobs:
        src = RAW / filename
        if not src.exists():
            print("missing", src)
            continue
        keyed = chroma(Image.open(src))
        if single:
            save(trim(keyed, 4), single)
        if grid:
            folder, rows, cols, names = grid
            frames = split_grid(keyed, rows, cols)
            for name, frame in zip(names, frames):
                save(frame, f"{folder}/{name}.png")
    print("done")


if __name__ == "__main__":
    run()
