import {Button} from '@/components/ui/button';
import {sourceTraining,originalTrainingCost} from '@/lib/training-costs.mjs';
import {originalProgression,sourceQuality,qualityRule,SOURCE_MATERIALS,sourceAptitudeBonus,DAILY_BREACH,withOriginalProgression} from '@/lib/original-progression.mjs';
import {habitDay,habitEarnings} from '@/lib/habits.mjs';
import {xpCost,fellowCap,bondedPower,ladderPower} from '@/lib/adventure.mjs';
const materialNames:Record<string,string>=SOURCE_MATERIALS;
const n=(x:number)=>x.toLocaleString('en-US');
/** How much a number moved, as the player reads it: "x7.0" or "x0.015". */
const times=(before:number,after:number)=>!before?'—':`×${(after/before)>=10?Math.round(after/before):(after/before).toFixed(after/before<1?3:2)}`;
export default function TrainingRules({game,id,action,locked}:any){
 const f=game.fellows[id],active=originalProgression(game),q=sourceQuality(game,id),rule=qualityRule(q),p=game.originalProgression;
 // THE SWITCH, PRICED BEFORE THE PRESS (2026-09-22). New villages are born on the original's level curve
 // (lib/game.mjs startingSave); a village already playing on the classic curve is never moved silently,
 // so the three numbers the switch actually changes are measured here, on this very save, and shown.
 // Both halves of each row come from the same function on the same save (CLAUDE.md rule 1).
 const preview=active?null:(()=>{const after=withOriginalProgression(game);
  const roster=(s:any)=>Object.keys(s.fellows).reduce((t:number,x:string)=>t+bondedPower(s,x),0);
  return {fellow:[bondedPower(game,id),bondedPower(after,id)],roster:[roster(game),roster(after)],ladder:[ladderPower(game),ladderPower(after)],
   cap:[fellowCap(f,game,id),fellowCap(after.fellows[id],after,id)],cost:[xpCost(f.level,game),xpCost(f.level,after)]};})();
 return <details className="rules-note"><summary>Training Rules</summary><p>{active?'APK growth':sourceTraining(game)?'APK EXP costs only':'Classic sandbox growth'}</p>
 <p>APK growth uses recovered level costs, quality limits and starting Aptitude, plus base Talent training through source level 300 and Family blessings through level 700. Earned upgrades stay yours. Other bonuses and combat rules retain their sandbox behavior.</p>
 {!active&&preview&&<><p>This village is on the classic level curve. New villages start on the original&rsquo;s own curve (HeroLevel), where a level is worth much more: at level 450 the original&rsquo;s column is 6,362 against the classic 908, and 50 more levels add 19.3% instead of 11.0%. Switching is your choice, and these are the three numbers it moves on <em>this</em> save:</p>
 <table className="rules-table"><tbody>
  <tr><th>This Fellow&rsquo;s Power</th><td>{n(preview.fellow[0])} → {n(preview.fellow[1])}</td><td>{times(preview.fellow[0],preview.fellow[1])}</td></tr>
  <tr><th>Whole roster&rsquo;s Power</th><td>{n(preview.roster[0])} → {n(preview.roster[1])}</td><td>{times(preview.roster[0],preview.roster[1])}</td></tr>
  <tr><th>Power the stage ladder counts</th><td>{n(preview.ladder[0])} → {n(preview.ladder[1])}</td><td>{times(preview.ladder[0],preview.ladder[1])}</td></tr>
 </tbody></table>
 <p><strong>Read the third row before pressing.</strong> The classic curve multiplies your roster by 100 before comparing it with a boss; the original&rsquo;s curve compares the real figure, which is what the imported boss table was written against. Cleared stages stay cleared, but the next boss gate will be a long climb again.</p>
 <p>Nothing else moves: this Fellow&rsquo;s level limit stays {preview.cap[0]}{preview.cap[0]===preview.cap[1]?'':` (${preview.cap[1]})`} — limit breaks you already bought carry across as their quality tier — and the next level still costs {n(preview.cost[0])} EXP{preview.cost[0]===preview.cost[1]?'':`, not ${n(preview.cost[1])}`}. Levels, Aptitude, materials, receipts and limit tokens are all kept. Further breakthroughs past your current tier use the original crystals.</p>
 <Button variant="outline" disabled={locked} onClick={()=>action('activateOriginalProgression')}>Use APK growth</Button>{!sourceTraining(game)&&<><p>Or change EXP prices only, keeping the existing level limits and Power.</p>{f.level<fellowCap(f)&&<p>Next level: classic {xpCost(f.level)} EXP · APK {originalTrainingCost(f.level)} EXP.</p>}<Button variant="outline" disabled={locked} onClick={()=>action('activateOriginalTraining')}>Use APK EXP costs</Button></>}</>}
 {active&&<><p>Quality {q} · crystal level limit {rule.cap} · quality Aptitude +{rule.talent}. Starting and quality Aptitude adjustment: +{sourceAptitudeBonus(game,id)}.</p><p>Level limit in force: <strong>{fellowCap(f,game,id)}</strong>{fellowCap(f,game,id)>rule.cap?` — held there by ${f.breaks} local limit break${f.breaks===1?'':'s'} until the crystal quality passes them. Breaks pay no Aptitude; only an earned quality does.`:'.'}</p>{q<14?<><p>Next: Quality {q+1} · limit {qualityRule(q+1).cap} · quality Aptitude +{qualityRule(q+1).talent}</p>{rule.consume.map((c:any)=><p key={c.id}>{materialNames[c.id]}: {p.stock[c.id]} / {c.count}</p>)}<Button variant="outline" disabled={locked||f.level<rule.cap||rule.consume.some((c:any)=>p.stock[c.id]<c.count)||p.receipts.length>=3000} onClick={()=>action('originalQuality',id)}>Upgrade quality · reach level {rule.cap}</Button></>:<p>Final supported quality · level 750</p>}<Button disabled={locked||p.dailyDay===habitDay(game.lastAt)||habitEarnings(game.habits,game.lastAt).dailies<1} onClick={()=>action('claimDailyBreach')}>{p.dailyDay===habitDay(game.lastAt)?'Breakthrough materials collected today':`Daily habit reward · ${DAILY_BREACH} of each crystal`}</Button><p>Breakthrough materials come from the daily habit reward. Automatic entry at Quality 1 is a private sandbox choice.</p></>}
 {sourceTraining(game)&&<p>{game.trainingCosts.receipts.length} training receipts saved. Earlier purchases keep their original prices.</p>}
 </details>;
}
