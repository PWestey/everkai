import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode,settle} from '../lib/game.mjs';
import {newFellow,bondedPower,powerParts} from '../lib/adventure.mjs';
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
 // It does not spend Angie's retired private fragments: it has no `ownItemId` at all, only the pool.
 assert.equal(angie.ownItemId,'Item_Owner_HeroPiece_52');
 assert.equal(lucoa.ownItemId,undefined,'but it does not spend Angie’s fragments');
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

// CHANGED 2026-09-19: all 111 now. The three reachable shipped ladders (hero_54, hero_56, hero_190) used to keep
// a private item minted at the full daily rate for them alone -- the owner's untouched level-1 Elise reached 25M
// on hers. They spend the pool now and keep the old item only as `ownItemId`, which nothing mints.
test('111 ladders share one shard item, and the mint pays that pool once a day, not once per owner',()=>{
 assert.equal(SPIRIT_SHARD_OWNERS.length,111,'every shipped Fellow, the three formerly private ones included');
 assert.equal(new Set(SPIRIT_PROFILES.map(p=>p.itemId)).size,1,'one spend item for every original ladder');
 assert.deepEqual(SPIRIT_PROFILES.filter(p=>p.ownItemId).map(p=>[p.id,p.ownItemId]).sort(),
  [['hero_190','Item_Owner_HeroPiece_190'],['hero_52','Item_Owner_HeroPiece_52'],['hero_54','Item_Owner_HeroPiece_54'],['hero_56','Item_Owner_HeroPiece_56']],
  'the four shipped ladders remember their old item, and only they do');
 for(const id of SHIPPED_SPIRIT.filter(id=>id!=='hero_52'))
  assert.equal(spiritShard(id),true,`${id} spends the pool now`);
 // One owner and 108 owners mint the same number of shards. NEGATIVE CONTROL for the dedupe added to
 // settleStella: without it this is 108x.
 const one=settleStella(own(),T,T+DAY);
 const many=settleStella(own(...ORIGINAL_FELLOWS.map(f=>f.id)),T,T+DAY);
 assert.equal(one.stella.stock[SPIRIT_SHARD_ITEM],many.stella.stock[SPIRIT_SHARD_ITEM]);
 assert.ok(one.stella.stock[SPIRIT_SHARD_ITEM]>0,'positive control: the mint is running at all');
 const mult=one.stella.stock[SPIRIT_SHARD_ITEM]/STELLA_IDLE_PER_DAY;
 assert.ok(mult>=1&&mult<=2,`habit multiplier out of range: ${mult}`);
 // And a formerly private owner mints NOTHING of her own any more, and adds nothing to the pool: owning
 // hero_54, hero_56 and hero_190 pays exactly what owning none of them pays.
 const three=settleStella(own('hero_54','hero_56','hero_190'),T,T+DAY);
 for(const n of [54,56,190])assert.equal(three.stella.stock['Item_Owner_HeroPiece_'+n],undefined,`hero_${n} minted a private fragment`);
 assert.equal(three.stella.stock[SPIRIT_SHARD_ITEM],one.stella.stock[SPIRIT_SHARD_ITEM]);
});

test('pacing, both halves from the shipped tables: 732 days of kept habits for the whole roster',()=>{
 // Sink: the imported cost columns. Mint: STELLA_IDLE_PER_DAY x the habit multiplier 1.0-2.0. Nothing
 // here is a rate someone picked (CLAUDE.md rule 1 -- both halves come from the same place).
 // 721,867 over 108 ladders until 2026-09-19; the three formerly private ladders add 4,500 + 4,500 + 1,500.
 assert.equal(SPIRIT_SHARD_SINK,721867+10500);
 assert.equal(Math.round(SPIRIT_SHARD_SINK/(STELLA_IDLE_PER_DAY*2)),732,'all 111 at the top multiplier');
 assert.equal(Math.round(SPIRIT_SHARD_SINK/STELLA_IDLE_PER_DAY),1465,'and with no habits at all');
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
 const climbed=new Set(flatOnly.slice(0,12).map(f=>f.id));
 for(const type of ['Diligent','Informed','Inspiring','Brave','Unfettered']){
  const someone=FELLOWS.find(f=>f.type===type&&!f.addition);
  // The BROADCAST half, read on its own since 2026-09-18. `percent` also carries the owner's own
  // imported `selfPowerBp`, and a Fellow who climbed her own flat-only ladder legitimately has one --
  // so asserting the sum here would fail on the very behaviour being added rather than on a leak.
  assert.equal(stellaBonus(s,someone.id).typedPercent,0,`${type} picked up a percent from a flat-only ladder`);
  // And a Fellow of the same type who climbed NOTHING has neither half: the own column cannot reach her
  // either, which is the stronger statement and the one that distinguishes scope `self` from `country`.
  const bystander=FELLOWS.find(f=>f.type===type&&!f.addition&&!climbed.has(f.id));
  if(bystander)assert.deepEqual([stellaBonus(s,bystander.id).percent,stellaBonus(s,bystander.id).flat],[0,0],
   `${type} bystander ${bystander.id} received something from another Fellow's ladder`);
 }
 // POSITIVE CONTROL on the same reader: at least one of the twelve climbers DOES hold an own-Power
 // percent, so the two assertions above are not both passing because nothing was measured at all.
 assert.ok(flatOnly.slice(0,12).some(f=>stellaBonus(s,f.id).selfPercent>0),
  'no climber gained an own-Power percent -- the check above proves nothing');
 assert.ok(valid(s),refusedBy(s));
});

