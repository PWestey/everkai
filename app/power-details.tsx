import {powerParts} from '@/lib/adventure.mjs';
/** WHERE A FELLOW'S POWER COMES FROM, in the original's own "Power Details" shape (docs/power-parity-audit.md 1.4):
 *  a base determined by level and Aptitude, one summed percent bucket on that base, then the fixed rows added
 *  after it, then the small final multiplier. Built for the owner's 2026-09-19 question -- a level-1 Elise at 25M
 *  over a level-319 UR -- which is answered by one line: almost all of her Power is FIXED (Stella's flat), which
 *  lands in full at any level. Every number is read off powerParts; nothing is recomputed here. */
const PERCENT:Record<string,string>={stars:'Stars',starHalo:'Star halos',origin:'Origin Boost',skill:'Skill',bonds:'Family bond',family:'Fellow blessings',museum:'Museum',fishing:'Fishing',echo:'Equipment Echo',stella:'Stella',familiar:'Familiar',familyStella:'Family Stella',familyPair:'Family pair',quench:'Quenching'};
const FLAT:Record<string,string>={stella:'Stella',family:'Fellow blessings',stars:'Stars',fishing:'Fishing',elixir:'Elixirs',familiar:'Familiar',museum:'Museum',familyPair:'Family pair'};
const n=(v:number)=>Math.round(v).toLocaleString();
const rows=(o:Record<string,number>,names:Record<string,string>)=>Object.entries(o).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[names[k]||k,v] as [string,number]);
export function powerSplit(game:any,id:string){
 const p=powerParts(game,id),flat=Object.values(p.flat as Record<string,number>).reduce((a,b)=>a+b,0);
 return {p,flat,grown:p.base,stella:p.flat.stella||0};
}
/** One line under the Power figure: how much grows with level and how much is fixed. */
export function PowerSource({game,id}:any){
 const {p,flat,grown,stella}=powerSplit(game,id),total=Math.max(1,grown+flat),share=Math.floor(flat/total*1000)/10;
 return <p className="small-note item-status power-source" data-testid="power-source">From level &amp; Aptitude {n(grown)} · Fixed {n(flat)}{stella?` (Stella ${n(stella)})`:''}{flat>grown?` · ${share}% of this Fellow’s Power is fixed and does not grow with level`:''}{p.power!==grown+flat?' · then × final bonus':''}</p>;
}
/** The full breakdown, collapsed by default. */
export default function PowerDetails({game,id}:any){
 const {p,flat}=powerSplit(game,id),pct=rows(p.percent,PERCENT),fixed=rows(p.flat,FLAT),fin=rows(p.final,{museum:'Museum',familiar:'Familiar'});
 const sumPct=pct.reduce((a,[,v])=>a+v,0),sumFin=fin.reduce((a,[,v])=>a+v,0);
 return <details className="rules-note power-details"><summary>Power details · {n(p.power)}</summary>
  <p><strong>Base (determined by Aptitude)</strong> · level column {n(p.adh)} × Aptitude {n(p.aptitude)}{sumPct?` × (1 + ${(sumPct/100).toLocaleString()}%)`:''} = <strong>{n(p.base)}</strong></p>
  {pct.length?<p>Percent bonuses, added together: {pct.map(([k,v])=>`${k} +${(v/100).toLocaleString()}%`).join(' · ')}</p>:null}
  <p><strong>Fixed Power</strong> (added after the percents; the same at level 1 as at level 600) = <strong>{n(flat)}</strong>{fixed.length?': '+fixed.map(([k,v])=>`${k} +${n(v)}`).join(' · '):''}</p>
  {fin.length?<p>Final: {fin.map(([k,v])=>`${k} +${(v/100).toLocaleString()}%`).join(' · ')} on everything above</p>:null}
  <p>Power = (Base + Fixed){sumFin?` × (1 + ${(sumFin/100).toLocaleString()}%)`:''}. Stella’s flat is Fixed Power, so a Fellow with Stella ranks and no levels can outrank a trained one. The helper’s Stella chore spends shards on your highest-level Fellows first.</p>
 </details>;
}
