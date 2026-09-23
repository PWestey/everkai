import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {stellaRule,stellaState,stellaEntry,stellaActivation,STELLA_IDLE_PER_DAY,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
import {helperFocusList,helperNote,stellaOrder} from '@/lib/helper.mjs';
import StellaAttributes from './stella-attributes';
import {PrimaryAction,abbrev} from './original-controls';
import {InfoDot} from './fellow-shell';
/** STELLA, rebuilt to docs/fellow-screen-specs/04-stella.md and measured on img/stella-main.png,
 *  img/stella-level0.png and img/stella-node.png.
 *
 *  THE FINDING: Stella is a PER-NODE system. The original draws a constellation of 20 tappable nodes
 *  and, for whichever one you tap, shows that node's own step -- `Lv. 19 -> Lv. 20` over banded
 *  sections of `old -> new` with the new value in green. Everkai collapsed the whole 20-level ladder
 *  into two sentences of totals (S1): what you have now, and what the top of the ladder grants. A
 *  player could not see what the NEXT level gives, which is the only question this screen exists to
 *  answer.
 *
 *  Everkai already had every number: `stellaRule(id).levels` is 20 rows of cumulative values, so each
 *  node's step is row[n] against row[n-1] and nothing needed computing. At Lv. 0 the same
 *  constellation renders with its stars unfilled and its track dull -- nothing is hidden and nothing
 *  says "locked" (img/stella-level0.png).
 *
 *  WHAT THE SPEC ASKS FOR AND EVERKAI CANNOT SUPPLY: the original's `Stella Boost` band carries NAMED
 *  boosts with their own levels (`Demon Slayer Corps Lv. 10`, `Trade Expert Lv. 3`) and some nodes pay
 *  a Dynamic Avatar cosmetic marked `(Acquired)`. Everkai's imported HeroSpirit rows are scalars --
 *  flat Power, own/typed Power percent, appointment yield, aptitude-skill cap -- with no node/reward
 *  join and no avatar column. Those two are noted, not invented: the band here carries the scalar
 *  effects Everkai does have, split the way the original splits them (stat boosts in `Attribute
 *  Boost`, cross-system effects in `Stella Boost`).
 *
 *  NO BALANCE CHANGE: `stellaActivate` and `stellaUpgrade` are the same two actions at the same
 *  prices, and the button still buys the NEXT node however far ahead you are looking. */

const pctOf=(bp:number)=>(bp/100).toLocaleString('en-US',{maximumFractionDigits:2})+'%';
/** Which columns THIS ladder carries, read off its own top row rather than off its owner -- the defect
 *  found by eye on 2026-09-18 ("Brave Power +0%" on a track with no percent at all). */
const has=(p:any)=>{const top=p.levels.at(-1);return {
 typed:!!p.type&&top.percent>0,own:!p.type&&top.percent>0,self:top.selfPowerBp>0,appoint:top.appointYieldBp>0,talent:top.talentLimit>0};};

/** One `old -> new` row. Convention 1: never a sentence, and the new value in green. */
function StepRow({glyph,name,from,to}:{glyph:string,name:string,from:string,to:string}){
 return <p className="step-row"><span className="glyph">{glyph}</span><span>{name}</span>
  <span className="step-value">{from} <em>→</em> <b>{to}</b></span></p>;
}

export default function StellaPanel({id,game,action,locked}:any){
 const p=stellaRule(id);
 const [pick,setPick]=useState<number|null>(null);
 const [info,setInfo]=useState(false);
 if(!p)return null;
 const t=stellaState(game),e=stellaEntry(game,id),k=has(p);
 const rank=e?e.level:0,shards=t.stock[p.itemId]||0;
 const crossover=p.type===null,pooled=p.itemId===SPIRIT_SHARD_ITEM;
 const currency=crossover?'crossover shards':pooled?'village shards':'owner fragments';
 const ownItem:string|undefined=(p as any).ownItemId,own=ownItem?(t.stock[ownItem]||0):0;
 const act=stellaActivation(id)||{flat:0,percent:0,selfPowerBp:0,appointYieldBp:0,talentLimit:0};
 const zero={flat:0,percent:0,selfPowerBp:0,appointYieldBp:0,talentLimit:0};
 // A node's step is its own row against the row below it; node 1's "before" is what activation grants.
 const rowOf=(level:number)=>level<=0?(e?act:zero):p.levels[level-1];
 const node=Math.min(p.levels.length,Math.max(1,pick??Math.min(p.levels.length,rank+1)));
 const before=rowOf(node-1),after=rowOf(node);
 const taken=rank>=node,next=rank<p.levels.length?p.levels[rank]:null;
 const focus=helperFocusList(game),spot=focus.indexOf(id)+1;
 const queue=stellaOrder(game),place=queue.indexOf(id)+1,report=helperNote(game,'stella');
 const run=(a:string,count:any=1)=>action(a,id,{seq:t.seq,count});
 return <section className="stella-panel">
  <header className="stella-head">
   <InfoDot label="About Stella" onClick={()=>setInfo(true)}/>
   <strong>Stella Level: Lv. {rank}</strong>
   <StellaAttributes game={game} id={id}/>
  </header>
  <div className="stella-body">
   <div className={'stella-track'+(e?'':' stella-dark')} role="tablist" aria-label="Stella nodes">
    {p.levels.map((row:any)=><button key={row.level} type="button" role="tab" aria-selected={row.level===node}
      className={'stella-node'+(rank>=row.level?' lit':'')} onClick={()=>setPick(row.level)}>
      <i aria-hidden="true">✦</i><span>Lv. {row.level}</span></button>)}
   </div>
   <div className="stella-detail">
    <p className="node-step">Lv. {node-1} <em>→</em> <b>Lv. {node}</b></p>
    <h4 className="source-band">Attribute Boost</h4>
    <StepRow glyph="POW" name="Power" from={'+'+abbrev(before.flat)} to={'+'+abbrev(after.flat)}/>
    {k.self&&<StepRow glyph="✦" name="Own Power" from={'+'+pctOf(before.selfPowerBp)} to={'+'+pctOf(after.selfPowerBp)}/>}
    {k.typed&&<StepRow glyph="✦" name={p.type+' Power'} from={'+'+before.percent+'%'} to={'+'+after.percent+'%'}/>}
    {k.own&&<StepRow glyph="✦" name="Own Power" from={'+'+before.percent+'%'} to={'+'+after.percent+'%'}/>}
    {(k.appoint||k.talent)&&<h4 className="source-band">Stella Boost</h4>}
    {k.appoint&&<StepRow glyph="⌂" name="Appointment yield" from={'+'+pctOf(before.appointYieldBp)} to={'+'+pctOf(after.appointYieldBp)}/>}
    {k.talent&&<StepRow glyph="✦" name="Aptitude skill cap" from={'+'+before.talentLimit} to={'+'+after.talentLimit}/>}
   </div>
  </div>
  <div className="stella-foot">
   {taken?<span className="activated-pill">Activated</span>
    :!e?<PrimaryAction verb="Upgrade" disabled={locked} onClick={()=>run('stellaActivate')}/>
    :<PrimaryAction verb="Upgrade" disabled={locked||!next} onClick={()=>run('stellaUpgrade',1)}
      have={shards} cost={next?next.cost:0}/>}
  </div>
  {/* Convention 10: every explanatory paragraph in the original is behind the `(i)`, and Everkai's own
      controls that the original has no slot for live here too rather than crowding the one action. */}
  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="save-dialog">
   <DialogTitle>Stella</DialogTitle>
   <DialogDescription>{shards.toLocaleString()} {currency} held · {STELLA_IDLE_PER_DAY}/day from idle play, doubled by your habit multiplier</DialogDescription>
   <div className="training-option"><div><strong>Little Helper focus {spot?`· pick ${spot} of ${focus.length}`:''}</strong>
    <p>{spot?`The helper feeds this ladder before any Fellow you have not picked${focus.length>1?`, after your ${spot===1?'':`first ${spot-1} pick${spot===2?'':'s'}`}`:''}.`
     :'Pick this Fellow and the helper spends shards here first. Picks are served in the order you make them.'}</p>
    <p className="small-note">{place?`Next run the helper reaches this ladder ${place===1?'first':`at position ${place} of ${queue.length}`}.`:''} It finishes one ladder before starting the next — a finished ladder is worth more than several half ones.</p>
    {report?<p className="small-note item-status">Helper today · Stella: {report}</p>:null}</div>
    <Button variant={spot?'default':'outline'} disabled={locked} onClick={()=>action('helperFocus',id)}>{spot?'Remove focus':'Focus the helper here'}</Button></div>
   {own?<Button variant="outline" disabled={locked||shards>=1e6} onClick={()=>action('stellaConvert',ownItem,{seq:t.seq})}>Convert {own.toLocaleString()} own fragments → village shards (1:1, one way)</Button>:null}
   <p>Level values replace the previous totals; they do not add every row together. Ranks, costs, flat Power, percents, appointment yield and talent-cap raises are the original’s own, recovered from its HeroSpirit table rather than from community pages. Our local Power order follows the original: the percents are summed and multiply first, then the owner’s own flat Power is added.</p>
   {k.appoint?<p>The appointment-yield bonus is account-wide in the original: once this Fellow has it, every Fellow you assign to a business earns it. It multiplies business earnings, not Power.</p>:null}
   {k.talent?<p>The talent-cap raise lets this Fellow keep buying talent levels at the same price; it grants no Aptitude on its own.</p>:null}
   {pooled?<p>Every original Fellow draws on ONE shared village shard pool at the same {STELLA_IDLE_PER_DAY}/day, so a shard spent here is a shard another Fellow cannot spend.</p>:null}
   {crossover?<p>A crossover Fellow’s Stella carries Angie’s own recorded shard costs, her flat values times three and her Power percents times seventy — for this Fellow alone, never for a type. A crossover character has no Stella table of its own, so this one track is sized so that a fully trained crossover Fellow stands about level with a fully trained original of the middle type — Everkai’s own balance, not the original’s.</p>:null}
   {ownItem?<p>Fragments this Fellow already holds are spent first on her own ladder, Refund returns them to her, and Convert moves them into the village pool one for one.</p>:null}
   <p>Two things the original grants are still missing, because Everkai has no axis for them rather than no measurement: a bonus to a named hero GROUP, and this character’s own talent value, which would need the Aptitude limit raised. The original also pays a Dynamic Avatar at some nodes; no avatar column has been recovered.</p>
  </DialogContent></Dialog>
 </section>;
}
