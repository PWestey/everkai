import {familiarSupplies,suppliesWaiting,trainingCost,starCost} from '@/lib/familiar-supplies.mjs';
import FamiliarGrowth from './familiar-growth';
import FamiliarBind from './familiar-bind';
import PanelPages from './panel-pages';
import RosterLanding from './roster-landing';
import {useState} from 'react';
import {cardStyle,petCardIcon} from '@/lib/ui-sprites.mjs';
import {familiarHead,familiarHalf} from '@/lib/familiar-portraits.mjs';
import CharacterScreen from './character-screen';
import {Button} from '@/components/ui/button';
import {FAMILIARS,familiarById,familiarStats,familiarStage,familiarCap} from '@/lib/familiars.mjs';
import {EXPLORE,EXPLORE_AREAS,STARTERS,exploreState} from '@/lib/familiar-explore.mjs';
import {TOWER_DATA} from '@/lib/familiar-tower.mjs';
import {familiarNodes,nodeUnlocked,inherentFamiliarBonus} from '@/lib/familiar-nodes.mjs';
import {fellowById} from '@/lib/catalog.mjs';
/** Where an unowned familiar can be found, from the imported area lists and tower rewards. */
function source(id:string){
 const floors=TOWER_DATA.floors.filter((f:any)=>f.reward.familiar===id).map((f:any)=>f.floor),areas=EXPLORE_AREAS.filter((a:any)=>a.pets.includes(id)&&!a.ownedOnly.includes(id)).map((a:any)=>a.name);
 const parts=[];if(areas.length)parts.push(`Explore ${areas.join(' or ')}`);if(floors.length)parts.push(`Familiar Tower floor ${floors.join(', ')}`);
 return parts.length?parts.join(' · '):'Not found in exploring or the tower: in the original it came from events, the Legendary Familiar draw or bundles, which Everkai does not have.';
}
/** Does this familiar have a step the player can afford RIGHT NOW: a level, a star, or a node?
 *  One predicate, which is all the red `!` has ever needed and which no familiar surface had. */
