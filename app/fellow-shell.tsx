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
import {cardStyle} from '@/lib/ui-sprites.mjs';
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

/** The right rail's lower group. The original keeps equipment OFF the section dock: a feather-glyph
 *  Blessing button, then two 76px tiles for the familiar and the artifact, each showing the equipped
 *  thing's art and level (spec 02, "Right rail, lower group"). Everkai's Equipment and Wardrobe pages
 *  move here, which is what takes the dock from eight entries to the original's five. Form Switch --
 *  the original's costume screen -- is the left rail's fourth pill, and Wardrobe is Everkai's version
 *  of it, so it keeps the same one-tap reach. */
export function FellowRail({game,person,action,locked,children}:any){
 const [open,setOpen]=useState<null|'gear'|'wardrobe'>(null);
 const f=game.fellows[person.id];if(!f)return null;
 return <>
  <Button variant="outline" className="rail-tile" onClick={()=>setOpen('gear')} aria-label="Artifact and equipment"><span className="rail-glyph">◈</span><span>Artifact</span></Button>
  <Button variant="outline" className="rail-tile" onClick={()=>setOpen('wardrobe')} aria-label="Form switch and wardrobe"><span className="rail-glyph">❖</span><span>Form</span></Button>
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
