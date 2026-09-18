// Child process for tests/crossover-family.test.mjs. The catalogue reads ?crossover=1 once at import,
// so everything flag-on has to happen in its own process. Prints one JSON line.
//
// It drives the WHOLE Family loop on a crossover member -- welcomed through a storyline stage, gifted,
// dated, bonded, blessed, taken on a trip, her child enrolled and graduated -- then hands the save to
// the flag-off parent, which must load it with her progress intact (docs/crossover-family-plan.md 5.3).
// It also measures the flag-on earnings ceiling and the Fathom exclusion.
globalThis.location={search:'?crossover=1'};
const T=new Date('2026-09-16T09:00:00').getTime();
const {fresh,startingSave,act,valid,refusedBy,decode}=await import('../lib/game.mjs');
const {starterHabits}=await import('../lib/habits.mjs');
const {EVENTS,CROSSOVER_EVENTS,costPerStage,completionsEarned,stagePerson}=await import('../lib/events.mjs');
const {FAMILY,ORIGINAL_FAMILY,familyById,familyCatalogue,FELLOWS:FELLOW_CATALOGUE}=await import('../lib/catalog.mjs');
const {FATHOM_SLOTS,MAX_TIER,fathomBonus,openSlots,fathomsApply}=await import('../lib/fathoms.mjs');
const {blessingRecipients,blessingPower,blessingPlan,BLESSINGS}=await import('../lib/blessings.mjs');
const {bondedPower:bondedPowerAt}=await import('../lib/adventure.mjs');
const {familyBonus}=await import('../lib/progression.mjs');
const {recruitOffers}=await import('../lib/summon.mjs');
const {TRIPS}=await import('../lib/family-trips.mjs');
const {PUPIL_TYPES}=await import('../lib/school.mjs');
const {buildCeiling,ORIGINAL_LIVE_SAVE_PACING,ORIGINAL_SPIRIT_TABLE_MAX}=await import('./crossover-ceiling-fixture.mjs');
const {HABIT_DOMAINS}=await import('../lib/habits.mjs');

const ID='xover_msf_jeangrey';
// Her REAL shipped arc, looked up rather than named, so a regenerated lib/crossover-arc-data.json
// moves this fixture with it. This used to be a synthetic arc pushed onto EVENTS in this process only
// -- which meant the flag-off parent could not resolve it and had to check the rule-12 round trip
// against a save with the `events` subtree stripped. With the 33 arcs shipped there is nothing
// synthetic left: the whole save, ledger included, is handed to the parent as it stands.
const ARC_EVENT=CROSSOVER_EVENTS.find(e=>e.stages.some(st=>st.member===ID));
if(!ARC_EVENT)throw new Error(`${ID} is in no crossover arc`);
const ARC=ARC_EVENT.id,COST=ARC_EVENT.costPerStage;
const STEP=ARC_EVENT.stages.findIndex(st=>st.member===ID)+1;
if(STEP!==1)throw new Error(`${ID} is step ${STEP} of ${ARC}; this fixture claims stage 1`);
if(EVENTS.indexOf(ARC_EVENT)<0)throw new Error(`${ARC} is not in EVENTS`);

const out={};
const log=[];
let s={...fresh(T),habits:starterHabits(T)};
const step=(action,target,value)=>{const r=act(s,action,s.lastAt,target,value);log.push({action,target,error:r.error||null,message:r.message||null});if(!r.error)s=r.state;return r};

out.listedFamily=FAMILY.length;
out.originalFamily=ORIGINAL_FAMILY.length;
out.appendOnly=JSON.stringify(familyCatalogue(true).slice(0,ORIGINAL_FAMILY.length).map(f=>f.id))===JSON.stringify(ORIGINAL_FAMILY.map(f=>f.id));
out.listed=FAMILY.some(f=>f.id===ID);
out.stageResolves=stagePerson({member:ID,kind:'family'})?.name||null;
out.recipients=blessingRecipients(s,ID);
// welcomeAll / welcome must NOT hand a crossover member over: the storyline is the unlock.
out.welcomeAll=(()=>{const r=act(s,'welcomeAll',s.lastAt);return {granted:Object.keys(r.state?.family||{}).filter(id=>familyById(id)?.addition),count:Object.keys(r.state?.family||{}).length}})();
out.welcomeTargeted=act(s,'welcome',s.lastAt,ID).error||null;

// Earn the arc's completions, then claim the stage.
for(let day=0;completionsEarned(s)<COST&&day<900;day++){
 const at=T+day*86400000;
 for(const h of s.habits.items.filter(x=>x.freq==='daily')){
  if(completionsEarned(s)>=COST)break;
  const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
 }
}
step('eventClaim',ARC);
out.owned=!!s.family[ID];
out.inFellows=!!s.fellows[ID];
out.spent=s.events?.spent??null;
out.costPerStage=costPerStage(ARC);

