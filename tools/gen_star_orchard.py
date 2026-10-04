"""Draw Chapter 10 (The Star Orchard) source sheets in the flat gen style.

White-background enemy and prop atlases are cut by tools/build_sprites.py.
Backdrops are full scenes. Run: python3 tools/gen_star_orchard.py
"""
from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "art", "source", "gen")
W, H = 1280, 720

INK = (32, 20, 62, 255)
WHITE = (255, 255, 255, 255)
SILVER = (206, 214, 238, 255)
SILVER_HI = (238, 242, 255, 255)
SILVER_DK = (132, 142, 184, 255)
GOLD = (255, 196, 74, 255)
GOLD_DK = (214, 132, 36, 255)
GOLD_HI = (255, 232, 160, 255)
VIOLET = (132, 96, 204, 255)
VIOLET_DK = (78, 52, 140, 255)
TEAL = (86, 196, 186, 255)
CREAM = (255, 236, 198, 255)
LEAF = (118, 168, 132, 255)
LEAF_DK = (58, 104, 86, 255)
ROCK = (96, 78, 122, 255)
ROCK_DK = (58, 44, 82, 255)
ROCK_HI = (156, 140, 188, 255)
FIRE = (255, 122, 62, 255)
FIRE_Y = (255, 214, 96, 255)
NIGHT = (36, 26, 72, 255)
BLUSH = (232, 140, 168, 255)


def blank() -> Image.Image:
    return Image.new("RGBA", (W, H), (255, 255, 255, 255))


def stamp(sheet: Image.Image, painter, cx: float, cy: float, angle: float = 0) -> None:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    painter(ImageDraw.Draw(layer), cx, cy)
    if angle:
        layer = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=(cx, cy))
    sheet.alpha_composite(layer)


def save_rgb(sheet: Image.Image, name: str) -> None:
    rgb = Image.new("RGB", sheet.size, (255, 255, 255))
    rgb.paste(sheet, mask=sheet.getchannel("A"))
    path = os.path.join(ROOT, name)
    rgb.save(path, optimize=True)
    print("wrote", path, rgb.size)


def oval(d: ImageDraw.ImageDraw, box, fill, outline=INK, w=7) -> None:
    x0, y0, x1, y1 = box
    d.ellipse([x0 - w, y0 - w, x1 + w, y1 + w], fill=outline)
    d.ellipse(box, fill=fill)


def poly(d: ImageDraw.ImageDraw, pts, fill, outline=INK, w=7) -> None:
    d.line(pts + [pts[0]], fill=outline, width=w * 2 + 2, joint="curve")
    d.polygon(pts, fill=fill)
    d.line(pts + [pts[0]], fill=outline, width=max(3, w - 1), joint="curve")


def star_pts(cx, cy, r_out, r_in, rot=-90, n=5):
    pts = []
    for i in range(n * 2):
        ang = math.radians(rot + i * (180 / n))
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def eye(d, x, y, r=8, pupil=INK, wink=False):
    if wink:
        d.arc([x - r, y - r, x + r, y + r], 20, 160, fill=INK, width=4)
        return
    oval(d, [x - r, y - r, x + r, y + r], WHITE, INK, 3)
    d.ellipse([x - r * 0.28, y - r * 0.15, x + r * 0.42, y + r * 0.55], fill=pupil)
    d.ellipse([x - r * 0.45, y - r * 0.55, x - r * 0.05, y - r * 0.15], fill=WHITE)


def cheek(d, x, y):
    d.ellipse([x - 7, y - 4, x + 7, y + 4], fill=BLUSH)


# ---------------- Starling: a comet-tailed star bird ----------------

