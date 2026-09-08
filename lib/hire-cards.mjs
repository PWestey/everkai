import data from './hire-card-data.json' with {type:'json'};
import {BUSINESSES,employeeCap,enterpriseState,addStaff} from './businesses.mjs';
export const HIRE_CARDS=data.records;
export const hireCardCount=(s,id)=>s.hireCards?.[id]||0;
export const validHireCards=s=>s.hireCards===undefined||!!s.hireCards&&typeof s.hireCards==='object'&&!Array.isArray(s.hireCards)&&Object.entries(s.hireCards).every(([id,n])=>HIRE_CARDS.some(c=>c.id===id)&&Number.isInteger(n)&&n>=0&&n<=1e6);
export const hireTargets=(s,amount)=>BUSINESSES.filter(b=>enterpriseState(s)[b.id]&&enterpriseState(s)[b.id].employees+amount<=employeeCap);
export function hireCardAction(s,action,target,value){
 if(!['claimHireCards','useHireCards'].includes(action))return null;
 const fail=error=>({state:s,error}),card=HIRE_CARDS.find(c=>c.id===target);
 if(!card)return fail('Choose a known Hire Card.');
 const owned=hireCardCount(s,target);
 if(action==='claimHireCards'){
  const count=Math.min(10,1e6-owned);if(!count)return fail('Hire Card storage is full.');
  return {state:{...s,hireCards:{...s.hireCards,[target]:owned+count}},message:`Sandbox: ${count} ${card.name} added.`};
 }
 if(![1,10].includes(value?.count))return fail('Choose Use 1 or Use 10.');
 const requested=Math.min(owned,value.count);if(!requested)return fail('No cards of this kind remain.');
 const rolls=value.rolls??Array.from({length:requested},()=>Math.random());
 if(!Array.isArray(rolls)||rolls.length!==requested||!rolls.every(n=>Number.isFinite(n)&&n>=0&&n<1))return fail('Invalid random selections.');
 const enterprises=structuredClone(enterpriseState(s)),affected=new Set();let used=0;
 for(const roll of rolls){
  const eligible=hireTargets({...s,enterprises},card.amount);if(!eligible.length)break;
  const selected=eligible[Math.floor(roll*eligible.length)];enterprises[selected.id]=addStaff(s,selected.id,enterprises[selected.id],card.amount);affected.add(selected.name);used++;
 }
 if(!used)return fail('Open a business with room for the full card effect first. No cards spent.');
 return {state:{...s,enterprises,hireCards:{...s.hireCards,[target]:owned-used}},message:`Used ${used} ${card.name}: +${used*card.amount} employees in ${[...affected].join(', ')}. Unused cards kept.`};
}