// The whole relationship loop. Gold, Crystals and Blessing Points are stocked directly -- how they
// are earned has its own coverage; what is under test is that every Family system accepts HER id.
s={...s,gold:1000000,crystals:100000};
for(let i=0;i<60;i++)step('buyGift','gift1');
step('giftBatch',ID,{giftId:'gift1',count:50});
step('gift',ID,'gift3');
step('date',null,0.0);
step('relationship',ID);
s={...s,family:{...s.family,[ID]:{...s.family[ID],points:1000000}}};
step('bless',ID);
step('trainBlessing',ID,'flatBlessing');
step('trainBlessingsMax',ID,'advancedBlessing');
step('trainBlessingsMax',ID,'flatBlessing');
step('bondAssign',ID,'hero_15');
step('familyTrip',ID,TRIPS[0].id);
step('enroll',ID,PUPIL_TYPES[0].id);
out.pupils=(s.school?.pupils||[]).map(p=>p.caretaker);
out.blessingPowerToRecipient=blessingPower(s,out.recipients[0]);
out.blessingPowerToOriginal=blessingPower(s,'hero_15');
// Fathoms must refuse her BY NAME, not through the intimacy gate she can never pass.
out.fathomRefusal=act(s,'fathomAdvance',s.lastAt,ID,1).error||null;
out.fathomsApply=fathomsApply(ID);
out.openSlots=openSlots(s,ID);

out.member=s.family[ID]||null;
out.familyKeys=Object.keys(s.family);
out.valid=valid(s);
out.refusedBy=refusedBy(s);
out.save=JSON.stringify(s);
out.arc=ARC;
// NEGATIVE CONTROL for the parent's "nothing was quarantined" claim: the same save whose ledger names
// an arc nothing ships. The parent must see `events` dropped there and nowhere else -- otherwise
// "nothing was quarantined" could simply mean decode() never quarantines anything.
out.saveUnknownArc=JSON.stringify({...s,events:{...s.events,claimed:{XoverMsf99:1}}});
out.log=log;
out.errors=log.filter(x=>x.error);
// A crossover member may NOT hold an apkBlessings record, in either mode, so her ladder stops at 36/24.
out.apkBlessings=s.family[ID].apkBlessings??null;
out.ladderCap=(()=>{const f={...s.family[ID],points:1e9,flatBlessing:0,advancedBlessing:0};
 const apk={...s,originalProgression:{policyVersion:1,dailyClaims:0,stock:{}}};
 return {classic:BLESSINGS.flatBlessing.values.length-1,
  planDefault:blessingPlan(f,'flatBlessing',s,700,ID).level,
  planApkMode:blessingPlan(f,'flatBlessing',apk,700,ID).level,
  planApkModeOriginal:blessingPlan(f,'flatBlessing',apk,700,'wife_2').level}})();
// The tampering negative control, flag-on: an apkBlessings record on an addition must be refused.
out.apkOnAdditionRefused=(()=>{const bad={...s,family:{...s.family,[ID]:{...s.family[ID],apkBlessings:{flatBlessing:{policyVersion:1,level:0,value:0,legacyRecipients:[],recipients:[...out.recipients],receipts:[{from:0,to:1,cost:100}]}}}}};
 return !valid(bad)})();

// ---- Fathoms: the 321.0 -> 411.0 inflation must not happen. -----------------------------------
// Minted, like docs/crossover-family-plan.md 2.3: every member at full intimacy, every slot at
// MAX_TIER, and lifetime habit actions past the last slot's gate. This pins ARITHMETIC, not a legal
// save -- validFathoms cannot store a crossover tier at all, which is asserted separately below.
{
 const all=Object.fromEntries(familyCatalogue(true).map(f=>[f.id,{intimacy:1e6,blessingPower:10,points:0,skill:20,relationship:1}]));
 const tiers=Object.fromEntries(Object.keys(all).map(id=>[id,Object.fromEntries(FATHOM_SLOTS.map(x=>[x.slot,MAX_TIER]))]));
 const totals=Object.fromEntries(HABIT_DOMAINS.map(k=>[k,{actions:1000,completions:0,gold:0}]));
 const minted={...startingSave(T),family:all,habits:{...starterHabits(T),totals},fathoms:{policyVersion:1,day:'',used:0,tiers}};
 out.fathom={members:Object.keys(all).length,
  diligent:fathomBonus(minted,'Diligent'),
  familyBonus:familyBonus(minted),
  additionsOpen:familyCatalogue(true).filter(f=>f.addition).reduce((n,f)=>n+openSlots(minted,f.id),0),
  storedCrossoverTierRefused:!valid({...minted,fathoms:{policyVersion:1,day:'',used:0,tiers:{[ID]:{1:1}}}})};
}

