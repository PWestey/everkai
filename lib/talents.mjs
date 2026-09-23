import source from './default-talent-source.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import guide from './character-skill-guide.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
import {hasCrossoverAbilities,CROSSOVER_TALENT_RULE} from './crossover-abilities.mjs';
import {stellaTalentLimit} from './stella.mjs';
import {familyStellaParts} from './family-stella-power.mjs';
import {APTITUDE_CAP} from './aptitude-cap.mjs';
import {isBatchAmount} from './batch-amounts.mjs';
// Exact default skill identity determines eligibility; higher paid rows stay bounded.
const RULES={Hero_Talent_Base_1:{name:'Ordinary Talent',amount:1,cost:1,cap:12},Hero_Talent_Base_2:{name:'Outstanding Talent',amount:2,cost:2,cap:20},Hero_Talent_Base_3:{name:'Supreme Talent',amount:3,cost:3,cap:20}};
export function resolveTalentProfile(profile){
 if(profile?.category!=='fellows'||!Array.isArray(profile.skills))return null;
 const nodes=profile.skills.filter(n=>Object.hasOwn(RULES,n?.id||''));if(nodes.length!==1)return null;
 const n=nodes[0],r=RULES[n.id];return n.name===r.name&&Array.isArray(n.lines)&&n.lines.includes('Unlock: Default')&&n.lines.includes('Base cap: 300')&&n.lines.includes(`+${r.amount} Aptitude per level`)?r:null;
}
const rules=new Map(guide.profiles.map(p=>[p.id,resolveTalentProfile(p)]));
/** A CROSSOVER Fellow's tier is fixed rather than read from a guide profile it does not have, and
 *  fixed rather than climbing with its badge: validTalentLedger below re-derives every stored receipt
 *  from the CURRENT rule, so a tier that moved would refuse a save that had already trained a talent.
 *  It costs nothing to hold it still -- every tier is 1 Skill Pearl per Aptitude point (the table
 *  above: 1/1, 2/2, 3/3) and aptitudeTrainingPlan sells points directly at the same 1:1 rate to the
 *  same 1,000 cap -- so the tier decides clicks and the default-mode tier cap, never the price.
 *  lib/crossover-progression-data.json carries the id and the whole argument. */
export const crossoverTalentRule=()=>RULES[CROSSOVER_TALENT_RULE]||null;
export const talentRule=id=>hasCrossoverAbilities(id)?crossoverTalentRule():fellowById(id)?rules.get(id)||null:null;
/** Is this Fellow eligible for the APK-growth paid cap? For an original that is a row in
 *  lib/default-talent-source.json (176 rows, recovered read-only); a crossover Fellow has no row there
 *  and must not be added to one, so its own fixed rule answers instead -- the same answer its template
 *  gave, so no save's talentCap moves. */
export const talentPaidCap=id=>hasCrossoverAbilities(id)?!!crossoverTalentRule():!!source.heroes[id];
export const talentLevel=f=>f.talentLevel||0;
/** THE SPIRIT TALENT-CAP RAISE (imported 2026-09-18). 57 of the original's 126 Spirit tracks grant
 *  `self | talentLvLimit`: +50 at one rank and +100 at a later one, to the OWNER'S OWN talent level cap.
 *  Scope `self`, so it reaches nobody else, and it is a CAP rather than a term -- it grants no Aptitude
 *  by itself, it only lets the Fellow keep buying levels at the same price from the same faucet.
 *
 *  WHAT IT IS ACTUALLY WORTH, measured rather than assumed, because two other bounds sit in front of
 *  it: `talentTrainingPlan` stops at `(1000 - aptitude) / amount` and validAdventure caps aptitude at
 *  1,000. So a Supreme Talent Fellow (+3 Aptitude a level) runs out of Aptitude at about level 330 and
 *  can use only ~31 of the 100; an Ordinary Talent Fellow (+1) uses all 100. The raise is therefore
 *  self-limiting against a cap this change deliberately does NOT touch -- raising the Aptitude cap is
 *  docs/power-parity-audit.md step 5 and a separate decision.
 *  SUPERSEDED 2026-09-18: that Aptitude cap is now the original's own measured ceiling, 31,122
 *  (lib/aptitude-cap.mjs), so the whole raise is usable by every talent tier and the bound in front of it
 *  is the talent LEVEL cap alone -- which is the original's rule.
 *
 *  SAFE FOR SAVES BY CONSTRUCTION (CLAUDE.md rule 12): a cap that only ever WIDENS cannot refuse a
 *  stored talentLevel that was legal before, and nothing is recomputed from the old cap. The one place
 *  that had to move with it is validTalentLedger's receipt bound, which was the literal 299. */
