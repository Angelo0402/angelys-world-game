"""Build the Chapter 5 character upgrades from reviewed, alpha-native sources.

Umbra is packed into the fixed 10x2 / 298x320 layout required by Phaser.
Angelo's eight existing finale walk poses are appended after his original 36
frames, preserving every old frame index and animation.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from build_chapter10 import read_const, replace_const
from build_finale import frames as finale_frames


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art/source/upgrades"
OUT = ROOT / "public/assets/runtime"
GEN = ROOT / "src/assets/sprites.gen.ts"
UMBRA_CELL = (298, 320)
UMBRA_COLS = 10
UMBRA_SPECS = {
    "idle": (6, 6, -1, 309),
    "cast": (5, 10, 0, 288),
    "hurt": (2, 8, 0, 250),
    "dead": (4, 8, 0, 250),
    "taunt": (3, 6, -1, 309),
}


def alpha_bbox(im: Image.Image, threshold: int = 8) -> tuple[int, int, int, int]:
    bbox = im.getchannel("A").point(lambda a: 255 if a > threshold else 0).getbbox()
    if bbox is None:
        raise ValueError("empty generated frame")
    return bbox


def premul_resize(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    return im.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")


def split_strip(path: Path, count: int) -> list[Image.Image]:
    """Cut the generated strip at its authored equal-cell boundaries."""
    im = Image.open(path).convert("RGBA")
    frames: list[Image.Image] = []
    for i in range(count):
        x0 = round(i * im.width / count)
        x1 = round((i + 1) * im.width / count)
        tile = im.crop((x0, 0, x1, im.height))
        rgba = np.array(tile)
        labels, components = ndi.label(rgba[..., 3] > 8)
        if components > 1:
            sizes = ndi.sum(labels > 0, labels, index=np.arange(1, components + 1))
            main = int(np.argmax(sizes)) + 1
            drop = np.zeros(labels.shape, dtype=bool)
            for component in range(1, components + 1):
                if component == main:
                    continue
                ys, xs = np.nonzero(labels == component)
                if len(xs) and (xs.min() <= 1 or xs.max() >= tile.width - 2):
                    drop |= labels == component
            rgba[ndi.binary_dilation(drop, iterations=2), :] = 0
            tile = Image.fromarray(rgba, "RGBA")
        x0b, y0b, x1b, y1b = alpha_bbox(tile)
        frames.append(tile.crop((max(0, x0b - 2), max(0, y0b - 2), min(tile.width, x1b + 2), min(tile.height, y1b + 2))))
    return frames


def build_umbra() -> dict:
    cw, ch = UMBRA_CELL
    packed: list[Image.Image] = []
    anims: dict[str, dict] = {}
    start = 0
    for name, (count, fps, repeat, authored_h) in UMBRA_SPECS.items():
        frames = split_strip(SRC / f"umbra_{name}.png", count)
        heights = [alpha_bbox(frame)[3] - alpha_bbox(frame)[1] for frame in frames]
        scale = authored_h / float(np.median(heights))
        scale = min(scale, min((cw - 10) / frame.width for frame in frames), min((ch - 10) / frame.height for frame in frames))
        for frame in frames:
            size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
            packed.append(premul_resize(frame, size))
        anims[name] = {"start": start, "end": start + count - 1, "fps": fps, "repeat": repeat, "h": authored_h}
        start += count

    if len(packed) != 20:
        raise ValueError(f"Umbra requires 20 frames, got {len(packed)}")
    sheet = Image.new("RGBA", (cw * UMBRA_COLS, ch * 2), (0, 0, 0, 0))
    for i, frame in enumerate(packed):
        x = (i % UMBRA_COLS) * cw + (cw - frame.width) // 2
        y = (i // UMBRA_COLS) * ch + (ch - frame.height) // 2
        sheet.alpha_composite(frame, (x, y))
    sheet.save(OUT / "umbra.webp", format="WEBP", quality=90, alpha_quality=100, method=6)
    return {
        "file": "assets/runtime/umbra.webp",
        "frameWidth": cw,
        "frameHeight": ch,
        "originX": 0.5,
        "originY": 0.5,
        "bodyHeight": 312,
        "anims": anims,
    }


def build_angelo(current: dict) -> dict:
    meta = json.loads(json.dumps(current))
    cw, ch = meta["frameWidth"], meta["frameHeight"]
    old_count = max(anim["end"] for key, anim in meta["anims"].items() if key != "walk") + 1
    if old_count != 36:
        raise ValueError(f"expected 36 original Angelo frames, got {old_count}")

    base_path = SRC / "angelo_base_36.webp"
    base = Image.open(base_path).convert("RGBA")
    source_cols = base.width // cw
    if base.height // ch * source_cols != old_count:
        raise ValueError(f"Angelo base sheet must contain exactly {old_count} frames")
    walk = []
    for source in finale_frames("angelo_motion")[4:12]:
        image = source["im"]
        bbox = alpha_bbox(image, 64)
        image = image.crop(bbox)
        mask = np.array(image.getchannel("A")) > 64
        h, w = mask.shape
        hips = np.nonzero(mask[int(h * 0.5):int(h * 0.65)])[1]
        ax = float((hips.min() + hips.max()) / 2) if len(hips) else w / 2
        walk.append({"im": image, "ax": ax, "ay": float(h)})
    heights = [alpha_bbox(f["im"])[3] - alpha_bbox(f["im"])[1] for f in walk]
    scale = 220 / float(np.median(heights))
    ox, oy = meta["originX"] * cw, meta["originY"] * ch
    for frame in walk:
        w, h = frame["im"].size
        extents = ((ox - 4, frame["ax"]), (cw - ox - 4, w - frame["ax"]), (oy - 4, frame["ay"]), (ch - oy, h - frame["ay"]))
        scale = min(scale, *(available / extent for available, extent in extents if available > 0 and extent > 0))

    total = old_count + len(walk)
    cols = source_cols
    sheet = Image.new("RGBA", (cols * cw, math.ceil(total / cols) * ch), (0, 0, 0, 0))
    for i in range(old_count):
        sx, sy = (i % source_cols) * cw, (i // source_cols) * ch
        sheet.alpha_composite(base.crop((sx, sy, sx + cw, sy + ch)), ((i % cols) * cw, (i // cols) * ch))
    rendered_heights = []
    for j, frame in enumerate(walk):
        im = frame["im"]
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        im = premul_resize(im, size)
        px = round(ox - frame["ax"] * scale)
        py = round(oy - frame["ay"] * scale)
        i = old_count + j
        sheet.alpha_composite(im, ((i % cols) * cw + px, (i // cols) * ch + py))
        bbox = alpha_bbox(im)
        rendered_heights.append(bbox[3] - bbox[1])
    sheet.save(OUT / "angelo.webp", format="WEBP", quality=92, alpha_quality=100, method=6)
    meta["anims"]["walk"] = {"start": 36, "end": 43, "fps": 8, "repeat": -1, "h": round(float(np.median(rendered_heights)))}
    return meta


def build() -> None:
    text = GEN.read_text(encoding="utf-8")
    _, sprites = read_const(text, "SPRITES")
    updates = {"umbra": build_umbra(), "angelo": build_angelo(sprites["angelo"])}
    GEN.write_text(replace_const(text, "SPRITES", updates), encoding="utf-8")
    manifest = {
        "sprites": updates,
        "umbraSourceFrames": 20,
        "umbraLayout": "10x2; 298x320; native alpha; WebP quality 90",
        "angeloBaseHash": hashlib.sha256((SRC / "angelo_base_36.webp").read_bytes()).hexdigest(),
        "sourceHashes": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SRC.glob("*.png"))},
    }
    (SRC / "runtime.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({key: [value["frameWidth"], value["frameHeight"], sum(a["end"] - a["start"] + 1 for a in value["anims"].values())] for key, value in updates.items()}, indent=2))


if __name__ == "__main__":
    build()
