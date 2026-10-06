"""Cut the Chapter 11-2 sheets (Crystal Veil boss, its shard projectile, caged Angelo).

The sources are hand-laid transparent sheets whose frames sit close together, so
glow from one frame can reach into the next. Each frame is cut at the emptiest
column near its grid line, and the cut edge is feathered instead of left hard.
"""
from __future__ import annotations

import os

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


def border_key(rgb: np.ndarray) -> np.ndarray:
    from scipy import ndimage as ndi

    rgb = rgb.astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    # Anything with chroma or that isn't near-paper-white is ink.
    ink = ((mx - mn) > 8) | (mx < 242)
    # Close armpit/hem leaks so white shirts stay inside the silhouette.
    closed = ndi.binary_closing(ink, iterations=4)
    paper = ~closed
    seed = np.zeros(paper.shape, bool)
    seed[0] = seed[-1] = seed[:, 0] = seed[:, -1] = True
    bg = ndi.binary_propagation(seed & paper, mask=paper) if paper.any() else paper
    rgba = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.where(bg, 0, 255)
    return rgba


def drop_edge_bleed(keep: np.ndarray) -> np.ndarray:
    from scipy import ndimage as ndi

    labels, n = ndi.label(keep)
    if n == 0:
        return keep
    h, w = keep.shape
    out = keep.copy()
    for i in range(1, n + 1):
        ys, xs = np.nonzero(labels == i)
        left, right = int(xs.min()), int(xs.max())
        if right - left < 8:
            out[labels == i] = False
            continue
        # Neighbor-cell slivers sit on one side and never cross the middle.
        if right < w * 0.22 or left > w * 0.78:
            out[labels == i] = False
            continue
        # Feet from the row above land on the top of a cell.
        if float(ys.mean()) < h * 0.16 and int(ys.max()) < h * 0.22:
            out[labels == i] = False
    return out


def keep_ink(alpha: np.ndarray, keep_all: bool) -> np.ndarray:
    if not keep_all:
        return largest_blob(alpha)
    from scipy import ndimage as ndi

    m = alpha > 55
    labels, n = ndi.label(m)
    if n == 0:
        return m
    sizes = ndi.sum(m, labels, range(1, n + 1))
    keep = np.zeros_like(m)
    for i, s in enumerate(sizes, 1):
        if s >= 80:
            keep |= labels == i
    return keep if keep.any() else m


def frame_from_rgba(a: np.ndarray, center: bool = False, keep_all: bool = False) -> dict | None:
    keep = drop_edge_bleed(keep_ink(a[..., 3], keep_all))
    if keep.sum() < 80:
        return None
    a = a.copy()
    a[..., 3] = np.where(keep, a[..., 3], 0)
    ys, xs = np.nonzero(keep)
    if center:
        ax = float(xs.min() + xs.max()) / 2
    else:
        foot = ys.max() - max(3, int((ys.max() - ys.min()) * 0.18))
        ax = float(np.median(xs[ys >= foot]))
    return {"img": a, "ax": ax, "ay": float(ys.max())}


def pin_row(fr: list[dict], k: float, center: bool = False) -> list[dict]:
    if not fr:
        return []
    base = float(np.percentile([f["ay"] for f in fr], 80))
    hips = float(np.median([f["ax"] for f in fr]))
    out = []
    for f in fr:
        f["ay"] = base
        if not center:
            f["ax"] = float(np.clip(f["ax"], hips - 28, hips + 28))
        out.append(finish(f, k))
    return out


