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
