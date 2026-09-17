import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import data from '../lib/everkai-additions-data.json' with {type:'json'};
import {CROSSOVER_RARITY_TIERS,CROSSOVER_RARITY_TOP,crossoverRarity,displayRarity,withDisplayRarity,displayRoster,rarityClimbs} from '../lib/crossover-rarity.mjs';
import {rarityIcon,petCardIcon,petFrameIcon,cardRarity,RARITY_ICON_ALIAS} from '../lib/ui-sprites.mjs';
import {FELLOWS,FAMILY,ORIGINAL_FELLOWS,ORIGINAL_FAMILY,fellowById} from '../lib/catalog.mjs';
import {ADDITION_FELLOWS,ADDITION_FAMILY,additionById,sourceId} from '../lib/everkai-additions.mjs';
import {qualityRule,sourceQuality,sourceCap,DAILY_BREACH,SOURCE_MATERIALS,heroRow} from '../lib/original-progression.mjs';
import {crossoverLadder} from '../lib/crossover-abilities.mjs';
import {recruitRarity,recruitOffers} from '../lib/summon.mjs';
import {fishingBonuses} from '../lib/fishing.mjs';
import {bondedPower,newFellow} from '../lib/adventure.mjs';
import {decode,startingSave,act,valid,refusedBy,SAVE_VERSION} from '../lib/game.mjs';
import {searchCharacters} from '../lib/original-catalog.mjs';
import {ALL_STORY_SCENES} from '../lib/storybook.mjs';
import progression from '../lib/original-progression-data.json' with {type:'json'};
import species from '../lib/fishing-species.json' with {type:'json'};

const T=1767225600000;
const VADER='xover_swgoh_vaderduelsend',SPIDEY='xover_msf_spiderman';
/** A village where `id` sits at quality `q` and its cap. bondedPower and displayRarity are pure
 *  functions of state, so this is ARITHMETIC, not a claim that the state is reachable -- the reachable
 *  path is driven through act() in the last test of this file, with valid() asserted. */
const at=(id,q)=>{const base=startingSave(T);return {...base,
 fellows:{...base.fellows,[id]:{...newFellow(qualityRule(q).cap),aptitude:10}},
 trainingCosts:{policyVersion:2,baselineLevels:{...Object.fromEntries(Object.entries(base.fellows).map(([k,f])=>[k,f.level])),[id]:qualityRule(q).cap},receipts:[]},
 originalProgression:{policyVersion:1,claims:0,quality:{[id]:q},stock:Object.fromEntries(Object.keys(SOURCE_MATERIALS).map(m=>[m,0])),receipts:[]}}};
/** The REACHABLE climb: own the Fellow, enable original growth, then train to each cap and spend one
 *  quality step, all through act(). Returns the state, which valid() accepts at every rung. */
function climbThrough(id,to){
 const base=startingSave(T);
 let s={...base,fellows:{...base.fellows,[id]:newFellow()}};
 const step=(action,target,value)=>{const r=act(s,action,s.lastAt,target,value);assert.equal(r.error,undefined,`${action} ${target}: ${r.error}`);s=r.state};
 step('activateOriginalProgression');
 for(let q=1;q<to;q++){
  while(s.fellows[id].level<qualityRule(q).cap){
   s={...s,fellowXP:1e9};
   const before=s.fellows[id].level;
   step('train',id,'max');
   assert.ok(s.fellows[id].level>before,`training stalled at ${before}`);
  }
  s={...s,originalProgression:{...s.originalProgression,claims:s.originalProgression.claims+1,
   stock:Object.fromEntries(Object.entries(s.originalProgression.stock).map(([k,n])=>[k,n+100]))}};
  step('originalQuality',id);
 }
 return s;
}

