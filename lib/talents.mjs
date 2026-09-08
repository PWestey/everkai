import source from './default-talent-source.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import guide from './character-skill-guide.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
// Exact default skill identity determines eligibility; higher paid rows stay bounded.
const RULES={Hero_Talent_Base_1:{name:'Ordinary Talent',amount:1,cost:1,cap:12},Hero_Talent_Base_2:{name:'Outstanding Talent',amount:2,cost:2,cap:20},Hero_Talent_Base_3:{name:'Supreme Talent',amount:3,cost:3,cap:20}};
export function resolveTalentProfile(profile){
 if(profile?.category!=='fellows'||!Array.isArray(profile.skills))return null;
 const nodes=profile.skills.filter(n=>Object.hasOwn(RULES,n?.id||''));if(nodes.length!==1)return null;
 const n=nodes[0],r=RULES[n.id];return n.name===r.name&&Array.isArray(n.lines)&&n.lines.includes('Unlock: Default')&&n.lines.includes('Base cap: 300')&&n.lines.includes(`+${r.amount} Aptitude per level`)?r:null;
}
const rules=new Map(guide.profiles.map(p=>[p.id,resolveTalentProfile(p)]));
export const talentRule=id=>fellowById(id)?rules.get(id)||null:null;
export const talentLevel=f=>f.talentLevel||0;
export const talentCap=(s,id)=>originalProgression(s)&&source.heroes[id]&&talentRule(id)?source.paidCap:talentRule(id)?.cap||0;
export function validTalentLedger(s,id,f){
 const h=f.originalTalent;if(h===undefined)return talentLevel(f)<=talentRule(id).cap;
 const r=talentRule(id);if(!originalProgression(s)||!source.heroes[id]||!h||h.policyVersion!==1||!Number.isInteger(h.baseline)||h.baseline<0||h.baseline>r.cap||!Array.isArray(h.receipts)||!h.receipts.length||h.receipts.length>299)return false;
 let n=h.baseline;for(const x of h.receipts){if(!x||x.from!==n||!Number.isInteger(x.to)||x.to<=n||x.to>299||x.cost!==(x.to-n)*r.cost||x.aptitude!==(x.to-n)*r.amount)return false;n=x.to;}return n===talentLevel(f);
}
export const validTalents=s=>Object.entries(s.fellows).every(([id,f])=>(f.talentLevel===undefined&&f.originalTalent===undefined)||Number.isInteger(f.talentLevel)&&f.talentLevel>=0&&!!talentRule(id)&&f.talentLevel<=talentCap(s,id)&&validTalentLedger(s,id,f));
/** @param {number|string} [amount] */
export function talentTrainingPlan(s,id,amount='max'){
 const f=s.fellows[id],r=talentRule(id);if(!f||!r||![1,5,'max'].includes(amount))return {count:0,cost:0,aptitude:f?.aptitude||0};
 const cap=talentCap(s,id);const count=Math.max(0,Math.min(amount==='max'?cap:amount,cap-talentLevel(f),Math.floor((1000-f.aptitude)/r.amount),Math.floor(s.inventory.Item_Talent_Hero_1/r.cost)));
 return {count,cost:count*r.cost,aptitude:f.aptitude+count*r.amount};
}
export function talentAction(s,action,target,value=1){
 if(action!=='trainTalent')return null;
 if(value==null)value=1;
 const fail=error=>({state:s,error}),f=s.fellows[target],r=talentRule(target);
 if(![1,5,'max'].includes(value))return fail('Choose a talent training amount.');
 if(!f||!r)return fail('No verified talent cost is available for this Fellow.');
 if(talentLevel(f)>=talentCap(s,target))return fail('Last verified talent cost reached. Further rows are not yet documented.');
 if(f.aptitude+r.amount>1000)return fail('This upgrade would exceed the current sandbox Aptitude limit.');
 if(s.inventory.Item_Talent_Hero_1<r.cost)return fail('Not enough Skill Pearls.');
 const plan=talentTrainingPlan(s,target,value);
 const ledger=originalProgression(s)?{originalTalent:{...(f.originalTalent||{policyVersion:1,baseline:talentLevel(f)}),receipts:[...(f.originalTalent?.receipts||[]),{from:talentLevel(f),to:talentLevel(f)+plan.count,cost:plan.cost,aptitude:plan.count*r.amount}]}}:{};
 return {state:{...s,inventory:{...s.inventory,Item_Talent_Hero_1:s.inventory.Item_Talent_Hero_1-plan.cost},fellows:{...s.fellows,[target]:{...f,...ledger,aptitude:plan.aptitude,talentLevel:talentLevel(f)+plan.count}}},message:`${r.name}: +${plan.count*r.amount} Aptitude for ${plan.cost} Skill Pearls.`};
}
