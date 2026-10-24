#!/usr/bin/env python3
"""Extract the queen's 15 ChatGPT strips into an 88-frame candidate sheet
(394x300 cells, 8 cols) matching sovereign2's geometry. Does NOT touch the
live sovereign2 sheet — swap happens only after Angelo approves the GIFs.

Two extraction routes:
- Voronoi (clean strips): erode -> bodies -> distance-field zones -> largest
  component per zone.
- Slab/valley (FX-heavy strips s06/s08/s09, where thick beams and flame
  bridges merged neighbors and FX clumps posed as bodies): body cores from
  heavier erosion, vertical cuts at column-mass valleys between centers,
  then keep components touching the core's dilated bbox.
Walk strips s03/s04 are pre-scaled to s02's median height (ChatGPT drifted
~7% larger between strips; the loop must not pop)."""
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

STAGE = '/home/hatch/workspace/angelys-world-game/art/staging/veil_queen'
FW, FH, COLS = 394, 300, 8

def chroma(path):
    src = Image.open(path).convert('RGB')
    A = np.asarray(src).astype(int)
    g, r, b = A[:, :, 1], A[:, :, 0], A[:, :, 2]
    alpha = np.where((g > 120) & (g - r > 60) & (g - b > 60), 0, 255).astype(np.uint8)
    return A, alpha

def to_fig(A, mask):
    ys, xs = np.where(mask)
    fa = np.where(mask, 255, 0).astype(np.uint8)
    fig = np.dstack([A.astype(np.uint8), fa])
    return Image.fromarray(fig[ys.min():ys.max() + 1, xs.min():xs.max() + 1])

def extract_voronoi(path, count, erosion=2):
    A, alpha = chroma(path)
    m = alpha > 0
    er = ndimage.binary_erosion(m, iterations=erosion)
    lab, n = ndimage.label(er)
    pieces = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = int((lab[sl] == i).sum())
        if area > 200:
            pieces.append((sl[1].start, i, area))
    pieces.sort(key=lambda t: -t[2])
    bodies = sorted(pieces[:count], key=lambda t: t[0])
    ids = [b[1] for b in bodies]
    assert len(ids) == count, f'{path}: found {len(ids)} bodies, wanted {count}'
    body_mask = np.isin(lab, ids)
    _, inds = ndimage.distance_transform_edt(~body_mask, return_indices=True)
    nearest = lab[inds[0], inds[1]]
    figs = []
    for bid in ids:
        zone = m & (nearest == bid)
        zl, zn = ndimage.label(zone)
        if zn > 1:
            areas = [(i, int((zl == i).sum())) for i in range(1, zn + 1)]
            areas.sort(key=lambda t: -t[1])
            zone = zl == areas[0][0]
        figs.append(to_fig(A, zone))
    return figs