test('the ladder is eight badges over fourteen quality tiers, and every rung has art',()=>{
 assert.equal(CROSSOVER_RARITY_TIERS.length,14,'one entry per quality tier');
 assert.equal(CROSSOVER_RARITY_TIERS.length,Object.keys(progression.quality).length,'and the table it indexes');
 assert.deepEqual([...new Set(CROSSOVER_RARITY_TIERS)],['N','R','SR','SSR','SSR+','UR','UR*','LR']);
 assert.equal(CROSSOVER_RARITY_TOP,'LR');
 // Monotonic: a quality step never lowers the badge, which is the whole point of showing it.
 const order=['N','R','SR','SSR','SSR+','UR','UR*','LR'];
 for(let q=2;q<=14;q++)assert.ok(order.indexOf(crossoverRarity(q))>=order.indexOf(crossoverRarity(q-1)),`q${q}`);
 // Every tier renders: the rarity badge AND the framed card the roster tile is built from.
 for(let q=1;q<=14;q++){
  const badge=crossoverRarity(q);
  assert.ok(rarityIcon(badge),`q${q} badge ${badge} has no rarity icon`);
  assert.ok(petCardIcon(badge)&&petFrameIcon(badge),`q${q} badge ${badge} has no card ground or frame`);
 }
 // Clamped, not undefined: an out-of-range tier renders as a badge rather than as missing art.
 assert.deepEqual([crossoverRarity(0),crossoverRarity(15),crossoverRarity(undefined),crossoverRarity(1.5)],['N','LR','N','N']);
});

test('the two sprite defects the ladder needed are fixed, each with its negative control',()=>{
 const sprites=JSON.parse(readFileSync(new URL('../lib/ui-sprite-data.json',import.meta.url),'utf8'));
 // 1. `UR*` had no alias, so rarityIcon asked for a key that does not exist. The missing key IS the
 //    negative control: if it ever ships, the alias stops being load-bearing.
 assert.equal(sprites['Icon_Rarity_UR*_1'],undefined,'negative control: there is no UR* sprite key');
 assert.ok(sprites.Icon_Rarity_URPlus_1,'positive control: the URPlus sprite it aliases onto exists');
 assert.equal(RARITY_ICON_ALIAS['UR*'],'URPlus');
 assert.ok(rarityIcon('UR*').endsWith('Icon_Rarity_URPlus_1.png'));
 // ...which also fixes the 3 catalogue records whose own rarity is UR*, and every chain ending in one.
 const starred=[...ORIGINAL_FELLOWS,...ORIGINAL_FAMILY].filter(c=>c.rarity==='UR*');
 assert.equal(starred.length,3,'positive control: the 3 UR* records docs/crossover-progression-plan.md 1.1 counts');
 for(const c of starred)assert.ok(rarityIcon(c.rarity),c.id);
 // 2. LR had no card ground: six PetList rarities ship and LR would have been a seventh.
 assert.equal(sprites.Bg_PetList_Rarity_7,undefined,'negative control: there is no seventh card ground');
 assert.ok(sprites.Bg_PetList_Rarity_6,'positive control: the sixth, which LR folds onto');
 assert.equal(cardRarity('LR'),'LR');
 assert.ok(petCardIcon('LR')&&petFrameIcon('LR'));
 assert.ok(rarityIcon('LR').endsWith('Icon_Rarity_LR_1.png'),'and LR has a badge of its own');
});

test('displayRarity climbs with the STORED quality tier and with nothing else',()=>{
 for(const [q,badge] of CROSSOVER_RARITY_TIERS.entries()){
  const s=at(VADER,q+1);
  assert.equal(displayRarity(s,VADER),badge,`quality ${q+1}`);
  assert.equal(sourceQuality(s,VADER),q+1,'read from the save, not from a new field');
  assert.equal(sourceCap(s,VADER),qualityRule(q+1).cap);
 }
 // Unowned, and in a village that never enabled original growth: the bare N it ships with.
 const fresh=startingSave(T);
 assert.equal(displayRarity(fresh,VADER),'N');
 assert.equal(displayRarity(fresh,SPIDEY),'N');
 assert.equal(displayRarity(undefined,VADER),'N','and with no state at all');
 // NEGATIVE CONTROL: the same quality tier on an ORIGINAL Fellow must not move its rarity, or this is
 // a function of the tier rather than of being a crossover character.
 const original=at('hero_15',14);
 assert.equal(sourceQuality(original,'hero_15'),14,'positive control: the tier really is 14');
 assert.equal(displayRarity(original,'hero_15'),fellowById('hero_15').rarity);
 assert.equal(rarityClimbs('hero_15'),false);
 assert.equal(rarityClimbs(VADER),true);
});

