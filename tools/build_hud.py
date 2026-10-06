"""Export seven independent HUD icons from reviewed, explicit source rectangles."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art/source/hud"
OUT = ROOT / "public/assets/runtime/hud"

def build():
    meta = json.loads((SRC / "generation.json").read_text())
    source = Image.open(SRC / meta["source"]).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, rect in meta["layout"].items():
        icon = source.crop(rect)
        # Ignore barely visible dust from generation when measuring the icon.
        bounds = icon.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if not bounds:
            raise ValueError(f"Empty icon: {name}")
        icon = icon.crop(bounds)
        scale = 112 / max(icon.size)
        size = tuple(max(1, round(n * scale)) for n in icon.size)
        icon = icon.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")
        cell = Image.new("RGBA", (128, 128))
        cell.alpha_composite(icon, ((128-size[0])//2, (128-size[1])//2))
        cell.save(OUT / f"{name}.webp", lossless=True, method=6)
    print("HUD: 7 distinct 128x128 transparent icons")

if __name__ == "__main__":
    build()
