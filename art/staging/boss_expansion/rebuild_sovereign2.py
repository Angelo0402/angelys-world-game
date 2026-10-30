"""Rebuild sovereign2 sheet with new ChatGPT anims (idle18, walk17, claw32, slam16)
+ old anims kept verbatim, all inside one 4096px-safe sheet.

Geometry: assemble at 394x300 cells (old geometry: feet at y=288 = 96%,
center x=189 = 48%), then downscale 0.8x to 315x240 cells so the full
163-cell sheet fits 3780x3360 (< 4096 both dims). Def h values scale x0.8
to match, so scaleForHeight keeps the same on-screen size.
"""
import shutil
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parent
GAME = BASE.parents[2]
OLD_SHEET = GAME / "public/assets/runtime/sovereign2.webp"
BACKUP = BASE / "sovereign2_old_backup.webp"

CELL_W, CELL_H = 394, 300
FEET_Y, CENTER_X = 288, 189
COLS, ROWS = 12, 14

# (strip file, old anim h target, keep-mode)
NEW_ANIMS = [
    ("chatgpt_sov_idle16.png", 254, "body"),   # 18 frames (asked 16)
    ("chatgpt_sov_walk15.png", 242, "body"),   # 17 frames (asked 15)
    ("chatgpt_sov_claw34.png", 220, "near"),   # 32 frames (asked ~34)
    ("chatgpt_sov_slam16.png", 239, "body"),   # 16 frames
]
# old anim -> (old start, old end) in the 8-col 394x300 sheet
OLD_ANIMS = [
    ("shoot", 20, 23), ("summon", 24, 27), ("charge", 28, 31),
    ("erupt", 32, 35), ("hurt", 36, 39), ("stagger", 40, 43),
    ("enrage", 44, 47), ("dead", 48, 51), ("rise", 52, 55),
    ("roar", 56, 59), ("beam", 60, 63), ("taunt", 64, 67),
    ("vanish", 68, 71), ("appear", 72, 75), ("fan", 76, 79),
    ("shield", 80, 83), ("leap", 84, 87), ("weak", 88, 91),
    ("laugh", 92, 95), ("meteor", 96, 99),
]


