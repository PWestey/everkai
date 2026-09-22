import test from 'node:test';import {talentSkillParts} from '../lib/talent-skills.mjs';import assert from 'node:assert/strict';
import {act,valid,refusedBy} from '../lib/game.mjs';
import {bondedPower,powerParts,composePower,levelADH,defaultADH,EVERKAI_ONLY_PARTS,STAR_POWER_BP,SKILL_POWER_BP,ladderPower,validAdventure} from '../lib/adventure.mjs';
import {sourceCoefficient,sourceAptitudeBonus} from '../lib/original-progression.mjs';
import {stellaBonus,stellaState,STELLA_PROFILES} from '../lib/stella.mjs';
import {APTITUDE_CAP,LEGACY_APTITUDE_CAP,APTITUDE_CAP_SOURCE,PEARL_APTITUDE_CAP} from '../lib/aptitude-cap.mjs';
import {aptitudeTrainingPlan} from '../lib/adventure.mjs';
import {talentTrainingPlan,talentRule} from '../lib/talents.mjs';
import {readFileSync as readSrc,readdirSync} from 'node:fs';
import {validAptitudeLedger} from '../lib/aptitude-ledger.mjs';
import {ORIGINAL_FELLOWS} from '../lib/catalog.mjs';
import {legacyStart,withItems,grantFragments} from './progression-helpers.mjs';
import {buildCeiling} from './crossover-ceiling-fixture.mjs';

// Fellow Power on the original's own composition (lib/adventure.mjs powerParts, 2026-09-18). The bucket
// table and every before/after figure are in docs/power-parity-audit.md 9.
const NOW=1767225600000;
const maybe=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);return r.error?s:r.state};
const sum=o=>Object.values(o).reduce((n,v)=>n+v,0);
const sums=p=>({adh:p.adh,talent:sum(p.talent),coefpercent:sum(p.coefpercent),percent:sum(p.percent),flat:sum(p.flat),final:sum(p.final)});
const withFellow=(s,id,props)=>({...s,fellows:{...s.fellows,[id]:{...s.fellows[id],...props}}});

// ---------------------------------------------------------------------------------------------------
// GROUND TRUTH. The owner's own Power Details panels, reconciled to the unit in
// docs/power-parity-audit.md 1.4 (screenshots scratchpad/emu/shinobu-power-*.png, orivita-*.png). Every
// input below is a bucket SUM read off that reconciliation; the parts are listed so the sums are checked.
// ---------------------------------------------------------------------------------------------------
const SHINOBU={adh:10400,talent:12283,coefpercent:500,
 percentParts:[26150,17000,95200,3000,1250,8000,11500,4000],      // family, artifacts, Stella, stars, fish, familiar, aura, origin
 flatParts:[223500000,7266000,3051000,1750000,1500000,1031000,14200],final:250};
const ORIVITA={adh:8935,talent:2677,coefpercent:250,
 percentParts:[24100,16900,47500,3000,3250,8000,3600],
 flatParts:[149000000,5900000,2251000,1750000,1500000,64000,14200],final:250};
const panel=h=>({adh:h.adh,talent:h.talent,coefpercent:h.coefpercent,percent:h.percentParts.reduce((a,b)=>a+b,0),flat:h.flatParts.reduce((a,b)=>a+b,0),final:h.final});

test('the composition reproduces both of the owner’s real Power Details panels to the unit',()=>{
 assert.deepEqual([panel(SHINOBU).percent,panel(SHINOBU).flat],[166100,238112200],'the audit’s Shinobu sums');
 assert.deepEqual([panel(ORIVITA).percent,panel(ORIVITA).flat],[106350,160479200],'the audit’s Orivita sums');
 assert.deepEqual(composePower(panel(SHINOBU)),{aptitude:12897,base:2362008168,power:2665123377});
 assert.deepEqual(composePower(panel(ORIVITA)),{aptitude:2743,base:285158782,power:456778931});
 // The panel's own "Base (Determined by Aptitude)" row is ADH x the DISPLAYED Aptitude, which leaves the
 // familiar's talent (316 / 128) out -- and that reproduces too: 130.6M and 23.34M.
 assert.equal(SHINOBU.adh*composePower({...panel(SHINOBU),talent:SHINOBU.talent-316}).aptitude,130676000);
 assert.equal(ORIVITA.adh*composePower({...panel(ORIVITA),talent:ORIVITA.talent-128}).aptitude,23338220);
});

