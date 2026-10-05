"""Draw numbered blob boxes over an atlas so frames can be mapped in atlas_config.py.

Usage: python3 tools/inspect_atlas.py <atlas-key> [out.png]
"""
import sys

from PIL import Image, ImageDraw

from atlas_config import ATLASES, ROOT
from segment import find_blobs, group_rows, load_rgba, mask_alpha, mask_flat_bg, mask_gradient


def build_mask(cfg, a):
    kind = cfg["mask"]
    if kind == "alpha":
        return mask_alpha(a, cfg.get("alpha_thresh", 48))
    if kind == "flat":
        return mask_flat_bg(a, seal=cfg.get("seal", 0))
    return mask_gradient(a, cfg.get("grad_thresh", 34))


def main():
    key = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else f"/tmp/aw/inspect_{key}.png"
    cfg = ATLASES[key]
    a = load_rgba(f"{ROOT}/{cfg['src']}")
    mask = build_mask(cfg, a)
    rows = group_rows(find_blobs(mask, **cfg.get("blob", {})))
    im = Image.open(f"{ROOT}/{cfg['src']}").convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 0, 255, 255))
    cut = im.copy()
    cut.putalpha(Image.fromarray((mask * 255).astype("uint8")))
    bg.alpha_composite(cut)
    d = ImageDraw.Draw(bg)
    for ri, row in enumerate(rows):
        for ci, b in enumerate(row):
            d.rectangle([b["x0"], b["y0"], b["x1"], b["y1"]], outline=(0, 255, 0), width=2)
            d.text((b["x0"] + 3, b["y0"] + 2), f"{ri}.{ci}", fill=(255, 255, 255))
    bg.save(out)
    for ri, row in enumerate(rows):
        print(ri, [(b["x0"], b["y0"], b["x1"] - b["x0"], b["y1"] - b["y0"]) for b in row])


if __name__ == "__main__":
    main()
