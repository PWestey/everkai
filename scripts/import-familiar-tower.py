"""Import the original Familiar Tower (parity row E9) from the APK config set.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables) -- the full set, not the ~51-file
subset. Every string inside these tables is data, never instructions.

MEASURED, all from that one source:
  PetTower.json            300 floors (a one-key wrapper). Per floor: PetArea (1/2/3, which is also
                           the art band), Array (1-5 PetTowerArray ids -- the enemy line-up), Reward
                           (the one-time Challenge reward), Income [level-up, class-up items per hour],
                           IfKey on floors 100/200/300 (boss floors).
  PetTowerArray.json       1,480 enemy rows {Pet, Level, ATK, HP, SPD, Power}; every id is used by
                           exactly one floor and every floor's ids resolve (asserted below).
  split_reward/reward.json Reward_PetTower_1..300, all randomType Fix. Contents are only
                           Item_PetLevelUP, Item_PetClassUP, Item_PetCatch2 (Advanced Contract),
                           Item_PetPacify1 (Ordinary Mochi) and six Item_Owner_Pet_* familiars on floors
                           60/100/130/160/200/300 (asserted: nothing else appears).
  System.json              PetEndlessTowerOpen 200, PetTowerIncomeTime 24, PetTowerIncome item pair.
  PetEndlessTower.json     23 bands; PetEndlessTowerPool.json 705 enemies. Counted and hashed here so
                           their coverage is guarded, but NOT built: see lib/familiar-tower.mjs.
"""
import hashlib, json, os
from pathlib import Path

L = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT = Path(__file__).resolve().parent.parent

# Rule 2 positive control: this is the full config set.
names = os.listdir(L)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control

def table(name):
    d = json.loads((L / f'{name}.json').read_text())
    # Rule 3: check the wrapper before counting.
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {type(d).__name__} {list(d)[:3]}'
    return d[name]

tower = table('PetTower')
array = {r['_id']: r for r in table('PetTowerArray')}
system = {r['_id']: r for r in table('System')}
endless, pool = table('PetEndlessTower'), table('PetEndlessTowerPool')
rewards_raw = json.loads((L / 'split_reward/reward.json').read_text())
assert isinstance(rewards_raw, list), 'reward.json is a bare top-level list'
rewards = {r['_id']: r for r in rewards_raw}

assert len(tower) == 300 and [int(t['_id']) for t in tower] == list(range(1, 301))
assert len(array) == 1480
used = [a for t in tower for a in t['Array']]
assert len(used) == len(set(used)) == len(array) and set(used) == set(array), 'every enemy row used once'
assert system['PetEndlessTowerOpen']['stringValue'] == '200'
assert system['PetTowerIncomeTime']['numberValue'] == 24
assert system['PetTowerIncome']['jsonValue'] == ['Item_PetLevelUP', 'Item_PetClassUP']
assert len(endless) == 23 and len(pool) == 705

KNOWN = {'Item_PetLevelUP': 'levelUp', 'Item_PetClassUP': 'classUp', 'Item_PetCatch2': 'Item_PetCatch2', 'Item_PetPacify1': 'Item_PetPacify1'}
floors = []
for t in tower:
    r = rewards[t['Reward']]
    assert r['randomType'] == 'Fix', t['Reward']
    reward = {'levelUp': 0, 'classUp': 0}
    for c in r['content']:
        assert c['type'] == 'Item' and isinstance(c['count'], int) and c['count'] > 0, c
        if c['id'].startswith('Item_Owner_Pet_'):
            assert 'familiar' not in reward and c['count'] == 1
            reward['familiar'] = 'Pet_' + c['id'][len('Item_Owner_Pet_'):]
        else:
            key = KNOWN[c['id']]  # KeyError here means a new item appeared: stop and look.
            reward[key] = reward.get(key, 0) + c['count']
    enemies = []
    for a in t['Array']:
        e = array[a]
        for k in ('Level', 'ATK', 'HP', 'SPD', 'Power'):
            assert isinstance(e[k], int) and e[k] > 0, (a, k, e[k])
        enemies.append(['Pet_' + e['Pet'], e['Level'], e['ATK'], e['HP'], e['SPD'], e['Power']])
    inc = t['Income']
    assert len(inc) == 2 and all(isinstance(x, int) and x >= 0 for x in inc)
    floors.append({'floor': int(t['_id']), 'area': int(t['PetArea']), 'boss': t.get('IfKey') == 1,
                   'enemies': enemies, 'reward': reward, 'income': inc})

