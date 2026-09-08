import {validFamiliarNodes,familiarNodeAction} from './familiar-nodes.mjs';
import data from './familiar-data.json' with {type:'json'};
export const FAMILIARS=data.pets;
export const familiarById=id=>FAMILIARS.find(p=>p.id===id);
export const familiarStage=level=>Math.floor(level/50)+1;
export const familiarCap=id=>data.classes[familiarById(id).classMax].LevelMax;
export function familiarStats(id,progress){
 const pet=familiarById(id),level=data.levels[progress.level],stage=data.classes[familiarStage(progress.level)],star=data.stars[progress.stars]||{};
 const values={ATK:0,HP:0,SPD:0};
 for(const field of ['ATK','HP','SPD']){
  const suffix=field==='SPD'?'add':'coef';
  const growth=1+((level[field+suffix]||0)+(stage[field+suffix]||0))/10000;
  const stars=field==='SPD'?1:1+(star[field+'coef']||0)/10000;
  values[field]=Math.floor(pet[field]*growth*stars);
 }
 return values;
}
export function validFamiliars(s){
 if(!validFamiliarNodes(s))return false;
 if(s.familiars===undefined)return true;
 return !!s.familiars&&typeof s.familiars==='object'&&!Array.isArray(s.familiars)&&Object.entries(s.familiars).every(([id,p])=>!!familiarById(id)&&p&&Number.isInteger(p.level)&&p.level>=1&&p.level<=familiarCap(id)&&Number.isInteger(p.stars)&&p.stars>=0&&p.stars<=100);
}
export function familiarAction(s,action,target,value){
 const nodes=familiarNodeAction(s,action,target,value);if(nodes)return nodes;
 if(!['adoptFamiliar','adoptFamiliars','trainFamiliar','starFamiliar'].includes(action))return null;
 const pets=s.familiars||{},fail=error=>({state:s,error});
 if(action==='adoptFamiliars')return {state:{...s,familiars:{...Object.fromEntries(FAMILIARS.map(p=>[p.id,{level:1,stars:0}])),...pets}},message:'All familiars welcomed. Existing training preserved.'};
 if(!familiarById(target))return fail('Choose a familiar.');
 const p=pets[target];
 if(action==='adoptFamiliar'){
  if(p)return fail('This familiar has already joined.');
  return {state:{...s,familiars:{...pets,[target]:{level:1,stars:0}}},message:'Familiar welcomed for sandbox play.'};
 }
 if(!p)return fail('Welcome this familiar first.');
 if(action==='trainFamiliar'){
  if(![1,10].includes(value))return fail('Choose one or ten levels.');
  if(p.level>=familiarCap(target))return fail('Final documented level reached.');
  return {state:{...s,familiars:{...pets,[target]:{...p,level:Math.min(familiarCap(target),p.level+value)}}},message:'Familiar trained. Stats and stage updated.'};
 }
 if(p.stars>=100)return fail('Final documented star reached.');
 return {state:{...s,familiars:{...pets,[target]:{...p,stars:p.stars+1}}},message:'Familiar gained a star.'};
}
