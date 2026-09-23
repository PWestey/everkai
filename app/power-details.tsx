import {powerParts} from '@/lib/adventure.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {abbrev} from './original-controls';
/** THE BREAKDOWN DIALOG, built to docs/fellow-screen-specs/11-number-transparency.md and measured on
 *  img/power-details-1.png, img/power-details-2.png and img/aptitude-breakdown.png.
 *
 *  Every aggregate in the original has an `(i)` that opens a two-column label+value list under banded
 *  section headers. Three things the captures do that this copies exactly:
 *
 *  1. THE MULTIPLICATION STAGES ARE NAMED AND SEPARATED -- `Power Percentage Bonus`, `Fixed Power
 *     Bonus`, `Final Power Bonus (%)`. That is the stacking order made visible: a player who wants to
 *     know whether artifacts multiply before or after Stella reads it off the section order. Everkai
 *     never named them, and docs/power-parity-audit.md records that the old spine got three of them
 *     wrong precisely because they were invisible (difference N3).
 *  2. ZERO SOURCES ARE STILL LISTED. `Fish+0`, `Museum+0`, `Expo+0` all render, so the dialog doubles
 *     as a catalogue of what COULD contribute. Everkai filtered zeros out (N4); the filter is gone.
 *  3. `Base +N (Determined by Aptitude)` is the ONE explanatory phrase allowed, because the relation
 *     between two different aggregates is the one thing a list cannot show.
 *
 *  NO REFACTOR WAS NEEDED, and that is worth recording. Spec 11 calls the named-term refactor "the
 *  real work" and expects `composePower` to be changed from a scalar to `(name, stage, value)` triples.
 *  It already is: `powerParts` (lib/adventure.mjs, rebuilt 2026-09-18 on the original's own
 *  composition) returns `{talent, coefpercent, percent, flat, final}` as five OBJECTS keyed by source
 *  name, and `composePower` takes their sums. So this file only reads what the engine already emits --
 *  no engine line changed, every Power value is identical to the line before, and no save can move.
 *
 *  Percent buckets are exact integer basis points (POWER_BP = 10,000 = 100%), so `+261.5%` is
 *  `2615/100` and never a float round-trip. */

/** Everkai's own source names, in the register the original prints them: label then `+value`, no
 *  space, no colon. The ORDER is the declaration order, so zero rows keep a stable position. */
const PERCENT:[string,string][]=[['stars','Stars'],['starHalo','Star Halos'],['origin','Origin Boost'],['skill','Skill'],['bonds','Family Bond'],['family','Blessings'],['museum','Museum'],['fishing','Fish'],['echo','Equipment Echo'],['stella','Stella'],['familiar','Familiar'],['familyStella','Family Stella'],['familyPair','Family Pair'],['quench','Quenching']];
const FLAT:[string,string][]=[['stars','Stars'],['family','Blessings'],['stella','Stella'],['elixir','Elixirs'],['fishing','Fish'],['familiar','Familiar'],['museum','Museum'],['familyPair','Family Pair']];
const FINAL:[string,string][]=[['museum','Museum'],['familiar','Familiar']];
const TALENT:[string,string][]=[['record','Base'],['hero','Quality'],['gear','Equipment'],['artifact','Artifacts'],['family','Family'],['skills','Skill'],['intimacy','Intimacy'],['stellaTalent','Stella'],['stellaBond','Stella Bond'],['rarity','Rarity Advance'],['stage','Rarity Stage'],['familyStella','Family Stella'],['starHalo','Star Halos'],['origin','Origin Boost'],['museum','Museum'],['fishing','Fish'],['echo','Equipment Echo'],['familiar','Familiar']];
const COEF:[string,string][]=[['starHalo','Star Halos'],['origin','Origin Boost']];

const pct=(bp:number)=>'+'+(Math.round(bp)/100).toLocaleString('en-US',{maximumFractionDigits:2})+'%';
const flatOf=(v:number)=>'+'+abbrev(v);
/** A two-column grid. Zeros are never filtered -- that is the point of the list. */
function Sources({rows,bucket,format}:{rows:[string,string][],bucket:Record<string,number>,format:(v:number)=>string}){
 return <div className="source-grid">{rows.map(([key,label])=>
  <span key={key} className="source-row"><i>{label}</i><b>{format(bucket[key]||0)}</b></span>)}</div>;
}
function Band({name,children}:any){return <><h4 className="source-band">{name}</h4>{children}</>}

/** The whole dialog body: both of the Fellow's headline numbers audited in one place, as the original
 *  audits them (difference N5 -- Everkai split Power and Aptitude across different pages). */
export default function PowerDetails({game,id}:any){
 const p=powerParts(game,id),profile=fellowById(id);
 // The base BEFORE the percentage bucket, which is what the original's `Base` row reports.
 const base=Math.floor(p.adh*p.aptitude);
 return <div className="breakdown">
  {profile?.description&&<p className="breakdown-blurb">{profile.description}</p>}
  <h3 className="aggregate-band">Power <b>{Math.round(p.power).toLocaleString('en-US')}</b></h3>
  <p className="breakdown-note">Base {flatOf(base)} (Determined by Aptitude)</p>
  <Band name="Power Percentage Bonus"><Sources rows={PERCENT} bucket={p.percent} format={pct}/></Band>
  <Band name="Fixed Power Bonus"><Sources rows={FLAT} bucket={p.flat} format={flatOf}/></Band>
  <Band name={`Final Power Bonus (%)`}><Sources rows={FINAL} bucket={p.final} format={pct}/></Band>
  <h3 className="aggregate-band">Aptitude <b>{Math.round(p.aptitude).toLocaleString('en-US')}</b></h3>
  <Sources rows={TALENT} bucket={p.talent} format={flatOf}/>
  <hr className="source-rule"/>
  <Sources rows={COEF} bucket={p.coefpercent} format={pct}/>
 </div>;
}