def strip_n(path: str, n: int, k: float = 1.4) -> list[dict]:
    rgb = np.array(Image.open(path).convert("RGB"))
    keyed = border_key(rgb)
    W = rgb.shape[1]
    cuts = [0]
    for i in range(1, n):
        cuts.append(seam(keyed[..., 3], int(i * W / n), 24))
    cuts.append(W)
    fr = []
    for x0, x1 in zip(cuts, cuts[1:]):
        pad = min(10, max(2, (x1 - x0) // 16))
        f = frame_from_rgba(keyed[:, x0 + pad:x1 - pad])
        if f:
            fr.append(f)
    return pin_row(fr, k)


def grid_fixed(path: str, cols: int, rows: int, k: float = 1.0, center: bool = False, keep_all: bool = False) -> list[list[dict]]:
    rgb = np.array(Image.open(path).convert("RGB"))
    H, W = rgb.shape[:2]
    out = []
    for r in range(rows):
        y0, y1 = int(r * H / rows) + 3, int((r + 1) * H / rows) - 3
        fr = []
        for c in range(cols):
            x0, x1 = int(c * W / cols) + 6, int((c + 1) * W / cols) - 6
            f = frame_from_rgba(border_key(rgb[y0:y1, x0:x1]), center=center, keep_all=keep_all)
            if f:
                fr.append(f)
        out.append(pin_row(fr, k, center=center))
    return out


def load_strip(name: str, n: int = 8, k: float = 1.4) -> list[dict]:
    for ext in ("png", "jpg"):
        path = f"{SRC}/veil_{name}_strip.{ext}"
        if os.path.exists(path):
            fr = strip_n(path, n, k)
            if fr:
                return fr
    return []


def row_slice(rows: list[list[dict]], r: int, a: int, b: int | None = None) -> list[dict]:
    if not rows:
        return []
    row = rows[r] if r < len(rows) else rows[-1]
    if not row:
        return (rows[0][:1] if rows[0] else [])
    sl = row[a:] if b is None else row[a:b]
    return sl or row[-1:]


def boss_frames():
    idle = load_strip("idle")
    walk = load_strip("walk")
    dead = load_strip("dead")
    claw = load_strip("claw")
    slam = load_strip("slam")
    cast = load_strip("cast")
    beam = load_strip("beam")
    have = idle and walk and dead and claw and slam and cast and beam
    melee = grid5(f"{SRC}/veil_melee.png") if (not have and os.path.exists(f"{SRC}/veil_melee.png")) else []
    sheet_cast = grid5(f"{SRC}/veil_cast.png") if (not have and os.path.exists(f"{SRC}/veil_cast.png")) else []
    death = grid5(f"{SRC}/veil_death.png") if (not have and os.path.exists(f"{SRC}/veil_death.png")) else []
    pick = lambda pref, *alts: pref or next((a for a in alts if a), pref)
    print("strips", {k: len(v) for k, v in dict(idle=idle, walk=walk, dead=dead, claw=claw, slam=slam, cast=cast, beam=beam).items()})
    return idle, walk, dead, claw, slam, cast, beam, melee, sheet_cast, death, pick


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
    idle, walk, dead, claw, slam, cast, beam, melee, sheet_cast, death, pick = boss_frames()
    row = lambda sheet, i: sheet[i] if i < len(sheet) else (sheet[0] if sheet else [])
    cat = lambda *rows: [f for r in rows for f in r]
    claw_fr = pick(claw, cat(row(melee, 1), row(melee, 2)))
    slam_fr = pick(slam, row(melee, 3))
    shoot_fr = pick(cast[:5], row(sheet_cast, 1)[:4], row(sheet_cast, 1))
    summon_fr = pick(cast, row(sheet_cast, 2))
    charge_fr = pick(beam, row(sheet_cast, 3)[:3], row(sheet_cast, 3))
    hurt_fr = pick(dead[:3], row(death, 1))
    stagger_fr = pick(dead[1:4], row(death, 2)[:3], row(death, 2))
    boss = pack("crystalveil", {
        "idle": (idle, 8, -1),
        "walk": (walk, 10, -1),
        "claw": (claw_fr, 12, 0),
        "slam": (slam_fr, 10, 0),
        "summon": (summon_fr, 10, 0),
        "shoot": (shoot_fr, 9, 0),
        "charge": (charge_fr, 8, 0),
        "erupt": (summon_fr, 8, 0),
        "hurt": (hurt_fr, 10, 0),
        "stagger": (stagger_fr, 6, 0),
        "enrage": (pick(cast, idle), 8, -1),
        "dead": (dead, 8, 0),
    })
    beam_fr = pick(beam[3:7], beam[-2:], row(sheet_cast, 3)[-2:], row(sheet_cast, 3))
    spike_fr = pick(dead[-3:], dead[-1:])
    ring_fr = pick(slam[3:5], summon_fr[-1:], slam[-1:])
    beam_sheet = pack("crystalveil_beam", {"beam": (beam_fr, 8, -1)})
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
    cage_rows = grid_fixed(f"{SRC}/cage_new.png", 9, 5, k=1.0)
    print("cage", [len(r) for r in cage_rows])
    cage = pack("angelo_cage", {
        "idle": (row_slice(cage_rows, 0, 0, 4), 6, -1),
        "grip": (row_slice(cage_rows, 1, 0, 5), 8, -1),
        "shake": (row_slice(cage_rows, 1, 6) + row_slice(cage_rows, 2, 7), 10, -1),
        "worry": (row_slice(cage_rows, 3, 0, 5) + row_slice(cage_rows, 4, 4, 6), 7, -1),
        "cheer": (row_slice(cage_rows, 4, 6, 8), 6, -1),
    })
    hug_rows = grid_fixed(f"{SRC}/hug_new.png", 9, 5, k=1.0, center=True, keep_all=True)
    print("hug", [len(r) for r in hug_rows])
    hug = pack("angelo_hug", {
        "open": (row_slice(hug_rows, 0, 0, 4), 8, 0),
        "hug": (row_slice(hug_rows, 0, 4) + row_slice(hug_rows, 1, 0, 2), 8, -1),
        "kneel": (row_slice(hug_rows, 1, 4, 8), 6, -1),
        "kiss": (row_slice(hug_rows, 4, 0, 1) + row_slice(hug_rows, 3, 2, 3) + row_slice(hug_rows, 4, 6, 7) + row_slice(hug_rows, 2, 7, 8), 6, -1),
        "hold": (row_slice(hug_rows, 2, 2, 6), 6, -1),
        "pat": (row_slice(hug_rows, 3, 0, 2) + row_slice(hug_rows, 4, 1, 2), 6, -1),
    })
    return {"crystalveil": boss, "crystalveil_beam": beam_sheet, "crystalveil_fx": fx, "crystal_shot": shot,
            "angelo_cell": angelo, "angelo_cage": cage, "angelo_hug": hug}


if __name__ == "__main__":
    splice(build())
