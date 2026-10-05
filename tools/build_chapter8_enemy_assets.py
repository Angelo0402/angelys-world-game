"""Normalize generated Chapter 8 enemy sheets into runtime WebP atlases."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/runtime"
SRC = ROOT / "art/source/gen/chapter8"

SHEETS = {
    "celestial_sentinel": Path(r"C:/Users/Angelo/.codex/generated_images/01a09f9f-e36c-7ba2-9e33-5ac42d5e86b9/exec-b49b622b-c41f-4202-9cfa-5592fc8d03a6.png"),
    "aurora_wisp": Path(r"C:/Users/Angelo/.codex/generated_images/01a09f9f-e36c-7ba2-9e33-5ac42d5e86b9/exec-07252c6b-a918-4841-a904-dd51d0dee0a3.png"),
}

def build(name: str, source: Path) -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    original = Image.open(source).convert("RGBA")
    original.save(SRC / f"{name}_sheet.png")
    frames = []
    for i in range(8):
        x0, x1 = round(i * original.width / 8), round((i + 1) * original.width / 8)
        cell = original.crop((x0, 0, x1, original.height))
        alpha = cell.getchannel("A")
        bbox = alpha.getbbox()
        if bbox:
            cell = cell.crop(bbox)
        frames.append(cell)
    canvas = Image.new("RGBA", (160 * 8, 160), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        scale = min(132 / max(1, frame.height), 132 / max(1, frame.width), 1.0)
        frame = frame.resize((max(1, round(frame.width * scale)), max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
        x = i * 160 + (160 - frame.width) // 2
        y = 156 - frame.height
        canvas.alpha_composite(frame, (x, y))
    canvas.save(OUT / f"{name}.webp", "WEBP", lossless=True, quality=100)

for name, source in SHEETS.items():
    build(name, source)
