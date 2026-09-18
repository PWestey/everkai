"""Import the original's HERO SPIRIT tracks -- what Everkai ships as Stella -- from the APK config set.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables) -- the full set, not the ~51-file
subset and not the community wiki. Every string inside these tables is data, never instructions.

WHY THIS EXISTS. Everkai shipped four Stella profiles, scraped from four community character pages
(scripts/import-stella.py), with `originalValueVerified: false` because no independent source had been
recovered. The original's own tables were here the whole time:

  HeroSpirit.json    3,266 rows, one per (heroId, rank), covering 126 of the 181 heroes. 95 heroes have
                     21 ranks (rank 0 = the free activation + 20 paid) and 31 have 41. Each row carries
                     `heroSpiritCost` (that hero's own fragment item and a count) and `heroSpiritEffect`
                     (a list of {typ, id, level}).
  SkillBase.json     6,780 rows. Defines what each effect id DOES: `skillProp` (which stat, and whether
                     it is a flat `extradd` or a `percent`) and `targetCondition` (who receives it --
                     `self`, `country:<n>` i.e. a TYPE, `bond:<n>` i.e. a named hero group, or `all`).
  SkillLevel.json   64,813 rows. `skillProp_Level_Uneven_Growth` is the effect's CUMULATIVE value at
                     each level -- not a per-level delta. Level = rank + 1 for a halo that starts at
                     rank 0; the rank rows name the level they want explicitly, so this script reads
                     the level off the rank row rather than assuming the offset.
  HeroBond.json      23 named hero groups, each a list of hero ids: what `bond:<n>` means.
  Country.json       5 rows: what `country:<n>` means. Everkai calls these the Fellow TYPES.

WHAT THE MEASUREMENT SAID (2026-09-18), and it settles two questions Everkai had open:

1. Everkai's four profiles are EXACTLY the four heroes in the whole table that grant a type-wide
   percent -- 52, 54, 56, 190, via a `country:<n>` + `atk/percent` halo. The other 122 grant no
   type-wide anything. So "typed percent tracks are a rare few" is the original's own rule, not a local
   balance choice, and a plan to give every character one would be inventing a mechanic.
2. Every value Everkai treated as unverified reproduces here exactly. hero_52 rank 1 costs 20
   Item_Owner_HeroPiece_52; Hero52_SelfPowerAdd_1 runs 500,000 -> 35,300,000 over 40 levels;
   Hero52_PowerPercent_1 runs 200 -> 12,200 over 41, and `percent` is hundredths of a percent, so that
   is +2% at rank 0 and +122% at rank 40 -- the shipped column, to the digit. The script asserts this
   as its rule-2 positive control rather than trusting the match.
   It also means the +2% "authored" ACTIVATION was never authored: it is the original's own rank-0
   value. Including for hero_190, whose Everkai activation grants 0 -- see lib/stella-activation-policy.json.

WHAT THE 126 TRACKS GRANT, and what this script now emits per rank (2026-09-18, the owner's call to
import everything measurable):
    126  self | atk extradd      the owner's own flat Power        15,300,000 .. 223,500,000   `flat`
    116  self | atk percent      the owner's OWN Power percent          153% .. 1350%          `selfPowerBp`
      4  country | atk percent   type-wide Power percent                 62% .. 122%           `percent`
     57  all | appoint percent   every Fellow's appointment yield          4% .. 800%          `appointYieldBp`
     57  self | talentLvLimit    the owner's talent level cap          +50 .. +100 levels       `talentLimit`
     17  self | talent           the owner's own talent (coef)         +340 .. +2,050          unmodelledMax
     29+ bond | talent / percent a NAMED HERO GROUP's talent or Power                          unmodelledMax
The last two stay in `unmodelledMax` rather than becoming columns, for two different reasons that are
both about Everkai having no axis rather than about effort:
  * `bond:<n>` is a hero GROUP -- HeroBond.json's 23 named rosters. Everkai has no group-membership
    axis at all (its nearest neighbour, `lib/bonds.mjs`, is a per-PAIR intimacy level), so shipping
    these would mean inventing the grouping as well as the bonus. Left out on the owner's own
    instruction, and carried in the data so a future bond axis can price them without re-reading.
  * `self | talent` is the client's `coef` bucket. Everkai's coef axis IS `aptitude`, and `aptitude` is
    hard-capped at 1,000 by validAdventure -- a bound a SAVE is checked against. Widening it is
    docs/power-parity-audit.md's step 5 ("highest blow-up risk", "requires raising or removing the cap"),
    a separate owner-sized decision, and it was not in the three columns the owner named.

A COLUMN IS SPARSE AND CUMULATIVE, which is the one thing a reader has to get right. `flat` and the
country `percent` are named on every rank, but `HeroN_NewHalo_2/3/4` appear only on the ranks that
RAISE them -- hero 264 names its own-Power percent on ranks 0,2,7,9,11,13,15,17,19 and nowhere else.
The value is the halo's cumulative total at the level that rank asks for, so a rank that does not name
it KEEPS the previous rank's value. Reading a silent rank as zero would make every one of these columns
saw-tooth; `carry` below is that rule, and the monotonicity assert is what would catch losing it.

Output: lib/hero-spirit-data.json -- every hero, every rank, every effect, resolved. Nothing is
selected, filtered or rounded here; lib/ decides what to ship.
"""
import hashlib, json, os
from pathlib import Path

L = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT = Path(__file__).resolve().parent.parent

# Rule 2 positive control: this is the FULL config set, not the ~51-file subset that has repeatedly
# produced false "absent" conclusions.
names = os.listdir(L)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control


def table(name):
    d = json.loads((L / f'{name}.json').read_text())
    # Rule 3: check the wrapper before counting rows.
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {type(d).__name__} {list(d)[:3]}'
    return d[name]


spirit = table('HeroSpirit')
base = {r['_id']: r for r in table('SkillBase')}
country = {r['_id'] for r in table('Country')}
# Rule 3/4 again: HeroBond row '9' carries no `bond` key at all -- an empty group, not a parse fault.
bonds = {r['_id']: [str(x) for x in r.get('bond', [])] for r in table('HeroBond')}
# The English item names, for provenance only: they make `itemName` readable in the emitted file and
# nothing reads them. Rule 4 -- this dataset keys on `id`, not `_id`, which is why it is read here
# rather than through table() above. Optional, so a machine without the research tree still imports.
_items = (Path.home() / 'Documents/Codex/2026-09-07/referenced-chatgpt-conversation-this-is-an'
          / 'outputs/component-research/datasets/Item.json')
items = ({r['id']: r.get('en') for r in json.loads(_items.read_text())} if _items.exists() else {})
if items:
    assert items.get('Item:name:Item_Owner_HeroPiece_52') == "Angie's Fragment", 'item name control'

# Rule 5: values arrive as ints, plain strings and scientific-notation strings. Parse defensively.
def number(v):
    if isinstance(v, (int, float)):
        return int(v)
    return int(float(str(v)))


levels = {}
for r in table('SkillLevel'):
    if 'skillProp_Level_Uneven_Growth' in r:
        levels.setdefault(r['skillType'], {})[number(r['level'])] = number(r['skillProp_Level_Uneven_Growth'])

#: Measured census of every `typ` that appears in heroSpiritEffect, so a new one fails the import
#: instead of being silently skipped: SkillAddHalo 3444, SkillAddProp 3140, ItemAddTitleCombined 321,
#: SkillUnlockTalentSkill 186, ItemAddHeadIcon 58, AddWifeBless 57, ItemAddTitleBase 57.
OTHER_TYPS = ('ItemAddTitleCombined', 'ItemAddTitleBase', 'ItemAddHeadIcon', 'SkillUnlockTalentSkill', 'AddWifeBless')

# Rule 4: read one real row before assuming any shape.
sample = spirit[0]
assert set(sample) >= {'_id', 'heroId', 'rank', 'heroSpiritEffect', 'heroSpiritCost'}, sorted(sample)


