import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
/** THE ORIGINAL'S TWO UNIVERSAL CONTROLS, built to docs/fellow-screen-specs/README.md conventions 2-6
 *  and measured on img/upgrade-below-cap.png, img/aptitude-skill.png, img/operation.png.
 *
 *  Every repeatable spend in the original is the SAME pair, in the same place: a 4-segment quantity
 *  selector `Quick | x1 | x10 | x100` right-aligned directly above one primary button, and the button
 *  carries the verb with the ACTUAL clamped count on line 1 and `have/cost` on a smaller line 2. The
 *  selector is an INTENT; the button tells the truth about what will happen. There is no "you cannot
 *  afford this" sentence anywhere in the original -- the have-number turns red and that is the whole
 *  message (convention 3). Green is the ordinary repeatable action, gold the tier-advancing one
 *  (convention 6), and a count of 0 renders an inert grey button rather than `Upgrade x0` (spec 03).
 *
 *  `Quick` is the leftmost segment and maps to the same "as many as I can afford" intent Everkai's
 *  existing plans already call `max`; the original's own Quick behaviour beyond that is not captured. */
export const QUANTITIES:[string,1|10|100|'max'][]=[['Quick','max'],['x1',1],['x10',10],['x100',100]];
export type Quantity=1|10|100|'max';
/** Convention 5, the in-flow register: four significant digits, `24.43M` / `71.16K` / `6.652B`. The
 *  detail dialogs use `toLocaleString()` instead, which is the same number in the audit register. */
export const abbrev=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumSignificantDigits:4}).format(Math.floor(Number(n)||0));

/** The 4-segment selector. Right-aligned, sits directly above the button it governs.
 *
 *  `allow` keeps all four segments drawn but disables the ones a screen cannot offer. Latency is the
 *  case it exists for: the original gives that screen a lone `x10` checkbox instead of the selector,
 *  and the Family specs' README rules that the checkbox is the original being inconsistent -- use the
 *  selector everywhere and grey the segments whose prices the original never quotes, rather than
 *  inventing them. */
export function QuantityPicker({value,onChange,label='Quantity',allow}:{value:Quantity,onChange:(q:Quantity)=>void,label?:string,allow?:Quantity[]}){
 return <div className="qty-picker" role="group" aria-label={label}>{QUANTITIES.map(([text,q])=>
  <button key={text} type="button" disabled={allow?!allow.includes(q):false} aria-pressed={value===q} onClick={()=>onChange(q)}>{text}</button>)}</div>;
}

/** The one primary action. `note`/`have`/`cost` render the `have/cost` line inside the button. */
export function PrimaryAction({verb,tier,disabled,onClick,currency,have,cost,children}:{
 verb:string,tier?:boolean,disabled?:boolean,onClick?:()=>void,currency?:string,have?:number,cost?:number,children?:ReactNode}){
 const short=have!==undefined&&cost!==undefined&&have<cost;
 return <Button className={'primary-action'+(tier?' primary-tier':'')} disabled={disabled} onClick={onClick}>
  <b>{verb}</b>
  {have!==undefined&&cost!==undefined
   ?<small>{currency?<span>{currency}</span>:null}<span className="have-cost"><i className={short?'short':'enough'}>{abbrev(have)}</i>/{abbrev(cost)}</span></small>
   :children?<small>{children}</small>:null}
 </Button>;
}

/** The selector and the button as one block, which is how they always appear. */
export function SpendControls({quantity,onQuantity,label,...action}:{quantity:Quantity,onQuantity:(q:Quantity)=>void,label?:string}&Parameters<typeof PrimaryAction>[0]){
 return <div className="spend-controls">
  <QuantityPicker value={quantity} onChange={onQuantity} label={label}/>
  <PrimaryAction {...action}/>
 </div>;
}

/** `old → new`, new in green (convention 1). Replaces a sentence everywhere it appears. */
export function Step({from,to,arrow='→'}:{from:ReactNode,to:ReactNode,arrow?:string}){
 return <span className="step-value">{from} <em>{arrow}</em> <b>{to}</b></span>;
}
