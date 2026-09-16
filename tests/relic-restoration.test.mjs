import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,valid,decode,totalRate,settle} from '../lib/game.mjs';import {treasureIncome,relicBonus,relicEffect,restorationLevel,RESTORATION_MAX,TREASURE_RELICS} from '../lib/treasure.mjs';import {museumBonus} from '../lib/museum.mjs';import {createPersistence} from '../lib/persistence.mjs';
// BUG-27. Restoration used to mint an invented flat +1 gold/s a level. The original pays no gold for
// exhibits at all: the museum's only hourly payout is MuseumLevel.rewardHour, which pays
// Item_ExhibitEXP_* (split_reward/reward.json Reward_MuseumLv0..50), and a restored exhibit instead
// raises its own Exhibit.levelUpSkill prop. 2403 (Oyster Trap) is Skill_SimGame5_2403_1,
// talent 8 + 1 a level -- so a displayed unrestored 2403 is worth +8 Aptitude and a fully restored one
// +28. 1101 (Anomalocaris Fossil) is yield/percent on city, which Everkai has no channel for, so it is
// recorded in lib/treasure-data.json with an effectNote and pays nothing rather than being approximated.
const base=(id='2403')=>{let s=fresh(1000);s=act(s,'treasureStart',1000,'Relic001',0).state;s.treasure.trip=null;s.treasure.relics={[id]:{materials:210,donated:true,displayed:true}};return s};
const run=(s,id='2403')=>{const r=act(s,'treasureRestore',s.lastAt,id,s.treasure.seq);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};

test('restoration raises the relic\'s own exhibit effect and mints no gold',()=>{
 let s=base();const rate=totalRate(s);
 assert.equal(treasureIncome(s),0);
 assert.deepEqual(relicBonus(s),{aptitude:8,basicPowerPercent:0,powerPercent:0},'a displayed exhibit is level 1 and already pays skillProp_Initial');
 assert.equal(museumBonus(s).aptitude,8,'Treasure Hunt relics are Hall 5/6 exhibits of the same museum');
 for(let n=1;n<=RESTORATION_MAX;n++){
  s=run(s);
  assert.equal(s.treasure.relics['2403'].materials,210-n*(n+1)/2);
  assert.equal(restorationLevel(s.treasure.relics['2403']),n);
  assert.deepEqual(s.treasure.relics['2403'].restorations.at(-1),{policyVersion:2,materials:n},'new receipts carry no gold');
  assert.equal(relicBonus(s).aptitude,8+n);
  assert.equal(totalRate(s),rate,'restoration is not an income faucet');
 }
 assert.equal(relicEffect('2403',s.treasure.relics['2403']).amount,28);
 assert.ok(act(s,'treasureRestore',s.lastAt,'2403',s.treasure.seq).error);
 // Storing the exhibit pauses the bonus: Rule SimGame5_11 pays "once on display".
 s=act(s,'treasureDisplay',s.lastAt,'2403',s.treasure.seq).state;
 assert.equal(s.treasure.relics['2403'].displayed,false);
 assert.equal(relicBonus(s).aptitude,0);
 assert.equal(treasureIncome(s),0);
 assert.deepEqual(decode(JSON.stringify(s)).treasure,s.treasure);
});

test('a relic whose original prop has no Everkai channel restores but pays nothing',()=>{
 let s=base('1101');const rate=totalRate(s);
 assert.equal(relicEffect('1101',s.treasure.relics['1101']),null);
 s=run(s,'1101');
 assert.equal(restorationLevel(s.treasure.relics['1101']),1);
 assert.deepEqual(relicBonus(s),{aptitude:0,basicPowerPercent:0,powerPercent:0});
 assert.equal(totalRate(s),rate);
 assert.equal(treasureIncome(s),0);
});

test('legacy gold receipts keep paying so no existing save loses income',()=>{
 // policyVersion 1 receipts are what shipped before BUG-27 was fixed. They stay valid and keep their
 // stored goldPerSecond; only newly minted receipts (policyVersion 2) carry none.
 const s=base();s.treasure.relics['2403'].restorations=[{policyVersion:1,materials:1,goldPerSecond:1},{policyVersion:1,materials:2,goldPerSecond:2}];
 assert.ok(valid(s));
 assert.equal(treasureIncome(s),3);
 assert.equal(treasureIncome(decode(JSON.stringify(s))),3);
 assert.equal(relicBonus(s).aptitude,10,'a legacy receipt still counts as a restoration level');
 // A mixed save -- old gold receipts plus a new one -- stays legal and the new one adds no gold.
 const next=run(s);
 assert.equal(treasureIncome(next),3);
 assert.equal(relicBonus(next).aptitude,11);
});

