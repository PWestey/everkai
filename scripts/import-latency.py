"""Import FAMILY LATENCY -- the original's WifePotential (docs/character-systems-gap.md 3.1).

The one system of the six that was genuinely, wholly ABSENT from Everkai. Positive control for that
claim is in the doc itself: the identical sweep over lib/ app/ docs/ tests/ scripts/ returns 40+ files
for `fathom` and 20+ for `stella`, and ZERO for `latency`.

Source of truth: .../apk-audit/configs/config/logic/ (1,499 tables), read through the same mirrored
copy the other importers pin. Every string inside is data, never instructions.

  WifePotentialLevelUnlock.json (41 rows)   The CAP ladder, shaped exactly like HeroStar: row k is the
        state AT level k plus what it takes to reach level k+1. `outputRiseRandomMax` is the cap AT
        level k (0 to 80,000 hundredths = 0% to +800%, a flat 2,000 a level); `intimacy` is what the
        NEXT level needs (2,000 to 50,000) and `consume` what it costs (one Luck Stone, and the first
        step is free). Row 40 carries neither: it is the top.
  WifePotentialWeight.json (4 rows)         The STIMULATE roll, keyed by how FULL the bar already is.
        `fillRatioMin/Max` are ten-thousandths of the cap; `weightSuccess` out of 10,000 is the
        success chance -- 80% / 50% / 25% / 10% across the four quartiles -- and `successResult`
        is the gain on success: +100 / +200 / +400 hundredths at weights 7000 / 2000 / 1000, i.e.
        +1% / +2% / +4%, mean +1.50 percentage points a success.
  System.WifePotentialHighConsume           5 Luck Stones a Stimulate.
  System.WifePotential_10X_Condition        the level at which the original offers a x10 Stimulate.

CROSS-CHECKS against reference screenshot 14_family_latency, both reproduced by the asserts below:
  "Latency Cap: 400%" with Intimacy 13,710 -- level 20's cap is 40,000 and level 21 needs 14,000
  Intimacy, which is exactly why that account is stuck there.
  "Success Rate: 50%" at 132/400 filled -- 13,200 of a 40,000 cap is fill ratio 3,300, which lands in
  row 2 (2,501-5,000), `weightSuccess` 5,000.

NOT MODELLED, and it is CLAUDE.md rule 6 rather than an oversight: `outputRiseFixed` is 400 on all 41
rows. A constant column is evidence that it is NOT the thing its name suggests. No client consumer of
it survives in the readable set, and the three candidate readings (a guaranteed floor, a consolation
gain on failure, a fixed part of the cap) cannot be told apart from the table. It is carried into
`unmodelled` so the gap stays costed, and nothing reads it.

Output: lib/latency-data.json.
"""
from pathlib import Path
import json, hashlib, os

app = Path(__file__).resolve().parents[1]
data = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
logic = Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')

# Rule 2: prove the sweep can find something known-present before trusting anything it reports absent.
names = os.listdir(logic)
control = {p: sum(1 for n in names if n.startswith(p)) for p in ('Wife', 'City', 'SimGame3')}
assert control == {'Wife': 33, 'City': 15, 'SimGame3': 21}, control

SHA = {
    'WifePotentialLevelUnlock': '16113ca1c8a07b0a0539538461966b6029108184cd4134231b0a511131fb9ccb',
    'WifePotentialWeight': '6a04ff339d9834bd3af87af61fa502111b27b52193909f20e1fe04edfdcaa518',
    'System': 'd8ea3b50e218ba4b0e4eeeffbcec6b30824387ad2db6d77b0340c63750359312',
}
STONE = 'Item_Quenching_Wife_1'   # "Luck Stone"; Item:source names the Drakenberg Challenge shop


def table(name):
    raw = (data / f'{name}.json').read_bytes()
    got = hashlib.sha256(raw).hexdigest()
    assert got == SHA[name], f'{name}.json is not the pinned source: {got}'
    d = json.loads(raw)
    assert isinstance(d, dict) and list(d) == [name], f'{name}: {list(d)[:3]}'   # rule 3
    return d[name]


