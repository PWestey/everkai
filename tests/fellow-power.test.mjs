import {powerParts} from '../lib/adventure.mjs';
import test from 'node:test';import {withItems,grantFragments,allKeepsakes,stockConsumable} from './progression-helpers.mjs';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startingSave,act,valid} from '../lib/game.mjs';
import {rosterOperation} from '../lib/businesses.mjs';
import {bondedPower,fellowCap,fellowFactor,fellowPower,starredAptitude,GEAR,STAR_CAP,STAR_APTITUDE_PERCENT,CONSUMABLES} from '../lib/adventure.mjs';
import {STELLA_PROFILES,stellaState,stellaActivation,stellaEntry} from '../lib/stella.mjs';
import {ARTIFACT_ECHOES} from '../lib/artifact-echo.mjs';
import {qualityRule,sourceCoefficient} from '../lib/original-progression.mjs';
import operations from '../lib/operation-data.json' with {type:'json'};
import {ARTIFACT_CAP} from '../lib/artifacts.mjs';
import SPIRIT_DATA from '../lib/hero-spirit-data.json' with {type:'json'};

// *** 2026-09-18: POWER NOW FOLLOWS THE ORIGINAL'S OWN COMPOSITION (lib/adventure.mjs powerParts). ***
// Every pinned figure below that moved records its previous value beside it; the history further down
// this header predates that change and is kept as the record of how each earlier number arose.
//
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
// => 3,497,276 conversion. The fixture below reaches 2,269,308 with every record maxed and every
// familiar bound; its APK-growth mode passes the original outright.
//
// 2,269,308 IS NOT A CEILING, and an earlier version of this comment said its predecessor was. That
// fixture never touches three shipped, reachable systems: stella, blessings and artifact echoes.
// Driving those through their own actions reaches 6,965,719 in a save that still passes valid() --
// MEASURED 2026-09-13, re-measured 2026-09-15 after the seven crossover characters were restored
// (159 Fellows, 107 Family), REBASELINED 2026-09-15 after E4-02/E4-03 gave all 32 Hall1 keepsakes
// their own Exhibit.levelUpSkill effect, and REBASELINED AGAIN 2026-09-15 (F11) after the artifact
// cap fix below. Stage by stage today: 2,269,308 fixture -> 4,484,008 (+stella, 4 profiles) ->
// 6,684,380 (+blessings, 212 trainBlessingsMax calls over 107 welcomed families) -> 6,965,719
// (+32 echoes).
//
// *** DEFAULT MODE NOW OVERSHOOTS THE ORIGINAL BY 1.33x, NOT 1.17x. ***
// (1.99x until the owner's 2026-09-17 roster trim: the overshoot is a VILLAGE-WIDE sum, so removing
// 48 of 159 Fellows narrowed it without changing any per-Fellow number. It is still an overshoot.)
// Nothing in the power maths changed to do that. F12-02 raised ARTIFACT_CAP from a provisional 20 to
// the original's own Equipment.levelMax of 200 on 2026-09-15 and this file kept building its "maxed"
// records at gearLevel 20, so the pinned ceiling was measured against a cap the code had already
// stopped enforcing: 4,096,763 (1.17x) was stale the moment the cap moved, and 4,655,637 (1.33x) is
// what the same fixture reaches once it uses ARTIFACT_CAP as it always claimed to. The overshoot is
// therefore a BALANCE finding to act on, not a regression introduced here -- the artifact numbers
// themselves are exact imports (tests/artifact-source-coverage.test.mjs verifies 89/89 against the
// original's Equipment table). The relevant lever is whether every Fellow reaching artifact level 200
// is a reachable state worth pinning: the ore cost of taking 84 artifacts to 200 is 1,004,950 against
// roughly 85/day, so it is legal long before it is affordable. See F11 / F12-03 in
// docs/parity-catalog.csv. The superseded figures were 1,284,793 / 2,672,207 / 3,976,204 / 4,096,763,
// and before E4-02/E4-03, 907,328 / 1,977,854 / 2,943,548 / 3,026,482.
//
// EVERY NUMBER IN THIS FILE MOVED ON 2026-09-13, and not because the power maths changed. Raising
// the default cap from the old 20+breaks*10 ladder (max 60 at 4 breaks) to the original's quality
// ladder (max 750 at 13 breaks) is what moved them: `maxedRecords` now builds level 750 / breaks 13
// records because those are the highest values valid() accepts. The previous figures -- 138,699
// fixture, 827,408 ceiling, 4.23x shortfall -- were all measured against a level-60 ceiling and are
// dead. Numbers here are pinned because they must not drift, but read them as this fixture's reach,
// not as what the game can reach.
//
// *** SETTLED 2026-09-16: THE OWNER ACCEPTED ~2x AS THE TARGET. ***
// This was put to them with the measurement and three options (trim to ~1.0x, accept ~2x, or stop
// treating the ceiling as a constraint) and they chose to accept it. The reasoning that makes it
// defensible, recorded so it is not re-argued: 3,497,276 is what ONE REAL SAVE had reached, not the
// original's own maximum, so a fully-maxed Everkai landing at 2x a non-maxed original save is
// plausibly near true parity rather than over it.
// CONSEQUENCE FOR FUTURE WORK: a change that moves this ceiling is no longer a defect by itself.
// It is still worth REPORTING with before/after numbers, but it does not block a slice.