def starling(d, cx, cy, wing=0, dive=False, hurt=False, dead=0):
    """wing 0 up, 1 mid, 2 down. dead 1 tumbling, 2 spent."""
    if dead == 2:
        poly(d, star_pts(cx, cy + 18, 46, 20, rot=18), GOLD_DK, w=6)
        oval(d, [cx - 18, cy + 8, cx + 6, cy + 28], GOLD, w=4)
        eye(d, cx + 8, cy + 14, 5, wink=True)
        return
    flap = [ -28, -4, 22, -4 ][wing % 4]
    if dive:
        flap = 36
    if hurt:
        flap = 8
    # comet tail, behind the body
    for i, (sc, col) in enumerate(((1.0, FIRE), (0.72, FIRE_Y), (0.46, GOLD_HI))):
        tx = cx - 58 - i * 26
        ty = cy + 10 + i * 10 + (8 if dive else 0)
        poly(d, star_pts(tx, ty, 22 * sc, 9 * sc, rot=20 + i * 15), col, w=4)
    # wings
    for sign in (-1, 1):
        wy = cy - 10 + flap * (0.35 if sign < 0 else 1)
        wing_pts = [
            (cx - 8, cy - 4),
            (cx - 70, wy - 18 * sign),
            (cx - 108, wy + 6),
            (cx - 62, wy + 28),
            (cx - 6, cy + 16),
        ]
        if sign > 0:
            wing_pts = [(x, cy - (y - cy)) for x, y in wing_pts]
            wing_pts = [(cx + (cx - x) * 0.15 + (x - cx), y) for x, y in wing_pts]
            # right wing reaches forward a little less than the left trails
            wing_pts = [
                (cx + 10, cy - 6),
                (cx + 78, cy - 36 - flap),
                (cx + 104, cy - 8 - flap * 0.3),
                (cx + 70, cy + 18),
                (cx + 8, cy + 12),
            ]
        poly(d, wing_pts, SILVER if sign < 0 else SILVER_HI, w=6)
        # feather slit
        d.line([wing_pts[1], wing_pts[3]], fill=SILVER_DK, width=3)
    body = star_pts(cx, cy, 58 if not dive else 64, 26, rot=-18 if dive else -8)
    poly(d, body, GOLD, w=7)
    poly(d, star_pts(cx - 6, cy - 10, 22, 10, rot=-30), GOLD_HI, w=3)
    # head on the right point
    hx, hy = cx + 46, cy - 6
    oval(d, [hx - 18, hy - 16, hx + 20, hy + 16], GOLD_HI, w=5)
    poly(d, [(hx + 16, hy - 4), (hx + 40, hy + 2), (hx + 14, hy + 8)], GOLD_DK, w=4)
    eye(d, hx + 2, hy - 1, 6, wink=hurt or dead == 1)
    if not hurt and dead == 0:
        cheek(d, hx - 8, hy + 8)


def draw_starling() -> None:
    sheet = blank()
    # row 0: flap cycle
    for i, wing in enumerate((0, 1, 2, 1)):
        cx, cy = 160 + i * 312, 168 + (6 if wing == 2 else 0)
        stamp(sheet, lambda d, x, y, wing=wing: starling(d, x, y, wing), cx, cy)
    # row 1: dive, flare, hurt, tumble, spent
    specs = [
        (150, 530, -22, dict(wing=2, dive=True)),
        (400, 520, 0, dict(wing=0, dive=True)),
        (640, 530, 24, dict(wing=1, hurt=True)),
        (890, 540, 78, dict(wing=2, dead=1)),
        (1130, 560, 0, dict(dead=2)),
    ]
    for cx, cy, ang, kw in specs:
        stamp(sheet, lambda d, x, y, kw=kw: starling(d, x, y, **kw), cx, cy, ang)
    save_rgb(sheet, "e_starling.png")


# ---------------- Moonhare ----------------

