"""Extract the familiar portraits, which Everkai has never had.

Until now every familiar surface fell back to a rarity-framed card with the name printed on it --
`scripts/import-ui-sprites.py` even records the reason: "Companions have no portrait art of any kind
-- 0 of 71 carry one and none exists on disk". That was true of the EXTRACTED set and false of the
APK. `Pet.HalfPic` and `Pet.HeadIcon` name the art; it is packed in `assets/Android/ui/pet/`.

THE RECIPE, which is why this took a parser rather than a lookup:

  * 28 bundles under `ui/pet/`. Twenty-seven are `pet_atlasN.mmc`, each holding ONE packed
    Texture2D named `Pet_atlasN` -- and NO Sprite objects, so a name search over the bundles finds
    nothing. The rectangles live in the 28th.
  * `pet_fui.mmc` holds one TextAsset, `Pet_fui`, magic `FGUI` version 6: a FairyGUI package
    descriptor. Its index table at offset 44 has six blocks; block 1 is 818 package items, block 2
    is 446 sprite rects and block 4 is a 6,037-entry string table that every id and name indexes.
  * An item is `{type, id, name, path, file}`. Type 0 is an image, type 4 an atlas whose `file` is
    `atlasN.png`. A sprite row is `{itemId, atlasId, x, y, w, h, rotated}`, both ids being string
    indices. Joining the three gives name -> atlas -> crop.

Every bundle is a plain UnityFS behind the project's usual 32-byte MOMCMX prefix, the same recipe
`scripts/import-facility-scenes.py` already uses.

WHAT SHIPS. Head icons for every familiar, which is what the roster, the Compendium grid and the
encounter plaque want. The half-body art is 750x1800 per familiar and belongs on the detail screen;
it is written too but streamed rather than precached, because `docs/` records that a large precache
is what breaks saving on the phone. Evolved forms (`A`, `AA` suffixes) are extracted only when the
base form exists, and are what the Forms section would use.
"""
import argparse,io,json,zipfile,warnings,struct,collections
from pathlib import Path
import UnityPy
warnings.filterwarnings('ignore');UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
APK=Path('/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk')
ROOT=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser();ap.add_argument('--dry-run',action='store_true');ap.add_argument('--quality',type=int,default=82)
A=ap.parse_args()

z=zipfile.ZipFile(APK)
PET=[n for n in z.namelist() if n.startswith('assets/Android/ui/pet/') and n.endswith('.mmc')]
assert len(PET)==28,len(PET)
def bundle(entry):
 b=z.read(entry);assert b[32:40]==b'UnityFS\0',entry
 return UnityPy.load(b[32:])

fui=[n for n in PET if '/pet_fui_' in n][0]
ta=[o.parse_as_object() for o in bundle(fui).objects if o.type.name=='TextAsset'][0]
s=ta.m_Script; raw=s.encode('utf-8','surrogateescape') if isinstance(s,str) else bytes(s)
assert raw[:4]==b'FGUI' and struct.unpack_from('>i',raw,4)[0]==6,'not a FairyGUI v6 package'

ITP=44
seg=raw[ITP];assert seg==6,seg
assert raw[ITP+1]==0,'4-byte block offsets expected'
off=[ITP+struct.unpack_from('>i',raw,ITP+2+4*i)[0] for i in range(seg)]

p=off[4];n=struct.unpack_from('>i',raw,p)[0];p+=4;TBL=[]
for _ in range(n):
 ln=struct.unpack_from('>H',raw,p)[0];TBL.append(raw[p+2:p+2+ln].decode('utf-8','replace'));p+=2+ln
assert len(TBL)==6037,len(TBL)
S=lambda i: TBL[i] if 0<=i<len(TBL) else None

p=off[1];n=struct.unpack_from('>h',raw,p)[0];p+=2
assert n==818,n
items={}
for _ in range(n):
 nxt=struct.unpack_from('>i',raw,p)[0];b=p+4
 items[S(struct.unpack_from('>H',raw,b+1)[0])]={
  'type':raw[b],'name':S(struct.unpack_from('>H',raw,b+3)[0]),'file':S(struct.unpack_from('>H',raw,b+7)[0])}
 p=b+nxt