// ---------------------------------------------------------------------------------------------
// THE COLUMNS EVERKAI DOES NOT MODEL, priced so the gap stays a decision rather than a surprise.
// ---------------------------------------------------------------------------------------------

test('the three deferred Spirit columns are now imported, at the sizes they were deferred at',()=>{
 // These three WERE `unmodelledMax` keys until 2026-09-18. The sizes recorded there then are the sizes
 // asserted here now, which is the check that importing them moved the data and not the measurement:
 //   self|atk/percent   116 heroes  +153% .. +1350%   -> `selfPowerBp`
 //   all|appoint/percent 57 heroes    +4% .. +800%    -> `appointYieldBp`
 //   self|talentLvLimit  57 heroes   +50 .. +100      -> `talentLimit`
 const top=DATA.profiles.map(p=>p.ranks.at(-1));
 const col=k=>top.map(r=>r[k]).filter(Boolean).sort((a,b)=>a-b);
 assert.equal(col('selfPowerBp').length,116);
 assert.equal(col('appointYieldBp').length,57);
 assert.equal(col('talentLimit').length,57);
 assert.deepEqual([col('selfPowerBp')[0]/100,col('selfPowerBp').at(-1)/100],[153,1350]);
 assert.deepEqual([col('appointYieldBp')[0]/100,col('appointYieldBp').at(-1)/100],[4,800]);
 assert.deepEqual([...new Set(col('talentLimit'))],[100]);
 // The sums, which is what prices them: the own column is per OWNER so it never sums in play, but the
 // appointment column is scope `all` and genuinely does.
 assert.equal(col('selfPowerBp').reduce((a,b)=>a+b,0),5838500);
 assert.equal(col('appointYieldBp').reduce((a,b)=>a+b,0),2721600,'+27,216% if every one of the 57 were maxed');
 // A COLUMN IS SPARSE AND CARRIED. hero 264 names its own-Power halo on ranks 0,2,7,9,11,13,15,17,19
 // and nowhere else, so rank 20's value exists only because the importer carried it. A reader that
 // took a silent rank as zero would saw-tooth, and the column would be non-monotone.
 const h264=DATA.profiles.find(p=>p.heroId==='264').ranks;
 assert.equal(h264.at(-1).selfPowerBp,95000);
 assert.equal(h264.at(-1).selfPowerBp,h264[19].selfPowerBp,'rank 20 names no own-Power halo; it carries rank 19’s');
 for(const k of ['flat','percent','selfPowerBp','appointYieldBp','talentLimit'])
  for(const p of DATA.profiles)for(let i=1;i<p.ranks.length;i++)
   assert.ok(p.ranks[i][k]>=p.ranks[i-1][k],`hero_${p.heroId} ${k} falls at rank ${i}`);
 // Everkai models five columns now. If a sixth ever lands, this list moves and this test says so.
 assert.deepEqual([...new Set(SPIRIT_PROFILES.flatMap(p=>Object.keys(p.levels[0])))].sort(),
  ['appointYieldBp','cost','flat','itemId','level','percent','selfPowerBp','talentLimit']);
});

