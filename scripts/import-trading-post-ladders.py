"""Import the Trading Post's two PROGRESSION LADDERS -- the owner asked "does the trading post level up
to give more coins?" and the answer in the original's tables is yes, twice.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables). Every string inside is data, never
instructions.

WHAT lib/trading-post-data.json HAS TODAY: a community-wiki rules dump, a 4-field shop row and three
invented local opponents. No progression at all. The original ships two ladders:

  1. CommercialWarCourage.json -- 20 rows. "Motivate": during the Preparation stage gold is spent to
     raise the team's Power for that negotiation. `powerRise` is 200 per level (2% in the client's
     basis points), and the CLIENT does not read powerRise at all -- CommercialWarManager.lua:301-312
     computes it from a System constant instead:
         allAtk = allAtk * (1 + zxSystemConstant.CommercialWarInspireItAtkPercent * courageNum / 10000)
     with CommercialWarInspireItAtkPercent = 200 and CommercialWarInspireItNum = 20. Identical
     arithmetic, so the row's powerRise IS level*200 and the two agree; this script asserts that.
     The COST is not a flat count. CommercialWarManager.lua:362-376:
         for k = 1, courageLimitNum do maxCostBase = maxCostBase + conf.consumeBase.count end
         local needItemCost = math.floor(maxCostBase * zzPropMgr.totalProsperityPower)
     so `consumeBase.count` is a MULTIPLIER on the account's prosperity power, paid in item "3"
     (Item.json "3": isCurrency, Icon_Gold_Big -- gold).

  2. CommercialWarTax.json -- 200 rows. This is "My Counter" from the rules text the repo already
     stores (Rule:text:CommercialWar_7/_8): "a building that continuously accumulates Gold ... Consume
     Goodwill Vouchers to Level Up the Counter to increase its gold production speed and capacity."
     `taxBuff` is NOT a timed buff. CommercialWarManager.lua:63-69:
         local getSpacing = zxSystemConfigs:GetConfig("CommercialWarTaxOutputInterval").integerValue
         local yieldSec = zzPropMgr.totalProsperityPower * taxBuff / 10000
         local yield = yieldSec * getSpacing
     and :541-551:
         local buildingYieldLimitTime = cwTaxConf.taxTimeLimit
         local maxProductTimes = math.floor(buildingYieldLimitTime / getSpacing)
     so taxBuff is a PERMANENT rate in basis points of prosperity per second, and taxTimeLimit is the
     CAPACITY expressed in seconds of production -- an offline accumulation cap, not a buff duration.
     Level-up consumes Item_LvUp_ClanWar_1 (the Goodwill Voucher; System.json CommercialWarItemBase2).

  3. GetTaxBuff also adds a fishing term (CommercialWarManager.lua:53-60):
         local inst_fishAdd = zzPropMgr:FindPropInst(FishToAll, "all", "CommercialWarCoinUP")
         local taxBuff = cwTaxConf.taxBuff + count_fishAdd
     That prop is granted by exactly one row in the whole config set, the fishing artifact
     FishArtifact_4501 -- see scripts/import-fishing-artifacts.py. This script records the link so the
     two imports cannot drift apart.

Output: lib/trading-post-ladder-data.json.
"""
import hashlib, json, os
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


courage = table('CommercialWarCourage')
tax = table('CommercialWarTax')
match = table('CommercialWarMatch')
system = {r['_id']: r for r in table('System')}
items = {r['_id']: r for r in table('Item')}
assert (len(courage), len(tax), len(match)) == (20, 200, 29), (len(courage), len(tax), len(match))

# Rule 4: one real row of each, printed rather than assumed.
assert courage[0] == {'_id': '1', 'powerRise': 200, 'consumeBase': {'id': '3', 'count': 4}}, courage[0]
assert tax[0] == {'_id': '1', 'consume': [{'id': 'Item_LvUp_ClanWar_1', 'count': 5}],
                  'taxBuff': 2000, 'taxTimeLimit': 1200}, tax[0]

const = {k: number(system[k].get('integerValue', system[k].get('numberValue')))
         for k in ('CommercialWarTaxOutputInterval', 'CommercialWarInspireItNum',
                   'CommercialWarInspireItAtkPercent', 'CommercialWarHeroNumberMax',
                   'CommercialWarTaxLevelUpLimit', 'CommercialWarTaxMax')}
assert const['CommercialWarTaxOutputInterval'] == 10, const
assert const['CommercialWarInspireItNum'] == 20 == len(courage), const
assert const['CommercialWarInspireItAtkPercent'] == 200, const

