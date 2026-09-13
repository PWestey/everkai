"""Match public employee-rate facts to readable local business identities."""
from pathlib import Path
import json,hashlib
app=Path(__file__).resolve().parents[1]
# Absolute, like the importers that still run. The old app.parents[1] base resolved to /Users and
# had left this script unrunnable; see docs/backlog.md, five more importers share that fault.
source=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/referenced-chatgpt-conversation-this-is-an/outputs/component-research/text/c884ee22dfd491ce.bin')
raw=source.read_bytes();text={r['id']:r['en'] for r in json.loads(raw)['translate']}
# Curated numeric facts from Building_Operations, not downloaded code.
# CORRECTED 2026-09-12 (BUG-19): Clinic was 20 and Museum 50, transposing the original's
# BuildingBase.yield.count, which gives Building_901 (Museum) 20 and Building_1401 (Clinic) 50.
# Keying this dict by NAME rather than by id is what let the two swap unnoticed.
# WARNING -- THE SHIPPED DATA IS STILL WRONG ON PURPOSE. lib/business-data.json has NOT been
# regenerated from this dict, so running this script WILL change it. Do not regenerate until the save
# migration lands: validBusinesses (lib/businesses.mjs:44) pins a saved staffingYield.retainedRate
# against BUSINESSES[].employeeRate, so corrected data makes every save that hired at the Museum or
# Clinic under original progression fail valid(), and decode() throws "Invalid business workforce".
# The fix is corrected here first so the next importer run cannot silently reinstate the error.
rates={'Inn':1,'Apothecary':2,'Workshop':3,'Scroll Shop':4,'Spring Resort':6,'Central Station':8,'Patisserie':10,'Archery Range':15,'Museum':20,'Market Street':25,'Bank':30,'Tailor Shop':35,'Sports Park':40,'Clinic':50,'Theater':60,'Airship':70,'Magic Academy':80}
types={'Inn':'Diligent','Apothecary':'Informed','Workshop':'Brave','Scroll Shop':'Inspiring','Spring Resort':'Unfettered','Central Station':'Inspiring','Patisserie':'Diligent','Archery Range':'Brave','Clinic':'Informed','Market Street':'Unfettered','Bank':'Inspiring','Tailor Shop':'Diligent','Sports Park':'Brave','Museum':'Informed','Theater':'Unfettered'}
records=[]
for key,name in text.items():
 if key.startswith('BuildingBase:name:') and name in rates:
  ident=key.split(':')[-1]
  records.append({'id':ident,'name':name,'description':text['BuildingBase:desc:'+ident],'type':types.get(name),'employeeRate':rates[name],'sourceKey':key})
records.sort(key=lambda r:r['employeeRate']);assert len(records)==17
# Opening price, from the original's own BuildingBase table. Item id 3 is Gold (Item:name:3). The
# campaign packet behind lib/opening-data.json carries only the opening chapter's four buildings, so
# the full eighteen-row table is read here instead; without it thirteen businesses have no price.
bases=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/isekai-parallel-roaming/data/BuildingBase.json')
basesRaw=bases.read_bytes()
assert hashlib.sha256(basesRaw).hexdigest()=='147f9b73e7a69b664f466e36131bc4fc4e6b5707cb2052895e66767138e58491'
byId={row['_id']:row for row in json.loads(basesRaw)['BuildingBase']}
for r in records:
 row=byId[r['id']]
 gold=next(c for c in row['consume'] if str(c['id'])=='3')
 r['cost']=int(gold['count']);r['order']=row['order'];r['cityLandId']=row['cityLandId']
assert all(r['cost']>0 for r in records)
assert [r['cost'] for r in sorted(records,key=lambda r:r['order'])]==sorted(r['cost'] for r in records)
data={'localSource':'Readable English UnityFS translation TextAsset, APK 1.7702 source set','localSha256':hashlib.sha256(raw).hexdigest(),'publicSources':['https://isekai.wiki/index.php?title=Building_Operations&oldid=1487','https://isekai.wiki/Village'],'inspected':'2026-09-07','operationScope':{'expression':'sum(owned Fellow Power)/1000','confidence':'community-corroborated, underlying Power reconstructed','sources':['https://www.reddit.com/r/Isekai_Slow_Life/comments/17bq81z/','https://www.reddit.com/r/Isekai_Slow_Life/comments/1k7n80f/'],'localSourceKey':'UI_Lobby_Panel_PanelBuildingTips_n25'},'costSource':{'file':'BuildingBase.json','sha256':hashlib.sha256(basesRaw).hexdigest(),'field':'consume where item id 3 (Gold)','note':'Opening prices, order and cityLandId are the original table\'s own values. The campaign packet behind lib/opening-data.json carries only the four opening-chapter buildings.'},'slotThresholds':[0,50,200,800,5000],'records':records}
(app/'lib/business-data.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
