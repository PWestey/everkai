import data from './talent-skill-data.json' with {type:'json'};
import {stellaEntry,stellaState,stellaTalentLimit,SPIRIT_SHARD_ITEM} from './stella.mjs';
import {SPIRIT_PROFILES} from './hero-spirit.mjs';
import {talentRule} from './talents.mjs';
import {insightRule,insightState} from './insight.mjs';
import {hasAffinity} from './public-reference.mjs';
import {originalProgression} from './original-progression.mjs';
import {familyStellaParts} from './family-stella-power.mjs';
import {familyStellaRule,familyStellaRank,familyStellaState,familyLimitBound} from './family-stella.mjs';
import {magicRule,pledgeRule,magicLevel,pledgeLevel,magicBonus,magicStage,pledgeOpen,heroAdvanceState,originRule,originLevel} from './hero-advance.mjs';
import {effectiveStar} from './hero-stars.mjs';
/** SKILL APTITUDE: every TALENT SKILL a Fellow owns in the original, not just its one Hero_Talent_Base_N.
 *  docs/power-sources-import-spec.md section 1; the tables are resolved by scripts/import-talent-skills.py.
 *
 *  WHAT THE ORIGINAL HAS AND EVERKAI DID NOT. Shinobu's panel reads "Skill 7,155": her Base_3 at L400 is
 *  1,200 of it, and the rest is nine more talent skills she owns -- the stage-M2 set Rarity Advance adds,
 *  four skills her Stella ranks 1/4/6/8 unlock (4,400 at L400), her intimacy skill (200), pledge and star
 *  skills. Everkai trained ONE skill per Fellow (lib/talents.mjs) and showed the rest as display-only.
 *
 *  THE RULE, read off the tables and asserted by the importer:
 *    value(L) = initial + (L - 1) x perLevel       an unlocked skill starts at level 1, free
 *    cap      = maxUpgradeLevel (300) + the Fellow's talentLvLimit  (Stella today; Family Stella later)
 *    price    = a constant count of one item per level: N Skill Pearls for +N (so ONE PEARL = ONE APTITUDE
 *               on every pearl skill), 100 x tier type-books for +tier on the Country skills.
 *  Pearl skills spend `Item_Talent_Hero_1` from the bag; Country skills spend the Fellow type's Insight
 *  balance -- the same `Item_Hero_Talent_Country_N` item lib/insight.mjs already stocks. The intimacy skill
 *  is never bought: its level IS the bond level with the family member the original names (HeroIntimacy-
 *  Degree.wifeItemId), which lib/bonds.mjs already has, 0..10 like the original's 10 degrees.
 *
 *  NOT COUNTED TWICE. The Fellow's own Hero_Talent_Base_N stays in lib/talents.mjs (its ledger, its cap,
 *  inside `f.aptitude`), and the Country tier I skill stays in lib/insight.mjs. Both are skipped here
 *  (`excluded`), and tests/talent-skills.test.mjs asserts it.
 *
 *  SAVES (CLAUDE.md rule 12). Nothing here writes `f.aptitude`, so APTITUDE_CAP bounds none of it and no
 *  stored Aptitude ledger depends on it. A Fellow stores only the LEVELS it has bought, `f.talentSkills =
 *  {skillId: level}`, levels >= 2 (level 1 is free once unlocked, so it is never stored). Its Aptitude is a
 *  DERIVED power part (lib/adventure.mjs powerParts `talent.skills`). The validator accepts any skill the
 *  hero can EVER own at any level up to 300 + the largest talentLvLimit its tracks can ever grant -- a bound
 *  that only depends on the tables, never on how far the Fellow has advanced, so a later refund of a Stella
 *  rank or a star can never make a stored level illegal. A skill whose unlock has been lost simply stops
 *  counting until it is unlocked again. */
export const TALENT_SKILL_SOURCE=data.sha256;
export const TALENT_SKILLS=data.skills;
export const STAR_TALENT_SKILLS=data.star;
export const SKILL_PEARL='Item_Talent_Hero_1';
const hero=id=>typeof id==='string'&&id.startsWith('hero_')?data.heroes[id.slice(5)]||null:null;
export const talentSkillHero=hero;
/** Stars as the original counts them: Everkai sells 7, HeroStar has 6 (spec 7 question 7: ★7 clamps to ★6), and
 *  since step 4 a star the Fellow's level does not yet support is inactive (lib/hero-stars.mjs effectiveStar). */
