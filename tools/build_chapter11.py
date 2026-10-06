"""Build Chapter 11 from reviewed source rectangles and real PNG alpha.

No color key, connected-component deletion, guessing animation grids, or per-pose
scaling. layout.json records every source rectangle and pivot. Runtime sprites
use fixed cells, shared scale and feet/center pivots, with transparent safety pads.
"""
from pathlib import Path
import json
import re
import hashlib
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art/source/chapter11"
OUT = ROOT / "public/assets/runtime"
GEN = ROOT / "src/assets/sprites.gen.ts"

def frames(key):
    im = Image.open(SRC / (key + ".png")).convert("RGBA")
    layout = json.loads((SRC / "layout.json").read_text())[key]
    out = []
    for spec in layout:
        box = spec["box"]
        tile = im.crop(box)
        alpha = np.asarray(tile.getchannel("A"))
        solid = alpha > 64
        ys, xs = np.nonzero(solid)
        if not len(xs):
            raise ValueError(f"{key}: empty frame")
        if min(xs.min(), ys.min(), tile.width - 1 - xs.max(), tile.height - 1 - ys.max()) < 4:
            raise ValueError(f"{key}: silhouette touches extraction edge: {box}")
        bbox = tile.getchannel("A").getbbox()
        crop = tile.crop(bbox)
        out.append({"im": crop, "ax": spec["pivot"][0] - box[0] - bbox[0],
                    "ay": spec["pivot"][1] - box[1] - bbox[1]})
    return out

