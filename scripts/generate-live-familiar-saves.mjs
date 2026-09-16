// Regenerates tests/familiar-save-6b13d1a-*.json with the LIVE 25n build (CLAUDE.md rule 12), the one the
// owner's real save has already loaded. It must run against that build's lib, never the current one:
//   git archive 6b13d1a lib | tar -x -C /some/scratch
//   LIB=/some/scratch/lib/ OUT=tests/ node scripts/generate-live-familiar-saves.mjs
// Inputs are the bafe728-generated saves already in tests/. Prints, FROM THE LIVE BUILD, the figures that
// tests/familiar-tower-redo.test.mjs pins.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const LIB=process.env.LIB,OUT=process.env.OUT;
if(!LIB||!OUT)throw Error('Set LIB (the live build lib/ directory) and OUT (the tests directory).');
const lib=f=>import(pathToFileURL(LIB+f).href);
const {fresh,act,valid,decode}=await lib('game.mjs');
const {towerKey,towerState,TOWER_FLOORS}=await lib('familiar-tower.mjs');
const {FAMILIARS}=await lib('familiars.mjs');
const {familiarPower,dispatchUnlocked,DISPATCH_AREAS,dispatchState}=await lib('familiar-dispatch.mjs');
const {suppliesWaiting,towerIncome,familiarSupplies}=await lib('familiar-supplies.mjs');
const {exploreState}=await lib('familiar-explore.mjs');
if(TOWER_FLOORS!==300||towerState(fresh(0)).policyVersion!==2)throw Error('LIB is not the live 25n build.');
const H=3600e3,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);if(r.error)throw Error(a+': '+r.error);if(!valid(r.state))throw Error('invalid '+a);return r.state};
const report=(name,s)=>console.log(name,JSON.stringify({cleared:towerState(s).cleared,income:towerIncome(s),supplies:familiarSupplies(s),waiting:suppliesWaiting(s),unlocked:DISPATCH_AREAS.map(a=>dispatchUnlocked(s,a.id)),run:dispatchState(s).run,area:exploreState(s).area,explore:exploreState(s).items,familiars:Object.keys(s.familiars).length}));
const write=(name,s)=>{if(!valid(s))throw Error(name+' invalid');writeFileSync(`${OUT}/familiar-save-6b13d1a-${name}.json`,JSON.stringify(s));report(name,decode(JSON.stringify(s)));};

// 1. The floor-7 sandbox save after loading on the live build (floor 175), then climbed five more floors there
//    (so floors 176-180 were PAID by the live build), moved to exploring Snowy Plains, 3.5 h of income waiting.
{
 let s=decode(readFileSync(new URL(`${OUT}/familiar-save-bafe728-floor7.json`,pathToFileURL(process.cwd()+'/')),'utf8'));
 let now=s.lastAt;
 s={...s,familiarSupplies:{...s.familiarSupplies,levelUp:s.familiarSupplies.levelUp+5e6,classUp:s.familiarSupplies.classUp+1e5}};
 for(const id of towerState(s).party)for(let i=0;i<8;i++){const r=act(s,'trainFamiliar',now,id,10);if(!r.error)s=r.state;}
 while(towerState(s).cleared<180)s=at(s,'towerFight',now,towerKey(s));
 s=at(s,'collectFamiliarSupplies',now+H);now+=H;
 s=at(s,'exploreArea',now,2);
 s={...s,lastAt:now+3.5*H};
 write('climbed180',s);
}
// 2. The floor-12 sandbox save as the live build loads it (floor 300), untouched.
{
 const s=decode(readFileSync(new URL(`${OUT}/familiar-save-bafe728-floor12.json`,pathToFileURL(process.cwd()+'/')),'utf8'));
 write('floor300',s);
}
// 3. A GENUINE live-build climb: a new village that picked a starter, adopted a team and climbed to floor 40
//    with a dispatch out. It has no `legacy` and must NOT be reset.
{
 let s=at(fresh(T),'adoptFamiliars',T),now=T;
 const five=FAMILIARS.map(p=>({id:p.id,pw:familiarPower(p.id,{level:1,stars:0})})).sort((a,b)=>b.pw-a.pw||a.id.localeCompare(b.id)).slice(0,5).map(p=>p.id);
 for(const id of five)s=at(s,'towerParty',now,id);
 s={...s,familiarSupplies:{levelUp:1e6,classUp:1e5,since:null}};
 for(const id of five)for(let i=0;i<3;i++)s=at(s,'trainFamiliar',now,id,10);
 while(towerState(s).cleared<40)s=at(s,'towerFight',now,towerKey(s));
 for(const id of five)s=at(s,'dispatchTeam',now,id);
 s=at(s,'dispatchStart',now,1);
 s={...s,lastAt:now+2.5*H};
 write('genuine40',s);
}
