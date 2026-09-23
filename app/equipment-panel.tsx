import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {artifactEchoRule,artifactEchoBonus,artifactEchoEligible} from '@/lib/artifact-echo.mjs';
import {artifactRule,artifactState,artifactBonus,gearLevel,ARTIFACT_CAP,artifactUpgradePlan} from '@/lib/artifacts.mjs';
import {quenchPlan,fellowQuench,quenchPercent,quenchSlots} from '@/lib/quench.mjs';
import {GEAR} from '@/lib/adventure.mjs';
/** The artifact slot, lifted out of fellow-training.tsx unchanged when the Fellow dock was rebuilt to
 *  the original's five sections (docs/fellow-screen-specs/02-cultivate-shell.md). The original keeps
 *  equipment on the RIGHT RAIL as two 76px tiles, not in the section dock, so this is now opened from
 *  the rail. Nothing about equipping, upgrading, quenching or Echo changed. */
export default function EquipmentPanel({game,id,action,locked}:any){
 const f=game.fellows[id],artifact=artifactRule(f.gear),artifactPlan=artifactUpgradePlan(game,id);
 const echo=artifactEchoRule(f.gear),echoBonus=artifactEchoBonus(game,id),echoFamily=echo&&'family' in echo?echo.family:null;
 return <>
  <label htmlFor={'gear-'+id}>Equipment</label>
  <NativeSelect id={'gear-'+id} value={f.gear||''} disabled={locked} onChange={e=>action('equip',id,e.target.value||null)}><NativeSelectOption value="">None</NativeSelectOption>{GEAR.map((g:any)=><NativeSelectOption key={g.id} value={g.id} disabled={f.gear!==g.id&&game.inventory[g.id]<1}>{g.name} · +{g.aptitude} Aptitude · {game.inventory[g.id]} in bag</NativeSelectOption>)}</NativeSelect>
  {artifact&&<div className="training-option"><div><strong>Artifact · Lv. {gearLevel(f)}</strong><p>+{artifact.initial+artifactBonus(f)} Aptitude · Magic Ore: {artifactState(game).ore}</p><p>{gearLevel(f)===1?'Upgrade spending will be recorded.':f.gearOreSpent===undefined?'Older copy: past investment unknown; recycling protected.':`${f.gearOreSpent} Magic Ore investment recorded.`}</p></div><Button disabled={locked||gearLevel(f)>=ARTIFACT_CAP||artifactState(game).ore<artifact.ore} onClick={()=>action('upgradeArtifact',id)}>Upgrade · {artifact.ore} Magic Ore</Button><Button variant="outline" disabled={locked||!artifactPlan.count} onClick={()=>action('upgradeArtifactMax',id)}>Upgrade {artifactPlan.count} levels · {artifactPlan.cost} Ore</Button></div>}
  {f.gear&&quenchSlots(f.gear)>0&&<div className="training-option"><div><strong>Quenching · +{(quenchPercent(f)/100).toLocaleString()}% Power</strong><p>Slots {fellowQuench(f).map((r:number)=>r*100).join(' · ')} (each to 1,600, paid in gold on the original&rsquo;s own quench prices)</p></div><div className="business-actions">{([1,10,'max'] as const).map(q=>{const p=quenchPlan(game,id,q==='max'?1000:q);return <Button key={q} disabled={locked||!p.count} onClick={()=>action('quenchArtifact',id,q)}>Quench {q==='max'?'max':`+${q}`} · {p.count} steps · {p.cost.toLocaleString()} gold</Button>})}</div></div>}
  {echo&&<div className="training-option"><div><strong>{echoFamily?'Family support':'Echo'} · {echo.name}</strong><p>+{game.artifacts?.echoes?.[f.gear]?.aptitude||echo.aptitude} Aptitude · +{game.artifacts?.echoes?.[f.gear]?.percent||echo.percent}% Power {echoFamily?`for any wearer after welcoming Family ${echo.name}`:`when equipped by ${echo.name}`}</p><p>{echoBonus.aptitude?'Active on this Fellow':!artifactEchoEligible(game,id,echo)?echoFamily?`Welcome Family ${echo.name} to use this support.`:'Move this artifact to its named Fellow to use its Echo.':'Enable once to use this equipment bonus.'}</p></div><Button disabled={locked||!artifactEchoEligible(game,id,echo)||!!game.artifacts?.echoes?.[f.gear]} onClick={()=>action('enableArtifactEcho',id)}>{echoFamily?'Enable Family support · Free':'Enable Echo · Free'}</Button></div>}
  <details className="rules-note"><summary>About these rules</summary><p>Upgraded copies keep their levels when returned to the bag. Equipping selects your highest-level copy. Level 20 is our current sandbox limit; named Echo and three Family-supported equipment bonuses are supported; random skills, ascension and materia are pending.</p></details>
 </>;
}
