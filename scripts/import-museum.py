"""Import literal museum descriptions; never infer missing numeric effects."""
import hashlib, json, re
from pathlib import Path
app=Path(__file__).resolve().parents[1]
source=app.parents[1]/'outputs/component-research/datasets/Item.json'
raw=source.read_bytes()
text={r['id']:r['en'] for r in json.loads(raw)}
manifestPath=app.parents[1]/'outputs/online-audit/public-reference/wiki/wiki_manifest.json'
manifestBytes=manifestPath.read_bytes()
public={r['id']:r for r in json.loads(manifestBytes)['entries'] if r['category']=='museum exhibits'}
records=[]
for key,description in text.items():
 if not key.startswith('Item:description:Collection'): continue
 ident=key.split(':')[-1]
 entry=public[ident]
 hall=re.search(r' · (Hall\d+) · ',entry['summary']).group(1)
 assert hall=='Hall1'
 effect=None
 if 'granting +2 Aptitude to all Fellows.' in description: effect={'stat':'aptitude','amount':2}
 elif "increasing all Fellows' basic Power by 2%." in description: effect={'stat':'basicPowerPercent','amount':2}
 elif "increasing all Fellows' Power by 2%." in description: effect={'stat':'powerPercent','amount':2}
 records.append({'id':ident,'name':text['Item:name:'+ident],'description':description,'effect':effect,'sourceKey':key,'hall':hall,'hallSource':'https://zik-ascend.github.io/isl-tools/wiki/'+entry['url']})
assert len(records)==32 and sum(r['effect'] is not None for r in records)==6
(app/'lib/museum-data.json').write_text(json.dumps({'source':'Readable English translation TextAsset / UnityDataAssetPack.apk; APK source set 1.7702','datasetSha256':hashlib.sha256(raw).hexdigest(),'hallSnapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','hallManifestSha256':hashlib.sha256(manifestBytes).hexdigest(),'records':records},indent=2,ensure_ascii=False)+'\n')

rulesPath=app.parents[1]/'outputs/component-research/datasets/Rule.json'
rules=[r for r in json.loads(rulesPath.read_text()) if r['id'].startswith('Rule:text:MuseumHall1_')]
(app/'lib/museum-rule-evidence.json').write_text(json.dumps({'source':'Readable APK 1.7702 English translation','records':rules},indent=2)+'\n')