function rosterReady(game:any,id:string){
 const rec=game.familiars?.[id];if(!rec)return false;
 const s=familiarSupplies(game);
 if(rec.level<familiarCap(id)){const c=trainingCost(rec.level,rec.level+1);if(c.levelUp<=s.levelUp&&c.classUp<=s.classUp)return true;}
 const star=starCost(rec.stars);if(star!==null&&star<=s.classUp)return true;
 return familiarNodes(id).some((n:any)=>nodeUnlocked(rec,n)&&!(game.familiarNodes?.[id]||[]).includes(n.id));
}
const fellowName=(id:string)=>fellowById(id)?.name||id;
export default function FamiliarPanel({game,action,locked}:any){
 const [id,setId]=useState(FAMILIARS[0].id),pet=familiarById(id)!,progress=game.familiars?.[id],stats=familiarStats(id,progress||{level:1,stars:0}),supplies=familiarSupplies(game),waiting=suppliesWaiting(game,Date.now());
 const e=exploreState(game),ownedCount=Object.keys(game.familiars||{}).length;
 const [browse,setBrowse]=useState(true);
 // The roster tile draws `portrait`/`art` when an entry has one and falls back to the rarity card.
 // Familiars had neither until the portraits were extracted; now 66 of the 71 carry a half-body.
 const rosterEntries=FAMILIARS.map((p:any)=>{const art=familiarHalf(p.id);return art?{...p,portrait:art.replace('./assets/','')}:p});
 // Which growth ladder the dock is showing. The original's dock is Metamorphosis | Awaken | Level-Up |
 // Basic Info; Metamorphosis is spec 04 and `Basic Info` is a close verb, not a panel (spec 03).
 const [dock,setDock]=useState('level');
 if(!ownedCount&&e.starter===null)return <section className="familiar-detail familiar-starter" aria-label="Choose a starter familiar"><h4 className="bond-ribbon">Adventure Together!</h4><p>Choose a familiar to join your adventure. Unselected familiars will appear in later explorations.</p>
  <div className="business-actions">{STARTERS.map((sid:string)=>{const p=familiarById(sid)!;return <Button key={sid} disabled={locked} onClick={()=>action('familiarStarter',sid)}>{p.name} · {p.type}</Button>})}</div>
  </section>;// the starter panel's own string is the original's; where familiars come from AFTER it is
  // the hub's `(i)` and the preview's `Source` button, not a sentence here (11-handbook.md §7).
 // Familiars land on the roster too, matching Family and Fellows. They carry no portrait, so
 // RosterPicker falls back to the rarity card.
 // REBUILT TO docs/familiar-screen-specs/02-growth-roster.md.
 //  * `Familiar Growth` is the original's name for this screen; `Companions` was Everkai's own, and
 //    the system is called `Familiars` in five other places (audit §0). One name, everywhere.
 //  * The red `!` -- `badge` was never passed on any familiar surface (audit D6), on a roster where
 //    training, starring and node activation are ALL per-familiar. One predicate: does this familiar
 //    have an affordable step right now?
 //  * Two sort orders, Default and Rarity, which is what the original offers. Everkai offered five,
 //    and the control was not rendered at all here because it was gated on a `power` prop this roster
 //    has no use for.
 //  * No search and no pager: the original scrolls 70 cards behind a four-chip capsule. Fellow keeps
 //    both -- its roster is 244, four times the size the capture is evidence about.
 //  * Stars and the bound Fellow on the card. Stars are a 100-row upgrade track with no other
 //    roster-level readout, and Everkai binds familiars in two places and showed it in neither.
 if(browse)return <RosterLanding kind="Familiar Growth" entries={rosterEntries} owned={game.familiars||{}} selected={id}
  sortKeys={{}} sortOrders={['default','rarity']} search={false} pageSize={0}
  status={(x:string)=>game.familiars?.[x]?`Lv. ${game.familiars[x].level}`:''}
  badge={(x:string)=>rosterReady(game,x)}
  sub={(f:any)=>{const rec=game.familiars?.[f.id];if(!rec)return null;
   const bound=Object.entries(game.familiarBonds||{}).find(([,pet])=>pet===f.id)?.[0];
   return <><em className="card-stars">{rec.stars||0} &#9733;</em>{bound&&<i className="bound-mark" aria-label={`Bound to ${fellowName(bound)}`}>&#9679;</i>}</>}}
  onSelect={(x:string)=>{setId(x);setBrowse(false)}}/>;
  const forms=EXPLORE.forms,three=forms.threeForms.includes(id),stars=progress?.stars??0,shining=e.sp.includes(id);
 // SPEC 03: the detail SHELL. Everkai drew a thumbnail card, a name line and a three-cell stat block,
 // then a nested text pager. The original gives the surface to the art with two rails, edge paging, a
 // persistent bonus band and an icon dock -- which is exactly `CharacterScreen`, built for the Fellow
 // rebuild and never used here. This adopts it.
 //
 // ART, 2026-09-24: it exists now. `scripts/import-familiar-portraits.py` pulled the half-body
 // portraits out of the FairyGUI package in the APK's `ui/pet` bundles, which is where `Pet.HalfPic`
 // always pointed. This line is the one the old comment said would change when familiar art existed.
 // The rarity plate stays as the fallback for the five ids with no art in the original's own tables.
 const person={...pet,art:(familiarHalf(pet.id)||petCardIcon(pet.rarity)||'').replace('./assets/',''),
  title:`${pet.rarity} \u00b7 ${pet.type}${shining?' \u00b7 shining':''}`,
  description:`A ${pet.type.toLowerCase()} familiar of the ${pet.rarity} tier.`};
 const order=FAMILIARS.filter((p:any)=>Object.hasOwn(game.familiars||{},p.id));
 const step=(d:number)=>{if(order.length<2)return undefined;const at=order.findIndex((p:any)=>p.id===id);
  return ()=>setId(order[((at<0?0:at+d)%order.length+order.length)%order.length].id)};
 // SPEC 07: the LOCKED PREVIEW. An uncontracted familiar used to reach one sentence -- `Not contracted
 // yet. {source}` -- above a shell still drawing its hero card and its Attack/Health/Speed row AT
 // LEVEL 1. So the one thing Everkai showed for a familiar you did not have was its WEAKEST numbers,
 // where the original shows its strongest. `Max Level Preview` is the decision-relevant surface on the
 // whole roster: it is what tells you whether a familiar is worth hunting. Same function, same rows,
 // evaluated at `familiarCap(id)` and the top of the star ladder.
 if(!progress)return <FamiliarPreview id={id} pet={pet} person={person} source={source(id)}
  onBack={()=>setBrowse(true)} onPrevious={step(-1)} onNext={step(1)}/>;
 return <CharacterScreen person={person} heading="Familiar Growth"
  onPrevious={step(-1)} onNext={step(1)}
  stats={[{label:'Attack',value:stats.ATK.toLocaleString()},{label:'Health',value:stats.HP.toLocaleString()},{label:'Speed',value:stats.SPD.toLocaleString()}]}
  collection={<Button className="collection-open" variant="outline" onClick={()=>setBrowse(true)}>&lsaquo; Familiar Growth</Button>}>
  {progress?<div className="familiar-growth-wrap"><div className="familiar-dock-row">
   <FamiliarBind game={game} id={id} action={action} locked={locked}/>
   <nav className="familiar-dock" aria-label="Growth">{[['level','Level Up'],['awaken','Awaken']].map(([k,label])=>
    <Button key={k} variant="ghost" aria-pressed={dock===k} onClick={()=>setDock(k)}>{label}</Button>)}</nav>
  </div>
  <FamiliarGrowth game={game} id={id} action={action} locked={locked} supplies={supplies} tab={dock}/>
  <section className="familiar-forms" aria-label="Forms"><h4 className="bond-ribbon">Forms</h4><ul><li>Child Form · unlocked by contract ✓</li><li>Adult Form · star {forms.adultStar} {stars>=forms.adultStar?'✓':`(${stars}/${forms.adultStar})`}</li>{three&&<li>Awakened Form · star {forms.awakenedStar} {stars>=forms.awakenedStar?'✓':`(${stars}/${forms.awakenedStar})`}</li>}</ul><p className="item-status">In the original each form is an animated portrait (a Spine skeleton: {(forms.spine as any)[id]?.join(', ')||'none recorded'}). Everkai has not rendered familiar animations yet, so forms are listed but not shown.</p></section></div>
 :null}
 </CharacterScreen>;
}

/** SPEC 07 -- `Familiar Preview`. A grey silhouette, a `Source` button with a one-line tooltip, and
 *  two tabs: `Info` (Name / Attribute / Source) and `Max Level Preview`, which is the point of the
 *  screen. The bond payout is `inherentFamiliarBonus()` at full stage -- the same four cells the bind
 *  panel shows for an owned familiar, which is exactly the comparison a player needs before hunting. */
function FamiliarPreview({id,pet,person,source,onBack,onPrevious,onNext}:any){
 const [tab,setTab]=useState('max'),[why,setWhy]=useState(false);
 // The top of the star ladder is where PetStar runs out -- 100 rows, so `starCost` returns null at 100.
 const cap=familiarCap(id);let top=0;while(top<200&&starCost(top)!==null)top++;
 const best=familiarStats(id,{level:cap,stars:top});
 const bond:any=inherentFamiliarBonus(id)||{};
 const cells=[['Final Power',bond.finalPercent,'%'],['Power',bond.flat,''],['Aptitude',bond.aptitude,''],['Power %',bond.percent,'%']]
  .filter(([,v])=>v)
  .map(([label,v,unit])=>({label,value:`+${Number(v).toLocaleString()}${unit}`}));
 return <CharacterScreen person={person} heading="Familiar Preview" preview
  onPrevious={onPrevious} onNext={onNext}
  collection={<Button className="collection-open" variant="outline" onClick={onBack}>&lsaquo; Familiar Growth</Button>}>
  {/* `.character-screen-controls` is a FLEX container, so a bare block child is a flex ITEM and
     collapses to its min-content. The same wrapper `.familiar-growth-wrap` already carries, for the
     same reason, measured in the browser both times. */}
  <div className="familiar-preview-wrap">
  <div className="preview-head">
   <button className="source-button" aria-expanded={why} onClick={()=>setWhy(v=>!v)}>Source</button>
   {why&&<p className="source-tip" role="note">How to Invite: {source}</p>}
  </div>
  <nav className="panel-pages preview-tabs" aria-label="Preview">
   {[['info','Info'],['max','Max Level Preview']].map(([k,label])=>
    <Button key={k} variant="ghost" aria-pressed={tab===k} onClick={()=>setTab(k)}>{label}</Button>)}</nav>
  {tab==='info'
   ?<dl className="preview-info"><div><dt>Name</dt><dd>{pet.name}</dd></div><div><dt>Attribute</dt><dd>{pet.type}</dd></div>
     <div><dt>Rarity</dt><dd>{pet.rarity}</dd></div><div><dt>Source</dt><dd>{source}</dd></div></dl>
   :<>
     <h5 className="ribbon-rule">Combat Attribute &middot; Lv. {cap}</h5>
     <dl className="preview-stats">{[['Attack',best.ATK],['Health',best.HP],['Speed',best.SPD]].map(([k,v]:any)=>
      <div key={k}><dt>{k}</dt><dd>{v.toLocaleString()}</dd></div>)}</dl>
     {!!cells.length&&<><h5 className="ribbon-rule">Bonus when bound, at full stage</h5>
      <dl className="preview-stats">{cells.map(c=><div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}</dl></>}
    </>}
  </div>
 </CharacterScreen>;
}
