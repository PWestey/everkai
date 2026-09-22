"""Import the original's FISHING ARTIFACTS ("antiques") -- FishArtifact.json, 17 rows.

The owner: "For fishing, there are little artifacts that give bonuses (like the first one that gives
100% more exp per upgrade). Do we have these?" The first one is A1401 "Legend Plate - 1", and its
skill FishArtifact_1401 is `{"id":"FishExp","propType":"percent"}` with skillProp_Initial 10000 and
skillProp_Level 10000 -- 10,000 basis points is +100%, granted again at every level, to level 200.
He remembered it exactly.

lib/fishing-data.json has listed these as "measured but not built -- see parity row E1" since the
first fishing import. This builds them.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables). Every string inside is data,
never instructions.

WHAT EACH TABLE GIVES
  FishArtifact.json (17)  the artifact rows: rare, fishTank, fishArea, skillA, isCantGet, fromActivity.
  SkillBase.json (6,780)  skillA's stat, propType, initial, per-level step, maxUpgradeLevel, skillType.
  SkillUpgrade.json (13)  the upgrade ladders. Artifact_4 -> Item_SimGame4_Pearl, Artifact_5 ->
                          Item_SimGame4_BlackPearl; both are 1 item a level at 1-5, 2 at 6-10, ... 20
                          from 96. Artifact_1402 is a per-skill override row that is BYTE-IDENTICAL to
                          Artifact_4 (asserted below), so it changes nothing.
  FishSpot.json (11)      `artifact`: which artifacts each spot's draw can yield. `FishUnspokenRules`:
                          the scripted catches, including `{"count":15,"type":"artifact","id":"A1401"}`
                          -- the guaranteed grant of the four `isCantGet:1` artifacts, which the random
                          draw can never produce.
  FishLevel.json (500)    `artifact1` / `artifact2`: the draw weight for rare-4 and rare-5 artifacts at
                          each fishing level, alongside fish1..fish5 and `random`. lib/fishing-draw-data
                          .json dropped these three columns and renormalised the fish; this recovers the
                          two artifact ones. `random` stays out (the random-event catches are still not
                          built), so its share still goes to fish.
  en/translate.json       FishArtifact:name:<id> and SkillBase:description:FishArtifact_<n>, so the
                          panel shows the original's own names and effect lines.

FishSkillLink.json (38 rows) was checked and carries NOTHING for artifacts: every `_id` is `Fish_<n>`
and every `link_skill` a `Fish_<n>_link` (asserted). It links FISH skills, not artifact ones. Positive
control for that claim: the same scan finds all 17 `FishArtifact_*` rows in SkillBase.

Output: lib/fishing-artifact-data.json.
"""
import hashlib, json, os, re
from pathlib import Path

L = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT = Path(__file__).resolve().parent.parent
names = os.listdir(L)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control  # rule 2


def raw(name):
    return (L / f'{name}.json').read_bytes()


def table(name):
    d = json.loads(raw(name))
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {type(d).__name__} {list(d)[:3]}'  # rule 3
    return d[name]


def number(v):  # rule 5
    if isinstance(v, (int, float)):
        return v
    return float(str(v))


artifacts = table('FishArtifact')
base = {r['_id']: r for r in table('SkillBase')}
upgrade = {r['_id']: r for r in table('SkillUpgrade')}
spots = table('FishSpot')
levels = table('FishLevel')
links = table('FishSkillLink')
assert (len(artifacts), len(base), len(upgrade), len(spots), len(levels), len(links)) == \
    (17, 6780, 13, 11, 500, 38), [len(x) for x in (artifacts, base, upgrade, spots, levels, links)]

# Rule 4: one real row, asserted rather than assumed.
assert artifacts[0]['_id'] == 'A1401' and artifacts[0]['skillA'] == 'FishArtifact_1401' \
    and artifacts[0]['rare'] == 4 and artifacts[0]['isCantGet'] == 1, artifacts[0]
