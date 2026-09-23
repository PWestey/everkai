import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {bondedPower,powerParts,fellowCap,fellowStars,breakCost,levelTrainingPlan,xpCost,STAR_CAP} from '@/lib/adventure.mjs';
import {originalProgression,sourceQuality,qualityRule,localTier,SOURCE_MATERIALS} from '@/lib/original-progression.mjs';
import {PrimaryAction,QuantityPicker,abbrev,type Quantity} from './original-controls';
import PowerDetails from './power-details';
import TrainingRules from './training-rules';
import FellowReset from './fellow-reset';
import {fellowById} from '@/lib/catalog.mjs';
import {cardStyle,petCardIcon} from '@/lib/ui-sprites.mjs';
import {FAMILIARS,familiarById} from '@/lib/familiars.mjs';
import {GEAR} from '@/lib/adventure.mjs';
import {gearLevel} from '@/lib/artifacts.mjs';
import itemArt from '@/lib/item-art.mjs';
/** THE CULTIVATE SHELL'S PERSISTENT FURNITURE, built to docs/fellow-screen-specs/02-cultivate-shell.md
 *  and 03-upgrade.md.
 *
 *  Two findings from the captures drive this file:
 *
 *  1. The stat block is PERSISTENT. Power, Level, Aptitude and Earnings sit over the art under every
 *     section, in three deliberate number registers (convention 5): Power in full digits with
 *     separators, Earnings abbreviated, Aptitude plain. Everkai kept these as tiles inside an
 *     "Overview" page that only existed because the pager needed a first page (difference C4).
 *  2. Upgrade IS the bare shell (spec 03's key finding). Tapping `Upgrade` in the dock closes any open
 *     panel and leaves art + stat block + one action. So the most-used screen on the Fellow surface
 *     has zero explanatory text and exactly two controls: the quantity selector and one button.
 *
 *  Nothing here changes what an action does, what it costs or what it yields. `train`, `limitBreak`
 *  and `originalQuality` are the same three actions Everkai already had, presented as the original
 *  presents them. */

const n=(x:number)=>Math.round(x).toLocaleString('en-US');
const ICON='./assets/ui-original/Icons--Icon_EmblemStrength_1.png';

/** The `(i)` glyph. Convention 10: every explanatory paragraph in the original is behind one. */
export function InfoDot({label,onClick}:{label:string,onClick:()=>void}){
 return <button type="button" className="info-dot" aria-label={label} onClick={onClick}>i</button>;
}

/** Power · Level bar + stars · Aptitude · Earnings, over the art, under every section. */
export function FellowStatBlock({game,id,name,earnings=0,action,locked}:any){
 const f=game.fellows[id];const [power,setPower]=useState(false),[level,setLevel]=useState(false);
 if(!f)return null;
 const cap=fellowCap(f,game,id),atCap=f.level>=cap,stars=fellowStars(f);
 const parts=powerParts(game,id);
 return <div className="fellow-stats">
  <div className="fellow-stat fellow-power"><img src={ICON} alt=""/><span>POW</span><strong>{n(bondedPower(game,id))}</strong>
   <InfoDot label="Where this Fellow's Power comes from" onClick={()=>setPower(true)}/></div>
  <div className="fellow-stat fellow-level"><span>Lv.</span><strong>{f.level}</strong>
   <div className={'level-bar'+(atCap?' level-full':'')}><i style={{width:Math.max(3,Math.min(100,f.level/Math.max(1,cap)*100))+'%'}}/>
    <span className="awaken-stars" aria-label={stars+' of '+STAR_CAP+' stars'}>{Array.from({length:STAR_CAP},(_,i)=><b key={i} className={i<stars?'lit':''}>★</b>)}</span></div>
   <InfoDot label="Fellow Level rules and quick setup" onClick={()=>setLevel(true)}/></div>
  <div className="fellow-stat"><span className="glyph">✦</span><span>Aptitude</span><strong>{n(parts.aptitude)}</strong></div>
  <div className="fellow-stat"><span className="glyph">⌂</span><span>Earnings</span><strong>+ {abbrev(earnings)}/s</strong></div>
  <Dialog open={power} onOpenChange={setPower}><DialogContent className="breakdown-dialog">
   <DialogTitle>Power Details</DialogTitle>
   <DialogDescription className="sr-only">Every source of this Fellow&rsquo;s Power and Aptitude.</DialogDescription>
   <PowerDetails game={game} id={id}/>
  </DialogContent></Dialog>
  <Dialog open={level} onOpenChange={setLevel}><DialogContent className="save-dialog">
   <DialogTitle>Fellow Level</DialogTitle>
   <DialogDescription>Level limit {cap} · {n(game.fellowXP)} Fellow EXP held</DialogDescription>
   <TrainingRules game={game} id={id} action={action} locked={locked}/>
   <FellowReset game={game} id={id} name={name||id} action={action} locked={locked}/>
  </DialogContent></Dialog>
 </div>;
}

