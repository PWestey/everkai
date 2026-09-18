import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode,settle} from '../lib/game.mjs';
import {newFellow,bondedPower} from '../lib/adventure.mjs';
import {STELLA_PROFILES,ALL_STELLA_PROFILES,STELLA_IDLE_PER_DAY,stellaRule,stellaState,stellaEntry,
 stellaBonus,stellaActivation,stellaPlan,settleStella,spiritShard,SPIRIT_SHARD_ITEM} from '../lib/stella.mjs';
import {SPIRIT_PROFILES,SPIRIT_SHARD_OWNERS,SPIRIT_SHARD_SINK,SPIRIT_UNMODELLED,SPIRIT_COUNTRY_TYPE,
 SHIPPED_SPIRIT,INFORMED_STELLA_OWNER,spiritPlan,heroSpirit} from '../lib/hero-spirit.mjs';
import SOURCE from '../lib/stella-data.json' with {type:'json'};
import DATA from '../lib/hero-spirit-data.json' with {type:'json'};
import {ORIGINAL_FELLOWS,FELLOWS,REMOVED,fellowById} from '../lib/catalog.mjs';
import {grantFragments} from './progression-helpers.mjs';
import {starterHabits} from '../lib/habits.mjs';

// The original's own Stella tables (HeroSpirit.json), imported by scripts/import-hero-spirit.py and
// shipped as lib/hero-spirit-data.json. This is the coverage guard CLAUDE.md rule 8 requires for a data
// table, plus the price list for the columns Everkai still does not model.
//
// Everkai shipped FOUR profiles for two years, scraped from four community character pages, with a
// comment in tests/stella.test.mjs saying filling the Informed hole would mean "inventing a Stella curve
// and item for another Informed Fellow". The original had written 126 of them. The four were real -- the
// importer's positive control reproduces their cost, flat and percent columns to the digit -- but the
// absence claim around them was wrong, which is exactly the failure mode CLAUDE.md rule 2 is about.

const T=new Date('2026-09-16T09:00:00').getTime();
const DAY=86400000;
const own=(...ids)=>{const s=fresh(T);return {...s,habits:starterHabits(T),fellows:{...s.fellows,...Object.fromEntries(ids.map(id=>[id,newFellow()]))}}};
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
const climb=(state,id)=>{const p=stellaRule(id);
 let s=grantFragments(state,id,Math.ceil(p.levels.reduce((n,r)=>n+r.cost,0)/1000)+1);
 s=go(s,'stellaActivate',id,{seq:stellaState(s).seq});
 return go(s,'stellaUpgrade',id,{seq:stellaState(s).seq,count:'max'})};

// ---------------------------------------------------------------------------------------------
// THE IMPORT ITSELF. Coverage first, then the positive control that makes the coverage meaningful.
// ---------------------------------------------------------------------------------------------

test('the imported table is 126 heroes and 3,266 ranks, with nothing reconstructed',()=>{
 assert.equal(DATA.profiles.length,126,'HeroSpirit.json covers 126 of the original’s 181 heroes');
 assert.equal(DATA.profiles.reduce((n,p)=>n+p.ranks.length,0),3266);
 // 95 heroes have 21 ranks and 31 have 41 -- rank 0 is the free activation, so 20 or 40 paid levels.
 const shape={};for(const p of DATA.profiles)shape[p.ranks.length]=(shape[p.ranks.length]||0)+1;
 assert.deepEqual(shape,{21:95,41:31});
 // Rank 0 is free everywhere, and a rank's flat and percent are CUMULATIVE totals, so they may only
 // ever climb. A per-level delta read as a total would pass every other assertion in this file.
 for(const p of DATA.profiles){
  assert.equal(p.ranks[0].cost,0,`hero_${p.heroId} rank 0 is not free`);
  for(let i=1;i<p.ranks.length;i++){
   assert.ok(p.ranks[i].cost>0,`hero_${p.heroId} rank ${i} is free`);
   assert.ok(p.ranks[i].flat>=p.ranks[i-1].flat&&p.ranks[i].percent>=p.ranks[i-1].percent,`hero_${p.heroId} rank ${i} goes backwards`);
  }
 }
 assert.ok(DATA.sha256.HeroSpirit&&DATA.sha256.SkillBase&&DATA.sha256.SkillLevel,'the source tables are hashed');
});