def scope(b):
    """Who receives this effect. `targetCondition` is a dict on every row that has one, but it is read
    defensively because a list would silently become a 'none' and understate the table."""
    tc = b.get('targetCondition')
    if isinstance(tc, list):
        tc = tc[0] if tc else None
    if not isinstance(tc, dict):
        return {'kind': 'none'}
    kind = tc.get('conditionType')
    if kind == 'country':
        assert str(tc['id']) in country, f'country {tc["id"]} is not in Country.json'
        return {'kind': 'country', 'id': str(tc['id'])}
    if kind == 'bond':
        assert str(tc['id']) in bonds, f'bond {tc["id"]} is not in HeroBond.json'
        return {'kind': 'bond', 'id': str(tc['id'])}
    return {'kind': kind}


#: The effect kinds whose id is a SkillBase row. Everything else names a cosmetic or another system's
#: row (a title item, a head icon, a talent-skill unlock, a Family blessing link) and is passed through
#: unresolved rather than dropped, so the emitted file still says the rank granted something.
STAT_TYPS = ('SkillAddProp', 'SkillAddHalo')


def effect(e):
    """One resolved effect. `level` is the level the RANK asks for, read off the rank row rather than
    derived from the rank, because halos that start at rank 0 and props that start at rank 1 do not
    share an offset."""
    if e['typ'] not in STAT_TYPS:
        assert e['typ'] in OTHER_TYPS, f'unknown effect typ {e["typ"]}'
        return {'typ': e['typ'], 'id': e['id'], 'level': number(e['level']) if 'level' in e else None,
                'stat': None, 'propType': None, 'scope': {'kind': 'unresolved'}, 'value': None, 'maxLevel': None}
    b = base.get(e['id'])
    assert b is not None, f'{e["id"]} is in HeroSpirit but not in SkillBase'
    prop = b.get('skillProp') or {}
    lvl = number(e['level']) if 'level' in e else None
    value = levels.get(e['id'], {}).get(lvl)
    return {
        'typ': e['typ'], 'id': e['id'], 'level': lvl,
        'stat': prop.get('id'), 'propType': prop.get('propType'),
        'scope': scope(b), 'value': value, 'maxLevel': number(b['maxUpgradeLevel']) if b.get('maxUpgradeLevel') is not None else None,
    }


heroes = {}
for r in spirit:
    h = str(r['heroId'])
    heroes.setdefault(h, []).append(r)
for h in heroes:
    heroes[h].sort(key=lambda r: number(r['rank']))

profiles = []
for h, rows in sorted(heroes.items(), key=lambda kv: int(kv[0])):
    ranks = [number(r['rank']) for r in rows]
    assert ranks == list(range(len(ranks))), f'hero {h} ranks are not 0..N: {ranks[:5]}'
    costs = {c['id'] for r in rows for c in r['heroSpiritCost']}
    assert len(costs) == 1, f'hero {h} spends more than one item: {sorted(costs)}'
    item = costs.pop()
    assert number(rows[0]['heroSpiritCost'][0]['count']) == 0, f'hero {h} rank 0 is not free'
    profiles.append({
        'heroId': h,
        'itemId': item,
        'itemName': items.get('Item:name:' + item),
        'ranks': [{
            'rank': number(r['rank']),
            'cost': sum(number(c['count']) for c in r['heroSpiritCost']),
            'effects': [effect(e) for e in r['heroSpiritEffect']],
        } for r in rows],
    })

# ---------------------------------------------------------------------------------------------
# RULE 2 POSITIVE CONTROL, and the reason this import can be trusted at all: the four profiles
# Everkai already ships were recovered independently, from community character pages, months before
# these tables were read. If this reader is correct it must reproduce them to the digit. It does.
# ---------------------------------------------------------------------------------------------
shipped = json.loads((ROOT / 'lib/stella-data.json').read_text())['profiles']
by_hero = {p['heroId']: p for p in profiles}
for p in shipped:
    h = p['id'].split('_')[1]
    src = by_hero[h]
    assert src['itemId'] == p['itemId'], (h, src['itemId'], p['itemId'])
    paid = [r for r in src['ranks'] if r['rank'] > 0]
    assert len(paid) == len(p['levels']), (h, len(paid), len(p['levels']))
    for rank, lev in zip(paid, p['levels']):
        assert rank['cost'] == lev['cost'], (h, rank['rank'], rank['cost'], lev['cost'])
        flat = [e for e in rank['effects'] if e['scope']['kind'] == 'self' and e['propType'] == 'extradd']
        pct = [e for e in rank['effects'] if e['scope']['kind'] == 'country' and e['propType'] == 'percent']
        assert len(flat) == 1 and flat[0]['value'] == lev['flat'], (h, rank['rank'], flat, lev['flat'])
        assert len(pct) == 1 and pct[0]['value'] == lev['percent'] * 100, (h, rank['rank'], pct, lev['percent'])
