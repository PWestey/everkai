// Regenerates tests/familiar-save-bafe728-floor{7,12}.json with the PREVIOUS build (CLAUDE.md rule 12).
// It must run against the 12-floor sandbox tower's lib, never the current one:
//   git archive bafe728 lib | tar -x -C /some/scratch
//   LIB=/some/scratch/lib/ OUT=tests/ node scripts/generate-legacy-familiar-saves.mjs
// It prints, from that old build, the income / waiting / dispatch-gate figures that
// tests/familiar-tower-migration.test.mjs pins.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const LIB=process.env.LIB,OUT=process.env.OUT;
if(!LIB||!OUT)throw Error('Set LIB (the previous build lib/ directory) and OUT (where to write the saves).');
const lib=f=>import(pathToFileURL(LIB+f).href);
const {fresh,act,valid,decode}=await lib('game.mjs');
const {towerKey,towerState}=await lib('familiar-tower.mjs');
const {FAMILIARS}=await lib('familiars.mjs');
const {familiarPower,dispatchUnlocked,DISPATCH_AREAS}=await lib('familiar-dispatch.mjs');
const {suppliesWaiting,towerIncome}=await lib('familiar-supplies.mjs');
if(towerState(fresh(0)).policyVersion!==1)throw Error('LIB is not the 12-floor sandbox build.');
const H=3600e3,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);if(r.error)throw Error(a+': '+r.error);if(!valid(r.state))throw Error('invalid '+a);return r.state};
function build(target){
 let s=at(fresh(T),'adoptFamiliars',T),now=T;
 const five=FAMILIARS.map(p=>({id:p.id,pw:familiarPower(p.id,{level:1,stars:0})})).sort((a,b)=>b.pw-a.pw||a.id.localeCompare(b.id)).slice(0,5).map(p=>p.id);
 for(const id of five)s=at(s,'towerParty',now,id);
 let hours=0;
 while(towerState(s).cleared<target){
  const f=act(s,'towerFight',now,towerKey(s));if(!f.error&&towerState(f.state).cleared>towerState(s).cleared){s=f.state;continue;}
  if(!f.error)s=f.state;
  now+=H;hours++;const c=act(s,'collectFamiliarSupplies',now);if(!c.error)s=c.state;
  for(const id of five){for(let n=0;n<20;n++){const r=act(s,'trainFamiliar',now,id,1);if(r.error)break;s=r.state;}}
  if(hours>24*400)throw Error('stuck at '+towerState(s).cleared);
 }
 return {s,five,now:now+5.5*H};
}
for(const target of [7,12]){
 let {s,five,now}=build(target);
 s={...s,lastAt:now};
 for(const id of five)s=at(s,'dispatchTeam',now,id);
 for(let h=0;h<24*60;h++){const r=act(s,'dispatchStart',now,1);if(!r.error){s=r.state;break;}now+=H;s={...s,lastAt:now};const c=act(s,'collectFamiliarSupplies',now);if(!c.error)s=c.state;for(const id of five){for(let n=0;n<20;n++){const t=act(s,'trainFamiliar',now,id,1);if(t.error)break;s=t.state;}}}
 s={...s,lastAt:now+3*H+1800e3};
 if(!valid(s))throw Error('final invalid');
 writeFileSync(`${OUT}/familiar-save-bafe728-floor${target}.json`,JSON.stringify(s));
 const d=decode(JSON.stringify(s));
 console.log(target,JSON.stringify({income:towerIncome(d),waiting:suppliesWaiting(d),waiting30h:suppliesWaiting(d,d.lastAt+30*H),unlocked:DISPATCH_AREAS.map(a=>dispatchUnlocked(d,a.id))}));
}