test('POSITIVE CONTROL: the four community-scraped profiles reproduce from the original’s tables',()=>{
 // The whole import rests on this. The four rows in lib/stella-data.json were recovered independently
 // -- from four wiki pages, months earlier -- so if the reader below is right it must land on them
 // exactly. It does, which is what licenses trusting it for the other 122.
 for(const p of SOURCE.profiles){
  const src=DATA.profiles.find(r=>'hero_'+r.heroId===p.id);
  assert.ok(src,`${p.id} is missing from the import`);
  assert.equal(src.itemId,p.itemId);
  const paid=src.ranks.filter(r=>r.rank>0);
  assert.deepEqual(paid.map(r=>[r.rank,r.cost,r.flat,r.percent/100]),
   p.levels.map(r=>[r.level,r.cost,r.flat,r.percent]),p.id);
 }
 // NEGATIVE CONTROL on the same reader: hero_74 IS in Everkai's roster and DOES have a fragment item
 // in the original's Item table, and must still come back with no Spirit track -- otherwise "126 of
 // 181" is an artefact of the reader rather than a fact about the data.
 assert.equal(heroSpirit('hero_74'),null);
 assert.equal(heroSpirit('hero_15'),null,'the starter has no track either');
 assert.ok(heroSpirit('hero_52'),'and Angie does');
});

test('only four heroes in the whole table grant a TYPE-wide percent, and they are Everkai’s four',()=>{
 // This is the finding that settles "should everyone get a percent track". The original's answer is no:
 // 122 of 126 Stella tables grant the owner's own Power and nothing type-wide.
 const typed=DATA.profiles.filter(p=>p.country).map(p=>'hero_'+p.heroId).sort();
 assert.deepEqual(typed,['hero_190','hero_52','hero_54','hero_56']);
 assert.deepEqual(SOURCE.profiles.map(p=>p.id).sort(),typed,'and they are exactly the four that shipped');
 // Each one's country matches its owner's Everkai type, which is what makes SPIRIT_COUNTRY_TYPE a
 // measurement rather than a guess. hero_52 is read through the trim list because she was deleted.
 for(const p of DATA.profiles.filter(p=>p.country)){
  const id='hero_'+p.heroId,type=fellowById(id)?.type;
  if(type)assert.equal(SPIRIT_COUNTRY_TYPE[p.country],type,id);
  else assert.ok(REMOVED.has(id),`${id} has neither a type nor a trim entry`);
 }
});

// ---------------------------------------------------------------------------------------------
// WHAT EVERKAI SHIPS FROM IT.
// ---------------------------------------------------------------------------------------------

