"""Import the Familiar Compendium (the Handbook) -- parity row E8.

docs/familiar-screen-specs/11-handbook.md 0 records the finding this table exists for: the Compendium
is the ONLY cross-system faucet on the familiar surface, and it pays a CHARACTER stat. Every level
grants `Power of [Type] Fellow +5%` across the same five types the Fellow roster filters by, so
collecting familiars is mechanically a Fellow-power investment.

CLAUDE.md rule 6 -- the interesting fact about PetBookLevel is what does NOT vary. Measured over all
300 rows and asserted below:
  exp             1 distinct value  (100)   -> every level costs the same; 30,000 EXP to the ceiling
  PowerCoef.value 1 distinct value  (500)   -> 500 basis points = +5%, the same on every rung
  Reward          2 distinct values         -> _01 on rows 1-50, _02 on 51-300
  PowerCoef.Country 5                       -> the ONLY column that varies
There is no growth curve here. A ladder drawn as a rising line would be a lie about the data.

AND A CORRECTION to docs/familiar-data-inventory.md 2, which recorded the country as "cycling 1->5 in
blocks of 60 rows". Run-length encoded here: 300 runs, every run of length 1. One country per level,
1,2,3,4,5,1,2,3,4,5,... A blocked reading would have built a Compendium whose first sixty levels all
paid Inspiring. Each country still gets 60 of the 300 levels, so the ceiling is unchanged:
60 x 500 bp = +300% Power to each of the five Fellow types.

THE REWARD HALF DOES NOT PORT. Reward_PetBookLevel_01/02 both pay 100 x item `4` -- the premium
Crystal, which Everkai does not have and should not add -- plus Item_PetClassUP (shipped) or
Item_PetRefresh1 (Metamorphosis, parity E7, deferred). The PowerCoef half is imported; the reward
half is an owner decision blocked on E7 anyway.

The per-familiar EXP badge is two more constant tables (rule 6 again):
  System.NewPetBookEXP    for owning it       {1:10, 2:20, 3:50, 4:100, 5:400, 9:200}
  System.NewPetSPBookEXP  for the SP variant  identical values
  PetStar.BookEXP         per star            {1:1, 2:2, 3:5, 4:10, 5:40, 9:20}, identical on all 100 rows
Keyed by `Pet.grade`, whose six values are exactly those six keys: 1 N, 2 R, 3 SR, 4 SSR, 5 UR, 9 SSR+.
Cross-check from the capture, not read off it: Umbranther is grade 4 at 5 stars and its badge reads
150 = 100 + 5 x 10. Wumeow at 0 stars reads 100.
"""
import hashlib,json,itertools,collections
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(n):
 d=json.loads((CFG/f'{n}.json').read_text())
 assert len(d)==1,f'{n}: unexpected wrapper {list(d)}'   # rule 3: check the shape before counting
 return d[next(iter(d))]

book=table('PetBookLevel')
assert len(book)==300,len(book)
assert {r['exp'] for r in book}=={100}
assert {r['PowerCoef']['value'] for r in book}=={500}
rewards=collections.Counter(r['Reward'] for r in book)
assert rewards=={'Reward_PetBookLevel_01':50,'Reward_PetBookLevel_02':250},rewards
countries=[int(r['PowerCoef']['Country']) for r in book]
runs=[len(list(g)) for _,g in itertools.groupby(countries)]
assert len(runs)==300 and max(runs)==1,f'country runs: {len(runs)} runs, longest {max(runs)}'
assert collections.Counter(countries)=={1:60,2:60,3:60,4:60,5:60}
assert [r['_id'] for r in book]==[str(n) for n in range(1,301)],'levels are not 1..300 in order'

system={r['_id']:r for r in table('System')}
own={k:v['exp'] for k,v in system['NewPetBookEXP']['jsonValue'].items()}
sp={k:v['exp'] for k,v in system['NewPetSPBookEXP']['jsonValue'].items()}
assert own=={'1':10,'2':20,'3':50,'4':100,'5':400,'9':200},own
assert sp==own,'the SP table is documented as identical; it is not any more'

star=table('PetStar')
assert len(star)==100
shapes={json.dumps(r['BookEXP'],sort_keys=True) for r in star}
assert len(shapes)==1,f'PetStar.BookEXP varies by star ({len(shapes)} shapes) -- it used to be flat'
per_star={k:v['exp'] for k,v in star[0]['BookEXP'].items()}
assert per_star=={'1':1,'2':2,'3':5,'4':10,'5':40,'9':20},per_star

pets=table('Pet')
grades={f"Pet_{r['_id']}":r['grade'] for r in pets}
assert set(map(str,grades.values()))<=set(own),'a Pet.grade has no NewPetBookEXP row'
groups=sorted(int(r['_id']) for r in table('PetGroup'))
assert groups==[1,2,3,4],groups   # H7: the capture's filter shows three; the table has four

out={
 'sources':{n:hashlib.sha256((CFG/f'{n}.json').read_bytes()).hexdigest()
            for n in ['PetBookLevel','System','PetStar','Pet','PetGroup']},
 'expPerLevel':100,'coefBP':500,'maxLevel':300,
 'countries':countries,          # index 0 = level 1
 'ownEXP':own,'spEXP':sp,'starEXP':per_star,
 'grades':grades,'groups':groups,
 # Recorded, not imported: see the docstring. Kept so a later E7 decision does not have to re-measure.
 'rewardTiers':{'Reward_PetBookLevel_01':'levels 1-50','Reward_PetBookLevel_02':'levels 51-300'},
}
(ROOT/'lib/familiar-handbook-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(f"{len(book)} Compendium levels, {len(grades)} familiar grades, "
      f"countries 1-5 x 60, {sum(own.values())=}, ceiling +{60*500//100}% per Fellow type")
