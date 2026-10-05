"""Print row bands and empty-column gaps for an atlas (helps author atlas_config regions).

Usage: python3 tools/gaps.py <atlas-key>
"""
import sys

import numpy as np

from atlas_config import ATLASES, ROOT
from inspect_atlas import build_mask
from segment import load_rgba


def runs(flags):
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(flags)))
    return out


def main():
    key = sys.argv[1]
    cfg = ATLASES[key]
    mask = build_mask(cfg, load_rgba(f"{ROOT}/{cfg['src']}"))
    rowsum = mask.sum(axis=1)
    bands = [b for b in runs(rowsum > 3) if b[1] - b[0] > 25]
    for y0, y1 in bands:
        col = mask[y0:y1].sum(axis=0)
        segs = [s for s in runs(col > 1) if s[1] - s[0] > 6]
        print(f"band y{y0}-{y1}:", " ".join(f"{a}-{b}" for a, b in segs))


if __name__ == "__main__":
    main()