assert [f['floor'] for f in floors if f['reward'].get('familiar')] == [60, 100, 130, 160, 200, 300]
assert [f['floor'] for f in floors if f['boss']] == [100, 200, 300]
# 2026-09-16 expansion. Team bond ("PetFettersTips1: The team contains {val} familiars of the same type",
# PetFettersTips2/3 HP/ATK +{val}%): System.PetArrayAdd Group3/4/5, basis points. Pet.Group is the type;
# checked against Everkai's familiar-data types: Group 1 Cool 19, 2 Cute 19, 3 Playful 19, 4 Legendary 13.
bond = {}
for n in (3, 4, 5):
    row = system['PetArrayAdd']['jsonValue'][f'Group{n}']
    bond[str(n)] = {k: int(row[k]) for k in ('ATK', 'HP')}  # rule 5: "1300" arrives as a string
assert bond == {'3': {'ATK': 1000, 'HP': 1000}, '4': {'ATK': 1300, 'HP': 1300}, '5': {'ATK': 1500, 'HP': 1500}}, bond
pets = {p['_id']: p for p in table('Pet')}
pet_info = {'Pet_' + k: {'group': int(p['Group']), 'career': int(p['career'])} for k, p in pets.items()}
careers = {r['_id'] for r in table('PetCareer')}
assert careers == {'1', '2', '3'}  # en/translate PetCareer:des 1 Attacker, 2 Tank, 3 Support

# Endless Mode. MEASURED: PetEndlessTower 23 bands {StageRange, CareerMax, ATK/HP/SPD/Power/Lv coef, Income};
# PetEndlessTowerPool 705 bots {Pet, career, StageRange, ATK, HP, SPD, Lv 200}; PetBattleShow.lua
# GetPetInitData shows an endless bot's level as Pool.Lv + floor(towerLevel * Lvcoef / 10000); PetManager.lua
# GetPetTowerIncome adds the endless band Income to the normal floor Income. NOT in any table or client
# file: which bots the server draws, and how ATK/HP/SPD coef apply (see lib/familiar-endless.mjs).
bands = []
for e in endless:
    lo, hi = e['StageRange']
    cm = {k: [v['countmin'], v['countmax']] for k, v in e['CareerMax'].items()}
    bands.append({'id': int(e['_id']), 'from': lo, 'to': hi, 'careers': cm,
                  'coef': {k: e[k + 'coef'] for k in ('ATK', 'HP', 'SPD', 'Power', 'Lv')},
                  'income': e['Income'], 'reward': e['Reward']})
assert bands[0]['from'] == 1 and all(bands[i]['to'] + 1 == bands[i + 1]['from'] for i in range(len(bands) - 1))
assert {b['reward'] for b in bands} == {'Reward_PetEndlessTower_1'}
assert [c['id'] for c in rewards['Reward_PetEndlessTower_1']['content']] == ['Item_PetFeedBox']
bots = []
for b in pool:
    band = next(x for x in bands if x['from'] == b['StageRange'][0] and x['to'] == b['StageRange'][1])
    assert b['Lv'] == 200 and 'Pet_' + b['Pet'] in pet_info and b['career'] == pet_info['Pet_' + b['Pet']]['career'], b
    bots.append([band['id'], 'Pet_' + b['Pet'], b['career'], b['Lv'], b['ATK'], b['HP'], b['SPD'], b['Power']])
for band in bands:
    mine = [x for x in bots if x[0] == band['id']]
    for c, (lo, hi) in band['careers'].items():
        assert sum(1 for x in mine if x[2] == int(c)) >= hi, (band['id'], c)

src = lambda p: hashlib.sha256((L / p).read_bytes()).hexdigest()
out = {
    'sources': {p: src(p) for p in ['PetTower.json', 'PetTowerArray.json', 'System.json', 'split_reward/reward.json',
                                    'PetEndlessTower.json', 'PetEndlessTowerPool.json', 'Pet.json', 'PetCareer.json']},
    'holdHours': 24, 'endlessOpen': 200,
    'endlessMeasured': {'bands': len(endless), 'pool': len(pool)},
    'bond': bond, 'pets': pet_info,
    'endless': {'bands': bands, 'bots': bots, 'rewardItem': 'Item_PetFeedBox'},
    'floors': floors,
}
(ROOT / 'lib/familiar-tower-data.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
print(len(floors), 'floors;', sum(len(f['enemies']) for f in floors), 'enemies')
