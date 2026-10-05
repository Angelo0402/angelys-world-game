"""Export equal-cell animation grids as stable, individual PNG frames."""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def export(source: Path, destination: Path, stem: str, cols: int, rows: int, transparent: bool = False) -> None:
    image = Image.open(source).convert("RGB")
    # Generated sheets can have a few remainder pixels; distribute them by
    # using rounded cell boundaries instead of forcing exact divisibility.
    destination.mkdir(parents=True, exist_ok=True)
    for old in destination.glob(f"{stem}_*.png"):
        old.unlink()
    index = 0
    for row in range(rows):
        for col in range(cols):
            x0_cell, x1_cell = round(col * image.width / cols), round((col + 1) * image.width / cols)
            y0_cell, y1_cell = round(row * image.height / rows), round((row + 1) * image.height / rows)
            cell = np.array(image.crop((x0_cell, y0_cell, x1_cell, y1_cell)))
            cell_h, cell_w = cell.shape[0], cell.shape[1]
            visible = np.any(cell < 245, axis=2)
            ys, xs = np.where(visible)
            if len(xs) == 0:
                continue
            x0, x1 = max(0, int(xs.min()) - 8), min(cell_w, int(xs.max()) + 9)
            y0, y1 = max(0, int(ys.min()) - 8), min(cell_h, int(ys.max()) + 9)
            crop = Image.fromarray(cell[y0:y1, x0:x1]).convert("RGBA")
            scale = min(255 / crop.height, 1.0)
            resized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
            out = Image.new("RGBA", (313, 263), (255, 255, 255, 0 if transparent else 255))
            if transparent:
                rgba = resized.convert("RGBA")
                pixels = np.array(rgba)
                near_white = np.all(pixels[:, :, :3] >= 242, axis=2)
                pixels[near_white, 3] = 0
                rgba = Image.fromarray(pixels, "RGBA")
                out.alpha_composite(rgba, ((313 - rgba.width) // 2, 263 - rgba.height - 4))
            else:
                out.alpha_composite(resized, ((313 - resized.width) // 2, 263 - resized.height - 4))
            index += 1
            out.save(destination / f"{stem}_{index:02d}.png", "PNG", optimize=True)
    expected = cols * rows
    if index != expected:
        raise ValueError(f"{source} produced {index} frames; expected {expected}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("stem")
    parser.add_argument("cols", type=int)
    parser.add_argument("rows", type=int)
    parser.add_argument("--transparent", action="store_true")
    args = parser.parse_args()
    export(args.source, args.destination, args.stem, args.cols, args.rows, args.transparent)


if __name__ == "__main__":
    main()