def extract_slab(path, count):
    """Figures are evenly spaced by generation spec: anchor on slab centers,
    cut at column-mass valleys between them, keep the biggest component in
    each range plus whatever touches its dilated bbox (her own FX)."""
    A, alpha = chroma(path)
    m = alpha > 0
    W = m.shape[1]
    slab = W / count
    centers = [(k + 0.5) * slab for k in range(count)]
    colmass = ndimage.uniform_filter1d(m.sum(axis=0).astype(float), size=15)
    cuts = [0]
    for k in range(count - 1):
        lo = int(centers[k] + 0.32 * slab)
        hi = int(centers[k + 1] - 0.32 * slab)
        cuts.append(lo + int(np.argmin(colmass[lo:hi])))
    cuts.append(W)
    # s06's legit FX all touches her (orbs in hands, slam crystals at her
    # feet, the beam) — a tight 6px keep-radius sheds the neighbor's orb,
    # which floats near her hair but never touches it. FX-heavy s08/s09
    # keep the loose 26px (their shards legitimately float free).
    dilate = 6 if path.endswith('queen_s06.png') else 26
    figs = []
    for k in range(count):
        seg = np.zeros_like(m)
        seg[:, cuts[k]:cuts[k + 1]] = m[:, cuts[k]:cuts[k + 1]]
        zl, zn = ndimage.label(seg)
        areas = sorted(((int((zl == i).sum()), i) for i in range(1, zn + 1)), reverse=True)
        main = areas[0][1]
        ys, xs = np.where(zl == main)
        y0, y1 = ys.min() - dilate, ys.max() + dilate
        x0, x1 = xs.min() - dilate, xs.max() + dilate
        keep = np.zeros_like(m)
        keep[zl == main] = True
        for area, i in areas[1:]:
            if area < 60:
                continue
            ys2, xs2 = np.where(zl == i)
            if xs2.min() <= x1 and xs2.max() >= x0 and ys2.min() <= y1 and ys2.max() >= y0:
                keep[zl == i] = True
        figs.append(to_fig(A, keep))
    # side gates: the previous/next figure's FX can cross the valley into
    # this figure's range and survive at its far left or right, sometimes
    # still faint-bridge-connected to her hair (s06: the neighbor's orb
    # half, the beam tail). Sever with erosion for the ANALYSIS, assign
    # pixels by Voronoi over the eroded cores, and drop cores that sit
    # fully in the outer 30% on either side and are small (<1100px eroded).
    # Her own wide FX is either her main mass or big — it survives.
    gated = []
    for fig in figs:
        fa = np.asarray(fig)[:, :, 3] > 8
        er = ndimage.binary_erosion(fa, iterations=2)
        lab, n = ndimage.label(er)
        if n <= 1:
            gated.append(fig)
            continue
        areas = sorted(((int((lab == i).sum()), i) for i in range(1, n + 1)), reverse=True)
        main = areas[0][1]
        ys, xs = np.where(fa)
        fx0, fx1 = xs.min(), xs.max()
        width = fx1 - fx0 + 1
        doomed = []
        for area, i in areas[1:]:
            if area >= 1100:
                continue
            _, xs2 = np.where(lab == i)
            if xs2.max() < fx0 + 0.30 * width or xs2.min() > fx1 - 0.30 * width:
                doomed.append(i)
        if not doomed:
            gated.append(fig)
            continue
        _, inds = ndimage.distance_transform_edt(~er, return_indices=True)
        owner = lab[inds[0], inds[1]]
        arr = np.asarray(fig).copy()
        arr[fa & np.isin(owner, doomed)] = 0
        gated.append(Image.fromarray(arr))
    return gated

# --- knight baseline (the sheet being replaced) ---
knight = Image.open('/home/hatch/workspace/angelys-world-game/public/assets/runtime/sovereign2.webp').convert('RGBA')
ka = np.asarray(knight.crop((0, 0, FW, FH)))[:, :, 3]
kys, kxs = np.where(ka > 8)
KH = int(kys.max() - kys.min() + 1)
KB = FH - 1 - int(kys.max())
KX = float(kxs.mean())
print(f'knight idle: h={KH} bottom_margin={KB} centroid_x={KX:.1f}')

SLAB = {'queen_s06.png', 'queen_s08.png', 'queen_s09.png'}
PRESCALE = {'queen_s03.png': 0.936, 'queen_s04.png': 0.939}  # walk drift fix
COUNTS = {f'queen_s{i:02d}.png': 6 for i in range(1, 15)}
COUNTS['queen_s15.png'] = 4
strips = {}
for name, cnt in COUNTS.items():
    fn = extract_slab if name in SLAB else extract_voronoi
    strips[name] = fn(f'{STAGE}/{name}', cnt)
    print(name, 'via', fn.__name__, 'figures:', [f.size for f in strips[name]])

def F(strip, idx):
    return strips[strip][idx]