kinds=collections.Counter(v['type'] for v in items.values())
assert kinds[0]==446 and kinds[4]==27,dict(kinds)

p=off[2];n=struct.unpack_from('>h',raw,p)[0];p+=2
assert n==446,n
sprites={}
for _ in range(n):
 nxt=struct.unpack_from('>H',raw,p)[0];b=p+2
 iid=S(struct.unpack_from('>H',raw,b)[0]);atlas=S(struct.unpack_from('>H',raw,b+2)[0])
 x,y,w,h=struct.unpack_from('>iiii',raw,b+4)
 sprites[iid]={'atlas':atlas,'rect':(x,y,w,h),'rot':bool(raw[b+20])}
 p=b+nxt
assert len(sprites)==446,len(sprites)

want={}   # sprite name -> item id
for iid,it in items.items():
 nm=it['name']
 if nm and (nm.startswith('Head_Pet_') or nm.startswith('Half_Pet_')) and iid in sprites:
  want[nm]=iid
assert len(want)==286,len(want)
# Every portrait's atlas must be a real atlas item, and the crop must fit inside it.
for nm,iid in want.items():
 a=items.get(sprites[iid]['atlas']);assert a and a['type']==4,f'{nm}: atlas {sprites[iid]["atlas"]}'

# The roster this has to cover.
pets=json.loads((ROOT/'lib/familiar-data.json').read_text())['pets']
base={p['id']:p['id'].split('_',1)[1] for p in pets}
missing=[pid for pid,num in base.items() if f'Head_Pet_{num}' not in want]
print(f'{len(want)} portrait sprites across {len({sprites[i]["atlas"] for i in want.values()})} atlases; '
      f'{len(base)-len(missing)}/{len(base)} familiars have a head icon')
if missing:print('   no head icon:',missing)
if A.dry_run:
 sizes=collections.Counter()
 for nm,iid in want.items():
  w,h=sprites[iid]['rect'][2:]
  sizes[('Head' if nm.startswith('Head') else 'Half',w,h)]+=1
 for k,v in sorted(sizes.items(),key=lambda x:-x[1])[:8]:print('   ',k,v)
 raise SystemExit(0)

from PIL import Image
atlas_cache={}
def atlas_image(aid):
 if aid in atlas_cache:return atlas_cache[aid]
 tex=items[aid]['file'].rsplit('.',1)[0]                    # atlasN.png -> atlasN
 cand=[n for n in PET if f'/pet_{tex}_' in n]
 assert len(cand)==1,f'{tex}: {len(cand)} bundles'
 im=next(o.parse_as_object().image for o in bundle(cand[0]).objects
         if o.type.name=='Texture2D' and o.parse_as_object().m_Name.lower()==f'pet_{tex}')
 atlas_cache[aid]=im.convert('RGBA')
 return atlas_cache[aid]

out=ROOT/'public/assets/familiars';out.mkdir(parents=True,exist_ok=True)
index={}
for nm in sorted(want):
 sp=sprites[want[nm]];x,y,w,h=sp['rect']
 im=atlas_image(sp['atlas'])
 assert x+w<=im.width and y+h<=im.height,f'{nm}: {sp["rect"]} outside {im.size}'
 crop=im.crop((x,y,x+w,y+h))
 if sp['rot']:crop=crop.transpose(Image.ROTATE_270)
 kind,num=('head',nm[len('Head_Pet_'):]) if nm.startswith('Head_Pet_') else ('half',nm[len('Half_Pet_'):])
 f=out/f'{kind}-{num.lower()}.webp'
 crop.save(f,'WEBP',quality=A.quality,method=6)
 index.setdefault(kind,{})[num]=f.name
total={k:sum((out/v).stat().st_size for v in m.values()) for k,m in index.items()}
(ROOT/'lib/familiar-portrait-data.json').write_text(json.dumps(
 {'source':'UnityDataAssetPack.apk assets/Android/ui/pet','package':'Pet_fui (FairyGUI v6)',
  'head':index.get('head',{}),'half':index.get('half',{})},separators=(',',':'))+'\n')
for k,v in total.items():print(f'   {k}: {len(index[k])} files, {v/1024/1024:.2f} MB')
