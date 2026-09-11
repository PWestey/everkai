import zipfile,re,json,hashlib,io
from pathlib import Path
import UnityPy
from PIL import Image
UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
# Drakenberg town panorama: the sky layer and the painted town layer from the readable level bundle, composited and cropped to the painted area.
root=Path(__file__).resolve().parents[1];out=root/'public/assets/drakenberg';out.mkdir(exist_ok=True)
layers={};rows=[]
with zipfile.ZipFile('/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk') as z:
 for n in z.namelist():
  if not re.search(r'/prefab/level/images_dragoncity/scene_dragoncity_(backround|front)_[a-f0-9]{32}\.mmc$',n):continue
  b=z.read(n)
  if b[32:40]!=b'UnityFS\0':continue
  for obj in UnityPy.load(b[32:]).objects:
   if obj.type.name!='Texture2D':continue
   d=obj.parse_as_object();layers[d.m_Name]=d.image.convert('RGBA')
   rows.append({'texture':d.m_Name,'source':n,'sourceSha256':hashlib.sha256(b).hexdigest(),'size':[d.m_Width,d.m_Height]})
assert set(layers)=={'Scene_DragonCity_Backround','Scene_DragonCity_Front'},sorted(layers)
town=layers['Scene_DragonCity_Backround'].copy();town.alpha_composite(layers['Scene_DragonCity_Front'])
crop=layers['Scene_DragonCity_Front'].getchannel('A').getbbox();town=town.crop(crop).convert('RGB')
buf=io.BytesIO();town.save(buf,'WEBP',quality=86,method=6);data=buf.getvalue();(out/'town.webp').write_bytes(data)
record={'provenance':'Readable UnityFS payload at offset32; static Texture2D extraction only. Sky layer composited under the town layer and cropped to the town layer alpha bounds.','layers':sorted(rows,key=lambda r:r['texture']),'crop':list(crop),'asset':{'src':'drakenberg/town.webp','width':town.width,'height':town.height,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}}
(root/'lib/drakenberg-art-data.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record['asset']),record['crop'])
