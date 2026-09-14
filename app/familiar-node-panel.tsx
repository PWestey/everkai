import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {familiarNodes,nodeUnlocked,inherentFamiliarBonus} from '@/lib/familiar-nodes.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {cardStyle} from '@/lib/ui-sprites.mjs';
// Field names as bondedPower (lib/adventure.mjs) applies them: flat adds Power, aptitude adds Aptitude,
// percent multiplies Power, finalPercent multiplies the final total.
const EFFECT_NAME:Record<string,string>={flat:'Power',aptitude:'Aptitude',percent:'Power',finalPercent:'final Power'};
const effectText=(effects:Record<string,number>)=>Object.entries(effects).map(([k,v])=>`+${Number(v).toLocaleString()}${k.includes('ercent')?'%':''} ${EFFECT_NAME[k]||k}`).join(', ');
export default function FamiliarNodePanel({game,id,action,locked}:any){
 const [fellow,setFellow]=useState(Object.keys(game.fellows)[0]),[selection,setSelection]=useState('');
 const nodes=familiarNodes(id),active=game.familiarNodes?.[id]||[],ready=nodes.filter((n:any)=>nodeUnlocked(game.familiars[id],n)&&!active.includes(n.id)),chosen=ready.find((n:any)=>n.id===selection)||ready[0];
 const bound=Object.entries(game.familiarBonds||{}).find(([,p])=>p===id)?.[0];
 const label=(n:any)=>`${n.kind==='level'?'Level':'Star'} ${n.threshold}: ${effectText(n.effects)}`;
 const partner:any=bound?fellowById(bound):null;
 // Laid out like the original's Current Bond sheet: a ribbon, the bonded partner's card beside the
 // bonus it grants, a progress bar, then the actions.
 return <div className="familiar-bond"><h4 className="bond-ribbon">Current bond</h4><div className="bond-current"><div className={'framed-card'+(partner?'':' album-record')} style={cardStyle(partner?.rarity) as any} aria-hidden="true">{partner?<img src={'./assets/'+(partner.portrait||partner.art)} alt="" loading="lazy"/>:<span>+</span>}<strong>{partner?.name||'Unbound'}</strong></div><div><small>Bound Fellow</small><p className="bond-name">{partner?.name||'None'}</p><p className="bond-bonus">{effectText(inherentFamiliarBonus(id))}</p></div></div><div className="bond-progress"><span>Nodes</span><progress value={active.length} max={Math.max(1,nodes.length)} aria-label="Nodes activated"/><b>{active.length}/{nodes.length}</b>{ready.length>0&&<em>{ready.length} ready</em>}</div><NativeSelect aria-label="Fellow to bind" value={fellow} onChange={e=>setFellow(e.target.value)}>{Object.keys(game.fellows).map(f=><NativeSelectOption key={f} value={f}>{fellowById(f)?.name}</NativeSelectOption>)}</NativeSelect><div className="business-actions"><Button disabled={locked||bound===fellow} onClick={()=>action('bindFamiliar',id,fellow)}>Bind Fellow · Free</Button><Button variant="outline" disabled={locked||!bound} onClick={()=>action('unbindFamiliar',id)}>Unbind</Button></div><p className="small-note">Base binding bonus applies while bound; activated nodes add to it. One Familiar per Fellow. Rebinding moves its activated bonuses with it.</p>{chosen&&<><NativeSelect aria-label="Unlocked node" value={chosen.id} onChange={e=>setSelection(e.target.value)}>{ready.map((n:any)=><NativeSelectOption key={n.id} value={n.id}>{label(n)}</NativeSelectOption>)}</NativeSelect><Button disabled={locked} onClick={()=>action('activateFamiliarNode',id,chosen.id)}>Activate node · Free</Button></>}<Button variant="outline" disabled={locked||!ready.length} onClick={()=>action('activateFamiliarNodes',id)}>Activate all {ready.length} ready · Free</Button><p className="small-note">Level and star nodes use public reference values. Activation and rebinding are free sandbox choices. Power ordering is reconstructed; original activation costs are unresolved.</p></div>;
}
