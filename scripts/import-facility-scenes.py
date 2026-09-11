import zipfile,json,hashlib,io
from pathlib import Path
import UnityPy
UnityPy.config.FALLBACK_UNITY_VERSION='2021.3.57f2'
# One original backdrop per Drakenberg facility, from readable UI and level bundles. Crossover-event art and backdrops with painted characters were not chosen.
PICKS={
 'habits':('assets/Android/ui/guild/guild_atlas_be6g1nupjj3_60a3c8385d6a1f160e77a089add4704b.mmc','Guild_atlas_be6g1nupjj3',None,'guild hall interior'),
 'businesses':('assets/Android/img/battle/bg/bg_city_02/bg_city_02_boss_d8ca16332f8c158f30a3496220af911d.mmc','Bg_City_02_Boss',None,'market town street'),
 'school':('assets/Android/ui/story/story_atlas10_dbd037ea090efcfb5657a03692573b14.mmc','Story_atlas10',(752,0,1502,1800),'academy hall'),
 'stories':('assets/Android/ui/story/story_atlas_euhp309_3a847e2003cb7450a57d3c5d6576b4a9.mmc','Story_atlas_euhp309',None,'story screen village backdrop'),
 'mine':('assets/Android/ui/challenge/challenge_atlas_m38i1nupjfs_15e0bc5b87eaa585ceef44f3e63bc0c0.mmc','Challenge_atlas_m38i1nupjfs',None,'crystal mine track'),
 'northern':('assets/Android/art_djnorthrealm/ui/djnorthrealm/djnorthrealm_atlas_snj985h_54418c0c23166ac0751e6cbfa1183352.mmc','DJNorthrealm_atlas_snj985h',None,'snowy northern village'),
 'trading':('assets/Android/ui/tradefes/tradefes_atlas0_b0a738dd638d4f6603e5070079fbdba2.mmc','TradeFes_atlas0',(752,0,1502,1800),'trade festival market street'),
 'fountain':('assets/Android/ui/lottery/lottery_atlas_qrymf_ec48c094973dc49803a251d7d9cdc2d4.mmc','Lottery_atlas_qrymf',None,'magic spring'),
 'banquets':('assets/Android/ui/ceremony/ceremony_atlas_l8wo1nupism_e91e9e3c52f5f38180fa965573456ed8.mmc','Ceremony_atlas_l8wo1nupism',None,'hall with banquet tables'),
 'apothecary':('assets/Android/art_simgame6/ui/simgame6/simgame6_atlas_eeit1nupl3c_946d714eb29d1896533d298aed1eb567.mmc','SimGame6_atlas_eeit1nupl3c',None,'alchemy shop interior'),
 'museum':('assets/Android/ui/museum/museum_atlas_k6bq1nupmzp_e466ca6a71e0a60a575218c5ff779a8b.mmc','Museum_atlas_k6bq1nupmzp',None,'museum display case'),
 'treasure':('assets/Android/ui/challenge/challenge_atlas_yh7x1nupjfr_e4ff410b071e5e1e55d384c639fe8023.mmc','Challenge_atlas_yh7x1nupjfr',None,'desert oasis ruins'),
 'fishing':('assets/Android/ui/lottery/lottery_atlas_tty31nupo0u_f1f16d3d1549816295c444d14c1a6e25.mmc','Lottery_atlas_tty31nupo0u',None,'beach with pier'),
 'expo':('assets/Android/ui/lottery/lottery_atlas_n6ea1nupkuy_030678e50048506c61661ad7dcd5c14a.mmc','Lottery_atlas_n6ea1nupkuy',None,'forest glade'),
 'journey':('assets/Android/img/battle/bg/bg_mountain_01/bg_mountain_01_boss_f8d4b44d9eb325a5331749360bc00af4.mmc','Bg_Mountain_01_Boss',None,'mountain road'),
 'raphael':('assets/Android/ui/raphaelstage/raphaelstage_atlas1_e51471f196f52dc155cfa027548bf08a.mmc','RaphaelStage_atlas1',(0,0,750,1800),'Raphael stage'),
}
root=Path(__file__).resolve().parents[1];out=root/'public/assets/facility-scenes';out.mkdir(exist_ok=True)
rows={}
with zipfile.ZipFile('/Users/westmanfamily/Desktop/ISEKAI/UnityDataAssetPack.apk') as z:
 for fid,(entry,texture,crop,note) in PICKS.items():
  b=z.read(entry);assert b[32:40]==b'UnityFS\0',entry
  im=next(o.parse_as_object().image for o in UnityPy.load(b[32:]).objects if o.type.name=='Texture2D' and o.parse_as_object().m_Name==texture).convert('RGB')
  if crop:im=im.crop(crop)
  buf=io.BytesIO();im.save(buf,'WEBP',quality=80,method=6);data=buf.getvalue();(out/f'{fid}.webp').write_bytes(data)
  rows[fid]={'src':f'facility-scenes/{fid}.webp','texture':texture,'source':entry,'sourceSha256':hashlib.sha256(b).hexdigest(),'crop':list(crop) if crop else None,'width':im.width,'height':im.height,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'note':note}
(root/'lib/facility-scene-data.json').write_text(json.dumps({'provenance':'Readable UnityFS payload at offset32; static Texture2D extraction only. Facility-to-backdrop matching is local; crossover-event art was not used.','scenes':rows},indent=2)+'\n')
print(len(rows),'scenes',sum(r['bytes'] for r in rows.values()),'bytes')
