import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {HERO_STARS,awakenView,starHaloParts,STAR_TIER_NAMES} from '@/lib/hero-stars.mjs';
import {STAR_CAP,fellowStars,nextStarCost} from '@/lib/adventure.mjs';
import {summonState} from '@/lib/summon.mjs';
import {STAR_TALENT_SKILLS,talentSkillUnlocked} from '@/lib/talent-skills.mjs';
import {InfoDot} from './fellow-shell';
import {abbrev} from './original-controls';
/** FELLOW AWAKEN -- the original's HeroStar. Everkai already paid the mechanic and showed it as one
 *  line in the Skills tab ("Stars · n/7"); this is the screen the original gives it.
 *
 *  BUILT TO docs/fellow-screen-specs/05-awaken.md, which is capture evidence for layout, wording and
 *  state, and explicitly NOT evidence for numbers -- every magnitude below comes from HeroStar.json
 *  and the halo tables instead. The structure landed first (d47070d) as plain markup with the note
 *  that "the ornamental half is the visual pass's job"; this is that pass, measured on
 *  img/awaken-4star.png, img/awaken-0star.png and img/awaken-tier-tooltip.png:
 *
 *   * the star banner is a stretched hexagon whose FILL changes with progress -- violet at 4 stars,
 *     flat brown at 0 -- so the banner is itself a progress indicator, not a container;
 *   * the summary strip is two green numbers, `Base Value +1.5M   Multiplier +30%`, and no sentence;
 *   * a talent row is a square rarity-coloured art tile, then `Lv.4 Support Power` in gold, then the
 *     effect in brown with `(Next Level +3%)` in green parentheses in the same flow, then an `(i)`;
 *   * that `(i)` opens a DARK TRANSLUCENT overlay -- not a cream dialog -- listing the whole
 *     seven-tier ladder with the current tier in green and wrapped in parentheses;
 *   * the medal row is circular medals that scroll sideways, coloured when earned, silver with a
 *     padlock badge when not;
 *   * the gate line is the screen's ONE sentence, generated from the requirement, with its numerals
 *     in red;
 *   * the primary action has NO VERB: the button is the cost, `11/15`, the have-number red when
 *     short and green when sufficient.
 *
 *  The gate line ships verbatim, as the owner ruled. */

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
const tierValue=(t:any,r:any)=>t.prop==='talent'?`+${r.value.toLocaleString()}`:`+${(r.value/100).toLocaleString()}%`;
/** The gate line's numerals in red, without authoring a second copy of the sentence. */
const redNumbers=(text:string)=>text.split(/(\d[\d,]*)/).map((part,i)=>/^\d/.test(part)?<b key={i}>{part}</b>:part);
/** A talent's art tile takes the star tier's colour, which is what the capture's red/purple/gold
 *  grounds carry. */
const TIER_GROUND=['tier-green','tier-blue','tier-purple','tier-red','tier-orange','tier-purple','tier-red'];

function TalentRow({t}:{t:any}){
 const [open,setOpen]=useState(false);
 return <div className="awaken-talent">
  <span className={'awaken-art '+(TIER_GROUND[(t.level-1)%TIER_GROUND.length]||'tier-blue')} aria-hidden="true">{t.tierName?.[0]||'★'}</span>
  <div>
   <p className="awaken-talent-name">Lv.{t.level} {t.name}</p>
   <p className="awaken-talent-effect">{effectLine(t)}{nextLine(t)?<i> (Next Level {nextLine(t)})</i>:null}</p>
  </div>
  <InfoDot label={t.name+' tier ladder'} onClick={()=>setOpen(true)}/>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="tier-overlay">
   <DialogTitle>{t.name}</DialogTitle>
   <DialogDescription className="sr-only">Every tier of this awakening talent.</DialogDescription>
   {t.ladder.map((r:any)=><p key={r.level} className={r.level===t.level?'tier-current':''}>
    {r.level===t.level?`(${r.tierName})`:`${r.tierName}:`} {tierValue(t,r)}</p>)}
  </DialogContent></Dialog>
 </div>;
}

