import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startingSave,act,valid} from '../lib/game.mjs';
import {rosterOperation} from '../lib/businesses.mjs';
import {bondedPower,fellowCap,fellowFactor,fellowPower,starredAptitude,GEAR,STAR_CAP,STAR_APTITUDE_PERCENT,CONSUMABLES} from '../lib/adventure.mjs';
import {STELLA_PROFILES,stellaState,stellaActivation} from '../lib/stella.mjs';
import {ARTIFACT_ECHOES} from '../lib/artifact-echo.mjs';
import {qualityRule,sourceCoefficient} from '../lib/original-progression.mjs';
import operations from '../lib/operation-data.json' with {type:'json'};

// The Fellow power spine, pinned AS IT IS TODAY. This is a characterisation test, not an aspiration:
// every number below was measured by running this code, and a change that moves any of them should
// have to say so out loud rather than drift silently.
//
// Why this file exists. Village income in the original is driven by total Fellow power
// (docs/slice-buildings.md 1: income = (staff x yieldRate + totalFellowPower x 10/10000) x ...), and
// Everkai reproduces the same divisor in `rosterOperation` (= power/1000, lib/businesses.mjs:49).
// So `rosterOperation` is the one number the whole late-game economy hangs off, and it is worth
// pinning at both ends: what a single Fellow contributes, and what the whole roster can ever reach.
//
// The measured reference point on the original's live save is 3,497,276,469 total power
// => 3,497,276 conversion. The fixture below reaches 881,466 with every record maxed and every
// familiar bound; its APK-growth mode passes the original outright.
//
// 881,466 IS NOT A CEILING, and an earlier version of this comment said its predecessor was. That
// fixture never touches three shipped, reachable systems: stella, blessings and artifact echoes.
// Driving those through their own actions reaches 2,938,908 in a save that still passes valid() --
// MEASURED 2026-09-13, stage by stage: 881,466 fixture -> 1,939,371 (+stella, 4 profiles) ->
// 2,866,304 (+blessings, 208 trainBlessingsMax calls over 105 welcomed families) -> 2,938,908
// (+27 echoes). So the real default-mode shortfall against the original is 1.19x.
//
// EVERY NUMBER IN THIS FILE MOVED ON 2026-09-13, and not because the power maths changed. Raising
// the default cap from the old 20+breaks*10 ladder (max 60 at 4 breaks) to the original's quality
// ladder (max 750 at 13 breaks) is what moved them: `maxedRecords` now builds level 750 / breaks 13
// records because those are the highest values valid() accepts. The previous figures -- 138,699
// fixture, 827,408 ceiling, 4.23x shortfall -- were all measured against a level-60 ceiling and are
// dead. Numbers here are pinned because they must not drift, but read them as this fixture's reach,
// not as what the game can reach. Whether 1.19x is where default mode SHOULD land is a balance
// question tied to the faucet work, not something this characterisation test decides.

const NOW=1767225600000;                 // fixed day, so habit-derived state is stable across runs
const ID='hero_15';                      // the starting Fellow, present on every fresh save
const BEST=GEAR.slice().sort((a,b)=>b.aptitude-a.aptitude)[0];   // Dragon Tamer's Scepter, +70

/** Apply an action, ignoring a refusal. Several of these are sandbox faucets whose guards differ by
 *  save shape; the ceiling fixtures below care that the state moved, not that every grant succeeded. */
const maybe=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);return r.error?s:r.state};
/** A fresh save with the whole roster recruited and nothing else touched. */
const roster=()=>maybe(startingSave(NOW),'recruitAll');
/** Overwrite one Fellow's record on a save. */
const withFellow=(s,props,id=ID)=>({...s,fellows:{...s.fellows,[id]:{...s.fellows[id],...props}}});
/** Every Fellow record pushed to the highest values `valid()` accepts in default mode. Level tracks
 *  the quality ladder: 13 breaks is the validated maximum and puts fellowCap at 750, so 750/13 is
 *  the true ceiling. It was 60/4 under the old 20+breaks*10 ladder. */
