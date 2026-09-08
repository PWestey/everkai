from pathlib import Path
import json,hashlib
app=Path(__file__).resolve().parents[1];root=app.parent.parent
p=root/'outputs/component-research/datasets/Item.json';items={r['id']:r['en'] for r in json.loads(p.read_text())};id='Item_Strengthen_Equipment_1';assert items['Item:name:'+id]=='Magic Ore';assert items['Item:description:'+id]=='A magic ore commonly used in the forge. Used to upgrade Artifacts.'
stage=json.loads((app/'lib/raphael-progress-data.json').read_text());ms=[r for r in stage['milestones'] if r['itemId']==id];assert [(r['threshold'],r['quantity']) for r in ms]==[(390,25),(1200,50)]
rule=json.loads((app/'lib/artifact-rules.json').read_text())['records']['Item_Weapon_Equipment_1_1'];assert (rule['ore'],rule['perLevel'],rule['recycle'])==(10,1,5)
out={'itemId':id,'name':items['Item:name:'+id],'description':items['Item:description:'+id],'itemSourceKey':'Item:description:'+id,'itemSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'milestones':ms,'milestoneSource':'raphael-progress-data.json','proofArtifact':'Item_Weapon_Equipment_1_1','artifactRule':rule,'boundary':'Same Magic Ore identity moved from earned locker to existing Forge storage, one for one. Existing local event execution and cap20 remain; historical claims/investments not repriced.'}
(app/'lib/forge-reward-data.json').write_text(json.dumps(out,indent=2)+'\n');print('Two earned Ore milestones joined to existing artifact progression')