/** Spec 03's Limit Break dialog: two outcome pills using `»`, the required items as tiles whose red
 *  ground IS the insufficiency message, and a green button that stays green when the requirement is
 *  unmet. Both of Everkai's cap ladders feed it -- limit tokens on the classic curve, the quality
 *  breakthrough materials under APK growth -- because they are the same action wearing two prices. */
function LimitBreakDialog({game,id,action,locked,open,onOpenChange}:any){
 const f=game.fellows[id],apk=originalProgression(game),cap=fellowCap(f,game,id);
 const q=apk?sourceQuality(game,id):localTier(f),rule=qualityRule(q),next=qualityRule(Math.min(14,q+1));
 const items=apk?rule.consume.map((c:any)=>({id:c.id,name:(SOURCE_MATERIALS as Record<string,string>)[c.id]||c.id,have:game.originalProgression.stock[c.id]||0,need:c.count}))
  :[{id:'local_limit_token',name:'Limit token',have:game.inventory.local_limit_token,need:breakCost(f)}];
 // Deliberately NOT disabled when an item is missing: spec 03 -- "the button stays green and
 // tappable-looking even when the requirement is unmet; the failure is communicated by the tiles".
 // Pressing it with 0/1 gets the engine's own refusal, which is the same refusal it always gave.
 const p=fellowById(id);
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="limit-break-dialog">
  <DialogTitle>Limit Break</DialogTitle>
  <DialogDescription className="sr-only">Raise this Fellow&rsquo;s level cap.</DialogDescription>
  {p&&<div className="framed-card limit-break-art" style={cardStyle(p.rarity) as any} aria-hidden="true"><img src={'./assets/'+(p.portrait||p.art)} alt=""/></div>}
  <p className="outcome-pill">Level Cap {cap} <em>»</em> <b>{next.cap}</b></p>
  <p className="outcome-pill">Aptitude +{rule.talent} <em>»</em> <b>+{next.talent}</b></p>
  <h3 className="band-rule">Required Items</h3>
  <div className="item-tiles">{items.map((i:any)=><div key={i.id} className={'item-tile'+(i.have<i.need?' item-short':'')}>
   <span>{i.name}</span><b>{i.have}/{i.need}</b></div>)}</div>
  <Button className="primary-action" disabled={locked} onClick={()=>{action(apk?'originalQuality':'limitBreak',id);onOpenChange(false)}}><b>Limit Break</b></Button>
 </DialogContent></Dialog>;
}

/** The Upgrade section: the bare shell's one action. Below cap, a green `Upgrade xN` with `EXP
 *  have/cost` inside it; at cap, the same slot becomes a gold `Limit Break`. */
export function FellowUpgrade({game,id,action,locked}:any){
 const [quantity,setQuantity]=useState<Quantity>(100),[breakOpen,setBreakOpen]=useState(false);
 const f=game.fellows[id];if(!f)return null;
 const cap=fellowCap(f,game,id),atCap=f.level>=cap;
 if(atCap)return <div className="spend-controls">
  <PrimaryAction verb="Limit Break" tier disabled={locked} onClick={()=>setBreakOpen(true)}/>
  <LimitBreakDialog game={game} id={id} action={action} locked={locked} open={breakOpen} onOpenChange={setBreakOpen}/>
 </div>;
 // The count is min(selected, affordable, levelsToCap) -- the plan already clamps all three. The
 // intent stays on the selector; the button tells the truth (README convention 4).
 const plan=levelTrainingPlan(game,id,quantity);
 return <div className="spend-controls">
  <QuantityPicker value={quantity} onChange={setQuantity} label="Upgrade quantity"/>
  <PrimaryAction verb={plan.count?`Upgrade x${plan.count}`:'Upgrade'} disabled={locked||!plan.count}
   currency="EXP" have={game.fellowXP} cost={plan.count?plan.cost:xpCost(f.level,game)}
   onClick={()=>action('train',id,quantity)}/>
 </div>;
}

