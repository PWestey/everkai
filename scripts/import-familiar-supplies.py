"""Import the original familiar training items and the Familiar Tower's hourly income.

System.json names the items: PetLevelUPItem = Item_PetLevelUP (charged by PetLevel.Cost),
PetClassUPItem = Item_PetClassUP (charged by PetClass.Cost), PetTowerIncome = those two in that order,
PetTowerIncomeTime = 24 (hours an uncollected income holds). PetTower.json has 300 floors, each with
Income [level-up items, class-up items] per hour.
Everkai's tower is a 12-floor local stand-in, so local floor n takes original floor 25n's income:
floor 1 pays what the original's floor 25 pays and floor 12 pays floor 300's. That mapping is local.
Star costs (PetStar.Cost) name no item in any table read; Everkai charges class-up items for them and
says so in the UI.
"""
import hashlib,json
from pathlib import Path
D=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
ROOT=Path(__file__).resolve().parent.parent
rows=lambda n:list(json.loads((D/f'{n}.json').read_text()).values())[0]
system={r['_id']:r for r in rows('System')}
assert system['PetLevelUPItem']['stringValue']=='Item_PetLevelUP'
assert system['PetClassUPItem']['stringValue']=='Item_PetClassUP'
assert system['PetTowerIncome']['jsonValue']==['Item_PetLevelUP','Item_PetClassUP']
hours=system['PetTowerIncomeTime']['numberValue'];assert hours==24
tower={t['_id']:t['Income'] for t in rows('PetTower')};assert len(tower)==300
out={'sources':{n:hashlib.sha256((D/f'{n}.json').read_bytes()).hexdigest() for n in ['System','PetTower']},
 'items':{'levelUp':'Item_PetLevelUP','classUp':'Item_PetClassUP'},'holdHours':hours,
 'floorIncome':[tower[str(25*n)] for n in range(1,13)]}
assert out['floorIncome'][-1]==tower['300']
(ROOT/'lib/familiar-supply-data.json').write_text(json.dumps(out,indent=1)+'\n')
print(out['floorIncome'])
