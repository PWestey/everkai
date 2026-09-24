import {useState} from 'react';
import FamiliarPanel from './familiar-panel';
import FamiliarTowerPanel from './familiar-tower-panel';
import FamiliarExplorePanel from './familiar-explore-panel';
import FamiliarDispatchPanel from './familiar-dispatch-panel';
import FamiliarHandbook from './familiar-handbook';
import {FAMILIARS,familiarCap} from '@/lib/familiars.mjs';
import {EXPLORE,exploreState,staminaNow} from '@/lib/familiar-explore.mjs';
import {familiarNodes,nodeUnlocked} from '@/lib/familiar-nodes.mjs';
import {familiarSupplies,trainingCost,starCost,suppliesWaiting,staminaRule} from '@/lib/familiar-supplies.mjs';
import {towerState,TOWER_FLOORS} from '@/lib/familiar-tower.mjs';
import {dispatchState,dispatchDone} from '@/lib/familiar-dispatch.mjs';
import {handbookClaimable} from '@/lib/familiar-handbook.mjs';

// THE FAMILIAR HUB (docs/familiar-screen-specs/01-hub.md).
//
// THE STRUCTURAL HEADLINE: Fellow opens onto a roster. Family opens onto a roster. FAMILIAR OPENS
// ONTO A SCENE -- an illustrated village with labelled buildings, and NINE top-level destinations
// hang off it. The roster is one building inside it. Everkai reached the same systems through a
// four-entry icon dock with a `Previous · n / 4 · Next` footer: a pager, for four items, of the exact
// kind both character rebuilds deleted. The scene IS the navigation, so there is no pager here.
//
// SIX LIVE DESTINATIONS, not nine. Two of the original's are not familiar systems at all (`Familiar
// Daily Offer`, `Benefits Card`) and one is the game's generic shop shell. Everkai has no
// monetisation, so the honest port is Dispatch, Growth, Tower, Explore and the Handbook, with the
// Familiar Shop appearing when audit S4 lands. The spec's instruction: do not draw dead buildings.
//
// THE ART IS NOT BUILT, and this is the one place this file departs from the spec. The original's hub
// is a background painting with plates positioned by percentage -- the `town-plate` pattern Everkai
// already ships in app/drakenberg-town.tsx. Everkai has exactly one scene painting (the Drakenberg
// town) and no familiar-scene art: `Pet.BGPic` and `PetTower.UIBG` name six backgrounds that have
// never been extracted. Putting the town painting behind familiar plates would be a lie about the
// place, so the plates sit on a painted ground instead, and the extraction is its own job. Every
// STRUCTURAL point of the spec -- the destinations, the badges, the stamina pill, the one `(i)`, no
// pager -- is here; only the picture is missing.
//
// A RED `!` ON EVERY DESTINATION THAT HAS SOMETHING TO DO, from one predicate each. This is the same
// missing predicate the Fellow roster wanted (R4) and the Companions roster still lacked (audit D6):
// `badge` was never passed on any familiar surface.
//
// THE STAMINA PILL lives in the header, on every screen in the system, not inside Exploring. The cap
// is `System.PetExploreEnergyMax` = 20. The capture reads 50/50 because that save carries the
// Familiar Pass (`PetExploreEnergyMaxBP`); copying it would import a monetisation perk as a base rule.
const growthReady=(game:any)=>{
 const s=familiarSupplies(game);
 return FAMILIARS.some(p=>{
  const rec=game.familiars?.[p.id];if(!rec)return false;
  if(rec.level<familiarCap(p.id)){const c=trainingCost(rec.level,rec.level+1);if(c.levelUp<=s.levelUp&&c.classUp<=s.classUp)return true;}
  const star=starCost(rec.stars);if(star!==null&&star<=s.classUp)return true;
  return familiarNodes(p.id).some((n:any)=>nodeUnlocked(rec,n)&&!(game.familiarNodes?.[p.id]||[]).includes(n.id));
 });
};
const DESTINATIONS=[
 // The original's arrangement: Dispatch upper, Growth middle, Tower lower, Explore on the action row,
 // Handbook on the bottom bar. Percentages, like drakenberg-layout.json, so the plates travel with the art.
 {id:'dispatch',label:'Familiar Dispatch',x:62, y:14, badge:(g:any)=>dispatchDone(g,Date.now())||(!dispatchState(g).run&&Object.keys(g.familiars||{}).length>=3)},
 {id:'growth', label:'Familiar Growth', x:36, y:33, badge:growthReady},
 {id:'tower',  label:'Familiar Tower', x:64, y:52, badge:(g:any)=>{const w=suppliesWaiting(g,Date.now());return !!(w.levelUp||w.classUp)||towerState(g).cleared<TOWER_FLOORS&&towerState(g).party.length>0}},
 {id:'explore',label:'Explore',        x:34, y:70, badge:(g:any)=>{const e=exploreState(g);return !!e.encounter||!!e.pending||staminaNow(g,Date.now()).stamina>=1}},
 {id:'handbook',label:'Handbook',      x:62, y:88, badge:(g:any)=>handbookClaimable(g)>0},
];
const PAGES:Record<string,any>={growth:FamiliarPanel,tower:FamiliarTowerPanel,explore:FamiliarExplorePanel,dispatch:FamiliarDispatchPanel,handbook:FamiliarHandbook};

