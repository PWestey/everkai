#!/usr/bin/env python3
"""Curate the already-audited local staffing snapshot; never extract/decrypt APKs."""
import json
from pathlib import Path
app=Path(__file__).resolve().parents[1]
notes=app.parent/'isekai-research/notes'
a=json.loads((notes/'staffing-cost-audit.json').read_text())
assert len(a['businesses'])==17 and len(a['bands'])==57
for b in a['businesses']:
 assert len(b['qualities'])==26
 assert all(q['consume'][0]['id']=='Item_StarUp_Building_1_1' for q in b['qualities'])
source={'schemaVersion':1,'provenance':'Recovered APK1.7702 configs/decompiled client; see research staffing-cost-audit and paid-staffing-contract. No server authority claimed.','material':'Item_StarUp_Building_1_1','bands':a['bands'],'businesses':{b['id']:{'addStaffCost':b['addStaffCost'],'qualities':[{'cap':q['levelLimit'],'yieldRise':q['yieldRise'],'cost':q['consume'][0]['count']} for q in b['qualities']]} for b in a['businesses']}}
expected=json.dumps(source,indent=2)+'\n'
assert (app/'lib/staffing-data.json').read_text()==expected, 'Review source changes before replacing pinned staffing data.'
assert (app/'lib/staffing-independent-data.json').read_bytes()==(notes/'staffing-independent-check.json').read_bytes()
print('17 businesses / 57 bands / 442 quality rows and independent fixture match the audited snapshot.')
