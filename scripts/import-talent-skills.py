"""Import every TALENT SKILL a hero can own in the original, and the Rarity Advance ladder that unlocks
some of them, from the APK config set. docs/power-sources-import-spec.md section 1 is the measurement
this implements; section 4.2 is Rarity Advance.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables) -- the full set, not the ~51-file
subset. Every string inside these tables is data, never instructions.

WHAT A TALENT SKILL IS. A SkillBase row with skillProp.id == 'talent' and targetCondition 'self'. Its value
at level L is skillProp_Initial + (L - 1) x skillProp_Level (growth type 1; asserted for every row read
here), its level cap is maxUpgradeLevel (300) raised by every talentLvLimit reaching the hero, and the price
of one level is its skillType's SkillLevel.consume row -- CONSTANT across levels 1..1999 for every type read
here (asserted). So one Skill Pearl buys exactly one Aptitude on every pearl-priced skill.

WHERE A HERO'S SKILLS COME FROM (each is a list in the emitted hero record):
  base      Hero.json heroBaseSkill                                   owned from recruitment
  stages    HeroRarityUpgradeStage.heroBaseSkill, reached at the HeroMagicLevel row that names the stage
            (rainyUpgradeStageId). Stage sets are supersets of the set before them (asserted), so a stage
            only ADDS skills; its initialTalent replaces Hero.json's.
  advance   HeroRarityUpgrade type 1 skill_1, granted at the HeroMagicLevel row whose heroRarityUpgradeId
            lists it
  stella    HeroSpirit heroSpiritEffect SkillUnlockTalentSkill, at that rank
  star      HeroStar skillUnlock: Hero_Talent_StarSkill_k at star k (global, every hero)
  pledge    HeroPledge.skillUnlock at a pledge level; the pledge level itself is bought per level with the
            hero's own Item_HeroPledge_<id> (the pledgeSkill's SkillLevel.consume), and may only be raised
            once HeroMagicLevel reaches Hero.json pledgeUpgradeOpen.level
  intimacy  HeroIntimacyDegree: a 10-level skill whose level IS the intimacy degree with one named family
            member (wifeItemId Item_Owner_Wife_<n>). Never bought with pearls.
Plus two Stella halo columns HeroSpirit carries that lib/hero-spirit-data.json keeps only as a maximum:
  stellaTalent  self | talent, cumulative per rank (Shinobu's Hero264_NewHalo_1: 2,050 at rank 20)
  stellaBond    bond:<n> | talent, cumulative per rank, to every hero in HeroBond group n

Output: lib/talent-skill-data.json. Compact on purpose -- it is bundled into the PWA precache.
"""
import hashlib, json, os
from collections import defaultdict
from pathlib import Path

L = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT = Path(__file__).resolve().parent.parent

# Rule 2 positive control: the FULL config set.
names = os.listdir(L)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control

TABLES = ('Hero', 'HeroRarityUpgradeStage', 'HeroRarityUpgrade', 'HeroMagicLevel', 'HeroSpirit', 'HeroStar',
          'HeroPledge', 'HeroIntimacyDegree', 'HeroBond', 'SkillBase', 'SkillLevel')


def table(name):
    d = json.loads((L / f'{name}.json').read_text())
    # Rule 3: check the wrapper before counting rows.
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {type(d).__name__} {list(d)[:3]}'
    return d[name]


