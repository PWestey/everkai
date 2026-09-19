"""Import FAMILY STELLA (WifeSpirit), the Stella-unlocked blessing pairs (WifeBless.heroSpiriteUnlock) and the
artifact QUENCHING ladder -- docs/power-sources-import-spec.md section 3.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables). Every string inside is data, never
instructions.

FAMILY STELLA. WifeSpirit.json: 2,109 rows, 89 family members, 21 or 41 ranks (rank 0 free). Each rank names
halo levels; the three Power-facing halos are scoped `bless:<wife>` -- the Fellows that member blesses:
    WifeN_NewHalo_2  talent            -> the talent bucket   (Wife185 L8 = 355, Shinobu's panel)
    WifeN_NewHalo_3  atk percent       -> the percent bucket  (Wife185 L6 = 15,000)
    WifeN_NewHalo_4  talentLvLimit(/Both) -> a talent LEVEL cap raise
  NewHalo_1 is `city | yield percent` (business income, not Power) and AddValue is intimacy/charm: both
  recorded per rank as `yield` and left for lib/ to decide. Values are CUMULATIVE at the level the rank
  names and carried across ranks that do not name them (the same rule scripts/import-hero-spirit.py uses).
STELLA-UNLOCKED PAIRS. 58 WifeBless rows carry heroSpiriteUnlock / heroSpiriteUnlockLevel: the pair
  (wife, hero) exists only once that hero's own Stella reaches the level (HeroSpirit AddWifeBless, 57 rows).
QUENCHING, deterministic (docs/artifact-quenching.md recommendation 3, spec 3.5): no country roll, no
  keep-or-discard. A slot climbs the EquipmentQuenching riseADH ladder; reaching row r costs the gold of the
  EXPECTED number of Normal rolls to land a country-matched rise >= 100 x r -- ceil(5 / P_normal(row >= r)),
  the 5 being the 1-in-5 country gate -- summed over EquipmentQuenchingConsume's own per-roll gold price.
  Rows 1-4 have weight 0 in every column and are never reachable, so a slot is 0 or 5..25. Slot count per
  artifact: Equipment.quenchingSlotSetInitial.

Output: lib/family-stella-data.json.
"""
import hashlib, json, math, os, subprocess
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


TABLES = ('WifeSpirit', 'WifeBless', 'SkillBase', 'SkillLevel', 'Equipment', 'EquipmentQuenching', 'EquipmentQuenchingConsume')
T = {n: table(n) for n in TABLES}
assert (len(T['WifeSpirit']), len(T['WifeBless']), len(T['EquipmentQuenching']), len(T['EquipmentQuenchingConsume'])) == (2109, 798, 25, 2000)
SB = {r['_id']: r for r in T['SkillBase']}
uneven = {}
for r in T['SkillLevel']:
    if 'skillProp_Level_Uneven_Growth' in r:
        uneven.setdefault(r['skillType'], {})[number(r['level'])] = number(r['skillProp_Level_Uneven_Growth'])

# ---- Family Stella ----
by = {}
for r in T['WifeSpirit']:
    by.setdefault(str(r['wifeid']), []).append(r)
wives = {}
for w, rows in by.items():
    rows.sort(key=lambda r: number(r['rank']))
    assert [number(r['rank']) for r in rows] == list(range(len(rows))), w
    assert number(rows[0]['wifeSpiritCost'][0]['count']) == 0, w
    items = {c['id'] for r in rows for c in r['wifeSpiritCost']}
    assert len(items) == 1, (w, items)
    carry = {'talent': 0, 'percent': 0, 'limit': 0, 'yield': 0}
    out = []
    for r in rows:
        for e in r['wifeSpiritEffect']:
            if e['typ'] != 'SkillAddHalo':
                assert e['typ'] in ('AddValue', 'ItemAddTitleCombined', 'ItemAddTitleBase', 'ItemAddHeadIcon', 'AddCustomBless'), e
                continue
            b = SB[e['id']]
            prop, tc = b['skillProp'], b['targetCondition']
            lvl = number(e['level'])
            v = uneven[b['skillType']].get(lvl) if b.get('skillProp_Growth_Type', 1) == 2 else \
                number(b.get('skillProp_Initial', 0)) + (lvl - 1) * number(b.get('skillProp_Level', 0))
            assert v is not None, (w, e)
            if prop['id'] == 'yield':
                assert tc['conditionType'] == 'all' and b['target'] == 'city', e
                carry['yield'] = v
                continue
            assert tc == {'conditionType': 'bless', 'id': w}, (w, e['id'], tc)
            key = {'talent': 'talent', 'atk': 'percent', 'talentLvLimit': 'limit', 'talentLvLimitBoth': 'limit'}[prop['id']]
            if key == 'percent':
                assert prop.get('propType') == 'percent', e
            carry[key] = v
        out.append([number(r['wifeSpiritCost'][0]['count']), carry['talent'], carry['percent'], carry['limit'], carry['yield']])
    for a, b in zip(out, out[1:]):
        assert all(y >= x for x, y in zip(a[1:], b[1:])), (w, a, b)
    wives['wife_' + w] = {'item': items.pop(), 'ranks': out}

