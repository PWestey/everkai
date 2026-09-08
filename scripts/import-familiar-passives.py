"""Import the audited, complete P1 self-stat subset. No protected assets."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
d=json.loads((root.parent/'isekai-research/notes/familiar-passive-audit.json').read_text())
rows=[{k:r[k] for k in ('id','name','slot','skillId','text','source','pageSha256','field','percent')}|{'stage':r['unlock']['stage']} for r in d['selected']]
assert len(rows)==25 and len({r['id'] for r in rows})==25
(root/'lib/familiar-passive-data.json').write_text(json.dumps({'snapshot':d['snapshot'],'policy':'v7 battle-only self-stat P1; floor initialized base once; automatic stage progression is local','skills':rows},indent=2)+'\n')