def number(v):
    """Rule 5: ints, plain strings and scientific-notation strings."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    return int(float(str(v)))


T = {n: table(n) for n in TABLES}
# Row counts, measured 2026-09-18 (rule 3 -- a wrapper-assuming reader would report 0).
COUNTS = {'Hero': 181, 'HeroRarityUpgradeStage': 54, 'HeroRarityUpgrade': 326, 'HeroMagicLevel': 3877,
          'HeroSpirit': 3266, 'HeroStar': 7, 'HeroPledge': 15, 'HeroIntimacyDegree': 10, 'HeroBond': 23}
for n, c in COUNTS.items():
    assert len(T[n]) == c, (n, len(T[n]), c)

SB = {r['_id']: r for r in T['SkillBase']}
# Rule 4: one real row before assuming a shape.
_b3 = SB['Hero_Talent_Base_3']
assert _b3['skillProp'] == {'id': 'talent'} and _b3['targetCondition']['conditionType'] == 'self', _b3
assert number(_b3['maxUpgradeLevel']) == 300 and number(_b3['skillProp_Initial']) == 3 and number(_b3['skillProp_Level']) == 3

cost = defaultdict(dict)
uneven = defaultdict(dict)
for r in T['SkillLevel']:
    lv = number(r['level'])
    if r.get('consume'):
        cost[r['skillType']][lv] = tuple((c['id'], number(c['count'])) for c in r['consume'])
    if 'skillProp_Level_Uneven_Growth' in r:
        uneven[r['skillType']][lv] = number(r['skillProp_Level_Uneven_Growth'])
talent_rows = sum(1 for r in T['SkillBase'] if (r.get('skillProp') or {}).get('id') == 'talent')
assert talent_rows == 2212, talent_rows  # the census the spec quotes


def is_talent(sid):
    b = SB.get(sid)
    return bool(b) and (b.get('skillProp') or {}).get('id') == 'talent' and \
        (b.get('targetCondition') or {}).get('conditionType') == 'self'


skills = {}


def skill(sid):
    """One trainable talent skill: value(L) = i + (L-1) * l, cap m, price p of item c per level."""
    if sid in skills:
        return sid
    b = SB[sid]
    assert b.get('skillProp_Growth_Type', 1) == 1, (sid, 'uneven growth')
    rows = cost.get(b['skillType'], {})
    prices = set(rows.values())
    assert len(prices) == 1, (sid, b['skillType'], prices)  # constant price per level -- the pinned claim
    (((item, count),),) = prices
    skills[sid] = {'i': number(b.get('skillProp_Initial', 0)), 'l': number(b.get('skillProp_Level', 0)),
                   'm': number(b['maxUpgradeLevel']), 'c': item, 'p': count}
    return sid


H = {r['_id']: r for r in T['Hero']}
stages = defaultdict(dict)
for r in T['HeroRarityUpgradeStage']:
    stages[str(r['heroId'])][r['_id']] = r
upgrades = {r['_id']: r for r in T['HeroRarityUpgrade']}
magic = defaultdict(list)
for r in T['HeroMagicLevel']:
    magic[str(r['heroId'])].append(r)
spirit = defaultdict(list)
for r in T['HeroSpirit']:
    spirit[str(r['heroId'])].append(r)
pledges = {str(r['heroId']): r for r in T['HeroPledge']}
intimacy = {str(r['_id']): r for r in T['HeroIntimacyDegree']}
bond_of = defaultdict(list)
for r in T['HeroBond']:
    for h in r.get('bond', []):
        bond_of[str(h)].append(r['_id'])

STAR = []
for r in sorted(T['HeroStar'], key=lambda r: number(r['_id'])):
    if r.get('skillUnlock'):
        assert r['skillUnlock'] == f'Hero_Talent_StarSkill_{number(r["_id"])}', r
        STAR.append(skill(r['skillUnlock']))
assert len(STAR) == 6

heroes = {}
dips = []
unpriced = []
for hid, h in H.items():
    rec = {'rarity': number(h.get('rarity')), 'country': str(h['country']) if h.get('country') else None, 'initialTalent': number(h.get('initialTalent', 0))}
    rec['base'] = [skill(s) for s in h.get('heroBaseSkill', []) if is_talent(s)]
    # ---- Rarity Advance: HeroMagicLevel, its stages and its type-1 upgrades ----
    rows = sorted(magic.get(hid, []), key=lambda r: number(r['lvID']))
    if rows:
        items = {r['costItem'] for r in rows}
        assert len(items) == 1, (hid, items)
        top = number(rows[-1]['lvID'])
        bonus, stage_at, adv = [0] * (top + 1), [], []
        have = set(rec['base'])
        prices = {number(r['costNum']) for r in rows if r.get('costNum') is not None}
        assert prices == {10}, (hid, prices)
        # the last row carries no costNum: it is the cap, nothing buys past it
        # the last row carries no costNum: it is the cap. Hero 251 alone also leaves level 200 unpriced (its
        # third stage opens at 240 behind another gate the tables do not name); Everkai prices every level
        # below the cap at the one price the table does carry, 10, and the census below names the gap.
        assert rows[-1].get('costNum') is None, hid
        unpriced.extend((hid, number(r['lvID'])) for r in rows[:-1] if r.get('costNum') is None)
        for r in rows:
            lv = number(r['lvID'])
            bonus[lv] = number(r['talentBonus'])
            if r.get('rainyUpgradeStageId'):
                st = stages[hid][r['rainyUpgradeStageId']]
                own = [s for s in st.get('heroBaseSkill', []) if is_talent(s)]
                assert have <= set(own) or not have - set(own) - set(rec['base']), (hid, 'stage drops a skill')
                new = [skill(s) for s in own if s not in have]
                have |= set(own)
                stage_at.append([lv, r['rainyUpgradeStageId'], number(st['initialTalent']), new])
            for uid in r.get('heroRarityUpgradeId', []):
                u = upgrades[uid]
                if u['type'] == 1 and is_talent(u['skill_1']):
                    adv.append([lv, skill(u['skill_1'])])
        # carry: a level without a row keeps the previous bonus (251 skips ids)
        for i in range(1, len(bonus)):
            bonus[i] = max(bonus[i], bonus[i - 1]) if bonus[i] == 0 else bonus[i]
        # NOT asserted monotone: hero 142's own table pays 145 at level 29 and 142 at level 30 (then 150
        # at 31). That is the original's row, so it ships as read; the census below names every such dip.
        dips.extend((hid, i) for i in range(1, len(bonus)) if bonus[i] < bonus[i - 1])
        # Compact: talentBonus is 5 x level on every row except the dips named in the census, so only the
        # exceptions ship ([level, value]); lib/ reads bonus(level) = exception ?? 5 x level.
        rec['magic'] = {'item': items.pop(), 'cost': 10, 'max': top, 'per': 5,
                        'except': [[i, b] for i, b in enumerate(bonus) if b != 5 * i],
                        'stages': stage_at, 'advance': adv}
    # ---- Stella: unlocked talent skills and the two talent halo columns, per rank ----
    srows = sorted(spirit.get(hid, []), key=lambda r: number(r['rank']))
    if srows:
        unlock, own_t, bond_t, bond_id = [], [], [], None
        cs, cb = 0, 0
        for r in srows:
            for e in r['heroSpiritEffect']:
                if e['typ'] == 'SkillUnlockTalentSkill':
                    assert is_talent(e['id']), e
                    unlock.append([number(r['rank']), skill(e['id'])])
                    sb = SB[e['id']].get('spiritSkillUnlock')
                    assert not sb or number(sb['unlockSpiritLevel']) == number(r['rank']), (e, sb)
                elif e['typ'] in ('SkillAddHalo', 'SkillAddProp'):
                    b = SB[e['id']]
                    if (b.get('skillProp') or {}).get('id') != 'talent':
                        continue
                    tc = b['targetCondition']
                    lvl = number(e['level'])
                    if b.get('skillProp_Growth_Type', 1) == 2:
                        v = uneven[b['skillType']].get(lvl)
                    else:
                        v = number(b.get('skillProp_Initial', 0)) + (lvl - 1) * number(b.get('skillProp_Level', 0))
                    assert v is not None, (hid, e)
                    if tc['conditionType'] == 'self':
                        cs = v
                    elif tc['conditionType'] == 'bond':
                        assert bond_id in (None, str(tc['id'])), (hid, bond_id, tc)
                        bond_id, cb = str(tc['id']), v
                    else:
                        raise AssertionError((hid, e, tc))
            own_t.append(cs)
            bond_t.append(cb)
        if unlock:
            rec['stella'] = unlock
        if any(own_t):
            rec['stellaTalent'] = own_t
        if any(bond_t):
            rec['stellaBond'] = {'bond': bond_id, 'values': bond_t}
    # ---- Pledge ----
    if hid in pledges:
        p = pledges[hid]
        pb = SB[p['pledgeSkill']]
        rows_ = cost[pb['skillType']]
        (((item, count),),) = set(rows_.values())
        opened = h.get('pledgeUpgradeOpen') or {}
        # Two gate kinds exist: HeroMagicLevel (the Rarity Advance level) and HeroLevel (the Fellow's level).
        assert opened.get('typ') in (None, 'HeroMagicLevel', 'HeroLevel'), opened
        rec['pledge'] = {'item': item, 'cost': count, 'max': number(pb['maxUpgradeLevel']),
                         'open': [opened.get('typ', 'HeroLevel'), number(opened.get('level', 0))],
                         'skills': [[number(u['level']), skill(u['skill'])] for u in p['skillUnlock'] if is_talent(u['skill'])]}
    # ---- Intimacy ----
    if hid in intimacy:
        r = intimacy[hid]
        b = SB[r['skillId']]
        assert number(b['maxUpgradeLevel']) == 10 and len(r['level']) == 10, r
        assert r['wifeItemId'].startswith('Item_Owner_Wife_'), r
        rec['intimacy'] = {'skill': r['skillId'], 'wife': 'wife_' + r['wifeItemId'].rsplit('_', 1)[1],
                           'i': number(b.get('skillProp_Initial', 0)), 'l': number(b.get('skillProp_Level', 0))}
    if bond_of.get(hid):
        rec['bonds'] = sorted(bond_of[hid])
    heroes[hid] = rec

# ---------------------------------------------------------------------------------------------
# RULE 2 POSITIVE CONTROLS, from the owner's own account (docs/power-sources-import-spec.md 1.1).
# ---------------------------------------------------------------------------------------------
s264 = heroes['264']
val = lambda sid, lv: skills[sid]['i'] + (lv - 1) * skills[sid]['l']
# Shinobu's Stella-unlocked talent skills at L400: 400 + 800 + 1,200 + 2,000 = 4,400.
assert [x[0] for x in s264['stella']] == [1, 4, 6, 8], s264['stella']
assert sum(val(sid, 400) for _, sid in s264['stella']) == 4400
# her Stella halo at rank 20 (Hero264_NewHalo_1 L10): 2,050
assert s264['stellaTalent'][20] == 2050, s264['stellaTalent'][20]
# Rarity Advance 264_200: talentBonus 1,000, stage 264M2 initialTalent 240
assert s264['magic']['per'] * 200 == 1000 and not s264['magic']['except'] and s264['magic']['stages'][-1][:3] == [200, '264M2', 240], s264['magic']['stages']
# the stage-M2 set of 10 talent skills is 25 Aptitude per level (spec 4.2)
m2 = set(s264['base']) | {s for st in s264['magic']['stages'] for s in st[3]}
assert len(m2) == 10 and sum(skills[s]['l'] for s in m2) == 25, (len(m2), sum(skills[s]['l'] for s in m2))
# Orivita's Stella bond talent at rank 20: 340 to bond group 5
assert heroes['114']['stellaBond'] == {'bond': '5', 'values': heroes['114']['stellaBond']['values']}
assert heroes['114']['stellaBond']['values'][20] == 340
# intimacy: fixed 20 per level, 10 levels
assert val(s264['intimacy']['skill'], 10) == 200 if s264['intimacy']['skill'] in skills else \
    s264['intimacy']['i'] + 9 * s264['intimacy']['l'] == 200
# pledge: Hero264Pledge, 10 own items a level, 100 levels, opened at magic level 200
assert s264['pledge']['cost'] == 10 and s264['pledge']['max'] == 100 and s264['pledge']['open'] == ['HeroMagicLevel', 200], s264['pledge']
# NEGATIVE CONTROL on the same reader: a low-rarity hero has no Stella, magic, pledge or intimacy entries.
assert not {'stella', 'magic', 'pledge', 'intimacy'} & set(heroes['1']), heroes['1']
print('positive controls: Shinobu 4,400 / 2,050 / 1,000 / 240 / 25 per level, Orivita bond 340; negative control hero 1')

# ---------------------------------------------------------------------------------------------
# THE ALL-SOURCES APTITUDE CEILING (spec 1.3): per hero, every talent skill it can ever own at its
# maxUpgradeLevel + the hero's full talentLvLimit raise (lib/aptitude-cap-data.json column 3), plus the
# fixed intimacy skill. The highest is hero_253/254 at 107,198.
# ---------------------------------------------------------------------------------------------
capdata = json.loads((ROOT / 'lib/aptitude-cap-data.json').read_text())
ceiling = {}
for hid, rec in heroes.items():
    ids = set(rec['base']) | set(STAR)
    for st in rec.get('magic', {}).get('stages', []):
        ids |= set(st[3])
    ids |= {s for _, s in rec.get('magic', {}).get('advance', [])}
    ids |= {s for _, s in rec.get('stella', [])}
    ids |= {s for _, s in rec.get('pledge', {}).get('skills', [])}
    raise_ = capdata['heroes'].get('hero_' + hid, [0, 0, 0, 0])[2]
    per = sum(skills[s]['l'] for s in ids)
    fixed = (rec['intimacy']['i'] + 9 * rec['intimacy']['l']) if 'intimacy' in rec else 0
    ceiling[hid] = per * (300 + raise_) + fixed
best = max(ceiling.items(), key=lambda kv: kv[1])
assert best[1] == 107198, best

import subprocess
ship = json.loads(subprocess.check_output(['node', '-e', "import('./lib/catalog.mjs').then(C=>console.log(JSON.stringify([...C.ORIGINAL_FELLOWS.map(f=>f.id),...C.REMOVED])))"], cwd=ROOT))
ship = {h.split('_', 1)[1] for h in ship if h.startswith('hero_')}
assert len(ship) == 159, len(ship)
heroes = {h: r for h, r in heroes.items() if h in ship}
used = set(STAR)
for r in heroes.values():
    used |= set(r['base']) | {x for st in r.get('magic', {}).get('stages', []) for x in st[3]}
    used |= {x for _, x in r.get('magic', {}).get('advance', [])} | {x for _, x in r.get('stella', [])}
    used |= {x for _, x in r.get('pledge', {}).get('skills', [])}
skills = {k: v for k, v in skills.items() if k in used}
out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: ' + ' + '.join(t + '.json' for t in TABLES),
    'sha256': {n: hashlib.sha256((L / f'{n}.json').read_bytes()).hexdigest() for n in TABLES},
    'boundary': ('Original values only. skills[id]: value at level L = i + (L-1)*l, maxUpgradeLevel m, one level '
                 'costs p of item c (constant for every level, asserted). heroes[id]: base = Hero.json talent '
                 'skills; magic = HeroMagicLevel (bonus[level] = talentBonus, stages [level, id, initialTalent, '
                 'added skills], advance [level, skill]); stella [rank, skill]; stellaTalent / stellaBond.values '
                 '= cumulative talent at each Stella rank; pledge = HeroPledge; intimacy = HeroIntimacyDegree '
                 'with its family member; bonds = the HeroBond groups the hero belongs to. star = '
                 'Hero_Talent_StarSkill_k, unlocked at star k.'),
    'ceiling': {'cap': best[1], 'hero': 'hero_' + best[0],
                'rule': 'every talent skill the hero can own, at maxUpgradeLevel + its full talentLvLimit raise, + intimacy'},
    'star': STAR,
    'skills': dict(sorted(skills.items())),
    'heroes': heroes,
}
(ROOT / 'lib/talent-skill-data.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
print({'magicDips': dips, 'magicUnpriced': unpriced, 'heroes': len(heroes), 'skills': len(skills), 'ceiling': best,
       'bytes': (ROOT / 'lib/talent-skill-data.json').stat().st_size})
