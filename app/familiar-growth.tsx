import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {familiarNodes,nodeUnlocked} from '@/lib/familiar-nodes.mjs';
import {familiarCap,familiarStage} from '@/lib/familiars.mjs';
import {trainingCost,starCost} from '@/lib/familiar-supplies.mjs';

// LEVEL-UP and AWAKEN (docs/familiar-screen-specs/06-level-up.md, 05-awaken.md).
//
// Everkai showed these two ladders as ONE `<select>` of unlocked nodes plus two buttons reading
// "Activate node · Free" and "Activate all N ready · Free", with the milestone values spelled out as
// a sentence ("Level 150: +2,400,000 Power, +18 Aptitude"). The original draws each ladder as a RAIL:
// a card per node, reached ones carrying their value, unreached greyed behind a padlock with the
// level or star number where the value would be. The rail is the screen; there is no list of names.
//
// The data was already here. `familiarNodes(id)` returns every node of both kinds with its threshold
// and its effects, and spec 06 verified all 1,194 of them against `PetLevel.ExternalAdd` and
// `PetStar.ExternalAdd1` EXACTLY -- which is why the old panel's "Power ordering is reconstructed"
// disclosure is gone rather than reworded. It was apologising for data that matches the source.
//
// NOT BUILT, deliberately, each with its reason:
//  * `Progress Reversion` -- spec 06: the refund rule is in no table this pass found, and shipping the
//    control without one is worse than omitting it.
//  * `Use Universal Insignia` -- spec 05: Everkai has no insignia to spend, so the toggle would be dead.
//  * The `(i)` nine-attribute glossary -- `PetAttr` is 3 of 9 imported; it arrives with that import.
const BUCKET:Record<string,string>={flat:'Power',aptitude:'Aptitude',percent:'Power %',finalPercent:'Final Power %'};
const shortValue=(v:number)=>v>=1e6?`${(v/1e6).toFixed(v>=1e7?0:1)}M`:v>=1e3?`${Math.round(v/1e3)}K`:`${v}`;
const nodeValue=(effects:Record<string,number>)=>Object.entries(effects).map(([k,v])=>k.includes('ercent')?`+${v}%`:`+${shortValue(Number(v))}`).join(' ');
const nodeTitle=(effects:Record<string,number>)=>Object.entries(effects).map(([k,v])=>`+${Number(v).toLocaleString()}${k.includes('ercent')?'%':''} ${BUCKET[k]||k}`).join(', ');

/** One ladder, drawn as the original draws it: a rail of cards anchored on where the familiar is now. */
function Rail({nodes,progress,active,kind,onSelect,selected}:any){
 return <ol className="node-rail" aria-label={kind==='level'?'Level milestones':'Star milestones'}>
  {nodes.map((n:any)=>{
   const reached=nodeUnlocked(progress,n),on=active.includes(n.id);
   return <li key={n.id}>
    <button className={'node-card'+(reached?' reached':' locked')+(on?' active':'')+(selected===n.id?' chosen':'')}
     aria-pressed={selected===n.id} title={nodeTitle(n.effects)}
     onClick={()=>onSelect(n.id)}>
     <b>{reached?nodeValue(n.effects):kind==='level'?`lv.${n.threshold}`:`${n.threshold}★`}</b>
     {!reached&&<i aria-hidden="true">&#128274;</i>}
     {on&&<em aria-label="Activated">&#10003;</em>}
    </button>
   </li>})}
 </ol>;
}

/** The cumulative capsule: one pill per bucket this ladder has actually paid out. */
function Earned({nodes,active}:any){
 const total:Record<string,number>={};
 for(const n of nodes)if(active.includes(n.id))for(const [k,v] of Object.entries(n.effects))total[k]=(total[k]||0)+Number(v);
 const pills=Object.entries(total).filter(([,v])=>v);
 if(!pills.length)return null;
 return <p className="node-earned">{pills.map(([k,v])=>
  <span key={k}>{k.includes('ercent')?`+${Math.round(v*100)/100}%`:`+${Number(v).toLocaleString()}`} {BUCKET[k]||k}</span>)}</p>;
}

export default function FamiliarGrowth({game,id,action,locked,supplies,tab}:any){
 const [selected,setSelected]=useState('');
 const progress=game.familiars?.[id];
 const all=familiarNodes(id),active=game.familiarNodes?.[id]||[];
 const nodes=all.filter((n:any)=>n.kind===(tab==='awaken'?'star':'level'));
 const ready=nodes.filter((n:any)=>nodeUnlocked(progress,n)&&!active.includes(n.id));
 if(!progress)return null;
 const cap=familiarCap(id),atCap=progress.level>=cap;
 const next=atCap?null:trainingCost(progress.level,progress.level+1);
 const star=starCost(progress.stars);
 const short=(need:number,have:number)=>need>have;
 return <section className={'familiar-growth '+tab} aria-label={tab==='awaken'?'Awaken':'Level Up'}>
  <Earned nodes={nodes} active={active}/>
  {!!ready.length&&<Button className="quick-activate" variant="outline" disabled={locked} onClick={()=>action('activateFamiliarNodes',id)}>Quick Activate &middot; {ready.length}</Button>}
  <Rail nodes={nodes} progress={progress} active={active} kind={tab==='awaken'?'star':'level'} selected={selected} onSelect={setSelected}/>
  {!!selected&&ready.some((n:any)=>n.id===selected)&&
   <Button className="node-activate" disabled={locked} onClick={()=>{action('activateFamiliarNode',id,selected);setSelected('')}}>Activate</Button>}
  {tab==='awaken'
   ?<><p className="stage-plate"><b>{progress.stars}&#9733;</b><span>&#10142;</span><b>{progress.stars+1}&#9733;</b></p>
     <Button className="growth-primary" disabled={locked||star===null||short(star,supplies.classUp)} onClick={()=>action('starFamiliar',id)}>
      <b>Awaken</b>{star!==null&&<small className={short(star,supplies.classUp)?'short':''}>{supplies.classUp.toLocaleString()}/{star.toLocaleString()}</small>}</Button></>
   :<><p className="stage-plate"><b>lv.{progress.level}</b><span>/</span><b>{cap}</b><em>Stage {familiarStage(progress.level)}</em></p>
     <div className="business-actions">
      <Button className="growth-primary" disabled={locked||!next||short(next.levelUp,supplies.levelUp)||short(next.classUp,supplies.classUp)} onClick={()=>action('trainFamiliar',id,1)}>
       <b>{atCap?'Advance':'Level Up'}</b>{next&&<small className={short(next.levelUp,supplies.levelUp)?'short':''}>{supplies.levelUp.toLocaleString()}/{next.levelUp.toLocaleString()}</small>}</Button>
      <Button variant="outline" disabled={locked||!next||short(next.levelUp,supplies.levelUp)} onClick={()=>action('trainFamiliar',id,10)}>&times;10</Button>
     </div></>}
 </section>;
}
