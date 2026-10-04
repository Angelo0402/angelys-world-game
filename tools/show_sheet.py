"""Render a runtime sheet with cell borders, anim labels and the anchor point.

Usage: python3 tools/show_sheet.py <sheet> [out.png]
"""
import json
import re
import sys

from PIL import Image, ImageDraw

from atlas_config import GEN_TS


def main():
    name = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else f"/tmp/aw/sheet_{name}.png"
    src = open(GEN_TS).read()
    body = re.search(r"export const SPRITES = (\{.*?\n\}) as const", src, re.S).group(1)
    meta = json.loads(body)[name]
    im = Image.open("public/" + meta["file"]).convert("RGBA")
    cw, ch = meta["frameWidth"], meta["frameHeight"]
    src_cols = im.width // cw
    labels = {}
    for anim, r in meta["anims"].items():
        for i in range(r["start"], r["end"] + 1):
            labels[i] = f"{anim}{i - r['start']}"
    cols = max(1, min(len(labels), 1800 // cw))
    rows = (len(labels) + cols - 1) // cols
    bg = Image.new("RGBA", (cols * cw, rows * ch), (40, 46, 60, 255))
    for i in labels:
        sx, sy = (i % src_cols) * cw, (i // src_cols) * ch
        bg.alpha_composite(im.crop((sx, sy, sx + cw, sy + ch)), ((i % cols) * cw, (i // cols) * ch))
    d = ImageDraw.Draw(bg)
    for i, lab in labels.items():
        x, y = (i % cols) * cw, (i // cols) * ch
        d.rectangle([x, y, x + cw - 1, y + ch - 1], outline=(90, 200, 255))
        d.text((x + 3, y + 2), lab, fill=(255, 255, 0))
        ax, ay = x + meta["originX"] * cw, y + meta["originY"] * ch
        d.ellipse([ax - 3, ay - 3, ax + 3, ay + 3], fill=(255, 0, 0))
    bg.save(out)
    print(out, im.size)


if __name__ == "__main__":
    main()
