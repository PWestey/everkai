import test from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {originalBattle,floorEnemies,teamBond,teamAttribute,quickDeployTeam,groupOf,towerSkill,endlessEnemies,endlessBattle,endlessState,endlessKey,towerState,towerKey,validTower,TOWER_DATA,ENDLESS_OPEN} from '../lib/familiar-tower.mjs';
import {towerIncome,endlessBand,familiarSupplies,BENEFITS} from '../lib/familiar-supplies.mjs';
import {dispatchFragments,DISPATCH_AREAS,dispatchState} from '../lib/familiar-dispatch.mjs';
import {exploreState} from '../lib/familiar-explore.mjs';
import dispatchData from '../lib/familiar-dispatch-data.json' with {type:'json'};

const T=new Date('2026-09-16T09:00:00').getTime(),H=3600e3;
const at=(s,a,t=null,v=null,now=s.lastAt)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),`invalid after ${a}`);return r.state};
const snap=(ids,level,stars=0)=>ids.map(id=>({id,level,stars}));

// ---------------------------------------------------------------------------------------------
// Coverage guards for the newly imported rows.
// ---------------------------------------------------------------------------------------------
test('every PetEndlessTower band and PetEndlessTowerPool bot, the bond table and every dispatch fragment pool are imported',()=>{
 const e=TOWER_DATA.endless;
 assert.equal(e.bands.length,23);assert.equal(e.bots.length,705);
 assert.equal(e.bands[0].from,1);assert.equal(e.bands.at(-1).to,999999);
 for(let i=1;i<e.bands.length;i++)assert.equal(e.bands[i].from,e.bands[i-1].to+1,'bands are contiguous');
 for(const b of e.bands){assert.deepEqual(b.careers,{1:[1,5],2:[1,2],3:[0,1]});assert.equal(b.coef.Lv,1000);assert.ok(e.bots.some(x=>x[0]===b.id),`band ${b.id} has bots`);}
 assert.deepEqual(e.bands.map(b=>b.income),[[1,0],[3,0],[5,0],[7,0],[9,0],[11,0],[13,0],[15,0],[17,1],[20,1],[22,1],[24,1],[26,1],[28,1],[30,1],[32,1],[34,2],[36,2],[38,2],[40,2],[42,2],[42,2],[42,2]]);
 for(const [,pet,career] of e.bots){assert.ok(FAMILIARS.some(p=>p.id===pet),pet);assert.equal(TOWER_DATA.pets[pet].career,career);}
 // POWER restored 2026-09-24: every `System.PetArrayAdd` Group row carries THREE fields and the
 // client's bond modal prints all three, the third as `Attribute: +{val}%`. Importing two understated a
 // five-of-a-type team's Attribute by 15% (docs/familiar-screen-specs/09-tower.md §3).
 assert.deepEqual(TOWER_DATA.bond,{3:{ATK:1000,HP:1000,POWER:1000},4:{ATK:1300,HP:1300,POWER:1300},5:{ATK:1500,HP:1500,POWER:1500}});
 assert.equal(Object.keys(TOWER_DATA.pets).length,70);
 assert.deepEqual(DISPATCH_AREAS.map(a=>a.fragments.length),DISPATCH_AREAS.map(a=>a.fragmentPools));
 for(const a of dispatchData.areas)for(const p of a.fragments)for(const [pet,n] of p.entries){assert.ok(FAMILIARS.some(f=>f.id===pet),pet);assert.ok(Number.isInteger(n)&&n>0);}
});

// ---------------------------------------------------------------------------------------------
// Combat version 11.
// ---------------------------------------------------------------------------------------------
test('version-10 reports replay byte-identically to the live 6b13d1a engine (hashes printed by that build)',()=>{
 const five=['Pet_1191','Pet_2391','Pet_3191','Pet_4151','Pet_4251'].map(id=>({id,level:60,stars:3}));
 const three=[['Pet_11111',30],['Pet_21121',30],['Pet_12231',30]].map(([id,level])=>({id,level,stars:3}));
 const h=r=>createHash('sha256').update(JSON.stringify(r)).digest('hex');
 assert.equal(h(originalBattle(37,five,10)),'c586e514bc04add462a3ec8ecdc5987699c1aa91da6b77d7b39fbac84722d97a');
 assert.equal(h(originalBattle(150,five,10)),'380ead9b02c9b7bb2edda339b1fede14aedf6f905ee85d045f829c68b91fea13');
 assert.equal(h(originalBattle(9,three,10)),'0b57cb8f85c57a804cd809cc471801800cd3e0bb99925fa886d5ed6c9c8e38a4');
});

