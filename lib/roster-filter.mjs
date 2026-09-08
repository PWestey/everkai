export function filterRoster(entries,query='',mode='all',owned={}){
 const q=query.trim().toLocaleLowerCase();return entries.filter(f=>
  (mode==='all'||(mode==='owned'?Object.hasOwn(owned,f.id):!Object.hasOwn(owned,f.id)))&&
  [f.name,f.title,f.race,f.occupation,f.rarity,f.type].some(v=>(v||'').toLocaleLowerCase().includes(q)));
}
