"""Import curated recovered pricing; never re-extract containers or scripts."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
d=json.loads((root.parent/'isekai-research/notes/recovered-training-costs.json').read_text())
source=Path(d['source']['path']);assert hashlib.sha256(source.read_bytes()).hexdigest()==d['source']['sha256']
assert len(d['costs'])==59 and sum(d['costs'].values())==23560
(root/'lib/original-training-costs.json').write_text(json.dumps(d,indent=2)+'\n')