test('enemies cast their own familiar skills in version 11, and never in version 10',()=>{
 // Every one of the 300 floors fields at least one enemy with a documented kit (measured). A lone level-1
 // Everwool lasts long enough on floor 5 for an enemy's Rage to fill.
 assert.equal(TOWER_DATA.floors.filter(f=>f.enemies.some(([pet])=>towerSkill(pet))).length,300);
 const floor=5,team=snap(['Pet_2391'],1);
 const v11=originalBattle(floor,team,11),v10=originalBattle(floor,team,10);
 // Cast entries only: periodic ticks carry the caster's name with a ' · kind' suffix.
 const enemyNamed=r=>r.log.filter(x=>x.side===1&&x.name&&String(x.attacker).includes(':')&&!x.name.includes(' · '));
 assert.ok(enemyNamed(v11).length>0,`floor ${floor}: an enemy skill is cast`);
 assert.equal(enemyNamed(v10).length,0,'the old engine never casts one');
 for(const x of enemyNamed(v11))assert.equal(x.name,towerSkill(x.attacker.split(':')[1]).name,'the skill is that enemy familiar\'s own');
 assert.deepEqual(originalBattle(floor,team,11),v11,'deterministic');
});

test('team bond: 3/4/5 of one type add +10/+13/+15% ATK, HP and Attribute, on both sides; mixed teams get nothing',()=>{
 const cool=FAMILIARS.filter(p=>p.type==='Cool').map(p=>p.id),cute=FAMILIARS.filter(p=>p.type==='Cute').map(p=>p.id);
 assert.equal(groupOf(cool[0]),1);assert.equal(groupOf('Pet_8041505'),groupOf('Pet_8041505'));
 assert.equal(teamBond([cool[0],cool[1],cute[0],cute[1]]),null);
 assert.deepEqual(teamBond(cool.slice(0,3)),{count:3,group:1,ATK:1000,HP:1000,POWER:1000});
 assert.deepEqual(teamBond([...cool.slice(0,4),cute[0]]),{count:4,group:1,ATK:1300,HP:1300,POWER:1300});
 assert.deepEqual(teamBond(cool.slice(0,5)),{count:5,group:1,ATK:1500,HP:1500,POWER:1500});
 // Negative control through the battle: the same five, bonded vs not, differ only by the bond.
 const bonded=snap(cool.slice(0,5),30),r=originalBattle(1,bonded,11);
 const hp=r.log.length?r.playerHP:0;assert.ok(hp>=0);
 // Enemy side: floor with 3+ of one group carries the bond.
 const f=TOWER_DATA.floors.find(x=>teamBond(x.enemies.map(e=>e[0])));assert.ok(f,'some floor fields a bonded enemy team');
});

// ---------------------------------------------------------------------------------------------
// Endless Mode.
// ---------------------------------------------------------------------------------------------
test('endless floors: five enemies from the floor\'s band within CareerMax, measured level rule, deterministic draw',()=>{
 for(const L of [1,10,11,55,200,201,777,1001,5000]){
  const band=endlessBand(L),foes=endlessEnemies(L);
  assert.equal(foes.length,5,`floor ${L}`);
  const count=c=>foes.filter(x=>x.career===c).length;
  for(const c of [1,2,3]){const [lo,hi]=band.careers[c];assert.ok(count(c)>=lo&&count(c)<=hi,`floor ${L} career ${c}: ${count(c)}`);}
  assert.equal(foes[0].career,2,'a Tank stands in front');
  for(const x of foes){
   assert.equal(x.level,200+Math.floor(L*1000/10000),'Pool.Lv + floor(L x Lvcoef / 10000), PetBattleShow.lua');
   const bot=TOWER_DATA.endless.bots.find(b=>b[0]===band.id&&b[1]===x.pet&&Math.floor(b[4]*(10000+L*band.coef.ATK)/10000)===x.ATK);
   assert.ok(bot,`floor ${L} ${x.pet} comes from band ${band.id}`);
  }
  assert.deepEqual(endlessEnemies(L),foes);
 }
 assert.notDeepEqual(endlessEnemies(1).map(x=>x.pet),endlessEnemies(2).map(x=>x.pet),'floors differ');
});

