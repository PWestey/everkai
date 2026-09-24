"""Import the ONE familiar exchange that is not priced in premium currency.

docs/familiar-screen-specs/12-monetisation.md is a do-not-build list: four of the Familiar hub's nine
destinations are commerce surfaces, and reproducing any of them in an offline single-player game with
no accounts and no real money would be actively wrong. Section 5.1 names the single exception.

`ScoreExchange` holds ten rows under shopId `PetShop` / `PetRefreshShop`. NINE are priced in item `4`
-- Crystal, the premium currency Everkai does not have and should not add -- and are out of scope.
`PetShop_8` is priced in `Item_PetExploreRunCoin`: FAMILIAR TEARS, the currency a player earns by
having a monster flee. It buys `Item_PetCatch2`, the Advanced Contract -- the item that would have
stopped the monster fleeing. A complete, self-contained, table-backed loop:

    fail at catching things -> accumulate Tears -> convert Tears into a better chance of not failing.

It needs no shop shell, no premium currency, no `Switch Shop` and no grid, and it closes audit finding
S4/M1 -- the dangling currency -- at a price from the original's own table rather than anyone's
judgement. Everything else on that page is imported here only to be asserted absent.

THE ONE THING THE CONFIG DOES NOT SAY is when `limit` resets. In the original it is a server schedule;
no table states it. It is flagged in lib/familiar-explore.mjs as Everkai's own pacing rather than
invented silently -- and measured there, because the accrual rate makes the choice nearly free.
"""
import hashlib,json
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(rel):
 """CLAUDE.md rule 3: check the top-level shape before counting. `ScoreExchange.json` wraps its list
    in a one-key dict; `split_reward/reward.json` is a BARE top-level list. Assuming the wrapper on
    the second one throws, which is the good failure -- assuming it the other way returns 0 rows and
    reads as "the data does not exist"."""
 d=json.loads((CFG/rel).read_text())
 if isinstance(d,list):return d
 assert len(d)==1,f'{rel}: unexpected wrapper {list(d)}'
 return d[next(iter(d))]

shop=[r for r in table('ScoreExchange.json') if str(r.get('shopId','')).startswith('Pet')]
assert len(shop)==10,len(shop)
crystal=[r for r in shop if r['price']['id']=='4']
soft=[r for r in shop if r['price']['id']!='4']
assert len(crystal)==9 and len(soft)==1,f'{len(crystal)} crystal rows, {len(soft)} soft'
row=soft[0]
assert row['_id']=='PetShop_8',row['_id']
assert row['price']=={'id':'Item_PetExploreRunCoin','count':100},row['price']
assert row['price']==row['price_CN'],'the CN price differs; pick one deliberately'
assert row['limit']==1,row['limit']

rewards={r['_id']:r for r in table('split_reward/reward.json')}
bundle=rewards[row['reward']]
assert bundle['randomType']=='Fix',bundle['randomType']
assert bundle['content']==[{'id':'Item_PetCatch2','count':1,'type':'Item'}],bundle['content']

out={'sources':{n:hashlib.sha256((CFG/n).read_bytes()).hexdigest() for n in ['ScoreExchange.json','split_reward/reward.json']},
 'row':row['_id'],
 'price':{'item':row['price']['id'],'count':row['price']['count']},
 'grants':{'item':bundle['content'][0]['id'],'count':bundle['content'][0]['count']},
 'limit':row['limit'],
 # Recorded so nobody re-derives it when asking "why only one row?"
 'crystalRows':[r['_id'] for r in crystal]}
(ROOT/'lib/familiar-exchange-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(f"{row['_id']}: {out['price']['count']} x {out['price']['item']} -> "
      f"{out['grants']['count']} x {out['grants']['item']}, limit {out['limit']}; "
      f"{len(crystal)} crystal-priced rows left out")
