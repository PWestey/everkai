import {Button} from '@/components/ui/button';
import {VILLAGE_POOL,VILLAGE_MANAGE,villageState,villageEventById,villageLine,villageSpeaker,
 villageRewardPlan,villageManageStep,villageManageLocked,villageRank} from '@/lib/village-events.mjs';
import {totalRate} from '@/lib/game.mjs';
import {fellowById} from '@/lib/catalog.mjs';
const itemName=(id:string)=>id.replace(/^Item_/,'').replaceAll('_',' ');
// The same stand-in app/roaming-panel.tsx uses for the original's {playerName} token.
const say=(text:string|null)=>(text||'').replaceAll('{playerName}','Village Elder');
// The original's eventNPC is an internal id (hero_04, city_npc_06). Named Fellows resolve through
// the catalog (its ids drop the leading zero); the city_npc_* extras have no Everkai identity.
const npcName=(id:string)=>{const m=/^hero_0*(\d+)$/.exec(id||'');return (m&&fellowById('hero_'+m[1])?.name)||'A villager';};
function Payout({game,id,label}:any){
 const {paid,unmapped}=villageRewardPlan(game,id);
 return <p className="small-note">{label}: {paid.length?paid.map((c:any)=>`${c.count} ${itemName(c.id)}`).join(', '):'nothing Everkai can pay'}
  {unmapped.length?` · ${unmapped.map((c:any)=>itemName(c.id)).join(', ')} ${unmapped.length>1?'have':'has'} no Everkai equivalent and pays nothing`:''}</p>;
}
export default function VillageEventsPanel({game,action,locked}:any){
 const v=villageState(game),pending:any=v?.pending?villageEventById(v.pending):null;
 const step:any=villageManageStep(game),lockNote=villageManageLocked(game),income=totalRate(game);
 const met=v?.seen.length||0;
 return <section>
  <p>{met} / {VILLAGE_POOL.length} villagers met · {v?.draws||0} walk{(v?.draws||0)===1?'':'s'} taken</p>
  <p className="small-note">In the original the village throws three daily encounters at 10:00, 14:00 and 20:00 and refreshes a special incident every twelve hours. Everkai has no clocks, so one walk a day after a finished daily habit stands in for all of them — the same rule the daily supply, keepsake and bait refills use. Each row keeps the original’s draw weight, so a multiple-choice incident comes up on about three days in thirteen.</p>
  {!pending&&<div className="business-actions"><Button disabled={locked} onClick={()=>action('villageEvent')}>Walk the village · daily, after a habit</Button></div>}
  {pending&&<article className="school-card">
   <h3>{say(villageSpeaker(pending.dialog[0]))||npcName(pending.npc)}</h3>
   <p>{say(villageLine(pending.dialog[0]))}</p>
   {pending.kind==='choice'?<>
    <p><strong>{say(pending.prompt)}</strong></p>
    <Payout game={game} id={pending.reward1} label="If you are right"/>
    <Payout game={game} id={pending.reward2} label="If you are wrong"/>
    <div className="business-actions">
     <Button disabled={locked} onClick={()=>action('villageChoose',pending.id,1)}>{pending.option1}</Button>
     <Button disabled={locked} onClick={()=>action('villageChoose',pending.id,2)}>{pending.option2}</Button>
    </div>
    <p className="small-note">One of these two is the original’s correct option. Choosing it pays the good reward; the other pays the smaller one.</p>
   </>:<>
    <Payout game={game} id={pending.reward} label="Reward"/>
    <div className="business-actions"><Button disabled={locked} onClick={()=>action('villageResolve',pending.id)}>Help them out</Button></div>
   </>}
  </article>}
  <h3>Management goals</h3>
  {step?<article className="school-card">
   <h4>{say(villageSpeaker(step.beforeDialog[0]))||npcName(step.npc)}</h4>
   <p>{say(step.desc)}</p>
   <p>{say(villageLine(step.beforeDialog[0]))}</p>
   <p>Goal: village earnings of {step.object.toLocaleString()} gold/s · currently {Math.floor(income).toLocaleString()}</p>
   {step.beforeReward&&<Payout game={game} id={step.beforeReward} label="On accepting"/>}
   {step.afterReward&&<Payout game={game} id={step.afterReward} label="On reaching the goal"/>}
   {lockNote?<p className="small-note">{lockNote} (rank {villageRank(game)})</p>:
    <div className="business-actions">
     {!v?.manage.accepted&&<Button disabled={locked} onClick={()=>action('villageManageAccept')}>Accept this goal</Button>}
     {v?.manage.accepted&&<Button disabled={locked||income<step.object} onClick={()=>action('villageManageFinish')}>Report the goal reached</Button>}
    </div>}
   <p className="small-note">Step {(v?.manage.step||0)+1} of {VILLAGE_MANAGE.length}.</p>
  </article>:<p>Every management goal is complete.</p>}
  <details className="rules-note"><summary>Where these events come from</summary><p>Twenty daily encounters (CityDailyEvent), six multiple-choice incidents with the original’s correct option and its good/bad payouts (CitySpecialEvent + CitySpecialEvent01), and the six-step earnings chain (CitySpecialEventManage CSEM_1–6, goals 70,000 → 150,000 → 600,000 → 1,200,000 → 2,500,000 → 5,000,000 gold/s, unlocked at the original’s PlayerLvUpNum 10). All text is the original’s English translation. A reward item Everkai has no equivalent for pays nothing rather than being swapped for a substitute, and each such item is named above. Not modelled here: the monster raid and its corpse-processing branch (CitySpecialEvent02), the assignment incidents (CitySpecialEvent03, weight 0 in this build), Gina’s four-step delayTime chain (W1E1_1–4), and the 26 condition-gated CityAssignEvent encounters — six of those already arrive through the opening journey.</p></details>
 </section>;
}
