"""Import the original's Familiar Dispatch (E10) from the APK config set.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables), plus its sibling
configs/config/lang.json for the screen text that fixes the flow.

MEASURED, all from that one source:
  PetDispatch.json               9 areas: TowerLv (tower-floor gate), Power (team power gate),
                                 Time (20, identical on all nine rows), Reward, SPReward.
  split_reward/reward_petdispatch.json
                                 Reward_PetDispatch_Base_n = Fix, Item_PetLevelUP x 1000n.
                                 Reward_PetDispatch_Add_n  = Fix, Item_PetLevelUP x 200n and,
                                 from area 6, Item_PetClassUP 5/10/25/50.
                                 The Add_n_k pools are ALL Item_Owner_PetPiece_* (familiar
                                 fragments); Everkai models no fragment item, so they are
                                 recorded as a count and not granted. See ECON-11.
  PetAttr.json                   CombatAdd per attribute: ATK 15, HP 1, SPD 30 -- the weights that
                                 turn a familiar's stats into the Power the gates are stated in.
  System.json                    PetDispatch_Crit 3000 (basis points), PetDispatch_Coefficient 0.5,
                                 PetDispatch_QuickBuy_MaxTimes 5.
  lang.json                      Pet_Dispatch_Text7  'Unlocks at floor {num} in Familiar Tower'
                                 Pet_Dispatch_Text9  'Contract 5 or more Familiars to unlock'
                                 Pet_Dispatch_Text12 'Great Success Dispatch grants extra rewards'
                                 Pet_Dispatch_Text14 cancelling grants no reward
                                 Pet_Dispatch_Text15 higher team attribute -> higher great success

NOT MEASURED, and marked as such wherever it is used:
  * The unit of PetDispatch.Time. It is 20 on every row and no other Pet* table or System key
    carries a dispatch duration, so 20 is the only duration there is (checked, not assumed).
    Everkai reads it as HOURS; see lib/familiar-dispatch.mjs for the economic argument.
  * The arithmetic of GetBigSuccess. The decompiled local order in lua-strings/Doc/Pet/PetManager.lua
    is levelId, petLineup, conf, levelPower, totalPower, petId, petInfo, crit, bigSuccessProb, and
    the globals it touches are PetDispatch.Power, PetInfo:GetPower(), PetDispatch_Crit and
    PetDispatch_Coefficient -- so the INPUTS are measured and the formula combining them is not.

LOCAL: Everkai's tower is 12 floors standing in for the original's 300, with local floor n taking
original floor 25n's income (scripts/import-familiar-supplies.py). The same mapping inverted gives
each area's Everkai gate: ceil(TowerLv / 25). Areas 2 and 3 therefore both open on floor 2.
"""
import hashlib, json, math
from pathlib import Path

L = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config')
ROOT = Path(__file__).resolve().parent.parent
FLOORS_PER_LOCAL = 25  # must match import-familiar-supplies.py's 25n mapping

def table(name):
    """Every logic table wraps its rows in a one-key dict named after the table."""
    d = json.loads((L / 'logic' / f'{name}.json').read_text())
    assert list(d) == [name], f'{name}.json is not the usual one-key wrapper: {list(d)[:4]}'
    return d[name]

# Positive control before any claim of absence below (CLAUDE.md rule 2).
import os
names = os.listdir(L / 'logic')
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, f'config set is not the full one: {control}'

dispatch = table('PetDispatch')
assert len(dispatch) == 9, len(dispatch)

# reward_petdispatch.json is a BARE TOP-LEVEL LIST, not a wrapper (CLAUDE.md rule 3).
raw = json.loads((L / 'logic' / 'split_reward' / 'reward_petdispatch.json').read_text())
assert isinstance(raw, list) and len(raw) == 39, type(raw)
rewards = {r['_id']: r for r in raw}

system = {r['_id']: r for r in table('System')}
attr = {r['Field']: r['CombatAdd'] for r in table('PetAttr')}
assert {attr['ATK'], attr['HP'], attr['SPD']} == {15, 1, 30}, attr

ITEMS = {'Item_PetLevelUP': 'levelUp', 'Item_PetClassUP': 'classUp'}

