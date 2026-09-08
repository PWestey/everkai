import {affinityIds,hasAffinity} from './public-reference.mjs';
// Documented pairings; costs, caps and coefficients remain local sandbox balance.
export const bondCost=level=>20*(level+1);
export const bondFor=(s,id)=>s.bonds[id]||{fellow:null,level:0,original:affinityIds(id).length>0};
export const supportedIds=(s,id)=>{const b=bondFor(s,id);return (b.original?affinityIds(id):b.fellow?[b.fellow]:[]).filter(f=>Object.hasOwn(s.fellows,f))};
export const bondFactor=(s,id)=>1+Object.entries(s.bonds||{}).filter(([family,b])=>Object.hasOwn(s.fellows,id)&&(b.original?hasAffinity(family,id):b.fellow===id)).reduce((n,[,b])=>n+b.level*.02,0);
export function validBonds(s){return !!s.bonds&&typeof s.bonds==='object'&&!Array.isArray(s.bonds)&&Object.entries(s.bonds).every(([id,b])=>Object.hasOwn(s.family,id)&&b&&Number.isInteger(b.level)&&b.level>=0&&b.level<=10&&(b.original===undefined||typeof b.original==='boolean')&&(!b.original||b.fellow===null&&affinityIds(id).length>0)&&(b.fellow===null||Object.hasOwn(s.fellows,b.fellow)))}
export function bondAction(s,action,target,value){
 if(!['bondAssign','bondTrain','bondAffinity'].includes(action))return null;
 const fail=error=>({state:s,error}),family=s.family[target];if(!family)return fail('Welcome this family member first.');
 const bond=bondFor(s,target);
 if(action==='bondAffinity'){
  if(!affinityIds(target).length)return fail('No documented Fellow pairing is available yet.');
  return {state:{...s,bonds:{...s.bonds,[target]:{...bond,fellow:null,original:true}}},message:'Documented pairings enabled. Bond level preserved.'};
 }
 if(action==='bondAssign'){
  if(value!==null&&!Object.hasOwn(s.fellows,value))return fail('Choose a recruited Fellow.');
  return {state:{...s,bonds:{...s.bonds,[target]:{...bond,fellow:value,original:false}}},message:value?'Sandbox family bond assigned.':'Sandbox family bond unassigned.'};
 }
 if(!supportedIds(s,target).length)return fail('Recruit a supported Fellow before training this bond.');
 if(bond.level>=10)return fail('This bond is fully trained.');
 const cost=bondCost(bond.level);if(family.points<cost)return fail('Go on dates to earn more Blessing Points.');
 return {state:{...s,bonds:{...s.bonds,[target]:{...bond,level:bond.level+1}},family:{...s.family,[target]:{...family,points:family.points-cost}}},message:'Bond improved: +2% Fellow Power and business earnings.'};
}
