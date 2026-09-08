"""Match public employee-rate facts to readable local business identities."""
from pathlib import Path
import json,hashlib
app=Path(__file__).resolve().parents[1]
source=app.parents[1]/'outputs/component-research/text/c884ee22dfd491ce.bin'
raw=source.read_bytes();text={r['id']:r['en'] for r in json.loads(raw)['translate']}
# Curated numeric facts from Building_Operations, not downloaded code.
rates={'Inn':1,'Apothecary':2,'Workshop':3,'Scroll Shop':4,'Spring Resort':6,'Central Station':8,'Patisserie':10,'Archery Range':15,'Clinic':20,'Market Street':25,'Bank':30,'Tailor Shop':35,'Sports Park':40,'Museum':50,'Theater':60,'Airship':70,'Magic Academy':80}
types={'Inn':'Diligent','Apothecary':'Informed','Workshop':'Brave','Scroll Shop':'Inspiring','Spring Resort':'Unfettered','Central Station':'Inspiring','Patisserie':'Diligent','Archery Range':'Brave','Clinic':'Informed','Market Street':'Unfettered','Bank':'Inspiring','Tailor Shop':'Diligent','Sports Park':'Brave','Museum':'Informed','Theater':'Unfettered'}
records=[]
for key,name in text.items():
 if key.startswith('BuildingBase:name:') and name in rates:
  ident=key.split(':')[-1]
  records.append({'id':ident,'name':name,'description':text['BuildingBase:desc:'+ident],'type':types.get(name),'employeeRate':rates[name],'sourceKey':key})
records.sort(key=lambda r:r['employeeRate']);assert len(records)==17
data={'localSource':'Readable English UnityFS translation TextAsset, APK 1.7702 source set','localSha256':hashlib.sha256(raw).hexdigest(),'publicSources':['https://isekai.wiki/index.php?title=Building_Operations&oldid=1487','https://isekai.wiki/Village'],'inspected':'2026-09-07','operationScope':{'expression':'sum(owned Fellow Power)/1000','confidence':'community-corroborated, underlying Power reconstructed','sources':['https://www.reddit.com/r/Isekai_Slow_Life/comments/17bq81z/','https://www.reddit.com/r/Isekai_Slow_Life/comments/1k7n80f/'],'localSourceKey':'UI_Lobby_Panel_PanelBuildingTips_n25'},'slotThresholds':[0,50,200,800,5000],'records':records}
(app/'lib/business-data.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
