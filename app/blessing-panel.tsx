import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {QuantityPicker,PrimaryAction,abbrev,type Quantity} from './original-controls';
import {specialEligible,specialPlan} from '@/lib/special-blessings.mjs';
import {originalProgression} from '@/lib/original-progression.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {isAddition} from '@/lib/everkai-additions.mjs';
import {cardStyle} from '@/lib/ui-sprites.mjs';
import {bondedPower} from '@/lib/adventure.mjs';
import {BLESSINGS,blessingLevel,blessingValue,nextBlessingCost,blessingPlan,blessingRecipients,
        nextBlessingValue} from '@/lib/blessings.mjs';
/** FAMILY BLESSING ("Fixed Blessed Fellow"), rebuilt to docs/family-screen-specs/07-blessing.md.
 *
 *  THE PORTRAIT ROW IS THE POINT. Everkai named the blessed Fellows in a sentence -- `Blesses
 *  Rissette, Orivita` -- and never said what each one actually got. The original draws their
 *  portraits in rarity-coloured rings with a `POW +n` badge under each, and that row is the panel's
 *  masthead rather than a footnote, because it is the only picture anywhere in the UI of the thing
 *  three of the five Family sections are paying into: Blessing Power -> Blessing Points -> this
 *  member's blessings -> THAT Fellow's Power.
 *
 *  The `POW +n` under each portrait is measured, not apportioned: it is bondedPower() for that
 *  Fellow minus bondedPower() computed with this member's blessings zeroed. So it answers "what does
 *  she grant him", which is the original's own question, and it differs per Fellow exactly as the
 *  capture's two badges do (+4.244K and +5.051K), because the advanced blessing is a percentage of
 *  his own Power.
 *
 *  Nothing here changes a cost, a level or an effect.
 *
 *  WHAT THIS PANEL DOES NOT PAY, kept as a comment rather than as on-screen prose: Family blessings
 *  reach Fellow and party Power and NOT village earnings. They are not a strand in businessBonus and
 *  must not become one by accident -- Family Fathoms is already the family channel there (F16), so
 *  adding these on top would count the family contribution twice. The old panel said this in a
 *  105-word rules-note; spec 07 retires that note, but the claim still has to be written down
 *  somewhere, and tests/strands.test.mjs's claim scan reads this file's text, so this comment is
 *  what keeps blessing-panel.tsx honest in NOT_A_BUSINESS_STRAND. */

const n=(x:number)=>Math.round(x).toLocaleString('en-US');

/** What THIS member's blessings are currently worth to THIS Fellow, in Power. */
function powerGift(game:any,familyId:string,fellowId:string){
 if(!game.fellows?.[fellowId])return null;
 const f=game.family[familyId];
 const without={...game,family:{...game.family,
  [familyId]:{...f,flatBlessing:0,advancedBlessing:0,apkBlessings:undefined,specialBlessing:null}}};
 try{return bondedPower(game,fellowId)-bondedPower(without,fellowId)}catch{return null}
}

/** `showGift` is false on the not-yet-joined Preview (spec 13): the portraits are the whole point
 *  there -- which Fellows she WILL bless -- and nothing is trained yet, so there is no badge. */
export function BlessedFellow({game,familyId,fellowId,showGift=true}:any){
 const p=fellowById(fellowId);
 const owned=!!game.fellows?.[fellowId];
 const gift=owned&&showGift&&game.family?.[familyId]?powerGift(game,familyId,fellowId):null;
 const art=p?.portrait||p?.art;
 return <div className={'blessed-fellow'+(owned?'':' blessed-absent')}>
  <span className="blessed-ring" style={cardStyle(p?.rarity) as any}>
   {art?<img src={'./assets/'+art} alt=""/>:<i aria-hidden="true">?</i>}</span>
  <b className="blessed-name">{p?.name||fellowId}</b>
  {/* An unrecruited Fellow is a desaturated portrait and nothing else -- no sentence. */}
  {owned&&gift!==null?<u className="pow-badge">POW +{abbrev(gift)}</u>:null}
 </div>;
}