test('every shipped Fellow has a ladder, and the partition says where each one came from',()=>{
 const why={};
 for(const f of ORIGINAL_FELLOWS)why[spiritPlan(f.id).why]=(why[spiritPlan(f.id).why]||0)+1;
 // 88 of the 111 have a real track of their own. hero_74 is counted separately because she has none
 // and carries hero_52's instead, which leaves 22 with no recovered track at all -- the original's
 // low-rarity characters. The owner asked that everyone have one, so those take the smallest recovered
 // ladder (hero_190's, flat column only).
 assert.deepEqual(why,{imported:88,repointed:1,default:22});
 assert.equal(ORIGINAL_FELLOWS.filter(f=>heroSpirit(f.id)).length,88);
 assert.equal(ORIGINAL_FELLOWS.length,111);
 assert.equal(STELLA_PROFILES.length,112,'the 111 plus hero_52, whose row outlives her');
 for(const f of ORIGINAL_FELLOWS)assert.ok(stellaRule(f.id),`${f.id} has no Stella ladder`);
 // NEGATIVE CONTROL: a deleted Fellow and a Fellow that never existed still resolve to nothing.
 assert.equal(stellaRule('hero_105'),undefined);
 assert.equal(stellaRule('hero_nobody'),undefined);
 assert.equal(stellaActivation('hero_105'),null);
 // The 23 default ladders are FLAT-ONLY. hero_190's own ladder carries a country-1 percent, so copying
 // it unchanged would hand 23 Fellows an Inspiring bonus their characters never granted -- and hand it
 // 23 times over, because the type sum adds every owner.
 const defaults=ORIGINAL_FELLOWS.filter(f=>spiritPlan(f.id).why==='default');
 assert.equal(defaults.length,22);
 for(const f of defaults){const p=stellaRule(f.id);
  assert.equal(p.levels.at(-1).percent,0,`${f.id} default ladder carries a typed percent`);
  assert.equal(p.levels.at(-1).flat,15300000);
  assert.equal(p.levels.length,20);
 }
 // POSITIVE CONTROL for that: the ladder they copy really does carry one, so the zeroing is doing work.
 assert.equal(stellaRule('hero_190').levels.at(-1).percent,62);
});

test('Angie’s Informed ladder went to hero_74, unchanged, and the filter chain has one survivor',()=>{
 const lucoa=stellaRule(INFORMED_STELLA_OWNER);
 assert.equal(INFORMED_STELLA_OWNER,'hero_74');
 assert.equal(fellowById('hero_74').type,'Informed','the type must not move with the ladder');
 assert.equal(lucoa.levels.length,40);
 assert.equal(lucoa.levels.at(-1).flat,35300000);
 assert.equal(lucoa.levels.at(-1).percent,122,'the Informed bonus is reachable again');
 assert.equal(lucoa.levels.reduce((n,r)=>n+r.cost,0),4500);
 // It IS Angie's ladder, column for column -- only the id, the owner and the currency are local.
 const angie=stellaRule('hero_52');
 assert.deepEqual(lucoa.levels.map(r=>[r.level,r.cost,r.flat,r.percent]),
  angie.levels.map(r=>[r.level,r.cost,r.flat,r.percent]));
 assert.notEqual(lucoa.itemId,angie.itemId,'but it does not spend Angie’s fragments');
 // The filter chain, re-derived here so it fails if the roster changes under it rather than being a
 // claim in a comment: Informed, shipped, not a starter, SR like all four authored owners, and no
 // Spirit track of her own to overwrite.
 const starters=['hero_1','hero_15','hero_195'];
 const candidates=ORIGINAL_FELLOWS.filter(f=>f.type==='Informed'&&!starters.includes(f.id)&&f.rarity==='SR'&&!heroSpirit(f.id));
 assert.deepEqual(candidates.map(f=>f.id).sort(),['hero_61','hero_71','hero_74']);
 assert.ok(candidates.some(f=>f.id===INFORMED_STELLA_OWNER),'the chosen owner must survive its own filter');
});

test('Elise’s activation is +2%, the original’s own rank-0 value, and old rows keep their 0',()=>{
 // lib/stella-activation-policy.json called this "unverified" and granted 0. HeroSpirit hero_190 rank 0
 // grants Hero190_PowerPercent_1 level 1 = 200, i.e. +2%, exactly like the other three.
 assert.equal(DATA.profiles.find(p=>p.heroId==='190').ranks[0].percent,200);
 assert.equal(stellaActivation('hero_190').percent,2);
 assert.equal(stellaActivation('hero_190').activationPolicy,'private-elise-stella-activation-v1',
  'the POLICY id must not move, or a v86 save that recorded it stops decoding');
 for(const id of ['hero_54','hero_56'])assert.equal(stellaActivation(id).percent,2);
 // A stored row keeps what it recorded: the four legacy ladders are never repriced.
 let s=go(own('hero_190'),'stellaActivate','hero_190',{seq:0});
 const old={...s,stella:{...s.stella,history:s.stella.history.map(r=>({...r,percent:0}))}};
 assert.ok(valid(old),'a v86 activation row recording 0 must still be accepted');
 assert.deepEqual(decode(JSON.stringify(old)).stella,old.stella);
});