def pack(name, anims, cell=384, center=False):
    ordered = [f for fr, fps, repeat in anims.values() for f in fr]
    # Same scaling for every animation; never resize each pose independently.
    px, py = cell / 2, cell / 2 if center else round(cell * .8)
    ratios = []
    for f in ordered:
        w, h = f["im"].size
        for available, extent in [(px-16, f["ax"]), (cell-px-16, w-f["ax"]),
                                  (py-16, f["ay"]), (cell-py-16, h-f["ay"])]:
            if extent > 0: ratios.append(available / extent)
    scale = min(ratios)
    cols = min(8, len(ordered))
    sheet = Image.new("RGBA", (cols * cell, ((len(ordered)+cols-1)//cols)*cell))
    for i, f in enumerate(ordered):
        im = f["im"]
        size = (max(1, round(im.width*scale)), max(1, round(im.height*scale)))
        # Premultiplied alpha prevents colored fringes from transparent RGB.
        im = im.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")
        x, y = round(px-f["ax"]*scale), round(py-f["ay"]*scale)
        if x < 12 or y < 12 or x+im.width > cell-12 or y+im.height > cell-12:
            raise ValueError(f"{name}: packed content outside safety padding")
        sheet.alpha_composite(im, ((i%cols)*cell+x, (i//cols)*cell+y))
    path = OUT / (name + ".webp")
    sheet.save(path, lossless=True, method=6)
    meta, start = {}, 0
    for key, (fr, fps, repeat) in anims.items():
        # Animation h measures opaque content for predictable on-screen sizes.
        heights = [f["im"].getchannel("A").point(lambda a: 255 if a>64 else 0).getbbox()[3] -
                   f["im"].getchannel("A").point(lambda a: 255 if a>64 else 0).getbbox()[1] for f in fr]
        meta[key] = dict(start=start, end=start+len(fr)-1, fps=fps, repeat=repeat,
                         h=max(1, round(float(np.median(heights))*scale)))
        start += len(fr)
    return dict(file=f"assets/runtime/{name}.webp", frameWidth=cell, frameHeight=cell,
                originX=.5, originY=py/cell, bodyHeight=round(py), anims=meta)

def read_const(text, name):
    m = re.search(r"export const " + name + r" = (\{.*?\n\}) as const;", text, re.S)
    if not m: raise ValueError(name)
    return m, json.loads(re.sub(r",\s*(?=[}\]])", "", m.group(1)))

def replace_const(text, name, updates):
    m, data = read_const(text, name)
    data.update(updates)
    return text[:m.start(1)] + json.dumps(data, indent=2) + text[m.end(1):]

def build():
    motion, magic, reaction = (frames(k) for k in ["boss_motion_final","boss_magic","boss_reaction"])
    spec = {}
    for source, names in [(motion, ["idle","walk","claw","slam"]),
                          (magic, ["shoot","summon","charge","erupt"]),
                          (reaction, ["hurt","stagger","enrage","dead"])]:
        for i, key in enumerate(names):
            spec[key] = (source[i*4:i*4+4], {"idle":6,"walk":8,"hurt":12,"stagger":6,"dead":5}.get(key,8),
                         -1 if key in ["idle","walk","enrage"] else 0)
    sprites = {"crystalveil": pack("crystalveil",spec)}
    for key in ["shardknight","voidwraith","galaxmaw","stormgolem"]:
        f = frames("enemy_"+key)
        sprites[key] = pack(key, {
            "idle":(f[:4],6,-1),"walk":(f[4:8],8,-1),"attack":(f[8:12],10,0),
            "hurt":(f[12:14],10,0),"dead":(f[14:16],5,0)},cell=256,
            center=key in ["voidwraith","galaxmaw"])
    f = frames("chapter11_fx")
    sprites["crystal_shot"] = pack("crystal_shot",{"form":(f[:4],12,0),"fly":(f[:4],12,-1),"impact":(f[4:8],16,0)},cell=256,center=True)
    sprites["crystalveil_fx"] = pack("crystalveil_fx",{"spikes":(f[8:12],8,0),"ring":(f[4:8],12,0)},cell=256)
    sprites["crystalveil_beam"] = pack("crystalveil_beam",{"beam":(f[12:16],12,-1)},cell=256,center=True)
    f = frames("angelo_veil")
    sprites["angelo_veil"] = pack("angelo_veil",{"idle":(f[:4],5,-1),"walk":(f[4:8],8,-1),
                                                 "talk":(f[8:12],6,-1),"wave":(f[12:16],6,-1)},cell=256)
    f = frames("veil_cage_final")
    sprites["veil_cage"] = pack("veil_cage",{"idle":(f[:1],1,-1),"crack":(f[1:2],1,0),
                                           "open":(f[2:4],5,0)},cell=384)
    f = frames("veil_hug")
    sprites["veil_reunion"] = pack("veil_reunion",{"open":(f[:1],1,0),"hug":(f[1:3],3,-1),
                                                 "pat":(f[3:4],1,-1)},cell=384)
    props = {}
    f = frames("chapter11_props")
    for i, (key, width) in enumerate([("ground",640),("plat_l",210),("plat_m",164),("plat_s",116),
                                      ("spikes",150),("crate",84),("block",84),("crystal_cluster",156)]):
        image = f[i]["im"]
        # Props are separate images; trim only transparent gutters, preserving ALL ink.
        opaque = image.getchannel("A").point(lambda a: 255 if a>64 else 0).getbbox()
        if key == "ground":
            # Alpha-only glow at tile ends must not introduce a visible gap.
            x0,y0,x1,y1 = opaque
            image = image.crop((x0,max(0,y0-2),x1,min(image.height,y1+4)))
            opaque = image.getchannel("A").point(lambda a: 255 if a>64 else 0).getbbox()
        top = opaque[1]
        ratio = width / image.width
        path = OUT / "props" / (key+"_11.webp")
        image.save(path, lossless=True, method=6)
        props[key+"_11"] = dict(file="assets/runtime/props/"+key+"_11.webp",width=width,
                                height=round(image.height*ratio,1),surface=round(top/image.height,4))
    for key in ["background","splash"]:
        image = Image.open(SRC/("chapter11_"+key+".png")).convert("RGB")
        image = image.resize((1920,1080),Image.Resampling.LANCZOS)
        image.save(OUT/"backdrops"/(("bg11" if key=="background" else "splash11")+".jpg"), quality=93,subsampling=0)
    text = GEN.read_text(encoding="utf-8")
    text = replace_const(text,"SPRITES",sprites)
    text = replace_const(text,"PROPS",props)
    GEN.write_text(text,encoding="utf-8")
    manifest = dict(sprites=sprites, props=props, background=[1920,1080],baseCommit="54464d5d7527538fba2098a20db630943d3dda9c")
    (SRC/"runtime.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print(json.dumps({k: [v["frameWidth"],v["frameHeight"],sum(a["end"]-a["start"]+1 for a in v["anims"].values())] for k,v in sprites.items()},indent=2))

if __name__ == "__main__":
    build()
