"""Validate the shipped images against Phaser's metadata, without regenerating art.

Run before packaging: python tools/check_runtime_sprites.py
Requires Pillow (also used by the existing asset tools).
"""
import json
from pathlib import Path
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "src/assets/sprites.gen.ts").read_text(encoding="utf-8")


def metadata(name):
    value = source.split(f"export const {name} = ", 1)[1].split(" as const;", 1)[0]
    return json.loads(re.sub(r",\s*([}\]])", r"\1", value))


sprites = metadata("SPRITES")
errors = []
frames = 0
animations = 0
for key, meta in sprites.items():
    path = ROOT / "public" / meta["file"]
    if not path.is_file():
        errors.append(f"{key}: missing {path}")
        continue
    with Image.open(path) as image:
        width, height = image.size
        fw, fh = meta["frameWidth"], meta["frameHeight"]
        if max(width, height) > 4096:
            errors.append(f"{key}: {width}x{height} exceeds Android's 4096px budget")
        if width % fw or height % fh:
            errors.append(f"{key}: image {width}x{height} is not an exact {fw}x{fh} grid")
        cols, rows = width // fw, height // fh
        alpha = image.convert("RGBA").getchannel("A")
        for name, anim in meta["anims"].items():
            animations += 1
            if not 0 <= anim["start"] <= anim["end"] < cols * rows:
                errors.append(f"{key}:{name}: frames {anim['start']}..{anim['end']} exceed {cols * rows} cells")
                continue
            for i in range(anim["start"], anim["end"] + 1):
                x, y = i % cols * fw, i // cols * fh
                if alpha.crop((x, y, x + fw, y + fh)).getbbox() is None:
                    errors.append(f"{key}:{name}: empty frame {i}")
                frames += 1

for group in ("PROPS", "BACKDROPS"):
    for key, meta in metadata(group).items():
        path = ROOT / "public" / (meta if isinstance(meta, str) else meta["file"])
        if not path.is_file():
            errors.append(f"{group}/{key}: missing {path}")

if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(sprites)} sheets, {animations} animations, {frames} referenced frames; all props/backdrops exist")
