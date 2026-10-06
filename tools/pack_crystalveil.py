"""Cut the Chapter 11-2 sheets (Crystal Veil boss, its shard projectile, caged Angelo).

The sources are hand-laid transparent sheets whose frames sit close together, so
glow from one frame can reach into the next. Each frame is cut at the emptiest
column near its grid line, and the cut edge is feathered instead of left hard.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

from pack_pickups import OUT, splice

SRC = "art/source/crystalveil"
PAD = 3

# Row bands of the boss sheet (y0, y1) and its 6 rows of frames.
BOSS_ROWS = [(0, 87), (87, 168), (168, 248), (248, 337), (337, 412), (412, 491)]
# Row 4 is irregular: charge, two wide beam frames, dome, shell, floor spikes.
BOSS_ROW4 = [0, 103, 349, 562, 646, 730, 819]
BOSS_K = 3


def rgba(path: str) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def seam(alpha: np.ndarray, x: int, win: int) -> int:
    """Column with the least ink within `win` px of x."""
    lo, hi = max(1, x - win), min(alpha.shape[1] - 1, x + win)
    cols = alpha[:, lo:hi].astype(np.int64).sum(axis=0)
    return lo + int(np.argmin(cols))


def feather(a: np.ndarray, left: bool, right: bool, px: int = 3) -> None:
    for i in range(px):
        k = (i + 1) / (px + 1)
        if left:
            a[:, i, 3] = (a[:, i, 3] * k).astype(np.uint8)
        if right:
            a[:, -1 - i, 3] = (a[:, -1 - i, 3] * k).astype(np.uint8)


def upscale(a: np.ndarray, k: float) -> np.ndarray:
    if k == 1:
        return a
    im = Image.fromarray(a).convert("RGBa")
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    return np.array(im.convert("RGBA"))


def largest_blob(alpha: np.ndarray) -> np.ndarray:
    """Keep the main body in a cell, plus sparkles that actually touch it."""
    from scipy import ndimage as ndi

    m = alpha > 55
    labels, n = ndi.label(m)
    if n == 0:
        return m
    sizes = ndi.sum(m, labels, range(1, n + 1))
    keep = labels == (int(np.argmax(sizes)) + 1)
    keep = ndi.binary_dilation(keep, iterations=4) & m
    return keep


def cell_frame(band: np.ndarray, x0: int, x1: int) -> dict | None:
    a = band[:, x0:x1].copy()
    feather(a, True, True, 5)
    keep = largest_blob(a[..., 3])
    if keep.sum() < 80:
        return None
    a[..., 3] = np.where(keep, a[..., 3], 0)
    ys, xs = np.nonzero(keep)
    foot = ys.max() - max(3, int((ys.max() - ys.min()) * 0.18))
    feet = xs[ys >= foot]
    return {"img": a, "ax": float(np.median(feet)), "ay": float(ys.max())}


def finish(f: dict, k: float) -> dict:
    a = f["img"]
    ys, xs = np.nonzero(a[..., 3] > 6)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    a = a[y0:y1, x0:x1]
    return {"img": upscale(a, k), "ax": (f["ax"] - x0) * k, "ay": (f["ay"] - y0) * k}


def boss_frames():
    src = rgba(f"{SRC}/boss.png")
    rows = []
    for r, (y0, y1) in enumerate(BOSS_ROWS):
        bounds = BOSS_ROW4 if r == 4 else [round(src.shape[1] * i / 10) for i in range(11)]
        band = src[y0:y1]
        fr = []
        for i in range(len(bounds) - 1):
            f = cell_frame(band, bounds[i], bounds[i + 1])
            if f:
                fr.append(f)
        if not fr:
            continue
        # Pin every pose in the row to the same floor so the body doesn't hop.
        base = float(np.percentile([f["ay"] for f in fr], 75))
        hips = float(np.median([f["ax"] for f in fr]))
        for f in fr:
            f["ay"] = base
            # Don't force a shared x — strides need to travel — but clamp wild glow offsets.
            f["ax"] = float(np.clip(f["ax"], hips - 18, hips + 18))
        rows.append([finish(f, BOSS_K) for f in fr])
    return rows


def segments(mask: np.ndarray, min_w: int = 6) -> list[tuple[int, int]]:
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_w:
                out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def grid_frames(path: str, anchor: str, split: dict[tuple[int, int], int] | None = None):
    """Rows and frames separated by empty gutters. `split` cuts merged frames at an x."""
    src = rgba(path)
    alpha = src[..., 3] > 20
    rows = []
    for r, (y0, y1) in enumerate(segments(alpha.any(axis=1))):
        segs = segments(alpha[y0:y1].any(axis=0))
        for (rr, at), x in (split or {}).items():
            if rr == r:
                s = segs[at]
                segs[at:at + 1] = [(s[0], x), (x, s[1])]
        fr = []
        for x0, x1 in segs:
            a = src[max(0, y0 - PAD):y1 + PAD, max(0, x0 - PAD):x1 + PAD].copy()
            m = a[..., 3] > 60
            ys, xs = np.nonzero(m)
            if anchor == "feet":
                h = a.shape[0]
                hips = np.nonzero(m[int(h * 0.5):int(h * 0.62)].any(axis=0))[0]
                ax = (hips.min() + hips.max()) / 2 if len(hips) else a.shape[1] / 2
                fr.append({"img": a, "ax": float(ax), "ay": float(ys.max() + 1)})
            else:
                w = a[..., 3].astype(np.float64)
                fr.append({"img": a, "ax": float((w.sum(0) * np.arange(a.shape[1])).sum() / w.sum()),
                           "ay": float((w.sum(1) * np.arange(a.shape[0])).sum() / w.sum())})
        rows.append(fr)
    return rows


def pack(name: str, anims: dict[str, tuple[list[dict], int, int]]) -> dict:
    """anims: name -> (frames, fps, repeat). Frames share one cell size and anchor."""
    frames = [f for fr, _, _ in anims.values() for f in fr]
    left = max(f["ax"] for f in frames)
    right = max(f["img"].shape[1] - f["ax"] for f in frames)
    up = max(f["ay"] for f in frames)
    down = max(f["img"].shape[0] - f["ay"] for f in frames)
    cw, ch = int(np.ceil(left + right)) + PAD * 2, int(np.ceil(up + down)) + PAD * 2
    cols = max(1, min(len(frames), 4096 // cw))
    rows = int(np.ceil(len(frames) / cols))
    sheet = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    ox, oy = PAD + left, PAD + up
    for i, f in enumerate(frames):
        cx, cy = (i % cols) * cw, (i // cols) * ch
        sheet.alpha_composite(Image.fromarray(f["img"]), (int(round(cx + ox - f["ax"])), int(round(cy + oy - f["ay"]))))
    sheet.save(f"{OUT}/{name}.webp", quality=92, alpha_quality=100, method=6)
    meta, start = {}, 0
    for key, (fr, fps, repeat) in anims.items():
        meta[key] = {"start": start, "end": start + len(fr) - 1, "fps": fps, "repeat": repeat,
                     "h": int(np.median([f["img"].shape[0] for f in fr]))}
        start += len(fr)
    print(f"{name:14s} {cw}x{ch} frames={len(frames)}")
    return {"file": f"assets/runtime/{name}.webp", "frameWidth": cw, "frameHeight": ch,
            "originX": round(ox / cw, 4), "originY": round(oy / ch, 4), "bodyHeight": int(up), "anims": meta}


def build() -> dict:
    b = boss_frames()
    for i, row in enumerate(b):
        print(f"boss row {i}: {len(row)}")
    r0, r1, r2, r3, r4, r5 = b
    take = lambda row, a, b: row[a:min(b, len(row))] or row[:1]
    boss = pack("crystalveil", {
        "idle": (take(r0, 0, 10), 8, -1),
        "walk": (take(r1, 0, 10), 10, -1),
        "claw": (take(r2, 0, 5), 11, 0),
        "slam": (take(r2, 5, 10), 10, 0),
        "summon": (take(r3, 0, 6), 10, 0),
        "shoot": (take(r3, 6, 9), 8, 0),
        "charge": (take(r4, 0, 1), 1, -1),
        "erupt": (take(r4, 3, 5) if len(r4) > 4 else take(r4, 0, 1), 6, 0),
        "hurt": (take(r5, 0, 2), 10, 0),
        "stagger": (take(r5, 2, 4), 5, 0),
        "enrage": (take(r5, 3, 5), 6, -1),
        "dead": (take(r5, 5, 10), 6, 0),
    })
    beam = pack("crystalveil_beam", {"beam": (take(r4, 1, 3), 10, -1)})
    fx = pack("crystalveil_fx", {"spikes": (take(r4, 5, 6), 1, 0), "ring": (take(r3, 9, 10), 1, 0)})

    s = grid_frames(f"{SRC}/shot.png", "center")
    shot = pack("crystal_shot", {"form": (s[0], 14, 0), "fly": (s[1] + s[2], 16, -1), "impact": (s[3], 18, 0)})

    a = grid_frames(f"{SRC}/angelo.png", "feet", split={(7, 8): 1120})
    angelo = pack("angelo_cell", {
        "idle": (a[0][0:4], 5, -1),
        "walk": (a[0][4:12], 11, -1),
        "worried": (a[7][0:2], 4, -1),
        "grip": (a[7][2:4], 6, -1),
        "cheer": (a[7][4:6], 6, -1),
    })
    c = grid_frames(f"{SRC}/cage.png", "feet")
    cage = pack("angelo_cage", {
        "idle": (c[0][:6], 6, -1),
        "grip": (c[2][:6] if len(c) > 2 else c[0][:6], 7, -1),
        "cheer": (c[7][:4] if len(c) > 7 else c[0][:4], 6, -1),
    })
    return {"crystalveil": boss, "crystalveil_beam": beam, "crystalveil_fx": fx, "crystal_shot": shot, "angelo_cell": angelo, "angelo_cage": cage}


if __name__ == "__main__":
    splice(build())
