import {stellaRule,stellaEntry,stellaBonus,stellaAppointBp,stellaTalentLimit} from './stella.mjs';
import {SPIRIT_UNMODELLED} from './hero-spirit.mjs';
import {talentSkillParts,heroTalentSkills,talentSkillLevel,talentSkillUnlocked,TALENT_SKILLS} from './talent-skills.mjs';
import {familyStellaParts} from './family-stella-power.mjs';
import {bondedPower,powerParts} from './adventure.mjs';
/** STELLA "ATTRIBUTES" -- the accumulated-totals view the original shows and Everkai did not
 *  (docs/character-systems-gap.md 2.3, ranked third; docs/power-parity-audit.md 1.4).
 *
 *  THIS IS A VIEW, NOT A MECHANIC. Nothing here is stored, nothing here is new value, and every number
 *  is read from the same functions the power model reads. The gap it closes is legibility: the Stella
 *  tab shows what the NEXT rank adds, and Stella is ~58% of a developed Fellow's Power, so the largest
 *  term on the screen was the one term with no running total anywhere. The original's own panel is no
 *  better -- it hides `percent/underlingskillpower` entirely -- so this deliberately shows more than
 *  the original does rather than reproducing its omission.
 *
 *  THE CATEGORIES ARE THE ORIGINAL'S OWN, from HeroSpirit's five modelled columns
 *  (lib/hero-spirit-data.json `modelled`): `flat` self/atk extradd, `selfPercent` self/atk percent,
 *  `percent` country/atk percent, `appointPercent` all/appoint percent, `talentLimit`
 *  self/talentLvLimit -- plus the two effect kinds a rank can carry, SkillAddProp and SkillAddHalo,
 *  which is where the unlocked aptitude skills come from ("New Aptitude Skill" on the original's popup).
 *
 *  REACHING vs OWNED is the distinction the running total has to make and the per-rank view cannot.
 *  `selfPercent` and `flat` are this Fellow's own row. `typedPercent` is summed over every owner of her
 *  TYPE, so it lands on a Fellow who has bought nothing. `appointBp` is account-wide and does not touch
 *  Power at all -- it multiplies the appointment term in lib/operations.mjs. `bondAptitude` arrives
 *  from other owners' bond halos. Each is labelled with where it came from.
 *
 *  WHAT IS HELD IS NAMED, not silently dropped: `held` is this Fellow's own `unmodelledMax` from the
 *  import -- `self | talent` (17 heroes, up to +2,050, blocked on the Aptitude cap) and the bond
 *  columns (no group-membership axis exists). A player can see that a number is being withheld. */
const round2=n=>Math.round(n*100)/100;
export function stellaAttributes(s,id){
 const f=s?.fellows?.[id];if(!f)return null;
 const rule=stellaRule(id),entry=stellaEntry(s,id);
 const bonus=stellaBonus(s,id),parts=talentSkillParts(s,id),family=familyStellaParts(s,id);
 // Every aptitude skill this Fellow owns BECAUSE of a Stella rank -- the original's "New Aptitude Skill".
 const unlocks=heroTalentSkills(id).filter(x=>x.unlock.kind==='stella').map(x=>({
  skill:x.skill,rank:x.unlock.rank,open:talentSkillUnlocked(s,id,x.skill),
  level:talentSkillLevel(s,id,x.skill),cap:TALENT_SKILLS[x.skill]?.m??0,
  aptitude:talentSkillUnlocked(s,id,x.skill)
   ?(TALENT_SKILLS[x.skill]?.i??0)+(talentSkillLevel(s,id,x.skill)-1)*(TALENT_SKILLS[x.skill]?.l??0):0}));
 return {
  rank:entry?entry.level:null,ranks:rule?rule.levels.length:0,name:rule?.name??null,
  power:{
   // The `flat` bucket: this Fellow's own accumulated flat Power. The original calls it Attribute Boost.
   flat:bonus.flat,
   // Two scopes of ONE percent bucket. They add; they never nest (lib/stella.mjs stellaBonus).
   selfPercent:round2(bonus.selfPercent),typedPercent:round2(bonus.typedPercent),
   percent:round2(bonus.percent),
   // What all of it is actually worth on this Fellow right now, measured the only honest way: the
   // power model with Stella in it, against the same model with Stella's own row emptied. Both halves
   // from the same save and the same function (rule 1).
   worth:stellaWorth(s,id),
  },
  aptitude:{own:parts.stella,bond:parts.stellaBond,familyStella:family.talent,
            total:parts.stella+parts.stellaBond+family.talent},
  limit:{stella:stellaTalentLimit(s,id),familyStella:family.limit,
         total:stellaTalentLimit(s,id)+family.limit},
  // Account-wide, and NOT Power. It multiplies business earnings through lib/operations.mjs.
  appoint:{bp:stellaAppointBp(s),multiplier:round2(1+stellaAppointBp(s)/10000)},
  unlocks,
  held:SPIRIT_UNMODELLED[id]||{},
 };
}
/** What this Fellow's OWN Stella row is worth in Power right now: her Power as it stands, less her
 *  Power with her own accumulated flat and self-percent removed. The typed percent is deliberately NOT
 *  removed -- it comes from other owners and she would still have it. */
export function stellaWorth(s,id){
 const now=bondedPower(s,id);
 const entry=stellaEntry(s,id);
 if(!entry)return 0;
 const without={...s,stella:{...s.stella,history:s.stella.history.filter(r=>r.owner!==id)}};
 return now-bondedPower(without,id);
}
/** The same shape for the NEXT rank, so the totals view can say what one more rank adds without the
 *  player doing the arithmetic. Null when there is no next rank. */
export function stellaNextRank(s,id){
 const rule=stellaRule(id),entry=stellaEntry(s,id);
 if(!rule)return null;
 // levels[0] is rank 1, so `levels[at]` is the row after rank `at`. An inactive track's next step is
 // the free ACTIVATION, which carries the original's own rank-0 values and is not in `levels`.
 const at=entry?entry.level:-1,next=at<0?rule.activation:rule.levels[at];
 if(!next)return null;
 const now=entry||{flat:0,percent:0,selfPowerBp:0,appointYieldBp:0,talentLimit:0};
 return {level:at+1,cost:next.cost,
         flat:next.flat-(now.flat||0),
         percent:next.percent-(now.percent||0),
         selfPercent:round2((next.selfPowerBp-(now.selfPowerBp||0))/100),
         appointPercent:round2((next.appointYieldBp-(now.appointYieldBp||0))/100),
         talentLimit:next.talentLimit-(now.talentLimit||0)};
}
/** The share of a Fellow's whole Power that the Stella BUCKETS carry, for the headline line. Read off
 *  powerParts' own named parts so it can never drift from the model. */
export function stellaShare(s,id){
 const p=powerParts(s,id);
 const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
 return {flat:p.flat.stella||0,flatTotal:sum(p.flat),
         percent:p.percent.stella||0,percentTotal:sum(p.percent),
         aptitude:(p.talent.stellaTalent||0)+(p.talent.stellaBond||0)+(p.talent.familyStella||0),
         aptitudeTotal:sum(p.talent)};
}
