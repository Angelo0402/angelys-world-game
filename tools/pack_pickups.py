"""Build the animated Star Gem and Star Shield sheets from the painted icons.

Eight frames each: the gem twinkles and rocks, the shield pulses through
gold, pink, cyan, white and green so it reads as switching on and off.
"""
from __future__ import annotations

import json
import re

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage as ndi

OUT = "public/assets/runtime"
GEN = "src/assets/sprites.gen.ts"
SRC = {
    "stargem": "art/source/gen/stargem.png",
    "starshield": "art/source/gen/starshield.png",
}
SHIELD_COLORS = [
    (255, 214, 70),
    (255, 90, 190),
    (90, 235, 255),
    (255, 255, 255),
    (150, 255, 90),
    (255, 150, 50),
    (190, 120, 255),
    (255, 230, 120),
]


def cut(path: str) -> Image.Image:
    a = np.array(Image.open(path).convert("RGB")).astype(np.float32)
    mx = a.max(axis=2)
    dark = mx < 18
    labels, _n = ndi.label(dark)
    border = np.zeros(dark.shape, bool)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    ids = np.unique(labels[border & dark])
    ids = ids[ids > 0]
    bg = np.isin(labels, ids) if len(ids) else np.zeros(dark.shape, bool)
    alpha = np.clip((mx - 14) * 4.2, 0, 255)
    alpha[bg] = 0
    rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
    color = np.clip(a * (255.0 / np.maximum(alpha[..., None], 1.0)), 0, 255)
    rgba[..., :3] = np.where(alpha[..., None] > 0, color, 0).astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    ys, xs = np.nonzero(alpha > 24)
    pad = 8
    y0, y1 = max(0, int(ys.min()) - pad), min(rgba.shape[0], int(ys.max()) + pad)
    x0, x1 = max(0, int(xs.min()) - pad), min(rgba.shape[1], int(xs.max()) + pad)
    return Image.fromarray(rgba[y0:y1, x0:x1])


def tint(im: Image.Image, rgb: tuple[int, int, int], amount: float) -> Image.Image:
    arr = np.array(im).astype(np.float32)
    target = np.array(rgb, np.float32)
    arr[..., :3] = arr[..., :3] * (1 - amount) + (arr[..., :3] * target / 255.0) * amount
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def frame(base: Image.Image, angle: float, scale: float, color: tuple[int, int, int] | None, glow: float) -> Image.Image:
    im = base
    if color:
        im = tint(im, color, 0.72)
    im = ImageEnhance.Brightness(im).enhance(glow)
    canvas = Image.new("RGBA", (base.width + 48, base.height + 48), (0, 0, 0, 0))
    sprite = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    sprite = sprite.rotate(angle, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(sprite, ((canvas.width - sprite.width) // 2, (canvas.height - sprite.height) // 2))
    soft = canvas.filter(ImageFilter.GaussianBlur(1.2))
    return Image.alpha_composite(soft, canvas)


def pack(name: str, frames: list[Image.Image]) -> dict:
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * w + (w - f.width) // 2, (h - f.height) // 2))
    # Trim empty rows so the on-screen gem stays chunky.
    arr = np.array(sheet)
    cols = arr[..., 3].any(axis=0)
    rows = arr[..., 3].any(axis=1)
    # Keep each frame's cell width stable: don't trim x, only shared y padding.
    y0, y1 = int(np.argmax(rows)), int(len(rows) - np.argmax(rows[::-1]))
    sheet = sheet.crop((0, max(0, y0 - 4), sheet.width, min(sheet.height, y1 + 4)))
    path = f"{OUT}/{name}.webp"
    sheet.save(path, quality=92, alpha_quality=100, method=6)
    fw, fh = sheet.width // len(frames), sheet.height
    return {
        "file": f"assets/runtime/{name}.webp",
        "frameWidth": fw,
        "frameHeight": fh,
        "originX": 0.5,
        "originY": 0.5,
        "bodyHeight": fh,
        "anims": {"glow": {"start": 0, "end": len(frames) - 1, "fps": 12, "repeat": -1, "h": fh}},
    }


def build() -> dict:
    gem = cut(SRC["stargem"]).resize((220, 220), Image.LANCZOS)
    shield = cut(SRC["starshield"]).resize((220, 220), Image.LANCZOS)
    gem_frames = [
        frame(gem, angle, scale, None, glow)
        for angle, scale, glow in (
            (-8, 0.96, 0.92), (-4, 1.0, 1.0), (0, 1.06, 1.18), (4, 1.02, 1.05),
            (8, 0.98, 0.9), (4, 1.04, 1.12), (0, 1.08, 1.22), (-4, 1.0, 1.0),
        )
    ]
    shield_frames = [
        frame(shield, 0, 0.94 + (i % 2) * 0.1, SHIELD_COLORS[i], 0.85 + (i % 2) * 0.4)
        for i in range(8)
    ]
    return {"stargem": pack("stargem", gem_frames), "starshield": pack("starshield", shield_frames)}


def splice(meta: dict) -> None:
    text = open(GEN).read()
    m = re.search(r"export const SPRITES = (\{.*?\n\}) as const;", text, re.S)
    if not m:
        raise SystemExit("sprites.gen.ts has no SPRITES object")
    data = json.loads(m.group(1))
    data.update(meta)
    text = text[: m.start(1)] + json.dumps(data, indent=2) + text[m.end(1) :]
    open(GEN, "w").write(text)


if __name__ == "__main__":
    splice(build())
    print("packed stargem + starshield")