test('NEGATIVE CONTROL: the shapes the old spine used do not reproduce the panel',()=>{
 // Percent rows MULTIPLYING each other (the old stars/skill/museum/Stella wrappers) instead of adding.
 const h=SHINOBU,apt=composePower(panel(h)).aptitude;
 const nested=Math.floor((Math.floor(h.adh*apt*h.percentParts.reduce((m,p)=>m*(1+p/1e4),1))+panel(h).flat)*(1+h.final/1e4));
 assert.notEqual(nested,2665123377);assert.ok(nested>2*2665123377,`nesting the percents gives ${nested}`);
 // Stella's percent as an OUTER wrapper over the flats too (the retired applyStella).
 const stella=95200,rest=panel(h).percent-stella;
 const wrapped=Math.floor((Math.floor(h.adh*apt*(1e4+rest)/1e4)+panel(h).flat)*(1e4+stella)/1e4*(1+h.final/1e4));
 assert.notEqual(wrapped,2665123377);
});

// ---------------------------------------------------------------------------------------------------
// THE BUCKET TABLE, as code. Every Everkai source in the bucket the original uses for the same system.
// ---------------------------------------------------------------------------------------------------
test('every source sits in the original’s bucket, and the bucket set is exactly this',()=>{
 const p=powerParts(legacyStart(NOW),'hero_1');
 // + the Skill Aptitude parts (2026-09-18, lib/talent-skills.mjs): talent skills, intimacy, Stella self/bond talent,
 // Rarity Advance's talentBonus and its stage's initial talent -- all the original's `talent` bucket.
 assert.deepEqual(Object.keys(p.talent).sort(),['artifact','echo','familiar','family','fishing','gear','hero','museum','record','skills','intimacy','stellaTalent','stellaBond','rarity','stage','familyStella','starHalo','origin'].sort());
 assert.deepEqual(Object.keys(p.coefpercent).sort(),['origin','starHalo'],'talent percent: the star halos’ talentpercent rows and Origin Boost (step 4)');
 // + Family Stella, the Stella-unlocked pairs and quenching (2026-09-18, spec 3): all the original's `percent`.
 assert.deepEqual(Object.keys(p.percent).sort(),['bonds','echo','familiar','family','fishing','museum','skill','stars','stella','familyStella','familyPair','quench','starHalo','origin'].sort());
 assert.deepEqual(Object.keys(p.flat).sort(),['elixir','familiar','family','fishing','stella','museum','familyPair','stars'].sort(),'museum: the relic flat; familyPair: the Stella-unlocked pairs; stars: HeroStar extraAtk (2026-09-18)');
 assert.deepEqual(Object.keys(p.final).sort(),['familiar','museum'].sort());
 assert.deepEqual(EVERKAI_ONLY_PARTS,['familiar']);
});

test('stars and skill are PERCENT parts now, not Aptitude multipliers',()=>{
 // STEP 4 (2026-09-18): a star pays HeroStar's own row (lib/hero-stars.mjs), not Everkai's +5% each, and only
 // once the Fellow's level reaches its gate. At level 1 the seven stars pay nothing and unlock no star skill.
 const low=powerParts(withFellow(legacyStart(NOW),'hero_1',{stars:7,skill:20,aptitude:1000}),'hero_1');
 assert.deepEqual([low.percent.stars,low.flat.stars,low.talent.skills],[0,0,0]);
 const s=withFellow(legacyStart(NOW),'hero_1',{stars:7,skill:20,aptitude:1000,level:750,breaks:13});
 const p=powerParts(s,'hero_1');
 assert.equal(p.talent.record,1000,'stars no longer touch Aptitude');
 // The seven count as the original's six: +6,000 bp and +7,500,000 flat, and StarSkill_1..6 (+21 talent).
 assert.equal(p.talent.skills,21);assert.equal(p.aptitude,1021);
 assert.deepEqual([p.percent.stars,p.flat.stars,p.percent.skill],[6000,7500000,20*SKILL_POWER_BP]);
 assert.equal(SKILL_POWER_BP,500,'Everkai’s own +5% skill magnitude, unchanged');
 // x(1 + 0.60 + 1.00), the additive bucket, then the star flat outside it.
 assert.equal(bondedPower(s,'hero_1'),Math.floor(defaultADH(750)*1021*26000/10000)+7500000);
});

