import sys
import numpy as np
from PIL import Image
from scipy import ndimage

WEAPONS = {
    'bow':       dict(frame=(224, 222), origin=(0.3886, 0.982),  slots=5),
    'boomerang': dict(frame=(220, 224), origin=(0.5699, 0.9821), slots=5),
    'wand':      dict(frame=(249, 293), origin=(0.3564, 0.9863), slots=5),
    'hammer':    dict(frame=(241, 285), origin=(0.6999, 0.986),  slots=5),
    'ray':       dict(frame=(243, 251), origin=(0.475, 0.9841),  slots=6),
}

def defringe(img):
    a = np.asarray(img).astype(np.float32)
    alpha = a[..., 3]
    solid = alpha >= 200
    if not solid.any():
        return img
    near = ndimage.binary_dilation(solid, iterations=2) & (alpha >= 16) & ~solid
    if near.any():
        _, inds = ndimage.distance_transform_edt(~solid, return_indices=True)
        out = a.copy()
        out[near] = a[tuple(inds[:, near])]
        return Image.fromarray(out.astype(np.uint8), 'RGBA')
    return img

def process(name):
    cfg = WEAPONS[name]
    FW, FH = cfg['frame']
    OX, OY = int(cfg['origin'][0] * FW), int(cfg['origin'][1] * FH)
    raw = Image.open(f'art/staging/chatgpt_take/{name}_raw.png').convert('RGBA')
    a = np.asarray(raw)
    H, W = a.shape[:2]
    present = a[..., 3] >= 24
    proj = ndimage.gaussian_filter1d(present.sum(axis=0).astype(float), 3)
    n = cfg['slots']
    cuts = [0]
    for i in range(n - 1):
        mid = int((i + 1) * W / n)
        lo, hi = max(0, mid - 70), min(W, mid + 70)
        cuts.append(lo + int(np.argmin(proj[lo:hi])))
    cuts.append(W)
    poses = []
    for idx in range(n):
        sx0, sx1 = cuts[idx], cuts[idx + 1]
        sub_a = a[:, sx0:sx1]
        mask = sub_a[..., 3] >= 24
        lab, nc = ndimage.label(mask)
        if nc == 0:
            poses.append(None); continue
        sizes = ndimage.sum(mask, lab, range(1, nc + 1))
        main = int(np.argmax(sizes)) + 1
        my, mx = ndimage.center_of_mass(mask, lab, main)
        keep = np.zeros_like(mask)
        objs = ndimage.find_objects(lab)
        for i in range(1, nc + 1):
            if i == main:
                keep |= lab == i
                continue
            sl = objs[i - 1]
            touches_edge = sl[1].start <= 1 or sl[1].stop >= (sx1 - sx0) - 1
            if not touches_edge and sizes[i - 1] >= 0.015 * sizes[main - 1]:
                keep |= lab == i
        out = sub_a.copy()
        out[..., 3] = np.where(keep, sub_a[..., 3], 0)
        ys, xs = np.where(keep)
        crop = Image.fromarray(out, 'RGBA').crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
        poses.append(defringe(crop))
    # scale from pose 0 solid content height (standing at rest)
    p0 = np.asarray(poses[0])
    solid0 = p0[..., 3] >= 200
    ys = np.where(solid0.any(axis=1))[0]
    body_h = ys.max() - ys.min() + 1
    scale = 250.0 / body_h
    print(f'{name}: cuts {cuts} body_ref {body_h}px scale {scale:.3f}')
    sheet = Image.new('RGBA', (FW * n, FH), (0, 0, 0, 0))
    for idx, img in enumerate(poses):
        if img is None: continue
        rs = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
        ra = np.asarray(rs)
        rys, rxs = np.where(ra[..., 3] >= 24)
        bot = ra[rys.max() - int(0.30 * (rys.max() - rys.min())):, :]
        bcols = np.where(bot[..., 3] >= 24)[1]
        anchor_x = (bcols.min() + bcols.max()) / 2 if len(bcols) else (rxs.min() + rxs.max()) / 2
        px = int(round(OX - anchor_x))
        py = int(round(OY - (rys.max() + 1)))
        cell = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        cell.alpha_composite(rs, (px, py))
        sheet.paste(cell, (idx * FW, 0))
    sheet.save(f'public/assets/runtime/angely_{name}.webp', lossless=True)
    chk = Image.new('RGB', sheet.size, (95, 95, 115)); chk.paste(sheet, (0, 0), sheet)
    chk.save(f'art/staging/chatgpt_take/{name}_final_check.png')
    print(f'{name}: sheet built {sheet.size}')

for name in sys.argv[1:]:
    process(name)