test('no retroactive income; stale, insufficient or undonated requests do not spend',()=>{
 let s=base();const rate=totalRate(s),seq=s.treasure.seq;
 const r=act(s,'treasureRestore',11000,'2403',seq);assert.equal(r.state.pending,s.pending+rate*10);
 s=r.state;assert.equal(settle(s,12000).pending,s.pending+rate,'the restored relic adds no gold/s at all');
 assert.ok(act(s,'treasureRestore',11000,'2403',seq).error);
 s.treasure.relics['2403'].materials=1;assert.ok(act(s,'treasureRestore',11000,'2403',s.treasure.seq).error);
 const b=base();b.treasure.relics['2403'].donated=false;b.treasure.relics['2403'].displayed=false;
 assert.ok(act(b,'treasureRestore',1000,'2403',b.treasure.seq).error);
});

test('malformed receipts rejected, old save and Private Hall state untouched',()=>{
 const s=base(),old=decode(JSON.stringify(s));
 assert.equal(old.treasure.relics['2403'].restorations,undefined);
 for(const receipt of [{policyVersion:2,materials:1,goldPerSecond:1},{policyVersion:3,materials:1},
                       {policyVersion:2,materials:0},{policyVersion:1,materials:0,goldPerSecond:1},
                       {policyVersion:1,materials:1,goldPerSecond:-1},{policyVersion:1,materials:1}]){
  const b=base();b.treasure.relics['2403'].restorations=[receipt];
  assert.equal(valid(b),false,JSON.stringify(receipt));
  assert.throws(()=>decode(JSON.stringify(b)));
 }
 const over=base();over.treasure.relics['2403'].restorations=Array.from({length:RESTORATION_MAX+1},(_,i)=>({policyVersion:2,materials:i+1}));
 assert.equal(valid(over),false,'the restoration ladder is bounded');
 s.museum={Collection_43:true};s.museumAccepted=['Collection_43'];
 const next=run(s);assert.deepEqual(next.museum,s.museum);assert.deepEqual(next.museumAccepted,s.museumAccepted);
 assert.equal(museumBonus(next).aptitude,2+9,'Collection_43 is talent 2 (E4-03) and the relic is at level 2');
});

test('failed save retains duplicate budget and old effect until a successful retry',()=>{
 let raw=JSON.stringify(base()),full=false;
 const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(full)throw Error('quota');raw=v}}));
 p.load(1000);full=true;
 assert.throws(()=>p.commit(run(p.current)));
 assert.equal(relicBonus(p.current).aptitude,8);
 assert.equal(p.current.treasure.relics['2403'].materials,210);
 full=false;p.load(1000);p.commit(run(p.current));
 assert.equal(relicBonus(decode(raw)).aptitude,9);
 assert.equal(decode(raw).treasure.relics['2403'].materials,209);
});

// -------------------------------------------------------------------------------------------------
// BUG-27 coverage guard. Every relic must carry the original's own numbers, and any relic Everkai
// cannot express must SAY SO rather than quietly pay nothing or get approximated.
// -------------------------------------------------------------------------------------------------
test('every relic records its original exhibit effect, modelled or explicitly not',()=>{
 assert.equal(TREASURE_RELICS.length,45);
 let modelled=0,unmodelled=0,parts=0;
 for(const r of TREASURE_RELICS){
  if(r.partOf){
   parts++;
   assert.equal(r.effect,null);
   assert.ok(r.effectNote,`${r.id} is a part with no note explaining why it is inert`);
   assert.ok(Array.isArray(r.originalPartsSkill)&&r.originalPartsSkill.length,`${r.id} must record the parent's partsSkill rows`);
   assert.ok(TREASURE_RELICS.some(w=>w.id===r.partOf&&w.assembledFrom.includes(r.id)));
   continue;
  }
  const src=r.effectSource;
  assert.equal(src.reference,'SimGame5_'+r.id,`${r.id} must resolve to its own Exhibit row`);
  assert.ok(src.sourceKey&&src.prop,`${r.id} has no SkillBase row recorded`);
  assert.equal(src.maxExhibitLevel,120,'every SimGame5 exhibit runs to level 120 in the original');
  if(r.effect){
   modelled++;
   assert.equal(src.prop,'talent');assert.equal(src.propType,null);
   assert.deepEqual(r.effect,{stat:'aptitude',initial:src.initial,perLevel:src.perLevel});
  }else{
   unmodelled++;
   assert.match(r.effectNote||'',/^Recovered but not modelled: /,`${r.id} pays nothing and does not say why`);
   assert.ok(['atk','yield','intimacy','charm','factionGraduateProsperity'].includes(src.prop),src.prop);
  }
 }
 assert.equal(parts,9,'six Ladon pieces and three Mural pieces');
 assert.equal(modelled,8);
 assert.equal(unmodelled,28);
 // The ceiling this slice adds: eight talent exhibits, displayed and fully restored.
 const ceiling=TREASURE_RELICS.filter(r=>r.effect).reduce((n,r)=>n+r.effect.initial+RESTORATION_MAX*r.effect.perLevel,0);
 assert.equal(ceiling,313,'8 + 20 x 1 six times, 45 + 20 x 3, and 20 + 20 x 1');
 assert.equal(TREASURE_RELICS.filter(r=>r.effect).reduce((n,r)=>n+r.effect.initial,0),113,'display alone, before any restoration');
});