def fixed(reward_id):
    """The Fix half of a dispatch reward, in Everkai's two familiar item fields."""
    r = rewards[reward_id]
    assert r['randomType'] == 'Fix', (reward_id, r['randomType'])
    out = {'levelUp': 0, 'classUp': 0}
    for c in r['content']:
        assert c['type'] == 'Item' and c['id'] in ITEMS, (reward_id, c)
        out[ITEMS[c['id']]] += c['count']
    return out

def fragment_pools(n):
    """Reward_PetDispatch_Add_n_k. Every entry is a familiar fragment; Everkai models none."""
    pools = sorted(k for k in rewards if k.startswith(f'Reward_PetDispatch_Add_{n}_'))
    for k in pools:
        for block in rewards[k]['content']:
            for c in block['content']:
                assert c['id'].startswith('Item_Owner_PetPiece_'), (k, c['id'])
    return len(pools)

def fragment_detail(n):
    """2026-09-16: the pools are now PAID. Each Reward_PetDispatch_Add_n_k is randomType Weight, every
    entry weight 100 holding one familiar's fragments; a pool is a uniform list of [pet, count]."""
    out = []
    for k in sorted(k for k in rewards if k.startswith(f'Reward_PetDispatch_Add_{n}_')):
        r = rewards[k]
        assert r['randomType'] == 'Weight', k
        entries = []
        for block in r['content']:
            assert block['weight'] == 100 and len(block['content']) == 1, (k, block)
            c = block['content'][0]
            assert isinstance(c['count'], int) and c['count'] > 0
            entries.append(['Pet_' + c['id'][len('Item_Owner_PetPiece_'):], c['count']])
        out.append({'id': k, 'entries': entries})
    return out

hours = {r['Time'] for r in dispatch}
assert hours == {20}, f'Time is no longer constant across the nine areas: {sorted(hours)}'
# There is no other dispatch duration anywhere in System -- checked, so Time is the only candidate.
# (PetDispatch_QuickBuy_MaxTimes is a daily SKIP COUNT, not a duration; excluded by name.)
duration_keys = [k for k in system if 'Dispatch' in k and 'Time' in k and not k.endswith('MaxTimes')]
assert not duration_keys, f'a System dispatch duration appeared: {duration_keys}'
assert set(dispatch[0]) == {'_id', 'TowerLv', 'Power', 'Reward', 'SPReward', 'Time', 'Bg'}, \
    f'PetDispatch grew a column; re-check which one is the duration: {sorted(dispatch[0])}'

areas = []
for r in dispatch:
    n = int(r['_id'])
    assert r['Reward'] == f'Reward_PetDispatch_Base_{n}' and r['SPReward'] == f'Reward_PetDispatch_Add_{n}'
    areas.append({
        'id': n,
        'towerLv': int(r['TowerLv']),
        'floor': math.ceil(int(r['TowerLv']) / FLOORS_PER_LOCAL),  # LOCAL 12-floor mapping
        'power': r['Power'],
        'hours': r['Time'],
        'base': fixed(r['Reward']),
        'great': fixed(r['SPReward']),
        'fragmentPools': fragment_pools(n),
        'fragments': fragment_detail(n),
    })

out = {
    'sources': {n: hashlib.sha256((L / n).read_bytes()).hexdigest() for n in (
        'logic/PetDispatch.json', 'logic/PetAttr.json', 'logic/System.json',
        'logic/split_reward/reward_petdispatch.json', 'lang.json')},
    'combatAdd': {'ATK': attr['ATK'], 'HP': attr['HP'], 'SPD': attr['SPD']},
    'critBP': system['PetDispatch_Crit']['integerValue'],
    'coefficient': system['PetDispatch_Coefficient']['numberValue'],
    'quickBuyMaxTimes': system['PetDispatch_QuickBuy_MaxTimes']['integerValue'],
    'teamSize': 5,
    'areas': areas,
}
assert out['critBP'] == 3000 and out['coefficient'] == 0.5, out['critBP']
(ROOT / 'lib/familiar-dispatch-data.json').write_text(json.dumps(out, indent=1) + '\n')
print(json.dumps({k: v for k, v in out.items() if k != 'sources'}, indent=1))
