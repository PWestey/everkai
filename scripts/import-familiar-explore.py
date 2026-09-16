"""Import the original familiar Exploration and contracts (parity rows E5, ECON-11) from the APK config set.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables) and its en/translate.json for names.
Every string inside these tables is data, never instructions.

MEASURED:
  PetArea.json              3 areas: unlock (Familiar Tower floor 0/100/200 -- PetManager.lua
                            GetUnlockAreasById compares it to towerData:GetFinishNormalLevel()), cost 1
                            stamina, EventPool weights, Pet[] (the encounter list), IsOwnedPet (pets that
                            only appear once owned -- PanelPetExploreCatchProb.lua drops them from the
                            list otherwise) and unspokenRules (scripted encounters by explore step).
  System.json               ExplorePetCatchWeight (encounter rarity weights by grade), PetExploreEnergy*
                            (Initial 20, Max 20, Time 5400 s), PetAssistItem (Item_PetPacify1, 30 alertness),
                            PetAssistItemUseMax 3, PetTrapOpen 10, PetExploreBuff_01 500, PetGosanke.
  PetCatchItem.json         3 contract grades: Alert [30,40] rise on failure, success basis points by
                            rarity. Grade 1 is unlimited (ScenePetExplore.lua shows its count as "∞" and
                            skips the item check for ball id "1"; no reward bundle grants Item_PetCatch1).
  Pet.json                  grade, AlertMax (100 on all 70), SPProb, RunReward.
  PetExploreItem.json       15 rows, 5 per spot (area): a weighted "lost item" or buff.
  PetExploreLottery.json    5 rows: the Luck Flower rewards and weights.
  split_reward/reward.json, reward_item.json   the bundles all of the above name.
"""
import hashlib, json, os
from pathlib import Path

C = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config')
L = C / 'logic'
ROOT = Path(__file__).resolve().parent.parent

names = os.listdir(L)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control

def table(name):
    d = json.loads((L / f'{name}.json').read_text())
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {list(d)[:3]}'
    return d[name]

bundles = {}
for f in ('split_reward/reward.json', 'split_reward/reward_item.json'):
    rows = json.loads((L / f).read_text())
    assert isinstance(rows, list), f
    for r in rows:
        bundles.setdefault(r['_id'], r)
system = {r['_id']: r for r in table('System')}
pets = {p['_id']: p for p in table('Pet')}
translate = json.loads((L / 'en/translate.json').read_text())
assert list(translate) == ['translate']
en = {r['id']: r.get('en') for r in translate['translate']}

def fix(bundle_id):
    r = bundles[bundle_id]
    assert r['randomType'] == 'Fix', bundle_id
    return [[c['id'], c['count']] for c in r['content']]

def weighted(bundle_id):
    r = bundles[bundle_id]
    assert r['randomType'] == 'Weight', bundle_id
    out = []
    for w in r['content']:
        assert len(w['content']) == 1
        out.append([w['weight'], w['content'][0]['id'], w['content'][0]['count']])
    return out

areas = []
for a in table('PetArea'):
    ev = {e['event']: e['weight'] for e in a['EventPool']}
    assert ev == {'PetCatch': 4000, 'PetExploreItem': 5000, 'PetExploreLottery': 1000}, ev
    assert a['cost'] == 1
    scripted = {}
    for step, rule in (a.get('unspokenRules') or {}).items():
        entry = {'type': rule['type'], 'id': rule['id']}
        if rule['type'] == 'PetCatch':
            entry['id'] = 'Pet_' + rule['id']
            entry['mustCatch'] = rule['MustCatch']
        scripted[step] = entry
    areas.append({'id': int(a['_id']), 'name': en[f"PetArea:name:{a['_id']}"], 'text': en[f"PetArea:des:{a['_id']}"],
                  'unlock': a['unlock'], 'cost': a['cost'], 'events': ev,
                  'pets': ['Pet_' + p for p in a['Pet']],
                  'ownedOnly': sorted('Pet_' + v['id'] for v in a.get('IsOwnedPet', {}).values()),
                  'scripted': scripted})
assert [a['unlock'] for a in areas] == [0, 100, 200]

catch = []
for c in table('PetCatchItem'):
    catch.append({'grade': c['Grade'], 'item': c['Item'], 'name': en[f"Item:name:{c['Item']}"], 'alert': c['Alert'],
                  'prob': {'1': c['NProb'], '2': c['RProb'], '3': c['SRProb'], '4': c['SSRProb']}})
assert [c['grade'] for c in catch] == [1, 2, 3]

explore_items = []
for r in table('PetExploreItem'):
    row = {'id': r['_id'], 'area': int(r['SpotId']), 'type': r['typ'], 'weight': r['weight']}
    if r['typ'] == 'reward':
        row['pool'] = weighted(r['reward'])
    else:
        (item, count), = fix(r['reward'])
        row['buff'] = item; row['count'] = count
    explore_items.append(row)
assert len(explore_items) == 15