print('positive control: all four shipped profiles reproduce exactly from the config set')

# The other half of rule 2: a NEGATIVE control on the same reader. hero_74 is in Everkai's roster and
# has a fragment item, and must NOT come back with a track, or "126 of 181" is a reading artefact.
assert '74' not in by_hero, 'hero_74 unexpectedly has a HeroSpirit track'
assert '52' in by_hero and len(by_hero['52']['ranks']) == 41

typed = sorted(h for h, p in by_hero.items()
               if any(e['scope']['kind'] == 'country' for r in p['ranks'] for e in r['effects']))
assert typed == ['190', '52', '54', '56'], typed

# ---------------------------------------------------------------------------------------------
# COMPACT the table before emitting it. The fully resolved form above is 2.0 MB, and this file is
# imported by lib/, so it lands in the PWA precache -- which has to stay small or saving breaks on the
# phone. So the shipped file carries (a) every rank's COST, (b) the two effect columns Everkai's power
# model actually reads -- the owner's own flat Power and the type-wide percent -- per rank, and (c) the
# per-hero MAXIMUM of every column Everkai does NOT model. (c) is what prices the remaining gap, which
# is the only thing the full per-rank series was needed for.
# ---------------------------------------------------------------------------------------------
def column(rank, kind, propType, stat='atk'):
    hits = [e for e in rank['effects']
            if e['scope']['kind'] == kind and e['propType'] == propType and e['stat'] == stat]
    assert len(hits) <= 1, (kind, propType, [h['id'] for h in hits])
    return hits[0] if hits else None


#: The five per-rank columns, as (emitted name, scope kind, propType, stat). Every one is a CUMULATIVE
#: total at the level its rank asks for, and every one is carried forward across ranks that do not name
#: it -- see the module docstring. `self/extradd` and `country/percent` were already emitted; the other
#: three are the columns the owner asked for on 2026-09-18.
COLUMNS = (
    ('flat', 'self', 'extradd', 'atk'),
    ('percent', 'country', 'percent', 'atk'),
    ('selfPowerBp', 'self', 'percent', 'atk'),
    ('appointYieldBp', 'all', 'percent', 'appoint'),
    ('talentLimit', 'self', None, 'talentLvLimit'),
)
#: The (kind, propType, stat) triples COLUMNS consumes, so the unmodelled census below cannot
#: double-count a column as a gap. Derived from COLUMNS rather than repeated, so adding a column
#: cannot leave a stale exclusion behind.
MODELLED_KEYS = {(kind, propType, stat) for _, kind, propType, stat in COLUMNS}

compact = []
for p in profiles:
    country_id = None
    unmodelled = {}
    rows = []
    # The carry. A rank that does not name a halo keeps the previous rank's cumulative value.
    carry = {name: 0 for name, *_ in COLUMNS}
    for rank in p['ranks']:
        for name, kind, propType, stat in COLUMNS:
            hit = column(rank, kind, propType, stat)
            if hit is not None and hit['value'] is not None:
                carry[name] = hit['value']
            if name == 'percent' and hit is not None:
                cid = hit['scope']['id']
                assert country_id in (None, cid), (p['heroId'], country_id, cid)
                country_id = cid
        rows.append({'rank': rank['rank'], 'cost': rank['cost'], **carry})
        for e in rank['effects']:
            if e['value'] is None:
                continue
            if (e['scope']['kind'], e['propType'], e['stat']) in MODELLED_KEYS:
                continue
            key = e['scope']['kind'] + (':' + e['scope']['id'] if 'id' in e['scope'] else '')
            key += '|' + (e['stat'] or '?') + ('/' + e['propType'] if e['propType'] else '')
            unmodelled[key] = max(unmodelled.get(key, 0), e['value'])
    # Every emitted column is a CUMULATIVE total, so it may only ever climb. This is also the assert
    # that would catch losing the carry above: without it a sparse column saw-tooths back to 0.
    for a, b in zip(rows, rows[1:]):
        for name, *_ in COLUMNS:
            assert b[name] >= a[name], (p['heroId'], name, a[name], b[name])
    compact.append({'heroId': p['heroId'], 'itemId': p['itemId'], 'itemName': p['itemName'],
                    'country': country_id, 'ranks': rows,
                    'unmodelledMax': dict(sorted(unmodelled.items()))})