const stars=f=>effectiveStar(f);
/** Skills another module already owns. */
const excluded=id=>{const out=new Set();const h=hero(id);if(!h)return out;
 if(talentRule(id))for(const x of h.base)if(/^Hero_Talent_Base_\d$/.test(x))out.add(x);
 const ir=insightRule(id);if(ir)out.add(ir.skillId);return out;};
/** Every talent skill this hero can ever own, with how it unlocks. Built once per hero. */
const catalogue=new Map();
export function heroTalentSkills(id){
 if(catalogue.has(id))return catalogue.get(id);const h=hero(id);let out=[];
 if(h){const skip=excluded(id),seen=new Set(),add=(skill,unlock)=>{if(skip.has(skill)||seen.has(skill))return;seen.add(skill);out.push({skill,unlock})};
  for(const x of h.base)add(x,{kind:'base'});
  for(const [level,,,list] of h.magic?.stages||[])for(const x of list)add(x,{kind:'rarity',level});
  for(const [level,x] of h.magic?.advance||[])add(x,{kind:'rarity',level});
  for(const [rank,x] of h.stella||[])add(x,{kind:'stella',rank});
  data.star.forEach((x,i)=>add(x,{kind:'star',star:i+1}));
  for(const [level,x] of h.pledge?.skills||[])add(x,{kind:'pledge',level});}
 out=Object.freeze(out.map(o=>Object.freeze(o)));catalogue.set(id,out);return out;
}
const unlocked=(s,id,u)=>{const f=s.fellows[id];if(!f)return false;
 if(u.kind==='base')return true;
 if(u.kind==='rarity')return magicLevel(s,id)>=u.level;
 if(u.kind==='stella'){const e=stellaEntry(s,id);return !!e&&e.level>=u.rank;}
 if(u.kind==='star')return stars(f)>=u.star;
 if(u.kind==='pledge')return pledgeLevel(s,id)>=u.level;
 return false;};
export const talentSkillUnlocked=(s,id,skill)=>{const e=heroTalentSkills(id).find(x=>x.skill===skill);return !!e&&unlocked(s,id,e.unlock);};
/** The largest talentLvLimit any of this Fellow's tracks can ever grant -- the validator's bound. */
const maxLimit=new Map(SPIRIT_PROFILES.map(p=>[p.id,Math.max(0,...p.levels.map(r=>r.talentLimit||0),p.activation.talentLimit||0)]));
/** Every talentLvLimit reaching the Fellow: its own Stella rank and, since step 3, Family Stella's NewHalo_4. */
export const talentSkillLimit=(s,id)=>stellaTalentLimit(s,id)+familyStellaParts(s,id).limit;
export const talentSkillCap=(s,id,skill)=>(TALENT_SKILLS[skill]?.m||0)+talentSkillLimit(s,id);
export const talentSkillLevel=(s,id,skill)=>{const f=s.fellows[id];return f?.talentSkills?.[skill]||(talentSkillUnlocked(s,id,skill)?1:0);};
const value=(skill,level)=>{const r=TALENT_SKILLS[skill];return r&&level>0?r.i+(level-1)*r.l:0;};
/** The family member whose bond level is this Fellow's intimacy degree, and that degree. */
export function intimacyDegree(s,id){const i=hero(id)?.intimacy;if(!i||!s.family?.[i.wife])return 0;const b=s.bonds?.[i.wife];if(!b)return 0;
 const supports=b.original?hasAffinity(i.wife,id):b.fellow===id;return supports?Math.max(0,Math.min(10,b.level||0)):0;}
