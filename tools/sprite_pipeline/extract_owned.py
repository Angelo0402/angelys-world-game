"""Ownership extraction for boss sheets (Angelo catch 2026-10-22: zone cuts
leave neighbor FX bleed in the corners). Every alpha component is assigned
to exactly ONE pose: the pose whose BODY (largest component with centroid
in the pose zone) is nearest by bbox distance (max 100px raw). Components
with no owner within range are dropped as strays.
Usage: extract_owned.py <raw.png> -> returns figs via pickle to stdout path arg2
"""
import numpy as np, pickle, sys
from PIL import Image
from scipy import ndimage

def bbox_dist(b1, b2):
    dx = max(b2[0]-b1[1], b1[0]-b2[1], 0)
    dy = max(b2[2]-b1[3], b1[2]-b2[3], 0)
    return float(np.hypot(dx, dy))

def extract(raw):
    m = raw[:, :, 3] >= 110
    lab, n = ndimage.label(m)
    H, W = raw.shape[:2]
    comps = {}
    for cid in range(1, n+1):
        ys, xs = np.where(lab == cid)
        if len(xs) < 150: continue
        comps[cid] = (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()),
                      float(xs.mean()), float(ys.mean()), len(xs))
    bodies = {}
    for zi in range(16):
        zx0, zx1 = (zi % 4)*(W//4), ((zi % 4)+1)*(W//4)
        zy0, zy1 = (zi//4)*(H//4), ((zi//4)+1)*(H//4)
        cand = [(cid, c) for cid, c in comps.items() if zx0 <= c[4] < zx1 and zy0 <= c[5] < zy1]
        if cand: bodies[zi] = max(cand, key=lambda kv: kv[1][6])[0]
    body_set = set(bodies.values())
    owned = {zi: [bodies[zi]] for zi in bodies}
    dropped = 0
    for cid, c in comps.items():
        if cid in body_set: continue
        best, bd = None, 1e9
        for zi, bcid in bodies.items():
            d = bbox_dist(c[:4], comps[bcid][:4])
            if d < bd: bd, best = d, zi
        if best is not None and bd <= 100: owned[best].append(cid)
        else: dropped += 1
    figs = []
    for zi in range(16):
        keep = ndimage.binary_dilation(np.isin(lab, owned.get(zi, [])), iterations=1)
        fig = raw.copy(); fig[:, :, 3] = np.where(keep, fig[:, :, 3], 0)
        a = fig[:, :, 3] >= 24
        ys, xs = np.where(a)
        figs.append(fig[ys.min():ys.max()+1, xs.min():xs.max()+1])
    return figs, dropped

if __name__ == '__main__':
    raw = np.array(Image.open(sys.argv[1]).convert('RGBA'))
    figs, dropped = extract(raw)
    with open(sys.argv[2], 'wb') as fh: pickle.dump(figs, fh)
    print(f'{sys.argv[1]}: {len(figs)} poses, dropped strays={dropped}')