// ---------------------------------------------------------------------------------------------
// THE FAUCET. One pool, whatever the roster does.
// ---------------------------------------------------------------------------------------------

test('108 ladders share one shard item, and the mint pays that pool once a day, not once per owner',()=>{
 assert.equal(SPIRIT_SHARD_OWNERS.length,108,'111 shipped Fellows less the three with a private item');
 assert.equal(new Set(SPIRIT_PROFILES.map(p=>p.itemId)).size,5,'the shared shard plus four private fragments');
 for(const id of SHIPPED_SPIRIT.filter(id=>id!=='hero_52'))
  assert.equal(spiritShard(id),false,`${id} must keep its own fragment item; real saves hold stock in it`);
 // One owner and 108 owners mint the same number of shards. NEGATIVE CONTROL for the dedupe added to
 // settleStella: without it this is 108x.
 const one=settleStella(own(),T,T+DAY);
 const many=settleStella(own(...ORIGINAL_FELLOWS.map(f=>f.id)),T,T+DAY);
 assert.equal(one.stella.stock[SPIRIT_SHARD_ITEM],many.stella.stock[SPIRIT_SHARD_ITEM]);
 assert.ok(one.stella.stock[SPIRIT_SHARD_ITEM]>0,'positive control: the mint is running at all');
 const mult=one.stella.stock[SPIRIT_SHARD_ITEM]/STELLA_IDLE_PER_DAY;
 assert.ok(mult>=1&&mult<=2,`habit multiplier out of range: ${mult}`);
 // And a private fragment still accrues separately, at the same per-item rate.
 const both=settleStella(own('hero_54'),T,T+DAY);
 assert.equal(both.stella.stock.Item_Owner_HeroPiece_54,both.stella.stock[SPIRIT_SHARD_ITEM]);
});

test('pacing, both halves from the shipped tables: 722 days of kept habits for the whole roster',()=>{
 // Sink: the imported cost columns. Mint: STELLA_IDLE_PER_DAY x the habit multiplier 1.0-2.0. Nothing
 // here is a rate someone picked (CLAUDE.md rule 1 -- both halves come from the same place).
 assert.equal(SPIRIT_SHARD_SINK,721867);
 assert.equal(Math.round(SPIRIT_SHARD_SINK/(STELLA_IDLE_PER_DAY*2)),722,'all 108 at the top multiplier');
 assert.equal(Math.round(SPIRIT_SHARD_SINK/STELLA_IDLE_PER_DAY),1444,'and with no habits at all');
 // The per-item stock cap is 1e6 and the whole sink is under it, so no bound moves for the stock.
 assert.ok(SPIRIT_SHARD_SINK<1e6);
 // The cheapest and dearest single ladders, so "everyone has a track" is not read as "everyone is equal".
 const costs=SPIRIT_PROFILES.filter(p=>p.itemId===SPIRIT_SHARD_ITEM).map(p=>p.levels.reduce((n,r)=>n+r.cost,0));
 assert.deepEqual([Math.min(...costs),Math.max(...costs)],[298,30000]);
});