test('every original character keeps its own rarity, and crossover Family keep theirs',()=>{
 const s=startingSave(T);
 for(const c of [...ORIGINAL_FELLOWS,...ORIGINAL_FAMILY])assert.equal(displayRarity(s,c.id),c.rarity,c.id);
 // Including the 32 chained ones, which must come back as the chain and not as a ladder token.
 const chained=[...ORIGINAL_FELLOWS,...ORIGINAL_FAMILY].filter(c=>String(c.rarity).includes('->'));
 assert.ok(chained.length>=40,`positive control: ${chained.length} chained rarities are present`);
 // Crossover FAMILY have no quality tier -- the ladder is keyed by s.fellows -- so their badge is
 // static. Asserted with a quality entry present for one of them, which is the case that would break.
 for(const f of ADDITION_FAMILY){
  assert.equal(rarityClimbs(f.id),false,`${f.id} is Family; her badge must not climb`);
  assert.equal(displayRarity({...s,originalProgression:{policyVersion:1,claims:0,quality:{[f.id]:14},stock:{},receipts:[]}},f.id),f.rarity);
 }
 assert.equal(new Set(ADDITION_FELLOWS.map(f=>f.rarity)).size,1,'all 133 Fellows ship at one rarity');
 assert.equal(ADDITION_FELLOWS[0].rarity,'N');
});

test('the STORED rarity stays "N": the eight ["N"]-gated fishing effects survive the whole climb',()=>{
 // The claim docs/crossover-storyline-plan.md 4.6 makes, verified before it is relied on. The gate is
 // an EXACT string test (lib/fishing.mjs:60), so what the catalogue stores decides which effects land.
 const gates=[];
 const walk=o=>{if(Array.isArray(o))return o.forEach(walk);if(o&&typeof o==='object'){if(Array.isArray(o.rarities)&&o.rarities.length)gates.push(JSON.stringify(o.rarities));Object.values(o).forEach(walk)}};
 walk(species);
 const histogram={};for(const g of gates)histogram[g]=(histogram[g]||0)+1;
 assert.deepEqual(histogram,{'["N"]':8,'["R"]':12,'["SR"]':12,'["SSR","SSR+"]':22,'["UR"]':12},
  'the measured rarity gates in lib/fishing-species.json');
 // One displayed N-gated effect and one UR-gated one, both flat, on a village that owns Vader.
 const ngate={kind:'flat',type:null,rarities:['N'],initial:1000,increment:0};
 const urgate={kind:'flat',type:null,rarities:['UR'],initial:1000,increment:0};
 const withFish=(s,effect)=>({...s,fishing:{bait:0,catches:[{id:'catch:1',policyVersion:2,fish:'fish',name:'Test',caughtAt:T-1,effect,duplicate:false}],
  displayed:['fish'],researched:[],skills:{fish:1},points:0}});
 for(const q of [1,7,13,14]){
  const s=at(VADER,q);
  assert.equal(fishingBonuses(withFish(s,ngate),VADER).flat,1000,`an ["N"] effect still pays at quality ${q} (badge ${displayRarity(s,VADER)})`);
  assert.equal(fishingBonuses(withFish(s,urgate),VADER).flat,0,`a ["UR"] effect pays nothing at quality ${q} even when the badge reads ${displayRarity(s,VADER)}`);
 }
 // POSITIVE CONTROL that the UR gate works at all: an original UR Fellow draws it.
 const urFellow=ORIGINAL_FELLOWS.find(f=>f.rarity==='UR');
 const s=at(urFellow.id,1);
 assert.equal(fishingBonuses(withFish(s,urgate),urFellow.id).flat,1000,`${urFellow.id} is UR and draws it`);
 // So the badge cannot be a power term: power is identical whichever effect list the badge would imply.
 assert.equal(additionById(VADER).rarity,'N','the catalogue string never moved');
 assert.equal(recruitRarity(VADER),'N','and neither did what the counter would quote');
});