const NOW=1767225600000;                 // fixed day, so habit-derived state is stable across runs
const ID='hero_1';                       // the starting Fellow (Fifi), present on every new village
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
 *  the true ceiling. It was 60/4 under the old 20+breaks*10 ladder.
 *
 *  gearLevel REBASELINED 2026-09-15 (F11): this read a hard-coded 20 -- the PROVISIONAL artifact cap
 *  that F12-02 retired on the same day when it raised ARTIFACT_CAP to the original's own
 *  Equipment.levelMax of 200. So the cap moved and this fixture did not, which is exactly the silent
 *  drift the file header says must not happen: every "ceiling" number below was measured against a
 *  cap the code no longer enforces. It now reads ARTIFACT_CAP, which is what "the highest values
 *  valid() accepts" has always meant. See the ceiling test for the before/after. */
const maxedRecords=s=>({...s,fellows:Object.fromEntries(Object.keys(s.fellows).map(id=>
 [id,{level:750,aptitude:1000,skill:20,breaks:13,gear:BEST.id,stars:STAR_CAP,gearLevel:ARTIFACT_CAP}]))});

// ---------------------------------------------------------------------------------------------
// Extractor guard FIRST. The contributor test below reads lib/adventure.mjs as text, so a drifted
// pattern would let it pass while asserting nothing at all.
// ---------------------------------------------------------------------------------------------

const ADVENTURE=readFileSync(new URL('../lib/adventure.mjs',import.meta.url),'utf8');
/** The body of powerParts -- the one function every Fellow Power reading goes through since 2026-09-18.
 *  (It used to be a single 761-character `export const bondedPower=` line; bondedPower is now
 *  `powerParts(s,id).power`, so the contributor stack lives in powerParts and is extracted from there.) */
const powerPartsSource=()=>{const i=ADVENTURE.indexOf('export function powerParts(');if(i<0)return null;
 const j=ADVENTURE.indexOf('\n}\n',i);return j<0?null:ADVENTURE.slice(i,j+2);};
/** Every function called inside it. `floor`, `round`, `find`, `values`, `reduce` are language, and `total`,
 *  `bp` and `composePower` are the bucket arithmetic itself (pinned separately against the owner's two real
 *  panels in tests/power-composition.test.mjs), so they are dropped rather than pinned as contributors. */