def moonhare(d, cx, cy, step=0, lunge=False, hurt=False, dead=0):
    if dead == 2:
        oval(d, [cx - 46, cy + 10, cx + 50, cy + 42], SILVER, w=6)
        oval(d, [cx - 10, cy - 8, cx + 36, cy + 28], SILVER_HI, w=5)
        # flopped crescent ear still attached
        poly(d, [(cx + 20, cy + 4), (cx + 62, cy + 18), (cx + 48, cy + 36), (cx + 16, cy + 22)], GOLD, w=5)
        eye(d, cx + 16, cy + 10, 6, wink=True)
        return
    # feet first so the body covers the tops
    spread = 18 + (10 if step % 2 == 0 else -4)
    lift = 0 if step % 2 == 0 else 16
    if lunge:
        spread, lift = 34, 6
    if hurt:
        spread, lift = 8, 0
    oval(d, [cx - 34 - spread, cy + 28 - lift, cx - 8 - spread, cy + 58], SILVER_DK, w=5)
    oval(d, [cx + 6 + spread * 0.3, cy + 30, cx + 34 + spread * 0.3, cy + 58], SILVER_DK, w=5)
    # haunch
    oval(d, [cx - 52, cy - 8, cx + 28, cy + 48], SILVER, w=7)
    oval(d, [cx - 34, cy + 6, cx + 16, cy + 40], CREAM, w=4)
    # head
    hx = cx + (36 if not lunge else 58)
    hy = cy - (18 if not lunge else 8)
    oval(d, [hx - 28, hy - 24, hx + 30, hy + 26], SILVER_HI, w=6)
    # ears: one tall oval, one crescent
    if not hurt and dead == 0:
        oval(d, [hx - 22, hy - 78, hx - 4, hy - 8], SILVER, w=5)
        oval(d, [hx - 18, hy - 70, hx - 8, hy - 16], GOLD, w=3)
        crescent = [
            (hx + 6, hy - 10),
            (hx + 18, hy - 86),
            (hx + 34, hy - 78),
            (hx + 28, hy - 18),
            (hx + 14, hy - 6),
        ]
        poly(d, crescent, GOLD, w=5)
    else:
        # flopped ears
        poly(d, [(hx - 10, hy - 6), (hx - 48, hy - 28), (hx - 36, hy - 8), (hx - 8, hy + 4)], SILVER, w=5)
        poly(d, [(hx + 8, hy), (hx + 52, hy + 16), (hx + 40, hy + 30), (hx + 6, hy + 12)], GOLD, w=5)
    # star tail
    poly(d, star_pts(cx - 48, cy + 4, 16, 7), GOLD, w=4)
    # forehead crescent
    d.arc([hx - 6, hy - 16, hx + 14, hy + 2], 200, 340, fill=GOLD_DK, width=4)
    eye(d, hx + 8, hy - 2, 7, pupil=VIOLET_DK, wink=hurt or dead == 1)
    if not hurt and dead == 0:
        eye(d, hx - 10, hy - 2, 6, pupil=VIOLET_DK)
        cheek(d, hx - 2, hy + 12)
    # little nose
    d.ellipse([hx + 20, hy + 4, hx + 28, hy + 12], fill=BLUSH)


def draw_moonhare() -> None:
    sheet = blank()
    for i, step in enumerate((0, 1, 2, 1)):
        bob = [0, 10, -16, 4][i]
        stamp(sheet, lambda d, x, y, step=step: moonhare(d, x, y, step), 170 + i * 312, 188 + bob)
    specs = [
        (160, 540, 0, dict(step=1)),
        (410, 520, -12, dict(step=2, lunge=True)),
        (650, 545, 18, dict(step=0, hurt=True)),
        (900, 545, 70, dict(step=0, dead=1)),
        (1140, 575, 0, dict(dead=2)),
    ]
    for cx, cy, ang, kw in specs:
        stamp(sheet, lambda d, x, y, kw=kw: moonhare(d, x, y, **kw), cx, cy, ang)
    save_rgb(sheet, "e_moonhare.png")


# ---------------- Seedlamp: walking lantern flower ----------------

