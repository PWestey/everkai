import zipfile,re,json,hashlib,io
from pathlib import Path
import UnityPy
from PIL import Image
UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
# The village map: the four ground tiles of the original main city laid left to right (their edges match), with the built-state texture of each of the 17 businesses.
APK='/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk';SCALE=.75
GROUND=['Scene_MainCity_Backround_1_New','Scene_MainCity_Backround_2_New','Scene_MainCity_Backround_3_New','Scene_MainCity_Backround_4_New']
BUILDINGS={'habits':'School_1','Building_101':'2_1','Building_201':'3_1','Building_301':'4_1','Building_401':'5_1','Building_501':'6_1','Building_601':'7_1_3','Building_701':'8_1','Building_801':'9_1','Building_901':'15_1','Building_1001':'11_1_1','Building_1101':'12_1','Building_1201':'13_1','Building_1301':'14_1','Building_1401':'10_1','Building_1501':'16_1','Building_1601':'17_1','Building_1701':'18_1'}
root=Path(__file__).resolve().parents[1];out=root/'public/assets/village';out.mkdir(exist_ok=True)
wanted=set(GROUND)|{'Scene_MainCity_Building_'+t for t in BUILDINGS.values()};found={}
with zipfile.ZipFile(APK) as z:
 for n in z.namelist():
  if not re.search(r'/prefab/level/images_maincity/(background|building/[a-z0-9_]+)/scene_maincity_[a-z0-9_]+_[a-f0-9]{32}\.mmc$',n):continue
  b=z.read(n)
  if b[32:40]!=b'UnityFS\0':continue
  for o in UnityPy.load(b[32:]).objects:
   if o.type.name!='Texture2D':continue
   d=o.parse_as_object()
   if d.m_Name in wanted and d.m_Name not in found:found[d.m_Name]=(d.image.convert('RGBA'),n,hashlib.sha256(b).hexdigest())
assert wanted<=set(found),sorted(wanted-set(found))
def webp(im,quality):
 buf=io.BytesIO();im.save(buf,'WEBP',quality=quality,method=6);return buf.getvalue()
def record(src,data,im,**extra):
 (out/Path(src).name).write_bytes(data);return {'src':src,'width':im.width,'height':im.height,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),**extra}
# Ground: tiles 1-3 in full; tile 4 only holds a narrow strip of sea and beach before empty space.
tiles=[found[n][0].convert('RGB') for n in GROUND];last=tiles[3];edge=next(x+8 for x in range(last.width-8,0,-8) if sum(last.crop((x,0,x+8,last.height)).resize((1,1)).getpixel((0,0)))>36)
ground=Image.new('RGB',(3*2048+edge,2048))
for i,t in enumerate(tiles[:3]):ground.paste(t,(i*2048,0))
ground.paste(last.crop((0,0,edge,2048)),(3*2048,0));ground=ground.resize((round(ground.width*SCALE),round(ground.height*SCALE)),Image.LANCZOS)
data={'provenance':'Readable UnityFS payloads at offset32; static Texture2D extraction only. Tile order is from matching tile edges; building placement is a local layout.','scale':SCALE,
 'ground':record('village/ground.webp',webp(ground,82),ground,tiles=[{'texture':n,'source':found[n][1],'sourceSha256':found[n][2]} for n in GROUND],lastTileWidth=edge),'buildings':{}}
for bid,t in BUILDINGS.items():
 name='Scene_MainCity_Building_'+t;im,src,sha=found[name];im=im.crop(im.getchannel('A').getbbox());im=im.resize((round(im.width*SCALE),round(im.height*SCALE)),Image.LANCZOS)
 if bid=='Building_501':# the resort's blossom canopy is painted to a hard square top edge; fade it into the ground
  a=im.getchannel('A');fade=round(im.height*.14)
  for y in range(fade):
   row=a.crop((0,y,im.width,y+1)).point(lambda v,k=y/fade:int(v*k));a.paste(row,(0,y))
  im.putalpha(a)
 data['buildings'][bid]=record(f'village/{bid}.webp',webp(im,88),im,texture=name,source=src,sourceSha256=sha)
(root/'lib/village-map-data.json').write_text(json.dumps(data,indent=2)+'\n')
print('ground',data['ground']['width'],'x',data['ground']['height'],data['ground']['bytes'],'bytes; buildings',sum(b['bytes'] for b in data['buildings'].values()),'bytes')
