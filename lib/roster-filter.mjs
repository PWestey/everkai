export function filterRoster(entries,query='',mode='all',owned={}){
 const q=query.trim().toLocaleLowerCase();return entries.filter(f=>
  (mode==='all'||(mode==='owned'?Object.hasOwn(owned,f.id):!Object.hasOwn(owned,f.id)))&&
  [f.name,f.title,f.race,f.occupation,f.rarity,f.type].some(v=>(v||'').toLocaleLowerCase().includes(q)));
}
/** Roster order: joined characters strongest first, then everyone not yet joined in catalogue order.
 *  `power(id)` is only called for joined ids -- the number the character screen shows (Fellows:
 *  bondedPower, Family: blessingPower). Ties keep catalogue order, so the order is stable. */
/** @param {any[]} entries @param {Record<string,any>} [owned] @param {(id:string)=>number} [power] */
export function rosterOrder(entries,owned={},power=_id=>0){
 const index=new Map(entries.map((f,i)=>[f.id,i])),joined=entries.filter(f=>Object.hasOwn(owned,f.id)),rest=entries.filter(f=>!Object.hasOwn(owned,f.id));
 const score=new Map(joined.map(f=>{const p=Number(power(f.id));return [f.id,Number.isFinite(p)?p:0]}));
 return [...joined.sort((a,b)=>score.get(b.id)-score.get(a.id)||index.get(a.id)-index.get(b.id)),...rest];
}
/** The id `step` places away from `id` in `order`, wrapping; used by the character screen's arrows. */
export function rosterStep(order,id,step){const i=order.findIndex(f=>f.id===id);return order[((i<0?0:i+step)%order.length+order.length)%order.length].id}

/** The roster's sort menu. Joined characters come first in every mode (the order the owner expects when
 *  choosing someone to work or fight), sorted by the chosen key, strongest/highest first; ties keep
 *  catalogue order. `rarity` reads the head of a chain ("SSR -> UR" sorts as SSR) and the climbed badge
 *  for crossover characters when `rarityOf` is given. Not-joined characters follow in catalogue order. */
export const ROSTER_SORTS=['power','level','rarity','name'];
const RARITY_RANK=['N','R','SR','SSR','SSR+','UR','UR*','LR'];
export const rarityRank=r=>{const i=RARITY_RANK.indexOf(String(r||'').split(' ->')[0].trim());return i<0?-1:i};
/** @param {any[]} entries @param {Record<string,any>} owned @param {string} mode
 *  @param {{power?:(id:string)=>number,level?:(id:string)=>number,rarityOf?:(id:string)=>string}} [by] */
export function rosterSort(entries,owned={},mode='power',by={}){
 if(mode==='name'){
  const index=new Map(entries.map((f,i)=>[f.id,i])),joined=entries.filter(f=>Object.hasOwn(owned,f.id)),rest=entries.filter(f=>!Object.hasOwn(owned,f.id));
  return [...joined.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))||index.get(a.id)-index.get(b.id)),...rest];
 }
 const key=mode==='level'?(id=>Number(owned[id]?.level)||0)
  :mode==='rarity'?(id=>rarityRank(by.rarityOf?by.rarityOf(id):entries.find(f=>f.id===id)?.rarity)*1e18+(Number(by.power?.(id))||0))
  :(by.power||(_id=>0));
 return rosterOrder(entries,owned,key);
}
