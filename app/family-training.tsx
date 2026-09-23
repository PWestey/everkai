import {useState} from 'react';
import {Button} from '@/components/ui/button';
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

/** Dock position 2. The original's `Bonds` is the RELATIONSHIP RUNG; Everkai's `Bonds` page was Fellow
 *  pairing and its rung control sat on `Profile`. The rung takes the tab, which is the original's own
 *  arrangement; the pairing UI keeps a home underneath it until spec 07 moves it onto `Blessing`,
 *  where the blessed-Fellow portraits belong. Same actions, same costs -- `relationship` and
 *  `bondTrain` are the two Everkai already dispatched. */
function BondsSection({game,id,action,locked}:any){
 const f=game.family?.[id];
 if(!f)return <BondPanel game={game} id={id} action={action} locked={locked}/>;
 const need=relationRequired(f.relationship),capped=f.relationship>=5;
 return <div className="bonds-section">
  <div className="rung-banner"><i aria-hidden="true">&#9671;</i><b>{rungName(f.relationship)}</b><i aria-hidden="true">&#9671;</i></div>
  <div className="effect-card"><span>Adopted Children Intellect</span><b>{f.relationship*10}</b></div>
  <Button className="primary-action" disabled={locked||capped||f.intimacy<need} onClick={()=>action('relationship',id)}>
   <b>{capped?'Highest rung':'Improve'}</b>{capped?null:<small><span className="have-cost"><i className={f.intimacy<need?'short':'enough'}>{Math.round(f.intimacy).toLocaleString('en-US')}</i>/{need.toLocaleString('en-US')}</span></small>}</Button>
  <BondPanel game={game} id={id} action={action} locked={locked}/>
 </div>;
}

/** Dock position 4. Everkai's `Family skill` block spends the same Blessing Points as the Fellow
 *  blessings beside it, so it lands on the tab where that currency is spent rather than on a Profile
 *  page that no longer exists. */
function BlessingSection({game,id,action,locked}:any){
 const f=game.family?.[id];
 return <div className="blessing-section">
  {f&&<div className="effect-card"><span>Family skill</span><b>Lv. {f.skill}</b>
   <small>+{f.skill}% village earnings at the starter buildings &middot; {Math.round(familyBonus(game)*100)}% from the whole family</small>
   <Button className="primary-action" disabled={locked||f.skill>=20||f.points<blessingCost(f)} onClick={()=>action('bless',id)}>
    <b>{f.skill>=20?'Fully upgraded':'Improve'}</b>{f.skill>=20?null:<small><span className="have-cost"><i className={f.points<blessingCost(f)?'short':'enough'}>{f.points.toLocaleString('en-US')}</i>/{blessingCost(f).toLocaleString('en-US')}</span></small>}</Button></div>}
  <BlessingPanel game={game} id={id} action={action} locked={locked}/>
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