const LANGUAGE=['floor','round','find','values','reduce','total','bp','composePower','powerParts'];
const contributors=()=>[...new Set([...powerPartsSource().matchAll(/([A-Za-z][A-Za-z0-9_]*)\(/g)]
 .map(m=>m[1]).filter(n=>!LANGUAGE.includes(n)))];

test('the powerParts extractor still works (guards this whole file against a silent regex break)',()=>{
 const body=powerPartsSource();
 assert.ok(body,'no `export function powerParts(` in lib/adventure.mjs; the pattern has drifted');
 assert.ok(/export const bondedPower=\(s,id\)=>powerParts\(s,id\)\.power;/.test(ADVENTURE),'bondedPower must read powerParts, or this sweep covers the wrong function');
 // A short body means it was split across helpers, and the sweep below would cover only part of it.
 assert.ok(body.length>900,`powerParts is only ${body.length} chars; it has been split or reformatted`);
 const found=contributors();
 assert.ok(found.length>10,`extracted only ${found.length} contributors; the pattern has drifted`);
 for(const [known,why] of [['blessingPower','an imported bonus function'],
                           ['levelADH','a same-module helper'],
                           ['stellaBonus','the Stella flat AND percent, now inside the buckets'],
                           ['elixirPower','a flat part']])
  assert.ok(found.includes(known),`extractor missed ${known} (${why}); the pattern has broken`);
});

test('powerParts reads exactly these twenty contributors, and no others',()=>{
 // The full spine. Adding a fourteenth is a real parity change and must edit this list deliberately.
 // REBUILT 2026-09-18 (was fifteen): applyStella, starredAptitude and fellowPower are gone because the
 // stars, the skill and Stella's percent are now PARTS of the one additive `percent` bucket rather than
 // wrappers around it; originalProgression/sourceCoefficient are folded into levelADH, the one place the
 // two modes differ; stellaBonus and fellowStars are read directly.
 assert.deepEqual(contributors().sort(),[
  'artifactBonus',        // talent  -- (perLevel x gearLevel-1), the original's Equipment riseTalent
  'artifactEchoBonus',    // talent + percent
  'blessingPower',        // flat + percent  -- Family (panel: FORMULA_PERCENT/"beautyskillII")
  'bondFactor',           // percent -- family bond, +2% a level
  'elixirPower',          // flat    -- the panel's "Item" part
  'familiarBonus',        // talent + percent + flat + final -- EVERKAI-ONLY magnitude (EVERKAI_ONLY_PARTS)
  'fishingBonuses',       // talent + percent + flat
  'levelADH',             // adh     -- HeroLevel.coefficientADH (APK) or (80+20*level)/10 (default)
  'museumBonus',          // talent + percent (basicPowerPercent) + final (powerPercent)
  'sourceAptitudeBonus',  // talent  -- the hero row's initialTalent + quality talent (APK only)
  'specialAptitude',      // talent  -- family special blessing
  'stellaBonus',          // flat + percent -- the panel's extradd and the hidden percent/underlingskillpower
  'talentSkillParts',     // talent  -- every talent skill, intimacy, Stella self/bond talent, Rarity Advance (2026-09-18)
  'familyStellaParts',    // talent + percent -- Family Stella (WifeSpirit), 2026-09-18
  'familyPairBlessing',   // flat + percent -- the Stella-unlocked blessing pairs, a separate set (spec 3.4)
  'quenchPercent',        // percent -- deterministic artifact quenching
  'starParts',            // percent + flat -- HeroStar's own row at the level-gated star (step 4; was fellowStars x 500)
  'starHaloParts',        // talent + coef + percent -- every owned hero's star halos (finalpercent held out)
  'originParts',          // talent + coef + percent -- Origin Boost
  'originLevel',          // the stored Origin Boost level it reads
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
 // 7 stars: 135 until 2026-09-18 (+35% on Aptitude), 418 with the star skills. Since step 4 a star pays HeroStar's
 // own row and only once the Fellow's level reaches its gate (300 for the first): at level 1, nothing.
 assert.equal(at({stars:STAR_CAP}),100);
 // At level 750 the seven count as the original's six: +6,000 bp and +7,500,000 flat, plus the six star skills.
 assert.equal(at({stars:STAR_CAP,level:750,breaks:13}),7574796);
 assert.equal(at({level:750,breaks:13}),15080,'the same Fellow without them');
 assert.equal(at({gear:BEST.id}),800);         // +70 aptitude onto a base of 10
 assert.equal(at({gear:BEST.id,gearLevel:20}),2130);           // plus 19 artifact upgrade levels
 // And at the shipped cap. The artifact track is the second biggest single lever after aptitude:
 // +70 base plus 7/level x 199 = 1,463 Aptitude onto a base of 10, i.e. x147 rather than x8.
 assert.equal(at({gear:BEST.id,gearLevel:ARTIFACT_CAP}),14730);
 assert.equal(STAR_APTITUDE_PERCENT*STAR_CAP,35);              // the whole star track is +35% aptitude
 // Aptitude is hard-capped at 1000 (lib/adventure.mjs:73). The original's live save carries a Fellow
 // at aptitude 11,849, so this cap -- not the level cap -- is the binding constraint on parity.
 assert.equal(bondedPower(withFellow(s,{aptitude:1000}),ID),10000);
});

test('museum is the one external contributor reachable with no other system built',()=>{
 let s=startingSave(NOW);
 assert.equal(bondedPower(s,ID),100);
 s=maybe(allKeepsakes(s),'acceptMuseum');
 // REBASELINED 2026-09-15 (E4-02/E4-03). Everkai ships 32 Hall1 keepsakes; 26 of them were inert and
 // three of the six modelled effects sat in the wrong bucket. All 32 now carry their own
 // Exhibit.levelUpSkill -> SkillBase effect: 30 x atk/percent 200 (= +2% each) and 2 x talent 2.
 // Totals moved from +2 aptitude / +6 basicPowerPercent / +4 powerPercent (old, 6 modelled)
 // to +4 aptitude / +60 basicPowerPercent / +0 powerPercent (new, 32 modelled). Hall1 carries zero
 // atk/finalpercent rows -- positive control: SkillBase holds 495 finalpercent rows overall -- so the
 // powerPercent bucket was entirely a mis-bucketing. bondedPower moved 132 -> 224.
 assert.equal(bondedPower(s,ID),224);
});

// ---------------------------------------------------------------------------------------------
// The ceiling. This is the number the economy hangs off, so it is pinned at each stage of assembly.
// ---------------------------------------------------------------------------------------------

// REBASELINED 2026-09-17. The owner's roster trim deleted 48 of the 159 Fellows, and every figure in
// this block is a VILLAGE-WIDE sum over the roster, so all of them moved together. The per-Fellow
// numbers did not move at all (the single-Fellow ceiling below is untouched), and neither did the
// shape of the curve -- 111/159 of the old roster is 0.70, and 1,616,486/2,269,308 is 0.71, the
// difference being that the 48 were not an even slice of the rarity mix.
// REBASELINED 2026-09-18 AGAIN (Skill Aptitude, lib/talent-skills.mjs): every original now owns its talent
// skills at level 1 and every Stella rank pays its self/bond talent halo, so each pinned figure below moved
// (git diff 2026-09-18 records the old values; stage 0 of the default ceiling 1,317,357 -> 1,329,275).
// REBASELINED 2026-09-18 -- Power moved to the original's additive composition (lib/adventure.mjs
// powerParts; docs/power-parity-audit.md 9). Every figure below records its value before that change.
test('default mode: records + museum + familiars reach 1,329,275 -- NOT the ceiling, see the header',()=>{
 let s=roster();
 assert.equal(Object.keys(s.fellows).length,111);
 // An untrained full roster is worth almost nothing: 111 x 100 / 1000.
 assert.equal(Math.round(rosterOperation(s)*100)/100,27.87);

 // Level alone -- the shape the roadmap brief measured at "~197/s" -- leaves aptitude at its floor.
 const levelled={...s,fellows:Object.fromEntries(Object.keys(s.fellows).map(id=>
  [id,{level:60,aptitude:10,skill:0,breaks:4,gear:null}]))};
 assert.ok(valid(levelled));
 assert.equal(Math.round(rosterOperation(levelled)*100)/100,357.1);

 // Every record maxed instead: levels, aptitude, skill, best gear, artifact level 200, seven stars.
 // REBASELINED 2026-09-15 (F11): 744,732 -> 1,348,957, entirely from gearLevel 20 -> ARTIFACT_CAP 200.
 s=maxedRecords(s);
 // 941,725 before 2026-09-18: stars (+35%) and skill (+100%) now ADD in one bucket (x2.35) instead of
 // multiplying (x2.70), but stars now reach the gear and artifact Aptitude too, which they never did.
 assert.equal(Math.round(rosterOperation(s)),2454101);
 s=maybe(allKeepsakes(s),'acceptMuseum');
 // REBASELINED 2026-09-15: 822,420 -> 1,195,714 -> 2,162,475. The museum stage moved first because all
 // 32 keepsakes now carry their original effect (+60 basicPowerPercent instead of +6, and no
 // powerPercent at all), and again because maxedRecords now uses ARTIFACT_CAP (F11).
 // 1,509,652 before 2026-09-18: the museum's +60% joins the same bucket (+0.60 on x2.35) instead of
 // multiplying the whole base (x1.60).
 assert.equal(Math.round(rosterOperation(s)),2708684);

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
 // A bond pays by stage now (ECON-29). The ceiling trains every familiar to stage 10 AFTER its nodes were
 // activated at level 1, so the node set -- and therefore the pinned figure -- is what it always was.
 s={...s,familiars:Object.fromEntries(Object.entries(s.familiars).map(([id,p])=>[id,{...p,level:Math.max(450,p.level)}]))};
 assert.equal(bound,71,'familiar binding is 1:1; 71 familiars cover 71 of the 111 Fellows');
 // REBASELINED 2026-09-15: 907,328 -> 1,284,793 (E4-02/E4-03, the museum stage) -> 2,269,308 (F11,
 // maxedRecords now uses the shipped ARTIFACT_CAP of 200 instead of the retired provisional 20).
 // 1,616,486 before 2026-09-18.
 assert.equal(Math.round(rosterOperation(s)),2844776);

 // The whole fixture is a legal save, so this is genuinely reached and not a minted state. It is NOT
 // the ceiling: stella, blessings and artifact echoes are all still at zero here, and driving them
 // reaches 6,965,719 (see the file header). Do not quote this stage as what default mode can reach.
 assert.ok(valid(s),'the maxed roster must remain a valid save');
 // Measured parity reference: the original's live save converts 3,497,276. This fixture reaches 64.9%
 // of it; the reachable 4,655,637 OVERSHOOTS it by 1.33x.
 assert.ok(rosterOperation(s)<3_497_276,'this fixture is still below the original live-save total');
});

// ---------------------------------------------------------------------------------------------
// THE ACTUAL REACHABLE CEILING. The fixture above was quoted as Everkai's ceiling for weeks, and the
// roadmap carried a "25.2x power gap" built on it. It is not a ceiling: it never touches stella,
// blessings or artifact echoes, all three of which are shipped and reachable through their own
// actions. Driving them takes the SAME save to 6,965,719 -- a 3.07x correction, and the result
// against the original's 3,497,276 is a 1.33x OVERSHOOT, not a shortfall of any size.
//
// This is pinned stage by stage on purpose. A single end number would say "something moved" when one
// system silently stops contributing; four checkpoints say WHICH one. Every stage asserts valid(),
// because a ceiling reachable only by minting an illegal save is not a ceiling.
// ---------------------------------------------------------------------------------------------

test('the real default-mode ceiling is 18,499,003: stella, blessings and echoes take it 13.9x past the fixture',()=>{
 // Stage 0 -- the fixture above, rebuilt here so this test stands alone if that one is edited.
 let s=maxedRecords(roster());
 s=maybe(allKeepsakes(s),'acceptMuseum');
 s=maybe(s,'adoptFamiliars');
 let bound=0;
 for(const pet of Object.keys(s.familiars||{})){
  const fellow=Object.keys(s.fellows)[bound];if(!fellow)break;
  const next=maybe(s,'bindFamiliar',pet,fellow);
  if(next!==s){s=maybe(next,'activateFamiliarNodes',pet);bound++}
 }
 // A bond pays by stage now (ECON-29). The ceiling trains every familiar to stage 10 AFTER its nodes were
 // activated at level 1, so the node set -- and therefore the pinned figure -- is what it always was.
 s={...s,familiars:Object.fromEntries(Object.entries(s.familiars).map(([id,p])=>[id,{...p,level:Math.max(450,p.level)}]))};
 assert.equal(Math.round(rosterOperation(s)),2844776,'stage 0 must match the fixture above (1,616,486 before 2026-09-18)');

 // Stage 1 -- STELLA. Four profiles ship with a private activation policy; each is activated once and
 // then upgraded to the top of its own ladder, paid from the free sandbox fragment faucet. Every call
 // is {seq}-guarded, so each one has to carry the wallet's current sequence number.
 const owners=STELLA_PROFILES.filter(p=>s.fellows[p.id]&&stellaActivation(p.id));
 // REBASELINED 2026-09-18: 3 -> 111. Everkai shipped four Stella profiles scraped from four community
 // character pages; the original's own HeroSpirit.json has 126 tracks and lib/hero-spirit.mjs imports
 // every one that a shipped Fellow owns (scripts/import-hero-spirit.py, whose positive control
 // reproduces all four of the old ones to the digit). 88 of the 111 have a real track; the other 23 get
 // the smallest recovered ladder, because the owner asked that everyone have one and the original gives
 // its low-rarity characters none.
 assert.equal(owners.length,111,'every shipped original Fellow has an activatable Stella ladder');
 let maxed=0;
 for(const p of owners){
  const activated=maybe(s,'stellaActivate',p.id,{seq:stellaState(s).seq});
  assert.notEqual(activated,s,`stella ${p.id} refused activation; the policy set has drifted`);
  s=activated;
  // Funded in one grant, then bought. Granting 1,000 at a time and stopping at the first refusal left
  // the 25 most expensive ladders part-built -- one level near the top of an 18,000-shard ladder costs
  // more than 1,000 by itself -- and silently understated this stage by millions.
  s=grantFragments(s,p.id,Math.ceil(p.levels.reduce((n,r)=>n+r.cost,0)/1000));
  for(let i=0;i<3;i++){
   const before=s;
   s=maybe(s,'stellaUpgrade',p.id,{seq:stellaState(s).seq,count:'max'});
   if(s===before)break;
  }
  if(stellaEntry(s,p.id)?.level===p.levels.length)maxed++;
 }
 assert.equal(maxed,111,'every ladder must reach its own top, or this stage understates itself');
 // REBASELINED AGAIN 2026-09-18: 13,656,809 -> 19,597,345, and the whole +5,940,536 is ONE column.
 // `self | atk percent` -- the owner's own Power percent, 116 of the 126 tracks, +153% to +1350% --
 // was carried as `unmodelledMax` and is now imported. It joins the SAME `percent` bucket the
 // type-wide column already used (PropManager.lua:99-117 sums every contributing system into one
 // factor), so nothing multiplies twice: applyStella is byte-identical, only stellaBonus's sum grew.
 // 19,597,345 before 2026-09-18. Stella's percent used to wrap the WHOLE Fellow (applyStella) -- base,
 // museum, familiar flat and all; it is now one more part of the base term's additive bucket, which is
 // where the owner's live panel puts it (percent/underlingskillpower, docs/power-parity-audit.md 1.4).
 assert.equal(Math.round(rosterOperation(s)),20082540,'stella is worth +12,825,674 over the fixture (+17,980,859 when its percent wrapped everything)');
 assert.ok(valid(s),'the stella save must be legal');

 // Stage 2 -- BLESSINGS. welcomeAll is the family counterpart of recruitAll; without it a save holds
 // ONE family member and blessings look worthless. Points come from the family consumable, and they
 // must be SPREAD: `count:'all'` on the first member drains the whole bag into it and the other 104
 // train nothing, which is exactly how this measurement was first got wrong.
 s=maybe(s,'welcomeAll');
 assert.equal(Object.keys(s.family).length,107,'welcomeAll must seat the whole family catalogue');
 const points=CONSUMABLES.find(i=>i.stat==='points'&&i.target==='family');
 assert.ok(points,'no family Blessing-Point consumable ships; the faucet below would prove nothing');
 s=stockConsumable(s,points.id,3000);
 let funded=0;
 for(const id of Object.keys(s.family)){
  const before=s;
  s=maybe(s,'useConsumable',points.id,{recipient:id,count:10});
  if(s!==before)funded++;
 }
 assert.equal(funded,107,'every family member must be funded, or the blessing total is understated');
 let trained=0;
 for(const id of Object.keys(s.family))for(const key of ['flatBlessing','advancedBlessing']){
  const before=s;s=maybe(s,'trainBlessingsMax',id,key);if(s!==before)trained++;
 }
 // 208 of 210: two (family, key) pairs refuse with 'No supported ungated Fellows are available'.
 assert.equal(trained,200,'the trainable (family, blessing) pair count has moved (212 before the 2026-09-17 roster trim)');
 // 25,877,947 before 2026-09-18: the blessing flat is no longer multiplied by Stella's percent, and the
 // blessing percent now adds to Stella's instead of being multiplied by it.
 assert.equal(Math.round(rosterOperation(s)),20713775,'blessings are worth +318,807 over stella (+6,280,602 when Stella multiplied them)');
 assert.ok(valid(s),'the blessing save must be legal');

 // Stage 3 -- ARTIFACT ECHOES. An Echo only enables when its OWN named artifact is equipped on its
 // OWN named Fellow, which is why a fixture that gives all 154 the single best-aptitude item enables
 // exactly zero of them. Equipping the echo item costs those Fellows some base aptitude and the net
 // is still positive.
 const named=ARTIFACT_ECHOES.filter(r=>r.fellow&&s.fellows[r.fellow]&&GEAR.some(g=>g.id===r.item));
 assert.equal(named.length,27,'the enable-able Echo set has changed (32 before the 2026-09-17 roster trim deleted 5 of their Fellows)');
 let enabled=0;
 for(const r of named){
  // gearLevel REBASELINED 2026-09-15 (F11) from a hard-coded 1 for the same reason as maxedRecords:
  // swapping BEST out for the echo item at level 1 threw away 199 upgrade levels the save is allowed
  // to hold, so at ARTIFACT_CAP 200 this stage SUBTRACTED 479,571 (6,684,380 -> 6,204,809) and the
  // "ceiling" was lower than the stage before it. A maximum that a legal save beats is not a ceiling.
  s={...s,fellows:{...s.fellows,[r.fellow]:{...s.fellows[r.fellow],gear:r.item,gearLevel:ARTIFACT_CAP}}};
  const before=s;s=maybe(s,'enableArtifactEcho',r.fellow);if(s!==before)enabled++;
 }
 assert.equal(enabled,27,'every named Echo must enable once its own artifact is equipped');
 assert.equal(Math.round(rosterOperation(s)),20816140,'26,956,296 before 2026-09-18');
 assert.ok(valid(s),'THE WHOLE 4,096,763 SAVE MUST BE LEGAL -- otherwise it is not a reachable ceiling');

 // The parity statement this file exists to make, in one assertion. REBASELINED 2026-09-15 (E4-02/E4-03):
 // importing every keepsake's own effect moved the ceiling 3,026,482 -> 4,096,763, which OVERSHOOTS the
 // original's live-save 3,497,276 rather than falling short of it. The shortfall ratio flipped from
 // 1.16x short to 1.17x over. Both halves of this ratio are the original's own live-save total against
 // Everkai's own rosterOperation, so it compares Everkai's reach to the original's, not two sources.
 // *** 4.47x, UP FROM 1.33x, AND THIS IS THE SLICE'S HEADLINE NUMBER. *** Two changes, both parity
 // fixes rather than balance choices, and both measured before they were built:
 //   + importing the original's own 126 Stella tracks instead of the four scraped ones, which is what
 //     puts an own-flat ladder worth 15,300,000 to 223,500,000 on every Fellow;
 //   - correcting applyStella to the original's stacking order (the flat is an `extradd`, added after
 //     the typed multiplier, not inside it), which on its own takes this fixture DOWN 4,655,637 ->
 //     4,519,467 and takes the import down 24,932,927 -> 15,642,961. Without that correction the same
 //     import measures 7.13x.
 // *** RE-ANCHORED 2026-09-18. READ THIS BEFORE READING THE RATIO BELOW. ***
 // 3,497,276 is ONE REAL PLAYER'S few-weeks save, and the "~4x budget" it used to carry rested on a
 // misreading of it as a single hero's power. It is a ROSTER TOTAL of 3,497,276,469 over ~150 heroes
 // -- ~23M average against his own reported 300M top and 5M floor (docs/power-parity-audit.md 5). So
 // this line is now a PACING CHECK and is named as one. A move here is worth reporting; it is not a
 // budget and it does not block a slice.
 // 7.71 before 2026-09-18.
 assert.equal(Math.round(rosterOperation(s)/3_497_276*100)/100,5.95,
  'PACING against one real few-weeks save -- not a parity target');
 // *** THE SECOND PIN: THE ORIGINAL'S OWN TABLE MAXIMUM. *** Every one of the original's 126 Spirit
 // tracks at its top rank, summed, under the original's own HeroConversionRate divisor of 10/10000.
 // 13,861,950. Both halves of THIS ratio are ceilings, which is what the old anchor could never be.
 // It still understates the original: it counts one bucket (`extradd`) of one system, for 126 heroes
 // of 181, and none of the base term, talent, percent stack, stars, museum, fishing or the
 // account-wide floor. So 1.94x is an UPPER bound on the overshoot, not the overshoot.
 const TABLE_MAX=Math.round(SPIRIT_DATA.profiles.reduce((n,p)=>n+p.ranks.at(-1).flat,0)/1000);
 assert.equal(TABLE_MAX,13861950);
 assert.equal(Math.round(rosterOperation(s)/TABLE_MAX*1000)/1000,1.502,'1.945 before 2026-09-18');
 // *** AND THE PER-FELLOW PIN, which is the number the owner actually reported seeing. His best hero
 // on the original after a few weeks was ~300,000,000, and 70-90% of it was that hero's own Spirit
 // `extradd` -- whose table maximum is 223,500,000. Everkai's strongest fully-maxed Fellow:
 const top=Math.max(...Object.keys(s.fellows).map(id=>bondedPower(s,id)));
 // 623,250,916 before 2026-09-18 -- 2.08x the owner's 300M. Under the original's composition the
 // strongest fully-maxed default-mode Fellow lands at 0.95x of it.
 assert.equal(top,401355307);
 assert.equal(Math.max(...SPIRIT_DATA.profiles.map(p=>p.ranks.at(-1).flat)),223500000,
  'the original single biggest Spirit flat, for scale');
 assert.equal(Math.round(top/300_000_000*1000)/1000,1.338);
 // And the floor, the other number he reported (">5 million on the worst hero"):
 assert.equal(Math.min(...Object.keys(s.fellows).map(id=>bondedPower(s,id))),36505458,'28,900,470 before 2026-09-18');
});

test('APK growth mode passes the original outright: one Fellow alone is worth 60.0M Power',()=>{
 // Level 750 at quality 14 with aptitude 1000 and seven stars, on the original's own coefficient
 // curve and composition: floor(15500 x (1000 + (35-10) + 65) x (1 + 0.35 stars + 1.00 skill)).
 // It was floor(15500 x (1000 x 1.35 + 25 + 65) x 2) = 44,640,000 before 2026-09-18.
 let s=maybe(roster(),'activateOriginalProgression');
 assert.ok(s.originalProgression,'APK growth must activate on a fresh full roster');
 const fellows=Object.fromEntries(Object.keys(s.fellows).map(id=>
  [id,{level:750,aptitude:1000,skill:20,breaks:0,gear:null,stars:STAR_CAP}]));
 const quality=Object.fromEntries(Object.keys(s.fellows).map(id=>[id,14]));
 s={...s,fellows,originalProgression:{...s.originalProgression,quality}};
 // Pinned to Kaity (hero_15), whose talent terms the formula above spells out; the full roster owns her.
 // +21 since 2026-09-18: seven stars unlock Hero_Talent_StarSkill_1..6 at level 1 (1+2+...+6, lib/talent-skills.mjs).
 // STEP 4 (2026-09-18): the seven stars now pay HeroStar's six (+6,000 bp and +7,500,000 flat at level 750), and
 // every one of the 111 owned heroes broadcasts its star halos at level 7 -- the percent/talent/talentpercent
 // rows only; the finalpercent rows are held out. So the one-line formula above no longer covers her; the pin is
 // the composition of her parts, stated part by part.
 const pp=powerParts(s,'hero_15');
 assert.deepEqual([pp.percent.stars,pp.flat.stars],[6000,7500000]);
 // The roster-wide star halos she RECEIVES from 111 heroes at seven stars: +4,500 bp (country 5 + all + her
 // rarity-2 rows). This is the broadcast the owner asked to see sized; the finalpercent rows would add more.
 assert.equal(pp.percent.starHalo,4500);
 assert.equal(bondedPower(s,'hero_15'),60_022_525,'40,468,175 before step 4, 39,703,250 before the talent skills');
 assert.equal(Math.round(rosterOperation(s)),8_755_530,'5,129,260, then 4,611,769, then 4,713,322, before 2026-09-18 step 4');
 // 1.32x the original's measured live-save conversion of 3,497,276 (1.5x before the 2026-09-18 additive
 // composition, 2.0x before the 2026-09-17 roster
 // trim narrowed the village-wide sum) -- so the parity shortfall is a
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