def seedlamp(d, cx, cy, sway=0, open_petals=False, hurt=False, dead=0):
    if dead == 2:
        oval(d, [cx - 36, cy + 8, cx + 36, cy + 48], VIOLET_DK, w=6)
        oval(d, [cx - 22, cy + 16, cx + 22, cy + 40], NIGHT, w=4)
        poly(d, star_pts(cx, cy - 6, 18, 8), GOLD, w=4)
        oval(d, [cx - 4, cy - 28, cx + 8, cy - 4], LEAF, w=4)
        return
    sway_x = sway * 10
    # leafy feet
    oval(d, [cx - 48, cy + 28, cx - 8, cy + 58], LEAF_DK, w=5)
    oval(d, [cx + 6, cy + 30, cx + 50, cy + 58], LEAF, w=5)
    # pot
    poly(d, [
        (cx - 32, cy + 6), (cx + 32, cy + 6), (cx + 26, cy + 46), (cx - 26, cy + 46),
    ], VIOLET_DK, w=6)
    oval(d, [cx - 36, cy - 2, cx + 36, cy + 18], VIOLET, w=5)
    # gold band
    d.rectangle([cx - 24, cy + 16, cx + 24, cy + 24], fill=GOLD_DK)
    # stem
    stem_top = cy - 78 + (12 if hurt else 0)
    poly(d, [
        (cx - 8 + sway_x * 0.2, cy + 4),
        (cx + 8 + sway_x * 0.2, cy + 4),
        (cx + 6 + sway_x, stem_top + 20),
        (cx - 6 + sway_x, stem_top + 20),
    ], LEAF_DK, w=5)
    # leaves as arms
    arm = -20 if hurt else (-36 if open_petals else -16)
    poly(d, [
        (cx - 4, cy - 20),
        (cx - 62, cy + arm),
        (cx - 48, cy + arm + 22),
        (cx - 2, cy - 4),
    ], LEAF, w=5)
    poly(d, [
        (cx + 4, cy - 24),
        (cx + 58, cy + arm * 0.4),
        (cx + 40, cy + arm * 0.4 + 24),
        (cx + 2, cy - 6),
    ], LEAF_DK, w=5)
    # blossom
    bx, by = cx + sway_x, stem_top
    petal_r = 34 if open_petals else 26
    cols = [VIOLET, VIOLET_DK, VIOLET, VIOLET_DK, VIOLET]
    for i in range(5):
        ang = math.radians(-90 + i * 72 + (12 if open_petals else 0))
        px = bx + math.cos(ang) * (28 if open_petals else 16)
        py = by + math.sin(ang) * (28 if open_petals else 16)
        oval(d, [px - petal_r * 0.55, py - petal_r * 0.42, px + petal_r * 0.55, py + petal_r * 0.42], cols[i], w=4)
    # lantern globe — drawn after petals so it sits in front, still overlapping
    oval(d, [bx - 22, by - 22, bx + 22, by + 22], GOLD_HI, w=5)
    poly(d, star_pts(bx, by, 14 if not open_petals else 18, 6), GOLD, w=3)
    if open_petals:
        # a star just leaving the globe, overlapping so it stays one blob
        poly(d, star_pts(bx + 40, by - 4, 16, 7, rot=12), GOLD_HI, w=4)
    if hurt or dead:
        eye(d, bx - 6, by - 2, 4, wink=True)
        eye(d, bx + 8, by - 2, 4, wink=True)
    else:
        eye(d, bx - 7, by - 2, 4, pupil=VIOLET_DK)
        eye(d, bx + 8, by - 2, 4, pupil=VIOLET_DK)


def draw_seedlamp() -> None:
    sheet = blank()
    for i, sway in enumerate((-1, 0, 1, 0)):
        stamp(sheet, lambda d, x, y, sway=sway: seedlamp(d, x, y, sway), 170 + i * 312, 200)
    specs = [
        (160, 530, 0, dict(sway=0)),
        (410, 520, 0, dict(sway=1, open_petals=True)),
        (660, 545, 16, dict(sway=-1, hurt=True)),
        (910, 540, 48, dict(sway=0, dead=1, hurt=True)),
        (1140, 575, 0, dict(dead=2)),
    ]
    for cx, cy, ang, kw in specs:
        stamp(sheet, lambda d, x, y, kw=kw: seedlamp(d, x, y, **kw), cx, cy, ang)
    save_rgb(sheet, "e_seedlamp.png")