test('no new save state: a fully climbed village round-trips byte-identically at the same SAVE_VERSION',()=>{
 assert.equal(SAVE_VERSION,10,'this slice must not move it');
 const s=climbThrough(VADER,14);
 assert.ok(valid(s),refusedBy(s));
 assert.equal(sourceQuality(s,VADER),14);
 assert.equal(s.fellows[VADER].level,700,'level 700 is quality 13\'s cap, the last one the ladder charges');
 const text=JSON.stringify(s);
 assert.equal(displayRarity(s,VADER),'LR');
 assert.ok(!text.includes('displayRarity')&&!text.includes('"LR"'),'the badge is nowhere in the bytes');
 const back=decode(text);
 assert.equal(JSON.stringify(back),text,'and the save decodes to the same bytes');
 assert.equal(displayRarity(back,VADER),'LR','the badge survives because the TIER survives');
 // The badge is derived from a field validOriginalProgression already validates, so breaking the field
 // must break the save -- the negative control for "no new state was needed".
 for(const bad of [15,0,'14',null]){
  const tampered={...s,originalProgression:{...s.originalProgression,quality:{...s.originalProgression.quality,[VADER]:bad}}};
  assert.equal(valid(tampered),false,`quality ${JSON.stringify(bad)} must be refused`);
 }
 assert.equal(displayRarity(climbThrough(VADER,13),VADER),'UR*','and tier 13 is the UR* rung');
});

test('what one full climb shows and costs, measured end to end',()=>{
 // SHOWS: eight badges, level cap 100 -> 750.
 const shown=CROSSOVER_RARITY_TIERS.map((badge,i)=>`q${i+1} L${qualityRule(i+1).cap} ${badge}`);
 assert.equal(shown[0],'q1 L100 N');
 assert.equal(shown[13],'q14 L750 LR');
 // COSTS: the quality table's own consume rows, unchanged by this slice, and the one faucet.
 const need={};
 for(let q=1;q<=13;q++)for(const c of qualityRule(q).consume)need[c.id]=(need[c.id]||0)+c.count;
 assert.equal(Object.values(need).reduce((a,b)=>a+b,0),291,'291 material units for the 13 steps');
 assert.equal(Math.max(...Object.values(need)),69,'the binding material is a tier-2 one at 69');
 assert.equal(DAILY_BREACH,10);
 assert.equal(Math.ceil(69/DAILY_BREACH),7,'7 days of daily-habit claims for ONE character');
 let exp=0;for(let l=1;l<=749;l++)exp+=progression.levels[l].cost;
 assert.equal(exp,5851457490,'plus the Fellow EXP to level 750');
 // WORTH: both halves from Everkai's own bondedPower on the same state (CLAUDE.md rule 1).
 // RE-MEASURED 2026-09-17 with the abilities slice (docs/crossover-plan.md order of work 5). It used
 // to be 64,750 -> 2,092,500 (32.3x) and it is 18,500 -> 4,107,500 (222.0x) now, because the badge
 // stopped being decoration: the base-Aptitude row is read from the rarity LADDER at the badge the
 // character has climbed to (lib/crossover-abilities.mjs) instead of borrowed from a template original
 // that never moved. Both ends changed for the same reason. The bottom fell because a rarity-N Fellow
 // now reads the N row, 20, where it used to read its SSR anchor's 70 -- which is the dominance the
 // slice removed. The top rose because quality 14 shows the LR badge and reads 200, the measured UR*
 // row. So the climb is now the single largest lever a crossover Fellow has, which is what "all start
 // at N and can be upgraded to the top" is supposed to mean.
 const low=bondedPower(at(VADER,1),VADER),high=bondedPower(at(VADER,14),VADER);
 assert.deepEqual([low,high],[18500,4107500]);
 assert.equal(+(high/low).toFixed(1),222,'a 222x power multiplier on one character');
 // The ladder rungs it climbs, spelled out, against the originals they were measured from.
 assert.deepEqual([1,5,9,13,14].map(q=>crossoverLadder(q).baseAptitude),[20,50,100,200,200]);
 assert.deepEqual([1,5,9,13,14].map(q=>CROSSOVER_RARITY_TIERS[q-1]),['N','SR','SSR+','UR*','LR']);
 // `template` no longer feeds ANY of this -- it survives only as the art/rendering lineage it always
 // documented (docs/crossover-abilities-plan.md 8, decision D4). Positive control that it is still
 // recorded, and the measurement that made retemplating Vader look like a loss is now moot: his row
 // is the ladder's, not hero_101's.
 assert.equal(sourceId(VADER),'hero_101');
 assert.deepEqual([progression.heroes.hero_101,progression.heroes.hero_113],[70,120]);
 assert.equal(heroRow(at(VADER,14),VADER),200,'neither 70 nor 120: the UR*/LR rung of its own ladder');
});