/** THE RIGHT RAIL'S LOWER GROUP, built to docs/fellow-screen-specs/10-familiar-artifact.md.
 *
 *  The original keeps equipment OFF the section dock: two 76px square tiles stacked on the rail,
 *  the familiar above the artifact, each showing the equipped thing's art with its level on a strip
 *  across the tile's foot. An EMPTY tile is a large plus on a brown ground with a small red dot
 *  badge -- the badge meaning "you own something that could go here". No caption, and nowhere does
 *  the word "none" appear (convention 9: empty slots are drawn, not described).
 *
 *  That is difference E1: Everkai reached equipment through a pager page, so a Fellow's equipment
 *  was never part of their portrait. Now it always is, and the tile is the affordance.
 *
 *  Form Switch keeps the third slot, because Everkai's Wardrobe is its version of the original's
 *  left-rail Form Switch and it earned a one-tap reach in the same pass. */
function Tile({label,art,level,badge,onClick}:{label:string,art?:string|null,level?:number|null,badge?:boolean,onClick:()=>void}){
 return <Button variant="outline" className={'rail-tile'+(art?'':' rail-empty')} onClick={onClick} aria-label={label}>
  {art?<img src={art} alt=""/>:<span className="rail-plus" aria-hidden="true">+</span>}
  {art&&level!=null?<u>Lv.{level}</u>:null}
  {!art&&badge?<em className="rail-dot" aria-hidden="true"/>:null}
  <span className="sr-only">{label}</span>
 </Button>;
}

/** Spec 10's `Select Familiar`: the bound familiar on its own raised band with an ORANGE `Unbind`,
 *  a rule, then the candidates as art cards. Each candidate carries the CURRENT HOLDER'S PORTRAIT
 *  over its art (E3) -- that overlay is how you see, without leaving the screen, that taking this
 *  familiar costs another Fellow theirs -- and its verb is `Equip` when it is free and `Swap` when
 *  it is not (E4). Same colour, different word: the word carries the consequence.
 *
 *  NOT PORTED: `Free Attempts: N`. The spec flags it as a per-item counter out of the original's
 *  monetised loop, no such counter is in Everkai's imported tables, and inventing one would be this
 *  project's own mechanic. */
function SelectFamiliar({game,id,action,locked}:any){
 const bonds:Record<string,string>=game.familiarBonds||{},owned=game.familiars||{};
 const boundId=bonds[id]||null,bound=boundId?familiarById(boundId):null;
 const holderOf=(pet:string)=>Object.keys(bonds).find(f=>bonds[f]===pet&&f!==id)||null;
 const list=FAMILIARS.filter((p:any)=>Object.hasOwn(owned,p.id)&&p.id!==boundId);
 const art=(p:any)=>petCardIcon(p.rarity)||'';
 return <div className="familiar-select">
  {bound&&<><div className="familiar-row familiar-bound">
   <span className="familiar-art" style={cardStyle(bound.rarity) as any}><img src={art(bound)} alt=""/></span>
   <div><strong>lv.{owned[boundId!]?.level??1} {bound.name}</strong><p>{bound.rarity} &middot; {bound.type}</p></div>
   <Button className="primary-action primary-tier" disabled={locked} onClick={()=>action('unbindFamiliar',boundId)}><b>Unbind</b></Button>
  </div><hr className="source-rule"/></>}
  {list.map((p:any)=>{const holder=holderOf(p.id),who=holder?fellowById(holder):null;
   return <div className="familiar-row" key={p.id}>
    <span className="familiar-art" style={cardStyle(p.rarity) as any}><img src={art(p)} alt=""/>
     <b className="familiar-stars">{p.classMax}&#9733;</b>
     {who&&(who.portrait||who.art)?<img className="familiar-holder" src={'./assets/'+(who.portrait||who.art)} alt={who.name}/>:null}</span>
    <div><strong>lv.{owned[p.id]?.level??1} {p.name}</strong><p>{p.rarity} &middot; {p.type}</p></div>
    <Button className="primary-action" disabled={locked} onClick={()=>action('bindFamiliar',p.id,id)}><b>{holder?'Swap':'Equip'}</b></Button>
   </div>})}
  {!bound&&!list.length&&<p className="familiar-empty">No companion has been contracted yet.</p>}
 </div>;
}