# ---------------- Cometpup: a meteor with paws ----------------

def cometpup(d, cx, cy, step=0, roll=False, hurt=False, dead=0):
    if dead == 2:
        oval(d, [cx - 50, cy + 8, cx - 4, cy + 48], ROCK, w=6)
        oval(d, [cx - 8, cy + 16, cx + 36, cy + 52], ROCK_DK, w=6)
        oval(d, [cx + 24, cy + 4, cx + 62, cy + 36], ROCK_HI, w=5)
        poly(d, star_pts(cx + 8, cy - 2, 14, 6), FIRE_Y, w=4)
        return
    spin = step * 28
    body_w = 58 if not roll else 52
    body_h = 48 if not hurt else 36
    if roll:
        body_w, body_h = 54, 54
    oval(d, [cx - body_w, cy - body_h, cx + body_w, cy + body_h], ROCK, w=7)
    # craters rotate with the roll
    for ang0, rad, col in ((20, 14, ROCK_DK), (140, 10, ROCK_HI), (230, 12, ROCK_DK)):
        ang = math.radians(ang0 + spin)
        px = cx + math.cos(ang) * 26
        py = cy + math.sin(ang) * 20
        oval(d, [px - rad, py - rad * 0.8, px + rad, py + rad * 0.8], col, w=3)
    # flame tail
    tail = [
        (cx - body_w + 8, cy - 10),
        (cx - body_w - 46, cy - 28),
        (cx - body_w - 70, cy + 4),
        (cx - body_w - 36, cy + 26),
        (cx - body_w + 6, cy + 16),
    ]
    if roll:
        tail = [(cx + (x - cx) * 0.3 - 10, cy + (y - cy) * 0.3) for x, y in [
            (cx - 20, cy - 50), (cx + 10, cy - 78), (cx + 28, cy - 40), (cx - 8, cy - 24),
        ]]
        # keep the flame touching the body
        tail = [
            (cx - 8, cy - body_h + 8),
            (cx + 16, cy - body_h - 36),
            (cx + 34, cy - body_h - 8),
            (cx + 6, cy - body_h + 10),
        ]
    poly(d, tail, FIRE if not roll else FIRE_Y, w=5)
    if not roll:
        poly(d, star_pts(cx - body_w - 24, cy - 4, 12, 5, rot=spin), FIRE_Y, w=3)
    # paws
    if not roll:
        lift = 14 if step % 2 else 0
        oval(d, [cx - 36, cy + body_h - 16 - lift, cx - 8, cy + body_h + 12], ROCK_DK, w=4)
        oval(d, [cx + 10, cy + body_h - 16 - (0 if lift else 14), cx + 40, cy + body_h + 12], ROCK_DK, w=4)
    # face
    eye(d, cx + 16, cy - 8, 7, wink=hurt or dead == 1)
    if not hurt and dead == 0:
        eye(d, cx - 8, cy - 8, 6)
        cheek(d, cx + 4, cy + 10)
    d.ellipse([cx + 28, cy + 2, cx + 40, cy + 12], fill=(255, 160, 140, 255))
    # gold crack like a smile of ore
    d.arc([cx - 4, cy + 2, cx + 28, cy + 24], 20, 150, fill=GOLD, width=3)


