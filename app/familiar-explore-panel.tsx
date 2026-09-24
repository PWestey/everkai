import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cardStyle,cardRarity,rarityIcon,petCardIcon} from '@/lib/ui-sprites.mjs';
import {familiarById} from '@/lib/familiars.mjs';
import {EXPLORE,EXCHANGE,EXPLORE_AREAS,CATCH_ITEMS,RARITY_NAMES,exploreState,areaUnlocked,explorePet,catchChance,encounterPool,exploreExchangeState,familiarDailyState,staminaNow} from '@/lib/familiar-explore.mjs';
import RewardRibbon,{type RewardPayout} from './reward-ribbon';

// FAMILIAR EXPLORING (docs/familiar-screen-specs/10-explore.md).
//
// X1, and it is the whole spec: EXPLORE IS NOT A SCREEN. `Explore` is one button with FOUR screens
// behind it and THREE different primary verbs -- `Use`, `Draw`, `Investigate` -- chosen by a weighted
// roll the player never sees. Everkai had two states, IDLE and ENCOUNTER: the Luck Flower, the NPC
// blessing and the lost-item cache all arrived as one `last-result` sentence, so three of the four
// branches had no surface at all. `lib/familiar-explore.mjs` now stops at the branch it rolled and
// pays nothing until its own verb is pressed; this panel switches on that branch.
//
// X14: the three non-monster branches end in ONE shared reward ribbon (`./reward-ribbon`), built
// once with all five of its slots. The catch deliberately does not use it (§4.1).
//
// Deleted, per §10, roughly 350 words: P4 (196 words of percentages, which is the `Probability`
// screen written as a paragraph -- X4), P5 (the item bag as sentences, which is the counter stack --
// X3, X13), P6 (up to 25 comma-joined familiar names per rarity, which is `Probability`'s grid --
// X6), the explored-count line, the alertness rule sentence, the flee sentence, the regen sentence
// and the duplicated tower-floor line.
//
// X10, and it resolves audit question 8: `Leave it` is gone. `img/encounter.png` carries `Use`,
// `Soothe`, `Skip`, `Ruin` and a back arrow, and no such button. `Ruin` is on all four Explore
// screens, which makes it the exit -- so leaving the area walks away from the monster, for nothing.
//
// NOT BUILT, deliberately: `Attract` is drawn with its padlock and its `10` and nothing behind it.
// §7 settles the disposition -- an incense burns a consumable to buy a better rarity table and skip
// a cost that regenerates on its own. "It has one unique surface and no unique destination... build
// the dialog, or build nothing." The dialog needs `System.PetTrap`, which is not imported, and a
// grant path, which nothing in reach provides. The padlock is the honest amount of built. Likewise
// `Full Auto` and the two `Skip` checkboxes, all three gated in the original and all three absent
// here; the pity banner is NOT built at all (§1.2: no ceiling table exists for Pet*, and nineteen
// exist for other systems, so the search reaches the right neighbourhood and finds nothing).
const TIER_COLOUR:Record<number,string>={1:'#7b6b52',2:'#2f6ea8',3:'#7a3fa8',4:'#c07a12'};
const pct=(bp:number,dp=1)=>`${(bp/100).toFixed(dp)}%`;
const itemLabel=(id:string)=>(EXPLORE.itemNames as any)[id]||({Item_PetLevelUP:'Magical Fruit',Item_PetClassUP:'Familiar Crystal'} as any)[id]||id;

/** The counter stack (§1.1): a blessing exists on screen as one chip with a number. There is no buff
 *  panel in the original -- no list, no timer, no active-effects section. Copy both halves: the grant
 *  is loud (the ribbon) and the persistence is quiet (this). */
function CounterChips({e}:any){
 const chips=Object.entries(e.items).filter(([,n]:any)=>n>0);
 if(!chips.length)return null;
 return <ul className="counter-stack" aria-label="Items held">{chips.map(([id,n]:any)=>
  <li key={id} title={(EXPLORE.itemText as any)[id]||''}><span>{itemLabel(id)}</span><b>{n}</b></li>)}</ul>;
}