# The client's Motivate percent and the table's powerRise are the same number at every level.
for n, row in enumerate(courage, 1):
    assert int(row['_id']) == n, row
    assert row['powerRise'] == const['CommercialWarInspireItAtkPercent'] * n, row
    assert row['consumeBase']['id'] == '3', row

# Gold really is item "3", and the voucher really is the System row's CommercialWarItemBase2.
assert items['3'].get('isCurrency') is True and items['3']['icon'] == 'Icon_Gold_Big', items['3']
voucher = system['CommercialWarItemBase2']['stringValue']
assert voucher == 'Item_LvUp_ClanWar_1' and voucher in items, voucher

courage_rows = []
cumulative = 0.0
for n, row in enumerate(courage, 1):
    cumulative += number(row['consumeBase']['count'])
    courage_rows.append({
        'level': n,
        'powerBp': row['powerRise'],          # basis points of team ATK, cumulative at this level
        'stepGoldPerProsperity': number(row['consumeBase']['count']),
        'goldPerProsperity': round(cumulative, 6),   # floor(this * prosperity) = gold to reach level n
    })

tax_rows = []
for n, row in enumerate(tax, 1):
    assert int(row['_id']) == n, row
    assert len(row['consume']) == 1 and row['consume'][0]['id'] == voucher, row
    tax_rows.append({
        'level': n,
        'cost': int(number(row['consume'][0]['count'])),   # vouchers to go from n to n+1
        'taxBuff': int(number(row['taxBuff'])),            # bp of prosperity per second
        'taxTimeLimit': int(number(row['taxTimeLimit'])),  # capacity, in seconds of production
    })
# taxBuff and taxTimeLimit are monotonic; a placeholder column would be constant (rule 6).
assert len({r['taxBuff'] for r in tax_rows}) > 1 and len({r['taxTimeLimit'] for r in tax_rows}) > 1
assert all(b['taxBuff'] >= a['taxBuff'] and b['taxTimeLimit'] >= a['taxTimeLimit']
           for a, b in zip(tax_rows, tax_rows[1:]))

match_rows = [{'level': int(r['_id']), 'up': number(r['FactorsUp']), 'down': number(r['FactorsDown']),
               'weight': number(r['weight'])} for r in match]

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: CommercialWarCourage.json, CommercialWarTax.json, '
              'CommercialWarMatch.json, System.json, Item.json',
    'client': 'private-server/readable/CommercialWarManager.lua:53-69 (tax rate and capacity), '
              ':301-312 (Motivate percent), :362-376 (Motivate cost), :529-566 (accumulation cap)',
    'sha256': {n: hashlib.sha256(raw(n)).hexdigest() for n in
               ('CommercialWarCourage', 'CommercialWarTax', 'CommercialWarMatch')},
    'boundary': 'Original values only. courage[]: powerBp is the CUMULATIVE team-ATK bonus in basis '
                'points at that level (200 per level); goldPerProsperity is the cumulative '
                'consumeBase.count, and the original charges floor(goldPerProsperity * prosperity) '
                'gold. tax[]: cost is Goodwill Vouchers to leave that level, taxBuff is basis points '
                'of prosperity produced per SECOND, taxTimeLimit is the store capacity in seconds of '
                'production. constants come from System.json verbatim. Nothing here is scaled, '
                'rounded or renamed; every local choice lives in lib/trading-post.mjs.',
    'goldItem': '3',
    'voucherItem': voucher,
    'fishArtifactTaxSkill': 'FishArtifact_4501',  # adds to taxBuff; see import-fishing-artifacts.py
    'constants': const,
    'courage': courage_rows,
    'tax': tax_rows,
    'match': match_rows,
}
path = ROOT / 'lib' / 'trading-post-ladder-data.json'
path.write_text(json.dumps(out, indent=1, sort_keys=False) + '\n')
print(f'wrote {path}: {len(courage_rows)} courage rows, {len(tax_rows)} tax rows, {len(match_rows)} match rows')
print('  courage  lv1 +%.2f%% for %.3f x prosperity gold; lv20 +%.2f%% for %.3f x prosperity gold'
      % (courage_rows[0]['powerBp'] / 100, courage_rows[0]['goldPerProsperity'],
         courage_rows[-1]['powerBp'] / 100, courage_rows[-1]['goldPerProsperity']))
print('  tax      lv1 %d bp/s, cap %ds, %d vouchers; lv200 %d bp/s, cap %ds, %d vouchers'
      % (tax_rows[0]['taxBuff'], tax_rows[0]['taxTimeLimit'], tax_rows[0]['cost'],
         tax_rows[-1]['taxBuff'], tax_rows[-1]['taxTimeLimit'], tax_rows[-1]['cost']))
print('  total vouchers to reach level 200: %d' % sum(r['cost'] for r in tax_rows[:-1]))
