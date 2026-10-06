"""Validate the Chapter 11 export, independently decoding every runtime frame."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
meta=json.loads((root/"art/source/chapter11/runtime.json").read_text())
finale=json.loads((root/"art/source/finale/runtime.json").read_text())
assert sum(a["end"]-a["start"]+1 for m in finale["sprites"].values() for a in m["anims"].values())==112
meta["sprites"].update(finale["sprites"])
count=0
for name,m in meta["sprites"].items():
    image=Image.open(root/"public"/m["file"])
    w,h=m["frameWidth"],m["frameHeight"]
    assert image.mode=="RGBA", (name,"missing alpha")
    assert image.width%w==0 and image.height%h==0, (name,"partial frame")
    assert image.width<=4096 and image.height<=4096, (name,"exceeds mobile texture limit")
    columns=image.width//w
    expected=sum(a["end"]-a["start"]+1 for a in m["anims"].values())
    assert expected <= columns*(image.height//h)
    for i in range(expected):
        cell=image.crop(((i%columns)*w,(i//columns)*h,(i%columns+1)*w,(i//columns+1)*h))
        a=np.array(cell)[:,:,3]
        assert np.count_nonzero(a>64)>50,(name,i,"empty frame")
        assert not np.any(a[:8]) and not np.any(a[-8:]), (name,i,"vertical bleed")
        assert not np.any(a[:,:8]) and not np.any(a[:,-8:]), (name,i,"horizontal bleed")
        count+=1
    for key,anim in m["anims"].items():
        assert anim["start"]<=anim["end"]<expected,(name,key,"invalid animation range")
        assert anim["h"]>0
    if name=="crystalveil": assert m["anims"]["idle"]["h"]>=100
for key in ["bg11","splash11"]:
    assert Image.open(root/f"public/assets/runtime/backdrops/{key}.jpg").size==(1920,1080)
print(f"PASS: {len(meta['sprites'])} atlases, {count} nonempty frames, transparent borders, complete cells, <=4096 textures; two 1920x1080 backdrops.")
