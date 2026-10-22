#!/usr/bin/env python3
"""Reskin pipeline v2: specs, watershed segmentation, masked rebuild."""
import json, re, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

REPO = '/home/hatch/workspace/angelys-world-game'
WORK = REPO + '/art/staging/reskin'

def load_spec(key):
    src = open(REPO + '/src/assets/sprites.gen.ts').read()
    i = src.index('"%s": {' % key)
    depth = 0; j = i
    while True:
        c = src[j]
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: break
        j += 1
    block = src[i:j+1]
    fw = int(re.search(r'"frameWidth":\s*(\d+)', block).group(1))
    fh = int(re.search(r'"frameHeight":\s*(\d+)', block).group(1))
    ox = float(re.search(r'"originX":\s*([\d.]+)', block).group(1))
    oy = float(re.search(r'"originY":\s*([\d.]+)', block).group(1))
    anims = {}
    for m in re.finditer(r'"(\w+)":\s*\{\s*"start":\s*(\d+),\s*"end":\s*(\d+)', block):
        anims[m.group(1)] = (int(m.group(2)), int(m.group(3)))
    cur = Image.open(f'{REPO}/public/assets/runtime/{key}.webp')
    return dict(fw=fw, fh=fh, ox=ox, oy=oy, anims=anims,
                cols=cur.width // fw, rows=cur.height // fh,
                W=cur.width, H=cur.height)

