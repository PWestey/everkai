import {Button} from '@/components/ui/button';
import {HERO_STARS,awakenView,starHaloParts,STAR_TIER_NAMES} from '@/lib/hero-stars.mjs';
import {STAR_CAP,fellowStars,nextStarCost} from '@/lib/adventure.mjs';
import {summonState} from '@/lib/summon.mjs';
import {STAR_TALENT_SKILLS,talentSkillUnlocked} from '@/lib/talent-skills.mjs';
/** FELLOW AWAKEN -- the original's HeroStar. Everkai already paid the mechanic and showed it as one
 *  line in the Skills tab ("Stars · n/7"); this is the screen the original gives it.
 *
 *  BUILT TO docs/fellow-screen-specs/05-awaken.md, which is capture evidence for layout, wording and
 *  state, and explicitly NOT evidence for numbers -- every magnitude below comes from HeroStar.json
 *  and the halo tables instead. Followed from that spec: the star banner, the two-number summary
 *  strip, `Lv.N Name` talent rows with the effect and `(Next Level +X)`, the medal row with locked
 *  padlocks, the GENERATED gate line, and a cost button that is just `have/cost` with no verb.
 *
 *  Structure and wording only -- the ornamental half (hexagon banner, 112px medals, rarity-coloured
 *  art tiles) is the visual pass's job and is left as plain markup deliberately. */
const abbreviate=(n:number)=>n>=1e9?`${(n/1e9).toFixed(1)}B`:n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);
/** The one sentence each talent gets, templated from its prop and scope the way the original does --
 *  the parameter (the class, the group) is the token a player reads, so it is named, not hidden. */
function effectLine(t:any){
 const scope=t.scope?.[0],who=scope==='self'?'this Fellow'
  :scope==='all'?'every Fellow'
  :scope==='country'?'Fellows of this type'
  :scope==='bond'?'this Fellow’s group'
  :scope==='rare'?'Fellows of this rarity'
  :'the roster';
 if(t.prop==='talent')return `Aptitude of ${who} +${t.value.toLocaleString()}`;
 if(t.prop==='coef')return `Aptitude multiplier of ${who} +${(t.value/100).toLocaleString()}%`;
 return `Power of ${who} +${(t.value/100).toLocaleString()}%`;
}
const nextLine=(t:any)=>t.next===null?null
 :t.prop==='talent'?`+${t.next.toLocaleString()}`:`+${(t.next/100).toLocaleString()}%`;
export default function AwakenPanel({id,game,action,locked}:any){
 const f=game.fellows[id];if(!f)return null;
 const view=awakenView(game,id);if(!view)return null;
 const halos=starHaloParts(game,id),shards=summonState(game).starShards,cost=nextStarCost(f);
 const gate=view.roster,blocked=!!gate&&!gate.met;
 const short=cost!==null&&shards<cost;
 const breaks=STAR_TALENT_SKILLS.map((skill:string,i:number)=>({skill,star:i+1,open:talentSkillUnlocked(game,id,skill)}));
 const opened=breaks.filter((b:any)=>b.open).length;
 return <section className="school-card">
  {/* Star banner: earned stars solid, unearned hollow. The banner IS the progress indicator. */}
  <h3>{'★'.repeat(view.active)}{'☆'.repeat(Math.max(0,6-view.active))} · Awaken</h3>
  {/* Summary strip: two numbers, no sentence. */}
  <p><strong>POW</strong> Base Value +{abbreviate(view.paid.flat)} · Multiplier +{view.paid.percent/100}%</p>
  {view.stored>view.active&&<p className="small-note">★{view.stored} is stored and inactive until Lv. {view.inactive}. A star is never taken away.</p>}

  {/* Talent rows: one per halo this Fellow broadcasts, at the level its star gives. */}
  {view.talents.map((t:any)=><div className="training-option" key={t.skill}><div>
   <strong>Lv.{t.level} {t.name}</strong>
   <p>{effectLine(t)}{nextLine(t)?` (Next Level ${nextLine(t)})`:''}</p>
   <details className="rules-note"><summary>{t.tierName}</summary>
    {t.ladder.map((r:any)=><p key={r.level}>{r.level===t.level?`(${r.tierName})`:`${r.tierName}:`} {t.prop==='talent'?`+${r.value.toLocaleString()}`:`+${(r.value/100).toLocaleString()}%`}</p>)}
   </details></div></div>)}
  {!view.talents.length&&<p>This Fellow broadcasts no star halo Everkai pays.</p>}

  {/* Medal row: one per star, locked until earned. */}
  <p>{HERO_STARS.map((_:any,k:number)=>k===0?null:<span key={k}>{k<=view.active?`◉${k} `:`🔒${k} `}</span>)}</p>

  {/* Gate line, generated from the requirement rather than written per Fellow. */}
  {view.gate&&<p>{view.gate}</p>}
  {view.gate&&<p className="small-note">Lv. {f.level} now{gate?` · ${gate.have} of ${gate.count} Fellows at ${gate.star}★`:''}</p>}

  {/* Primary action: the cost is the button. */}
  <Button disabled={locked||fellowStars(f)>=STAR_CAP||blocked||short}
   onClick={()=>action('summonStar',id,{seq:summonState(game).seq})}>
   {fellowStars(f)>=STAR_CAP?'Fully starred':`${shards.toLocaleString()}/${cost}`}</Button>

  <p>Limit Break {opened}/6{opened<6?` · ★${(breaks.find((b:any)=>!b.open)||{}).star} opens the next`:''} · each one is a new aptitude track</p>
  <p className="small-note">This Fellow’s halos reaching it right now: Power +{(halos.percent/100).toFixed(1)}% · Aptitude +{halos.talent.toLocaleString()} · Aptitude multiplier +{(halos.coef/100).toFixed(1)}%</p>
  <details className="rules-note"><summary>About Awaken</summary>
   <p>The seven rows are HeroStar.json: +riseADH percent, +extraAtk flat, and the level each star broadcasts its halos at. The level gates (300 / 300 / 400 / 550 / 700 / 750) and the roster requirement (15×3★, 20×4★, 25×5★) are the original’s own, and the gate line above is generated from them rather than written out. A star the Fellow’s level does not yet support is inactive, never refused.</p>
   <p>The seven tier names — {STAR_TIER_NAMES.join(', ')} — are the original’s own words for halo levels 1 to 7; the number and the name are the same value said two ways.</p>
   <p>Some Fellows show fewer talent rows here than in the original, and that is measured rather than missing: 442 of the original’s 444 roster-wide star halos only fire in Commercial War, Week Boss, Coop Boss, Navigation, the Sakura Ceremony or Water Fight, none of which this village has, so they are deliberately not paid.</p>
   <p>The original charges {view.stones??'—'} Acquaint Stones from its Guild Shop for the next star. Everkai keeps its own star shards from perfect habit days instead, so stars already bought keep the value they were bought at; the original’s roster requirement is kept exactly as it stands. ★7 is Everkai’s own and pays no more than ★6.</p>
  </details></section>;
}
