import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {InfoDot} from './fellow-shell';
import {Step} from './original-controls';
import PanelPages from './panel-pages';
import BondPanel from './bond-panel';
import BlessingPanel from './blessing-panel';
import FathomPanel from './fathom-panel';
import LatencyPanel from './latency-panel';
import FamilyStellaPanel from './family-stella-panel';
import {rungName} from './family-shell';
import {familyStellaRule} from '@/lib/family-stella.mjs';
import {latencyApply} from '@/lib/latency.mjs';
import {blessingCost,familyBonus} from '@/lib/progression.mjs';
import {relationRequired} from '@/lib/school.mjs';
/** THE FAMILY SECTION DOCK, rebuilt to docs/family-screen-specs/02-member-shell.md.
 *
 *  The original's dock is FIVE icon tabs -- Stella, Bonds, Skills, Blessing, Interact -- behind a
 *  leading back chevron, with no text pager and no per-page rules disclosure. Everkai's eleven
 *  text-labelled pages (`Profile . Dates . Gifts . More gifts . Bonds . Stella . Blessings . Fathoms .
 *  Latency . Pictures . Wardrobe`, with `Previous . 6 / 11 . Next` at the foot) became those five:
 *
 *    Profile     deleted. Its name/title/bio are the banner and the `Info` sheet, its three stat
 *                tiles are the two medallions on the art (Blessing Points moved to `Blessing`, where
 *                it is spent), its `management-hint` is the two medallion tooltips, its relationship
 *                control moved to `Bonds` where the original keeps it, and its 78-word `rules-note`
 *                is gone -- one information panel per surface, not one per page.
 *    Dates    -> the roster footer, which is where the original puts Auto Date (specs 01/09).
 *    Gifts +
 *    More gifts-> one `Gift` rail surface, as the original has.
 *    Fathoms  -> `Skills` sub-tab `Skill`.
 *    Latency  -> `Skills` sub-tab `Latency`, NESTED, which is where the original puts it. That
 *                removes a top-level label rather than renaming one.
 *    Pictures -> the rail, pending the roster-level Date Record (spec 11).
 *    Wardrobe -> the rail. The capture found no control on the original's Family surface that
 *                reaches costumes at all, so there is no original position to copy.
 *
 *  WHICH SECTIONS EXIST is read off Everkai's own data, never off a rarity guess -- the same choice
 *  `app/fellow-training.tsx` made and for the same reason. `Stella` appears when `familyStellaRule(id)`
 *  has a ladder, which is the check `FamilyStellaPanel` already made before rendering null. The
 *  capture reports the tab as UR-only, but that is a MECHANIC and the capture explicitly caveats its
 *  own rarity observations; gating on rarity here would strip a shipped, reachable system from the 34
 *  SSR members whose WifeSpirit ladder Everkai already pays out. Same for the `Latency` sub-tab and
 *  `latencyApply(id)`.
 *
 *  Nothing here changes what an action does, what it costs or what it yields. */

/** The `Skills` dock position holds two sub-tabs, `Skill` and `Latency` (spec 05, spec 06). A member
 *  with no `WifePotential` record keeps the position and loses the sub-tab, exactly as a member with
 *  no Stella ladder loses the dock tab. */
