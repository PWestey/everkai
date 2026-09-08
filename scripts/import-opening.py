#!/usr/bin/env python3
"""Project reviewed source packet into the opening journey; no decoding/network."""
import json,hashlib
from pathlib import Path
src=Path('/Users/westmanfamily/Documents/Codex/2026-09-08/isekai-source-research/outputs/campaign-opening-evidence.json')
assert hashlib.sha256(src.read_bytes()).hexdigest()=='4c6ebbeba863dbad5b28a88e47a7ac54ba5c63c74fce6cfefec8320ef4f2ad26'
x=json.loads(src.read_text())
keys=['battles','bosses','tasks','nextDeferredTask','stageEvents','cityEncounters','ranks','rewards','items','firstOperationSkillLevels','heroTrainingLevels','buildingBases','innRecipes']
out={k:x[k] for k in keys}
out['provenance']={'packetSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'policy':'Recovered APK tables; authored private-server transaction reference; browser adapters explicit, not original backend parity.'}
Path('lib/opening-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