test('Stella is counted ONCE: its percent is one part of the bucket and its flat is one flat part',()=>{
 const id='hero_194';// the largest own-Power percent any shipped track carries: +1,350% at rank 40
 let s=maybe(legacyStart(NOW),'recruit',id);
 if(!s.fellows[id])s={...s,fellows:{...s.fellows,[id]:{level:1,aptitude:10,skill:0,breaks:0,gear:null}}};
 s=maybe(s,'stellaActivate',id,{seq:stellaState(s).seq});
 const profile=STELLA_PROFILES.find(p=>p.id===id);
 s=grantFragments(s,id,Math.ceil(profile.levels.reduce((n,r)=>n+r.cost,0)/1000));
 for(let i=0;i<3;i++)s=maybe(s,'stellaUpgrade',id,{seq:stellaState(s).seq,count:'max'});
 assert.ok(valid(s),refusedBy(s));
 const b=stellaBonus(s,id),p=powerParts(s,id);
 assert.equal(b.selfPercent,1350,'positive control: the ladder really reached its top');
 assert.equal(p.percent.stella,Math.round(b.percent*100),'the whole Stella percent, in basis points');
 assert.equal(p.flat.stella,b.flat);
 // Nowhere else: every other part is zero on a Fellow with nothing but a Stella track.
 for(const bucket of ['talent','percent','flat','final'])for(const [k,v] of Object.entries(p[bucket]))
  if(!(bucket==='talent'&&['record','skills','stellaTalent','stellaBond'].includes(k))&&k!=='stella')assert.equal(v,0,`${bucket}.${k} carries ${v} on a Stella-only Fellow`);
 // Talent skills are the one exception, and a named one: the Fellow's level-1 skills and the ones its Stella ranks
 // UNLOCK (lib/talent-skills.mjs). They are talent, never a second percent or flat.
 assert.equal(p.talent.skills,talentSkillParts(s,id).skills);
 // And the percent reaches the ADH x Aptitude term only, never its own flat.
 assert.equal(p.power,Math.floor(p.adh*p.aptitude*(10000+p.percent.stella)/10000)+b.flat);
 assert.equal(bondedPower(s,id),p.power,'and bondedPower adds nothing on top -- no second Stella factor anywhere');
});

test('the familiar node grid is Everkai-only, and it moves only the parts named for it',()=>{
 let s=withItems(maybe(legacyStart(NOW),'adoptFamiliars'));
 const pet=Object.keys(s.familiars)[0];
 s=maybe(s,'trainFamiliar',pet,10);
 const before=powerParts(s,'hero_1');
 s=maybe(maybe(s,'bindFamiliar',pet,'hero_1'),'activateFamiliarNodes',pet);
 const after=powerParts(s,'hero_1');
 assert.notEqual(after.power,before.power,'positive control: binding a trained familiar moved Power');
 for(const bucket of ['talent','coefpercent','percent','flat','final'])for(const k of Object.keys(after[bucket]))
  if(!EVERKAI_ONLY_PARTS.includes(k))assert.equal(after[bucket][k],before[bucket][k],`${bucket}.${k} moved on a familiar bind`);
});

test('ONE composition in both modes; only the level column and the hero row differ',()=>{
 let s=legacyStart(NOW);
 const d=powerParts(s,'hero_1');
 assert.deepEqual([d.adh,d.talent.hero,d.power],[defaultADH(1),0,100],'a fresh default Fellow is still exactly 100');
 assert.equal(defaultADH(750),1508,'(80 + 20 x 750) / 10, the old fellowFactor scale folded into the column');
 s=maybe(s,'activateOriginalProgression');
 const a=powerParts(s,'hero_1');
 assert.deepEqual([a.adh,a.talent.hero],[sourceCoefficient(1),sourceAptitudeBonus(s,'hero_1')]);
 assert.equal(levelADH(s,750),15500,'HeroLevel.coefficientADH at 750');
 for(const [mode,st] of [['default',legacyStart(NOW)],['apk',s]]){
  const t=withFellow(st,'hero_1',{level:90,aptitude:400,skill:6,stars:2});
  assert.equal(bondedPower(t,'hero_1'),composePower(sums(powerParts(t,'hero_1'))).power,`${mode}: bondedPower IS the composition`);
 }
});

