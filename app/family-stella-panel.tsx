import {Button} from '@/components/ui/button';
import {familyStellaRule,familyStellaRank,familyStellaYield} from '@/lib/family-stella.mjs';
import {familyStellaPlan} from '@/lib/talent-skills.mjs';
import {stellaState,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
// Family Stella (the original's WifeSpirit, lib/family-stella.mjs): paid from the shared Stella shard pool, and
// paid to the Fellows this member blesses as talent, Power percent and a talent level cap raise -- plus, since
// 2026-09-22, her `city | yield percent` halo, which is account-wide village earnings rather than Power.
//
// ITS OWN TAB SINCE 2026-09-22 (docs/character-systems-gap.md 3.2). It used to render as a strip at the top of
// the Blessings tab, which is why the audit reported Family Stella as "not in the family dock at all" -- it
// shipped, in full, somewhere nobody looked. The original gives it the FIRST dock position; Everkai's Family
// dock now names it between Bonds and Blessings. One label and one move; no data, no save, no risk.
export default function FamilyStellaPanel({game,id,action,locked}:any){
 const rule=familyStellaRule(id);if(!rule||!game.family[id])return null;
 const rank=familyStellaRank(game,id),row=rank>=0?rule.ranks[rank]:null,shards=stellaState(game).stock[SPIRIT_SHARD_ITEM]||0;
 const yieldBp=row?row[4]||0:0,nextRow=rank>=0&&rank+1<rule.ranks.length?rule.ranks[rank+1]:null;
 return <div className="training-option"><div><strong>Family Stella · {rank<0?'inactive':`rank ${rank}/${rule.ranks.length-1}`}</strong>
  <p>{row?`Blessed Fellows: +${row[1].toLocaleString()} Aptitude · +${(row[2]/100).toLocaleString()}% Power · talent cap +${row[3]}`:'Activate to bless this member’s Fellows with Stella.'} · {shards.toLocaleString()} Stella shards held</p>
  {yieldBp>0&&<p>All Building Earnings +{(yieldBp/100).toLocaleString()}%{nextRow&&(nextRow[4]||0)>yieldBp?` (next rank +${((nextRow[4]||0)/100).toLocaleString()}%)`:''} — this one is account-wide, not hers alone.</p>}
  <p>Across the whole family: +{(familyStellaYield(game)*100).toLocaleString(undefined,{maximumFractionDigits:2})}% to every business’s earnings.</p></div>
  <div className="business-actions">{rank<0?<Button disabled={locked} onClick={()=>action('familyStellaActivate',id)}>Activate Family Stella</Button>:
   ([1,5,'max'] as const).map(count=>{const p=familyStellaPlan(game,id,count);return <Button key={count} disabled={locked||!p.count} onClick={()=>action('familyStellaUpgrade',id,count)}>{count==='max'?'Max':`+${count}`} · rank {p.rank} · {p.cost.toLocaleString()} shards</Button>})}</div>
  <details className="rules-note"><summary>About these rules</summary><p>Ranks, costs and all four effect columns are the original’s own WifeSpirit table. Three of them reach the Fellows this member blesses — Aptitude, Power percent and an aptitude-skill level cap. The fourth, All Building Earnings, is the original’s <code>city | yield percent</code> halo: it is village-wide, every activated member adds to the same total, and it multiplies business earnings rather than anyone’s Power. It was recorded and left unpaid until 2026-09-22; it now lands together with Family Latency, because in the original both are per-member percentages summed over the whole roster into the same bracket.</p><p>Family Stella spends the shared village Stella shard pool rather than each member’s own crystal fragments, which the original has and Everkai has no pulls to drop.</p></details></div>;
}