/** Every Aptitude part this module derives. Pure; nothing here is stored. */
export function talentSkillParts(s,id){
 const out={skills:0,intimacy:0,stella:0,stellaBond:0,rarity:0,stage:0};const f=s.fellows[id],h=hero(id);if(!f||!h)return out;
 for(const {skill,unlock} of heroTalentSkills(id))if(unlocked(s,id,unlock))out.skills+=value(skill,talentSkillLevel(s,id,skill));
 const deg=intimacyDegree(s,id);if(deg)out.intimacy=h.intimacy.i+(deg-1)*h.intimacy.l;
 const e=stellaEntry(s,id);if(e&&h.stellaTalent)out.stella=h.stellaTalent[Math.min(e.level,h.stellaTalent.length-1)]||0;
 // bond:<n> | talent: every Fellow in HeroBond group n receives it from every owner who has ranked it.
 if(h.bonds)for(const r of stellaState(s).history){const o=hero(r.owner);if(!o?.stellaBond||!h.bonds.includes(o.stellaBond.bond)||!s.fellows[r.owner])continue;
  if(stellaEntry(s,r.owner)!==r)continue;out.stellaBond+=o.stellaBond.values[Math.min(r.level,o.stellaBond.values.length-1)]||0;}
 out.rarity=magicBonus(id,magicLevel(s,id));
 const st=magicStage(s,id);if(st&&originalProgression(s))out.stage=Math.max(0,st[2]-h.initialTalent);
 return out;
}
/** The whole Aptitude this module adds to one Fellow. */
export const talentSkillAptitude=(s,id)=>Object.values(talentSkillParts(s,id)).reduce((a,b)=>a+b,0);
/** Where a skill's price is paid from, and how much is there. */
const wallet=(s,id,skill)=>{const r=TALENT_SKILLS[skill];if(!r)return null;
 if(r.c===SKILL_PEARL)return {kind:'bag',item:r.c,have:s.inventory?.[r.c]||0};
 const ir=insightRule(id);if(/^Item_Hero_Talent_Country_\d$/.test(r.c))return {kind:'insight',item:r.c,have:insightState(s).balances[r.c]||0,own:ir?.materialId===r.c};
 return null;};
/** @param {number|string} [amount] */
export function talentSkillPlan(s,id,skill,amount=1){
 const none={count:0,cost:0,level:talentSkillLevel(s,id,skill),item:TALENT_SKILLS[skill]?.c||null};
 const f=s.fellows[id],r=TALENT_SKILLS[skill],w=wallet(s,id,skill);if(!f||!r||!w||![1,5,25,'max'].includes(amount)||!talentSkillUnlocked(s,id,skill))return none;
 const level=talentSkillLevel(s,id,skill),cap=talentSkillCap(s,id,skill);
 const count=Math.max(0,Math.min(amount==='max'?cap:amount,cap-level,Math.floor(w.have/r.p)));
 return {count,cost:count*r.p,level:level+count,item:r.c,aptitude:count*r.l};
}
export function validTalentSkills(s){
 for(const [id,f] of Object.entries(s.fellows)){const t=f.talentSkills;if(t===undefined)continue;
  if(!t||typeof t!=='object'||Array.isArray(t)||!hero(id))return false;
  const own=new Set(heroTalentSkills(id).map(x=>x.skill)),bound=(maxLimit.get(id)||0)+familyLimitBound(id);
  for(const [skill,n] of Object.entries(t))if(!own.has(skill)||!Number.isInteger(n)||n<2||n>TALENT_SKILLS[skill].m+bound)return false;}
 return true;
}
const withSkill=(f,skill,level)=>({...f,talentSkills:{...(f.talentSkills||{}),[skill]:level}});
export function talentSkillAction(s,action,target,value){
 if(action==='trainTalentSkill'){
  const fail=error=>({state:s,error});const {skill,amount=1}=value||{};const f=s.fellows[target],r=TALENT_SKILLS[skill];
  if(!f||!r||!heroTalentSkills(target).some(x=>x.skill===skill))return fail('Choose one of this Fellow’s talent skills.');
  if(!talentSkillUnlocked(s,target,skill))return fail('This talent skill is still locked.');
  if(![1,5,25,'max'].includes(amount))return fail('Choose a talent skill training amount.');
  const p=talentSkillPlan(s,target,skill,amount);
  if(!p.count)return fail(p.level>=talentSkillCap(s,target,skill)?'This talent skill is at its level cap.':r.c===SKILL_PEARL?'Not enough Skill Pearls.':'Not enough Insight of this type.');
  const w=wallet(s,target,skill),next={...s,fellows:{...s.fellows,[target]:withSkill(f,skill,p.level)}};
  if(w.kind==='bag')next.inventory={...s.inventory,[r.c]:s.inventory[r.c]-p.cost};
  else{const i=insightState(s);next.insight={...i,balances:{...i.balances,[r.c]:i.balances[r.c]-p.cost}};}
  return {state:next,message:`Talent skill Lv. ${p.level}: +${p.aptitude.toLocaleString()} Aptitude for ${p.cost.toLocaleString()} ${r.c===SKILL_PEARL?'Skill Pearls':'Insight'}.`};
 }
 if(action==='rarityAdvance'||action==='pledgeAdvance'||action==='originBoost')return advanceAction(s,action,target,value);
 if(action==='familyStellaActivate'||action==='familyStellaUpgrade')return familyStellaAction(s,action,target,value);
 return null;
}
// ---- Rarity Advance and Pledge purchases (lib/hero-advance.mjs holds the rules and the validator) ----
/** @param {number|string} [amount] */
export function advancePlan(s,id,track,amount=1){
 const rule=track==='magic'?magicRule(id):track==='origin'?originRule(id):pledgeRule(id),level=track==='magic'?magicLevel(s,id):track==='origin'?originLevel(s,id):pledgeLevel(s,id);
 const none={count:0,cost:0,level};if(!rule||!s.fellows[id]||![1,10,'max'].includes(amount))return none;
 if(track==='pledge'&&!pledgeOpen(s,id))return none;
 const stock=stellaState(s).stock[SPIRIT_SHARD_ITEM]||0;
 const count=Math.max(0,Math.min(amount==='max'?rule.max:amount,rule.max-level,Math.floor(stock/rule.cost)));
 return {count,cost:count*rule.cost,level:level+count};
}
function advanceAction(s,action,target,amount=1){
 const fail=error=>({state:s,error}),track=action==='rarityAdvance'?'magic':action==='originBoost'?'origin':'pledge';
 if(amount==null)amount=1;
 const rule=track==='magic'?magicRule(target):track==='origin'?originRule(target):pledgeRule(target),label={magic:'Rarity Advance',pledge:'Pledge',origin:'Origin Boost'}[track];
 if(!s.fellows[target]||!rule)return fail(`This Fellow has no ${label} in the original.`);
 if(track==='pledge'&&!pledgeOpen(s,target))return fail('Raise this Fellow’s Rarity Advance first to open the Pledge.');
 if(!s.stella)return fail('Collect Stella shards first.');
 const p=advancePlan(s,target,track,amount);if(!p.count)return fail(p.level>=rule.max?'Already at the top level.':'Not enough Stella shards.');
 const t=heroAdvanceState(s),st=stellaState(s);
 return {state:{...s,stella:{...st,stock:{...st.stock,[SPIRIT_SHARD_ITEM]:st.stock[SPIRIT_SHARD_ITEM]-p.cost}},heroAdvance:{policyVersion:1,fellows:{...t.fellows,[target]:{...t.fellows[target],[track]:p.level}}}},
  message:`${label} Lv. ${p.level} for ${p.cost.toLocaleString()} Stella shards.`};
}
// ---- Family Stella (lib/family-stella.mjs holds the rules, the derived spend and the validator) ----
/** @param {number|string} [count] */
export function familyStellaPlan(s,wife,count=1){const rule=familyStellaRule(wife),rank=familyStellaRank(s,wife);
 if(!rule||rank<0||!s.family?.[wife]||![1,5,'max'].includes(count))return {count:0,cost:0,rank};
 let stock=stellaState(s).stock[SPIRIT_SHARD_ITEM]||0,cost=0,n=0;const want=count==='max'?rule.ranks.length:count;
 while(n<want&&rank+n+1<rule.ranks.length&&cost+rule.ranks[rank+n+1][0]<=stock){cost+=rule.ranks[rank+n+1][0];n++;}
 return {count:n,cost,rank:rank+n};}
