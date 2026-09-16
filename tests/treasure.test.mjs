import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,valid,decode,settle,totalRate} from '../lib/game.mjs';import {TREASURE_AREAS,TREASURE_RELICS,TREASURE_GEM_GRADES,treasureState,treasureLevel,appraisalPick,gemGradeWeights,gradePick,TREASURE_START_STAMINA,TREASURE_DAILY_STAMINA,TREASURE_STAMINA_LIMIT} from '../lib/treasure.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,id=null)=>{const r=act(s,a,s.lastAt,id,treasureState(s).seq);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
const trip=s=>{s=settle(s,s.lastAt+86400000);s=run(s,'treasureStart','Relic001');for(let i=0;i<12;i++)s=run(s,'treasureDig',i);return s};
const base=()=>{let s=run(fresh(1000),'treasureStart','Relic001');for(let i=0;i<12;i++)s=run(s,'treasureDig',i);return s};
test('return unloads once and gates regions through camp EXP',()=>{assert.equal(decode(JSON.stringify(fresh(1000))).treasure,undefined);assert.ok(act(fresh(1000),'treasureStart',1000,'Relic002',0).error);let s=base();assert.equal(s.treasure.xp,0);assert.deepEqual(s.treasure.gems,{});assert.equal(s.treasure.stamina,TREASURE_START_STAMINA-12,'a full 12-tile dig spends 12 of the original\'s 100 starting stamina');const seq=s.treasure.seq;s=run(s,'treasureReturn');assert.equal(s.treasure.xp,120);assert.equal(treasureLevel(s.treasure),2);assert.equal(s.treasure.gems.Relic001,4);assert.ok(act(s,'treasureReturn',s.lastAt,null,seq).error);assert.ok(act(s,'treasureReturn',s.lastAt,null,s.treasure.seq).error);s=run(s,'treasureStart','Relic002');assert.equal(s.treasure.trip.area,'Relic002')});
test('dig rejects duplicates, stale controls; daily stamina recovery preserves cargo',()=>{let s=run(fresh(1000),'treasureStart','Relic001');const seq=s.treasure.seq;s=run(s,'treasureDig',2);assert.ok(act(s,'treasureDig',s.lastAt,2,s.treasure.seq).error);assert.ok(act(s,'treasureDig',s.lastAt,1,seq).error);assert.throws(()=>act(s,'treasureRefill',s.lastAt,null,s.treasure.seq),/Unknown action/);const afterOneDig=treasureState(s).stamina;s=settle(s,86400001);assert.equal(treasureState(s).stamina,Math.min(TREASURE_STAMINA_LIMIT,afterOneDig+TREASURE_DAILY_STAMINA),'a new day adds the original 150, held to 300');assert.deepEqual(treasureState(s).trip.tiles,[2]);s=run(s,'treasureReturn');s=run(s,'treasureStart','Relic001');const before=treasureState(s).stamina;for(let i=0;i<12;i++)s=run(s,'treasureDig',i);assert.equal(s.treasure.stamina,before-12,'one stamina a tile');s=run(s,'treasureReturn');s=settle(s,s.lastAt+86400000);assert.equal(treasureState(s).stamina,TREASURE_STAMINA_LIMIT,'a day of recovery fills to the cap');
 assert.equal(TREASURE_DAILY_STAMINA,150);assert.equal(TREASURE_STAMINA_LIMIT,300);assert.equal(TREASURE_START_STAMINA,100)});
