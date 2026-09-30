#!/usr/bin/env python3
"""Eat paper halo, kill low-alpha haze, isolate one figure, foot-lock."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CANON_W, CANON_H, CHAR_H, FEET_Y = 512, 1100, 960, 1048
RIG = Path("/workspace/public/puppet/rig")
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
        out[0], out[-1], out[:, 0], out[:, -1] = m[0], m[-1], m[:, 0], m[:, -1]
    return out


def erode(mask: np.ndarray, n: int) -> np.ndarray:
    return ~dilate(~mask, n)


def stats(a: np.ndarray):
    r, g, b = a[..., 0].astype(np.int16), a[..., 1].astype(np.int16), a[..., 2].astype(np.int16)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    return r, g, b, luma, sat


def key_bg(im: Image.Image, erode_px: int = 1) -> Image.Image:
    a = np.array(im.convert("RGBA"))
    r, g, b, luma, sat = stats(a)
    paper = ((luma > 198) & (sat < 36)) | ((r > 200) & (g > 200) & (b > 195) & (sat < 24))
    magenta = (r > 130) & (b > 130) & (g < 115) & ((r.astype(np.int16) + b - 2 * g) > 70)
    kill = dilate(paper | magenta, 2)
    keep = erode(~kill, erode_px)
    a[..., 3] = np.where(keep, 255, 0).astype(np.uint8)
    # leftover pale edge
    vis = a[..., 3] > 0
    edge = vis & dilate(~vis, 2)
    pale_edge = edge & (luma > 188) & (sat < 42)
    a[..., 3] = np.where(pale_edge, 0, a[..., 3])
    a[a[..., 3] == 0] = 0
    return Image.fromarray(a, "RGBA")


def tallest_blob(im: Image.Image) -> Image.Image:
    a = np.array(im)
    alpha = a[..., 3] > 20
    h, w = alpha.shape
    seen = np.zeros((h, w), dtype=np.uint8)
    dirs = ((-1, 0), (1, 0), (0, -1), (0, 1))
    blobs = []
    for y in range(h):
        for x in np.flatnonzero(alpha[y] & (seen[y] == 0)):
            if seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = 1
            cells = []
            miny = maxy = y
            minx = maxx = x
            while stack:
                cy, cx = stack.pop()
                cells.append((cy, cx))
                miny, maxy = min(miny, cy), max(maxy, cy)
                minx, maxx = min(minx, cx), max(maxx, cx)
                for dy, dx in dirs:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = 1
                        stack.append((ny, nx))
            if len(cells) > 500:
                blobs.append((maxy - miny, maxx - minx, cells))
    if not blobs:
        return im
    blobs.sort(key=lambda b: (b[0] / (b[1] + 1), b[0]), reverse=True)
    keep = np.zeros((h, w), dtype=bool)
    for cy, cx in blobs[0][2]:
        keep[cy, cx] = True
    a[..., 3] = np.where(keep, a[..., 3], 0)
    a[a[..., 3] == 0] = 0
    return Image.fromarray(a, "RGBA")


def isolate_column(im: Image.Image) -> Image.Image:
    a = np.array(im)
    occ = (a[..., 3] > 24).sum(axis=0)
    if occ.max() < 8:
        return im
    peak = int(np.argmax(occ))
    thresh = max(12, occ.max() * 0.12)
    left = peak
    right = peak
    while left > 0 and occ[left] >= thresh:
        left -= 1
    while right < len(occ) - 1 and occ[right] >= thresh:
        right += 1
    pad = 8
    left = max(0, left - pad)
    right = min(a.shape[1] - 1, right + pad)
    mask = np.zeros(a.shape[1], dtype=bool)
    mask[left : right + 1] = True
    a[..., 3] = np.where(mask[None, :], a[..., 3], 0)
    a[a[..., 3] == 0] = 0
    return Image.fromarray(a, "RGBA")


def place(im: Image.Image) -> Image.Image:
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 16)
    if len(xs) == 0:
        return Image.new("RGBA", (CANON_W, CANON_H), (0, 0, 0, 0))
    crop = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    scale = CHAR_H / crop.height
    nw = max(1, min(CANON_W - 8, int(round(crop.width * scale))))
    nh = CHAR_H
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    # hard matte after resize (LANCZOS brings back pale fringe)
    ra = np.array(resized)
    rr, gg, bb, luma, sat = stats(ra)
    vis = ra[..., 3] > 40
    vis = erode(vis, 1)
    edge = vis & dilate(~vis, 2)
    vis = vis & ~((edge & (luma > 185) & (sat < 40)))
    ra[..., 3] = np.where(vis, 255, 0).astype(np.uint8)
    ra[ra[..., 3] == 0] = 0
    resized = Image.fromarray(ra, "RGBA")
    canvas = Image.new("RGBA", (CANON_W, CANON_H), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((CANON_W - nw) // 2, FEET_Y - nh))
    return canvas


def pipeline(im: Image.Image, erode_px: int = 1) -> Image.Image:
    return place(isolate_column(tallest_blob(key_bg(im, erode_px))))


def stamp_face(front: Image.Image, src: Path, dest: Path, box=(210, 86, 306, 228)):
    raw = key_bg(Image.open(src), 0)
    a = np.array(raw)[..., 3]
    ys, xs = np.where(a > 20)
    if len(xs) == 0:
        front.save(dest)
        return
    crop = raw.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    if crop.height > crop.width * 1.5:
        crop = crop.crop((0, 0, crop.width, int(crop.height * 0.28)))
    tw, th = box[2] - box[0], box[3] - box[1]
    face = crop.resize((tw, th), Image.Resampling.LANCZOS)
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).ellipse((4, 4, tw - 5, int(th * 0.88)), fill=255)
    arr = np.array(mask)
    fade = int(th * 0.24)
    for i in range(fade):
        arr[th - fade + i] = (arr[th - fade + i] * (1 - i / fade)).astype(np.uint8)
    mask = Image.fromarray(arr, "L").filter(ImageFilter.GaussianBlur(2))
    out = front.copy()
    out.paste(face, (box[0], box[1]), mask)
    out.save(dest)


if __name__ == "__main__":
    print("helpers only — run a job script to recut")