// + Family Stella's NewHalo_4 (2026-09-18, lib/family-stella.mjs): another talentLvLimit reaching the Fellow, so
// another WIDENING of the same cap; validTalentLedger reads the live cap and so widens with it.
export const talentCap=(s,id)=>(originalProgression(s)&&talentPaidCap(id)&&talentRule(id)?source.paidCap:talentRule(id)?.cap||0)+(talentRule(id)?stellaTalentLimit(s,id)+familyStellaParts(s,id).limit:0);
export function validTalentLedger(s,id,f){
 const h=f.originalTalent;if(h===undefined)return talentLevel(f)<=talentRule(id).cap;
 // The bound was the literal 299 -- `source.paidCap`, written out twice. A Spirit track's
 // `talentLvLimit` raises that cap by up to 100 (talentCap above), so a hard 299 would have refused a
 // save whose Fellow legally trained past it: the ledger check is the ONE derived value that had to
 // move with the cap (CLAUDE.md rule 12 -- the rows did not change, the bound computed from them did).
 // It reads the live cap, so it widens with the ladder and never with anything else, and a receipt
 // written under the old 299 is still inside it.
 const r=talentRule(id),cap=talentCap(s,id);if(!originalProgression(s)||!talentPaidCap(id)||!h||h.policyVersion!==1||!Number.isInteger(h.baseline)||h.baseline<0||h.baseline>r.cap||!Array.isArray(h.receipts)||!h.receipts.length||h.receipts.length>cap)return false;
 let n=h.baseline;for(const x of h.receipts){if(!x||x.from!==n||!Number.isInteger(x.to)||x.to<=n||x.to>cap||x.cost!==(x.to-n)*r.cost||x.aptitude!==(x.to-n)*r.amount)return false;n=x.to;}return n===talentLevel(f);
}
export const validTalents=s=>Object.entries(s.fellows).every(([id,f])=>(f.talentLevel===undefined&&f.originalTalent===undefined)||Number.isInteger(f.talentLevel)&&f.talentLevel>=0&&!!talentRule(id)&&f.talentLevel<=talentCap(s,id)&&validTalentLedger(s,id,f));
/** @param {number|string} [amount] */
export function talentTrainingPlan(s,id,amount='max'){
 const f=s.fellows[id],r=talentRule(id);if(!f||!r||!isBatchAmount(amount))return {count:0,cost:0,aptitude:f?.aptitude||0};
 const cap=talentCap(s,id);const count=Math.max(0,Math.min(amount==='max'?cap:amount,cap-talentLevel(f),Math.floor((APTITUDE_CAP-f.aptitude)/r.amount),Math.floor(s.inventory.Item_Talent_Hero_1/r.cost)));
 return {count,cost:count*r.cost,aptitude:f.aptitude+count*r.amount};
}
export function talentAction(s,action,target,value=1){
 if(action!=='trainTalent')return null;
 if(value==null)value=1;
 const fail=error=>({state:s,error}),f=s.fellows[target],r=talentRule(target);
 if(!isBatchAmount(value))return fail('Choose a talent training amount.');
 if(!f||!r)return fail('No verified talent cost is available for this Fellow.');
 if(talentLevel(f)>=talentCap(s,target))return fail('Last verified talent cost reached. Further rows are not yet documented.');
 if(f.aptitude+r.amount>APTITUDE_CAP)return fail('This upgrade would exceed the current sandbox Aptitude limit.');
 if(s.inventory.Item_Talent_Hero_1<r.cost)return fail('Not enough Skill Pearls.');
 const plan=talentTrainingPlan(s,target,value);
 const ledger=originalProgression(s)?{originalTalent:{...(f.originalTalent||{policyVersion:1,baseline:talentLevel(f)}),receipts:[...(f.originalTalent?.receipts||[]),{from:talentLevel(f),to:talentLevel(f)+plan.count,cost:plan.cost,aptitude:plan.count*r.amount}]}}:{};
 return {state:{...s,inventory:{...s.inventory,Item_Talent_Hero_1:s.inventory.Item_Talent_Hero_1-plan.cost},fellows:{...s.fellows,[target]:{...f,...ledger,aptitude:plan.aptitude,talentLevel:talentLevel(f)+plan.count}}},message:`${r.name}: +${plan.count*r.amount} Aptitude for ${plan.cost} Skill Pearls.`};
}
