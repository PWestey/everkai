"""Import the original's own roster crop, so Everkai stops guessing one.

WHY. Everkai imported only `Hero.image` / `Wife.spine` -- the full 1280x1920 cutscene plate -- and
then built `lib/art-framing.mjs` plus a 440-row measured bounds table to crop a 206:280 roster card
out of it. `docs/roster-crop-measurement.md` records what that missed: the original never crops
anything. `Hero.json` names five ready-made crops per character (`head`, `smallHead`, `squareHead`,
`wideHead`, `btnHead`) on 180 of 181 rows, `Wife.json` on 151/151, and `HeroClothes`/`WifeClothes`
carry the same columns keyed on the ids Everkai already uses (`H101C1` -> `Half_Hero_101C1`).

WHAT THIS TAKES. `wideHead` = `Half_Hero_N` / `Half_Wife_N`, a 500x400 half-body. That is the image
the original's list row shows: `head` = `ListItem_Half_Hero_N` is a type-3 COMPONENT with no sprite
rect of its own -- it frames this image -- so the pixels are here and the frame is CSS.

THE PARSER, and the correction it carries. `scripts/import-familiar-portraits.py` reads the FairyGUI
v6 index table at a hardcoded offset 44 with 4-byte block offsets. That is right for `Pet_fui` and
wrong for everything else: the header is NOT fixed length -- `id` and `name` are length-prefixed
strings -- so the table sits at 44 (Pet), 45 (Hero, Wife) or 57 (AvatorStaticHead), and the byte
after the segment count says whether the block offsets are shorts.

COVERAGE is checked against the shipped rosters and asserted, not assumed; whatever is missing keeps
the measured-bounds path as its fallback, which is why that path is not deleted here.
"""
import argparse,io,json,zipfile,warnings,struct,collections,re
from pathlib import Path
import UnityPy
warnings.filterwarnings('ignore');UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
ROOT=Path(__file__).resolve().parent.parent
APKS=[Path('/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk'),
      Path('/Users/westmanfamily/Desktop/ISEKAI/UnityStreamingAssetsPack.apk')]
ap=argparse.ArgumentParser()
ap.add_argument('--dry-run',action='store_true')
ap.add_argument('--quality',type=int,default=80)
ap.add_argument('--measure-only',action='store_true',
                help='re-measure the alpha boxes of crops already on disk; cuts nothing')
A=ap.parse_args()

# ---- FairyGUI v6 package descriptor -----------------------------------------------------------
def fgui(raw):
 assert raw[:4]==b'FGUI',raw[:4]
 ver=struct.unpack_from('>i',raw,4)[0];assert ver==6,ver
 p=9                                              # magic(4) + version(4) + compressed(1)
 def rs(p):
  ln=struct.unpack_from('>H',raw,p)[0];return raw[p+2:p+2+ln].decode('utf-8','replace'),p+2+ln
 pid,p=rs(p);pname,p=rs(p);p+=20
 ITP=p;seg=raw[ITP];short=raw[ITP+1]==1
 fmt,step=('>h',2) if short else ('>i',4)
 off=[ITP+struct.unpack_from(fmt,raw,ITP+2+step*i)[0] for i in range(seg)]
 q=off[4];n=struct.unpack_from('>i',raw,q)[0];q+=4;TBL=[]
 for _ in range(n):
  ln=struct.unpack_from('>H',raw,q)[0];TBL.append(raw[q+2:q+2+ln].decode('utf-8','replace'));q+=2+ln
 S=lambda i: TBL[i] if 0<=i<len(TBL) else None
 q=off[1];n=struct.unpack_from('>h',raw,q)[0];q+=2;items={}
 for _ in range(n):
  nxt=struct.unpack_from('>i',raw,q)[0];b=q+4
  items[S(struct.unpack_from('>H',raw,b+1)[0])]={
   'type':raw[b],'name':S(struct.unpack_from('>H',raw,b+3)[0]),'file':S(struct.unpack_from('>H',raw,b+7)[0])}
  q=b+nxt
 q=off[2];n=struct.unpack_from('>h',raw,q)[0];q+=2;sprites={}
 for _ in range(n):
  nxt=struct.unpack_from('>H',raw,q)[0];b=q+2
  iid=S(struct.unpack_from('>H',raw,b)[0]);atlas=S(struct.unpack_from('>H',raw,b+2)[0])
  x,y,w,h=struct.unpack_from('>iiii',raw,b+4)
  sprites[iid]={'atlas':atlas,'rect':(x,y,w,h),'rot':bool(raw[b+20])}
  q=b+nxt
 return {'name':pname,'items':items,'sprites':sprites}

def descriptor(z,entry):
 b=z.read(entry)
 if b[32:40]!=b'UnityFS\0':return None
 for o in UnityPy.load(b[32:]).objects:
  if o.type.name!='TextAsset':continue
  s=o.parse_as_object().m_Script
  r=s.encode('utf-8','surrogateescape') if isinstance(s,str) else bytes(s)
  if r[:4]==b'FGUI':return r
 return None

# ---- what the roster actually needs ------------------------------------------------------------

need=json.loads((ROOT/'lib/roster-crop-need.json').read_text()) \
     if (ROOT/'lib/roster-crop-need.json').exists() else None
assert need,'run scripts/roster-crop-need.mjs first -- it writes the id list this import must cover'
WANT={nm:n for n in need for nm in n['sprites']}   # both spellings point at the same view
print(f'{len(need)} views wanted by the shipped roster ({len(WANT)} candidate sprite names)')