export default function FamiliarExplorePanel({game,action,locked}:any){
 const now=Date.now(),e=exploreState(game),tank=staminaNow(game,now);
 const area=EXPLORE_AREAS.find((a:any)=>a.id===e.area)!,c=e.encounter,q=e.pending||null;
 const pet=c?familiarById(c.pet)!:null,info=c?explorePet(c.pet):null,owned=c?!!game.familiars?.[c.pet]:false;
 const free=e.items.Item_PetExploreBuff_04>0;
 const [grade,setGrade]=useState(1),[prob,setProb]=useState(false),[ruin,setRuin]=useState(false);
 const [intro,setIntro]=useState(false),[areaInfo,setAreaInfo]=useState(false),[detail,setDetail]=useState(false);
 const [seen,setSeen]=useState<number>(-1);
 const ex=exploreExchangeState(game,now),daily=familiarDailyState(game,now);
 const picked=CATCH_ITEMS.find((k:any)=>k.grade===grade)!,stock=grade===1?Infinity:e.items[picked.item];
 const bands=[4,3,2,1];
 // The ribbon fires for a payout this panel has not shown yet. `seq` is the save's own action counter,
 // so a reload cannot replay a ribbon and a second press cannot skip one.
 const payout:RewardPayout|null=e.last&&e.last.reward&&e.seq!==seen?{
  banner:e.last.kind==='buff'?'Blessing Received':'Congratulations',
  subtitle:e.last.subtitle,name:e.last.name,remaining:e.last.remaining,effect:e.last.effect,
  items:e.last.reward.map(([id,n]:any)=>[itemLabel(id),n.toLocaleString()]),
 }:null;
 const ruinButton=<button className="art-button ruin" disabled={locked} onClick={()=>setRuin(true)}><span>Ruin</span></button>;

 return <section className="familiar-explore" aria-label="Familiar exploring">
  <header className="explore-head">
   <button className="area-plaque" aria-expanded={areaInfo} onClick={()=>setAreaInfo(v=>!v)}>&#9432; {area.name}</button>
   <button className="art-button probability" disabled={locked} onClick={()=>setProb(true)}><span>Probability</span></button>
  </header>
  {areaInfo&&<p className="instruction-popover" role="note">{area.text}</p>}
  <CounterChips e={e}/>
  {/* THE ONE THING WORTH KEEPING FROM THE COMMERCE SURFACES (12-monetisation.md §5.1). The Familiar
      Shop's ten ScoreExchange rows are nine Crystal prices -- a premium currency Everkai does not have
      and should not add -- and ONE priced in Familiar Tears, which a player earns by having a monster
      flee, for the Advanced Contract that would have stopped it fleeing. It closes audit S4/M1: Tears
      accumulated with no sink at all, and an apology in a disclosure saying so. No shop shell, no
      grid, no `Switch Shop` -- one exchange, where the Tears are earned. */}
  {/* The Pass's third benefit, re-gated (12-monetisation.md §5.2): one Ordinary Mochi a day. */}
  {!c&&!q&&daily.open&&<div className="tears-exchange">
   <p>Daily &middot; {daily.count} {itemLabel(daily.item)}</p>
   <Button variant="outline" disabled={locked||!daily.left} onClick={()=>action('familiarDaily')}>Collect</Button>
   <small>{daily.left?'1 a day':'Done today'}</small>
  </div>}
  {!c&&!q&&<div className="tears-exchange">
   <p><b>{ex.held}</b>/{ex.price} {itemLabel(EXCHANGE.price.item)} &rarr; {EXCHANGE.grants.count} {itemLabel(EXCHANGE.grants.item)}</p>
   <Button variant="outline" disabled={locked||!ex.left||!ex.affordable} onClick={()=>action('exploreExchange')}>Exchange</Button>
   <small>{ex.left?'1 a day':'Done today'}</small>
  </div>}

  {c&&pet&&info?<div className="explore-stage encounter">
   {/* 4.1 -- the monster branch. The rarity pip carries its letter; the Alertness value is printed
       INSIDE the bar (X8); one success rate for the SELECTED contract, not one per button (X11). */}
   <div className="monster-plaque">
    <b className="rarity-pip" style={{background:TIER_COLOUR[info.grade]}}>{RARITY_NAMES[info.grade]}</b>
    <strong>{c.sp?'Shining ':''}{pet.name}</strong>
    {owned&&<em className="fragment-badge">{info.pieces} fragments</em>}
    <button className="details-tab" onClick={()=>setDetail(true)}>Details</button>
   </div>
   <div className="alert-bar" role="meter" aria-valuenow={c.alert} aria-valuemax={info.alertMax} aria-label="Alertness">
    <i style={{width:`${Math.min(100,c.alert/info.alertMax*100)}%`}}/><span>Alertness: {c.alert}/{info.alertMax}</span></div>
   <p className="flee-line">Monster will flee once the alertness is full.</p>
   <div className="framed-card explore-monster" style={cardStyle(pet.rarity) as any} aria-hidden="true">
    <span>{rarityIcon(cardRarity(pet.rarity))&&<img src={rarityIcon(cardRarity(pet.rarity))!} alt=""/>}</span><strong>{pet.name}</strong></div>
   <div className="rate-strip">
    <p>&#9432; Contract Success Rate: <b>{pct(catchChance(c.pet,grade),catchChance(c.pet,grade)%100?1:0)}</b></p>
    <small>Failed: Alertness +{picked.alert[0]}-{picked.alert[1]}</small></div>
   <ol className="contract-carousel" aria-label="Contracts">{CATCH_ITEMS.map((k:any)=>{
    const n=k.grade===1?'∞':e.items[k.item];
    return <li key={k.grade}><button className={'medallion'+(k.grade===grade?' picked':'')} aria-pressed={k.grade===grade}
     disabled={locked} onClick={()=>setGrade(k.grade)}><b>{k.grade}</b><em>{n}</em></button></li>})}</ol>
   <p className="contract-name">{picked.name}</p>
   <Button className="explore-primary" disabled={locked||stock<1} onClick={()=>action('exploreCatch',null,grade)}>Use</Button>
   <div className="explore-corners">
    <button className="art-button soothe" disabled={locked||c.alert<=0||c.soothed>=EXPLORE.soothe.useMax||e.items.Item_PetPacify1<1}
     onClick={()=>action('exploreSoothe')}><span>Soothe</span><em>-{EXPLORE.soothe.alert}</em><i>{e.items.Item_PetPacify1}</i></button>
    {ruinButton}</div>
  </div>

  :q?<div className={'explore-stage branch '+q.kind}>
   {/* 4.2 / 4.3 / 4.4 -- the three branches that pay. Each has its own title plaque and its own verb,
       and each ends in the shared ribbon. `Draw` and `Investigate` charge nothing: the 1 stamina was
       spent by the `Explore` press that produced them (§4.2). */}
   <div className="branch-head">
    <h4 className="branch-title">{q.kind==='luckFlower'?'Luck Flower':q.kind==='lostItem'?'Pleasant Surprise':'A Blessing'}</h4>
    {/* The Luck Flower carries its OWN rate table, separate from the encounter's (§4.2). */}
    {q.kind==='luckFlower'&&<button className="art-button probability" onClick={()=>setProb(true)}><span>Probability</span></button>}
   </div>
   {q.kind==='luckFlower'&&<ul className="petal-wheel" aria-label="Luck Flower prizes">{EXPLORE.lottery.map((row:any)=>
    <li key={row.id}><span>{itemLabel(row.item)}</span><b>&times;{row.count.toLocaleString()}</b></li>)}</ul>}
   {q.kind!=='luckFlower'&&<div className="branch-art" aria-hidden="true"/>}
   {q.kind==='blessing'&&<p className="branch-flavour">Someone on the path has something for you.</p>}
   {q.kind==='lostItem'&&<p className="branch-flavour">Supplies someone left behind, still worth carrying.</p>}
   <Button className="explore-primary" disabled={locked} onClick={()=>action('exploreResolve')}>{q.kind==='luckFlower'?'Draw':'Investigate'}</Button>
   <div className="explore-corners"><span/>{ruinButton}</div>
  </div>

  :<div className="explore-stage rest">
   <div className="area-art" aria-hidden="true"/>
   <p className="stamina-line">&#9889; {tank.stamina}/{tank.max}</p>
   <Button className="explore-primary big" disabled={locked||(!free&&tank.stamina<area.cost)} onClick={()=>action('exploreStep')}>
    Explore<em className={free?'waived':''}>Consume &#9889;{area.cost}</em></Button>
   <div className="explore-corners">
    <button className="art-button attract" disabled title={`Unlocks at Familiar Tower floor ${EXPLORE.trapOpen}`}>
     <span>Attract</span><em className="gate-badge">&#128274;{EXPLORE.trapOpen}</em></button>
    {ruinButton}</div>
  </div>}

  <footer className="explore-bar"><button className="intro-link" onClick={()=>setIntro(true)}>Intro</button></footer>

  <RewardRibbon payout={payout} onClose={()=>setSeen(e.seq)}/>

  {/* 3 -- the rate disclosure earns its own screen: band totals from System.ExplorePetCatchWeight
      and the per-familiar share from this area's roster at that rarity, IsOwnedPet filtered. */}
  <Dialog open={prob} onOpenChange={setProb}><DialogContent className="save-dialog probability-sheet">
   <DialogTitle>Probability</DialogTitle>
   <DialogDescription className="sr-only">Encounter rates in {area.name}</DialogDescription>
   {/* Composed from the tables, not written down: PetArea.EventPool splits the press, and the
       PetExploreItem rows of THIS AREA split its share again into the reward row and the buff rows.
       Everkai used to print three leaves where the tables give four, folding the blessing into
       "lost item" -- a label bug over a correct model (§0). Deriving it is what keeps it honest. */}
   {(()=>{const ev:any=area.events,pool=EXPLORE.exploreItems.filter((r:any)=>r.area===area.id);
    const total=Object.values(ev).reduce((n:number,w:any)=>n+w,0) as number;
    const sub=pool.reduce((n:number,r:any)=>n+r.weight,0);
    const of=(w:number)=>Math.round(w/total*10000);
    const item=of(ev.PetExploreItem),lost=pool.filter((r:any)=>r.type==='reward').reduce((n:number,r:any)=>n+r.weight,0);
    return <p className="branch-rates">Monster {pct(of(ev.PetCatch))} &middot; Lost item {pct(Math.round(item*lost/sub))}
     &middot; Blessing {pct(Math.round(item*(sub-lost)/sub))} &middot; Luck Flower {pct(of(ev.PetExploreLottery))}</p>})()}
   {bands.map(g=>{const pool=encounterPool(game,area,g);if(!pool.length)return null;
    const band=(EXPLORE.gradeWeights as any)[g],share=band/pool.length;
    return <section key={g} className="prob-band">
     <h5 style={{color:TIER_COLOUR[g]}}>&#9671; {RARITY_NAMES[g]}: {pct(band)} &#9671;</h5>
     <ul>{pool.map((id:string)=>{const p=familiarById(id)!;
      return <li key={id}><span className="prob-card" style={cardStyle(p.rarity) as any}><img src={petCardIcon(p.rarity)||''} alt=""/></span>
       <strong>{p.name}</strong><small>{pct(share,share<100?3:2)}</small></li>})}</ul>
    </section>})}
  </DialogContent></Dialog>

  {/* 5 -- `Ruin`: the areas, their gates, and how much of each roster you have contracted. */}
  <Dialog open={ruin} onOpenChange={setRuin}><DialogContent className="save-dialog ruin-map">
   <DialogTitle>Ruin</DialogTitle><DialogDescription>Choose where to explore.</DialogDescription>
   {EXPLORE_AREAS.map((a:any)=>{const open_=areaUnlocked(game,a.id),have=a.pets.filter((id:string)=>game.familiars?.[id]).length;
    return <button key={a.id} className={'area-row'+(a.id===e.area?' current':'')+(open_?'':' locked')} disabled={locked||!open_}
     onClick={()=>{if(a.id!==e.area)action('exploreArea',a.id);setRuin(false)}}>
     <strong>{a.name}</strong>
     {a.id===e.area&&<b className="current-ribbon">Current Area</b>}
     <span className="area-trays">Contracted: {have}/{a.pets.length}</span>
     {!open_&&<span className="area-gate"><em>Familiar Tower floor {a.unlock}</em></span>}
    </button>})}
  </DialogContent></Dialog>

  {/* 6 -- `Intro`. Four captions, which is what the deleted disclosures were trying to be. */}
  <Dialog open={intro} onOpenChange={setIntro}><DialogContent className="save-dialog explore-intro">
   <DialogTitle>Explore Freely</DialogTitle>
   <DialogDescription>What happens when you press Explore.</DialogDescription>
   <ol className="intro-steps">
    <li>Each exploration consumes {area.cost} stamina, and stamina returns on its own over time.</li>
    <li>Exploring may find a wild monster, a lost cache of supplies, a blessing, or a Luck Flower.</li>
    <li>Use a contract on a monster to make it a familiar. A failed contract raises its alertness, and a full bar means it flees.</li>
    <li>Ruin moves you to another area. Areas open as you climb the Familiar Tower.</li>
   </ol>
  </DialogContent></Dialog>

  {/* `Details` on the encounter opens the same locked-card preview the rest of the surface uses. */}
  <Dialog open={detail} onOpenChange={setDetail}><DialogContent className="save-dialog">
   <DialogTitle>{pet?.name}</DialogTitle>
   <DialogDescription>{info?`${RARITY_NAMES[info.grade]} · found in ${area.name}`:''}</DialogDescription>
   {pet&&<div className="framed-card explore-monster" style={cardStyle(pet.rarity) as any}>
    <span>{rarityIcon(cardRarity(pet.rarity))&&<img src={rarityIcon(cardRarity(pet.rarity))!} alt=""/>}</span><strong>{pet.name}</strong></div>}
   <p className="item-status">{owned?`Already contracted. A new contract pays ${info?.pieces} fragments.`:'Not yet contracted.'}</p>
  </DialogContent></Dialog>
 </section>;
}