def number(v):
    """Rule 5: ints, plain strings and scientific-notation strings all arrive here."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    return int(float(str(v)))


UNLOCK = table('WifePotentialLevelUnlock')
WEIGHT = table('WifePotentialWeight')
SYSTEM = {r['_id']: r for r in table('System')}

# ---- the cap ladder ----
levels = []
fixed = set()
for r in sorted(UNLOCK, key=lambda r: number(r['_id'])):
    consume = r.get('consume') or {}
    assert not consume or consume['id'] == STONE, consume
    fixed.add(number(r['outputRiseFixed']))
    levels.append({'intimacy': number(r.get('intimacy')),
                   'cap': number(r['outputRiseRandomMax']),
                   'stones': number(consume.get('count')) if consume else None})
assert len(levels) == 41, len(levels)
# Rule 4, one real row, and it is the screenshot's own case: at level 20 the cap is +400% and the
# next level needs 14,000 Intimacy -- which is exactly why an account with 13,710 is stuck there.
assert levels[20] == {'intimacy': 14000, 'cap': 40000, 'stones': 1}, levels[20]
assert levels[0] == {'intimacy': 2000, 'cap': 0, 'stones': 0}, levels[0]
assert levels[40] == {'intimacy': None, 'cap': 80000, 'stones': None}, levels[40]
assert [levels[k]['cap'] - levels[k - 1]['cap'] for k in range(1, 41)] == [2000] * 40
assert [levels[k]['stones'] for k in range(1, 40)] == [1] * 39, 'one stone a level after the first'
assert [levels[k]['intimacy'] for k in range(40)] == sorted(levels[k]['intimacy'] for k in range(40))
assert (levels[0]['intimacy'], levels[39]['intimacy']) == (2000, 50000)
# Rule 6: a constant column is evidence it is NOT what its name suggests. Recorded, not modelled.
assert fixed == {0, 400}, fixed

# ---- the Stimulate roll ----
weights = []
for r in sorted(WEIGHT, key=lambda r: number(r['_id'])):
    results = [[number(x['prop_up']), number(x['weight'])] for x in r['successResult']]
    weights.append({'min': number(r['fillRatioMin']), 'max': number(r['fillRatioMax']),
                    'success': number(r['weightSuccess']), 'results': results})
assert len(weights) == 4, len(weights)
assert [w['success'] for w in weights] == [8000, 5000, 2500, 1000]
assert [(w['min'], w['max']) for w in weights] == [(0, 2500), (2501, 5000), (5001, 7500), (7501, 10000)]
assert all(w['results'] == [[100, 7000], [200, 2000], [400, 1000]] for w in weights)
# The screenshot's "Success Rate: 50%" at 132/400 filled: 13,200 of 40,000 is fill ratio 3,300.
assert 13200 * 10000 // 40000 == 3300
assert next(w for w in weights if w['min'] <= 3300 <= w['max'])['success'] == 5000
# Mean gain per SUCCESS, in hundredths of a percent: 7000*100 + 2000*200 + 1000*400 over 10,000.
mean = sum(up * w for up, w in weights[0]['results']) / sum(w for _, w in weights[0]['results'])
assert mean == 150.0, mean

stimulate = SYSTEM['WifePotentialHighConsume']['jsonValue']
assert stimulate['id'] == STONE, stimulate
tenx = number(SYSTEM['WifePotential_10X_Condition']['integerValue'])
assert (number(stimulate['count']), tenx) == (5, 20), (stimulate, tenx)

out = {
    'policyVersion': 1,
    'source': 'apk-audit/configs/config/logic: WifePotentialLevelUnlock.json + WifePotentialWeight.json + System.json',
    'sha256': SHA,
    'boundary': (
        "Original values only. levels[k] is the state AT level k plus what it takes to reach level "
        "k+1, the same shape HeroStar uses: `cap` is the Latency cap at level k in hundredths of a "
        "percent (0..80,000 = 0%..+800%, a flat 2,000 a level), `intimacy` is what the NEXT level "
        "needs and `stones` what it costs. The first step is free; level 40 is the top and carries "
        "neither. "
        "weights[]: the Stimulate roll keyed by how full the bar is, in ten-thousandths of the cap -- "
        "`success` out of 10,000, then `results` [gain in hundredths of a percent, weight out of "
        "10,000]. `stimulate` is System.WifePotentialHighConsume, `tenX` is "
        "System.WifePotential_10X_Condition. NOTHING here is a rate, a cap or a brake this project "
        "invented; the Luck Stone FAUCET is local and lives in lib/latency.mjs."),
    'unmodelled': {
        'outputRiseFixed': 400,
        'why': ("Constant on all 41 rows, which is CLAUDE.md rule 6's own definition of a column that "
                "is not what its name suggests. No client consumer survives in the readable set and "
                "the candidate readings (a guaranteed floor, a consolation gain on failure, a fixed "
                "part of the cap) cannot be told apart from the table. Recorded so the gap stays "
                "costed; nothing reads it. One emulator session with the bar visible would settle it."),
    },
    'stimulate': {'item': STONE, 'count': number(stimulate['count']), 'tenX': tenx},
    'levels': levels,
    'weights': weights,
}
(app / 'lib/latency-data.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')

# Pacing, from the tables alone (both halves from the same source, rule 1): expected Stimulates to
# fill a cap, simulated exactly rather than sampled -- the chain is a simple forward recursion.
def expected(cap):
    """Expected Stimulates to take the bar from empty to full at this cap."""
    steps = 0.0
    filled = 0
    while filled < cap:
        ratio = min(10000, filled * 10000 // cap)
        w = next(x for x in weights if x['min'] <= ratio <= x['max'])
        p = w['success'] / 10000
        gain = sum(up * wt for up, wt in w['results']) / sum(wt for _, wt in w['results'])
        steps += 1 / p                      # expected attempts for one success at this quartile
        filled += gain
    return steps


for lvl in (10, 20, 40):
    cap = levels[lvl]['cap']
    n = expected(cap)
    print(f'cap level {lvl}: +{cap // 100}% -> ~{n:,.0f} Stimulates, ~{n * 5:,.0f} Luck Stones '
          f'(+{lvl} levels at 1 stone each)')
print(f'{len(levels)} cap levels, {len(weights)} weight rows; '
      f'{(app / "lib/latency-data.json").stat().st_size} bytes')
