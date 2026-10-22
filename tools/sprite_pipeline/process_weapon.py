"""Weapon-sheet processor: valley cuts + main component, optional fragment attach.
Usage: process_weapon.py <raw> <per_row> <cell_w> <cell_h> <bot> <cx> <target_h> <cap_w> <cap_h> <out_npy> <out_strip> [--main-only]
"""
import numpy as np, sys
from PIL import Image
from scipy import ndimage

args = [a for a in sys.argv[1:] if not a.startswith('--')]
MAIN_ONLY = '--main-only' in sys.argv
raw_path, per_row, CELL_W, CELL_H, BOT, CX, TARGET_H, CAP_W, CAP_H, out_npy, out_strip = args[:11]
per_row, CELL_W, CELL_H, BOT, CX, TARGET_H, CAP_W, CAP_H = int(per_row), int(CELL_W), int(CELL_H), int(BOT), int(CX), float(TARGET_H), int(CAP_W), int(CAP_H)
im = Image.open(raw_path).convert('RGBA')
a = np.array(im).astype(np.int32)
H, W = a.shape[:2]
alpha = a[:, :, 3]
rowmass = (alpha >= 110).sum(axis=1)
lo, hi = int(H*0.35), int(H*0.65)
valley = lo + int(np.argmin(rowmass[lo:hi]))
bands = [(0, valley), (valley, H)]
print('row split:', valley, 'of', H)

def figures_in_band(y0, y1):
    band = alpha[y0:y1] >= 120
    colmass = band.sum(axis=0).astype(float)
    sm = np.convolve(colmass, np.ones(31)/31, mode='same')
    cuts = [0]
    for k in range(1, per_row):
        exp = int(k * W / per_row)
        lo2, hi2 = max(1, exp-70), min(W-1, exp+70)
        cuts.append(lo2 + int(np.argmin(sm[lo2:hi2])))
    cuts.append(W)
    return [(cuts[i], cuts[i+1]) for i in range(per_row)]

def extract(y0, y1, x0, x1):
    crop = a[y0:y1, x0:x1].copy()
    m = crop[:, :, 3] >= 110
    lab, n = ndimage.label(m)
    if n == 0: return None
    sizes = ndimage.sum(m, lab, range(1, n+1))
    main = int(np.argmax(sizes)) + 1
    keep = lab == main
    if not MAIN_ONLY:
        mys, mxs = np.where(lab == main)
        dil = 14
        bb = (max(0, mys.min()-dil), min(m.shape[0], mys.max()+dil), max(0, mxs.min()-dil), min(m.shape[1], mxs.max()+dil))
        for i, s in enumerate(sizes, start=1):
            if i != main and s >= 0.012 * sizes[main-1]:
                ys, xs = np.where(lab == i)
                if ys.max() >= bb[0] and ys.min() <= bb[1] and xs.max() >= bb[2] and xs.min() <= bb[3]:
                    keep |= lab == i
    keep = ndimage.binary_dilation(keep, iterations=1)
    crop[:, :, 3] = np.where(keep, crop[:, :, 3], 0)
    ys, xs = np.where(keep)
    return crop[ys.min():ys.max()+1, xs.min():xs.max()+1]

figs = []
for (y0, y1) in bands:
    for (x0, x1) in figures_in_band(y0, y1):
        f = extract(y0, y1, x0, x1)
        if f is not None: figs.append(f)
print('figures:', len(figs))
heights = [f.shape[0] for f in figs]
med = float(np.median(heights))
print('heights:', heights, 'median:', med)
placed = []
for f in figs:
    scale = TARGET_H / med
    w = int(round(f.shape[1] * scale)); h = int(round(f.shape[0] * scale))
    if w > CAP_W: scale *= CAP_W / w; w = CAP_W; h = int(round(f.shape[0] * scale))
    if h > CAP_H: scale *= CAP_H / h; h = int(round(f.shape[0] * scale)); w = int(round(f.shape[1] * scale))
    img = Image.fromarray(f.astype(np.uint8)).resize((w, h), Image.LANCZOS)
    arr = np.array(img).astype(np.int32)
    m = arr[:, :, 3] >= 24
    band = m[int(h*0.7):, :]
    xs = np.where(band.any(axis=0))[0]
    feet_cx = (xs.min() + xs.max()) / 2 if len(xs) else w / 2
    cell_img = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    src = arr.copy(); src[:, :, 3] = np.where(m, src[:, :, 3], 0)
    cell_img.alpha_composite(Image.fromarray(src.astype(np.uint8)), (int(round(CX - feet_cx)), BOT - h))
    placed.append(np.array(cell_img))
np.save(out_npy, np.stack(placed))
sw = min(240, CELL_W)
sh = int(CELL_H * sw / CELL_W)
strip = Image.new('RGBA', (sw*len(placed), sh), (30, 30, 40, 255))
for i, c in enumerate(placed):
    strip.alpha_composite(Image.fromarray(c).resize((sw, sh)), (i*sw, 0))
strip.save(out_strip)
print('saved', out_npy, out_strip)