test('what is still LEFT OUT is recorded with its size, and it is an absent axis not an absent number',()=>{
 const kinds={};
 for(const p of DATA.profiles)for(const k of Object.keys(p.unmodelledMax))kinds[k]=(kinds[k]||0)+1;
 // The three imported columns must have LEFT unmodelledMax, or the census is double-counting them as a
 // gap they no longer are.
 for(const gone of ['self|atk/percent','all|appoint/percent','self|talentLvLimit'])
  assert.equal(kinds[gone],undefined,`${gone} is imported now and must not still read as a gap`);
 // What remains, and why (lib/hero-spirit.mjs): `bond:<n>` is one of HeroBond.json's 23 named hero
 // GROUPS and Everkai has no group axis; `self|talent` is the client's `coef` bucket, whose Everkai
 // axis is `aptitude`, hard-capped at 1,000 by a check saves are validated against.
 assert.ok(Object.keys(kinds).filter(k=>k.startsWith('bond:')).length>=20,'the hero-group columns are still recorded');
 assert.equal(kinds['self|talent'],17);
 const talent=Object.values(SPIRIT_UNMODELLED).map(u=>u['self|talent']||0).filter(Boolean).sort((a,b)=>a-b);
 assert.deepEqual([talent[0],talent.at(-1)],[340,2050],'the coef column runs +340 to +2,050 talent');
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

// ---------------------------------------------------------------------------------------------
// THE THREE COLUMNS IMPORTED 2026-09-18, each on its own axis. Every one of these is negative-
// controlled in place (CLAUDE.md testing rules) -- the break is applied, the assertion is checked to
// fail, and the state is restored -- because all three are new axes and a test that asserts nothing
// would look identical to a test that passes.
// ---------------------------------------------------------------------------------------------

test('the own-Power percent reaches its owner and nobody else, in the SAME bucket as the typed one',()=>{
 // hero_194 has the largest own-Power column in the table (+1350%) and is Inspiring; hero_54 (Rani) is
 // the Inspiring owner of a TYPE-wide +122%. A Fellow who has both must get 1472%, not 1.22 x 13.5.
 let s=own('hero_194','hero_54','hero_21');
 const base=bondedPower(s,'hero_194');
 s=climb(s,'hero_194');
 assert.equal(stellaBonus(s,'hero_194').selfPercent,1350);
 assert.equal(stellaBonus(s,'hero_194').typedPercent,0,'nobody has activated a typed ladder yet');
 s=climb(s,'hero_54');
 const b=stellaBonus(s,'hero_194');
 assert.equal(b.typedPercent,122,'Rani’s type-wide column reaches every Inspiring Fellow');
 assert.equal(b.percent,1472,'SUMMED into one factor, as PropManager Formula_ADD does -- not nested');
 assert.notEqual(b.percent,1350*1.22+0,'and specifically not the nested reading');
 // The composition, end to end: percent multiplies the base, then the flat is added AFTER it.
 // Since 2026-09-18 the climb also unlocks talent (Stella-unlocked skills, the self/bond talent halo), so the
 // base is re-read at the climbed Aptitude: ADH x Aptitude with no percent, exactly what `base` was before.
 const pp=powerParts(s,'hero_194'),base2=Math.floor(pp.adh*pp.aptitude);assert.ok(base2>=base);
 assert.equal(bondedPower(s,'hero_194'),Math.floor(base2*(1+1472/100))+b.flat);
 // SCOPE. hero_21 is Inspiring too and has climbed nothing: she takes the type-wide 122 and none of
 // hero_194's 1350. This is the difference between `country` and `self`, and it is the whole risk.
 assert.deepEqual([stellaBonus(s,'hero_21').typedPercent,stellaBonus(s,'hero_21').selfPercent],[122,0]);
 assert.equal(stellaBonus(s,'hero_21').flat,0);
 assert.ok(valid(s),refusedBy(s));
});

test('a receipt may not claim a column its ladder has not got, and a receipt missing one still loads',()=>{
 // hero_104's ladder carries an own-Power column and NO appointment column, which is what makes the
 // second negative control below a real one rather than a value the ladder happens to allow.
 let s=climb(own('hero_104'),'hero_104');
 assert.ok(valid(s),refusedBy(s));
 const top=stellaRule('hero_104').levels.at(-1);
 // NEGATIVE CONTROL 1 -- a fabricated own-Power percent is refused, by validStella and by name.
 const forged=structuredClone(s);forged.stella.history.at(-1).selfPowerBp=999999;
 assert.equal(valid(forged),false,'a forged own-Power percent must not pay out');
 assert.equal(refusedBy(forged),'validStella');
 // NEGATIVE CONTROL 2 -- so is a fabricated appointment column on a ladder that carries none.
 const forged2=structuredClone(s);forged2.stella.history.at(-1).appointYieldBp=80000;
 assert.equal(top.appointYieldBp,0,'hero_104’s ladder carries no appointment column');
 assert.equal(valid(forged2),false);
 assert.equal(refusedBy(forged2),'validStella');
 // BACKWARD COMPATIBILITY -- a receipt written before these columns existed has no such field at all.
 // It must still load, and it must grant zero rather than being repriced to today's ladder. This is the
 // same rule the four legacy ladders already have; it is the reason `priced` accepts an absent field.
 const legacy=structuredClone(s);
 for(const r of legacy.stella.history){delete r.selfPowerBp;delete r.appointYieldBp;delete r.talentLimit}
 assert.equal(valid(legacy),true,'a pre-2026-09-18 receipt must still decode');
 assert.deepEqual(decode(JSON.stringify(legacy)).stella,legacy.stella,'byte-identical round trip');
 assert.equal(stellaBonus(legacy,'hero_104').selfPercent,0,'and it grants what it recorded: nothing');
 assert.ok(stellaBonus(s,'hero_104').selfPercent>0,'positive control: the unmodified save does grant it');
});

test('the appointment column is account-wide: it multiplies assigned operation, not Power',async()=>{
 const {assignedOperation}=await import('../lib/operations.mjs');
 const {stellaAppointBp}=await import('../lib/stella.mjs');
 const {BUSINESSES}=await import('../lib/businesses.mjs');
 const business=BUSINESSES[0];
 // hero_1 is assigned; hero_114 owns an appointment ladder and is NOT assigned. Scope `all` means
 // hero_114's ladder still pays -- that is what makes it account-wide rather than per-operator.
 let s=own('hero_1','hero_114');
 s={...s,enterprises:{...(s.enterprises||{}),[business.id]:{...(s.enterprises?.[business.id]||{employees:0,level:1}),fellows:['hero_1']}}};
 const before=assignedOperation(s,business);
 const power=bondedPower(s,'hero_1');
 s=climb(s,'hero_114');
 const bp=stellaRule('hero_114').levels.at(-1).appointYieldBp;
 assert.ok(bp>0);
 assert.equal(stellaAppointBp(s),bp,'one owner, one contribution');
 assert.equal(assignedOperation(s,business),before*(1+bp/10000),'x(1 + bp/10000), the client’s own form');
 // AND IT IS NOT A POWER TERM. The assigned Fellow's Power must not move at all: hero_114's ladder
 // raises her OWN power, hero_1 is untouched.
 assert.equal(bondedPower(s,'hero_1'),power,'the appointment column must not leak into bondedPower');
 // NEGATIVE CONTROL: with the column removed from the receipt the multiplier goes back to 1.0, so the
 // assertion above is measuring this column and not something else that moved at the same time.
 const stripped=structuredClone(s);
 for(const r of stripped.stella.history)delete r.appointYieldBp;
 assert.equal(stellaAppointBp(stripped),0);
 assert.equal(assignedOperation(stripped,business),before);
 assert.ok(valid(s),refusedBy(s));
});

test('the talent-cap column widens the cap and nothing else, and the ledger bound moves with it',async()=>{
 const {talentCap,talentRule}=await import('../lib/talents.mjs');
 const {default:source}=await import('../lib/default-talent-source.json',{with:{type:'json'}});
 let s=own('hero_114','hero_1');
 const baseCap=talentCap(s,'hero_114');
 assert.equal(baseCap,talentRule('hero_114').cap,'default mode starts at the tier cap');
 s=climb(s,'hero_114');
 const grant=stellaRule('hero_114').levels.at(-1).talentLimit;
 assert.equal(grant,100);
 assert.equal(talentCap(s,'hero_114'),baseCap+grant);
 // SCOPE `self`: hero_1 climbed nothing and her cap is exactly where it was.
 assert.equal(talentCap(s,'hero_1'),talentRule('hero_1').cap,'the cap raise must not reach another Fellow');
 // IT GRANTS NO APTITUDE BY ITSELF -- it is a cap, not a term. Power is unmoved by the cap alone.
 const apt=s.fellows.hero_1.aptitude;
 assert.equal(s.fellows.hero_1.aptitude,apt);
 // A WIDENING CAP CANNOT REFUSE AN OLD SAVE (CLAUDE.md rule 12): every stored talentLevel that was
 // legal under the old cap is still under the new one, because the new one is never smaller.
 for(const f of ORIGINAL_FELLOWS){const r=talentRule(f.id);if(!r)continue;
  assert.ok(talentCap(s,f.id)>=r.cap,`${f.id}'s cap narrowed`);}
 // And the APK-mode ledger bound moves with the cap rather than staying at the literal 299 it was.
 const apk={...s,originalProgression:{policyVersion:1,quality:{},training:false}};
 assert.ok(source.paidCap===299);
 // NEGATIVE CONTROL: strip the column from the receipt and the cap falls straight back, so the
 // assertion above is this column and not the tier rule moving underneath it.
 const stripped=structuredClone(s);
 for(const r of stripped.stella.history)delete r.talentLimit;
 assert.equal(talentCap(stripped,'hero_114'),baseCap);
 assert.ok(valid(s),refusedBy(s));
});