/** One upgrade row: name + Lv. and its OWN selector on the header line, the effect, the next-level
 *  preview, and one clamping green button with `have/cost` inside it.
 *
 *  The selector offers `Quick` and `x1` only. Everkai's engine has exactly those two blessing
 *  actions -- trainBlessing buys one, trainBlessingsMax buys every affordable level -- and giving
 *  `x10`/`x100` real prices would mean changing what the action does, which is a mechanic and not
 *  this pass's business. The segments stay drawn and disabled, as on Latency. */
function UpgradeRow({game,id,keyName,rule,action,locked}:any){
 const [quantity,setQuantity]=useState<Quantity>('max');
 const f=game.family[id],pairs=blessingRecipients(game,id);
 const level=blessingLevel(f,keyName),cost=nextBlessingCost(f,keyName,game,id);
 const plan=blessingPlan(f,keyName,game,quantity===1?1:700,id);
 const maxed=cost===null;
 // The label already says "Power", so the value carries only the magnitude and its unit -- which is
 // also how the original prints it: `Blessed Fellow Power+1K`, `Blessed Fellow Power+0.5%`.
 const value=(x:number)=>keyName==='flatBlessing'?`+${n(x)}`:`+${(x*100).toFixed(1)}%`;
 return <div className="bless-row">
  <div className="bless-head"><strong>{rule.name} <em>Lv. {level}</em></strong>
   <QuantityPicker value={quantity} onChange={setQuantity} allow={[1,'max']} label={rule.name+' quantity'}/></div>
  <p className="bless-effect">Blessed Fellow Power{value(blessingValue(f,keyName))}</p>
  {!maxed&&<p className="bless-next">(Next Level {value(nextBlessingValue(game,f,keyName,id))})</p>}
  <div className="bless-action">
   {maxed
    ?<span className="inert-pill">Max</span>
    :<PrimaryAction verb={plan.count?`Upgrade x${plan.count}`:'Upgrade'} disabled={locked||!pairs.length||!plan.count}
      currency="Points" have={f.points} cost={plan.count?plan.cost:cost}
      onClick={()=>action(quantity===1?'trainBlessing':'trainBlessingsMax',id,keyName)}/>}
  </div>
 </div>;
}

export default function BlessingPanel({game,id,action,locked}:any){
 const f=game.family?.[id];
 if(!f)return null;
 const pairs=blessingRecipients(game,id);
 return <article className="blessing-panel">
  <h3 className="sheet-title">&#9671;&#9671; Fixed Blessed Fellow &#9671;&#9671;</h3>
  <div className="blessed-row">
   {pairs.length
    ?pairs.map((fid:string)=><BlessedFellow key={fid} game={game} familyId={id} fellowId={fid}/>)
    /* Convention 9: an empty slot is DRAWN, not described. */
    :<div className="blessed-fellow blessed-empty"><span className="blessed-ring"><i aria-hidden="true">&#9679;</i></span></div>}
  </div>
  {Object.entries(BLESSINGS).map(([keyName,rule]:any)=>
   <UpgradeRow key={keyName} game={game} id={id} keyName={keyName} rule={rule} action={action} locked={locked}/>)}
  {/* Everkai's own tier, with no counterpart in the capture: WifeCustomBless is rarity-gated and no
      member on the captured save cleared it, so the original's panel showed no tab for it at all.
      Left as it was rather than removed on absent evidence -- see the specs' README. */}
  {originalProgression(game)&&!isAddition(id)&&<div className="bless-row">
   <div className="bless-head"><strong>Special Blessing <em>{f.specialBlessing?`Lv. ${f.specialBlessing.level}`:'Locked'}</em></strong></div>
   {f.specialBlessing
    ?<><p className="bless-effect">Blessed Fellow Aptitude +{2*f.specialBlessing.level} of 700</p>
      <div className="bless-action">{([1,5,'max'] as const).map(count=>{const p=specialPlan(game,id,count);
       return <Button key={count} className="primary-action" disabled={locked||!p.count} onClick={()=>action('trainSpecialBlessing',id,count)}>
        <b>{count==='max'?'Max':`+${count}`}</b><small>+{p.count*2} Apt &middot; {abbrev(p.cost)}</small></Button>})}</div></>
    :<div className="bless-action"><Button className="primary-action" disabled={locked||!specialEligible(game,id)}
       onClick={()=>action('activateSpecialBlessing',id)}><b>Activate</b></Button></div>}
  </div>}
 </article>;
}