def _flood_watershed(cost, markers, mask):
    """Priority-flood watershed: grow marker labels over mask pixels,
    cheapest cost first (heap). Returns int32 label image."""
    import heapq
    labels = np.zeros(cost.shape, dtype=np.int32)
    heap = []
    ys, xs = np.where(markers > 0)
    for y, x in zip(ys, xs):
        labels[y, x] = markers[y, x]
        heapq.heappush(heap, (int(cost[y, x]), int(y), int(x)))
    H, W = cost.shape
    while heap:
        _, y, x = heapq.heappop(heap)
        lb = labels[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and labels[ny, nx] == 0:
                labels[ny, nx] = lb
                heapq.heappush(heap, (int(cost[ny, nx]), ny, nx))
    return labels

def _split_blob(mask):
    """Split one connected blob into poses via distance-transform watershed.
    Returns list of boolean masks (same shape as input)."""
    h = mask.shape[0]
    if h <= 300:
        return [mask]
    dist = ndimage.distance_transform_edt(mask)
    mx = ndimage.maximum_filter(dist, size=45)
    peaks = (dist == mx) & (dist > 20)
    plab, pn = ndimage.label(peaks)
    if pn <= 1:
        return [mask]
    # peak centroids; merge peaks closer than 70px keeping the stronger
    cents = ndimage.center_of_mass(peaks, plab, range(1, pn + 1))
    strengths = ndimage.maximum(dist, plab, range(1, pn + 1))
    order = np.argsort(-np.asarray(strengths))
    keep = []
    for oi in order:
        cy, cx = cents[oi]
        if all((cy - ky) ** 2 + (cx - kx) ** 2 > 70 ** 2 for ky, kx in keep):
            keep.append((cy, cx))
    if len(keep) <= 1:
        return [mask]
    markers = np.zeros(mask.shape, dtype=np.int32)
    for i, (cy, cx) in enumerate(keep, start=1):
        markers[int(round(cy)), int(round(cx))] = i
    cost = (dist.max() - dist).astype(np.int32)
    ws = _flood_watershed(cost, markers, mask)
    out = []
    for i in range(1, len(keep) + 1):
        region = (ws == i) & mask
        if region.sum() > 800:
            out.append(region)
    return out if out else [mask]

def segment(imgpath, key):
    im = Image.open(imgpath).convert('RGB')
    a = np.asarray(im).astype(int)
    mask = a.sum(axis=2) > 60
    lab, n = ndimage.label(mask)
    labels = np.zeros(mask.shape, dtype=np.uint16)
    comps = []
    cid = 0
    for idx, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sl is None: continue
        hh = sl[0].stop - sl[0].start; ww = sl[1].stop - sl[1].start
        blob = (lab[sl] == idx)
        if not (hh > 60 and ww > 30 and blob.sum() > 3000):
            continue
        for region in _split_blob(blob):
            ys, xs = np.where(region)
            if len(ys) < 800: continue
            cid += 1
            gy, gx = sl[0].start + ys, sl[1].start + xs
            labels[gy, gx] = cid
            comps.append(dict(id=cid, x=int(gx.min()), y=int(gy.min()),
                              w=int(gx.max() - gx.min() + 1), h=int(gy.max() - gy.min() + 1),
                              area=int(len(ys))))
    comps.sort(key=lambda c: (round(c['y'] / 100), c['x']))
    json.dump(comps, open(f'{WORK}/{key}_comps.json', 'w'))
    Image.fromarray(labels).save(f'{WORK}/{key}_labels.png')
    if comps:
        cell_w, cell_h = 150, 175
        cols = min(11, len(comps))
        rows = (len(comps) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * cell_w, rows * cell_h), (35, 35, 35))
        d = ImageDraw.Draw(sheet)
        for i, c in enumerate(comps):
            crop = im.crop((c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h']))
            cm = (labels[c['y']:c['y'] + c['h'], c['x']:c['x'] + c['w']] == c['id'])
            bg = Image.new('RGB', crop.size, (35, 35, 35))
            crop = Image.composite(crop, bg, Image.fromarray((cm * 255).astype(np.uint8)))
            s = min((cell_w - 8) / crop.width, (cell_h - 24) / crop.height)
            crop = crop.resize((max(1, int(crop.width * s)), max(1, int(crop.height * s))))
            px, py = (i % cols) * cell_w + 4, (i // cols) * cell_h + 20
            sheet.paste(crop, (px, py))
            d.text(((i % cols) * cell_w + 6, (i // cols) * cell_h + 5), '#%d' % i, fill=(255, 255, 0))
        sheet.save(f'{WORK}/{key}_numbered.png')
    print(f'{key}: {im.size} -> {len(comps)} components')
    return comps

def key_contour(img):
    a = np.asarray(img).astype(np.float32)
    mx = a.max(axis=2)
    dark = mx < 30
    lab, n = ndimage.label(dark)
    border = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border)) if border else np.zeros_like(dark)
    fg = ~bg
    alpha = ndimage.gaussian_filter(fg.astype(np.float32), 0.8)
    alpha = np.clip(alpha * 1.6, 0, 1)
    out = np.zeros((a.shape[0], a.shape[1], 4), dtype=np.float32)
    out[..., 0] = a[..., 0]; out[..., 1] = a[..., 1]; out[..., 2] = a[..., 2]
    out[..., 3] = alpha * 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

def rebuild(key, genpath, mapping, anchor='feet'):
    spec = load_spec(key)
    comps = json.load(open(f'{WORK}/{key}_comps.json'))
    labels = np.asarray(Image.open(f'{WORK}/{key}_labels.png'))
    src = Image.open(genpath).convert('RGB')
    src_a = np.asarray(src)
    sheet = Image.new('RGBA', (spec['W'], spec['H']), (0, 0, 0, 0))
    maxw, maxh = spec['fw'] - 13, spec['fh'] - 11
    for slot, ci in mapping.items():
        c = comps[ci]
        region = (labels[c['y']:c['y'] + c['h'], c['x']:c['x'] + c['w']] == c['id'])
        crop_a = np.where(region[..., None], src_a[c['y']:c['y'] + c['h'], c['x']:c['x'] + c['w']], 0).astype(np.uint8)
        rgba = key_contour(Image.fromarray(crop_a))
        # hard-limit alpha to the (softened) region so neighbours never leak in
        ra = ndimage.gaussian_filter(region.astype(np.float32), 0.8)
        arr = np.asarray(rgba).astype(np.float32)
        arr[..., 3] = np.minimum(arr[..., 3], np.clip(ra * 1.6, 0, 1) * 255)
        rgba = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        s = min(maxw / rgba.width, maxh / rgba.height)
        nw, nh = max(1, int(rgba.width * s)), max(1, int(rgba.height * s))
        rgba = rgba.resize((nw, nh), Image.LANCZOS)
        cx, cy = (slot % spec['cols']) * spec['fw'], (slot // spec['cols']) * spec['fh']
        if anchor == 'center':
            px = cx + spec['fw'] // 2 - nw // 2
            py = cy + spec['fh'] // 2 - nh // 2
        else:
            px = cx + int(spec['ox'] * spec['fw']) - nw // 2
            py = cy + int(spec['oy'] * spec['fh']) - nh
        sheet.alpha_composite(rgba, (px, py))
    out = f'{REPO}/public/assets/runtime/{key}.webp'
    sheet.save(out, lossless=True)
    chk = Image.new('RGB', sheet.size, (95, 95, 115))
    chk.paste(sheet, (0, 0), sheet)
    chk.thumbnail((1600, 1600))
    chk.save(f'{WORK}/{key}_rebuilt_check.png')
    print(f'{key}: rebuilt {sheet.size} -> {out}')

def rebuild_bands(key, genpath, bands, anchor='feet'):
    """bands: dict slot(int) -> (x0, x1) vertical band of the source image."""
    spec = load_spec(key)
    src = Image.open(genpath).convert('RGB')
    sheet = Image.new('RGBA', (spec['W'], spec['H']), (0, 0, 0, 0))
    maxw, maxh = spec['fw'] - 13, spec['fh'] - 11
    for slot, (x0, x1) in bands.items():
        crop = src.crop((x0, 0, x1, src.height))
        rgba = key_contour(crop)
        s = min(maxw / rgba.width, maxh / rgba.height)
        nw, nh = max(1, int(rgba.width * s)), max(1, int(rgba.height * s))
        rgba = rgba.resize((nw, nh), Image.LANCZOS)
        cx, cy = (slot % spec['cols']) * spec['fw'], (slot // spec['cols']) * spec['fh']
        if anchor == 'center':
            px = cx + spec['fw'] // 2 - nw // 2
            py = cy + spec['fh'] // 2 - nh // 2
        else:
            px = cx + int(spec['ox'] * spec['fw']) - nw // 2
            py = cy + int(spec['oy'] * spec['fh']) - nh
        sheet.alpha_composite(rgba, (px, py))
    out = f'{REPO}/public/assets/runtime/{key}.webp'
    sheet.save(out, lossless=True)
    chk = Image.new('RGB', sheet.size, (95, 95, 115))
    chk.paste(sheet, (0, 0), sheet)
    chk.thumbnail((1600, 1600))
    chk.save(f'{WORK}/{key}_rebuilt_check.png')
    print(f'{key}: rebuilt (bands) {sheet.size} -> {out}')

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'spec':
        print(json.dumps(load_spec(sys.argv[2]), indent=1))
    elif cmd == 'segment':
        segment(sys.argv[2], sys.argv[3])
    elif cmd == 'rebuild':
        key = sys.argv[2]
        mapping = {int(k): v for k, v in json.load(open(sys.argv[4])).items()}
        anchor = sys.argv[5] if len(sys.argv) > 5 else 'feet'
        rebuild(key, sys.argv[3], mapping, anchor)
    elif cmd == 'rebuild_bands':
        key = sys.argv[2]
        bands = {int(k): tuple(v) for k, v in json.load(open(sys.argv[4])).items()}
        anchor = sys.argv[5] if len(sys.argv) > 5 else 'feet'
        rebuild_bands(key, sys.argv[3], bands, anchor)
