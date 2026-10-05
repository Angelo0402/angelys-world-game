"""Export separated player animation PNGs from an 8-pose transparent strip.

The source is divided into eight equal cells. Each source pose is emitted five
times (40 numbered files total) so Phaser can consume individual files without
spritesheet frame-index glitches while keeping a stable canvas and anchor.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def export(source: Path, destination: Path, stem: str) -> None:
    image = Image.open(source).convert("RGBA")
    frame_w = image.width // 8
    if frame_w * 8 != image.width:
        raise ValueError(f"{source} is not divisible into eight equal frames")
    destination.mkdir(parents=True, exist_ok=True)
    for old in destination.glob(f"{stem}_*.png"):
        old.unlink()
    alpha = np.asarray(image)[..., 3] > 8
    ys, _ = np.where(alpha)
    if len(ys) == 0:
        raise ValueError(f"{source} has no visible pixels")
    top = max(0, int(ys.min()) - 8)
    bottom = min(image.height, int(ys.max()) + 9)
    frames = [image.crop((i * frame_w, top, (i + 1) * frame_w, bottom)) for i in range(8)]
    # Match the existing Angely runtime cell so the app can swap these textures
    # without changing the physics anchor or visual scale.
    normalized: list[Image.Image] = []
    for frame in frames:
        scale = min(255 / frame.height, 1.0)
        resized = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", (313, 263), (0, 0, 0, 0))
        cell.alpha_composite(resized, ((313 - resized.width) // 2, 263 - resized.height - 4))
        normalized.append(cell)
    for index in range(40):
        normalized[index % 8].save(destination / f"{stem}_{index + 1:02d}.png", "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("stem")
    args = parser.parse_args()
    export(args.source, args.destination, args.stem)


if __name__ == "__main__":
    main()
