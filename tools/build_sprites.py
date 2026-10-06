"""Clean the source atlases and emit runtime sprite sheets + a generated TS index.

Originals in public/assets/ are never modified. Output goes to public/assets/runtime/.
Usage: python3 tools/build_sprites.py [--preview]
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from atlas_config import ATLASES, BACKDROPS, GEN_TS, OUT, PLAYER_HAIR, PORTRAITS, PROPS, ROOT, SHEETS
from segment import detect_frames, load_rgba, mask_alpha, mask_black_bg, mask_flat_bg, mask_gradient, slice_grid

PAD = 4
_cache: dict = {}


def atlas(key):
    if key in _cache:
        return _cache[key]
    cfg = ATLASES[key]
    a = load_rgba(f"{ROOT}/{cfg['src']}")
    kind = cfg["mask"]
    if kind == "grid":
        rgba8, mask, rows = slice_grid(a, cfg.get("cols", 5), cfg.get("rows", 4))
        out = {"rgba": rgba8, "mask": mask, "rows": rows}
        out["k"] = atlas_scale(cfg, a, out)
        _cache[key] = out
        return out
    if kind == "alpha":
        m = mask_alpha(a, 40)
        alpha = np.where(m, np.maximum(a[..., 3], 0), 0)
        # Fade the faint haze at the edges instead of hard-cutting it.
        alpha = np.clip((a[..., 3] - 40) * (255 / 200), 0, 255)
    elif kind == "black":
        m = mask_black_bg(a)
        alpha = np.clip((a[..., :3].max(axis=2) - 18) * 2.4, 0, 255)
        # Un-premultiply so the glow keeps its colour once the black is gone.
        a[..., :3] = np.clip(a[..., :3] * 255 / np.maximum(alpha, 1)[..., None], 0, 255)
    elif kind == "flat":
        m = mask_flat_bg(a, tol=cfg.get("tol", 22), seal=cfg.get("seal", 0), holes=cfg.get("holes", False), glow=cfg.get("glow", False))
        if cfg.get("white_holes"):
            m &= ~white_gaps(a)
        if cfg.get("drop_text"):
            m = drop_small(m)
        alpha = ndi.gaussian_filter(m.astype(np.float32), 0.6) * 255
        alpha[~ndi.binary_dilation(m)] = 0
    else:
        m = mask_gradient(a, 34)
        soft = ndi.gaussian_filter(m.astype(np.float32), 1.0)
        alpha = np.clip(soft * 1.4, 0, 1) * 255
        alpha[~ndi.binary_dilation(m, iterations=1)] = 0
    rgba = a.copy()
    rgba[..., 3] = alpha
    rgba8 = rgba.clip(0, 255).astype(np.uint8)
    out = {"rgba": rgba8, "mask": alpha > 24, "rows": detect_frames(m, 800)}
    out["k"] = atlas_scale(cfg, a, out)
    _cache[key] = out
    return out


def atlas_scale(cfg, a, at):
    if cfg.get("norm") == "hair":
        rgb = a[..., :3]
        hair = (rgb.mean(axis=2) < 85) & (rgb[..., 0] >= rgb[..., 2]) & at["mask"]
        sizes = [np.sqrt(hair[y0:y1, x0:x1].sum()) for row in at["rows"] for x0, y0, x1, y1 in row]
        return PLAYER_HAIR / float(np.median(sizes))
    if "fit" in cfg:
        axis, row, first, last, px = cfg["fit"]
        boxes = at["rows"][row][first:last + 1]
        return px / float(np.median([(y1 - y0) if axis == "h" else (x1 - x0) for x0, y0, x1, y1 in boxes]))
    if "row0_px" in cfg:
        return cfg["row0_px"] / float(np.median([y1 - y0 for _, y0, _, y1 in at["rows"][0]]))
    if "match_head" in cfg:
        other = atlas(cfg["match_head"])
        return other["k"] * head_size(other) / head_size(at)
    return 1.0


def head_size(at):
    """Width of the head: the widest dark-hair span in the top fifth of each frame."""
    rgba, sizes = at["rgba"], []
    dark = (rgba[..., :3].mean(axis=2) < 70) & at["mask"]
    for row in at["rows"]:
        for x0, y0, x1, y1 in row:
            top = dark[y0:y0 + (y1 - y0) // 5, x0:x1]
            cols = np.nonzero(top.any(axis=0))[0]
            if len(cols):
                sizes.append(cols.max() - cols.min())
    return float(np.median(sizes))


def white_gaps(a):
    """Pure-white pockets enclosed between two characters (tall, so not eye or sock highlights)."""
    labels, n = ndi.label(a[..., :3].min(axis=2) > 238)
    out = np.zeros(labels.shape, bool)
    for i, sl in enumerate(ndi.find_objects(labels)):
        if sl[0].stop - sl[0].start > 25 and (labels[sl] == i + 1).sum() > 80:
            out[sl] |= labels[sl] == i + 1
    return out


def drop_small(m):
    """Remove label text and panel specks: blobs that are both short and small."""
    labels, n = ndi.label(m)
    objs = ndi.find_objects(labels)
    keep = np.zeros(n + 1, bool)
    sizes = ndi.sum(m, labels, index=np.arange(1, n + 1))
    for i, sl in enumerate(objs):
        h = sl[0].stop - sl[0].start
        w = sl[1].stop - sl[1].start
        keep[i + 1] = sizes[i] > 1500 or (h > 40 and w > 12)
    return keep[labels]


def split_columns(mask, n):
    """Split a region into n frames at low-coverage columns near even spacing."""
    w = mask.shape[1]
    if n == 1:
        return [(0, w)]
    prof = ndi.uniform_filter1d(mask.sum(axis=0).astype(np.float32), 5)
    cuts = [0]
    step = w / n
    for k in range(1, n):
        c = int(k * step)
        lo = max(cuts[-1] + int(step * 0.4), int(c - step * 0.4))
        hi = min(w - 1, int(c + step * 0.4))
        if hi <= lo:
            cuts.append(c)
            continue
        seg = prof[lo:hi]
        cuts.append(lo + int(np.argmin(seg + np.abs(np.arange(lo, hi) - c) * 0.02)))
    cuts.append(w)
    return list(zip(cuts[:-1], cuts[1:]))


def largest_group(mask):
    """Keep the main body plus anything near it; drops bleed from neighbouring frames."""
    labels, n = ndi.label(ndi.binary_dilation(mask, iterations=6))
    if n <= 1:
        return mask
    sizes = ndi.sum(mask, labels, index=np.arange(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    keep = labels == main
    for i, s in enumerate(sizes):
        if s > sizes[main - 1] * 0.25:
            keep |= labels == i + 1
    return mask & keep


def _frame(rgba, sub_m, ox, oy, keep_all=False):
    fm = sub_m if keep_all else largest_group(sub_m)
    ys, xs = np.nonzero(fm)
    if len(xs) == 0:
        return None
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    img = rgba[oy + by0:oy + by1, ox + bx0:ox + bx1].copy()
    keep = ndi.binary_dilation(fm[by0:by1, bx0:bx1], iterations=2)
    img[..., 3] = np.where(keep, img[..., 3], 0)
    local = fm[by0:by1, bx0:bx1]
    h = local.shape[0]
    fx = np.nonzero(local[int(h * 0.85):])[1]
    anchor_x = float(np.median(fx)) if len(fx) else local.shape[1] / 2
    hips = np.nonzero(local[int(h * 0.5):int(h * 0.62)])[1]
    hip_x = (float(hips.min() + hips.max()) / 2) if len(hips) else anchor_x
    return {"img": img, "ax": anchor_x, "ay": float(h), "hx": hip_x}


def extract_frames(spec):
    at = atlas(spec["atlas"])
    rgba, mask = at["rgba"], at["mask"]
    frames = []
    boxes = spec.get("boxes")
    if "rown" in spec:
        row, n, first, last = spec["rown"]
        rb = at["rows"][row]
        x0, y0 = min(b[0] for b in rb), min(b[1] for b in rb)
        x1, y1 = max(b[2] for b in rb), max(b[3] for b in rb)
        sub_m = mask[y0:y1, x0:x1]
        for i, (cx0, cx1) in enumerate(split_columns(sub_m, n)):
            if first <= i <= last:
                f = _frame(rgba, sub_m[:, cx0:cx1], x0 + cx0, y0, spec.get("keep", False))
                if f:
                    frames.append(f)
        return frames
    if "auto" in spec:
        row, first, last = spec["auto"]
        boxes = at["rows"][row][first:last + 1]
        assert len(boxes) == last - first + 1, (spec, len(at["rows"][row]), len(boxes))
    if boxes:
        keep = spec.get("keep", False)
        for x0, y0, x1, y1 in boxes:
            pad = 0 if keep else 3
            x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
            f = _frame(rgba, mask[y0:y1 + pad, x0:x1 + pad], x0, y0, keep)
            if f:
                frames.append(flip(f) if ATLASES[spec["atlas"]].get("flip") else f)
        return frames
    x0, y0, x1, y1 = spec["rect"]
    sub_m = mask[y0:y1, x0:x1]
    for cx0, cx1 in split_columns(sub_m, spec["n"]):
        f = _frame(rgba, sub_m[:, cx0:cx1], x0 + cx0, y0)
        if f:
            frames.append(f)
    return frames


def flip(f):
    w = f["img"].shape[1]
    return {"img": f["img"][:, ::-1].copy(), "ax": w - f["ax"], "ay": f["ay"], "hx": w - f.get("hx", f["ax"])}


def downscale(f, k):
    """Pre-shrink frames to roughly their on-screen size: less GPU memory, faster loads."""
    if k >= 1:
        return f
    h, w = f["img"].shape[:2]
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    img = np.array(Image.fromarray(f["img"]).resize((nw, nh), Image.LANCZOS))
    return {"img": img, "ax": f["ax"] * nw / w, "ay": f["ay"] * nh / h, "hx": f.get("hx", f["ax"]) * nw / w}


def sheet_scale(name, sheet):
    if "scale" in sheet:
        return sheet["scale"]
    return 1.0


def pack_sheet(name, sheet):
    anchor = sheet["anchor"]
    k = sheet_scale(name, sheet)
    anims = {}
    all_frames = []
    for anim_name, spec in sheet["anims"].items():
        fr = [downscale(f, k * atlas(spec["atlas"])["k"]) for i, f in enumerate(extract_frames(spec)) if i not in spec.get("skip", ())]
        if spec.get("torso") and fr:
            # Shift the whole cycle so its average hip lands where its average feet were.
            off = float(np.mean([f["ax"] - f["hx"] for f in fr]))
            # Airborne run frames are shorter; feet-anchoring would sink her head, so lift them instead.
            tall = float(np.median([f["ay"] for f in fr]))
            for f in fr:
                f["ax"] = f["hx"] + off
                f["ay"] = max(f["ay"], tall)
        if sheet.get("center_x"):
            for f in fr:
                f["ax"] = f["img"].shape[1] / 2
        if anchor == "center":
            for f in fr:
                f["ax"] = f["img"].shape[1] / 2
                f["ay"] = f["img"].shape[0] / 2
        anims[anim_name] = {"start": len(all_frames), "end": len(all_frames) + len(fr) - 1,
                            "fps": spec["fps"], "repeat": spec["repeat"],
                            "h": int(np.median([f["img"].shape[0] for f in fr]))}
        all_frames += fr
    left = max(f["ax"] for f in all_frames)
    right = max(f["img"].shape[1] - f["ax"] for f in all_frames)
    up = max(f["ay"] for f in all_frames)
    down = max(f["img"].shape[0] - f["ay"] for f in all_frames)
    cw = int(np.ceil(left + right)) + PAD * 2
    ch = int(np.ceil(up + down)) + PAD * 2
    ox, oy = PAD + left, PAD + up
    cols = max(1, min(len(all_frames), 4096 // cw))
    rows = int(np.ceil(len(all_frames) / cols))
    sheet_img = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    for i, f in enumerate(all_frames):
        cx, cy = (i % cols) * cw, (i // cols) * ch
        px = int(round(cx + ox - f["ax"]))
        py = int(round(cy + oy - f["ay"]))
        sheet_img.alpha_composite(Image.fromarray(f["img"]), (px, py))
    sheet_img.save(f"{OUT}/{name}.webp", quality=92, alpha_quality=100, method=6)
    body_h = max(f["img"].shape[0] for f in all_frames[: anims[next(iter(anims))]["end"] + 1])
    return {"file": f"assets/runtime/{name}.webp", "frameWidth": cw, "frameHeight": ch,
            "originX": round(ox / cw, 4), "originY": round(oy / ch, 4),
            "bodyHeight": int(body_h), "anims": anims}


def build_props():
    """Static props, exported at 2x display size. Sizes in the index are display px."""
    out = {}
    os.makedirs(f"{OUT}/props", exist_ok=True)
    for name, (key, row, idx, disp_w) in PROPS.items():
        at = atlas(key)
        x0, y0, x1, y1 = row if isinstance(row, tuple) else at["rows"][row][idx]
        fm = largest_group(at["mask"][y0:y1, x0:x1])
        ys, xs = np.nonzero(fm)
        img = Image.fromarray(at["rgba"][y0 + ys.min():y0 + ys.max() + 1, x0 + xs.min():x0 + xs.max() + 1])
        w, h = img.size
        disp_h = disp_w * h / w
        img = img.resize((round(disp_w * 2), round(disp_h * 2)), Image.LANCZOS)
        img.save(f"{OUT}/props/{name}.webp", quality=92, alpha_quality=100, method=6)
        a = np.array(img)[..., 3] > 128
        cov = a[:, int(a.shape[1] * 0.2):int(a.shape[1] * 0.8)].mean(axis=1)
        surface = next(i for i, c in enumerate(cov) if c > 0.6) / a.shape[0]
        out[name] = {"file": f"assets/runtime/props/{name}.webp", "width": disp_w,
                     "height": round(disp_h, 1), "surface": round(surface, 3)}
    return out


def build_backdrops():
    """Backgrounds/splashes are opaque, so ship them as game-sized JPEGs."""
    out = {}
    os.makedirs(f"{OUT}/backdrops", exist_ok=True)
    for key, (src, height) in BACKDROPS.items():
        im = Image.open(f"{ROOT}/{src}").convert("RGB")
        height = min(height, im.height)
        w = round(im.width * height / im.height)
        im.resize((w, height), Image.LANCZOS).save(f"{OUT}/backdrops/{key}.jpg", quality=84, optimize=True, progressive=True)
        out[key] = f"assets/runtime/backdrops/{key}.jpg"
    return out


def build_portraits():
    """Round dialogue portraits with an anti-aliased circular edge."""
    out = {}
    for key, (src, box, px) in PORTRAITS.items():
        im = Image.open(f"{ROOT}/{src}").convert("RGBA").crop(box).resize((px, px), Image.LANCZOS)
        ss = 4
        mask = Image.new("L", (px * ss, px * ss), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).ellipse((0, 0, px * ss - 1, px * ss - 1), fill=255)
        im.putalpha(mask.resize((px, px), Image.LANCZOS))
        im.save(f"{OUT}/backdrops/{key}.webp", quality=92, alpha_quality=100, method=6)
        out[key] = f"assets/runtime/backdrops/{key}.webp"
    return out


def preview(index):
    """Contact sheet of every runtime sheet, for eyeballing cut quality."""
    tiles = []
    for name, meta in index.items():
        im = Image.open(f"{OUT}/{name}.webp")
        im.thumbnail((1500, 260))
        tiles.append(im)
    W = 1520
    H = sum(t.height + 10 for t in tiles)
    canvas = Image.new("RGBA", (W, H), (60, 70, 90, 255))
    y = 0
    for t in tiles:
        canvas.alpha_composite(t, (10, y))
        y += t.height + 10
    canvas.save("/tmp/aw/preview_sheets.png")


def main():
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for name, sheet in SHEETS.items():
        index[name] = pack_sheet(name, sheet)
        print(f"{name:14s} {index[name]['frameWidth']}x{index[name]['frameHeight']} "
              f"frames={sum(a['end'] - a['start'] + 1 for a in index[name]['anims'].values())}")
    props = build_props()
    backdrops = {**build_backdrops(), **build_portraits()}
    with open(GEN_TS, "w") as f:
        f.write("// Generated by tools/build_sprites.py. Do not edit by hand.\n")
        f.write("export const SPRITES = " + json.dumps(index, indent=2) + " as const;\n\n")
        f.write("export const PROPS = " + json.dumps(props, indent=2) + " as const;\n\n")
        f.write("export const BACKDROPS = " + json.dumps(backdrops, indent=2) + " as const;\n\n")
        f.write("export type SpriteKey = keyof typeof SPRITES;\n")
        f.write("export type PropKey = keyof typeof PROPS;\n")
    if "--preview" in sys.argv:
        os.makedirs("/tmp/aw", exist_ok=True)
        preview(index)
    # Star gem and Star Shield are painted icons animated here, not grid sheets.
    from pack_pickups import build as build_pickups, splice
    extra = build_pickups()
    new_chapter11 = os.path.exists("art/source/chapter11/layout.json")
    if not new_chapter11:
        from pack_crystalveil import build as build_veil
        extra.update(build_veil())
    splice(extra)
    if new_chapter11:
        from build_chapter11 import build as build_chapter11
        build_chapter11()
    print("packed stargem + starshield")


if __name__ == "__main__":
    main()