test('normal weights endpoints and interior stay in complete pools',()=>{for(const a of TREASURE_AREAS){assert.ok(Math.abs(a.totalPercent-100)<=.05);assert.equal(appraisalPick(a,0),a.pool[0].id);assert.equal(appraisalPick(a,.999999999),a.pool.at(-1).id);for(let i=0;i<100;i++)assert.ok(a.pool.some(x=>x.id===appraisalPick(a,i/100)))}});
test('appraisal duplicates and donation persist without affecting Private Hall or income',()=>{let s=run(base(),'treasureReturn');s.treasure.gems.Relic001=100;const rate=totalRate(s);for(let i=0;i<100;i++)s=run(s,'treasureAppraise','Relic001');assert.equal(Object.values(s.treasure.relics).reduce((n,r)=>n+r.materials+1,0),100);assert.ok(act(s,'treasureAppraise',s.lastAt,'Relic001',s.treasure.seq).error);const id=Object.keys(s.treasure.relics)[0];s=run(s,'treasureDonate',id);assert.ok(act(s,'treasureDonate',s.lastAt,id,s.treasure.seq).error);s=run(s,'treasureDisplay',id);assert.equal(s.treasure.relics[id].displayed,false);assert.equal(s.treasure.relics[id].donated,true);assert.equal(totalRate(s),rate);assert.equal(s.museum,undefined);assert.deepEqual(decode(JSON.stringify(s)).treasure,s.treasure)});
test('malformed state and capacity overflow reject without consuming cargo',()=>{const s=run(base(),'treasureReturn');for(const edit of [x=>x.policyVersion=2,x=>x.seed=-1,x=>x.stamina=TREASURE_STAMINA_LIMIT+1,x=>x.gems.fake=1,x=>x.relics.fake={materials:0,donated:false,displayed:false},x=>x.trip={id:1,area:'Relic001',tiles:[1,1]},x=>x.day=5]){const b=structuredClone(s);edit(b.treasure);assert.equal(valid(b),false);assert.throws(()=>decode(JSON.stringify(b)))}let b=settle(s,s.lastAt+86400000);b=run(b,'treasureStart','Relic001');b=run(b,'treasureDig',2);b.treasure.gems.Relic001=1e6;assert.ok(act(b,'treasureReturn',b.lastAt,null,b.treasure.seq).error);assert.equal(b.treasure.trip.tiles.length,1)});
test('failed appraisal write preserves gemstone and deterministic retry',()=>{const s=run(base(),'treasureReturn');let raw=JSON.stringify(s),full=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(full)throw Error('quota');raw=v}}));p.load(s.lastAt);const next=run(p.current,'treasureAppraise','Relic001');full=true;assert.throws(()=>p.commit(next));assert.equal(p.current.treasure.gems.Relic001,4);full=false;p.load(s.lastAt);const retry=run(p.current,'treasureAppraise','Relic001');assert.deepEqual(retry.treasure,next.treasure);p.commit(retry);assert.equal(decode(raw).treasure.gems.Relic001,3)});

// -------------------------------------------------------------------------------------------------
// BUG-26. Everkai shipped 45 relics but only ONE gem-grade pool per area, so 22 of them could never
// drop: 1401-1403 and 2401-2408 live only in the grade-2/grade-3 pools, the nine SimGame5Part pieces
// only in grade 3, and 2501/2901 are assembled from those pieces rather than drawn. RelicMap.json
// gives every map THREE GemBall grades (Map001 -> GemBall101/102/103) and RelicLevel.json carries the
// per-Steeltooth-level weights that choose between them. All three pools per area are now imported.
// -------------------------------------------------------------------------------------------------
test('every shipped relic is reachable: three gem grades per area plus part assembly',()=>{
 assert.equal(TREASURE_RELICS.length,45);
 const pooled=new Set();
 for(const a of TREASURE_AREAS){
  assert.equal(a.grades.length,3,`${a.id} must carry all three GemBall grades`);
  assert.deepEqual(a.grades.map(g=>g.grade),[1,2,3]);
  assert.deepEqual(a.pool,a.grades[0].pool,'the legacy single-pool view is the grade-1 pool');
  for(const g of a.grades){
   assert.ok(Math.abs(g.totalPercent-100)<=.05,`${a.id} ${g.gem} totals ${g.totalPercent}`);
   assert.equal(appraisalPick(g,0),g.pool[0].id);
   assert.equal(appraisalPick(g,.999999999),g.pool.at(-1).id);
   for(let i=0;i<100;i++)assert.ok(g.pool.some(x=>x.id===appraisalPick(g,i/100)));
   for(const row of g.pool){assert.ok(TREASURE_RELICS.some(r=>r.id===row.id),`${row.id} is in a pool but not shipped`);pooled.add(row.id)}
  }
 }
 assert.equal(pooled.size,43,'34 whole exhibits plus 9 part pieces are drawable');
 const assembled=TREASURE_RELICS.filter(r=>r.assembledFrom);
 assert.equal(assembled.length,2,'2501 Ladon\'s Skeleton and 2901 Ancient Golden Mural are assembled, never drawn');
 for(const r of assembled){assert.ok(!pooled.has(r.id));assert.ok(r.assembledFrom.every(id=>pooled.has(id)))}
 assert.deepEqual(TREASURE_RELICS.filter(r=>!pooled.has(r.id)&&!r.assembledFrom),[],'no shipped relic is orphaned');
});