from PIL import Image
def alpha_box(im):
 """The figure's exact bounding box, as fractions of the crop.

 This is the whole point of importing these: the half-body renders carry a real alpha channel, so
 the figure's extent is a MEASUREMENT, not the plate-difference estimate `lib/art-bounds-data.json`
 has to make against a flat surround. 297 of 299 have usable alpha; the two that are fully opaque
 get None and are placed centred, the same as any view with no box."""
 a=im.getchannel('A')
 if a.getextrema()[0]>=250:return None
 bb=a.point(lambda p:255 if p>8 else 0).getbbox()
 return None if not bb else [round(bb[0]/im.width,4),round(bb[1]/im.height,4),
                             round(bb[2]/im.width,4),round(bb[3]/im.height,4)]


out=ROOT/'public/assets/roster'
if A.measure_only:
 prev=json.loads((ROOT/'lib/roster-crop-data.json').read_text())
 n=0
 for view,row in prev['views'].items():
  im=Image.open(out/row['file']).convert('RGBA')
  assert (im.width,im.height)==(row['w'],row['h']),f'{view}: {im.size} != {row["w"]}x{row["h"]}'
  row['box']=alpha_box(im);n+=1 if row['box'] else 0
 (ROOT/'lib/roster-crop-data.json').write_text(json.dumps(prev,separators=(',',':'))+'\n')
 print(f"re-measured {len(prev['views'])} crops; {n} have a usable alpha box")
 raise SystemExit(0)

# ---- find them ---------------------------------------------------------------------------------
byview={}                      # view id -> (sprite, apk, bundle dir, pkg, rect, rot, atlas file)
for apk in APKS:
 if not apk.exists():print(f'  {apk.name}: absent, skipped');continue
 z=zipfile.ZipFile(apk)
 fuis=[n for n in z.namelist() if re.search(r'_fui_[0-9a-f]+\.mmc$',n) or n.endswith('_fui.mmc')]
 for entry in fuis:
  raw=descriptor(z,entry)
  if raw is None:continue
  try:pk=fgui(raw)
  except Exception:continue
  hit=0
  for iid,it in pk['items'].items():
   nm=it['name']
   if not nm or nm not in WANT or WANT[nm]['view'] in byview or iid not in pk['sprites']:continue
   sp=pk['sprites'][iid];atlas=pk['items'].get(sp['atlas'])
   assert atlas and atlas['type']==4,f'{nm}: atlas {sp["atlas"]} is not an atlas item'
   byview[WANT[nm]['view']]={'sprite':nm,'apk':apk.name,'dir':entry.rsplit('/',1)[0],'pkg':pk['name'],
              'rect':sp['rect'],'rot':sp['rot'],'atlas':atlas['file']}
   hit+=1
  if hit:print(f"  {apk.name[:12]:12s} {pk['name']:24s} +{hit}")
NEED={n['view']:n for n in need}
miss=sorted(set(NEED)-set(byview))
sizes=collections.Counter(tuple(v['rect'][2:]) for v in byview.values())
print(f'\n{len(byview)}/{len(NEED)} views found; atlas rect sizes {sizes.most_common(4)}')
if miss:print(f'{len(miss)} views not in either APK -- these keep the measured-bounds fallback:\n  '+', '.join(miss))
if A.dry_run:raise SystemExit(0)

# ---- cut them ----------------------------------------------------------------------------------
from PIL import Image
zips={p.name:zipfile.ZipFile(p) for p in APKS if p.exists()}
atlas_cache={}
def atlas_image(rec):
 key=(rec['apk'],rec['dir'],rec['pkg'],rec['atlas'])
 if key in atlas_cache:return atlas_cache[key]
 z=zips[rec['apk']];tex=rec['atlas'].rsplit('.',1)[0]          # atlasN.png -> atlasN
 want=f"{rec['pkg']}_{tex}".lower()
 cand=[n for n in z.namelist() if n.startswith(rec['dir']+'/') and n.endswith('.mmc') and f'_{tex}_' in n.rsplit('/',1)[1]]
 im=None
 for n in cand:
  b=z.read(n)
  if b[32:40]!=b'UnityFS\0':continue
  for o in UnityPy.load(b[32:]).objects:
   if o.type.name!='Texture2D':continue
   t=o.parse_as_object()
   if t.m_Name.lower()==want:im=t.image;break
  if im is not None:break
 assert im is not None,f'{rec["pkg"]} {tex}: no texture among {len(cand)} bundles in {rec["dir"]}'
 atlas_cache[key]=im.convert('RGBA');return atlas_cache[key]

out=ROOT/'public/assets/roster';out.mkdir(parents=True,exist_ok=True)
index={};total=0
shapes=collections.Counter()
for view in sorted(byview):
 rec=byview[view];x,y,w,h=rec['rect'];im=atlas_image(rec)
 assert x+w<=im.width and y+h<=im.height,f'{view}: {rec["rect"]} outside {im.size}'
 crop=im.crop((x,y,x+w,y+h))
 if rec['rot']:crop=crop.transpose(Image.ROTATE_270)
 shapes[crop.size]+=1
 f=out/NEED[view]['file']
 crop.save(f,'WEBP',quality=A.quality,method=6)
 total+=f.stat().st_size
 index[view]={'file':f.name,'w':crop.width,'h':crop.height,'sprite':rec['sprite'],'box':alpha_box(crop)}
# The point of following the original is that every row is the SAME shape. Say so, loudly.
assert len(shapes)==1,f'crops are not one shape after un-rotating: {dict(shapes)}'
(ROOT/'lib/roster-crop-data.json').write_text(json.dumps(
 {'source':'UnityDataAssetPack.apk + UnityStreamingAssetsPack.apk, FairyGUI Half_Hero_/Half_Wife_ (wideHead)',
  'note':'the original\'s own list-row crop; ListItem_Half_* is a component that frames this image',
  'views':index},separators=(',',':'))+'\n')
print(f'\n{len(index)} crops written, {total/1024/1024:.2f} MB')