const maxedRecords=s=>({...s,fellows:Object.fromEntries(Object.keys(s.fellows).map(id=>
 [id,{level:750,aptitude:1000,skill:20,breaks:13,gear:BEST.id,stars:STAR_CAP,gearLevel:20}]))});

// ---------------------------------------------------------------------------------------------
// Extractor guard FIRST. The contributor test below reads lib/adventure.mjs as text, so a drifted
// pattern would let it pass while asserting nothing at all.
// ---------------------------------------------------------------------------------------------

const ADVENTURE=readFileSync(new URL('../lib/adventure.mjs',import.meta.url),'utf8');
/** The single line that defines bondedPower. It is one long expression on purpose (lib/adventure.mjs:66),
 *  which is exactly why the contributor stack is worth extracting rather than eyeballing. */
const bondedPowerSource=()=>ADVENTURE.split('\n').find(l=>l.startsWith('export const bondedPower='));
/** Every function called inside that expression. `floor` and `find` are Math.floor and Array.prototype
 *  .find -- language, not game rules -- so they are dropped rather than pinned. */
const contributors=()=>[...new Set([...bondedPowerSource().matchAll(/([A-Za-z][A-Za-z0-9_]*)\(/g)]
 .map(m=>m[1]).filter(n=>!['floor','find'].includes(n)))];

test('the bondedPower extractor still works (guards this whole file against a silent regex break)',()=>{
 const line=bondedPowerSource();
 assert.ok(line,'no `export const bondedPower=` line in lib/adventure.mjs; the pattern has drifted');
 // It is a 761-character single expression today. A short line means it was reformatted or split,
 // and the symbol sweep below would then silently cover only part of the stack.
 assert.ok(line.length>500,`bondedPower line is only ${line.length} chars; it has been reformatted`);
 const found=contributors();
 assert.ok(found.length>10,`extracted only ${found.length} contributors; the pattern has drifted`);
 // One known symbol per source shape, so losing any single one fails here rather than vacuously.
 for(const [known,why] of [['blessingPower','an imported bonus function'],
                           ['starredAptitude','a same-module helper'],
                           ['applyStella','the outermost wrapper'],
                           ['elixirPower','the flat term added last']])
  assert.ok(found.includes(known),`extractor missed ${known} (${why}); the pattern has broken`);
});

test('bondedPower sums exactly these fifteen contributors, and no others',()=>{
 // The full spine. Adding a sixteenth is a real parity change and must edit this list deliberately.
 assert.deepEqual(contributors().sort(),[
  'applyStella',          // stella.mjs      -- own flat + typed % , applied outermost
  'artifactBonus',        // artifacts.mjs   -- (perLevel x gearLevel-1) aptitude
  'artifactEchoBonus',    // artifact-echo   -- named/family equipment echo: aptitude + %
  'bondFactor',           // bonds.mjs       -- family bond, +2% per level, inside the % stack
  'blessingPower',        // blessings.mjs   -- family Fellow/Advanced blessing: flat + %
  'elixirPower',          // elixirs.mjs     -- flat, added after every multiplier
  'familiarBonus',        // familiar-nodes  -- flat + aptitude + % + finalPercent
  'fellowPower',          // local           -- the default-mode base: (80+20*level) x fellowFactor
  'fishingBonuses',       // fishing.mjs     -- flat + aptitude + %, typed and rarity-gated
  'museumBonus',          // museum.mjs      -- aptitude + basicPowerPercent + powerPercent
  'originalProgression',  // the mode switch between the two base branches
  'sourceAptitudeBonus',  // APK branch      -- hero base talent + quality talent
  'sourceCoefficient',    // APK branch      -- HeroLevel.coefficientADH, the original's own curve
  'specialAptitude',      // special-blessings -- family special blessing aptitude
  'starredAptitude',      // local           -- aptitude x (1 + stars x 5%)
 ].sort());
});

// ---------------------------------------------------------------------------------------------
// Cap arithmetic. Two independent ladders, and which one applies is a per-save opt-in.
// ---------------------------------------------------------------------------------------------

test('default mode reads the original quality ladder: caps 100-750 as breaks run 0-13',()=>{
 // lib/adventure.mjs:39. `breaks` is validated to a maximum of 13 (lib/adventure.mjs:84), and the
 // limitBreak action refuses at 13 (lib/adventure.mjs:91), so 750 is the real default ceiling.
 assert.deepEqual([0,1,2,3,4].map(breaks=>fellowCap({breaks})),[100,150,200,250,300]);
 assert.deepEqual([7,13].map(breaks=>fellowCap({breaks})),[450,750],'breaks now run 0-13 across the original 14 quality tiers');
});

test('APK growth replaces that ladder with the original quality table: 14 steps, 100 to 750',()=>{
 // Imported from the original HeroQuality.json -- levelLimit 100..750 and Talent 0..65 in steps of 5.
 assert.deepEqual([1,2,7,13,14].map(q=>qualityRule(q).cap),[100,150,400,700,750]);
 assert.deepEqual([1,2,7,13,14].map(q=>qualityRule(q).talent),[0,5,30,60,65]);
 assert.equal(qualityRule(15),null,'quality stops at 14');
 // And the level curve is the original's own coefficientADH, not a local reconstruction.
 assert.deepEqual([1,100,300,500,750].map(sourceCoefficient),[300,925,3362,7590,15500]);
});

// ---------------------------------------------------------------------------------------------
// What each contributor is actually worth, measured one at a time from the same baseline.
// ---------------------------------------------------------------------------------------------

test('a fresh Fellow is worth exactly 100 Power, and fellowFactor is a true no-op at zero stars',()=>{
 const s=startingSave(NOW),f=s.fellows[ID];
 assert.deepEqual(f,{level:1,aptitude:10,skill:0,breaks:0,gear:null});
 assert.equal(fellowFactor(f),1);              // aptitude 10 / 10, no stars, no skill, no gear
 assert.equal(fellowPower(f),100);             // (80 + 20*1) * 1
 assert.equal(bondedPower(s,ID),100);          // no external system contributes on a fresh save
 assert.equal(starredAptitude(f),f.aptitude);  // exact, not a rounding -- see docs/star-track.md
});

test('every growth track on the record moves Power, and aptitude dominates all of them',()=>{
 const s=startingSave(NOW);
 const at=props=>bondedPower(withFellow(s,props),ID);
 assert.equal(at({level:60,breaks:4}),1280);   // 60 levels: x12.8
 assert.equal(at({aptitude:1000}),10000);      // aptitude 10 -> 1000: x100, the single biggest lever
 assert.equal(at({skill:20}),200);             // 20 skill levels at +5% each: x2
 assert.equal(at({stars:STAR_CAP}),135);       // 7 stars at +5% aptitude each: x1.35
 assert.equal(at({gear:BEST.id}),800);         // +70 aptitude onto a base of 10
 assert.equal(at({gear:BEST.id,gearLevel:20}),2130);           // plus 19 artifact upgrade levels
 assert.equal(STAR_APTITUDE_PERCENT*STAR_CAP,35);              // the whole star track is +35% aptitude
 // Aptitude is hard-capped at 1000 (lib/adventure.mjs:73). The original's live save carries a Fellow
 // at aptitude 11,849, so this cap -- not the level cap -- is the binding constraint on parity.
 assert.equal(bondedPower(withFellow(s,{aptitude:1000}),ID),10000);
});

test('museum is the one external contributor reachable with no other system built',()=>{
 let s=startingSave(NOW);
 assert.equal(bondedPower(s,ID),100);
 s=maybe(maybe(s,'claimMuseum'),'acceptMuseum');
 // 31 keepsakes total +2 aptitude, +6 basicPowerPercent, +4 powerPercent (lib/museum-data.json).
 assert.equal(bondedPower(s,ID),132);
});

// ---------------------------------------------------------------------------------------------
// The ceiling. This is the number the economy hangs off, so it is pinned at each stage of assembly.
// ---------------------------------------------------------------------------------------------

test('default mode: records + museum + familiars reach 881,466 -- NOT the ceiling, see the header',()=>{
 let s=roster();
 assert.equal(Object.keys(s.fellows).length,154);
 // An untrained full roster is worth almost nothing: 154 x 100 / 1000.
 assert.equal(Math.round(rosterOperation(s)*100)/100,15.4);

 // Level alone -- the shape the roadmap brief measured at "~197/s" -- leaves aptitude at its floor.
 const levelled={...s,fellows:Object.fromEntries(Object.keys(s.fellows).map(id=>
  [id,{level:60,aptitude:10,skill:0,breaks:4,gear:null}]))};
 assert.ok(valid(levelled));
 assert.equal(Math.round(rosterOperation(levelled)*100)/100,197.12);

 // Every record maxed instead: levels, aptitude, skill, best gear, artifact level 20, seven stars.
 s=maxedRecords(s);
 assert.equal(Math.round(rosterOperation(s)),721313);
 s=maybe(maybe(s,'claimMuseum'),'acceptMuseum');
 assert.equal(Math.round(rosterOperation(s)),796557);

 // Familiars are the largest single external contributor: inherent flat Power up to 3,000,000 plus
 // 199 activatable nodes each. Binding is strictly 1:1, so only 71 of 154 Fellows can ever hold one.
 s=maybe(s,'adoptFamiliars');
 assert.equal(Object.keys(s.familiars||{}).length,71);
 let bound=0;
 for(const pet of Object.keys(s.familiars)){
  const fellow=Object.keys(s.fellows)[bound];if(!fellow)break;
  const next=maybe(s,'bindFamiliar',pet,fellow);
  if(next!==s){s=maybe(next,'activateFamiliarNodes',pet);bound++}
 }
 assert.equal(bound,71,'familiar binding is 1:1; 71 familiars cover 71 of 154 Fellows');
 assert.equal(Math.round(rosterOperation(s)),881466);

 // The whole fixture is a legal save, so this is genuinely reached and not a minted state. It is NOT
 // the ceiling: stella, blessings and artifact echoes are all still at zero here, and driving them
 // reaches 2,938,908 (see the file header). Do not quote 881,466 as what default mode can reach.
 assert.ok(valid(s),'the maxed roster must remain a valid save');
 // Measured parity reference: the original's live save converts 3,497,276. This fixture reaches 25.2%
 // of it; the reachable 2,938,908 reaches 84.0%, i.e. a 1.19x shortfall.
 assert.ok(rosterOperation(s)<3_497_276,'this fixture is still below the original live-save total');
});

// ---------------------------------------------------------------------------------------------
// THE ACTUAL REACHABLE CEILING. The fixture above was quoted as Everkai's ceiling for weeks, and the
// roadmap carried a "25.2x power gap" built on it. It is not a ceiling: it never touches stella,
// blessings or artifact echoes, all three of which are shipped and reachable through their own
// actions. Driving them takes the SAME save to 2,938,908 -- a 3.33x correction, and the real
// shortfall against the original's 3,497,276 is 1.19x rather than 25.2x.
//
// This is pinned stage by stage on purpose. A single end number would say "something moved" when one
// system silently stops contributing; four checkpoints say WHICH one. Every stage asserts valid(),
// because a ceiling reachable only by minting an illegal save is not a ceiling.
// ---------------------------------------------------------------------------------------------

test('the real default-mode ceiling is 2,938,908: stella, blessings and echoes take it 3.33x past the fixture',()=>{
 // Stage 0 -- the fixture above, rebuilt here so this test stands alone if that one is edited.
 let s=maxedRecords(roster());
 s=maybe(maybe(s,'claimMuseum'),'acceptMuseum');
 s=maybe(s,'adoptFamiliars');
 let bound=0;
 for(const pet of Object.keys(s.familiars||{})){
  const fellow=Object.keys(s.fellows)[bound];if(!fellow)break;
  const next=maybe(s,'bindFamiliar',pet,fellow);
  if(next!==s){s=maybe(next,'activateFamiliarNodes',pet);bound++}
 }
 assert.equal(Math.round(rosterOperation(s)),881466,'stage 0 must match the fixture above');

 // Stage 1 -- STELLA. Four profiles ship with a private activation policy; each is activated once and
 // then upgraded to the top of its own ladder, paid from the free sandbox fragment faucet. Every call
 // is {seq}-guarded, so each one has to carry the wallet's current sequence number.
 const owners=STELLA_PROFILES.filter(p=>s.fellows[p.id]&&stellaActivation(p.id));
 assert.equal(owners.length,4,'the shipped stella profiles with an activation policy have changed');
 for(const p of owners){
  const activated=maybe(s,'stellaActivate',p.id,{seq:stellaState(s).seq});
  assert.notEqual(activated,s,`stella ${p.id} refused activation; the policy set has drifted`);
  s=activated;
  for(let i=0;i<200;i++){
   s=maybe(s,'stellaSupply',p.id,{seq:stellaState(s).seq});
   const before=s;
   s=maybe(s,'stellaUpgrade',p.id,{seq:stellaState(s).seq,count:'max'});
   if(s===before)break;
  }
 }
 assert.equal(Math.round(rosterOperation(s)),1939371,'stella is worth +1,057,905 over the fixture');
 assert.ok(valid(s),'the stella save must be legal');

 // Stage 2 -- BLESSINGS. welcomeAll is the family counterpart of recruitAll; without it a save holds
 // ONE family member and blessings look worthless. Points come from the family consumable, and they
 // must be SPREAD: `count:'all'` on the first member drains the whole bag into it and the other 104
 // train nothing, which is exactly how this measurement was first got wrong.
 s=maybe(s,'welcomeAll');
 assert.equal(Object.keys(s.family).length,105,'welcomeAll must seat the whole family catalogue');
 const points=CONSUMABLES.find(i=>i.stat==='points'&&i.target==='family');
 assert.ok(points,'no family Blessing-Point consumable ships; the faucet below would prove nothing');
 for(let i=0;i<300;i++){const before=s;s=maybe(s,'claimConsumable',points.id);if(s===before)break}
 let funded=0;
 for(const id of Object.keys(s.family)){
  const before=s;
  s=maybe(s,'useConsumable',points.id,{recipient:id,count:10});
  if(s!==before)funded++;
 }
 assert.equal(funded,105,'every family member must be funded, or the blessing total is understated');
 let trained=0;
 for(const id of Object.keys(s.family))for(const key of ['flatBlessing','advancedBlessing']){
  const before=s;s=maybe(s,'trainBlessingsMax',id,key);if(s!==before)trained++;
 }
 // 208 of 210: two (family, key) pairs refuse with 'No supported ungated Fellows are available'.
 assert.equal(trained,208,'the trainable (family, blessing) pair count has moved');
 assert.equal(Math.round(rosterOperation(s)),2866304,'blessings are worth +926,933 over stella');
 assert.ok(valid(s),'the blessing save must be legal');

 // Stage 3 -- ARTIFACT ECHOES. An Echo only enables when its OWN named artifact is equipped on its
 // OWN named Fellow, which is why a fixture that gives all 154 the single best-aptitude item enables
 // exactly zero of them. Equipping the echo item costs those Fellows some base aptitude and the net
 // is still positive.
 const named=ARTIFACT_ECHOES.filter(r=>r.fellow&&s.fellows[r.fellow]&&GEAR.some(g=>g.id===r.item));
 assert.equal(named.length,27,'the enable-able Echo set has changed');
 let enabled=0;
 for(const r of named){
  s={...s,fellows:{...s.fellows,[r.fellow]:{...s.fellows[r.fellow],gear:r.item,gearLevel:1}}};
  const before=s;s=maybe(s,'enableArtifactEcho',r.fellow);if(s!==before)enabled++;
 }
 assert.equal(enabled,27,'every named Echo must enable once its own artifact is equipped');
 assert.equal(Math.round(rosterOperation(s)),2938908);
 assert.ok(valid(s),'THE WHOLE 2,938,908 SAVE MUST BE LEGAL -- otherwise it is not a reachable ceiling');

 // The parity statement this file exists to make, in one assertion.
 assert.equal(Math.round(3_497_276/rosterOperation(s)*100)/100,1.19,
  'the default-mode shortfall against the original live save is 1.19x, NOT the 25.2x that quoting '
  +'the 881,466 fixture as a ceiling implies');
});

test('APK growth mode passes the original outright: one Fellow alone is worth 44.6M Power',()=>{
 // Level 750 at quality 14 with aptitude 1000 and seven stars, on the original's own coefficient
 // curve: floor(15500 x (1000 x 1.35 + (35-10) + 65) x (1 + 20 x 0.05)).
 let s=maybe(roster(),'activateOriginalProgression');
 assert.ok(s.originalProgression,'APK growth must activate on a fresh full roster');
 const fellows=Object.fromEntries(Object.keys(s.fellows).map(id=>
  [id,{level:750,aptitude:1000,skill:20,breaks:0,gear:null,stars:STAR_CAP}]));
 const quality=Object.fromEntries(Object.keys(s.fellows).map(id=>[id,14]));
 s={...s,fellows,originalProgression:{...s.originalProgression,quality}};
 assert.equal(bondedPower(s,ID),44_640_000);
 assert.equal(Math.round(rosterOperation(s)),7_082_725);
 // 2.0x the original's measured live-save conversion of 3,497,276 -- so the parity shortfall is a
 // property of DEFAULT mode's caps, not of the power formula, which is the original's own.
 assert.ok(rosterOperation(s)>3_497_276);
 // Deliberately NOT asserting valid(): quality here is set directly rather than through the
 // breakthrough receipts validOriginalProgression requires. This pins the arithmetic, not a save.
 assert.equal(valid(s),false);
});

// ---------------------------------------------------------------------------------------------
// Appoint skills. These do not feed bondedPower at all -- they multiply business income -- but they
// are gated on Fellow LEVEL, so the default cap of 60 decides how much of the import is live.
// ---------------------------------------------------------------------------------------------

test('all 494 imported appoint effects are reachable: the level-200 tier unlocks at 2 limit breaks',()=>{
 const effects=operations.records.flatMap(r=>r.effects);
 assert.equal(operations.records.length,175);
 assert.equal(effects.length,494);
 // Three unlock tiers, straight from the original's AppointSkill_HeroLevel counts.
 const byLevel={};for(const e of effects)byLevel[e.minLevel]=(byLevel[e.minLevel]||0)+1;
 assert.deepEqual(byLevel,{1:144,50:175,200:175});
 // A fresh Fellow -- breaks 0, cap 100 -- already clears the level-1 and level-50 tiers.
 assert.equal(effects.filter(e=>e.minLevel<=fellowCap({breaks:0})).length,319);
 // Two limit breaks put the cap at exactly the last tier's gate, so nothing stays stranded. The old
 // 20+breaks*10 ladder topped out at 60 and left all 175 level-200 effects permanently dead.
 assert.equal(fellowCap({breaks:2}),200);
 assert.equal(effects.filter(e=>e.minLevel<=fellowCap({breaks:2})).length,494);
 assert.equal(effects.filter(e=>e.minLevel>fellowCap({breaks:13})).length,0);
 // And skill-level growth is not modelled at all: percent is pinned at skillProp_Initial/100, so
 // the original's +500 per level (SkillBase.json, 44 of 76 appoint rows, maxUpgradeLevel 300) is absent.
 assert.match(operations.limits,/Skill levels above 1 are not modelled/);
});