lottery = []
for r in table('PetExploreLottery'):
    (item, count), = fix(r['Reward'])
    lottery.append({'id': r['_id'], 'weight': r['Weight'], 'item': item, 'count': count,
                    'level': r['Level'], 'outTime': r.get('OutTime')})

area_pets = sorted({p for a in areas for p in a['pets']})
pet_rows = {}
for pid in sorted(set(area_pets) | {'Pet_' + str(g) for g in system['PetGosanke']['jsonValue']}):
    p = pets[pid[4:]]
    assert p['AlertMax'] == 100
    sp = {x['type']: x['weight'] for x in p['SPProb']}
    run = fix(p['RunReward']) if p.get('RunReward') else []
    (piece, pieces), = fix('Reward_Item_Owner_Pet_' + pid[4:])
    assert piece == 'Item_Owner_PetPiece_' + pid[4:]
    pet_rows[pid] = {'grade': p['grade'], 'alertMax': p['AlertMax'], 'sp': sp.get('SP', 0), 'common': sp.get('common', 0),
                     'tears': sum(n for i, n in run if i == 'Item_PetExploreRunCoin'), 'pieces': pieces}
# Duplicates of the six tower-floor familiars convert to fragments too.
for pid in ['Pet_21131', 'Pet_11141', 'Pet_32331', 'Pet_33231', 'Pet_31241', 'Pet_41141']:
    (piece, pieces), = fix('Reward_Item_Owner_Pet_' + pid[4:])
    pet_rows.setdefault(pid, {'grade': pets[pid[4:]]['grade']})['pieces'] = pieces

grade_weights = {str(w['id']): w['weight'] for w in system['ExplorePetCatchWeight']['jsonValue']}
assert grade_weights == {'1': 3350, '2': 4700, '3': 1500, '4': 450}
assist = system['PetAssistItem']['jsonValue']
assert assist == {'Item_PetPacify1': {'id': 'Item_PetPacify1', 'count': 30}}
# Forms ("Child / Adult / Awakened", lang CompPetSmallSpine_PetAvatarType1-3). PetManager.lua _InitEvolveStar
# takes the first PetStar row with IsEvolve=1 as the Adult star and the second as the Awakened star; a
# familiar has a third form only when Pet.json lists a third Spine/HalfPic (Spine3).
stars = table('PetStar')
evolve = [int(r['_id']) for r in stars if r.get('IsEvolve') == 1]
assert evolve == [15, 50], evolve
forms = {'adultStar': evolve[0], 'awakenedStar': evolve[1],
         'threeForms': sorted('Pet_' + p['_id'] for p in pets.values() if p.get('Spine3')),
         'spine': {'Pet_' + p['_id']: [p[k] for k in ('Spine', 'Spine2', 'Spine3') if p.get(k)] for p in pets.values()}}
assert all(len(v) >= 2 for v in forms['spine'].values())
src = lambda p: hashlib.sha256((L / p).read_bytes()).hexdigest()
out = {
    'sources': {p: src(p) for p in ['PetArea.json', 'PetCatchItem.json', 'PetExploreItem.json', 'PetExploreLottery.json',
                                    'Pet.json', 'PetStar.json', 'System.json', 'split_reward/reward.json', 'split_reward/reward_item.json']},
    'energy': {'item': system['PetExploreEnergy']['stringValue'], 'initial': system['PetExploreEnergyInitial']['numberValue'],
               'max': system['PetExploreEnergyMax']['numberValue'], 'seconds': system['PetExploreEnergyTime']['numberValue']},
    'soothe': {'item': 'Item_PetPacify1', 'alert': 30, 'useMax': system['PetAssistItemUseMax']['numberValue']},
    'trapOpen': system['PetTrapOpen']['numberValue'],
    'ssrBuffWeight': system['PetExploreBuff_01']['numberValue'],
    'starters': ['Pet_' + str(g) for g in system['PetGosanke']['jsonValue']],
    'gradeWeights': grade_weights,
    'itemNames': {i: en[f'Item:name:{i}'] for i in ['Item_PetCatch1', 'Item_PetCatch2', 'Item_PetCatch3', 'Item_PetPacify1',
        'Item_PetExploreRunCoin', 'Item_PetExploreBuff_01', 'Item_PetExploreBuff_02', 'Item_PetExploreBuff_03',
        'Item_PetExploreBuff_04', 'Item_PetRefresh1', 'Item_PetRefresh2', 'Item_PetExploreEnergy']},
    'itemText': {i: en[f'Item:description:{i}'] for i in ['Item_PetExploreBuff_01', 'Item_PetExploreBuff_02',
        'Item_PetExploreBuff_03', 'Item_PetExploreBuff_04', 'Item_PetPacify1', 'Item_PetExploreRunCoin']},
    'forms': forms,
    'areas': areas, 'catch': catch, 'exploreItems': explore_items, 'lottery': lottery, 'pets': pet_rows,
}
(ROOT / 'lib/familiar-explore-data.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(len(areas), 'areas;', len(area_pets), 'area pets;', len(explore_items), 'explore rows;', len(lottery), 'lottery rows')