export default function AwakenPanel({id,game,action,locked}:any){
 const [info,setInfo]=useState(false);
 const f=game.fellows[id];if(!f)return null;
 const view=awakenView(game,id);if(!view)return null;
 const halos=starHaloParts(game,id),shards=summonState(game).starShards,cost=nextStarCost(f);
 const gate=view.roster,blocked=!!gate&&!gate.met;
 const short=cost!==null&&shards<cost;
 const breaks=STAR_TALENT_SKILLS.map((skill:string,i:number)=>({skill,star:i+1,open:talentSkillUnlocked(game,id,skill)}));
 const opened=breaks.filter((b:any)=>b.open).length;
 const maxed=fellowStars(f)>=STAR_CAP;
 return <section className="awaken-panel">
  <header className={'star-banner'+(view.active?' star-lit':'')}>
   {HERO_STARS.map((_:any,k:number)=>k===0?null:<b key={k} className={k<=view.active?'lit':''}>★</b>)}
  </header>
  <p className="awaken-summary"><span className="glyph">POW</span>Base Value <b>+{abbrev(view.paid.flat)}</b>
   <span>Multiplier</span><b>+{view.paid.percent/100}%</b></p>
  {view.stored>view.active&&<p className="awaken-stored">★{view.stored} is stored and inactive until Lv. {view.inactive}. A star is never taken away.</p>}

  {view.talents.map((t:any)=><TalentRow key={t.skill} t={t}/>)}
  {!view.talents.length&&<p className="awaken-stored">This Fellow broadcasts no star halo Everkai pays.</p>}

  <div className="medal-row">{HERO_STARS.map((_:any,k:number)=>k===0?null:
   <span key={k} className={'medal '+(k<=view.active?(TIER_GROUND[(k-1)%TIER_GROUND.length]||'tier-blue'):'medal-locked')}>
    <i aria-hidden="true">{k<=view.active?'★':'🔒'}</i><u>{k}</u></span>)}
  </div>

  {view.gate&&<p className="gate-line">{redNumbers(view.gate)}</p>}

  <div className="awaken-foot">
   <Button className={'primary-action'+(maxed?' primary-tier':'')} disabled={locked||maxed||blocked||short}
    onClick={()=>action('summonStar',id,{seq:summonState(game).seq})}>
    {maxed?<b>Fully starred</b>:<b><span className="fragment-glyph" aria-hidden="true">◈</span>
     <i className={short?'short':'enough'}>{shards.toLocaleString()}</i>/{cost}</b>}</Button>
   <InfoDot label="About Awaken" onClick={()=>setInfo(true)}/>
  </div>

  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="save-dialog">
   <DialogTitle>Awaken</DialogTitle>
   <DialogDescription>Lv. {f.level} now{gate?` · ${gate.have} of ${gate.count} Fellows at ${gate.star}★`:''} · Limit Break {opened}/6</DialogDescription>
   <p>The seven rows are HeroStar.json: +riseADH percent, +extraAtk flat, and the level each star broadcasts its halos at. The level gates (300 / 300 / 400 / 550 / 700 / 750) and the roster requirement (15×3★, 20×4★, 25×5★) are the original’s own, and the gate line above is generated from them rather than written out. A star the Fellow’s level does not yet support is inactive, never refused.</p>
   <p>The seven tier names — {STAR_TIER_NAMES.join(', ')} — are the original’s own words for halo levels 1 to 7; the number and the name are the same value said two ways.</p>
   <p>Some Fellows show fewer talent rows here than in the original, and that is measured rather than missing: 442 of the original’s 444 roster-wide star halos only fire in Commercial War, Week Boss, Coop Boss, Navigation, the Sakura Ceremony or Water Fight, none of which this village has, so they are deliberately not paid.</p>
   <p>The original charges {view.stones??'—'} Acquaint Stones from its Guild Shop for the next star. Everkai keeps its own star shards from perfect habit days instead, so stars already bought keep the value they were bought at; the original’s roster requirement is kept exactly as it stands. ★7 is Everkai’s own and pays no more than ★6.</p>
   <p>Each Limit Break a star opens is a new aptitude track{opened<6?`; ★${(breaks.find((b:any)=>!b.open)||{}).star} opens the next`:''}. This Fellow’s halos reaching it right now: Power +{(halos.percent/100).toFixed(1)}% · Aptitude +{halos.talent.toLocaleString()} · Aptitude multiplier +{(halos.coef/100).toFixed(1)}%</p>
  </DialogContent></Dialog>
 </section>;
}