function familyStellaAction(s,action,wife,value){
 const fail=error=>({state:s,error}),rule=familyStellaRule(wife),t=familyStellaState(s);
 if(!rule||!s.family?.[wife])return fail('This family member has no Family Stella in the original.');
 if(action==='familyStellaActivate'){if(familyStellaRank(s,wife)>=0)return fail('Family Stella is already active.');
  return {state:{...s,familyStella:{policyVersion:1,ranks:{...t.ranks,[wife]:0}}},message:'Family Stella activated.'};}
 if(familyStellaRank(s,wife)<0)return fail('Activate Family Stella first.');
 if(!s.stella)return fail('Collect Stella shards first.');
 const p=familyStellaPlan(s,wife,value??1);if(!p.count)return fail(p.rank>=rule.ranks.length-1?'Family Stella is at its top rank.':'Not enough Stella shards.');
 const st=stellaState(s);
 return {state:{...s,stella:{...st,stock:{...st.stock,[SPIRIT_SHARD_ITEM]:st.stock[SPIRIT_SHARD_ITEM]-p.cost}},familyStella:{policyVersion:1,ranks:{...t.ranks,[wife]:p.rank}}},
  message:`Family Stella rank ${p.rank} for ${p.cost.toLocaleString()} Stella shards.`};
}
