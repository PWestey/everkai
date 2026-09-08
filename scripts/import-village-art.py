import zipfile,re,json,hashlib
from pathlib import Path
import UnityPy
UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
root=Path(__file__).resolve().parents[1];out=root/'public/assets/village';out.mkdir(exist_ok=True)
rows=[]
with zipfile.ZipFile('/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk') as z:
 for n in z.namelist():
  if '/prefab/level/images_maincity/building/' not in n or not re.search(r'/scene_maincity_building_(2|3|4|5|6)_1_[a-f0-9]{32}\.mmc$',n):continue
  b=z.read(n)
  if b[32:40]!=b'UnityFS\0':continue
  for obj in UnityPy.load(b[32:]).objects:
   if obj.type.name!='Texture2D':continue
   d=obj.parse_as_object();file=d.m_Name+'.webp';im=d.image.convert('RGBA');bbox=im.getchannel('A').getbbox() or (0,0,im.width,im.height);im.crop(bbox).save(out/file,'WEBP',quality=90)
   rows.append({'texture':d.m_Name,'source':n,'sourceSha256':hashlib.sha256(b).hexdigest(),'asset':'village/'+file,'size':[d.m_Width,d.m_Height],'alphaCrop':list(bbox)})
(root/'lib/village-art-data.json').write_text(json.dumps({'provenance':'Readable UnityFS payload at offset32; static Texture2D extraction only','records':rows},indent=2)+'\n')
print(json.dumps(rows,indent=2))