def label_components(mask):
    """BFS labeling on a boolean 2D array. Returns list of boolean masks."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                q = deque([(y, x)])
                seen[y, x] = True
                pts = []
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                comp = np.zeros_like(mask, dtype=bool)
                for cy, cx in pts:
                    comp[cy, cx] = True
                comps.append(comp)
    return comps


def segment_strip(src):
    """Gap segmentation (same as the GIF pipeline). Returns list of
    (rgb crop, bool mask) tight figure crops."""
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(int)
    H, W, _ = a.shape
    fig = ~(a.sum(axis=2) < 40)
    colmass = fig.sum(axis=0)
    is_gap = colmass < 50
    spans, x = [], 0
    while x < W:
        if is_gap[x]:
            x += 1
            continue
        x0 = x
        while x < W and not is_gap[x]:
            x += 1
        if int(colmass[x0:x].sum()) > 3000:
            spans.append((x0, x - 1))
    frames = []
    for x0, x1 in spans:
        if x1 - x0 + 1 > 450:
            mid = slice((x1 - x0) // 3, 2 * (x1 - x0) // 3)
            vx = x0 + mid.start + int(np.argmin(colmass[mid]))
            frames.append((x0, vx - 1))
            frames.append((vx, x1))
        else:
            frames.append((x0, x1))
    frames.sort()
    out = []
    for x0, x1 in frames:
        sub = fig[:, x0:x1 + 1]
        ys = np.where(sub.any(axis=1))[0]
        y0, y1 = ys.min(), ys.max()
        out.append((np.array(im.crop((x0, y0, x1 + 1, y1 + 1))),
                    sub[y0:y1 + 1, :].copy()))
    print(f"{src}: {W}x{H} -> {len(out)} figures")
    return out


def clean_figure(rgb, mask, mode, label):
    """Erase ONLY tiny specks (<50px). Larger detached pieces are cape folds
    split by the dark threshold (verified visually 2026-10-24: walk f7/f16,
    slam f2/f4 cape fragments) and must be kept, or the cape gets trimmed.
    near mode additionally keeps trail pieces within 8px of the body."""
    comps = label_components(mask)
    if len(comps) <= 1:
        return rgb, mask, []
    comps.sort(key=lambda c: int(c.sum()), reverse=True)
    keep = comps[0]
    erased = []
    if mode == "near":
        ys, xs = np.where(keep)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        for c in comps[1:]:
            ys2, xs2 = np.where(c)
            gap = max(y0 - ys2.max(), ys2.min() - y1, x0 - xs2.max(), xs2.min() - x1)
            if gap <= 8 or int(c.sum()) >= 50:
                keep = keep | c
            else:
                erased.append((label, int(c.sum())))
    else:
        for c in comps[1:]:
            if int(c.sum()) >= 50:
                keep = keep | c
            else:
                erased.append((label, int(c.sum())))
    rgb2 = rgb.copy()
    rgb2[~keep] = 0
    return rgb2, keep, erased


def place_cell(rgb, mask, target_h):
    """Scale figure so its height = target_h, feet at FEET_Y, center at CENTER_X."""
    h, w = rgb.shape[:2]
    s = target_h / h
    nw, nh = max(1, int(round(w * s))), max(1, int(round(h * s)))
    rgb_s = np.array(Image.fromarray(rgb).resize((nw, nh), Image.LANCZOS))
    mask_s = np.array(Image.fromarray((mask * 255).astype(np.uint8))
                      .resize((nw, nh), Image.NEAREST)) > 0
    cell = np.zeros((CELL_H, CELL_W, 3), dtype=np.uint8)
    ox = CENTER_X - nw // 2
    oy = FEET_Y - nh
    cell[oy:oy + nh, ox:ox + nw][mask_s] = rgb_s[mask_s]
    return cell


def main():
    shutil.copy2(OLD_SHEET, BACKUP)
    print(f"backup -> {BACKUP}")
    old = Image.open(OLD_SHEET).convert("RGB")
    old_a = np.asarray(old)
    assert old.size == (3152, 3900), f"unexpected old sheet size {old.size}"
    print(f"old sheet {old.size}")

    cells = []  # (name, cell image array)
    erasure_report = []
    for fname, target_h, mode in NEW_ANIMS:
        name = fname.split("_")[2].split(".")[0]  # idle16/walk15/claw34/slam16
        figs = segment_strip(BASE / fname)
        # uniform scale per anim: tallest figure -> target_h
        max_h = max(rgb.shape[0] for rgb, _ in figs)
        scale = target_h / max_h
        print(f"  {name}: {len(figs)} figs, max native h {max_h}, scale {scale:.3f}")
        for i, (rgb, mask) in enumerate(figs):
            rgb_c, mask_c, erased = clean_figure(rgb, mask, mode, f"{name} f{i+1}")
            erasure_report.extend(erased)
            cells.append((name, place_cell(rgb_c, mask_c, int(round(rgb_c.shape[0] * scale)))))
    for name, s, e in OLD_ANIMS:
        for idx in range(s, e + 1):
            cx, cy = (idx % 8) * CELL_W, (idx // 8) * CELL_H
            cells.append((name, old_a[cy:cy + CELL_H, cx:cx + CELL_W].copy()))
    print(f"total cells: {len(cells)} (capacity {COLS*ROWS})")
    assert len(cells) <= COLS * ROWS

    assembly = np.zeros((ROWS * CELL_H, COLS * CELL_W, 3), dtype=np.uint8)
    for i, (_, cell) in enumerate(cells):
        x, y = (i % COLS) * CELL_W, (i // COLS) * CELL_H
        assembly[y:y + CELL_H, x:x + CELL_W] = cell
    sheet = Image.fromarray(assembly).resize((COLS * 315, ROWS * 240), Image.LANCZOS)
    sheet.save(OLD_SHEET, lossless=True)
    print(f"new sheet {sheet.size} -> {OLD_SHEET} ({OLD_SHEET.stat().st_size} bytes)")

    print("ERASURES (frame, detached px):")
    for f, px in erasure_report:
        print(f"  {f}: {px}px")
    if not erasure_report:
        print("  none")

    # numbered contact sheet of the final sheet (small) for visual QA
    cw, ch = 200, 155
    contact = Image.new("RGB", (COLS * cw, ROWS * ch), (20, 20, 20))
    d = ImageDraw.Draw(contact)
    small = sheet.resize((COLS * cw, ROWS * ch), Image.LANCZOS)
    contact.paste(small, (0, 0))
    for i in range(len(cells)):
        x, y = (i % COLS) * cw, (i // COLS) * ch
        d.text((x + 4, y + 3), str(i), fill=(255, 255, 0))
    contact.save(BASE / "sovereign2_new_contact.png")
    print(f"contact -> {BASE / 'sovereign2_new_contact.png'}")


if __name__ == "__main__":
    main()