def draw_cometpup() -> None:
    sheet = blank()
    for i, step in enumerate((0, 1, 2, 3)):
        stamp(sheet, lambda d, x, y, step=step: cometpup(d, x, y, step), 176 + i * 312, 176)
    specs = [
        (160, 530, 0, dict(step=1)),
        (410, 520, 0, dict(step=2, roll=True)),
        (660, 540, 16, dict(step=0, hurt=True)),
        (910, 540, 80, dict(step=1, dead=1, hurt=True)),
        (1140, 520, 0, dict(dead=2)),
    ]
    for cx, cy, ang, kw in specs:
        stamp(sheet, lambda d, x, y, kw=kw: cometpup(d, x, y, **kw), cx, cy, ang)
    save_rgb(sheet, "e_cometpup.png")


# ---------------- Props ----------------

def draw_props() -> None:
    sheet = blank()
    d = ImageDraw.Draw(sheet)
    # ground: one long silver-stone shelf over night soil
    poly(d, [
        (70, 96), (1210, 96), (1230, 150), (1180, 186), (90, 186), (48, 146),
    ], (42, 32, 78, 255), w=8)
    d.rectangle([78, 96, 1204, 128], fill=(168, 176, 214, 255))
    d.rectangle([78, 108, 1204, 122], fill=SILVER_HI)
    for x in range(110, 1180, 78):
        poly(d, star_pts(x, 78, 14, 6), GOLD, w=3)
        oval(d, [x + 28, 86, x + 46, 108], LEAF, w=3)
    # three platforms, longest to shortest
    def platform(x, y, length, drop):
        poly(d, [
            (x, y), (x + length, y), (x + length - 16, y + 28), (x + 18, y + 28),
        ], SILVER, w=6)
        d.rectangle([x + 8, y + 6, x + length - 10, y + 16], fill=SILVER_HI)
        # hanging crescent
        oval(d, [x + length * 0.45 - 16, y + 24, x + length * 0.45 + 16, y + 24 + drop], GOLD, w=4)
        d.rectangle([x + 10, y + 18, x + length - 12, y + 28], fill=SILVER_DK)

    platform(60, 250, 430, 70)
    platform(560, 268, 320, 58)
    platform(960, 286, 230, 46)

    # crate: star chest
    oval(d, [100, 470, 300, 660], (92, 64, 120, 255), w=8)
    poly(d, [(120, 500), (280, 500), (268, 630), (132, 630)], VIOLET_DK, w=6)
    poly(d, star_pts(200, 560, 36, 16), GOLD, w=5)
    d.rectangle([188, 500, 214, 630], fill=GOLD_DK)

    # crystal spikes on a shared base
    base_y = 630
    poly(d, [(430, base_y), (860, base_y), (840, base_y - 28), (450, base_y - 28)], SILVER_DK, w=5)
    for i, h in enumerate((118, 150, 132, 146, 110)):
        x = 480 + i * 74
        poly(d, [(x - 22, base_y - 20), (x, base_y - 20 - h), (x + 22, base_y - 20)], (186, 168, 255, 255), w=5)
        poly(d, [(x - 6, base_y - 36), (x, base_y - 20 - h + 16), (x + 4, base_y - 40)], SILVER_HI, w=2)

    # masonry block
    poly(d, [(980, 470), (1200, 470), (1200, 660), (980, 660)], SILVER, w=8)
    d.line([(980, 545), (1200, 545)], fill=SILVER_DK, width=6)
    d.line([(1090, 470), (1090, 660)], fill=SILVER_DK, width=6)
    d.line([(1020, 500), (1160, 640)], fill=GOLD_DK, width=5)
    poly(d, star_pts(1090, 575, 22, 9), GOLD, w=4)
    save_rgb(sheet, "props2_ch10.png")


# ---------------- Backdrop and splash ----------------

def sky(w, h, horizon=0.72) -> Image.Image:
    top = (16, 10, 40)
    mid = (48, 28, 102)
    hor = (92, 70, 150)
    ground = (28, 32, 68)
    import numpy as np
    img = np.zeros((h, w, 3), np.uint8)
    for y in range(h):
        t = y / (h - 1)
        if t < horizon:
            u = t / horizon
            if u < 0.55:
                k = u / 0.55
                col = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
            else:
                k = (u - 0.55) / 0.45
                col = tuple(int(mid[i] + (hor[i] - mid[i]) * k) for i in range(3))
        else:
            k = (t - horizon) / (1 - horizon)
            col = tuple(int(hor[i] + (ground[i] - hor[i]) * k) for i in range(3))
        img[y, :] = col
    return Image.fromarray(img, "RGB").convert("RGBA")