test('a flat-only ladder\u2019s receipt does not claim a typed bonus it has not got',()=>{
 // Found by eye in the browser, which is the only way an `app/` string can be found (CLAUDE.md). The
 // message keyed its typed clause on the profile having a TYPE, and every imported per-owner profile
 // carries its owner's real type -- so buying a level on a flat-only ladder reported
 // "Tigirl Stella 5 saved - +7,500,000 own Power - Brave Power +0%". It keys on the LADDER now.
 let s=grantFragments(own('hero_111'),'hero_111',1);
 s=go(s,'stellaActivate','hero_111',{seq:stellaState(s).seq});
 const r=act(s,'stellaUpgrade',s.lastAt,'hero_111',{seq:stellaState(s).seq,count:5});
 assert.equal(r.error,undefined);
 assert.ok(!/Power \+0%/.test(r.message),`a flat-only receipt claims a typed bonus: ${r.message}`);
 assert.ok(/own Power/.test(r.message),r.message);
 // POSITIVE CONTROL: a ladder that DOES carry a percent still says so, so the clause was not just
 // deleted. hero_56 (Liz) is the Diligent owner.
 let d=grantFragments(own('hero_56'),'hero_56',1);
 d=go(d,'stellaActivate','hero_56',{seq:stellaState(d).seq});
 const rd=act(d,'stellaUpgrade',d.lastAt,'hero_56',{seq:stellaState(d).seq,count:5});
 assert.equal(rd.error,undefined);
 assert.ok(/Diligent Power \+\d+%/.test(rd.message),rd.message);
 // And the crossover pool, which has no type at all, must not report "null Power".
 assert.ok(!/null/.test(r.message)&&!/null/.test(rd.message));
});

test('the pool is genuinely shared: what one Fellow spends, the next cannot',()=>{
 let s=grantFragments(own('hero_1','hero_15'),'hero_1',2);   // 2,000 shards, one pool, two owners
 assert.equal(stellaState(s).stock[SPIRIT_SHARD_ITEM],2000);
 s=go(s,'stellaActivate','hero_1',{seq:stellaState(s).seq});
 s=go(s,'stellaUpgrade','hero_1',{seq:stellaState(s).seq,count:'max'});
 assert.equal(stellaEntry(s,'hero_1').level,20,'hero_1’s whole 1,500-shard ladder');
 assert.equal(stellaState(s).stock[SPIRIT_SHARD_ITEM],500,'1,500 came out of the shared pool');
 s=go(s,'stellaActivate','hero_15',{seq:stellaState(s).seq});
 s=go(s,'stellaUpgrade','hero_15',{seq:stellaState(s).seq,count:'max'});
 assert.ok(stellaEntry(s,'hero_15').level<20,'the second Fellow cannot finish on what is left');
 assert.equal(stellaPlan(s,'hero_15','max').rows.length,0,'and there is nothing left to buy');
 assert.ok(valid(s),refusedBy(s));
 assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella,'the whole two-owner ledger round-trips');
});

// ---------------------------------------------------------------------------------------------
// THE POWER MATHS, and the ORDER the original applies it in.
// ---------------------------------------------------------------------------------------------

test('the owner’s flat is added AFTER the typed multiplier, which is the original’s order',()=>{
 // private-server/readable/PropManager.lua:116 computes base * (1 + percent/10000) * ... + extradd, and
 // a Spirit's own-Power effect is an `extradd`. Everkai multiplied the flat by the typed percent until
 // 2026-09-18 and its own UI said the stacking was unverified.
 let s=own('hero_56','hero_106');                    // Liz is Diligent; hero_106 is another Diligent
 const before=bondedPower(s,'hero_56');
 s=climb(s,'hero_56');
 assert.equal(stellaBonus(s,'hero_56').percent,122);
 // The 1-unit slack is the un-floored base inside bondedPower; `before` is already floored.
 assert.ok(Math.abs(bondedPower(s,'hero_56')-(Math.floor(before*2.22)+35300000))<=1,
  `${bondedPower(s,'hero_56')} is not floor(${before} x 2.22) + 35,300,000`);
 // NEGATIVE CONTROL: the superseded order is a different, much larger number, so this assertion is
 // distinguishing the two rather than passing on both.
 assert.ok(Math.floor((before+35300000)*2.22)-bondedPower(s,'hero_56')>40000000,
  'the old order and the new one must not be within rounding of each other');
 // A Fellow of the same type with NO ladder of her own still receives the typed percent and no flat.
 assert.equal(stellaBonus(s,'hero_106').flat,0);
 assert.equal(stellaBonus(s,'hero_106').percent,122);
});

