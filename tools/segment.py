"""Shared helpers: build a foreground mask for an atlas and find sprite blobs."""
from __future__ import annotations

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def load_rgba(path: str) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA")).astype(np.float32)


def mask_alpha(a: np.ndarray, thresh: float = 48) -> np.ndarray:
    return a[..., 3] >= thresh


def mask_flat_bg(a: np.ndarray, tol: float = 26, seal: int = 0, holes: bool = False, glow: bool = False) -> np.ndarray:
    """Opaque sheets on a light, nearly flat background (character reference sheets).

    seal > 0 cuts background channels narrower than ~2*seal px, so white fur or snow
    behind small gaps in the outline is not mistaken for background.
    holes=True also clears large enclosed background pockets (the gap inside a bow).
    glow=True treats pale bluish haze (a glowing bowstring) as background; warm cream
    clothing is unaffected.
    """
    rgb = a[..., :3]
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    bg_like = (lum > 165) & (sat < tol)
    if glow:
        bg_like |= (lum > 215) & (rgb[..., 2] - rgb[..., 0] > 25)
    if seal:
        core = ndi.binary_opening(bg_like, iterations=seal)
        labels, n = ndi.label(core)
        sizes = ndi.sum(core, labels, index=np.arange(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes > 6000
        bg = ndi.binary_dilation(keep[labels], iterations=seal + 1, mask=bg_like)
        return ndi.binary_fill_holes(ndi.binary_opening(~bg, iterations=1))
    # Only large connected light-gray regions are background; enclosed light skin,
    # socks and eye whites are small pockets and survive.
    labels, n = ndi.label(bg_like)
    sizes = ndi.sum(bg_like, labels, index=np.arange(1, n + 1))
    big = np.zeros(n + 1, bool)
    big[1:] = sizes > (1500 if holes else 6000)
    fg = ~big[labels]
    fg = ndi.binary_opening(fg, iterations=1)
    filled = ndi.binary_fill_holes(fg)
    return filled & ~big[labels] if holes else filled


def mask_gradient(a: np.ndarray, grad_thresh: float = 34, close: int = 4) -> np.ndarray:
    """Sprites painted over a blurry atmospheric backdrop: keep high-detail regions."""
    rgb = a[..., :3]
    gray = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    gx = ndi.sobel(gray, axis=1)
    gy = ndi.sobel(gray, axis=0)
    mag = np.hypot(gx, gy)
    edges = mag > grad_thresh * 4
    edges = ndi.binary_closing(edges, structure=np.ones((3, 3)), iterations=close)
    filled = ndi.binary_fill_holes(edges)
    filled = ndi.binary_opening(filled, structure=np.ones((3, 3)), iterations=2)
    return filled


def find_blobs(mask: np.ndarray, link: int = 3, min_area: int = 900, attach_radius: int = 40):
    """Label blobs, then glue small specks (stars, dust) onto the nearest large blob."""
    linked = ndi.binary_dilation(mask, iterations=link) if link else mask
    labels, n = ndi.label(linked)
    labels = labels * mask
    objs = ndi.find_objects(labels)
    areas = ndi.sum(mask, labels, index=np.arange(1, n + 1))
    big, small = [], []
    for i, sl in enumerate(objs):
        if sl is None:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        rec = {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "area": float(areas[i])}
        (big if areas[i] >= min_area else small).append(rec)
    for s in small:
        cx, cy = (s["x0"] + s["x1"]) / 2, (s["y0"] + s["y1"]) / 2
        best, bd = None, 1e9
        for b in big:
            dx = max(b["x0"] - cx, 0, cx - b["x1"])
            dy = max(b["y0"] - cy, 0, cy - b["y1"])
            d = (dx * dx + dy * dy) ** 0.5
            if d < bd:
                best, bd = b, d
        if best is not None and bd <= attach_radius:
            best["x0"] = min(best["x0"], s["x0"])
            best["y0"] = min(best["y0"], s["y0"])
            best["x1"] = max(best["x1"], s["x1"])
            best["y1"] = max(best["y1"], s["y1"])
    return big


def group_rows(blobs, tol: float = 0.45):
    """Sort blobs into reading order: rows by vertical overlap, then left to right."""
    blobs = sorted(blobs, key=lambda b: (b["y0"] + b["y1"]) / 2)
    rows: list[list[dict]] = []
    for b in blobs:
        cy = (b["y0"] + b["y1"]) / 2
        h = b["y1"] - b["y0"]
        placed = False
        for row in rows:
            ry0 = np.median([r["y0"] for r in row])
            ry1 = np.median([r["y1"] for r in row])
            rcy = (ry0 + ry1) / 2
            if abs(cy - rcy) < tol * max(h, ry1 - ry0):
                row.append(b)
                placed = True
                break
        if not placed:
            rows.append([b])
    rows.sort(key=lambda r: np.median([(b["y0"] + b["y1"]) / 2 for b in r]))
    for r in rows:
        r.sort(key=lambda b: b["x0"])
    return rows


def mask_black_bg(a: np.ndarray) -> np.ndarray:
    """Glowing effects painted on black: alpha follows brightness."""
    return a[..., :3].max(axis=2) > 28


def detect_frames(mask: np.ndarray, min_area: int = 1500):
    """Frame boxes for generated sheets, as rows of (x0, y0, x1, y1) in reading order."""
    blobs = find_blobs(mask, link=4, min_area=min_area, attach_radius=60)
    rows = []
    for row in group_rows(blobs):
        boxes = [[b["x0"], b["y0"], b["x1"], b["y1"]] for b in row]
        areas = [(x1 - x0) * (y1 - y0) for x0, y0, x1, y1 in boxes]
        cut = 0.25 * float(np.median(areas))
        big = [b for b, a in zip(boxes, areas) if a >= cut]
        # Projectiles, wisps and debris drawn apart from the body belong to the nearest frame.
        for b, a in zip(boxes, areas):
            if a >= cut or not big:
                continue
            cx = (b[0] + b[2]) / 2
            t = min(big, key=lambda o: max(o[0] - cx, 0, cx - o[2]))
            t[0], t[1], t[2], t[3] = min(t[0], b[0]), min(t[1], b[1]), max(t[2], b[2]), max(t[3], b[3])
        def inside(a, o):
            ix = max(0, min(a[2], o[2]) - max(a[0], o[0]))
            iy = max(0, min(a[3], o[3]) - max(a[1], o[1]))
            return ix * iy > 0.6 * (a[2] - a[0]) * (a[3] - a[1])

        big = [b for b in big if not any(o is not b and inside(b, o) for o in big)]
        rows.append([tuple(b) for b in big])
    return rows