ORDER = (
    [F('queen_s01.png', i) for i in range(6)] +
    [F('queen_s02.png', i) for i in range(6)] +
    [F('queen_s03.png', i) for i in range(6)] +
    [F('queen_s04.png', i) for i in range(6)] +
    [F('queen_s05.png', i) for i in range(4)] +
    [F('queen_s05.png', 4), F('queen_s05.png', 5),
     F('queen_s06.png', 0), F('queen_s06.png', 1)] +
    [F('queen_s06.png', i) for i in range(2, 6)] +
    [F('queen_s07.png', i) for i in range(4)] +
    [F('queen_s07.png', 4), F('queen_s07.png', 5),
     F('queen_s08.png', 0), F('queen_s08.png', 1)] +
    [F('queen_s08.png', i) for i in range(2, 6)] +
    [F('queen_s09.png', i) for i in range(4)] +
    [F('queen_s09.png', 4), F('queen_s09.png', 5),
     F('queen_s10.png', 0), F('queen_s10.png', 1)] +
    [F('queen_s10.png', i) for i in range(2, 6)] +
    [F('queen_s11.png', 0), F('queen_s11.png', 1)] +
    [F('queen_s11.png', i) for i in range(2, 6)] +
    [F('queen_s12.png', 0), F('queen_s12.png', 1)] +
    [F('queen_s12.png', i) for i in range(2, 5)] +
    [F('queen_s12.png', 5), F('queen_s13.png', 0), F('queen_s13.png', 1)] +
    [F('queen_s13.png', i) for i in range(2, 5)] +
    [F('queen_s13.png', 5), F('queen_s14.png', 0), F('queen_s14.png', 1)] +
    [F('queen_s14.png', i) for i in range(2, 5)] +
    [F('queen_s14.png', 5)] + [F('queen_s15.png', i) for i in range(4)]
)
assert len(ORDER) == 88, len(ORDER)
# remember which strip each cell came from (for prescale)
SRC = (
    ['queen_s01.png'] * 6 + ['queen_s02.png'] * 6 + ['queen_s03.png'] * 6 + ['queen_s04.png'] * 6 +
    ['queen_s05.png'] * 4 + ['queen_s05.png'] * 2 + ['queen_s06.png'] * 2 + ['queen_s06.png'] * 4 +
    ['queen_s07.png'] * 4 + ['queen_s07.png'] * 2 + ['queen_s08.png'] * 2 + ['queen_s08.png'] * 4 +
    ['queen_s09.png'] * 4 + ['queen_s09.png'] * 2 + ['queen_s10.png'] * 2 + ['queen_s10.png'] * 4 +
    ['queen_s11.png'] * 2 + ['queen_s11.png'] * 4 + ['queen_s12.png'] * 2 + ['queen_s12.png'] * 3 +
    ['queen_s12.png'] + ['queen_s13.png'] * 2 + ['queen_s13.png'] * 3 + ['queen_s13.png'] + ['queen_s14.png'] * 2 +
    ['queen_s14.png'] * 3 + ['queen_s14.png'] + ['queen_s15.png'] * 4
)
assert len(SRC) == 88, len(SRC)

s = KH / ORDER[0].size[1]
print(f'global scale (idle {ORDER[0].size[1]} -> {KH}): {s:.3f}')
rows = (len(ORDER) + COLS - 1) // COLS
sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
stats = []
for idx, fig in enumerate(ORDER):
    base = s * PRESCALE.get(SRC[idx], 1.0)
    sc = min(base, (FW - 4) / fig.size[0], (FH - 2) / fig.size[1])
    f2 = fig.resize((max(1, round(fig.size[0] * sc)), max(1, round(fig.size[1] * sc))), Image.LANCZOS)
    a = np.asarray(f2)[:, :, 3]
    ys, xs = np.where(a > 8)
    cx = float(xs.mean())
    x = int(round(KX - cx))
    x = max(0, min(FW - f2.size[0], x))
    y = FH - KB - f2.size[1]
    cell = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    cell.paste(f2, (x, y), f2)
    r, c = divmod(idx, COLS)
    sheet.paste(cell, (c * FW, r * FH))
    stats.append({'cell': idx, 'w': int(xs.max() - xs.min() + 1), 'h': int(ys.max() - ys.min() + 1),
                  'shrunk': round(sc / base, 3)})

