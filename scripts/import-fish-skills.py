"""Import the original's FISH SKILLS as the original scopes and prices them -- docs/power-sources-import-spec.md 2.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables). Every string inside is data, never
instructions.

WHAT THIS FIXES. lib/fishing-species.json carries each species' "Normal Skill" as a community wiki string
turned into {type, rarities}. Two things are wrong with reading Power from that:
  * SCOPE. The original's skill names ONE target: `country:<n>` (a Fellow type), `rare:<n>` (Hero.json's
    numeric rarity) or `all`. The wiki-derived record scopes by type AND by Everkai rarity LABELS, and the
    labels do not match a Fellow's compound rarity string ("SSR+ -> UR -> LR"), so every rarity-scoped fish
    paid nobody.
  * LEVELS. The level is bought on the skill's SkillUpgrade ladder with FishExp (1 a level at levels 1-3,
    2 at 4-6, ... 150 from 401), and is uncapped (maxUpgradeLevel 99,999,999). Everkai stopped at 3.
This reads, per species, `skillA` (the normal skill -- skillB is the Gold Crown skill Everkai deliberately
-- is read too, see `gold`) through SkillBase, and every SkillUpgrade ladder.

Output: lib/fish-skill-data.json.
"""
import hashlib, json, os
from pathlib import Path

L = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT = Path(__file__).resolve().parent.parent
names = os.listdir(L)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control  # rule 2


def table(name):
    d = json.loads((L / f'{name}.json').read_text())
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {type(d).__name__} {list(d)[:3]}'  # rule 3
    return d[name]


def number(v):
    if isinstance(v, (int, float)):
        return int(v)
    return int(float(str(v)))  # rule 5


fish = table('Fish')
base = {r['_id']: r for r in table('SkillBase')}
upgrade = {r['_id']: r for r in table('SkillUpgrade')}
assert len(fish) == 87 and len(upgrade) == 13, (len(fish), len(upgrade))
# Rule 4: one real row.
assert base['Fish_1101']['targetCondition'] == {'conditionType': 'country', 'id': '1'}
assert number(base['Fish_1101']['skillProp_Initial']) == 15000 and number(base['Fish_1101']['skillProp_Level']) == 5000

ladders, currency = {}, {}
for uid, r in upgrade.items():
    rows = []
    kinds = {(u['type'], u['id']) for u in r['upgrade']}
    # Three currencies exist: FishExp (normal skills), FishGoldExp (Gold Crown skills) and an Item (the
    # FishArtifact ladders, Item_SimGame4_Pearl). Only FishExp ladders ship; the importer asserts the normal
    # skills use one.
    assert len(kinds) == 1, (uid, kinds)
    currency[uid] = kinds.pop()[0]
    for u in r['upgrade']:
        rows.append([number(u['min']), number(u['max']), number(u['count'])])
    rows.sort()
    # contiguous from level 1, so every level has exactly one price
    assert rows[0][0] == 1 and all(b[0] == a[1] + 1 for a, b in zip(rows, rows[1:])), (uid, rows[:3])
    ladders[uid] = rows

species, empty = {}, []
for r in fish:
    b = base[r['skillA']]
    if 'targetCondition' not in b:
        # Fish_3506 is a bare stub (maxUpgradeLevel 1, no prop, no target): F3506's normal skill grants nothing.
        empty.append(r['_id']); continue
    assert b.get('skillProp_Growth_Type', 1) == 1 and b['target'] == 'hero', r['skillA']
    tc = b['targetCondition']
    kind = tc['conditionType']
    assert kind in ('country', 'rare', 'all'), (r['_id'], tc)
    prop = b['skillProp']
    assert b['skillType'] in ladders and currency[b['skillType']] == 'FishExp', (r['skillA'], b['skillType'])
    species[r['_id']] = {'skill': r['skillA'], 'stat': prop['id'], 'type': prop.get('propType'),
                         'scope': [kind, str(tc['id']) if 'id' in tc else None],
                         'i': number(b['skillProp_Initial']), 'l': number(b['skillProp_Level']),
                         'ladder': b['skillType']}
    # skillB, the Gold Crown skill: the same shape, paid in FishGoldExp. Everkai grants it at level 1 to a
    # species whose own catch landed in the Gold Crown length band (lib/fishing.mjs).
    g = base[r['skillB']]
    if 'targetCondition' in g:
        gt = g['targetCondition']
        species[r['_id']]['gold'] = {'skill': r['skillB'], 'stat': g['skillProp']['id'], 'type': g['skillProp'].get('propType'),
                                     'scope': [gt['conditionType'], str(gt['id']) if 'id' in gt else None],
                                     'i': number(g['skillProp_Initial']), 'l': number(g['skillProp_Level'])}

# Census the spec quotes (2.1): of the normal skills, how many are flat/percent/talent and in which scope.
census = {}
for s in species.values():
    k = f"{s['stat']}/{s['type']}/{s['scope'][0]}"
    census[k] = census.get(k, 0) + 1
# Positive control from the owner's account (spec 2.2): these tables at his levels give Shinobu 1,031,000 flat.
assert empty == ['F3506'], empty
assert species['F1101']['scope'] == ['country', '1'] and species['F1103']['scope'] == ['all', None]
assert ladders['Fish_1'][0] == [1, 3, 1] and ladders['Fish_1'][-1][2] == 150, ladders['Fish_1'][-1]

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: Fish.json skillA + SkillBase.json + SkillUpgrade.json',
    'sha256': {n: hashlib.sha256((L / f'{n}.json').read_bytes()).hexdigest() for n in ('Fish', 'SkillBase', 'SkillUpgrade')},
    'boundary': ('Original values only. species[id]: the normal skill (Fish.json skillA): stat + propType, scope '
                 '[country|rare|all, id], value at level L = i + (L-1)*l (a percent is hundredths of a percent), '
                 'and the SkillUpgrade ladder its levels are bought on. ladders[id]: [min, max, FishExp] -- going '
                 'from level L to L+1 costs the count of the row whose range holds L.'),
    'census': dict(sorted(census.items())),
    'species': species,
    'ladders': {k: v for k, v in ladders.items() if currency[k] == 'FishExp'},
}
(ROOT / 'lib/fish-skill-data.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
print({'species': len(species), 'ladders': len(ladders), 'census': census,
       'bytes': (ROOT / 'lib/fish-skill-data.json').stat().st_size})