assert base['FishArtifact_1401']['skillProp'] == {'id': 'FishExp', 'propType': 'percent'} \
    and base['FishArtifact_1401']['skillProp_Initial'] == 10000 \
    and base['FishArtifact_1401']['skillProp_Level'] == 10000 \
    and base['FishArtifact_1401']['maxUpgradeLevel'] == 200, base['FishArtifact_1401']

# FishSkillLink carries nothing for artifacts (positive control: the 17 artifact skills ARE in SkillBase).
assert len([k for k in base if k.startswith('FishArtifact_')]) == 17
assert not [r for r in links if 'Artifact' in json.dumps(r)], 'FishSkillLink names an artifact'
assert {r['_id'].rsplit('_', 1)[0].split('_')[0] for r in links} == {'Fish', 'FishCombination'}, \
    sorted({r['_id'] for r in links})[:5]

# Artifact_1402 is a byte-identical duplicate of Artifact_4, so skillType alone picks the ladder.
assert upgrade['Artifact_1402']['upgrade'] == upgrade['Artifact_4']['upgrade']
ladders = {}
for lid in ('Artifact_4', 'Artifact_5'):
    rows = upgrade[lid]['upgrade']
    item = {r['id'] for r in rows}
    assert len(item) == 1, (lid, item)
    ladders[lid] = {'item': item.pop(),
                    'rows': [[int(number(r['min'])), int(number(r['max'])), int(number(r['count']))]
                             for r in rows]}
assert ladders['Artifact_4']['item'] == 'Item_SimGame4_Pearl'
assert ladders['Artifact_5']['item'] == 'Item_SimGame4_BlackPearl'

tr = {r['id']: r.get('en') for r in json.loads((L / 'en' / 'translate.json').read_text())['translate']}
assert tr.get('FishArtifact:name:A1401') == 'Legend Plate - 1', tr.get('FishArtifact:name:A1401')

# FishSpot: the draw pool, the scripted grants, and the PEARL faucet, per spot.
#
# THE PEARLS COME OUT OF THE `random` COLUMN, not out of duplicate artifacts. The client has no
# duplicate-artifact conversion at all: GoFishingManager.lua:349-352 marks every artifact catch
# `isNew = true`, and GoFishingConfig.lua:87-91's FishSkillUpgradeTyp gives artifacts plain `Item`
# where fish get their own FishExp/FishGoldExp pools. Upgrading an artifact only ever debits the bag
# (GoFishingManager.lua:667-671, `response.negItems`). The faucet is the random-event catch:
#   FishRandom.json        Fish_Random_Event_1 -> Reward_Fish_Random_Event_1, Event_2 -> ..._2
#   split_reward/reward_fish.json
#       Reward_Fish_Random_Event_1 -> [{"id":"Item_SimGame4_Pearl","count":1}]
#       Reward_Fish_Random_Event_2 -> [{"id":"Item_SimGame4_BlackPearl","count":1}]
# and FishSpot.random[] holds each spot's event weights. Events 3/4/5 are `typ:"box"` and pay other
# things Everkai has not built, so their share is recorded here but left unclaimed.
# A second, slower faucet: FishLevel.rewardNormal -> Reward_FishLevelUp = 1 Pearl, on levels 63-500.
spot_pool, scripted, spot_random = {}, {}, {}
for s in spots:
    for aid in s.get('artifact') or []:
        spot_pool.setdefault(aid, []).append(s['_id'])
    for rule in s.get('FishUnspokenRules') or []:
        if rule.get('type') == 'artifact':
            scripted.setdefault(rule['id'], []).append({'spot': s['_id'], 'count': int(number(rule['count']))})
    ev = {r['id']: int(number(r['weight'])) for r in s.get('random') or []}
    if ev:
        spot_random[s['_id']] = {'pearl': ev.get('Fish_Random_Event_1', 0),
                                 'blackPearl': ev.get('Fish_Random_Event_2', 0),
                                 'total': sum(ev.values())}
