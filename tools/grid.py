"""Render an atlas crop with a labeled 50px grid for authoring regions.

Usage: python3 tools/grid.py <atlas-key> x0 y0 x1 y1 [out.png]
"""
import sys

from PIL import Image, ImageDraw

from atlas_config import ATLASES, ROOT


def main():
    key = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    out = sys.argv[6] if len(sys.argv) > 6 else f"/tmp/aw/grid_{key}_{x0}_{y0}.png"
    im = Image.open(f"{ROOT}/{ATLASES[key]['src']}").convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 0, 255, 255))
    bg.alpha_composite(im)
    crop = bg.crop((x0, y0, x1, y1))
    d = ImageDraw.Draw(crop)
    for x in range((x0 // 50 + 1) * 50, x1, 50):
        major = x % 100 == 0
        d.line([(x - x0, 0), (x - x0, y1 - y0)], fill=(0, 255, 255) if major else (0, 140, 140), width=1)
        if major:
            d.text((x - x0 + 2, 2), str(x), fill=(255, 255, 0))
    for y in range((y0 // 50 + 1) * 50, y1, 50):
        major = y % 100 == 0
        d.line([(0, y - y0), (x1 - x0, y - y0)], fill=(0, 255, 255) if major else (0, 140, 140), width=1)
        if major:
            d.text((2, y - y0 + 2), str(y), fill=(255, 255, 0))
    crop.save(out)
    print(out)


if __name__ == "__main__":
    main()
