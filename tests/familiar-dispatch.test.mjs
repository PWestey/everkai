import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {towerKey,towerState} from '../lib/familiar-tower.mjs';
import {familiarSupplies} from '../lib/familiar-supplies.mjs';
import data from '../lib/familiar-dispatch-data.json' with {type:'json'};
import {DISPATCH_AREAS,DISPATCH_TEAM,dispatchState,dispatchArea,dispatchTeamPower,familiarPower,
 greatSuccessChance,dispatchUnlocked,dispatchDone,dispatchRemaining,validFamiliarDispatch} from '../lib/familiar-dispatch.mjs';

const H=3600e3,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now=T,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),`invalid save after ${a}`);return r.state};
/** The five strongest familiars by Power, which is the team the gates are calibrated against. */
const strongest=n=>FAMILIARS.map(p=>({id:p.id,pw:familiarPower(p.id,{level:1,stars:0})})).sort((a,b)=>b.pw-a.pw||a.id.localeCompare(b.id)).slice(0,n).map(p=>p.id);
/** A save with every familiar welcomed, original tower floor 20 cleared (area 1's PetDispatch.TowerLv), and the five strongest dispatch-ready. */
function ready(levels=0){
 let s=at(fresh(T),'adoptFamiliars');
 const five=strongest(DISPATCH_TEAM);
 for(const id of five)s=at(s,'towerParty',T,id);
 // Since 2026-09-16 the tower is the original 300 floors; the untrained five clear the first 46.
 while(towerState(s).cleared<20)s=at(s,'towerFight',T,towerKey(s));
 if(levels){s={...s,familiarSupplies:{levelUp:1e9,classUp:1e7,since:T}};
  for(const id of five)for(let i=0;i<levels/10;i++)s=at(s,'trainFamiliar',T,id,10);}
 for(const id of five)s=at(s,'dispatchTeam',T,id);
 return s;
}

// ---------------------------------------------------------------------------------------------
// The imported table. Every number here was read out of configs/config/logic and nowhere else.
// ---------------------------------------------------------------------------------------------
test('the imported areas are the original PetDispatch rows, gates, durations and reward bundles',()=>{
 assert.equal(DISPATCH_AREAS.length,9,'PetDispatch has nine rows');
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.towerLv),[20,30,50,80,120,160,200,250,300]);
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.power),[1e5,2e5,4e5,8e5,16e5,3e6,5e6,1e7,2e7]);
 // Rule 6: Time is 20 on every row. That constancy is recorded, not hidden -- the importer asserts
 // it AND asserts no other dispatch duration exists, which is why 20 is usable at all.
 assert.deepEqual([...new Set(DISPATCH_AREAS.map(a=>a.hours))],[20],'Time is constant across all nine areas');
 // split_reward/reward_petdispatch.json: base Item_PetLevelUP x1000n, great x200n + class-up from area 6.
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.base.levelUp),[1000,2000,3000,4000,5000,6000,7000,8000,9000]);
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.base.classUp),Array(9).fill(0));
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.great.levelUp),[200,400,600,800,1000,1250,1500,1750,2000]);
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.great.classUp),[0,0,0,0,0,5,10,25,50]);
 // PetAttr.CombatAdd, and the System constants GetBigSuccess reads.
 assert.deepEqual(data.combatAdd,{ATK:15,HP:1,SPD:30});
 assert.equal(data.critBP,3000);assert.equal(data.coefficient,0.5);assert.equal(data.teamSize,5);
 // Every area carries its unmodelled fragment-pool count, so the ECON-11 gap stays visible.
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.fragmentPools),[1,2,2,3,3,3,3,2,2]);
 assert.ok(Object.keys(data.sources).length>=5,'the import must record what it hashed');
});

test('POSITIVE CONTROL for the Power weights: Everkai scores what the original roster scores',()=>{
 // Both halves come from configs/config/logic: the growth ladders (PetLevel/PetClass/PetStar) and the
 // weights (PetAttr). The original Pet.json's five strongest score exactly these three totals, so the
 // gate ladder 100,000..20,000,000 spans exactly this roster. If a stat import ever drifts, this breaks.
 const five=strongest(DISPATCH_TEAM);
 const total=p=>five.reduce((n,id)=>n+familiarPower(id,p),0);
 // These three stay UNBONDED on purpose: they sum `familiarPower` per familiar, which is the weights
 // alone. The bond is a team-level multiplier and is asserted where it applies, below.
 assert.equal(total({level:1,stars:0}),86130,'five strongest at level 1');
 assert.equal(total({level:499,stars:0}),6671778,'five strongest at max level');
 assert.equal(total({level:499,stars:100}),27680957,'five strongest fully maxed');
 // The ceiling clears the hardest gate; level 1 does not clear even the easiest. That is the pacing.
 assert.ok(total({level:499,stars:100})>DISPATCH_AREAS[8].power,'area 9 must be reachable');
 assert.ok(total({level:1,stars:0})<DISPATCH_AREAS[0].power,'area 1 must NOT be free at level 1');
});