def hill(d, pts, fill, outline=None):
    d.polygon(pts, fill=fill)
    if outline:
        d.line(pts, fill=outline, width=6)


def tree(d, x, ground_y, scale, far=False):
    trunk = (48, 36, 78, 255) if not far else (36, 28, 64, 255)
    leaf = (176, 184, 220, 255) if not far else (92, 86, 140, 255)
    leaf2 = (214, 206, 245, 255) if not far else (120, 110, 168, 255)
    th = 78 * scale
    tw = 16 * scale
    poly(d, [
        (x - tw, ground_y), (x + tw, ground_y),
        (x + tw * 0.7, ground_y - th), (x - tw * 0.7, ground_y - th),
    ], trunk, w=4 if not far else 3)
    cy = ground_y - th - 18 * scale
    for dx, dy, r, col in (
        (-22 * scale, 8 * scale, 38 * scale, leaf),
        (24 * scale, 6 * scale, 34 * scale, leaf),
        (0, -16 * scale, 42 * scale, leaf2),
        (-8 * scale, 16 * scale, 28 * scale, leaf),
    ):
        oval(d, [x + dx - r, cy + dy - r * 0.8, x + dx + r, cy + dy + r * 0.82], col, w=4 if not far else 3)
    if not far:
        for fx, fy in ((-12, -10), (16, 4), (0, 18)):
            poly(d, star_pts(x + fx * scale, cy + fy * scale, 10 * scale, 4 * scale), GOLD, w=3)


def moon(d, cx, cy, r):
    oval(d, [cx - r, cy - r, cx + r, cy + r], (255, 236, 196, 255), (255, 214, 140, 255), w=6)
    for dx, dy, rr in ((-r * 0.25, -r * 0.15, r * 0.18), (r * 0.22, r * 0.2, r * 0.12), (-r * 0.05, r * 0.32, r * 0.1)):
        d.ellipse([cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr], fill=(244, 206, 150, 255))


def stars(d, points):
    for x, y, r in points:
        poly(d, star_pts(x, y, r, r * 0.4), GOLD_HI, w=2)


def comet(d, x, y, length, ang_deg):
    ang = math.radians(ang_deg)
    dx, dy = math.cos(ang), math.sin(ang)
    px, py = -dy, dx
    head = 22
    tail = [
        (x + px * head * 0.7, y + py * head * 0.7),
        (x - dx * length + px * 6, y - dy * length + py * 6),
        (x - dx * length - px * 6, y - dy * length - py * 6),
        (x - px * head * 0.7, y - py * head * 0.7),
    ]
    poly(d, tail, (255, 186, 96, 255), (255, 232, 170, 255), w=3)
    oval(d, [x - head, y - head, x + head, y + head], GOLD_HI, GOLD, w=4)


