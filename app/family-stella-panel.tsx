import {Button} from '@/components/ui/button';
import {familyStellaRule,familyStellaRank} from '@/lib/family-stella.mjs';
import {familyStellaPlan} from '@/lib/talent-skills.mjs';
import {stellaState,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
// Family Stella (the original's WifeSpirit, lib/family-stella.mjs): paid from the shared Stella shard pool, and
// paid to the Fellows this member blesses as talent, Power percent and a talent level cap raise.
export default function FamilyStellaPanel({game,id,action,locked}:any){
 const rule=familyStellaRule(id);if(!rule||!game.family[id])return null;
 const rank=familyStellaRank(game,id),row=rank>=0?rule.ranks[rank]:null,shards=stellaState(game).stock[SPIRIT_SHARD_ITEM]||0;
 return <div className="training-option"><div><strong>Family Stella · {rank<0?'inactive':`rank ${rank}/${rule.ranks.length-1}`}</strong>
  <p>{row?`Blessed Fellows: +${row[1].toLocaleString()} Aptitude · +${(row[2]/100).toLocaleString()}% Power · talent cap +${row[3]}`:'Activate to bless this member’s Fellows with Stella.'} · {shards.toLocaleString()} Stella shards held</p></div>
  <div className="business-actions">{rank<0?<Button disabled={locked} onClick={()=>action('familyStellaActivate',id)}>Activate Family Stella</Button>:
   ([1,5,'max'] as const).map(count=>{const p=familyStellaPlan(game,id,count);return <Button key={count} disabled={locked||!p.count} onClick={()=>action('familyStellaUpgrade',id,count)}>{count==='max'?'Max':`+${count}`} · rank {p.rank} · {p.cost.toLocaleString()} shards</Button>})}</div></div>;
}