export function FellowRail({game,person,action,locked,children}:any){
 const [open,setOpen]=useState<null|'pet'|'gear'|'wardrobe'>(null);
 const f=game.fellows[person.id];if(!f)return null;
 const owned=game.familiars||{},bonds:Record<string,string>=game.familiarBonds||{};
 const petId=bonds[person.id]||null,pet=petId?familiarById(petId):null;
 const petArt=pet?petCardIcon(pet.rarity):null;
 const gear=f.gear?GEAR.find((g:any)=>g.id===f.gear):null;
 const gearArt=gear?((itemArt as Record<string,string>)[gear.id]||'./assets/menu/relics.png'):null;
 return <>
  <Tile label="Familiar" art={petArt} level={petId?owned[petId]?.level??1:null}
   badge={Object.keys(owned).length>0} onClick={()=>setOpen('pet')}/>
  <Tile label="Artifact" art={gearArt} level={gear?gearLevel(f):null}
   badge={GEAR.some((g:any)=>game.inventory[g.id]>0)} onClick={()=>setOpen('gear')}/>
  <Tile label="Form Switch" art="./assets/menu/relics.png" level={null} onClick={()=>setOpen('wardrobe')}/>
  <Dialog open={open==='pet'} onOpenChange={o=>setOpen(o?'pet':null)}><DialogContent className="character-sheet panel-centered">
   <DialogTitle>Select Familiar</DialogTitle><DialogDescription className="sr-only">Bind a companion to this Fellow.</DialogDescription>
   <div className="character-sheet-body"><SelectFamiliar game={game} id={person.id} action={action} locked={locked}/></div>
  </DialogContent></Dialog>
  <Dialog open={open==='gear'} onOpenChange={o=>setOpen(o?'gear':null)}><DialogContent className="character-sheet panel-centered">
   <DialogTitle>Artifact</DialogTitle><DialogDescription className="sr-only">Equip and upgrade this Fellow&rsquo;s artifact.</DialogDescription>
   <div className="character-sheet-body">{children?.gear}</div>
  </DialogContent></Dialog>
  <Dialog open={open==='wardrobe'} onOpenChange={o=>setOpen(o?'wardrobe':null)}><DialogContent className="character-sheet panel-centered">
   <DialogTitle>Form Switch</DialogTitle><DialogDescription className="sr-only">Change this Fellow&rsquo;s appearance.</DialogDescription>
   <div className="character-sheet-body">{children?.wardrobe}</div>
  </DialogContent></Dialog>
 </>;
}

/** Spec 06's shared header for both Aptitude tabs, and spec 11's second entry point into the
 *  breakdown: `Total Aptitude N (i)`, centred, the number green. It replaces Everkai's
 *  `Talent skills - +N Aptitude (skills 3 - intimacy 0 - Stella 0 - Rarity Advance 0)` -- a 4-source
 *  breakdown crammed into a parenthesis where the original names every source it has. */
export function AptitudeHeader({game,id}:any){
 const [open,setOpen]=useState(false);
 if(!game.fellows[id])return null;
 return <div className="aptitude-header">
  <span className="glyph">✦</span><span>Total Aptitude</span><b>{powerParts(game,id).aptitude.toLocaleString('en-US')}</b>
  <InfoDot label="Where this Fellow's Aptitude comes from" onClick={()=>setOpen(true)}/>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="breakdown-dialog">
   <DialogTitle>Detail</DialogTitle>
   <DialogDescription className="sr-only">Every source of this Fellow&rsquo;s Aptitude and Power.</DialogDescription>
   <PowerDetails game={game} id={id}/>
  </DialogContent></Dialog>
 </div>;
}