// ---------------------------------------------------------------------------------------------
// The flow, each rule traced to the lang.json line that fixes it.
// ---------------------------------------------------------------------------------------------
test('Pet_Dispatch_Text9: fewer than five contracted familiars cannot dispatch at all',()=>{
 const s=fresh(T);
 for(const a of ['dispatchTeam','dispatchStart','dispatchCollect','dispatchCancel'])
  assert.match(act(s,a,T,FAMILIARS[0].id).error,/Welcome 5 familiars/,a);
});

test('Pet_Dispatch_Text7/Text8: the tower floor gates the area and the team must be exactly five',()=>{
 let s=at(fresh(T),'adoptFamiliars');
 const five=strongest(DISPATCH_TEAM);
 for(const id of five.slice(0,4))s=at(s,'dispatchTeam',T,id);
 assert.match(act(s,'dispatchStart',T,1).error,/Not enough familiars. Assign 5/);
 s=at(s,'dispatchTeam',T,five[4]);
 assert.equal(dispatchState(s).team.length,5);
 assert.equal(act(s,'dispatchTeam',T,FAMILIARS.find(p=>!five.includes(p.id)).id).error,'Choose exactly 5 familiars.');
 // No tower floor cleared yet, so even area 1 is shut.
 assert.equal(dispatchUnlocked(s,1),false);
 assert.match(act(s,'dispatchStart',T,1).error,/Unlocks at floor 20 in the Familiar Tower/);
 assert.equal(act(s,'dispatchStart',T,99).error,'Choose a dispatch area.');
});

test('the Power gate refuses an underpowered team and admits a trained one',()=>{
 let s=ready();
 // MOVED 2026-09-24 (docs/familiar-screen-specs/09-tower.md §3): `dispatchTeamPower` is the team's
 // ATTRIBUTE, and Attribute includes the same-type bond. `System.PetArrayAdd` Group5 pays
 // {ATK,HP,POWER} 1500 bp and Everkai had imported only two of the three fields, so this figure read
 // 15% low. The five strongest are all Legendary, so they bond at 5-of-a-type: 86,130 x 1.15 = 99,049.
 assert.equal(dispatchTeamPower(s),99049);
 assert.match(act(s,'dispatchStart',T,1).error,/Needs 100,000 team Power. This team has 99,049\./);
 s=ready(60);
 assert.equal(dispatchTeamPower(s),353869,'60 levels on each of the five, bond included');
 assert.equal(act(s,'dispatchStart',T,1).error,undefined);
 // Higher areas stay shut on floors, not just power.
 assert.match(act(s,'dispatchStart',T,4).error,/floor 80/);
});

test('a run pays its base reward on return, and nothing at all before the 20 hours are up',()=>{
 let s=ready(60);
 const before=familiarSupplies(s).levelUp;
 s=at(s,'dispatchStart',T,1);
 assert.deepEqual(dispatchState(s).run,{area:1,since:T});
 assert.equal(dispatchDone(s,T+19*H),false);
 assert.equal(dispatchRemaining(s,T+19*H),H);
 assert.match(act(s,'dispatchCollect',T+19*H).error,/Still away\. 1 hours left\./);
 assert.equal(act(s,'dispatchStart',T+H,2).error,'A dispatch is already out. Collect or cancel it first.');
 assert.equal(act(s,'dispatchTeam',T+H,FAMILIARS[0].id).error,'A dispatch is already out. Collect or cancel it first.');
 assert.ok(dispatchDone(s,T+20*H));
 const done=at(s,'dispatchCollect',T+20*H);
 const paid=familiarSupplies(done).levelUp-before,great=greatSuccessChance(s,1);
 assert.ok(paid===1000||paid===1200,`area 1 pays 1,000 or 1,200 with Great Success, got ${paid}`);
 assert.equal(dispatchState(done).run,null,'the run clears');
 assert.deepEqual(dispatchState(done).team.length,5,'the team is kept for the next run');
 assert.ok(great>0&&great<=100,`chance out of range: ${great}`);
 assert.deepEqual(decode(JSON.stringify(done)),done,'a dispatched save must round-trip');
});

test('the Great Success roll is repeatable for the same run, so a reloaded save resolves identically',()=>{
 let s=at(ready(60),'dispatchStart',T,1);
 const a=at(s,'dispatchCollect',T+20*H),b=at(decode(JSON.stringify(s)),'dispatchCollect',T+20*H);
 assert.equal(familiarSupplies(a).levelUp,familiarSupplies(b).levelUp,'same run, same payout');
});