// ---------------------------------------------------------------------------------------------------
// THE APTITUDE CAP -- the original's measured ceiling, not a chosen number.
// ---------------------------------------------------------------------------------------------------
test('the Aptitude cap is the original’s own measured ceiling, 107,198, and only widens',()=>{
 // 31,122 until 2026-09-18: that bounded Hero.json's talent skills only. The all-sources ceiling
 // (scripts/import-talent-skills.py: every skill a hero can ever own, at its full level raise) is 107,198.
 assert.equal(APTITUDE_CAP,107198);assert.equal(APTITUDE_CAP_SOURCE.cap,31122);
 assert.ok(APTITUDE_CAP>=APTITUDE_CAP_SOURCE.cap,'the new cap only widens the old one');
 const [base,per,raise,cap]=APTITUDE_CAP_SOURCE.heroes[APTITUDE_CAP_SOURCE.capHero];
 assert.deepEqual([base,per,raise,cap],[5400,18,1429,31122],'5,400 at level 300 plus 18 a level x 1,429 raised levels');
 // Positive control: the hero that sets it SHIPS, so the cap is reachable by a real Everkai Fellow.
 const shipped=Math.max(...ORIGINAL_FELLOWS.map(f=>APTITUDE_CAP_SOURCE.heroes[f.id]?.[3]??0));
 assert.equal(shipped,APTITUDE_CAP_SOURCE.cap,'the maximum over the 111 shipped originals is the same number');
 assert.ok(APTITUDE_CAP>=LEGACY_APTITUDE_CAP,'never below a value a real save holds');
});

test('validAdventure accepts the cap and refuses one past it; a legacy 1,000 still loads',()=>{
 const s=legacyStart(NOW);
 for(const apt of [LEGACY_APTITUDE_CAP,APTITUDE_CAP])assert.equal(validAdventure(withFellow(s,'hero_1',{aptitude:apt})),true,`${apt}`);
 // NEGATIVE CONTROL: one past the cap is still refused, so widening did not remove the bound.
 assert.equal(validAdventure(withFellow(s,'hero_1',{aptitude:APTITUDE_CAP+1})),false);
 // The ledger's per-key bound widened with it (it was the literal 1,000 too).
 const f={...s.fellows.hero_1,aptitude:APTITUDE_CAP,aptitudeLedger:{policyVersion:1,entries:{'item:Item_Talent_Hero_1':{paid:APTITUDE_CAP-10,gain:APTITUDE_CAP-10}}}};
 assert.equal(validAptitudeLedger({fellows:{hero_1:f}}),true);
 const over={...f,aptitudeLedger:{policyVersion:1,entries:{'item:Item_Talent_Hero_1':{paid:APTITUDE_CAP+1,gain:APTITUDE_CAP+1}}}};
 assert.equal(validAptitudeLedger({fellows:{hero_1:{...over,aptitude:APTITUDE_CAP}}}),false,'a key gaining past the cap is refused');
});

test('direct Skill Pearl training stops at the old 1,000; every original source keeps the 31,122 bound',()=>{
 // Owner-delegated balancing decision (power-parity-audit 9.8.6 / 9.10): the pearl -> Aptitude trade is
 // Everkai-only, and uncapped it bought one Fellow to 31,122 by simulated day 30.
 assert.equal(PEARL_APTITUDE_CAP,1000);assert.equal(PEARL_APTITUDE_CAP,LEGACY_APTITUDE_CAP);
 const s0=legacyStart(NOW);
 const s={...withFellow(s0,'hero_1',{aptitude:990}),inventory:{...s0.inventory,Item_Talent_Hero_1:50000}};
 assert.deepEqual(aptitudeTrainingPlan(s,'hero_1','max'),{count:10,cost:10,aptitude:1000},'pearls fill to 1,000 and no further');
 const r=act(s,'aptitude',s.lastAt,'hero_1','max');assert.ok(!r.error,r.error);assert.equal(r.state.fellows.hero_1.aptitude,1000);
 const again=act(r.state,'aptitude',s.lastAt,'hero_1',1);
 assert.match(again.error||'',/only up to 1,000/,'the refusal tells the player why it stopped');
 // A Fellow already past 1,000 from other sources: no pearl offer, but the save is still valid and the
 // talent-level route (the original's rule) still trains toward APTITUDE_CAP.
 const high={...withFellow(s0,'hero_1',{aptitude:5000}),inventory:{...s0.inventory,Item_Talent_Hero_1:50000}};
 assert.equal(aptitudeTrainingPlan(high,'hero_1','max').count,0);
 assert.equal(validAdventure(high),true,'a Fellow above 1,000 is never refused by the pearl cap');
 assert.ok(talentRule('hero_1'),'positive control: hero_1 has a talent rule');
 assert.ok(talentTrainingPlan(high,'hero_1','max').aptitude>5000,'talent levels still raise Aptitude past 1,000');
 // It is a PLANNER limit, never a validator: no save can be refused by it. Enforced on the source, since a
 // validator bound here would refuse the crossover build's own 31,122-trained saves.
 const users=readdirSync(new URL('../lib/',import.meta.url)).filter(f=>f.endsWith('.mjs')&&f!=='aptitude-cap.mjs')
  .filter(f=>readSrc(new URL('../lib/'+f,import.meta.url),'utf8').includes('PEARL_APTITUDE_CAP'));
 assert.deepEqual(users,['adventure.mjs']);
 const adv=readSrc(new URL('../lib/adventure.mjs',import.meta.url),'utf8');
 const at=adv.indexOf('export function validAdventure'),validator=adv.slice(at,adv.indexOf('\nexport ',at+1));
 assert.ok(validator.includes('APTITUDE_CAP'),'positive control: the validator slice holds the real cap bound');
 assert.ok(!validator.includes('PEARL_APTITUDE_CAP'),'validAdventure must not bound Aptitude by the pearl cap');
 const ledger=readSrc(new URL('../lib/aptitude-ledger.mjs',import.meta.url),'utf8');
 assert.ok(!ledger.includes('PEARL_APTITUDE_CAP')&&!/LEGACY_APTITUDE_CAP/.test(ledger),'the ledger keeps the 31,122 per-key bound');
 // Behaviourally too: a save written by crossover@3854d3a, whose planner sold pearls to 31,122, holds a pearl
 // ledger entry far past 1,000. It must still load.
 const bought={...s0.fellows.hero_1,aptitude:20000,aptitudeLedger:{policyVersion:1,entries:{'item:Item_Talent_Hero_1':{paid:19990,gain:19990}}}};
 assert.equal(validAptitudeLedger({fellows:{hero_1:bought}}),true,'a pearl ledger past 1,000 (from the uncapped build) still loads');
 assert.equal(validAdventure(withFellow(s0,'hero_1',bought)),true);
});

