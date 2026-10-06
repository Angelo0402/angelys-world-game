"""Pack reviewed finale source rectangles. Preserve native alpha and all limbs."""
from pathlib import Path
import json
import hashlib
import numpy as np
from PIL import Image
from build_chapter11 import pack, replace_const

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art/source/finale'
GEN=ROOT/'src/assets/sprites.gen.ts'

def frames(key, authoring_scale=1):
    im=Image.open(SRC/(key+'.png')).convert('RGBA')
    layout=json.loads((SRC/'layout.json').read_text(encoding='utf8'))[key]
    result=[]
    for spec in layout:
        box=spec['box']
        tile=im.crop(box)
        a=np.array(tile.getchannel('A'))
        ys,xs=np.nonzero(a>64)
        if not len(xs) or min(xs.min(),ys.min(),tile.width-1-xs.max(),tile.height-1-ys.max())<4:
            raise ValueError(f'{key}: clipped or empty frame {box}')
        bbox=tile.getchannel('A').getbbox()
        tile=tile.crop(bbox)
        ax=spec['pivot'][0]-box[0]-bbox[0]
        ay=spec['pivot'][1]-box[1]-bbox[1]
        # Each generated source has its own resolution; one shared factor per
        # source aligns its standing body with the other sheet, never per pose.
        if authoring_scale!=1:
            tile=tile.convert('RGBa').resize((round(tile.width*authoring_scale),round(tile.height*authoring_scale)),Image.Resampling.LANCZOS).convert('RGBA')
            ax*=authoring_scale
            ay*=authoring_scale
        result.append(dict(im=tile,ax=ax,ay=ay))
    return result

def build():
    sprites={}
    for person,factor in [('angelo',282/250),('angely',238/260)]:
        m=frames(person+'_motion')
        e=frames(person+'_emotions',factor)
        specs=dict(idle=(m[:4],5,-1),walk=(m[4:12],10,-1),talk=(m[12:16],6,-1))
        if person=='angelo':
            specs.update(kneel=(e[:4],6,0),reach=(e[4:8],5,-1),smile=(e[8:12],4,-1),wave=(e[12:16],6,-1))
        else:
            specs.update(run=(e[:8],12,-1),reach=(e[8:12],5,-1),happy=(e[12:16],5,-1))
        key=person+'_finale'
        sprites[key]=pack(key,specs,cell=256)
        key=person+'_finale_back'
        sprites[key]=pack(key,dict(walk=(frames(person+'_back'),10,-1)),cell=256)
    f=frames('pair_reunion')
    sprites['final_pair_reunion']=pack('final_pair_reunion',dict(approach=(f[:4],6,0),hug=(f[4:7],4,-1),pat=(f[7:],1,0)),cell=384)
    for direction in ['side','back']:
        key='final_pair_'+direction
        sprites[key]=pack(key,dict(walk=(frames('pair_'+direction),10,-1)),cell=384)
    f=frames('blue_portal')
    sprites['final_portal']=pack('final_portal',dict(open=(f[:4],8,-1),close=(f[4:],6,0)),cell=512,center=True)
    GEN.write_text(replace_const(GEN.read_text(encoding='utf8'),'SPRITES',sprites),encoding='utf8')
    (SRC/'runtime.json').write_text(json.dumps(dict(sprites=sprites,sourceFrames=112,alpha='native; no color key',hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in SRC.glob('*.png')}),indent=2),encoding='utf8')
    print(json.dumps({key:[m['frameWidth'],m['frameHeight'],sum(a['end']-a['start']+1 for a in m['anims'].values())] for key,m in sprites.items()},indent=2))

if __name__=='__main__': build()