// ---- The village-earnings ceiling, flag on. ---------------------------------------------------
{
 // Two flag-on states, so the Family contribution is ISOLATED rather than mixed with the crossover
 // Fellows' own power: `fellowsOnly` seats the crossover Fellows and no crossover Family.
 const fellowsOnly=buildCeiling({crossover:true,family:false});
 const c=buildCeiling({crossover:true});
 const trim=r=>({stage0:r.stage0,stage1:r.stage1,stage2:r.stage2,stage3:r.stage3,stage4:r.stage4,ceiling:r.ceiling,crossoverWorth:r.crossoverWorth,village:r.village,fellow:r.fellow,valid:r.valid,refusedBy:r.refusedBy,notes:r.notes});
 // 133 crossover Fellows are too many to pin one by one, so the distribution is recorded instead: how
 // many of them a crossover Family member blesses at all, and the flat/percent totals grouped. The two
 // shipped prototypes keep their own named entry, because they are the rows whose numbers were
 // measured by hand when this fixture was written.
 const xoverFellows=Object.keys(c.state.fellows).filter(id=>id.startsWith('xover_'));
 const blessed=xoverFellows.map(id=>[id,blessingPower(c.state,id)]);
 const shape=JSON.stringify;
 const buckets={};
 for(const [,p] of blessed)buckets[shape(p)]=(buckets[shape(p)]||0)+1;
 // The per-TYPE Stella percent a crossover Fellow inherits. stellaBonus sums the percent of every
 // Stella entry of the SAME TYPE (lib/stella.mjs:58), and a crossover Fellow has no entry of its own,
 // so its type decides a multiplier on its WHOLE power -- which is why the ceiling is not linear in the
 // blessing count and why re-cutting the recipient lists moves it at all.
 const {stellaBonus}=await import('../lib/stella.mjs');
 const stellaByType={};
 for(const f of FELLOW_CATALOGUE.filter(f=>f.addition))stellaByType[f.type]??=stellaBonus(c.state,f.id).percent;
 const powerByType={};
 for(const f of FELLOW_CATALOGUE.filter(f=>f.addition))powerByType[f.type]??=bondedPowerAt(c.state,f.id);
 out.ceiling={...trim(c),fellowsOnly:trim(fellowsOnly),
  stellaPercentByType:stellaByType,
  maxedPowerByType:powerByType,
  blessingCounts:(()=>{const h={};for(const id of xoverFellows){const k=Math.round(blessingPower(c.state,id).flat/159000);h[k]=(h[k]||0)+1}return h})(),
  ratio:+(c.ceiling/ORIGINAL_LIVE_SAVE_PACING).toFixed(4),   // a PACING check, not a parity target -- see the constant
  vsTableMax:+(c.ceiling/ORIGINAL_SPIRIT_TABLE_MAX).toFixed(3),
  // The maxed-crossover-vs-maxed-original comparison the equivalent bonus track is sized against
  // (docs/crossover-plan.md order of work 6). Both halves are bondedPower on the SAME finished state.
  ...(()=>{const st=c.state,q=(a,f)=>a[Math.floor((a.length-1)*f)];
   const pow=ids=>ids.map(id=>bondedPowerAt(st,id)).sort((a,b)=>a-b);
   const px=pow(Object.keys(st.fellows).filter(id=>id.startsWith('xover_')));
   const po=pow(Object.keys(st.fellows).filter(id=>!id.startsWith('xover_')));
   const byType={};for(const f of FELLOW_CATALOGUE.filter(f=>!f.addition))(byType[f.type]??=[]).push(bondedPowerAt(st,f.id));
   return {maxedCrossover:{min:px[0],median:q(px,.5),max:px.at(-1)},
    maxedOriginal:{min:po[0],q25:q(po,.25),median:q(po,.5),q75:q(po,.75),max:po.at(-1)},
    maxedOriginalByType:Object.fromEntries(Object.entries(byType).map(([k,v])=>[k,q(v.sort((a,b)=>a-b),.5)]))}})(),
  original:ORIGINAL_LIVE_SAVE_PACING,
  tableMax:ORIGINAL_SPIRIT_TABLE_MAX,
  familyBlessingWorth:c.ceiling-fellowsOnly.ceiling,
  crossoverFellowsInRoster:xoverFellows.length,
  blessedCrossoverFellows:blessed.filter(([,p])=>p.flat>0||p.percent>0).length,
  blessingBuckets:Object.fromEntries(Object.entries(buckets).map(([k,n])=>[k,n])),
  perCrossoverFellowBlessing:Object.fromEntries(blessed.filter(([id])=>
   ['xover_msf_spiderman','xover_swgoh_vaderduelsend'].includes(id))),
  pairings:FAMILY.filter(f=>f.addition).reduce((n,f)=>n+blessingRecipients(c.state,f.id).length,0),
  familyLadderMax:Math.max(...FAMILY.filter(f=>f.addition).map(f=>Math.max(c.state.family[f.id].flatBlessing||0,0))),
 };
}
console.log(JSON.stringify(out));
