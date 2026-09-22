import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {FISH_ARTIFACTS,fishArtifactCounts,fishArtifactLevel,fishArtifactValue,fishArtifactUpgradeCost,fishArtifactPearl,pearls,pearlsFound,fishingState,FISHING_GROUNDS,PEARL,BLACK_PEARL} from '@/lib/fishing.mjs';

// The spot ids the artifact rows carry are the original's; the player only ever sees ground names.
const groundOf=(spot:string)=>Object.entries(FISHING_GROUNDS).find(([,g]:any)=>g.spot===spot)?.[0]||spot;
const clean=(s:string|null)=>s?s.replace(/\[[^\]]*\]/g,''):'';
const amount=(r:any,level:number)=>r.type==='percent'?`${fishArtifactValue(r.id,level)/100}%`:`${fishArtifactValue(r.id,level).toLocaleString()}`;

export default function FishingArtifacts({game,action,locked}:any){
 const f=fishingState(game),counts=fishArtifactCounts(f),[selected,setSelected]=useState('A1401');
 const held=FISH_ARTIFACTS.filter((r:any)=>counts.has(r.id)),r=FISH_ARTIFACTS.find((x:any)=>x.id===selected)!;
 const level=fishArtifactLevel(f,selected),cost=fishArtifactUpgradeCost(selected,level),kind=fishArtifactPearl(selected);
 const owned=counts.has(selected),bank=(k:string)=>pearls(f,k);
 return <>
  <h4 className="pick-heading">Antiques · {held.length}/{FISH_ARTIFACTS.length} found</h4>
  <p>{bank(PEARL)} Pearls ({pearlsFound(f,PEARL)} found) · {bank(BLACK_PEARL)} Black Pearls ({pearlsFound(f,BLACK_PEARL)} found)</p>
  <label>Antique<select className="potion-select" aria-label="Fishing artifact" value={selected} onChange={e=>setSelected(e.target.value)}>
   {FISH_ARTIFACTS.map((x:any)=><option key={x.id} value={x.id}>{counts.has(x.id)?`${x.name} · Lv.${fishArtifactLevel(f,x.id)}`:`??? · ${x.id}`}</option>)}
  </select></label>
  <article className="school-card">
   <h3>{owned?r.name:'Not found yet'}</h3>
   <p>{clean(r.describe).replace('{num}',owned?amount(r,level):amount(r,1))}</p>
   {owned?<>
    <p>Level {level}/{r.max===99999999?'∞':r.max}{counts.get(selected)!>1?` · found ${counts.get(selected)} times`:''}</p>
    <p>Next level: {clean(r.describe).replace('{num}',amount(r,level+1))}</p>
    {cost===null?<p>At its level limit.</p>:
     <Button disabled={locked||bank(kind)<cost} onClick={()=>action('upgradeFishArtifact',selected)}>
      Upgrade to Lv.{level+1} · {cost} {kind===PEARL?'Pearl':'Black Pearl'}{cost>1?'s':''} ({bank(kind)} held)
     </Button>}
   </>:<p>{r.scripted.length
    ? `Guaranteed: the ${r.scripted.map((x:any)=>`${ordinal(x.count)} catch at ${groundOf(x.spot)}`).join(' or the ')}, exactly as the original schedules it.`
    : r.fromActivity
    ? 'The original gives this one through the fishing battle pass, which Everkai has not built. Deferred rather than invented — its effect is wired and tested.'
    : `Fished up at ${r.spots.map(groundOf).join(' or ')}, on the original’s own FishLevel odds.`}</p>}
  </article>
  <p className="small-note">The original’s 17 antiques (FishArtifact.json). A cast keeps the fish it already drew and takes one extra roll on the original’s full FishLevel denominator, so nothing about the fish draw moved. Pearls come from the random-event catch and from every fishing level gained between 63 and 500, exactly as the original pays them; a repeat antique is recorded and pays nothing, because the original has no duplicate conversion either. All Fellow Power and Aptitude antiques feed the same buckets the rest of fishing does. The three “All Building Earnings” antiques multiply village earnings from the starter buildings, beside the Apothecary’s recipes — they do not reach the businesses’ own multiplier, which has its own strands. The Family charm/intimacy ones and the Daily Crystal one are recorded but not yet wired — the systems that own them are other slices.</p>
 </>;
}
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th'}`;
