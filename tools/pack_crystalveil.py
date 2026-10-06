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

BOSS_K = 1.15
SHEETS_5 = {
    "idle": "veil_idle.png",
    "melee": "veil_melee.png",
    "cast": "veil_cast.png",
    "death": "veil_death.png",
}


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


def checker_rgba(path: str) -> np.ndarray:
    """The new sheets are RGB with a light checker; pull that out as alpha."""
    rgb = np.array(Image.open(path).convert("RGB")).astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    checker = ((mx - mn) < 26) & (mx > 196)
    alpha = np.where(checker, 0, 255).astype(np.uint8)
    # Soften the key so crystal glow on the checker doesn't get a hard halo.
    near = ((mx - mn) < 40) & (mx > 175) & ~checker
    alpha = np.where(near, np.clip((220 - mx) * 8, 0, 255), alpha).astype(np.uint8)
    rgba = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., 3] = alpha
    return rgba


def bands_1d(ink: np.ndarray, expect: int) -> list[tuple[int, int]]:
    segs = segments(ink, min_w=12)
    segs = [s for s in segs if s[1] - s[0] > 40]
    if len(segs) == expect:
        return segs
    n = len(ink)
    return [(int(i * n / expect) + 6, int((i + 1) * n / expect) - 6) for i in range(expect)]


def grid5(path: str) -> list[list[dict]]:
    src = checker_rgba(path)
    ink = src[..., 3] > 40
    rows = bands_1d(ink.any(axis=1), 5)
    cols = bands_1d(ink.any(axis=0), 5)
    out = []
    for y0, y1 in rows:
        fr = []
        for x0, x1 in cols:
            f = cell_frame(src[y0:y1], x0, x1)
            if f:
                fr.append(f)
        if not fr:
            continue
        base = float(np.percentile([f["ay"] for f in fr], 80))
        hips = float(np.median([f["ax"] for f in fr]))
        for f in fr:
            f["ay"] = base
            f["ax"] = float(np.clip(f["ax"], hips - 28, hips + 28))
        out.append([finish(f, BOSS_K) for f in fr])
    return out


def boss_frames():
    idle = grid5(f"{SRC}/veil_idle.png")
    melee = grid5(f"{SRC}/veil_melee.png")
    cast = grid5(f"{SRC}/veil_cast.png")
    death = grid5(f"{SRC}/veil_death.png")
    for name, rows in ("idle", idle), ("melee", melee), ("cast", cast), ("death", death):
        print(name, [len(r) for r in rows])
    return idle, melee, cast, death


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
    idle, melee, cast, death = boss_frames()
    row = lambda sheet, i: sheet[i] if i < len(sheet) else sheet[0]
    cat = lambda *rows: [f for r in rows for f in r]
    boss = pack("crystalveil", {
        "idle": (cat(row(idle, 0), row(idle, 1)), 8, -1),
        "walk": (cat(row(idle, 2), row(idle, 3)), 10, -1),
        "claw": (cat(row(melee, 1), row(melee, 2)), 12, 0),
        "slam": (row(melee, 3), 10, 0),
        "summon": (row(cast, 2), 10, 0),
        "shoot": (row(cast, 1)[:4] or row(cast, 1), 9, 0),
        "charge": (row(cast, 3)[:2] or row(cast, 3)[:1], 5, 0),
        "erupt": (row(cast, 2), 8, 0),
        "hurt": (row(death, 1), 10, 0),
        "stagger": (row(death, 2)[:3] or row(death, 2), 6, 0),
        "enrage": (cat(row(idle, 4), row(melee, 4)), 8, -1),
        "dead": (cat(row(death, 2), row(death, 3), row(death, 4)), 8, 0),
    })
    beam_fr = row(cast, 3)[-2:] or row(cast, 3)
    spike_fr = row(death, 4)[:2] or row(death, 4)
    ring_fr = row(cast, 2)[-1:]
    beam = pack("crystalveil_beam", {"beam": (beam_fr, 8, -1)})
    fx = pack("crystalveil_fx", {"spikes": (spike_fr, 1, 0), "ring": (ring_fr, 1, 0)})

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