function SkillsSection({game,id,action,locked}:any){
 const [tab,setTab]=useState('Skill');
 const tabs=latencyApply(id)?['Skill','Latency']:['Skill'];
 const active=tabs.includes(tab)?tab:'Skill';
 return <div className="sub-tab-panel">
  {tabs.length>1&&<nav className="sub-tabs" aria-label="Skills sections">{tabs.map(t=>
   <button key={t} type="button" aria-pressed={active===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>}
  {active==='Skill'
   ?<FathomPanel game={game} id={id} action={action} locked={locked}/>
   :<LatencyPanel game={game} id={id} action={action} locked={locked}/>}
 </div>;
}

/** THE LABEL COLLISION, RESOLVED THE ORIGINAL'S WAY (docs/family-screen-specs/04-bonds.md).
 *
 *  The original's `Bonds` is the RELATIONSHIP RUNG -- Acquainted ... Forever -- and nothing else.
 *  Everkai's `Bonds` page was FELLOW PAIRING, an entirely different system, and its rung control sat
 *  on `Profile`. So the two swapped: the rung takes dock position 2, which is where the original
 *  puts it, and the pairing UI moves to `Blessing`, which is the tab that already spends the same
 *  Blessing Points and where spec 07 puts the blessed Fellows' portraits. No action changed name,
 *  cost or effect -- `relationship` and `bondTrain` are the two Everkai already dispatched.
 *
 *  The pupil grade is a LETTER, as the original grades it, over the integer Everkai already stores.
 *  Three of the five letters are the captures' own: `D` at the bottom rung (img/bonds-lowest-rung),
 *  `A+` at Loving** (img/bonds) and `S-` as the step above it (img/bonds-intellect-preview). `C` and
 *  `B` fill the two gaps between them. Nothing numeric changed: pupil Intellect is still
 *  relationship x 10 and pupilReward still reads it.
 *
 *  NOT BUILT, because Everkai's data does not have it and rule 1 forbids borrowing the other half:
 *  the original gates a rung on THREE bars -- Intimacy, Blessing Power and Total Family -- and shows
 *  the rung's own granted skill (`Lv.4:Family Blessing`). `WifeIntimacyDegree.json` is not imported
 *  (lib/talent-skill-data.json records a sha for HeroIntimacyDegree only, which is the Fellow
 *  table), so the Blessing Power and Total Family thresholds and the per-rung skill simply are not
 *  in this build. Drawing three bars when only one is a real gate would invent two costs. The one
 *  real gate is drawn in the original's bar-with-the-number-inside language; the other two are an
 *  owner/import question. */
const GRADES=['D','C','B','A+','S-'];
const grade=(tier:number)=>GRADES[Math.max(0,Math.min(GRADES.length-1,(tier|0)-1))];

function IntellectPreview({tier}:{tier:number}){
 const next=Math.min(GRADES.length,tier+1),last=tier>=GRADES.length;
 return <table className="pair-table"><tbody>
  <tr><th scope="row">Pupil Intellect</th><td>{last?grade(tier):<Step from={grade(tier)} to={grade(next)} arrow="&raquo;"/>}</td></tr>
  <tr><th scope="row">Intellect value</th><td>{last?tier*10:<Step from={tier*10} to={next*10} arrow="&raquo;"/>}</td></tr>
  {/* pupilReward scales on intellect/10, which IS the rung number, so a step is a clean multiplier. */}
  <tr><th scope="row">Graduation Reward</th><td>{last?`×${tier}.0`:<Step from={`×${tier}.0`} to={`×${next}.0`} arrow="&raquo;"/>}</td></tr>
 </tbody></table>;
}

function BondsSection({game,id,action,locked}:any){
 const [info,setInfo]=useState(false);
 const f=game.family?.[id];
 if(!f)return null;
 const tier=f.relationship,capped=tier>=GRADES.length,need=relationRequired(tier);
 const have=Math.round(f.intimacy),met=have>=need;
 return <div className="bonds-section">
  <div className="rung-banner"><i aria-hidden="true">&#9671;</i><b>{rungName(tier)}</b><i aria-hidden="true">&#9671;</i></div>
  <div className="effect-card bond-effect"><span>Adopted Children Intellect</span>
   <b className="grade">{grade(tier)}</b>
   <InfoDot label="What the next rung is worth" onClick={()=>setInfo(true)}/></div>
  {/* Convention 12: a gate is a bar with the number INSIDE the fill. No sentence says which one is
      short -- the short bar is short. This replaces `Improve relationship - requires 2,000 Intimacy`. */}
  <div className="gate-block">
   <div className="gate-rows">
    <div className="gate-row"><span>Intimacy:</span>
     <div className={'gate-bar gate-pink'+(met?' gate-met':'')} style={{'--fill':Math.min(100,need?have/need*100:100)+'%'} as any}>
      <i/><u>{have.toLocaleString('en-US')}/{need.toLocaleString('en-US')}</u></div></div>
   </div>
   {/* The badge is the affordance, not a disabled button (spec 04). It is still disabled when the
       gate is unmet, because Everkai's engine would refuse the press anyway. */}
   <Button className={'primary-action gate-improve'+(met&&!capped?' gate-ready':'')} disabled={locked||capped||!met}
    onClick={()=>action('relationship',id)}><b>{capped?'Highest':'Improve'}</b></Button>
  </div>
  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="breakdown-dialog">
   <DialogTitle>Adopted Children Intellect</DialogTitle>
   <DialogDescription className="sr-only">What raising this rung is worth.</DialogDescription>
   <IntellectPreview tier={tier}/>
  </DialogContent></Dialog>
 </div>;
}

/** Dock position 4. Everkai's `Family skill` block spends the same Blessing Points as the Fellow
 *  blessings beside it, so it lands on the tab where that currency is spent rather than on a Profile
 *  page that no longer exists -- and so does the FELLOW PAIRING UI that used to be called `Bonds`,
 *  because the pairing is who a blessing reaches (spec 04's resolution of the label collision). */
function BlessingSection({game,id,action,locked}:any){
 const f=game.family?.[id];
 return <div className="blessing-section">
  {f&&<div className="effect-card"><span>Family skill</span><b>Lv. {f.skill}</b>
   <small>+{f.skill}% village earnings at the starter buildings &middot; {Math.round(familyBonus(game)*100)}% from the whole family</small>
   <Button className="primary-action" disabled={locked||f.skill>=20||f.points<blessingCost(f)} onClick={()=>action('bless',id)}>
    <b>{f.skill>=20?'Fully upgraded':'Improve'}</b>{f.skill>=20?null:<small><span className="have-cost"><i className={f.points<blessingCost(f)?'short':'enough'}>{f.points.toLocaleString('en-US')}</i>/{blessingCost(f).toLocaleString('en-US')}</span></small>}</Button></div>}
  <BlessingPanel game={game} id={id} action={action} locked={locked}/>
  <BondPanel game={game} id={id} action={action} locked={locked}/>
 </div>;
}

export default function FamilyTraining({game,person,action,locked,section,onSection}:any){
 const id=person.id;
 const sections:[string,any][]=[];
 if(familyStellaRule(id))sections.push(['Stella',<FamilyStellaPanel key="s" game={game} id={id} action={action} locked={locked}/>]);
 sections.push(['Bonds',<BondsSection key="b" game={game} id={id} action={action} locked={locked}/>]);
 sections.push(['Skills',<SkillsSection key="k" game={game} id={id} action={action} locked={locked}/>]);
 sections.push(['Blessing',<BlessingSection key="l" game={game} id={id} action={action} locked={locked}/>]);
 // Interact is the default selection and is the state with NO panel open (spec 02): its three
 // surfaces are the rail's Story / Travel / Gift, which appear only while it is selected.
 sections.push(['Interact',<section key="i"/>]);
 // The shell needs the selection too -- the rail's Story / Travel / Gift show only under `Interact` --
 // so the page index is lifted to `app/family-panel.tsx` and named by label rather than by number.
 const labels=sections.map(([label])=>label),chosen=labels.indexOf(section);
 return <div className="training-panel"><PanelPages key={id} popup personName={person.name} bare={['Interact']}
  selectedPage={chosen<0?labels.length-1:chosen} onPageChange={(i:number)=>onSection(labels[i])} dockClass="family-dock"
  variants={{Stella:'tall',Bonds:'standard',Skills:'tall',Blessing:'tall'}} labels={labels}>
  {sections.map(([,node])=>node)}
 </PanelPages></div>;
}
