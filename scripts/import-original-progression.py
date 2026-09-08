"""Use curated recovered rows; no extraction or source-server access."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];d=json.loads((root.parent/'isekai-research/notes/original-progression-data.json').read_text());assert len(d['levels'])==750 and len(d['quality'])==14
(root/'lib/original-progression-data.json').write_text(json.dumps(d,separators=(',',':'))+'\n')