export default function FamiliarHall({game,action,locked,initialPage=null}:any){
 // The scene IS the landing, as in the original -- Fellow opens onto a roster, Familiar opens onto a
 // place. `initialPage` stays for callers that deep-link to one destination.
 const [at,setAt]=useState<string|null>(initialPage===null?null:(['growth','tower','explore','dispatch','handbook'][initialPage]??null));
 const [info,setInfo]=useState(false),[list,setList]=useState(false);
 const tank=staminaNow(game,Date.now()),rule=staminaRule(game);
 const Page=at?PAGES[at]:null;
 const header=<header className="hub-head">
  <button className="area-plaque" aria-expanded={info} onClick={()=>setInfo(v=>!v)}>&#9432; Familiar</button>
  <p className="stamina-pill">&#9889; {tank.stamina}/{tank.max}</p>
 </header>;
 if(Page)return <section className="familiar-detail familiar-hall" aria-label="Familiar">
  {header}
  <button className="hub-back" onClick={()=>setAt(null)}>&laquo; Familiar</button>
  <Page game={game} action={action} locked={locked}/>
 </section>;
 return <section className="familiar-detail familiar-hall" aria-label="Familiar">
  {header}
  {/* ONE `(i)`, one panel, everything the game wants to say -- convention 10. The original's manifest
      is three headings for nine destinations; four of Everkai's six `rules-note` disclosures across
      four familiar pages came here to die. */}
  {info&&<div className="instruction-popover" role="note">
   <p><b>Making Contracts with Monsters.</b> Explore to meet wild monsters. Each exploration costs {EXPLORE.areas[0].cost} stamina, and stamina returns on its own, one point every {Math.round(rule.seconds/60)} minutes up to {rule.max}. Use a contract on a monster to make it yours; a failed contract raises its alertness, and a full bar means it flees.</p>
   <p><b>Familiar Development.</b> Contracting makes a monster your familiar. Items raise its level and its stars. Powerful Familiars can provide significant support when bound to a Fellow.</p>
   <p><b>Familiar Tower.</b> Team up and clear floors. As the total number of floors cleared increases, the gains from the Familiar Tower improve.</p></div>}

  <div className="hub-scene">
   {DESTINATIONS.map(d=><button key={d.id} className="hub-plate" style={{left:`${d.x}%`,top:`${d.y}%`}} onClick={()=>setAt(d.id)}>
    <span>{d.label}</span>{d.badge(game)&&<i className="hub-alert" aria-label="Something to do">!</i>}</button>)}
  </div>
  {/* The accessible fallback the town painting already carries: the same destinations as a list. */}
  <nav className="destination-menu hub-list" aria-label="Familiar destinations" hidden={!list}>
   {DESTINATIONS.map(d=><button key={d.id} onClick={()=>setAt(d.id)}>{d.label}{d.badge(game)&&<i className="hub-alert">!</i>}</button>)}</nav>
  <button className="intro-link" onClick={()=>setList(v=>!v)}>{list?'Hide list':'All destinations'}</button>

 </section>;
}
