import {fellowById} from '@/lib/catalog.mjs';
import {originalProgression} from '@/lib/original-progression.mjs';
import StellaTraining from './stella-training';
import InsightTraining from './insight-training';
import OperationTraining from './operation-training';
import AwakenPanel from './awaken-panel';
import TalentSkillTraining from './talent-skill-training';
import CharacterSkillGuide from './character-skill-guide';
import {talentRule,talentLevel,talentTrainingPlan,talentCap} from '@/lib/talents.mjs';
import PanelPages from './panel-pages';
import {AptitudeHeader} from './fellow-shell';
import {Button} from '@/components/ui/button';
import {aptitudeTrainingPlan,skillCost} from '@/lib/adventure.mjs';
import {stellaRule} from '@/lib/stella.mjs';
import {operationSkills} from '@/lib/operations.mjs';
import {APTITUDE_CAP,PEARL_APTITUDE_CAP} from '@/lib/aptitude-cap.mjs';
/** THE FELLOW SECTION DOCK, rebuilt to docs/fellow-screen-specs/02-cultivate-shell.md.
 *
 *  The original's dock is FIVE sections -- Stella, Awaken, Aptitude, Operation, Upgrade -- behind a
 *  leading back chevron, and a section a Fellow cannot have is REMOVED, not disabled and not shown
 *  locked (difference C3). Everkai's eight text-labelled pages became those five:
 *
 *    Overview    deleted. Its Power/Aptitude/Level-limit tiles are now the PERSISTENT stat block
 *                (difference C4); its six explanatory paragraphs are the Power `(i)` breakdown, which
 *                names every one of those sources anyway; Training Rules and Quick setup moved behind
 *                the level `(i)`, which is the only place the original allows prose (convention 10).
 *    Level    -> Upgrade, which is not a panel at all: the shell IS the screen (spec 03).
 *    Skills   -> Aptitude.
 *    Equipment-> the right rail, where the original keeps the familiar and artifact tiles.
 *    Wardrobe -> the right rail, beside the original's Form Switch.
 *
 *  WHICH SECTIONS EXIST is read off Everkai's own data, never off a rarity guess: Stella appears when
 *  `stellaRule(id)` has a ladder and Operation when `operationSkills` returns rows -- the same two
 *  checks those panels already made before printing "not available for this Fellow yet". The spec's
 *  rarity thresholds (LR 5 sections, SSR+ 5, R 3) are a MECHANIC and are explicitly caveated in the
 *  capture, so they are not invented here. */
export default function FellowTraining({game,id,action,locked}:any){
 const f=game.fellows[id],talent=talentRule(id);
 const sections:[string,any][]=[];
 if(stellaRule(id))sections.push(['Stella',<StellaTraining key="s" id={id} game={game} action={action} locked={locked}/>]);
 sections.push(['Awaken',<AwakenPanel key="a" id={id} game={game} action={action} locked={locked}/>]);
 sections.push(['Aptitude',<section key="t">
  <AptitudeHeader game={game} id={id}/>
  <InsightTraining id={id} game={game} action={action} locked={locked}/>
  <TalentSkillTraining id={id} game={game} action={action} locked={locked}/>
  <CharacterSkillGuide key={id} id={id} game={game} action={action} locked={locked}/>
  {talent&&<div className="training-option"><div><strong>{talent.name} · {talentLevel(f)} / {talentCap(game,id)} paid upgrades</strong><p>+{talent.amount} Aptitude · {talent.cost} Skill Pearls</p>{originalProgression(game)&&<p>Source position {1+talentLevel(f)} / 300. Initial Aptitude is already included; each purchase adds only its earned gain.</p>}</div><div className="business-actions">{([1,5,'max'] as const).map(amount=>{const plan=talentTrainingPlan(game,id,amount);return <Button key={amount} disabled={locked||!plan.count} onClick={()=>action('trainTalent',id,amount)}>Talent {amount==='max'?'max':`up to ${amount}`} · +{plan.aptitude-f.aptitude} Aptitude · {plan.cost} pearls</Button>})}</div></div>}
  <div className="training-option"><div><strong>Aptitude</strong><p>Skill Pearls: {game.inventory.Item_Talent_Hero_1} · direct pearl training stops at {PEARL_APTITUDE_CAP.toLocaleString()} Aptitude</p><p>{f.aptitude>=PEARL_APTITUDE_CAP?'This Fellow is past what pearls can train directly.':'Pearls buy Aptitude point for point only up to 1,000.'} Beyond that, Aptitude comes from talent upgrades, artifacts, Stella, Family blessings, the museum and fishing, up to {APTITUDE_CAP.toLocaleString()}.</p></div><div className="business-actions">{([1,5,'max'] as const).map(amount=>{const p=aptitudeTrainingPlan(game,id,amount);return <Button key={amount} disabled={locked||!p.count} onClick={()=>action('aptitude',id,amount)}>Aptitude {amount==='max'?'max':`up to ${amount}`} · +{p.count} → {p.aptitude} · {p.cost} pearls</Button>})}</div></div>
  <div className="training-option"><div><strong>Fellow skill · Lv. {f.skill}</strong><p>Scrolls: {game.inventory.local_skill_scroll} · +5% per level</p></div><Button disabled={locked||f.skill>=20||game.inventory.local_skill_scroll<skillCost(f)} onClick={()=>action('fellowSkill',id)}>Improve · {skillCost(f)} scrolls</Button></div>
 </section>]);
 if(operationSkills(game,id).length)sections.push(['Operation',<OperationTraining key="o" id={id} game={game} action={action} locked={locked}/>]);
 // Upgrade is last and carries no page: its child is never rendered, the dock just closes the sheet.
 sections.push(['Upgrade',<section key="u"/>]);
 return <div className="training-panel"><PanelPages key={id} popup personName={fellowById(id).name} bare={['Upgrade']} initialPage={sections.length-1}
  variants={{Stella:'tall',Awaken:'tall',Aptitude:'tall',Operation:'standard'}} labels={sections.map(([label])=>label)}>
  {sections.map(([,node])=>node)}
 </PanelPages></div>;
}
