"""Import the pledge skill itself -- the half of Resonance that Everkai never paid.

WHAT RESONANCE IS. `docs/resonance-measurement.md` (2026-09-27) established that "Resonance" is the
original's English name for Pledge: all 57 SkillBase strings containing it are HeroNNNPledge rows, and
`SkillBase:name:Hero142Pledge` is literally "Resonance Skills". Fellow spec 08 had it down as a whole
missing system; most of it was already built.

WHAT WAS STILL MISSING, and it is one skill. A HeroPledge row has two halves:
  * `skillUnlock` -- three `self`-scoped talents at pledge level 30 / 60 / 100, worth 900 / 1,200 /
    1,500 at their own caps. Everkai already pays these (lib/talent-skills.mjs `kind:'pledge'`).
  * `pledgeSkill` -- the pledge's OWN skill, `targetCondition {conditionType:'pledge', id:<itself>}`,
    talent, 10 + 10 a level to level 100, so **1,000 talent at cap**. Everkai pays nobody: `reaches`
    knew all/country/rare/bond and not `pledge`, and lib/hero-advance.mjs's header has flagged it as
    the "pledge transfer" residual since the ladder was built.

WHO THE SCOPE REACHES, measured rather than guessed -- which is the whole reason this was deferred on
2026-09-27 rather than wired then. It is NOT a broadcast and not the owner:
  * `RequestNames.UNDERLING_SELECT_PLEDGE_HERO = "underling_select_pledge_hero"`, sent by
    `UnderlingManager:ReqBindHeroAlliance(hid, pledgeHeroId, pledgeId)` -- the player BINDS a chosen
    hero to a pledge.
  * `UnderlingManager:GetHeroAlliance(hid)` reads `underlings[hid].pledgeData[pledgeConf.pledgeSkill]`,
    whose `.heroId` is that chosen partner.
  * `UnderlingData.lua:784-792` walks `underlingsPledgeInfoMap` and looks the partner up in
    `otherUnderlingAddValues` -- the OTHER underlings' map.
So `pledge` reaches exactly one Fellow: the partner the player selected for that pledge. That is the
"pairing two fellows for mutual stat gain" fellow spec 08 described.

WHAT IS STILL NOT MEASURED, stated rather than assumed: WHICH heroes may be selected. The eligible set
is decided server-side -- the readable client only sends the request -- so the one restriction Everkai
applies (a pledge may not select its own owner) is LOCAL, resting on `GetOtherUnderlingAddValues`
resolving the partner from the other-underling map. Nothing found restricts one Fellow from partnering
several pledges, so Everkai does not either.
"""
import hashlib,json,collections
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(n):
 d=json.loads((CFG/f'{n}.json').read_text())
 return d if isinstance(d,list) else d[next(iter(d))]
def number(v):return int(float(v)) if isinstance(v,str) else int(v)

pledges=table('HeroPledge');skills={r['_id']:r for r in table('SkillBase')}
assert len(pledges)==15,len(pledges)

rows={}
for r in pledges:
 sid=r['pledgeSkill']
 assert sid in skills,f'{r["_id"]}: pledgeSkill {sid} has no SkillBase row'
 s=skills[sid];tc=s.get('targetCondition') or {}
 # The scope points at ITSELF -- {conditionType:'pledge', id:<this pledge skill>} -- which is what makes
 # it resolvable per pledge rather than per hero. Asserted because the whole import depends on it.
 assert tc.get('conditionType')=='pledge',f'{sid} is scoped {tc}'
 assert tc.get('id')==sid,f'{sid} scopes {tc.get("id")}, not itself'
 assert s['skillProp']=={'id':'talent'},f'{sid} pays {s["skillProp"]}'
 assert s.get('target')=='hero',f'{sid} targets {s.get("target")}'
 assert number(s.get('skillProp_Growth_Type',1))==1,f'{sid} is not linear'
 rows[sid]={'owner':f"hero_{r['heroId']}",'initial':number(s['skillProp_Initial']),
            'perLevel':number(s['skillProp_Level']),'max':number(s['maxUpgradeLevel'])}

# Rule 6: a constant column is not a measurement unless the constancy is named. Every one of the 15 is
# 10 + 10 a level to 100, so the ladder is UNIFORM -- that is a finding about the table, and it is
# asserted so a future row that differs cannot be averaged away silently.
shapes={(v['initial'],v['perLevel'],v['max']) for v in rows.values()}
assert shapes=={(10,10,100)},shapes
CAP=10+10*99
assert CAP==1000

owners={v['owner'] for v in rows.values()}
assert len(owners)==15,len(owners)
ship=[f['id'] for f in json.loads((ROOT/'lib/catalog-fellows.json').read_text())] if (ROOT/'lib/catalog-fellows.json').exists() else None

out={'sources':{n:hashlib.sha256((CFG/f'{n}.json').read_bytes()).hexdigest() for n in ('HeroPledge','SkillBase')},
     'note':("The pledge's own skill -- Resonance. targetCondition {conditionType:'pledge', id:<itself>}, "
             "paid to the ONE Fellow the player binds to that pledge (UNDERLING_SELECT_PLEDGE_HERO). "
             "Uniform 10 + 10 a level to level 100 = 1,000 talent at cap, on all 15."),
     'bucket':'talent','capTalent':CAP,'pledges':rows}
(ROOT/'lib/hero-pledge-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(f'{len(rows)} pledges, uniform {CAP:,} talent at cap, owners: '+', '.join(sorted(o.split("_")[1] for o in owners)))
