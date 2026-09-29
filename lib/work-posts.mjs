// ONE FELLOW, ONE POST.
//
// Everkai seats a Fellow in three places, and until 2026-09-29 only two of them knew about each other:
//   * `s.buildings[id].fellow`      -- the three starter businesses
//   * `s.enterprises[id].fellows[]` -- the 17 original businesses
//   * `s.expo.assigned[stall]`      -- the Mushroom Expo stalls
// `assign` and `assignOperator` each cleared the other two of those, so moving a Fellow between a
// starter building and a business worked. `assignExpo` deduped only WITHIN the Expo, so a Fellow could
// run a business and a stall at once and be paid by both. The owner reported it: "fellows should only
// be allowed to be put in one building. I think it allows multiple right now."
//
// This is the one place that knows the full list, so a fourth post added later has one function to
// join rather than three call sites to remember.
export function vacateFellow(s,id,keep={}){
 if(!id)return s;
 const next={...s};
 if(s.buildings)next.buildings=Object.fromEntries(Object.entries(s.buildings)
  .map(([k,b])=>[k,b?.fellow===id&&k!==keep.building?{...b,fellow:null}:b]));
 if(s.enterprises)next.enterprises=Object.fromEntries(Object.entries(s.enterprises)
  .map(([k,b])=>[k,Array.isArray(b?.fellows)&&b.fellows.includes(id)&&k!==keep.enterprise
   ? {...b,fellows:b.fellows.filter(f=>f!==id)} : b]));
 if(s.expo?.assigned){
  const assigned=Object.fromEntries(Object.entries(s.expo.assigned).filter(([k,f])=>f!==id||k===keep.stall));
  if(Object.keys(assigned).length!==Object.keys(s.expo.assigned).length)next.expo={...s.expo,assigned};
 }
 return next;
}
/** Every post this Fellow currently holds, for the screens that want to say so. */
export function postsOf(s,id){
 const out=[];
 for(const [k,b] of Object.entries(s?.buildings||{}))if(b?.fellow===id)out.push({kind:'building',id:k});
 for(const [k,b] of Object.entries(s?.enterprises||{}))if(b?.fellows?.includes(id))out.push({kind:'enterprise',id:k});
 for(const [k,f] of Object.entries(s?.expo?.assigned||{}))if(f===id)out.push({kind:'stall',id:k});
 return out;
}
