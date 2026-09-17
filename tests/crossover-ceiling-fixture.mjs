// The default-mode village-earnings ceiling, built ONCE so the flag-off and flag-on numbers come from
// the same code (CLAUDE.md rule 1: both halves of a ratio come from the same source).
//
// Stages 0-3 reproduce tests/fellow-power.test.mjs's pinned ceiling exactly -- 2,269,308 -> 4,484,008
// -> 6,684,380 -> 6,965,719 -- and that reproduction IS the positive control for anything measured on
// top of it (CLAUDE.md rule 2). The flag-on variant adds stage 4: the crossover Fellows this build
// actually ships, recruited at the counter and maxed like the rest, and the 30 crossover Family
// welcomed and trained on the shipped default 36/24 blessing ladder.
//
// Imported by tests/crossover-family.test.mjs (no flag) and tests/crossover-family-village.mjs
// (?crossover=1, in its own process because the catalogue reads the flag once at import).
import {withItems,grantFragments,allKeepsakes,stockConsumable} from './progression-helpers.mjs';
import {startingSave,act,valid,refusedBy} from '../lib/game.mjs';
import {rosterOperation} from '../lib/businesses.mjs';
import {GEAR,STAR_CAP,CONSUMABLES,newFellow} from '../lib/adventure.mjs';
import {ARTIFACT_CAP} from '../lib/artifacts.mjs';
import {ARTIFACT_ECHOES} from '../lib/artifact-echo.mjs';
import {STELLA_PROFILES,stellaState,stellaActivation} from '../lib/stella.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';

const NOW=1767225600000;                 // the same fixed day tests/fellow-power.test.mjs uses
const BEST=GEAR.slice().sort((a,b)=>b.aptitude-a.aptitude)[0];
const maybe=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);return r.error?s:r.state};
const maxedRecords=s=>({...s,fellows:Object.fromEntries(Object.keys(s.fellows).map(id=>
 [id,{level:750,aptitude:1000,skill:20,breaks:13,gear:BEST.id,stars:STAR_CAP,gearLevel:ARTIFACT_CAP}]))});
const FRESH_FAMILY={intimacy:0,blessingPower:10,points:0,skill:0,relationship:1};

/** @param {{crossover?:boolean,family?:boolean}} options `family:false` seats the crossover FELLOWS
 *  but not the 30 crossover Family, which is what isolates the Family blessing contribution. */
export function buildCeiling({crossover=false,family=true}={}){
 const notes={};
 let s=maybe(startingSave(NOW),'recruitAll');
 if(crossover){
  // The crossover FELLOWS this build ships. They are the only recipients a crossover Family member
  // blesses, and blessingPower is summed per Fellow IN THE ROSTER -- so without them in s.fellows the
  // Family side contributes exactly zero to rosterOperation and the measurement would be vacuous.
  // recruitAll deliberately skips additions (their storyline is the unlock), so the counter is used.
  s={...s,summon:{policyVersion:1,seq:0,stoneFragments:0,stones:0,insigniaFragments:0,valiant:99,archangel:99,starShards:0,days:[],weeks:[],recruited:[]}};
  for(const f of FELLOWS.filter(f=>f.addition)){
   const before=s;s=maybe(s,'summonRecruit',f.id,{seq:s.summon.seq});
   if(s===before)s={...s,fellows:{...s.fellows,[f.id]:newFellow()}};
  }
  notes.crossoverFellows=FELLOWS.filter(f=>f.addition).length;
 }
 s=maxedRecords(s);
 s=maybe(allKeepsakes(s),'acceptMuseum');
 s=maybe(s,'adoptFamiliars');
 let bound=0;
 for(const pet of Object.keys(s.familiars||{})){
  const fellow=Object.keys(s.fellows)[bound];if(!fellow)break;
  const next=maybe(s,'bindFamiliar',pet,fellow);
  if(next!==s){s=maybe(next,'activateFamiliarNodes',pet);bound++}
 }
 s={...s,familiars:Object.fromEntries(Object.entries(s.familiars).map(([id,p])=>[id,{...p,level:Math.max(450,p.level)}]))};
 const stage0=Math.round(rosterOperation(s));

 // Stage 1 -- STELLA.
 for(const p of STELLA_PROFILES.filter(p=>s.fellows[p.id]&&stellaActivation(p.id))){
  s=maybe(s,'stellaActivate',p.id,{seq:stellaState(s).seq});
  for(let i=0;i<200;i++){
   s=grantFragments(s,p.id);
   const before=s;s=maybe(s,'stellaUpgrade',p.id,{seq:stellaState(s).seq,count:'max'});
   if(s===before)break;
  }
 }
 const stage1=Math.round(rosterOperation(s));

 // Stage 2 -- BLESSINGS. welcomeAll seats the ORIGINAL family only.
 s=maybe(s,'welcomeAll');
 notes.originalFamily=Object.keys(s.family).length;
 if(crossover&&family){
  // The 30 are minted rather than welcomed, because `welcome` refuses an addition on purpose (the
  // storyline is the unlock) and no crossover arc data exists yet. This is the SAME five-integer
  // record lib/events.mjs writes when a stage hands one over, so it is the state a real unlock
  // produces -- and valid() is asserted below on the finished save rather than assumed.
  s={...s,family:{...s.family,...Object.fromEntries(FAMILY.filter(f=>f.addition).map(f=>[f.id,{...FRESH_FAMILY}]))}};
  notes.crossoverFamily=FAMILY.filter(f=>f.addition).length;
 }
 const points=CONSUMABLES.find(i=>i.stat==='points'&&i.target==='family');
 s=stockConsumable(s,points.id,4000);
 let funded=0;
 for(const id of Object.keys(s.family)){
  const before=s;s=maybe(s,'useConsumable',points.id,{recipient:id,count:10});
  if(s!==before)funded++;
 }
 let trained=0;
 for(const id of Object.keys(s.family))for(const key of ['flatBlessing','advancedBlessing']){
  const before=s;s=maybe(s,'trainBlessingsMax',id,key);if(s!==before)trained++;
 }
 notes.funded=funded;notes.trained=trained;
 const stage2=Math.round(rosterOperation(s));

 // Stage 3 -- ARTIFACT ECHOES.
 let enabled=0;
 for(const r of ARTIFACT_ECHOES.filter(r=>r.fellow&&s.fellows[r.fellow]&&GEAR.some(g=>g.id===r.item))){
  s={...s,fellows:{...s.fellows,[r.fellow]:{...s.fellows[r.fellow],gear:r.item,gearLevel:ARTIFACT_CAP}}};
  const before=s;s=maybe(s,'enableArtifactEcho',r.fellow);if(s!==before)enabled++;
 }
 notes.echoes=enabled;
 const ceiling=Math.round(rosterOperation(s));
 return {stage0,stage1,stage2,ceiling,valid:valid(s),refusedBy:refusedBy(s),notes,state:s};
}
/** The reference point every ratio in this file is taken against: the total Fellow power on the
 *  original's own live save, divided by its own recovered HeroConversionRate. Both halves come from
 *  the original (docs/slice-buildings.md 1), and the other half of the ratio is Everkai's own
 *  rosterOperation -- so it compares Everkai's reach to the original's, not two sources. */
export const ORIGINAL_LIVE_SAVE=3497276;
export const withItemsHelper=withItems;
