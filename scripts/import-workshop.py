"""Workshop products from the original's own tables.

NEVER parse the English description. `SimGame2Forge:description:1001` reads
"Sales Exp +30, Workshop coin +12/sec, sales time 300 sec" -- and the "/sec" is WRONG.
`Reward_SimGame2_Forge_01..10` are randomType "Fix" ONE-SHOT grants of Item_Token_SG2,
referenced by SimGame2Forge.reward once per COMPLETED craft, while the same row carries
the duration. Reading the text as a rate inflated Workshop coins x736 (BUG-20).
"""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')

def table(name):
    """Structure first: some tables wrap a list in a dict, others are a bare list."""
    raw=json.loads((CFG/name).read_bytes())
    inner=next(iter(raw.values())) if isinstance(raw,dict) and len(raw)==1 else raw
    return list(inner.values()) if isinstance(inner,dict) else inner

forge=table('SimGame2Forge.json')
rewards=table('split_reward/reward_simgame2.json')          # BARE top-level list
grant={r['_id']:next(int(c['count']) for c in r['content'] if c['id']=='Item_Token_SG2') for r in rewards}

names=json.loads((root/'lib/workshop-data.json').read_bytes())['records']
label={r['id']:r['name'] for r in names}
records=[{'id':row['_id'],'name':label[row['_id']],'salesXP':int(row['SG2Exp']),
          'coins':grant[row['reward']],                     # flat, per completed craft
          'seconds':int(row['time']),
          'evidenceKey':f"SimGame2Forge:{row['_id']}+{row['reward']}"} for row in forge]

assert len(records)==50
assert 'coinsPerSecond' not in json.dumps(records), 'the per-second misreading must not come back'
assert sum(r['coins'] for r in records)==2000, 'one craft of each of the 50 pays 2,000'
src=(CFG/'SimGame2Forge.json').read_bytes()
out={'source':'Original config tables: SimGame2Forge + reward_simgame2','sha256':hashlib.sha256(src).hexdigest(),
     'records':records,'rules':json.loads((root/'lib/workshop-data.json').read_bytes())['rules'],
     'sandbox':json.loads((root/'lib/workshop-data.json').read_bytes())['sandbox']}
(root/'lib/workshop-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('Imported',len(records),'products; coins are flat per completed craft')
