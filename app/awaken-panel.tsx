import {Button} from '@/components/ui/button';
import {HERO_STARS,awakenView,starHaloParts,STAR_HALOS} from '@/lib/hero-stars.mjs';
import {STAR_CAP,fellowStars,nextStarCost} from '@/lib/adventure.mjs';
import {summonState} from '@/lib/summon.mjs';
import {STAR_TALENT_SKILLS,TALENT_SKILLS,talentSkillUnlocked} from '@/lib/talent-skills.mjs';
/** FELLOW AWAKEN -- the original's HeroStar, which Everkai already paid but showed as a single line
 *  in the Skills tab ("Stars · n/7"). Nothing here is a new mechanic: it is the seven-row ladder,
 *  its level gates, the roster prerequisite this build adds, and what each star broadcasts. Plain by
 *  design; the visual pass is a separate batch. */
export default function AwakenPanel({id,game,action,locked}:any){
 const f=game.fellows[id];if(!f)return null;
 const view=awakenView(game,id);if(!view)return null;
 const halos=starHaloParts(game,id),shards=summonState(game).starShards,cost=nextStarCost(f);
 const rows=HERO_STARS.map((row:any,k:number)=>({...row,k}));
 const breaks=STAR_TALENT_SKILLS.map((skill:string,i:number)=>({skill,star:i+1,
  open:talentSkillUnlocked(game,id,skill),rule:(TALENT_SKILLS as any)[skill]}));
 const gate=view.roster,blocked=!!gate&&!gate.met;
 return <div className="training-option"><div>
  <strong>Awaken · {view.stored}/{STAR_CAP}★</strong>
  <p>Now paying ★{view.active}: +{view.paid.percent/100}% Power and +{view.paid.flat.toLocaleString()} Power · star halos broadcast at level {view.halo}</p>
  {view.inactive!==null&&<p>A star above this is stored but inactive until Lv. {view.inactive}. It is never taken away.</p>}
  <p>Star shards: {shards.toLocaleString()} · {cost===null?'fully starred':`next star costs ${cost}`}</p>
  {view.levelGate!==null&&<p>Level gate for the next star: Lv. {view.levelGate} {view.levelMet?'· met':`· this Fellow is Lv. ${f.level}`}</p>}
  {view.roster&&<p>Roster prerequisite for the next star: {view.roster.count} Fellows at {view.roster.star}★ · you have {view.roster.have}{view.roster.met?' · met':''}</p>}
  {view.stones!==null&&<p className="small-note">The original charges {view.stones} Acquaint Stones here, from its Guild Shop. Everkai keeps its own star shards from perfect habit days instead, so stars already bought keep the value they were bought at; the original’s roster prerequisite above is added in their place.</p>}
  <p>This Fellow’s star halos reaching it right now: +{(halos.percent/100).toFixed(1)}% Power · +{halos.talent.toLocaleString()} Aptitude · +{(halos.coef/100).toFixed(1)}% Aptitude multiplier</p>
  <table className="rules-note"><tbody>
   {rows.map((r:any)=><tr key={r.k} style={{fontWeight:r.k===view.active?'bold':'normal'}}>
    <td>★{r.k}</td><td>+{r.percent/100}%</td><td>+{r.flat.toLocaleString()}</td><td>halo Lv. {r.halo}</td>
    <td>{r.next===null?'top':`next needs Lv. ${r.next}`}</td>
    <td>{r.roster?`+ ${r.roster[1]}×${r.roster[0]}★`:''}</td></tr>)}
  </tbody></table>
  <p>Limit Break: {breaks.filter((b:any)=>b.open).length}/6 unlocked{breaks.filter((b:any)=>b.open).length<6?` · ★${(breaks.find((b:any)=>!b.open)||{}).star} opens the next`:''}. Each one is a new aptitude track worth +{breaks.map((b:any)=>b.rule?.l||0).reduce((a:number,b:number)=>a+b,0)} Aptitude a level once all six are open.</p>
 </div>
 <Button disabled={locked||fellowStars(f)>=STAR_CAP||blocked||shards<(cost??Infinity)}
  onClick={()=>action('summonStar',id,{seq:summonState(game).seq})}>
  {fellowStars(f)>=STAR_CAP?'Fully starred':blocked&&gate?`Awaken ${gate.count-gate.have} more Fellows to ${gate.star}★ first`:`Awaken · ${cost} star shards`}</Button>
 <details className="rules-note"><summary>About these rules</summary><p>The seven rows are HeroStar.json exactly: +riseADH percent, +extraAtk flat, and the halo level each star broadcasts at. The level gates (300/300/400/550/700/750) and the roster prerequisite (15×3★, 20×4★, 25×5★) are the original’s own brakes. A star the Fellow’s level does not yet support is inactive rather than refused. Most star halos in the original only fire in Commercial War, Week Boss, Coop Boss, Navigation, the Sakura Ceremony or Water Fight — 442 of 444 measured — so they are deliberately not paid here; Everkai has none of those. ★7 is Everkai’s own and pays no more than ★6.</p></details></div>;
}
