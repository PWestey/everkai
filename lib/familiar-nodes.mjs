import data from './familiar-node-data.json' with {type:'json'};
const groups=new Map(Object.entries(data.groups).map(([id,rows])=>[id,new Map(rows.map(n=>[n.id,n]))]));
export const inherentFamiliarBonus=id=>({...data.inherent[id]});
export const familiarNodes=id=>data.groups[data.records[id]]||[];
const node=(pet,id)=>groups.get(data.records[pet])?.get(id);
export const nodeUnlocked=(p,n)=>p&&(n.kind==='level'?p.level:p.stars)>=n.threshold;
export function validFamiliarNodes(s){
 const active=s.familiarNodes===undefined?{}:s.familiarNodes,bonds=s.familiarBonds===undefined?{}:s.familiarBonds;
 if(!active||typeof active!=='object'||Array.isArray(active)||!bonds||typeof bonds!=='object'||Array.isArray(bonds))return false;
 for(const [pet,ids] of Object.entries(active))if(!s.familiars?.[pet]||!Array.isArray(ids)||ids.length>199||new Set(ids).size!==ids.length||!ids.every(id=>typeof id==='string'&&node(pet,id)&&nodeUnlocked(s.familiars[pet],node(pet,id))))return false;
 return Object.entries(bonds).every(([f,p])=>Object.hasOwn(s.fellows,f)&&typeof p==='string'&&Object.hasOwn(s.familiars||{},p))&&new Set(Object.values(bonds)).size===Object.keys(bonds).length;
}
export function familiarBonus(s,fellow){
 const pet=s.familiarBonds?.[fellow],bonus={flat:0,aptitude:0,percent:0,finalPercent:0};
 if(!pet)return bonus;
 Object.assign(bonus,data.inherent[pet]);
 for(const id of s.familiarNodes?.[pet]||[])for(const [field,value] of Object.entries(node(pet,id).effects))bonus[field]+=value;
 return bonus;
}
export function familiarNodeAction(s,action,target,value){
 if(!['activateFamiliarNode','activateFamiliarNodes','bindFamiliar','unbindFamiliar'].includes(action))return null;
 const fail=error=>({state:s,error}),p=s.familiars?.[target];if(!p)return fail('Welcome this familiar first.');
 if(action==='bindFamiliar'||action==='unbindFamiliar'){
  if(action==='bindFamiliar'&&!Object.hasOwn(s.fellows,value))return fail('Recruit this Fellow first.');
  const bonds=Object.fromEntries(Object.entries(s.familiarBonds||{}).filter(([f,pet])=>pet!==target&&(action==='unbindFamiliar'||f!==value)));
  if(action==='bindFamiliar')bonds[value]=target;
  return {state:{...s,familiarBonds:bonds},message:action==='bindFamiliar'?'Familiar bound. Activated bonuses follow this Fellow.':'Familiar unbound. Activated nodes retained.'};
 }
 const active=s.familiarNodes?.[target]||[],available=familiarNodes(target).filter(n=>nodeUnlocked(p,n)&&!active.includes(n.id));
 const chosen=action==='activateFamiliarNodes'?available:available.filter(n=>n.id===value);
 if(!chosen.length)return fail('No eligible inactive node selected.');
 return {state:{...s,familiarNodes:{...s.familiarNodes,[target]:[...active,...chosen.map(n=>n.id)]}},message:`${chosen.length} familiar nodes activated. Free sandbox activation.`};
}