# --- fragment REPORT only (no blind deletion — a global solid-core rule
# amputated leaning figures on 2026-10-23; fragments are judged per cell
# from this report + the montage, then removed surgically). ---
sa0 = np.asarray(sheet)[:, :, 3]
report = []
for idx in range(88):
    r, c = divmod(idx, COLS)
    cell_a = sa0[r * FH:(r + 1) * FH, c * FW:(c + 1) * FW] > 8
    lab, n = ndimage.label(cell_a)
    if n <= 1:
        continue
    areas = sorted(((int((lab == i).sum()), i) for i in range(1, n + 1)), reverse=True)
    main_area = areas[0][0]
    for area, i in areas[1:]:
        if 100 <= area < 0.30 * main_area:
            ys, xs = np.where(lab == i)
            report.append({'cell': idx, 'area': area,
                           'cx': round(float(xs.mean()), 1), 'cy': round(float(ys.mean()), 1),
                           'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]})
print('detached fragments (100px..30% of main):', len(report))
for rep in report:
    print('  ', rep)
with open(f'{STAGE}/queen_fragments.json', 'w') as fh:
    json.dump(report, fh, indent=1)

# --- manual erasures, verified by eye on native-res crops (2026-10-23):
# two neighbor FX remnants that survived every automatic rule, each
# bridge-connected to her hair by a few faint pixels. Rectangles measured
# on the placed cells; her own silhouette starts right of both.
MANUAL_ERASE = {34: (100, 92, 137, 158),   # neighbor's orb chunk at her back
                35: (92, 95, 162, 140)}    # neighbor's beam tail at her back
arr = np.asarray(sheet).copy()
for idx, (ex0, ey0, ex1, ey1) in MANUAL_ERASE.items():
    r, c = divmod(idx, COLS)
    arr[r * FH + ey0:r * FH + ey1, c * FW + ex0:c * FW + ex1] = 0
sheet = Image.fromarray(arr)
print('manual erasures applied:', list(MANUAL_ERASE))

sheet.save(f'{STAGE}/sovereign_queen_candidate.webp', lossless=True)
print('candidate sheet:', sheet.size)

sa = np.asarray(sheet)[:, :, 3]
multi = []
for idx in range(88):
    r, c = divmod(idx, COLS)
    cell = sa[r * FH:(r + 1) * FH, c * FW:(c + 1) * FW] > 8
    lab, n = ndimage.label(cell)
    big = sum(1 for i in range(1, n + 1) if int((lab == i).sum()) >= 25)
    if big != 1:
        multi.append((idx, big))
print('cells with != 1 piece (>=25px):', multi)
print('shrunk figures (ratio < 1):', [(st['cell'], st['shrunk']) for st in stats if st['shrunk'] < 0.999])

for half in range(2):
    rows_h = rows // 2 + (rows % 2 if half == 0 else 0)
    r0 = 0 if half == 0 else rows_h
    r1 = rows_h if half == 0 else rows
    crop = sheet.crop((0, r0 * FH, FW * COLS, r1 * FH)).resize((FW * COLS // 2, (r1 - r0) * FH // 2))
    bg = Image.new('RGBA', crop.size, (24, 16, 40, 255))
    bg.alpha_composite(crop)
    d = ImageDraw.Draw(bg)
    for idx in range(r0 * COLS, min(88, r1 * COLS)):
        rr, cc = divmod(idx, COLS)
        d.text((cc * FW // 2 + 4, (rr - r0) * FH // 2 + 4), str(idx), fill=(255, 255, 0, 255))
    bg.convert('RGB').save(f'{STAGE}/queen_contact_{half + 1}.png')

# zoom crops of the six repaired cells for close review
zoom = Image.new('RGBA', (FW * 3, FH * 2), (24, 16, 40, 255))
for j, idx in enumerate([31, 34, 44, 45, 48, 53]):
    r, c = divmod(idx, COLS)
    cell = sheet.crop((c * FW, r * FH, (c + 1) * FW, (r + 1) * FH))
    zoom.alpha_composite(cell, ((j % 3) * FW, (j // 3) * FH))
zoom.convert('RGB').save(f'{STAGE}/queen_fixed_cells.png')
print('zoom saved')

with open(f'{STAGE}/queen_cells.json', 'w') as fh:
    json.dump(stats, fh, indent=1)
print('DONE')
