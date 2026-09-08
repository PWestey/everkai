"""Render readable baked fish prefab meshes using their exact material dependencies."""
import zipfile,re,json,hashlib,math,warnings
from pathlib import Path
import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler
from PIL import Image,ImageDraw,ImageChops
warnings.filterwarnings('ignore');UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
root=Path(__file__).resolve().parents[1];out=root/'public/assets/fishing';out.mkdir(exist_ok=True);wanted={r['id'] for r in json.loads((root/'lib/fishing-inventory.json').read_text())['records']};assets={};origin={};prefabs=[]
def load(z,n):
 b=z.read(n)
 if b[32:40]!=b'UnityFS\0':return []
 env=UnityPy.load(b[32:]);result=[]
 for a in env.assets:assets[a.name]=a;origin[a.name]={'source':n,'sha256':hashlib.sha256(b).hexdigest()};result.append(a)
 return result
with zipfile.ZipFile('/Users/westmanfamily/Desktop/ISEKAI/UnityStreamingAssetsPack.apk') as z:
 for n in z.namelist():
  if '/spine/simgame4/' in n:load(z,n)
with zipfile.ZipFile('/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk') as z:
 for n in z.namelist():
  m=re.search(r'/images_simgame4/simgame4_(f\d+)_[a-f0-9]{32}\.mmc$',n)
  if m and m[1].upper() in wanted:
   for a in load(z,n):prefabs.append((m[1].upper(),a))
def resolve(a,p):
 if p['m_FileID']:a=assets[a.externals[p['m_FileID']-1].path.split('/')[-1]]
 return a,a.objects[p['m_PathID']]
def affine(points,values):
 (x0,y0),(x1,y1),(x2,y2)=points;v0,v1,v2=values;den=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1)
 if abs(den)<1e-9:return None
 return ((v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/den,(v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/den,(v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/den)
rows=[];missing=[]
for ident,a in prefabs:
 try:
  mesh=next(o for o in a.objects.values() if o.type.name=='Mesh');renderer=next(o for o in a.objects.values() if o.type.name=='MeshRenderer').parse_as_dict();h=MeshHandler(mesh.parse_as_object());h.process();vs=h.m_Vertices;uv=h.m_UV0;xs=[p[0] for p in vs];ys=[p[1] for p in vs];scale=300/max(max(xs)-min(xs),max(ys)-min(ys));pts=[((p[0]-min(xs))*scale+4,(max(ys)-p[1])*scale+4) for p in vs];size=(math.ceil((max(xs)-min(xs))*scale)+8,math.ceil((max(ys)-min(ys))*scale)+8);canvas=Image.new('RGBA',size);deps={a.name}
  for sub,triangles in enumerate(h.get_triangles()):
   ma,mo=resolve(a,renderer['m_Materials'][sub]);material=mo.parse_as_dict();envs=dict(material['m_SavedProperties']['m_TexEnvs']);ta,to=resolve(ma,envs['_MainTex']['m_Texture']);texture=to.parse_as_object().image.convert('RGBA');deps.update([ma.name,ta.name]);tw,th=texture.size
   for tri in triangles:
    dest=[pts[i] for i in tri];u=affine(dest,[uv[i][0]*tw for i in tri]);v=affine(dest,[(1-uv[i][1])*th for i in tri]);
    if u is None:continue
    patch=texture.transform(size,Image.Transform.AFFINE,u+v,Image.Resampling.BILINEAR);mask=Image.new('L',size);ImageDraw.Draw(mask).polygon(dest,fill=255);patch.putalpha(ImageChops.multiply(patch.getchannel('A'),mask));canvas.alpha_composite(patch)
  assert canvas.getchannel('A').getbbox();file=ident+'.webp';canvas.save(out/file,'WEBP',quality=92);rows.append({'id':ident,'asset':'fishing/'+file,'mesh':mesh.parse_as_object().m_Name,'size':list(size),'sources':[origin[k] for k in sorted(deps)],'assetSha256':hashlib.sha256((out/file).read_bytes()).hexdigest()})
 except Exception as e:missing.append({'id':ident,'reason':str(e)})
(root/'lib/fishing-art-data.json').write_text(json.dumps({'provenance':'Static baked mesh pose from exact SimGame4_F<id> prefab, external CAB/material/Texture2D pointers resolved in readable UnityFS. No animation/decryption or guessed Spine ordinal.','records':rows,'missing':missing,'absent':sorted(wanted-{i for i,a in prefabs})},indent=2)+'\n');print(len(rows),'rendered;',missing[:4])
