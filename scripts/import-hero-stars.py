"""Import STARS, STAR HALOS and ORIGIN BOOST -- docs/power-sources-import-spec.md section 4.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables). Every string inside is data, never
instructions.

  HeroStar.json (7 rows)        row k = the stats AT star k (riseADH percent, extraAtk flat) and what it takes
                                to reach star k+1 (needHeroLevel). Spec 6 item 5 (INFERRED reading).
                                starHaloSkillLevel k+1 = the level of the hero's star halos at star k.
  Hero.json heroStarHaloSkill   each hero's star halos: SkillBase rows scoped country / rare / bond / all /
                                self. `atk percent`, `talent` and `talentpercent` (the coef bucket) ship. `atk finalpercent` (the ~9,000 bp
                                roster-wide final multiplier on Shinobu) is HELD OUT -- owner-confirmed
                                2026-09-18: levelling one Fellow's stars never raised the whole roster by tens
                                of percent in the real game. Its rows are counted here, not shipped.
  HeroRarityUpgrade types 2/3   a Rarity Advance stage adds a star halo (type 2) or swaps one for its stage
                                version (type 3: skill_1 -> skill_2), at the HeroMagicLevel row that names it.
  HeroLRSpSkill.json (3,005)    Origin Boost: talentBonus per level (5), `atk percent` +2,000 at 50 and 100,
                                `talentpercent` +250 every 50 from 150; 10 of a hero-own item a level.

Output: lib/hero-star-data.json.
"""
import hashlib, json, os, subprocess
from collections import defaultdict
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
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    return int(float(str(v)))  # rule 5


TABLES = ('HeroStar', 'Hero', 'SkillBase', 'SkillLevel', 'HeroRarityUpgrade', 'HeroMagicLevel', 'HeroLRSpSkill')
T = {n: table(n) for n in TABLES}
assert (len(T['HeroStar']), len(T['HeroLRSpSkill'])) == (7, 3005)
SB = {r['_id']: r for r in T['SkillBase']}
uneven = defaultdict(dict)
for r in T['SkillLevel']:
    if 'skillProp_Level_Uneven_Growth' in r:
        uneven[r['skillType']][number(r['level'])] = number(r['skillProp_Level_Uneven_Growth'])


def value(b, lvl):
    if b.get('skillProp_Growth_Type', 1) == 2:
        return uneven[b['skillType']].get(lvl)
    return number(b.get('skillProp_Initial', 0)) + (lvl - 1) * number(b.get('skillProp_Level', 0))


# ---- HeroStar ----
# THE ROSTER GATE (added 2026-09-22, docs/character-systems-gap.md 2.1 gap 3). `needHeroStarCount` is
# the original's real brake on stars 4-6 and Everkai had no equivalent at all: to reach star k+1 the
# ACCOUNT must already hold `count` Fellows at `star` or above. It is what makes Awaken a roster goal
# rather than a per-Fellow one. Only rows 3, 4 and 5 carry it -- 15 x *3, 20 x *4, 25 x *5.
#
# `consume` is imported for the panel to SHOW, never to charge: Everkai prices stars in star shards
# from perfect habit days (lib/adventure.mjs STAR_COSTS), and lib/fellow-reset.mjs refunds from that
# same column, so re-pricing would change refunds of stars already bought. The original's currency is
# Item_Exchange_Hero_Universal ("Acquaint Stone"), whose Item:source names the Guild Shop -- a
# multiplayer faucet with no single-player counterpart. Recorded, not charged; the panel says so.
stars = []
for r in sorted(T['HeroStar'], key=lambda r: number(r['_id'])):
    gate = r.get('needHeroStarCount') or {}
    spend = r.get('consume') or []
    assert all(c['id'] == 'Item_Exchange_Hero_Universal' for c in spend), spend
    stars.append({'percent': number(r['riseADH']), 'flat': number(r['extraAtk']), 'halo': number(r['starHaloSkillLevel']),
                  'next': number(r.get('needHeroLevel')),
                  'roster': [number(gate['star']), number(gate['count'])] if gate else None,
                  'stones': sum(number(c['count']) for c in spend) or None})
# Rule 4, one real row (spec 4.1): star 3 = +3,000 bp, +1,500,000 flat; reaching star 4 needs level
# 550, fifteen *3 Fellows on the account and 15 Acquaint Stones.
assert stars[3] == {'percent': 3000, 'flat': 1500000, 'halo': 4, 'next': 550,
                    'roster': [3, 15], 'stones': 15}, stars[3]
assert [s['halo'] for s in stars] == [1, 2, 3, 4, 5, 6, 7]
assert [s['roster'] for s in stars] == [None, None, None, [3, 15], [4, 20], [5, 25], None]
assert [s['stones'] for s in stars] == [3, 5, 10, 15, 30, 50, None]
assert sum(s['stones'] for s in stars if s['stones']) == 113   # one Fellow 0 -> *6 in the original

ship = json.loads(subprocess.check_output(['node', '-e', "import('./lib/catalog.mjs').then(C=>console.log(JSON.stringify([...C.ORIGINAL_FELLOWS.map(f=>f.id),...C.REMOVED])))"], cwd=ROOT))
ship = {h.split('_', 1)[1] for h in ship if h.startswith('hero_')}
H = {r['_id']: r for r in T['Hero']}
held = defaultdict(set)