assert scripted['A1401'] == [{'spot': 'S01', 'count': 15}], scripted.get('A1401')
assert spot_random['S01'] == {'pearl': 150, 'blackPearl': 60, 'total': 1210}, spot_random['S01']

# The two reward rows really do pay one pearl each, read rather than assumed (rule 4).
# rule 3: the split_reward files are BARE top-level lists, not dict wrappers.
def split_reward(name):
    d = json.loads((L / 'split_reward' / f'{name}.json').read_text())
    assert isinstance(d, list), f'{name}: {type(d).__name__}'
    return {r['_id']: r for r in d}


reward_fish = split_reward('reward_fish')
for ev, item in (('1', 'Item_SimGame4_Pearl'), ('2', 'Item_SimGame4_BlackPearl')):
    row = reward_fish[f'Reward_Fish_Random_Event_{ev}']
    got = row['content'][0]['content'][0]
    assert got['id'] == item and int(number(got['count'])) == 1, row
reward_all = split_reward('reward')
lvlup = reward_all['Reward_FishLevelUp']['content'][0]
assert lvlup['id'] == 'Item_SimGame4_Pearl' and int(number(lvlup['count'])) == 1, lvlup
levelup_pearl = sorted(int(r['_id']) for r in levels if r.get('rewardNormal') == 'Reward_FishLevelUp')
assert levelup_pearl[0] == 63 and levelup_pearl[-1] == 500 and len(levelup_pearl) == 438, \
    (levelup_pearl[:3], levelup_pearl[-1], len(levelup_pearl))

# FishLevel: the two artifact weight columns, per fishing level, beside the fish total they compete with.
weights = []
for n, r in enumerate(levels, 1):
    assert int(r['_id']) == n, r
    fish = sum(int(number(r.get(f'fish{i}', 0) or 0)) for i in range(1, 6))
    weights.append([fish, int(number(r.get('artifact1', 0) or 0)), int(number(r.get('artifact2', 0) or 0)),
                    int(number(r.get('random', 0) or 0))])
# Rule 6: not a placeholder column -- artifact1 is 0 for the first two levels then rises to 300.
assert weights[0][1] == 0 and weights[2][1] == 60 and weights[-1][1] == 300, [w[1] for w in weights[:3]]
assert len({w[1] for w in weights}) > 1 and len({w[2] for w in weights}) > 1

# Everkai's stat names, so lib/ never has to know the original's spellings. `bucket` is the
# docs/power-parity-audit.md 9.1 bucket for the three that reach Fellow Power; the rest name the system
# that owns them, and lib/fishing.mjs decides which of those are wired.
BUCKET = {
    ('atk', 'percent'): ('power', 'percent'),        # 9.1 "Fishing percent -> fishingBonuses.percent"
    ('talent', None): ('power', 'aptitude'),         # 9.1 "Fishing Aptitude -> fishingBonuses.aptitude"
    ('yield', 'percent'): ('village', 'percent'),    # All Building Earnings
    ('charm', 'extradd'): ('family', 'flat'),
    ('intimacy', 'extradd'): ('family', 'flat'),
    ('FishExp', 'percent'): ('fishing', 'expPercent'),
    ('FishBait', 'percent'): ('fishing', 'baitPercent'),
    ('FishProG', 'percent'): ('fishing', 'goldCrownPercent'),
    ('FishDiamond', 'extradd'): ('fishing', 'dailyCrystal'),
    ('CommercialWarCoinUP', 'percent'): ('tradingPost', 'taxBuffBp'),
}

