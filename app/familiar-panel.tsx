import {familiarSupplies,suppliesWaiting,trainingCost,starCost} from '@/lib/familiar-supplies.mjs';
import FamiliarGrowth from './familiar-growth';
import FamiliarBind from './familiar-bind';
import PanelPages from './panel-pages';
import RosterLanding from './roster-landing';
import {useState} from 'react';
import {cardStyle,petCardIcon} from '@/lib/ui-sprites.mjs';
import CharacterScreen from './character-screen';
import {Button} from '@/components/ui/button';
import {FAMILIARS,familiarById,familiarStats,familiarStage,familiarCap} from '@/lib/familiars.mjs';
import {EXPLORE,EXPLORE_AREAS,STARTERS,exploreState} from '@/lib/familiar-explore.mjs';
import {TOWER_DATA} from '@/lib/familiar-tower.mjs';
/** Where an unowned familiar can be found, from the imported area lists and tower rewards. */
function source(id:string){
 const floors=TOWER_DATA.floors.filter((f:any)=>f.reward.familiar===id).map((f:any)=>f.floor),areas=EXPLORE_AREAS.filter((a:any)=>a.pets.includes(id)&&!a.ownedOnly.includes(id)).map((a:any)=>a.name);
 const parts=[];if(areas.length)parts.push(`Explore ${areas.join(' or ')}`);if(floors.length)parts.push(`Familiar Tower floor ${floors.join(', ')}`);
 return parts.length?parts.join(' · '):'Not found in exploring or the tower: in the original it came from events, the Legendary Familiar draw or bundles, which Everkai does not have.';
}
export default function FamiliarPanel({game,action,locked}:any){
 const [id,setId]=useState(FAMILIARS[0].id),pet=familiarById(id)!,progress=game.familiars?.[id],stats=familiarStats(id,progress||{level:1,stars:0}),supplies=familiarSupplies(game),waiting=suppliesWaiting(game,Date.now());
 const e=exploreState(game),ownedCount=Object.keys(game.familiars||{}).length;
 const [browse,setBrowse]=useState(true);
 // Which growth ladder the dock is showing. The original's dock is Metamorphosis | Awaken | Level-Up |
 // Basic Info; Metamorphosis is spec 04 and `Basic Info` is a close verb, not a panel (spec 03).
 const [dock,setDock]=useState('level');
 if(!ownedCount&&e.starter===null)return <section className="familiar-detail familiar-starter" aria-label="Choose a starter familiar"><h4 className="bond-ribbon">Adventure Together!</h4><p>Choose a familiar to join your adventure. Unselected familiars will appear in later explorations.</p>
  <div className="business-actions">{STARTERS.map((sid:string)=>{const p=familiarById(sid)!;return <Button key={sid} disabled={locked} onClick={()=>action('familiarStarter',sid)}>{p.name} · {p.type}</Button>})}</div>
  <p className="item-status">After this, familiars join by contract while Exploring, or as Familiar Tower rewards.</p></section>;
 // Companions land on the roster too, matching Family and Fellows. Familiars carry no portrait, so RosterPicker falls back to the rarity card.
 // The Companions roster brings ITS OWN sort keys and its own level readout: familiars have a level
 // and a star count, no Aptitude and no Awakening, and RosterLanding's Fellow defaults sorted them by
 // keys that return 0 for every card. `status` only renders for a contracted familiar (roster-picker
 // draws the banner inside `owned[f.id]&&`), so the 'Not contracted' branch never reached the screen.
 if(browse)return <RosterLanding kind="Companions" entries={FAMILIARS} owned={game.familiars||{}} selected={id}
  sortKeys={{level:(x:string)=>Number(game.familiars?.[x]?.level)||0,stars:(x:string)=>Number(game.familiars?.[x]?.stars)||0}}
  status={(x:string)=>game.familiars?.[x]?`Lv. ${game.familiars[x].level}`:''}
  summary={<span>{ownedCount} contracted</span>}
  onSelect={(x:string)=>{setId(x);setBrowse(false)}}/>;
  const forms=EXPLORE.forms,three=forms.threeForms.includes(id),stars=progress?.stars??0,shining=e.sp.includes(id);
 // SPEC 03: the detail SHELL. Everkai drew a thumbnail card, a name line and a three-cell stat block,
 // then a nested text pager. The original gives the surface to the art with two rails, edge paging, a
 // persistent bonus band and an icon dock -- which is exactly `CharacterScreen`, built for the Fellow
 // rebuild and never used here. This adopts it.
 //
 // ART: familiars have no art asset in Everkai at all (the roster already falls back to the rarity
 // plate, lib/familiars.mjs carries no `art` field, and there is no idle clip), so the plate is what
 // the showcase shows. That is the honest placeholder for a gap spec 03 records rather than a
 // pretence of art; when familiar art exists, only this one line changes.
 const person={...pet,art:(petCardIcon(pet.rarity)||'').replace('./assets/',''),
  title:`${pet.rarity} \u00b7 ${pet.type}${shining?' \u00b7 shining':''}`,
  description:`A ${pet.type.toLowerCase()} familiar of the ${pet.rarity} tier.`};
 const order=FAMILIARS.filter((p:any)=>Object.hasOwn(game.familiars||{},p.id));
 const step=(d:number)=>{if(order.length<2)return undefined;const at=order.findIndex((p:any)=>p.id===id);
  return ()=>setId(order[((at<0?0:at+d)%order.length+order.length)%order.length].id)};
 return <CharacterScreen person={person} heading="Familiar Growth"
  onPrevious={step(-1)} onNext={step(1)}
  stats={[{label:'Attack',value:stats.ATK.toLocaleString()},{label:'Health',value:stats.HP.toLocaleString()},{label:'Speed',value:stats.SPD.toLocaleString()}]}
  collection={<Button className="collection-open" variant="outline" onClick={()=>setBrowse(true)}>&lsaquo; Companions roster</Button>}>
  {progress?<div className="familiar-growth-wrap"><div className="familiar-dock-row">
   <FamiliarBind game={game} id={id} action={action} locked={locked}/>
   <nav className="familiar-dock" aria-label="Growth">{[['level','Level Up'],['awaken','Awaken']].map(([k,label])=>
    <Button key={k} variant="ghost" aria-pressed={dock===k} onClick={()=>setDock(k)}>{label}</Button>)}</nav>
  </div>
  <FamiliarGrowth game={game} id={id} action={action} locked={locked} supplies={supplies} tab={dock}/>
  <section className="familiar-forms" aria-label="Forms"><h4 className="bond-ribbon">Forms</h4><ul><li>Child Form · unlocked by contract ✓</li><li>Adult Form · star {forms.adultStar} {stars>=forms.adultStar?'✓':`(${stars}/${forms.adultStar})`}</li>{three&&<li>Awakened Form · star {forms.awakenedStar} {stars>=forms.awakenedStar?'✓':`(${stars}/${forms.awakenedStar})`}</li>}</ul><p className="item-status">In the original each form is an animated portrait (a Spine skeleton: {(forms.spine as any)[id]?.join(', ')||'none recorded'}). Everkai has not rendered familiar animations yet, so forms are listed but not shown.</p></section></div>
 :<p className="item-status">Not contracted yet. {source(id)}</p>}
 </CharacterScreen>;
}
