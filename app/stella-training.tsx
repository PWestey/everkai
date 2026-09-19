import {Button} from '@/components/ui/button';
import {stellaRule,stellaState,stellaEntry,stellaPlan,stellaAction,stellaActivation,STELLA_IDLE_PER_DAY,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
import {bondedPower} from '@/lib/adventure.mjs';
/** Which effects THIS ladder carries, read off the ladder's own top row rather than off its owner. The
 *  panel has to read sensibly for five shapes now -- flat only; flat + typed percent; flat + own
 *  percent; flat + own percent + appointment yield + talent cap; and the shared crossover pool -- and
 *  keying any line on the OWNER is exactly the defect found by eye on 2026-09-18 ("Brave Power +0%" on
 *  a track with no percent at all). Every line below is therefore driven by `has`, and a ladder that
 *  does not carry a column never mentions it. */
const has=(p:any)=>{const top=p.levels.at(-1);return {
 typed:!!p.type&&top.percent>0,own:!p.type&&top.percent>0,self:top.selfPowerBp>0,appoint:top.appointYieldBp>0,talent:top.talentLimit>0};};
export default function StellaTraining({id,game,action,locked}:any){
 const p=stellaRule(id);
 if(!p)return <p className="small-note item-status">Stella is not available for this Fellow yet.</p>;
 const t=stellaState(game),e=stellaEntry(game,id),current=bondedPower(game,id);
 const crossover=p.type===null,pooled=p.itemId===SPIRIT_SHARD_ITEM,k=has(p);
 const currency=crossover?'crossover shards':pooled?'village shards':'owner fragments';
 const sink=p.levels.reduce((n:any,r:any)=>n+r.cost,0);
 const run=(a:string,count:any=1)=>action(a,id,{seq:t.seq,count});
 // What this Fellow HAS, at the rank reached. `e` is the latest receipt, so every figure is the
 // cumulative total that rank grants -- not a sum of the rows bought.
 // The crossover track's Power is read off the CURRENT ladder by level (lib/stella.mjs stellaBonus), so a receipt
 // bought before its 2026-09-19 re-scale shows what it now grants, not the unscaled flat it recorded.
 const row=crossover&&e&&e.level>0?p.levels[e.level-1]:null,ownFlat=crossover?(row?.flat||0):(e?.flat||0);
 const earned=[`Own flat Power +${ownFlat.toLocaleString()}`];
 if(k.own)earned.push(`own Power +${(row?.percent||0).toLocaleString()}%`);
 if(k.self)earned.push(`own Power +${(e?.selfPowerBp||0)/100}%`);
 if(k.typed)earned.push(`${p.type} Power +${e?.percent||0}%`);
 if(k.appoint)earned.push(`every Fellow’s appointment yield +${(e?.appointYieldBp||0)/100}%`);
 if(k.talent)earned.push(`talent cap +${e?.talentLimit||0}`);
 // What the ladder would grant at its top, so an inactive track still says what it is for.
 const top=p.levels.at(-1);
 const offers=[`+${top.flat.toLocaleString()} own flat Power`];
 if(k.own)offers.push(`own Power +${top.percent.toLocaleString()}%`);
 if(k.self)offers.push(`own Power +${top.selfPowerBp/100}%`);
 if(k.typed)offers.push(`${p.type} Power +${top.percent}%`);
 if(k.appoint)offers.push(`appointment yield +${top.appointYieldBp/100}%`);
 if(k.talent)offers.push(`talent cap +${top.talentLimit}`);
 return <section className="school-card"><h3>{p.name} · Stella {e?e.level:'inactive'}</h3>
  <p>{(t.stock[p.itemId]||0).toLocaleString()} {currency} · {earned.join(' · ')}</p>
  <p>{p.levels.length} upgrade levels · {sink.toLocaleString()} {currency} for the whole ladder · at the top: {offers.join(' · ')}</p>
  {!e?<><Button disabled={locked} onClick={()=>run('stellaActivate')}>Activate private Stella · Free</Button>
   <details className="rules-note"><summary>About these rules</summary><p>{k.typed?`Activation grants +${stellaActivation(id)?.percent||0}% ${p.type} Power — the original's own rank-0 value.`:k.self||k.appoint?'Activation is free and grants this character’s own rank-0 values — the original’s own, not ours.':'Activation is free and grants nothing; it opens the paid ladder.'}{pooled||crossover?` One shared ${crossover?'crossover':'village'} shard pool serves every ${crossover?'crossover Fellow':'Fellow without a private fragment'}, so shards spent here are shards another Fellow cannot spend.`:''}</p></details></>
   :<div className="business-actions">{[1,5,'max'].map(count=>{const plan=stellaPlan(game,id,count),next=plan.rows.at(-1),preview=plan.rows.length?stellaAction(game,'stellaUpgrade',id,{seq:t.seq,count})?.state:null;return <Button key={count} disabled={locked||!next} onClick={()=>run('stellaUpgrade',count)}>{count==='max'?'Upgrade max':'Upgrade up to '+count} · {plan.cost} {pooled||crossover?'shards':'fragments'}{next?` → S${next.level}`:''}{preview?` · +${(bondedPower(preview,id)-current).toLocaleString()} Power`:''}</Button>})}</div>}
  <p className="small-note item-status">{(t.stock[p.itemId]||0).toLocaleString()} {currency} held · {STELLA_IDLE_PER_DAY}/day from idle play, doubled by your habit multiplier</p>
  <details className="rules-note"><summary>Stella effects and source boundaries</summary>
   {k.typed||k.own||k.self||k.appoint||k.talent?null:<p>This Fellow’s Stella is a flat-Power track: it raises her own Power and nothing else. That is the original’s own answer — of the 126 characters with a Stella table, only four grant “All &lt;Type&gt; Fellow Power +%”, and the rest grant their owner’s own Power. Giving everybody a typed bonus would be this project’s invention, and because typed bonuses are summed across a type it would multiply every Fellow of that type many times over.</p>}
   {k.self?<p>This character’s own-Power percent and her typed percent, if she has one, are the SAME bucket in the original and are added together before they multiply — they are not applied one after the other. The own-Power percent reaches her alone; a typed percent reaches every Fellow of that type.</p>:null}
   {k.appoint?<p>This character’s appointment-yield bonus is account-wide in the original: once she has it, EVERY Fellow you assign to a business earns it, and every character who has one adds to the same total. It multiplies business earnings, not Power — so it compounds with the Power this ladder also grants rather than duplicating it.</p>:null}
   {k.talent?<p>The talent-cap raise lets this Fellow keep buying talent levels at the same price; it grants no Aptitude on its own.</p>:null}
   {pooled?<p>Every Fellow without a private fragment item draws on ONE shared village shard pool at the same {STELLA_IDLE_PER_DAY}/day, so the supply does not grow with the roster and a shard spent here is a shard another Fellow cannot spend. The ladder’s own cost, rank count and Power values are this character’s own, imported from the original.</p>:null}
   {crossover?<p>A crossover Fellow’s Stella carries Angie’s own recorded shard costs, her flat values times three and her Power percents times seventy — for this Fellow alone, never for a type. A crossover character has no Stella table, talent skills, Rarity Advance or Family Stella of its own, so this one track is sized so that a fully trained crossover Fellow stands about level with a fully trained original of the middle type — Everkai’s own balance, not the original’s. A typed bonus would be this project’s invention, so there is none. Every crossover Fellow draws on ONE shared shard pool at the same {STELLA_IDLE_PER_DAY}/day, so the supply does not grow with the roster.</p>:null}
   <p>Level values replace the previous totals; they do not add every row together. Ranks, costs, flat Power, percents, appointment yield and talent-cap raises are the original’s own, recovered from its HeroSpirit table rather than from community pages. Rani, Liz, Lucoa and Elise all receive +2% at activation, which is the original’s own rank-0 value; Lucoa carries Angie’s recorded Informed ladder after Angie left the roster. Saved activations retain their recorded values. Our local Power order follows the original: the percents are summed and multiply first, then the owner’s own flat Power is added. Two things the original grants are still missing, because Everkai has no axis for them rather than no measurement: a bonus to a named hero GROUP, and this character’s own talent value, which would need the Aptitude limit raised.</p></details></section>}