def draw_bg() -> None:
    sheet = sky(1280, 720)
    d = ImageDraw.Draw(sheet)
    stars(d, [
        (80, 60, 8), (180, 120, 5), (260, 40, 6), (420, 90, 4), (540, 36, 9),
        (700, 70, 5), (860, 30, 7), (980, 110, 5), (1120, 48, 8), (1200, 140, 4),
        (140, 200, 4), (640, 150, 6), (1040, 180, 5), (300, 160, 3), (780, 160, 4),
    ])
    moon(d, 980, 150, 78)
    comet(d, 760, 210, 280, 18)
    # far hills and orchard
    hill(d, [(0, 470), (220, 390), (460, 450), (700, 360), (980, 440), (1280, 390), (1280, 720), (0, 720)], (32, 26, 68, 255))
    for x, sc in ((90, 0.7), (230, 0.85), (400, 0.6), (560, 0.95), (760, 0.7), (940, 0.8), (1140, 0.65)):
        tree(d, x, 500, sc, far=True)
    hill(d, [(0, 560), (180, 500), (420, 560), (680, 490), (920, 550), (1280, 500), (1280, 720), (0, 720)], (24, 36, 72, 255))
    for x, sc in ((140, 1.15), (360, 1.35), (620, 1.05), (860, 1.4), (1100, 1.1)):
        tree(d, x, 600, sc, far=False)
    # meadow
    hill(d, [(0, 640), (1280, 620), (1280, 720), (0, 720)], (36, 48, 86, 255))
    for x in range(40, 1260, 36):
        poly(d, star_pts(x, 648 + (x * 3 % 12), 7, 3), GOLD, w=2)
    rgb = Image.new("RGB", sheet.size, (16, 10, 40))
    rgb.paste(sheet, mask=sheet.getchannel("A"))
    path = os.path.join(ROOT, "bg_ch10.png")
    rgb.save(path, optimize=True)
    print("wrote", path)


def draw_splash() -> None:
    sheet = sky(1280, 720, horizon=0.68)
    d = ImageDraw.Draw(sheet)
    stars(d, [
        (90, 80, 10), (200, 160, 6), (340, 60, 8), (520, 120, 5), (1180, 90, 9),
        (1080, 180, 5), (60, 240, 4), (1240, 220, 6),
    ])
    moon(d, 260, 180, 110)
    comet(d, 860, 250, 420, 24)
    hill(d, [(0, 520), (240, 430), (520, 500), (860, 400), (1280, 470), (1280, 720), (0, 720)], (28, 22, 62, 255))
    tree(d, 860, 560, 2.15, far=False)
    # portal arch
    oval(d, [150, 300, 470, 640], (255, 220, 120, 255), GOLD, w=10)
    d.ellipse([190, 345, 430, 600], fill=(48, 24, 96, 255))
    oval(d, [230, 390, 390, 560], (255, 244, 210, 255), GOLD_HI, w=4)
    # stone feet of the arch
    poly(d, [(150, 500), (210, 500), (200, 640), (130, 640)], SILVER, w=6)
    poly(d, [(410, 500), (470, 500), (500, 640), (420, 640)], SILVER, w=6)
    # two moonhares on the hill, small
    def tiny_hare(x, y, flip=False):
        s = -1 if flip else 1
        oval(d, [x - 28, y - 10, x + 22, y + 28], SILVER, w=4)
        oval(d, [x + 8 * s - 16, y - 28, x + 8 * s + 16, y + 6], SILVER_HI, w=4)
        oval(d, [x + (8 * s) - 18, y - 62, x + (8 * s) - 4, y - 16], SILVER, w=3)
        poly(d, [
            (x + 8 * s + 2, y - 20),
            (x + 8 * s + 16, y - 64),
            (x + 8 * s + 28, y - 20),
        ], GOLD, w=3)
        eye(d, x + 12 * s, y - 16, 4)
    tiny_hare(620, 500)
    tiny_hare(700, 520, flip=True)
    # falling star seedlings
    for x, y in ((80, 470), (560, 560), (1040, 500), (1200, 560)):
        poly(d, star_pts(x, y, 16, 7), GOLD, w=3)
        oval(d, [x - 4, y + 10, x + 4, y + 36], LEAF_DK, w=3)
    rgb = Image.new("RGB", sheet.size, (16, 10, 40))
    rgb.paste(sheet, mask=sheet.getchannel("A"))
    path = os.path.join(ROOT, "splash_ch10b.png")
    rgb.save(path, optimize=True)
    print("wrote", path)


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)
    draw_starling()
    draw_moonhare()
    draw_seedlamp()
    draw_cometpup()
    draw_props()
    draw_bg()
    draw_splash()


if __name__ == "__main__":
    main()