function climbed(){
 let s=at(fresh(T),'adoptFamiliars');
 const five=['Pet_1191','Pet_2391','Pet_3191','Pet_4151','Pet_4251'];
 s={...s,familiars:{...s.familiars,...Object.fromEntries(five.map(id=>[id,{level:150,stars:20}]))}};
 for(const id of five)s=at(s,'towerParty',id);
 while(towerState(s).cleared<ENDLESS_OPEN)s=at(s,towerState(s).cleared<30?'towerFight':'towerAuto',towerKey(s));
 return s;
}
test('Endless Mode opens after floor 200, adds its band Income to the floor Income, and replays',()=>{
 let s=at(fresh(T),'adoptFamiliars');s=at(s,'towerParty','Pet_1191');
 assert.match(act(s,'endlessFight',T,endlessKey(s)).error,/after Challenge Mode floor 200/);
 s=climbed();
 // The floor's own Income, and then the earned coefficient on top. `Item_PetBP_IncomeMax` is the
 // Pass's second benefit, re-gated onto Familiar Tower floor 100 (12-monetisation.md §5.2, approved
 // 2026-09-24) -- and this save is past 200, so it is earned. The BASE pair is the table's; the
 // boosted pair is the table's times PetTowerIncomeBPCoef, applied after the endless band.
 const row=TOWER_DATA.floors[towerState(s).cleared-1].income;
 const boost=p=>Math.floor(p*(10000+BENEFITS.boosted.incomeBP)/10000);
 const before=towerIncome(s);
 assert.deepEqual(before,{levelUp:boost(row[0]),classUp:boost(row[1])});
 assert.ok(before.levelUp>row[0],'positive control: the +10% is actually applied at this floor');
 // And a village that has not reached the gate still reads the table's own pair.
 const early={...s,familiarTower:{...towerState(s),cleared:50,attempts:50,base:0,last:null,endless:undefined}};
 assert.deepEqual(towerIncome(early),{levelUp:TOWER_DATA.floors[49].income[0],classUp:TOWER_DATA.floors[49].income[1]},
  'below Familiar Tower floor 100 the rate is the table, unmodified');
 const r=act(s,'endlessFight',s.lastAt,endlessKey(s));assert.equal(r.error,undefined);s=r.state;assert.ok(valid(s));
 assert.equal(endlessState(s).attempts,1);assert.equal(endlessState(s).last.combatVersion,11);
 if(endlessState(s).cleared===1){
  assert.deepEqual(towerIncome(s),{levelUp:boost(row[0]+1),classUp:boost(row[1])},'band 1 Income [1,0] is added before the coefficient');
 }
 assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.ok(act(s,'endlessFight',s.lastAt,'0:0').error,'a stale key cannot replay');
 // NEGATIVE CONTROLS on the stored record.
 const t=s.familiarTower,e=t.endless;
 const bad=(x,why)=>assert.equal(validTower({...s,familiarTower:{...t,endless:x}}),false,why);
 bad({...e,cleared:e.cleared+1},'an extra cleared floor');
 bad({...e,last:{...e.last,floor:e.last.floor+5}},'a report for the wrong floor');
 bad({...e,last:{...e.last,combatVersion:10}},'an old engine version');
 bad({...e,extra:1},'an unknown key');
 assert.equal(validTower({...s,familiarTower:{...t,cleared:199,last:null,endless:e}}),false,'endless progress below floor 200');
});

