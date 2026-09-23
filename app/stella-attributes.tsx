import {stellaAttributes,stellaNextRank,stellaShare} from '@/lib/stella-attributes.mjs';
/** STELLA "ATTRIBUTES" -- the cumulative view, as distinct from the ladder's next-rank delta.
 *
 *  BUILT TO docs/fellow-screen-specs/04-stella.md: the magnifier opens a dialog titled
 *  `Stella Upgraded` listing everything this Fellow's Stella has unlocked so far, in three sections
 *  in this order — `Stella Boost` (round icon, bold `Name Lv. N`, a rule, then the effect line),
 *  `Attribute Boost` (a glyph and `Power +223500000`, SPELLED OUT IN FULL DIGITS rather than
 *  abbreviated, which is the spec's deliberate second register), and `New Aptitude Skill` (the same
 *  row shape). That spec is evidence for the structure and the wording; every magnitude here is
 *  read from the same functions the power model reads.
 *
 *  Spec 11's rule is followed too: zero sources are rendered, never filtered, so the list doubles as
 *  a catalogue of what could contribute. */
const pct=(n:number)=>`+${n.toLocaleString(undefined,{maximumFractionDigits:2})}%`;
export default function StellaAttributes({id,game}:any){
 const a=stellaAttributes(game,id);if(!a)return null;
 const next=stellaNextRank(game,id),s=stellaShare(game,id);
 const held=Object.entries(a.held);
 /** `Stella Boost` rows: the named halos this Fellow's ranks have raised, each with its level and
  *  its effect. Rendered even at zero -- a player learns the shape of the track from the list. */
 const boosts=[
  {name:'Own Power',level:a.rank,effect:`Power ${pct(a.power.selfPercent)}`},
  {name:'Type Power',level:a.rank,effect:`Power of every Fellow of this type ${pct(a.power.typedPercent)}`},
  {name:'Trade Expert',level:a.rank,effect:`When operating a building, its earnings get an extra ${pct(a.appoint.bp/100)} — account-wide, and not Power`},
  {name:'Aptitude Limit Break',level:a.rank,effect:`Level cap of all basic aptitude skill +${a.limit.total}`},
 ];
 return <details className="rules-note"><summary>Attributes</summary>
  <p><strong>Stella Upgraded</strong>{a.rank===null?' · inactive':` · rank ${a.rank}/${a.ranks}`}</p>

  <p><strong>Stella Boost</strong></p>
  {boosts.map(b=><p key={b.name}>◉ {b.name} {b.level===null?'Lv. 0':`Lv. ${b.level}`}<br/>{b.effect}</p>)}

  <p><strong>Attribute Boost</strong></p>
  <p>Power +{a.power.flat.toLocaleString('en-US',{useGrouping:false})}</p>
  <p>Aptitude +{a.aptitude.total.toLocaleString('en-US',{useGrouping:false})}</p>

  <p><strong>New Aptitude Skill</strong></p>
  {a.unlocks.length
   ?a.unlocks.map((u:any)=><p key={u.skill}>{u.open?`Lv. ${u.level}/${u.cap}`:`Rank ${u.rank} opens this`} · Aptitude +{u.aptitude.toLocaleString()}</p>)
   :<p>This Fellow’s Stella opens no extra aptitude skill.</p>}

  <p><strong>Where it sits</strong></p>
  <p>Own ranks{a.power.worth?` +${a.power.worth.toLocaleString()}`:'+0'} Power · Stella’s share of her percent bucket {pct(a.power.percent)} · of her Aptitude +{a.aptitude.total.toLocaleString()} of {s.aptitudeTotal.toLocaleString()}</p>
  <p>Aptitude by source: own+{a.aptitude.own.toLocaleString()} bond+{a.aptitude.bond.toLocaleString()} Family Stella+{a.aptitude.familyStella.toLocaleString()}</p>
  <p>Aptitude-skill cap: Stella+{a.limit.stella} Family Stella+{a.limit.familyStella}</p>

  {next&&<p><strong>Next rank {next.level}</strong> · {next.cost?`${next.cost.toLocaleString()} shards`:'free'} · Power +{next.flat.toLocaleString()}{next.selfPercent?` · own Power ${pct(next.selfPercent)}`:''}{next.percent?` · type Power +${next.percent}%`:''}{next.appointPercent?` · appointment yield ${pct(next.appointPercent)}`:''}{next.talentLimit?` · aptitude cap +${next.talentLimit}`:''}</p>}
  {held.length>0&&<p><strong>Held back, and priced</strong> · {held.map(([k,v])=>`${k}+${(v as number).toLocaleString()}`).join(' ')} · the original grants this and Everkai does not, because there is no axis for it yet — a bonus to a named hero group, and this character’s own talent value, which needs the Aptitude cap raised. Shown so a missing number is visible rather than silent.</p>}
 </details>;
}