test('the climb is reachable: quality 1 -> 2 through act(), and the badge follows',()=>{
 const base=startingSave(T);
 let s={...base,fellows:{...base.fellows,[VADER]:newFellow(100)}};
 const on=act(s,'activateOriginalProgression',s.lastAt);
 assert.equal(on.error,undefined,on.error);
 s=on.state;
 assert.ok(valid(s),refusedBy(s));
 assert.equal(displayRarity(s,VADER),'N');
 // Stock the materials the way claimDailyBreach does, through the ledger validOriginalProgression
 // recomputes, then spend one step.
 s={...s,originalProgression:{...s.originalProgression,claims:1,
  stock:Object.fromEntries(Object.keys(SOURCE_MATERIALS).map(m=>[m,100]))}};
 assert.ok(valid(s),refusedBy(s));
 const up=act(s,'originalQuality',s.lastAt,VADER);
 assert.equal(up.error,undefined,up.error);
 s=up.state;
 assert.ok(valid(s),refusedBy(s));
 assert.equal(sourceQuality(s,VADER),2);
 assert.equal(displayRarity(s,VADER),'N','tier 2 is still N -- two tiers per badge');
 assert.equal(JSON.stringify(decode(JSON.stringify(s))),JSON.stringify(s),'and the save still round-trips');
});

test('withDisplayRarity keeps identity when nothing moved, and the roster helper with it',()=>{
 const fresh=startingSave(T);
 const vader=fellowById(VADER);
 assert.equal(withDisplayRarity(fresh,vader),vader,'quality 1 is already N, so the row is untouched');
 assert.equal(displayRoster(fresh,FELLOWS),FELLOWS,'and the catalogue array is handed straight through');
 const climbed=at(VADER,11);
 const moved=withDisplayRarity(climbed,vader);
 assert.notEqual(moved,vader);
 assert.equal(moved.rarity,'UR');
 assert.equal(vader.rarity,'N','the frozen catalogue row itself is not mutated');
 assert.deepEqual({...moved,rarity:'N'},{...vader},'and nothing else about the row changed');
 const roster=displayRoster(climbed,[fellowById('hero_15'),vader]);
 assert.equal(roster[0],fellowById('hero_15'));
 assert.equal(roster[1].rarity,'UR');
 assert.equal(withDisplayRarity(climbed,null),null);
});

test('the three surfaces that can show a crossover rarity are the three that were wired',()=>{
 // Claimed in the commit, so measured here. The Fellow album and the story library read `cardRarity`
 // off a catalogue row too, but neither can reach a crossover character: the album joins the ORIGINAL
 // record index by id, and every story scene names an original character. If either ever gains a
 // crossover entry -- step 6 of docs/crossover-plan.md would add 33 prologue scenes -- this fails, and
 // the wiring has to be extended with it.
 assert.equal(searchCharacters('Hero').filter(c=>String(c.id).startsWith('xover_')).length,0,'album: no crossover records');
 assert.equal(searchCharacters('Wife').filter(c=>String(c.id).startsWith('xover_')).length,0);
 assert.ok(searchCharacters('Hero').length>150,`positive control: ${searchCharacters('Hero').length} album records exist`);
 assert.equal(ALL_STORY_SCENES.filter(s=>s.characterId.startsWith('xover_')).length,0,'library: no crossover scenes');
 assert.ok(ALL_STORY_SCENES.length>50,`positive control: ${ALL_STORY_SCENES.length} scenes exist`);
 // The Recruit counter shows a rarity for everyone it lists; it lists no addition, which is the other
 // half of why the panel shows the climbed badge only for one already joined.
 assert.deepEqual(recruitOffers(startingSave(T)).filter(o=>o.id.startsWith('xover_')),[]);
 assert.equal(FELLOWS.length,159,'flag off, as Node always is');
 assert.equal(FAMILY.length,107);
 assert.equal(data.fellows.length,133);
});