# Positive controls from the owner's panel (spec 3.1): Wife185 at rank 20 pays 15,000 bp and 355 talent; the
# NewHalo_2/3/4 columns reproduce his Wife185 L6 / L8 halos. And a negative control: wife 1 has no track.
w185 = wives['wife_185']['ranks']
assert max(r[2] for r in w185) >= 15000 and 355 in [r[1] for r in w185], w185[-1]
assert 'wife_1' not in wives

# ---- Stella-unlocked blessing pairs ----
# The pair's Fellow is the one whose Stella unlocks it (heroSpiriteUnlock); where `heroid` is present it names
# the same hero (asserted), and some rows carry only the unlock field.
for r in T['WifeBless']:
    if r.get('heroSpiriteUnlock') and r.get('heroid'):
        assert str(r['heroid']) == str(r['heroSpiriteUnlock']), r
pairs = sorted([['wife_' + str(r['wifeid']), 'hero_' + str(r['heroSpiriteUnlock']), number(r['heroSpiriteUnlockLevel'])]
                for r in T['WifeBless'] if r.get('heroSpiriteUnlock')])
assert len(pairs) == 58 and ['wife_115', 'hero_114', 4] in pairs and ['wife_122', 'hero_264', 4] in pairs, len(pairs)

# ---- Quenching ladder ----
Q = sorted(T['EquipmentQuenching'], key=lambda r: number(r['_id']))
assert all(number(r['riseADH']) == 100 * number(r['_id']) for r in Q)
tw = sum(number(r['LevelWeightNormal']) for r in Q)
price = [number(r['consume']['count']) for r in sorted(T['EquipmentQuenchingConsume'], key=lambda r: number(r['_id']))]
assert all(r['consume']['id'] == '3' for r in T['EquipmentQuenchingConsume'])  # Item 3 is gold
cum = [0]
for p in price:
    cum.append(cum[-1] + p)
ladder = [[0, 0, 0]]  # [row, rolls, gold]
for rid in range(5, 26):
    pn = sum(number(r['LevelWeightNormal']) for r in Q if number(r['_id']) >= rid) / tw
    rolls = math.ceil(5 / pn)
    if rolls >= len(cum) or cum[rolls] > 2**53 - 1:
        # Past the 2,000 priced rolls, or past a safe integer of gold (Everkai's wallet tops out at MAX_GOLD
        # 1e15): the Normal track cannot reach this row. Row 16 (1,600) costs 1.46e12; row 17 costs 2.3e19.
        break
    ladder.append([rid, rolls, cum[rolls]])
assert ladder[1] == [5, 5, 83] and ladder[11][0] == 15 and ladder[-1][0] == 16, ladder[-3:]

gear = json.loads(subprocess.check_output(['node', '-e', "import('./lib/adventure.mjs').then(A=>console.log(JSON.stringify(A.GEAR.map(g=>g.id))))"], cwd=ROOT))
E = {r['_id']: r for r in T['Equipment']}
slots = {}
for g in gear:
    e = E.get(g.replace('Item_', '').replace('Weapon_Equipment_', 'Weapon_'))
    if e and number(e.get('quenchingSlotSetInitial', 0)) > 0:
        slots[g] = number(e['quenchingSlotSetInitial'])
assert slots.get('Item_Weapon_Equipment_1_1') == 2, slots.get('Item_Weapon_Equipment_1_1')

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: ' + ' + '.join(t + '.json' for t in TABLES),
    'sha256': {n: hashlib.sha256((L / f'{n}.json').read_bytes()).hexdigest() for n in TABLES},
    'boundary': ('Original values only. wives[id].ranks[r] = [shard cost of rank r, then CUMULATIVE talent, '
                 'atk percent (bp), talentLvLimit and city yield percent (bp) at rank r], all bless-scoped but '
                 'yield. stellaPairs = [wife, hero, the hero\'s Stella rank that unlocks the pair]. quench.ladder '
                 '= [row, expected Normal rolls to a country-matched rise >= row, cumulative gold of those rolls]; '
                 'quench.slots = Equipment.quenchingSlotSetInitial per Everkai artifact id.'),
    'wives': wives,
    'stellaPairs': pairs,
    'quench': {'ladder': ladder, 'slots': slots},
}
(ROOT / 'lib/family-stella-data.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
print({'wives': len(wives), 'pairs': len(pairs), 'ladderTop': ladder[-1], 'artifacts': len(slots),
       'bytes': (ROOT / 'lib/family-stella-data.json').stat().st_size})
