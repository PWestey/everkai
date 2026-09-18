import OpeningPanel from './opening-panel';
import EncounterAdvice from './encounter-advice';
import FrontierPanel from './frontier-panel';
import FellowChooser from './fellow-chooser';
import PanelPages from './panel-pages';
import {useState} from 'react';import {Button} from '@/components/ui/button';import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';import {STAGES,STAGE_COUNT,stageAt,stagePending,stageCost,stageReady,ladderPower,bondedPower,patrolCharges,PATROL_CEILING} from '@/lib/adventure.mjs';
// The patrol picker offers a window of recently cleared stages rather than every cleared stage: the
// ladder is 36,000 long, and a <select> with 36,000 options is unusable on a phone.
const PATROL_WINDOW=40;
export default function AdventurePanel({game,action,locked,onNavigate,initialPage=0}:any){
 const cleared=game.adventure.cleared,next=stageAt(cleared+1),power=ladderPower(game),last=game.adventure.lastBattle;
 const [patrol,setPatrol]=useState(0);
 const recent=STAGES.slice(Math.max(0,cleared-PATROL_WINDOW),cleared);
 const chosen=recent.length?(recent.find(s=>s.id===patrol)?patrol:recent[recent.length-1].id):0;
 const chosenStage=stageAt(chosen),patrolCost=(chosenStage?stageCost(chosenStage,power):0)??0;
 const cost=(next?stageCost(next,power):0)??0,ready=next?stageReady(next,power,game.gold):false;
 const lastChapter=STAGE_COUNT/6,pending=!next&&stagePending(cleared+1);
 const chapter=next?next.chapter:Math.min(lastChapter,Math.floor(cleared/6)+1);
 return <section className="adventure-panel"><PanelPages initialPage={initialPage} labels={['Opening','Classic']}><OpeningPanel game={game} action={action} locked={locked} onNavigate={onNavigate}/><PanelPages labels={['Party','Stages','Patrol','Frontier']}>
 <><FellowChooser game={game} locked={locked} selected={game.adventure.party} onChoose={(id:string)=>action('party',id)} status={(id:string)=>(game.adventure.party.includes(id)?'In party · ':'Add · ')+bondedPower(game,id).toLocaleString()+' Power'}/><p className="management-hint">Choose 1–3 Fellows for the Frontier, which fights with this party. The campaign ladder is measured against your <strong>whole roster</strong>&apos;s Power, as the original measures it, so every Fellow you train counts toward a stage whether or not they are in this party.</p></>
 <><div className="chapter-track">{[0,1,2,3,4].map(o=>chapter+o).filter(c=>c<=lastChapter).map(c=><div key={c}><strong>Chapter {c}</strong><span>{Math.max(0,Math.min(6,cleared-(c-1)*6))}/6</span></div>)}</div>
 {next?<article className="school-card"><small>{next.boss?'CHAPTER BOSS':'NEXT STAGE'} · {next.chapter}-{next.section}</small><h2>Stage {next.id.toLocaleString()} of {STAGE_COUNT.toLocaleString()}</h2>
  {next.boss
   ?<><p>Enemy Power: <strong>{next.atk.toLocaleString()}</strong> · Your roster: {power.toLocaleString()}</p><p>{ready?'Your roster is strong enough.':`A boss needs Power strictly above its own. Train ${(next.atk+1-power).toLocaleString()} more Power.`}</p><p>Entry: free · Victory: {next.xp.toLocaleString()} Fellow EXP{next.bottles?`, ${next.bottles} Fairy Bottle`:''}</p></>
   :<><p>Enemy Power: <strong>{next.atk.toLocaleString()}</strong> · Your roster: {power.toLocaleString()}</p><p>Power is not a wall here — it sets the price. This stage costs <strong>{cost.toLocaleString()} gold</strong> at your Power, and the price falls as your roster grows.</p><p>Victory: {next.xp.toLocaleString()} Fellow EXP</p></>}
  <Button disabled={locked||!ready} onClick={()=>action('battle',next.id)}>Challenge stage {next.chapter}-{next.section}</Button><EncounterAdvice game={game} action={action} locked={locked}/>
  <p className="small-note">A refused stage spends no gold. Rewards are granted once, on the first clear.</p></article>
  :pending?<article className="school-card"><h2>Loading chapter {chapter.toLocaleString()}</h2><p>Chapters beyond 3,000 are downloaded when your progress reaches them, so they do not weigh on every start-up. This needs a connection once; your progress is safe.</p></article>
  :<article className="school-card"><h2>Every imported chapter is cleared</h2><p>All {STAGE_COUNT.toLocaleString()} stages of chapters 1–{lastChapter.toLocaleString()} are behind you. Patrols remain available, and the Frontier adds three local chapters.</p></article>}
 {last&&<div className="battle-result" role="status"><strong>{last.won?'Victory':'More training needed'} · Stage {last.stage.toLocaleString()}</strong><p>Roster Power {last.power.toLocaleString()} · {last.kind==='patrol'?'Patrol':'Campaign'}</p></div>}
 </>
 <article className="school-card"><h2>Patrol cleared stages</h2>{chosenStage?<><NativeSelect aria-label="Patrol stage" value={chosen} onChange={e=>setPatrol(Number(e.target.value))}>{recent.map(s=><NativeSelectOption key={s.id} value={s.id}>Stage {s.chapter}-{s.section} · {s.atk.toLocaleString()} enemy Power</NativeSelectOption>)}</NativeSelect><p>Deposit {patrolCost.toLocaleString()} gold; returned on victory. Reward: {chosenStage.xp.toLocaleString()} Fellow EXP — the stage&apos;s own table value. No first-clear loot repeats.</p><p>Patrol supplies: <strong>{patrolCharges(game)}</strong> / {PATROL_CEILING} · one returns every 8 hours.</p><Button disabled={locked||game.gold<patrolCost||patrolCharges(game)<1} onClick={()=>action('patrol',chosen)}>Run patrol</Button>{patrolCharges(game)<1&&<p className="item-status">Supplies are recovering. Patrols are metered so their EXP has a real rate.</p>}{cleared>PATROL_WINDOW&&<p className="small-note">Showing your {PATROL_WINDOW} most recently cleared stages.</p>}</>:<p>Clear a stage to unlock repeatable training rewards.</p>}</article>
 <FrontierPanel game={game} action={action} locked={locked}/></PanelPages></PanelPages>
 <details className="rules-note"><summary>About these rules</summary><p className="balance-note">The campaign ladder is the original&apos;s own: {STAGE_COUNT.toLocaleString()} stages over chapters 1–{lastChapter.toLocaleString()}, six stages a chapter with a boss on every sixth, read from the imported <code>BattleNormal</code> and <code>LevelBoss</code> rows. Enemy Power, the gold a stage charges and the Fellow EXP it pays are that stage&apos;s own table values. Both resolution rules are the original client&apos;s: a normal stage scales its gold price by the fourth root of enemy Power over yours and is cleared if you can pay it, and a boss is a hard gate needing Power strictly above its own. Roster Power is the quantity the original compares against. Local: the party limit, the Frontier, the patrol meter&apos;s use here, and the choice not to pay the stage rows&apos; Player EXP twice (the Opening tab grants it as Fame).</p></details></section>}