// ---------------------------------------------------------------------------------------------------
// RULE 12, the forward half: no stored value that holds a Power can be pushed past its validator by the
// new scale. The worst case is every Fellow at the new Aptitude cap on top of the whole maxed stack.
// ---------------------------------------------------------------------------------------------------
test('the worst reachable Power stays inside every stored-value bound that holds one',()=>{
 const c=buildCeiling();
 const capped=s=>({...s,fellows:Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,{...f,aptitude:APTITUDE_CAP}]))});
 const apk=s=>({...s,trainingCosts:s.trainingCosts||{policyVersion:2,baselineLevels:{},receipts:[]},
  originalProgression:{policyVersion:1,claims:0,stock:{},receipts:[],quality:Object.fromEntries(Object.keys(s.fellows).map(id=>[id,14]))}});
 const measured={};
 for(const [mode,s] of [['default',capped(c.state)],['apk',apk(capped(c.state))]]){
  const p=Object.keys(s.fellows).map(id=>bondedPower(s,id));
  measured[mode]={fellow:Math.max(...p),roster:p.reduce((a,b)=>a+b,0),ladder:ladderPower(s)};
 }
 for(const [mode,m] of Object.entries(measured)){
  // lib/expo.mjs validSlot stores ONE Fellow's power, bounded 1e12.
  assert.ok(m.fellow<1e12,`${mode}: one Fellow ${m.fellow} would break an Expo slot`);
  // lib/mine-clearance.mjs (1e15, one Fellow), lib/trading-post.mjs (1e15, one Fellow),
  // lib/northern.mjs (1e15, the roster sum).
  assert.ok(m.roster<1e15,`${mode}: the roster ${m.roster} would break a Northern/mine/trade receipt`);
  // lib/adventure.mjs lastBattle.power (1e18), the ladder Power.
  assert.ok(m.ladder<1e18,`${mode}: ladder Power ${m.ladder} would break lastBattle`);
 }
 // The margins, pinned: ~30x under the Expo bound for one Fellow, ~620x under 1e15 for a roster (~100x and
 // ~2,000x before 2026-09-18, when the cap was 31,122 rather than 107,198 and talent skills did not exist).
 // Step 4 (HeroStar flats and star halos): {3,402,303,856 / 166,640,887,263} and {33,044,690,146 / 1,612,475,828,631} before.
 assert.deepEqual(measured,{default:{fellow:3596507753,roster:196409182424,ladder:19640918242400},
  apk:{fellow:34971344501,roster:1910926007703,ladder:1910926007703}});
});
