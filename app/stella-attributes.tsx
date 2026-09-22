import {stellaAttributes,stellaNextRank,stellaShare} from '@/lib/stella-attributes.mjs';
/** The original's Stella "Attributes" popup: the ACCUMULATED totals, not the next rank's delta.
 *  Stella is the largest single term in a developed Fellow's Power and it was the one term with no
 *  running total anywhere in Everkai — that is the whole gap this closes. Read-only; plain by design,
 *  because the visual pass is a separate batch. */
const pct=(n:number)=>`${n.toLocaleString(undefined,{maximumFractionDigits:2})}%`;
const share=(part:number,total:number)=>total>0?` (${Math.round(100*part/total)}% of the total)`:'';
export default function StellaAttributes({id,game}:any){
 const a=stellaAttributes(game,id);if(!a)return null;
 const next=stellaNextRank(game,id),s=stellaShare(game,id);
 const held=Object.entries(a.held);
 return <details className="rules-note"><summary>Attributes · what Stella currently grants this Fellow</summary>
  <p><strong>Power</strong></p>
  <p>Attribute Boost: +{a.power.flat.toLocaleString()} flat Power{share(s.flat,s.flatTotal)}</p>
  <p>Own Power: +{pct(a.power.selfPercent)} · from this Fellow’s own ranks</p>
  <p>Type-wide Power: +{pct(a.power.typedPercent)} · reaches her from every owner of her type, whether or not she has a track</p>
  <p>Stella’s share of her whole percent bucket: +{pct(a.power.percent)}{share(a.power.percent*100,s.percentTotal)}</p>
  <p>Her own ranks are worth {a.power.worth.toLocaleString()} Power right now — her Power as it stands, less her Power with her own Stella removed.</p>
  <p><strong>Aptitude</strong></p>
  <p>From her own Stella: +{a.aptitude.own.toLocaleString()} · from other owners’ bond halos: +{a.aptitude.bond.toLocaleString()} · from Family Stella: +{a.aptitude.familyStella.toLocaleString()} · total +{a.aptitude.total.toLocaleString()}{share(s.aptitude,s.aptitudeTotal)}</p>
  <p>Aptitude-skill level cap: +{a.limit.total} ({a.limit.stella} from Stella, {a.limit.familyStella} from Family Stella). This buys no Aptitude on its own; it lets every eligible skill keep levelling.</p>
  <p><strong>New Aptitude Skills</strong></p>
  {a.unlocks.length
   ?a.unlocks.map((u:any)=><p key={u.skill}>{u.open?`Open at rank ${u.rank} · Lv. ${u.level}/${u.cap} · +${u.aptitude.toLocaleString()} Aptitude`:`Rank ${u.rank} opens one more aptitude track`}</p>)
   :<p>This Fellow’s Stella opens no extra aptitude skill.</p>}
  <p><strong>Not Power</strong></p>
  <p>Appointment yield: +{pct(a.appoint.bp/100)} account-wide (×{a.appoint.multiplier}). This multiplies what every assigned Fellow earns at a business, not anyone’s Power, and every owner who has ranked it adds to the same total.</p>
  {next&&<p><strong>Next rank ({next.level}{next.cost?` · ${next.cost.toLocaleString()} shards`:' · free'})</strong> adds +{next.flat.toLocaleString()} flat Power{next.selfPercent?` · own Power +${pct(next.selfPercent)}`:''}{next.percent?` · type Power +${next.percent}%`:''}{next.appointPercent?` · appointment yield +${pct(next.appointPercent)}`:''}{next.talentLimit?` · aptitude cap +${next.talentLimit}`:''}</p>}
  {held.length>0&&<p><strong>Held back, and priced</strong>: {held.map(([k,v])=>`${k} up to +${(v as number).toLocaleString()}`).join(' · ')}. The original grants this and Everkai does not — not because it was never measured, but because there is no axis for it yet (a bonus to a named hero group, and this character’s own talent value, which needs the Aptitude cap raised). It is shown so a missing number is visible rather than silent.</p>}
 </details>;
}