test('Pet_Dispatch_Text15: Great Success is 30% at exactly the gate and rises with surplus Power',()=>{
 const s=ready(60);
 // 30% at parity is PetDispatch_Crit 3000 basis points; the slope is PetDispatch_Coefficient 0.5.
 // Both inputs are measured; the expression combining them is LOCAL and marked as such in the module.
 const p=dispatchTeamPower(s),area1=dispatchArea(1).power;
 assert.equal(greatSuccessChance(s,1),Math.round(30*(1+0.5*(p/area1-1))*100)/100);
 assert.ok(greatSuccessChance(s,1)>greatSuccessChance(s,2),'a harder area with the same team is less likely');
 assert.equal(greatSuccessChance(s,99),0,'an unknown area is never a Great Success');
 // Clamped at both ends: the maxed roster against area 1 is far past 100%.
 const maxed={...s,familiars:Object.fromEntries(Object.keys(s.familiars).map(id=>[id,{level:499,stars:100}]))};
 assert.equal(greatSuccessChance(maxed,1),100,'clamped to 100');
});

test('Pet_Dispatch_Text14: cancelling forfeits the run and pays nothing',()=>{
 let s=at(ready(60),'dispatchStart',T,1);
 const before=familiarSupplies(s);
 assert.equal(act(s,'dispatchCollect',T).error,'Still away. 20 hours left.');
 s=at(s,'dispatchCancel',T+19*H);
 assert.equal(dispatchState(s).run,null);
 assert.deepEqual(familiarSupplies(s),before,'not one item for a cancelled run');
 assert.equal(act(s,'dispatchCancel',T+19*H).error,'No dispatch is out.');
 assert.equal(act(s,'dispatchCollect',T+19*H).error,'No dispatch is out.');
});

// ---------------------------------------------------------------------------------------------
// The save guard, negative-controlled: each branch is broken deliberately and must be refused.
// ---------------------------------------------------------------------------------------------
test('NEGATIVE CONTROL: validFamiliarDispatch refuses every hand-edited dispatch shape',()=>{
 const s=at(ready(60),'dispatchStart',T,1);
 assert.ok(validFamiliarDispatch(s),'POSITIVE CONTROL: the real save must pass, or nothing below proves anything');
 const bad=(patch,why)=>assert.equal(validFamiliarDispatch({...s,familiarDispatch:patch}),false,why);
 const d=s.familiarDispatch;
 bad(null,'null');
 bad([],'an array');
 bad({team:d.team},'a missing run key');
 bad({...d,extra:1},'an extra key');
 bad({...d,team:'x'},'a team that is not an array');
 bad({...d,team:[...d.team,FAMILIARS[9].id],run:null},'six familiars');
 bad({...d,team:[d.team[0],d.team[0],...d.team.slice(2)]},'a duplicated familiar');
 bad({...d,team:[...d.team.slice(1),'Pet_not_real']},'a familiar that does not exist');
 bad({...d,run:{area:1}},'a run missing since');
 bad({...d,run:{area:99,since:T}},'an unknown area');
 bad({...d,run:{area:1,since:T+1}},'a run that starts after lastAt');
 bad({...d,run:{area:1,since:-1}},'a negative since');
 bad({...d,run:{area:1,since:T,extra:1}},'an extra run key');
 bad({...d,team:d.team.slice(1),run:d.run},'a four-familiar team with a run out');
 bad({...d,run:{area:9,since:T}},'an area whose floor is not cleared');
 // Power gate: a run on an area the team cannot clear is refused even with the floor granted.
 const weak={...s,familiarTower:{...s.familiarTower,cleared:300},familiars:Object.fromEntries(Object.keys(s.familiars).map(id=>[id,{level:1,stars:0}]))};
 assert.equal(validFamiliarDispatch({...weak,familiarDispatch:{...d,run:{area:9,since:T}}}),false,'an underpowered run');
 assert.equal(validFamiliarDispatch({...s,familiarDispatch:undefined}),true,'an old save with no dispatch key is fine');
 // The whole-save guard must carry the refusal, not just the local one.
 assert.equal(valid({...s,familiarDispatch:{...d,run:{area:99,since:T}}}),false,'valid() must refuse it too');
 assert.throws(()=>decode(JSON.stringify({...s,familiarDispatch:{...d,run:{area:99,since:T}}})),/village save/);
});

test('an old save with no dispatch field still loads, and dispatch defaults to idle',()=>{
 const s=at(fresh(T),'adoptFamiliars');
 assert.equal(s.familiarDispatch,undefined,'fresh saves carry no dispatch key until one is used');
 assert.deepEqual(dispatchState(s),{team:[],run:null});
 assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('dispatch cannot mint items past the familiar item cap',()=>{
 let s=at(ready(60),'dispatchStart',T,1);
 s={...s,familiarSupplies:{...familiarSupplies(s),levelUp:1e12}};
 assert.match(act(s,'dispatchCollect',T+20*H).error,/storage is full/);
});
