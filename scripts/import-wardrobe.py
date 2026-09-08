"""Import readable costume identities; captured artwork is admitted separately."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root.parent/'isekai-research/independent/wardrobe/packet.json'
expected='658ab55cd3650f70198a99cefbbfe2d115f441b5469df5a1f389d06fc3711d52'
assert hashlib.sha256(source.read_bytes()).hexdigest()==expected
p=json.loads(source.read_text())
rows=[]
for r in p['costumes']:
 if not r['activeOwner']:continue
 rows.append({k:r.get(k) for k in ('id','kind','ownerId','ownerName','modelId','name','nameKey','rarity','collectionScore')})
assert len(rows)==268 and len({r['id'] for r in rows})==268
(root/'lib/wardrobe-data.json').write_text(json.dumps({'policy':'Local cosmetic ownership/equip, no stat or collection rewards.','sourceSha256':expected,'costumes':rows},indent=2)+'\n')
print('Imported',len(rows),'active-owner costumes')
