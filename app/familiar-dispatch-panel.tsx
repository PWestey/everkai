import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {cardStyle,cardRarity,rarityIcon} from '@/lib/ui-sprites.mjs';
import {FAMILIARS,familiarById} from '@/lib/familiars.mjs';
import {DISPATCH_AREAS,DISPATCH_TEAM,dispatchState,dispatchArea,dispatchTeamPower,familiarPower,
 greatSuccessChance,dispatchUnlocked,dispatchDone,dispatchRemaining} from '@/lib/familiar-dispatch.mjs';
import {useState} from 'react';
const hhmm=(ms:number)=>{const h=Math.floor(ms/3600e3),m=Math.ceil((ms%3600e3)/60e3);return h?`${h}h ${m}m`:`${m}m`};
export default function FamiliarDispatchPanel({game,action,locked}:any){
 const now=Date.now(),d=dispatchState(game),owned=FAMILIARS.filter(p=>game.familiars?.[p.id]);
 const [chosen,setChosen]=useState(''),[area,setArea]=useState('1');
 const id=chosen||owned[0]?.id,power=dispatchTeamPower(game),cleared=game.familiarTower?.cleared||0;
 const run=d.run,running=run?dispatchArea(run.area)!:null,ready=dispatchDone(game,now),left=dispatchRemaining(game,now);
 const picked=dispatchArea(area)!,full=d.team.length===DISPATCH_TEAM;
 return <section className="familiar-dispatch" aria-label="Familiar dispatch"><h4 className="bond-ribbon">Familiar Dispatch</h4>
 {owned.length<DISPATCH_TEAM?<p className="tower-hint">Contract {DISPATCH_TEAM} or more familiars to unlock. {owned.length} welcomed.</p>:<>
 <div className="bond-progress"><span>Team Power</span><b>{power.toLocaleString()}</b></div>
 <ol className="tower-slots" aria-label={`Dispatch team ${d.team.length} of ${DISPATCH_TEAM}`}>{Array.from({length:DISPATCH_TEAM},(_,i)=>{const pid=d.team[i],pet=pid?familiarById(pid):null;return <li key={i}>{pet?<div className="framed-card" style={cardStyle(pet.rarity) as any}><span>{rarityIcon(cardRarity(pet.rarity))&&<img src={rarityIcon(cardRarity(pet.rarity))!} alt=""/>}</span><strong>{pet.name}</strong></div>:<div className="tower-empty">+</div>}<small>{pet&&game.familiars?.[pid]?familiarPower(pid,game.familiars[pid]).toLocaleString():'Empty'}</small></li>})}</ol>
 {!run&&<><label htmlFor="dispatch-familiar">Choose a team member</label><NativeSelect id="dispatch-familiar" value={id} onChange={e=>setChosen(e.target.value)}>{owned.map(p=><NativeSelectOption key={p.id} value={p.id}>{p.name} · {familiarPower(p.id,game.familiars[p.id]).toLocaleString()} Power{d.team.includes(p.id)?' · In team':''}</NativeSelectOption>)}</NativeSelect>
  <Button variant="outline" disabled={locked||(!d.team.includes(id)&&full)} onClick={()=>action('dispatchTeam',id)}>{d.team.includes(id)?'Remove from dispatch team':'Add to dispatch team'}</Button></>}
 {run&&running?<article className="tower-floor"><h4>Area {run.area} · away</h4><p>{ready?'The team has returned.':`Time left: ${hhmm(left)}`}</p>
   <p className="tower-reward">Returns with {running.base.levelUp.toLocaleString()} level-up items{running.base.classUp?` + ${running.base.classUp} class-up`:''} · Great Success adds {running.great.levelUp.toLocaleString()}{running.great.classUp?` + ${running.great.classUp} class-up`:''}</p>
   <Button disabled={locked||!ready} onClick={()=>action('dispatchCollect')}>Collect dispatch</Button>
   <Button variant="outline" disabled={locked} onClick={()=>action('dispatchCancel')}>Cancel dispatch · forfeits all rewards</Button></article>
  :<><label htmlFor="dispatch-area">Choose an area</label><NativeSelect id="dispatch-area" value={area} onChange={e=>setArea(e.target.value)}>{DISPATCH_AREAS.map((a:any)=><NativeSelectOption key={a.id} value={String(a.id)}>Area {a.id} · {a.power.toLocaleString()} Power{dispatchUnlocked(game,a.id)?'':` · floor ${a.floor}`}</NativeSelectOption>)}</NativeSelect>
   <dl><div><dt>Unlocks</dt><dd>Familiar Tower floor {picked.floor}{cleared>=picked.floor?' · cleared':` · ${cleared}/${picked.floor}`}</dd></div><div><dt>Power needed</dt><dd>{picked.power.toLocaleString()}</dd></div><div><dt>Duration</dt><dd>{picked.hours} hours</dd></div><div><dt>Great Success</dt><dd>{full?`${greatSuccessChance(game,picked.id)}%`:'Fill the team'}</dd></div></dl>
   <p className="tower-reward">Base {picked.base.levelUp.toLocaleString()} level-up items{picked.base.classUp?` + ${picked.base.classUp} class-up`:''} · Great Success adds {picked.great.levelUp.toLocaleString()}{picked.great.classUp?` + ${picked.great.classUp} class-up`:''}</p>
   <Button disabled={locked||!full||!dispatchUnlocked(game,picked.id)||power<picked.power} onClick={()=>action('dispatchStart',picked.id)}>Dispatch to area {picked.id}</Button></>}
 </>}
 <details className="rules-note"><summary>Dispatch rules and what is measured</summary>
  <p>The nine areas, their Familiar Tower gate, the Power each needs, the 20 figure on every row and both reward bundles come from the original’s PetDispatch table and its reward file. Power weights each familiar’s Attack by 15, Health by 1 and Speed by 30, as the original’s attribute table does; the five strongest familiars score 86,130 untrained and 27,680,957 fully maxed, which is exactly the span the 100,000 to 20,000,000 gates cover.</p>
  <p>Two things are local and flagged. The duration table does not name its unit, and no other familiar table holds one, so Everkai reads 20 as hours: at that rate the best area pays about 450 level-up items an hour against the tower’s 187, while reading it as minutes would pay 144 times the tower. And the original’s Great Success formula is not in any table — only its inputs are, so Everkai uses 30% at exactly the Power gate plus half of any surplus, capped at 100%. The original’s extra Great Success drops are familiar fragments, which Everkai does not model at all, so only the item rewards are paid. Cancelling forfeits the run, as in the original. Gates map the original’s 300 floors onto these 12, so areas 2 and 3 open together.</p></details>
 </section>;
}