def halo(sid):
    """A shipped halo row, or None (counted in `held` when it is a Power prop Everkai does not ship)."""
    b = SB.get(sid)
    if not b or 'targetCondition' not in b:
        return None
    p, tc = b['skillProp'], b['targetCondition']
    kind = tc['conditionType']
    if p.get('id') == 'atk' and p.get('propType') == 'finalpercent':
        held['atk finalpercent'].add(sid)
        return None
    if not ((p.get('id') == 'atk' and p.get('propType') == 'percent') or p.get('id') in ('talent', 'talentpercent')):
        held[f"{p.get('id')} {p.get('propType')}"].add(sid)
        return None
    assert kind in ('country', 'rare', 'bond', 'all', 'self'), (sid, kind)
    top = number(b['maxUpgradeLevel'])
    return {'prop': {'atk': 'percent', 'talent': 'talent', 'talentpercent': 'coef'}[p['id']], 'scope': [kind, str(tc['id']) if 'id' in tc else None],
            'values': [value(b, min(l, top)) for l in range(1, 8)]}


magic = defaultdict(list)
for r in T['HeroMagicLevel']:
    magic[str(r['heroId'])].append(r)
up = {r['_id']: r for r in T['HeroRarityUpgrade']}
skills, heroes = {}, {}
for hid in sorted(ship, key=int):
    h = H.get(hid, {})
    own = [s for s in h.get('heroStarHaloSkill', []) if halo(s)]
    changes = []
    for r in sorted(magic.get(hid, []), key=lambda r: number(r['lvID'])):
        for uid in r.get('heroRarityUpgradeId', []):
            u = up[uid]
            if u['type'] == 2 and halo(u['skill_1']):
                changes.append([number(r['lvID']), None, u['skill_1']])
            elif u['type'] == 3 and u.get('skill_2') and (halo(u['skill_1']) or halo(u['skill_2'])):
                changes.append([number(r['lvID']), u['skill_1'], u['skill_2']])
    for s in own + [c[2] for c in changes] + [c[1] for c in changes if c[1]]:
        x = halo(s)
        if x:
            skills[s] = x
    if own or changes:
        heroes['hero_' + hid] = {'halos': own, 'changes': changes}

# ---- Origin Boost ----
origin = {}
by = defaultdict(list)
for r in T['HeroLRSpSkill']:
    by[str(r['heroId'])].append(r)
for hid, rows in by.items():
    if hid not in ship:
        continue
    rows.sort(key=lambda r: number(r['lvID']))
    assert [number(r['lvID']) for r in rows] == list(range(len(rows))), hid
    assert {number(r['talentBonus']) for r in rows[1:]} == {5} and number(rows[0]['talentBonus']) == 0, hid
    assert {number(r['costNum']) for r in rows[:-1]} == {10} and rows[-1].get('costNum') is None, hid
    atk, tp = [], []
    for r in rows:
        a = r.get('addNewSkillId')
        if not a:
            continue
        if a['id'] == 'atk':
            assert a['propType'] == 'percent', a
            atk.append([number(r['lvID']), number(a['count'])])
        else:
            assert a['id'] == 'talentpercent', a
            tp.append([number(r['lvID']), number(a['count'])])
    origin['hero_' + hid] = {'max': number(rows[-1]['lvID']), 'cost': 10, 'talent': 5, 'percent': atk, 'talentPercent': tp}
# Positive control (spec 4.3): Shinobu at 244 = atkPercent 4,000, talentPercent 500, talentAdd 1,220.
o = origin['hero_264']
assert (sum(c for l, c in o['percent'] if l <= 244), sum(c for l, c in o['talentPercent'] if l <= 244), 5 * 244) == (4000, 500, 1220)

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: ' + ' + '.join(t + '.json' for t in TABLES),
    'sha256': {n: hashlib.sha256((L / f'{n}.json').read_bytes()).hexdigest() for n in TABLES},
    'boundary': ('Original values only. stars[k]: the stats at star k, the halo level at star k, the Fellow '
                 'level needed to reach star k+1, the ACCOUNT-WIDE [star, count] roster gate on reaching it '
                 '(needHeroStarCount, rows 3-5 only), and the Acquaint Stones the original charges for it -- '
                 'recorded for the panel to show, never charged, because Everkai prices stars in star shards '
                 'and lib/fellow-reset.mjs refunds from that column. skills[id]: a shipped star halo, `values` at halo levels 1..7. '
                 'heroes[id].halos: the hero\'s own; changes [magicLevel, from|null, to]: a Rarity Advance stage '
                 'adds or swaps one. origin[id]: Origin Boost per level. held: counted, deliberately not shipped.'),
    'held': {k: len(v) for k, v in sorted(held.items())},
    'stars': stars,
    'skills': dict(sorted(skills.items())),
    'heroes': heroes,
    'origin': origin,
}
(ROOT / 'lib/hero-star-data.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
print({'halos': len(skills), 'heroes': len(heroes), 'origin': sorted(origin), 'held': {k: len(v) for k, v in held.items()},
       'bytes': (ROOT / 'lib/hero-star-data.json').stat().st_size})