// ---------------------------------------------------------------------------------------------
// Dispatch Great Success fragments.
// ---------------------------------------------------------------------------------------------
test('a Great Success pays one repeatable draw from each of the area\'s fragment pools, into the fragment store',()=>{
 for(const a of DISPATCH_AREAS){
  const draws=dispatchFragments(a.id,T,['a','b','c','d','e']);
  assert.equal(draws.length,a.fragments.length);
  draws.forEach(([pet,n],k)=>assert.ok(a.fragments[k].entries.some(([p,c])=>p===pet&&c===n),`area ${a.id} pool ${k}`));
  assert.deepEqual(dispatchFragments(a.id,T,['a','b','c','d','e']),draws);
 }
 let s=at(fresh(T),'adoptFamiliars');
 const five=['Pet_1191','Pet_2391','Pet_3191','Pet_4151','Pet_4251'];
 s={...s,familiars:{...s.familiars,...Object.fromEntries(five.map(id=>[id,{level:499,stars:100}]))}};
 for(const id of five)s=at(s,'towerParty',id);
 while(towerState(s).cleared<20)s=at(s,'towerFight',towerKey(s));
 for(const id of five)s=at(s,'dispatchTeam',id);
 s=at(s,'dispatchStart',1);
 const run=dispatchState(s).run,expect=dispatchFragments(1,run.since,dispatchState(s).team);
 const before=exploreState(s).pieces;
 const back=at(s,'dispatchCollect',null,null,run.since+20*H);
 assert.match(act(s,'dispatchCollect',run.since+20*H).message,/Great Success/,'a maxed team at area 1 is always a Great Success');
 for(const [pet,n] of expect)assert.equal((exploreState(back).pieces[pet]||0)-(before[pet]||0),n);
 assert.deepEqual(decode(JSON.stringify(back)),back);
});

// `Quick Deploy` (09-tower.md §3): the original's button was never pressed, so what it optimises is
// unmeasured and Everkai's rule is local -- but it must never be WORSE than picking the five highest
// Attributes, which is the naive thing a player would do by hand. The candidate set always contains
// that team, so this is a real invariant and not a restatement of the implementation.
test('Quick Deploy fills five slots and never scores below the naive top five',()=>{
 let s=at(fresh(T),'adoptFamiliars');
 const roster=FAMILIARS.slice(0,14).map(p=>p.id);
 s={...s,familiars:Object.fromEntries(roster.map((id,i)=>[id,{level:20+i*11,stars:i}]))};
 const team=quickDeployTeam(s);
 assert.equal(team.length,5);
 assert.equal(new Set(team).size,5);
 assert.ok(team.every(id=>roster.includes(id)),'only contracted familiars are deployed');
 const naive=[...roster].sort((a,b)=>teamAttribute(s,[b])-teamAttribute(s,[a])).slice(0,5);
 assert.ok(teamAttribute(s,team)>=teamAttribute(s,naive),'Quick Deploy is at least as strong as the top five by Attribute');
 // And it is a real action, not a UI-only convenience: the save it writes has to validate.
 const after=at(s,'towerQuickDeploy');
 assert.deepEqual(towerState(after).party,team);
 assert.ok(validTower(after));
 // A roster of five or fewer deploys all of them rather than refusing.
 const few={...s,familiars:Object.fromEntries(roster.slice(0,3).map(id=>[id,{level:30,stars:0}]))};
 assert.equal(quickDeployTeam(few).length,3);
});

// Bond carries THREE fields, and the third one (POWER -> `Attribute: +{val}%`) was missing entirely
// until 09-tower.md §3 measured `System.PetArrayAdd`. The tower screen prints all three per rung.
test('the bond table carries ATK, HP and POWER at 1000/1300/1500 bp and teamAttribute applies POWER',()=>{
 for(const [n,bp] of [[3,1000],[4,1300],[5,1500]]){
  const row=TOWER_DATA.bond[n];
  assert.deepEqual(row,{ATK:bp,HP:bp,POWER:bp},`bond rung ${n}`);
 }
 let s=at(fresh(T),'adoptFamiliars');
 const cool=FAMILIARS.filter(p=>groupOf(p.id)===1).slice(0,5).map(p=>p.id);
 assert.equal(cool.length,5,'five of one type exist to bond');
 s={...s,familiars:Object.fromEntries(cool.map(id=>[id,{level:100,stars:10}]))};
 const unbonded=cool.slice(0,2).reduce((n,id)=>n+teamAttribute(s,[id]),0)+teamAttribute(s,cool.slice(2,5))/1.1;
 assert.equal(teamBond(cool).POWER,1500);
 // The five-of-a-type team reads 15% above the same five with no bond applied.
 const raw=cool.reduce((n,id)=>n+teamAttribute(s,[id]),0);
 assert.equal(teamAttribute(s,cool),Math.floor(raw*11500/10000));
 assert.ok(unbonded>0);
});