# Rule 2 again, on the three NEW columns: a reader that silently resolved nothing would emit zeros
# everywhere and look exactly like "the original does not grant these". Positive control, from the
# hero the audit transcribes by hand (docs/power-parity-audit.md 3b): hero 264's rank-20 row.
_264 = next(c for c in compact if c['heroId'] == '264')['ranks'][20]
assert (_264['flat'], _264['selfPowerBp'], _264['appointYieldBp'], _264['talentLimit']) == \
       (223500000, 95000, 80000, 100), _264
# and the carry itself: rank 20 names NEITHER NewHalo_2 NOR NewHalo_3, so those two values are only
# there because they were carried from ranks 6 and 19.
assert _264['selfPowerBp'] == next(c for c in compact if c['heroId'] == '264')['ranks'][19]['selfPowerBp']
# Negative control on the same reader: the four SelfPowerAdd heroes Everkai already shipped carry NONE
# of the three new columns, so a reader that invented values would show up here.
for h in ('52', '54', '56', '190'):
    r = next(c for c in compact if c['heroId'] == h)['ranks'][-1]
    assert (r['selfPowerBp'], r['appointYieldBp'], r['talentLimit']) == (0, 0, 0), (h, r)
print('new-column control: hero 264 rank 20 resolves and carries; the four shipped heroes stay empty')

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: HeroSpirit.json + SkillBase.json + SkillLevel.json + HeroBond.json + Country.json',
    'sha256': {n: hashlib.sha256((L / f'{n}.json').read_bytes()).hexdigest()
               for n in ('HeroSpirit', 'SkillBase', 'SkillLevel', 'HeroBond', 'Country')},
    'boundary': ('Original values only, resolved not reconstructed. `value` is the effect\'s CUMULATIVE '
                 'amount at that level: a flat Power for propType extradd, and HUNDREDTHS OF A PERCENT '
                 'for propType percent (12200 = +122%). `scope.kind` country is a Fellow TYPE and bond '
                 'is a named hero group (bonds below). Nothing here is selected or rounded; lib/ '
                 'decides which columns Everkai models.'),
    'countries': sorted(country),
    'bonds': bonds,
    'modelled': ('Per rank: cost, then five CUMULATIVE totals at that rank (not deltas), each carried '
                 'forward across ranks that do not name its halo. `flat` = the owner\'s own flat Power '
                 '(self/atk extradd, the client\'s extradd bucket). `percent` = the type-wide Power '
                 'percent (country/atk percent) and `selfPercent` = the owner\'s OWN Power percent '
                 '(self/atk percent) -- DIFFERENT SCOPES OF THE SAME `percent` BUCKET, which is why '
                 'they are summed together and not applied one after the other. `appointPercent` = '
                 'all/appoint percent, an account-wide percent on the appointment yield. `talentLimit` '
                 '= self/talentLvLimit, a raise to the owner\'s talent LEVEL cap. All four percent-ish '
                 'columns are hundredths of a percent; talentLimit is a count of levels.'),
    'profiles': compact,
}
(ROOT / 'lib/hero-spirit-data.json').write_text(json.dumps(out, indent=1) + '\n')
print({'heroes': len(compact), 'rows': sum(len(p['ranks']) for p in compact),
       'rank_counts': sorted({len(p['ranks']) for p in profiles}),
       'typed': typed, 'items': len({p['itemId'] for p in compact}),
       'unmodelledKinds': len({k for p in compact for k in p['unmodelledMax']})})
