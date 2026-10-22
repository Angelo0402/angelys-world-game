"""Swim-sheet processor: valley cuts + main component + CENTER placement.
Usage: process_swim.py <raw> <per_row> <cell_w> <cell_h> <target_h> <out_npy> <out_strip>
Places each figure's bbox center at the cell center, figure height normalized to target_h.
"""
import numpy as np, sys
from PIL import Image
from scipy import ndimage

raw_path, per_row, CELL_W, CELL_H, TARGET_H, out_npy, out_strip = sys.argv[1:8]
per_row, CELL_W, CELL_H, TARGET_H = int(per_row), int(CELL_W), int(CELL_H), float(TARGET_H)
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
    keep = ndimage.binary_dilation(lab == main, iterations=1)
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
    if w > CELL_W - 4:
        scale *= (CELL_W - 4) / w; w = CELL_W - 4; h = int(round(f.shape[0] * scale))
    img = Image.fromarray(f.astype(np.uint8)).resize((w, h), Image.LANCZOS)
    arr = np.array(img).astype(np.int32)
    m = arr[:, :, 3] >= 24
    src = arr.copy(); src[:, :, 3] = np.where(m, src[:, :, 3], 0)
    cell_img = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell_img.alpha_composite(Image.fromarray(src.astype(np.uint8)), ((CELL_W - w)//2, (CELL_H - h)//2))
    placed.append(np.array(cell_img))
np.save(out_npy, np.stack(placed))
strip = Image.new('RGBA', (CELL_W*len(placed), CELL_H), (30, 30, 40, 255))
for i, c in enumerate(placed):
    strip.alpha_composite(Image.fromarray(c), (i*CELL_W, 0))
strip.save(out_strip)
# distinctness check
def mask_dist(m1, m2):
    return 1 - np.logical_and(m1, m2).sum() / max(1, np.logical_or(m1, m2).sum())
masks = [p[:, :, 3] >= 60 for p in placed]
print('consecutive distances:', [round(float(mask_dist(masks[i], masks[i+1])), 3) for i in range(len(masks)-1)])
print('saved', out_npy, out_strip)