test('a flat-only ladder never joins a type sum, however many Fellows climb one',()=>{
 // 108 of the 111 ladders grant no typed percent. If any of them leaked into `stellaBonus`, every
 // Fellow of that type would be multiplied by the sum of all of them -- the failure this whole design
 // exists to avoid.
 const flatOnly=ORIGINAL_FELLOWS.filter(f=>stellaRule(f.id).levels.at(-1).percent===0);
 assert.equal(flatOnly.length,107,'111 less hero_54, hero_56, hero_190 and the re-pointed hero_74');
 let s=own(...flatOnly.slice(0,12).map(f=>f.id));
 for(const f of flatOnly.slice(0,12))s=climb(s,f.id);
 for(const type of ['Diligent','Informed','Inspiring','Brave','Unfettered']){
  const someone=FELLOWS.find(f=>f.type===type&&!f.addition);
  assert.equal(stellaBonus(s,someone.id).percent,0,`${type} picked up a percent from a flat-only ladder`);
 }
 assert.ok(valid(s),refusedBy(s));
});

// ---------------------------------------------------------------------------------------------
// THE COLUMNS EVERKAI DOES NOT MODEL, priced so the gap stays a decision rather than a surprise.
// ---------------------------------------------------------------------------------------------

test('the unmodelled Spirit columns are recorded with their sizes, not quietly dropped',()=>{
 const kinds={};
 for(const p of DATA.profiles)for(const k of Object.keys(p.unmodelledMax))kinds[k]=(kinds[k]||0)+1;
 // The four biggest, measured. `self|atk/percent` is the one that would move the ceiling most: 116 of
 // the 126 heroes have one and they run to +1350% on the OWNER alone.
 assert.equal(kinds['self|atk/percent'],116);
 assert.equal(kinds['all|appoint/percent'],57);
 assert.equal(kinds['self|talentLvLimit'],57);
 assert.ok(Object.keys(kinds).filter(k=>k.startsWith('bond:')).length>=20,'the hero-group columns are recorded too');
 const own=Object.values(SPIRIT_UNMODELLED).map(u=>u['self|atk/percent']||0).filter(Boolean).sort((a,b)=>a-b);
 assert.deepEqual([own[0]/100,own.at(-1)/100],[153,1350],'the own-percent column runs +153% to +1350%');
 // Everkai models exactly two columns. If a third ever lands, this count moves and this test says so.
 assert.deepEqual([...new Set(SPIRIT_PROFILES.flatMap(p=>Object.keys(p.levels[0])))].sort(),
  ['cost','flat','itemId','level','percent']);
});

test('the whole roster of imported ladders still fits the save bounds, and round-trips',()=>{
 // The history bound is a WIDENING only: every save that decoded before this slice still decodes.
 const bound=STELLA_PROFILES.reduce((n,p)=>n+p.levels.length+1,0);
 assert.ok(bound>144,'the per-owner term grew from the four scraped ladders');
 let s=own(...ORIGINAL_FELLOWS.slice(0,6).map(f=>f.id));
 for(const f of ORIGINAL_FELLOWS.slice(0,6))s=climb(s,f.id);
 assert.ok(valid(s),refusedBy(s));
 assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella);
 // NEGATIVE CONTROL: a row priced off its own ladder is refused for an imported track (they have never
 // shipped, so nothing older can hold one), while the four legacy ladders are still accepted as
 // recorded -- which is what keeps a v86 save loading.
 const bad=structuredClone(s);bad.stella.history.at(-1).flat=99000000;
 assert.equal(valid(bad),false,'a tampered imported flat must not pay out');
 assert.equal(refusedBy(bad),'validStella');
 let legacy=climb(own('hero_54'),'hero_54');
 legacy={...legacy,stella:{...legacy.stella,history:legacy.stella.history.map((r,i,a)=>i===a.length-1?{...r,percent:999}:r)}};
 assert.equal(valid(legacy),true,'a legacy row is still accepted as recorded');
});
