import {fellowById} from '@/lib/catalog.mjs';
import StellaPanel from './stella-panel';
import OperationTraining from './operation-training';
import AwakenPanel from './awaken-panel';
import PanelPages from './panel-pages';
import AptitudePanel from './aptitude-panel';
import {stellaRule} from '@/lib/stella.mjs';
import {operationSkills} from '@/lib/operations.mjs';
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
 const sections:[string,any][]=[];
 if(stellaRule(id))sections.push(['Stella',<StellaPanel key="s" id={id} game={game} action={action} locked={locked}/>]);
 sections.push(['Awaken',<AwakenPanel key="a" id={id} game={game} action={action} locked={locked}/>]);
 sections.push(['Aptitude',<AptitudePanel key="t" game={game} id={id} action={action} locked={locked}/>]);
 if(operationSkills(game,id).length)sections.push(['Operation',<OperationTraining key="o" id={id} game={game} action={action} locked={locked}/>]);
 // Upgrade is last and carries no page: its child is never rendered, the dock just closes the sheet.
 sections.push(['Upgrade',<section key="u"/>]);
 return <div className="training-panel"><PanelPages key={id} popup personName={fellowById(id).name} bare={['Upgrade']} initialPage={sections.length-1}
  variants={{Stella:'tall',Awaken:'full',Aptitude:'tall',Operation:'tall'}} labels={sections.map(([label])=>label)}>
  {sections.map(([,node])=>node)}
 </PanelPages></div>;
}