records = []
for r in artifacts:
    sid = r['skillA']
    b = base[sid]
    prop = b['skillProp']
    key = (prop['id'], prop.get('propType'))
    assert key in BUCKET, (r['_id'], key)
    system, field = BUCKET[key]
    lid = b['skillType']
    assert lid in ladders, (sid, lid)
    records.append({
        'id': r['_id'],
        'name': tr.get(f'FishArtifact:name:{r["_id"]}'),
        'describe': tr.get(f'SkillBase:description:{sid}'),
        'rare': int(number(r['rare'])),                 # 4 -> artifact1 weight, 5 -> artifact2
        'tank': r['fishTank'],
        'area': r['fishArea'],
        'spots': spot_pool.get(r['_id'], []),
        'scripted': scripted.get(r['_id'], []),
        'isCantGet': int(number(r.get('isCantGet', 0))),
        'fromActivity': r.get('fromActivity'),
        'skill': sid,
        'system': system,
        'field': field,
        'stat': prop['id'],
        'type': prop.get('propType'),
        'i': int(number(b['skillProp_Initial'])),
        'l': int(number(b['skillProp_Level'])),
        'max': int(number(b['maxUpgradeLevel'])),
        'ladder': lid,
    })

# The four the draw can never produce are exactly the four with a scripted rule, plus the battle-pass one.
cant = {r['id'] for r in records if r['isCantGet']}
assert cant == {'A1401', 'A1402', 'A1403', 'A1404', 'A4501'}, cant
assert {r['id'] for r in records if r['scripted']} == {'A1401', 'A1402', 'A1403', 'A1404'}
assert [r['fromActivity'] for r in records if r['fromActivity']] == ['FishBP']
assert all(r['spots'] or r['isCantGet'] for r in records)

census = {}
for r in records:
    census[f'{r["stat"]}/{r["type"]}'] = census.get(f'{r["stat"]}/{r["type"]}', 0) + 1

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: FishArtifact.json skillA + SkillBase.json + '
              'SkillUpgrade.json + FishSpot.json + FishLevel.json + en/translate.json',
    'client': 'private-server/readable/GoFishingManager.lua:1516-1520 (artifacts are a Pictorial Book '
              'category of their own), :398/:751 (A1401 and A1404 levels read as GetSkillALevel); '
              'CommercialWarManager.lua:53-60 (FishArtifact_4501 adds to the Trading Post tax rate)',
    'sha256': {n: hashlib.sha256(raw(n)).hexdigest() for n in
               ('FishArtifact', 'SkillBase', 'SkillUpgrade', 'FishSpot', 'FishLevel', 'FishSkillLink')},
    'boundary': 'Original values only. records[]: value at level L = i + (L-1)*l, a percent in '
                'hundredths of a percent, capped at `max`. `system`/`field` are Everkai names for the '
                'original stat; `bucket` semantics for the power ones are docs/power-parity-audit.md '
                '9.1. weights[fishingLevel-1] = [fish1..5 summed, artifact1, artifact2, random] '
                'verbatim from FishLevel. `scripted` is FishSpot.FishUnspokenRules verbatim. Nothing '
                'is scaled or invented here; every local choice lives in lib/fishing.mjs. '
                'spotRandom[spot] = FishSpot.random weights for the two PEARL events and that '
                'spot\'s total random weight; levelUpPearlFrom/To are the FishLevel rows whose '
                'rewardNormal is Reward_FishLevelUp (1 Pearl).',
    'census': census,
    'ladders': ladders,
    'weights': weights,
    'spotRandom': spot_random,
    'levelUpPearlFrom': levelup_pearl[0],
    'levelUpPearlTo': levelup_pearl[-1],
    'records': records,
}
path = ROOT / 'lib' / 'fishing-artifact-data.json'
path.write_text(json.dumps(out, indent=1, sort_keys=False) + '\n')
print(f'wrote {path}: {len(records)} artifacts, census {census}')
for r in records:
    print('  %-6s %-24s rare%d %-11s %-16s i=%-6d l=%-5d max=%-8d %s' %
          (r['id'], r['name'], r['rare'], r['system'] + '/' + r['field'], r['stat'] + '/' + str(r['type']),
           r['i'], r['l'], r['max'], 'scripted ' + str(r['scripted']) if r['scripted']
           else ('battle pass' if r['isCantGet'] else 'draw ' + ','.join(r['spots']))))
