import {familiarSupplies,suppliesWaiting,trainingCost,starCost} from '@/lib/familiar-supplies.mjs';
import FamiliarGrowth from './familiar-growth';
import FamiliarBind from './familiar-bind';
import PanelPages from './panel-pages';
import RosterLanding from './roster-landing';
import {useState} from 'react';
import {cardStyle,cardRarity,rarityIcon} from '@/lib/ui-sprites.mjs';
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
 return <section className="familiar-detail"><Button className="collection-open" variant="outline" onClick={()=>setBrowse(true)}>‹ Companions roster</Button><header className="familiar-hero"><div className="framed-card" style={cardStyle(pet.rarity) as any} aria-hidden="true"><span>{rarityIcon(cardRarity(pet.rarity))&&<img src={rarityIcon(cardRarity(pet.rarity))!} alt=""/>}</span><strong>{pet.name}</strong>{progress&&<small>Lv. {progress.level}</small>}</div><div><h3>{pet.name}</h3><p>{pet.rarity} · {pet.type}{shining?' · shining':''}</p></div></header><div className="family-stats"><div><span>Attack</span><strong>{stats.ATK.toLocaleString()}</strong></div><div><span>Health</span><strong>{stats.HP.toLocaleString()}</strong></div><div><span>Speed</span><strong>{stats.SPD.toLocaleString()}</strong></div></div>
 {progress?<><div className="familiar-dock-row">
   <FamiliarBind game={game} id={id} action={action} locked={locked}/>
   <nav className="familiar-dock" aria-label="Growth">{[['level','Level Up'],['awaken','Awaken']].map(([k,label])=>
    <Button key={k} variant="ghost" aria-pressed={dock===k} onClick={()=>setDock(k)}>{label}</Button>)}</nav>
  </div>
  <FamiliarGrowth game={game} id={id} action={action} locked={locked} supplies={supplies} tab={dock}/>
  <section className="familiar-forms" aria-label="Forms"><h4 className="bond-ribbon">Forms</h4><ul><li>Child Form · unlocked by contract ✓</li><li>Adult Form · star {forms.adultStar} {stars>=forms.adultStar?'✓':`(${stars}/${forms.adultStar})`}</li>{three&&<li>Awakened Form · star {forms.awakenedStar} {stars>=forms.awakenedStar?'✓':`(${stars}/${forms.awakenedStar})`}</li>}</ul><p className="item-status">In the original each form is an animated portrait (a Spine skeleton: {(forms.spine as any)[id]?.join(', ')||'none recorded'}). Everkai has not rendered familiar animations yet, so forms are listed but not shown.</p></section></>
 :<p className="item-status">Not contracted yet. {source(id)}</p>}
 <details className="rules-note"><summary>About familiar progression</summary><p>Familiars join by choosing a starter, by contract while Exploring, or as Familiar Tower floor rewards; familiars a village already had are kept. Base stats and level, stage and star calculations follow The Ascended’s public familiar calculator, and the level, stage and star cost ladders match the original tables. Training costs the original’s level-up items per level and class-up items at each new stage, earned from the Familiar Tower each hour (held for up to 24 hours), from Exploring and from Dispatch. Stars cost class-up items, a local choice: the original spends each familiar’s own fragments, which Exploring, tower rewards and Dispatch now collect. Stars stay on class-up items because 24 of the 71 familiars (the SSR+, UR and collaboration familiars) have no fragment source in Everkai, so switching would freeze their stars. A bound familiar gives its Fellow nothing at stage 1, then a ninth of its bonus per stage up to the full bonus at stage 10. Newer familiars may postdate the APK. Explicitly activated nodes benefit the bound Fellow and therefore roster-based business earnings; training alone does not activate nodes.</p></details></section>
}