test('driving real appraisals actually yields all 45, including the two assembled exhibits',()=>{
 let s=run(fresh(1000),'treasureStart','Relic001');s=run(s,'treasureReturn');
 s={...s,treasure:{...s.treasure,xp:120*40,gems:Object.fromEntries(TREASURE_AREAS.map(a=>[a.id,800]))}};
 assert.equal(treasureLevel(s.treasure),41,'grade 3 needs Steeltooth level 8 or better');
 for(const a of TREASURE_AREAS)for(let i=0;i<800;i++)s=run(s,'treasureAppraise',a.id);
 const got=new Set(Object.keys(s.treasure.relics));
 assert.equal(got.size,45,TREASURE_RELICS.filter(r=>!got.has(r.id)).map(r=>r.id).join(','));
 for(const id of ['2501','2901'])assert.ok(got.has(id),`${id} never assembled from its parts`);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)).treasure,s.treasure);
});

test('gem grade follows the Steeltooth level exactly as RelicLevel.json weights it',()=>{
 assert.equal(TREASURE_GEM_GRADES.length,30,'RelicLevel.json carries 30 levels');
 for(const row of TREASURE_GEM_GRADES)assert.equal(row.weights.reduce((a,b)=>a+b,0),10000);
 assert.deepEqual(TREASURE_GEM_GRADES[0].weights,[7675,2325,0]);
 assert.deepEqual(TREASURE_GEM_GRADES[29].weights,[4400,4500,1100]);
 for(let lv=1;lv<=7;lv++)assert.equal(gemGradeWeights(lv)[2],0,`grade 3 must stay locked at level ${lv}`);
 assert.ok(gemGradeWeights(8)[2]>0,'grade 3 opens at level 8');
 assert.deepEqual(gemGradeWeights(999),gemGradeWeights(30),'above the table the top row holds');
 // A level-1 Steeltooth can never roll grade 3, so no tier-4 relic can drop from a fresh camp.
 for(let i=0;i<1000;i++)assert.ok(gradePick(1,i/1000)<2);
 assert.ok([...Array(1000).keys()].some(i=>gradePick(30,i/1000)===2),'a level-30 Steeltooth does reach grade 3');
 // The nine part pieces sit ONLY in the grade-3 pools, so a Steeltooth below level 8 can never find
 // one however long it digs -- that is what makes 2501/2901 late-game exhibits rather than free ones.
 let s=base();s=run(s,'treasureReturn');
 s={...s,treasure:{...s.treasure,gems:{Relic002:600}}};
 assert.equal(treasureLevel(s.treasure),2,'12 tiles is 120 EXP, one level');
 const gradeThreeOnly=new Set(TREASURE_AREAS[1].grades[2].pool.map(r=>r.id)
  .filter(id=>!TREASURE_AREAS[1].grades.slice(0,2).some(g=>g.pool.some(r=>r.id===id))));
 assert.deepEqual([...gradeThreeOnly].sort(),['25011','25012','25013','25014','25015','25016','29011','29012','29013']);
 for(let i=0;i<600;i++)s=run(s,'treasureAppraise','Relic002');
 assert.deepEqual(Object.keys(s.treasure.relics).filter(id=>gradeThreeOnly.has(id)),[],'grade 3 is locked below Steeltooth level 8');
});
