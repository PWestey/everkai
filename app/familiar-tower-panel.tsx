import {useState,useRef,useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {criticalBase} from '@/lib/familiar-crit-combat.mjs';
import {BASIC_HEAL,basicHealActive} from '@/lib/familiar-trigger-combat.mjs';
import {statPassive} from '@/lib/familiar-passives.mjs';
import {familiarStage,FAMILIARS,familiarById} from '@/lib/familiars.mjs';
import {cardStyle,cardRarity,rarityIcon,petCardIcon} from '@/lib/ui-sprites.mjs';
import {towerState,towerKey,originalBattle,floorEnemies,towerFloor,towerSkill,teamBond,teamAttribute,groupOf,floorPrepaid,floorRewardItems,quickDeployTeam,
 endlessState,endlessKey,endlessEnemies,endlessBattle,TOWER_FLOORS,TOWER_AUTO_UNLOCK,TOWER_DATA,ENDLESS_OPEN} from '@/lib/familiar-tower.mjs';
import {familiarSupplies,suppliesWaiting,floorIncome,towerIncome,FAMILIAR_ITEM_NAMES,SUPPLY_HOLD_MS} from '@/lib/familiar-supplies.mjs';
import {earningsMultiplier} from '@/lib/game.mjs';
import {EXPLORE_AREAS} from '@/lib/familiar-explore.mjs';

// FAMILIAR TOWER (docs/familiar-screen-specs/09-tower.md).
//
// D-TOWER-1: THERE WAS NO TOWER. The original's whole screen is a navigable vertical stack of floors,
// each drawing its own state -- a `Completed` watermark, `Recommended` with a reward chest, a
// padlock-and-chain barrier, or the bare `Please stay tuned.` platform past the last floor. The screen
// IS the progress bar. Everkai drew a `<progress>` element and one card for the next floor, which is
// why floor 176 of 300 read as a thin bar rather than as a place you are standing in.
//
// D-TOWER-2: mode switching was two side-by-side buttons, one labelled `Endless - floor 200` when
// locked. The original is one two-segment vertical pill; the gate is stated on the locked floors
// themselves (`PetTowerUnlockDesc2`), not baked into a button label.
//
// 12 (prose to delete): the panel carried ~420 words of running prose plus two text walls against the
// original's ZERO on this screen. Four of the five clauses the `rules-note` flagged as "local" turned
// out to be the original's own published rules, quoted almost verbatim in its `(i)` -- Speed order each
// round, the 15-round limit, higher remaining HP winning, Rage rising on attacking and on being hit.
// The `(i)` below carries the original's wording for those, and the genuinely local residue (Rage fills
// by 25, initial Rage, ties lose, enemy skills) is one short line rather than an essay.
//
// NOT BUILT, deliberately: the battle screen and its result modal (5). `Challenge` advances the
// owner's real floor, so the capture was never taken, and this spec's own rule is not to build against
// a guess. The last result stays as a closed summary. Drag-to-reorder the formation is likewise not
// built: `towerFront` is the only ordering the engine consumes (the first two slots are the front row),
// and a five-slot permutation would need an action and a validator branch of its own.
const GROUP_NAMES=['','Cool','Cute','Playful','Legendary'];
const statusNames:Record<string,string>={attack:'Attack',speed:'Speed',dealt:'Damage dealt',vulnerable:'Damage taken',bleed:'Bleed',poison:'Poison',shield:'Shield',regen:'Regeneration',crit:'Critical chance',critRes:'Critical resistance'};
const short=(n:number)=>n>=1e9?`${(n/1e9).toFixed(2)}B`:n>=1e6?`${(n/1e6).toFixed(3)}M`:n>=1e4?`${(n/1e3).toFixed(1)}K`:n.toLocaleString();
const count=(n:number)=>n>=1e4?`${(n/1e3).toFixed(2)}K`:n.toLocaleString();
/** `Idle Time: HH:MM:SS/24:00:00` -- the original's clock, not a sentence about hours. */
const clock=(ms:number)=>{const s=Math.max(0,Math.floor(ms/1000));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
const unitName=(id:string)=>{const [slot,pet]=id.includes(':')?id.split(':'):[null,id];return (familiarById(pet)?.name||pet)+(slot?' (enemy)':'')};
const itemName=(id:string)=>(FAMILIAR_ITEM_NAMES as any)[id]||id;

const bondLine=(b:any)=>b?`Bond: ${b.count} ${GROUP_NAMES[b.group]} · +${b.ATK/100}% ATK and HP`:'No bond';
/** The next floor whose Income is higher than the current one: the "milestone" the original shows. */
function nextIncomeStep(cleared:number){const now=floorIncome(cleared);for(let f=cleared+1;f<=TOWER_FLOORS;f++){const i=floorIncome(f);if(i.levelUp!==now.levelUp||i.classUp!==now.classUp)return {floor:f,income:i};}return null}
/** Reward item tiles with corner counts, as the ladder and the floor chest draw them. */
const Tiles=({items}:{items:any[]})=><ul className="reward-tiles">{items.map(([id,n])=>
 <li key={id}><span>{itemName(id)}</span><b>{count(n)}</b></li>)}</ul>;

/** One platform in the stack. The plaque is clipped to the left edge; the state is drawn ON the floor. */
function Platform({floor,state,boss,marker,chest,onChest,now}:any){
 return <li className={'tower-platform '+state} ref={now}>
  <span className="floor-plaque">&#9670; Floor {floor} &#9670;</span>
  {state==='done'&&<em className="floor-mark">Completed</em>}
  {state==='now'&&<><em className="floor-mark recommended">&#9670; Recommended &#9670;</em>
   {chest&&<button className="floor-chest" onClick={onChest}>{chest}</button>}</>}
  {state==='locked'&&<em className="floor-chain" aria-label="Locked">&#128274;</em>}
  {boss&&<b className="floor-boss">Boss</b>}
  {marker&&<b className="floor-milestone">{marker}</b>}
 </li>;
}

export default function FamiliarTowerPanel({game,action,locked}:any){
 const t=towerState(game),e=endlessState(game),owned=FAMILIARS.filter(p=>game.familiars?.[p.id]);
 const [endlessMode,setEndlessMode]=useState(false),[team,setTeam]=useState(false),[bond,setBond]=useState(false);
 const [earnings,setEarnings]=useState(false),[ladder,setLadder]=useState(false),[chest,setChest]=useState(false),[info,setInfo]=useState(false);
 const [group,setGroup]=useState(0),[chosen,setChosen]=useState('');
 const REDO_KEY='everkai-tower-redo-read';
 const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(REDO_KEY)==='1'}catch{return false}});
 const dismiss=()=>{try{localStorage.setItem(REDO_KEY,'1')}catch{}setDismissed(true)};
 // D-TOWER-10: the original coaches before a fight rather than disabling the button in silence.
 const [coach,setCoach]=useState<string|null>(null);
 const endlessOpen=t.cleared>=ENDLESS_OPEN,mode=endlessMode&&endlessOpen?'endless':'challenge';
 const cleared=mode==='endless'?e.cleared:t.cleared,floor=cleared+1,ceiling=mode==='endless'?Infinity:TOWER_FLOORS;
 const data=mode==='challenge'&&floor<=TOWER_FLOORS?towerFloor(floor):null;
 const enemies=mode==='endless'?(endlessOpen?endlessEnemies(floor):[]):data?floorEnemies(floor):[];
 const attribute=teamAttribute(game,t.party),ownBond=teamBond(t.party);
 const last=mode==='endless'?(e.last&&endlessBattle(e.last.floor,e.last.team)):(t.last&&originalBattle(t.last.floor,t.last.team,t.last.combatVersion));
 const lastRec=mode==='endless'?e.last:t.last;
 const income=towerIncome(game),waiting=suppliesWaiting(game,Date.now()),supplies=familiarSupplies(game);
 const idle=supplies.since===null?0:Math.min(Date.now()-supplies.since,SUPPLY_HOLD_MS),bonusBP=Math.round((earningsMultiplier(game,game.lastAt)-1)*1000);
 const id=chosen||t.party[0]||owned[0]?.id,passive=statPassive(id);
 const passiveActive=!!(passive&&game.familiars?.[id]&&familiarStage(game.familiars[id].level)>=passive.stage);
 // The stack is anchored on the CURRENT floor, with cleared floors falling away below it and unbuilt
 // ones stacked above -- so scrolling up is how you preview, exactly as the original reads.
 const top=Math.min(ceiling+1,cleared+15),bottom=Math.max(1,cleared-15),stack=[];
 for(let f=top;f>=bottom;f--)stack.push(f);
 const stackRef=useRef<HTMLOListElement>(null),nowRef=useRef<HTMLLIElement>(null);
 useEffect(()=>{if(stackRef.current&&nowRef.current)stackRef.current.scrollTop=Math.max(0,nowRef.current.offsetTop-nowRef.current.offsetHeight-6)},[mode,cleared]);
 // 300 rows, so the ladder opens where the player actually is rather than at floor 1. A CALLBACK ref,
 // not an effect: the dialog's content mounts in its own portal commit, and an effect keyed on `open`
 // runs while the list is still null.
 const ladderRef=(el:HTMLOListElement|null)=>{if(!el||!el.children.length)return;
  const row=el.children[Math.max(0,t.cleared-2)] as HTMLElement;
  if(row)el.scrollTop=Math.max(0,row.offsetTop-(el.children[0] as HTMLElement).offsetTop)};
 // Only ahead of the player: the stack is where a future floor's payoff is announced (§12).
 const milestone=(f:number)=>{if(mode==='endless'||f<=cleared)return null;
  const area=EXPLORE_AREAS.find((a:any)=>a.unlock===f),pet=towerFloor(f)?.reward?.familiar;
  return pet?`Familiar: ${familiarById(pet)?.name}`:area?`Opens ${area.name}`:null};
 const picker=group?owned.filter(p=>groupOf(p.id)===group):owned;
 const stronger=t.party.length===5&&teamAttribute(game,quickDeployTeam(game))>attribute;
 const redo=t.redoFrom!==undefined&&t.cleared<t.redoFrom&&!dismissed;
 return <section className="familiar-tower" aria-label="Familiar tower">
  <header className="tower-head"><h4 className="bond-ribbon">Familiar Tower</h4>
   <button className="instruction-link" aria-expanded={info} onClick={()=>setInfo(v=>!v)}>&#9432;</button></header>
  {info&&<div className="instruction-popover" role="note">
   <p><b>Combat Rule.</b> Transcender can form a team with 1 to 5 familiars to engage in the combat. At the start of each round, the action order is determined by the Speed of familiars. Each familiar begins combat with initial Rage. Basic attack and receiving damage increase Rage. When Rage is full, the Familiar will release active skill on their next move. Combat ends when all Familiars on either side are defeated, or after 15 rounds &mdash; the side with higher HP wins.</p>
   <p><b>Earnings.</b> After clearing certain floors of any mode in the Familiar Tower, the efficiency of earnings will be improved. Earnings accumulate over time. There is a time limit for storing accumulated earnings.</p>
   <p className="local-note">Everkai&rsquo;s own: Rage fills by 25, every unit starts at 0, and a tie on remaining HP is a loss.</p></div>}
  {redo&&<p className="tower-redo">Your village had reached floor {t.redoFrom}, so you climb again from floor 1 and earn every reward on the way.
   <button onClick={dismiss}>Dismiss</button></p>}

  <div className="tower-stage">
   <ol className="floor-stack" ref={stackRef} aria-label={`Floors, ${cleared} cleared`}>{stack.map(f=>{
    const state=f>ceiling?'tuned':f<=cleared?'done':f===floor?(mode==='endless'&&!endlessOpen?'locked':'now'):'locked';
    if(state==='tuned')return <li key={f} className="tower-platform tuned"><em className="floor-mark">Please stay tuned.</em></li>;
    return <Platform key={f} floor={f} state={state} boss={mode==='challenge'&&towerFloor(f)?.boss} marker={milestone(f)}
     chest={mode==='challenge'?'Rewards':'Guardians'} onChest={()=>setChest(true)} now={state==='now'?nowRef:undefined}/>})}</ol>
   <aside className="tower-rail">
    {mode==='challenge'&&<button className="reward-badge" onClick={()=>setLadder(true)}>
     <strong>Rewards</strong><span>All Claimed</span>{t.cleared<TOWER_FLOORS&&<em>{TOWER_FLOORS-t.cleared} floors left</em>}</button>}
    <div className="mode-pill" role="group" aria-label="Tower mode">
     <button className={mode==='challenge'?'lit':''} aria-pressed={mode==='challenge'} onClick={()=>setEndlessMode(false)}>Challenge</button>
     <button className={mode==='endless'?'lit':''} aria-pressed={mode==='endless'} disabled={!endlessOpen} onClick={()=>setEndlessMode(true)}
      title={endlessOpen?undefined:`Unlocks after completing Challenge Mode Floor ${ENDLESS_OPEN}`}>Endless{!endlessOpen&&<em className="gate-badge">&#128274;{ENDLESS_OPEN}</em>}</button>
    </div>
    <Button variant="outline" className="tower-auto" disabled={locked||!t.party.length||t.cleared<TOWER_AUTO_UNLOCK}
     onClick={()=>action(mode==='endless'?'endlessAuto':'towerAuto',mode==='endless'?endlessKey(game):towerKey(game))}>
     Auto{t.cleared<TOWER_AUTO_UNLOCK&&<em className="gate-badge">&#128274;{TOWER_AUTO_UNLOCK}</em>}</Button>
   </aside>
  </div>

  <p className="attribute-banner">Current Attribute <b>&#9673; {short(attribute)}</b></p>
  <div className="tower-wing">
   <button className="wing-tile" onClick={()=>setTeam(true)}><span>Team</span><em>{t.party.length}/5</em></button>
   <Button className="tower-challenge" disabled={locked||(mode==='endless'&&!endlessOpen)||(mode==='challenge'&&t.cleared>=TOWER_FLOORS)}
    onClick={()=>{if(!t.party.length)return setCoach('Please set the team first.');
     if(t.party.length<5&&owned.length>t.party.length)return setCoach('Familiars available for the team. Go to team setup?');
     if(stronger)return setCoach('There are stronger familiars not in the team. Go to team setup?');
     action(mode==='endless'?'endlessFight':'towerFight',mode==='endless'?endlessKey(game):towerKey(game))}}>
    {mode==='challenge'&&t.cleared>=TOWER_FLOORS?'All floors cleared':'Challenge'}</Button>
   <button className="wing-tile" onClick={()=>setEarnings(true)}><span>Earnings</span>{!!(waiting.levelUp||waiting.classUp)&&<i className="red-dot" aria-label="Rewards waiting"/>}</button>
  </div>
  {mode==='endless'&&<p className="endless-record">&#9733; Endless Record: floor {e.cleared}</p>}
  {!owned.length&&<p className="tower-hint">Contract a familiar first: choose a starter on the Familiars page.</p>}
  {lastRec&&last&&<details className={'tower-result '+(last.won?'won':'lost')}>
   <summary>Floor {lastRec.floor} &middot; {last.won?'Victory':'Defeat'} &middot; {last.rounds} rounds</summary>
   <p>Remaining health: your team {last.playerHP.toLocaleString()} &middot; enemies {last.enemyHP.toLocaleString()}</p>
   <details><summary>Battle record</summary><ol>{last.log.map((hit:any,i:number)=><li key={i}>Round {hit.round}: {unitName(hit.attacker)} &rarr; {unitName(hit.target)} &middot; {hit.critical?'Critical · ':''}{hit.name||(hit.skill?'Rage strike':'Attack')} &middot; {hit.kind==='status'?`${statusNames[hit.status]||hit.status} ${['crit','critRes'].includes(hit.status)?hit.value/100:hit.value}${['vulnerable','attack','speed','dealt','crit','critRes'].includes(hit.status)?'%':''} · ${hit.turns} turns`:`${['heal','regen'].includes(hit.kind)?'healed':'damage'} ${hit.damage}${hit.absorbed?` · shield absorbed ${hit.absorbed}`:''}`}</li>)}</ol></details></details>}

  <Dialog open={!!coach} onOpenChange={()=>setCoach(null)}><DialogContent className="save-dialog tower-coach">
   <DialogTitle>Challenge</DialogTitle><DialogDescription>{coach}</DialogDescription>
   <div className="business-actions">
    <Button disabled={locked||!t.party.length} onClick={()=>{setCoach(null);action(mode==='endless'?'endlessFight':'towerFight',mode==='endless'?endlessKey(game):towerKey(game))}}>Continue</Button>
    <Button variant="outline" onClick={()=>{setCoach(null);setTeam(true)}}>Adjust Team</Button></div>
  </DialogContent></Dialog>

  {/* TEAM -- the formation, the Attribute banner it shares with this screen, and a 4-wide picker. */}
  <Dialog open={team} onOpenChange={setTeam}><DialogContent className="save-dialog tower-team">
   <DialogTitle>Team</DialogTitle>
   <DialogDescription>Tap a deployed familiar to move it to the front row.</DialogDescription>
   <ol className="formation" aria-label={`Formation ${t.party.length} of 5`}>{[0,1,2,3,4].map(i=>{
    const pid=t.party[i],pet=pid?familiarById(pid):null;
    return <li key={i} className={i<2?'front':'back'}>{pet?
     <button className="framed-card" style={cardStyle(pet.rarity) as any} disabled={locked||i===0} onClick={()=>action('towerFront',pid)}>
      <span>{rarityIcon(cardRarity(pet.rarity))&&<img src={rarityIcon(cardRarity(pet.rarity))!} alt=""/>}</span>
      <strong>{pet.name}</strong><small>Lv. {game.familiars[pid].level}</small></button>
     :<div className="tower-empty">&#65291;</div>}</li>})}</ol>
   <p className="attribute-banner">Current Attribute <b>&#9673; {short(attribute)}</b>
    <button className="instruction-link" aria-label="Bond" onClick={()=>setBond(true)}>?</button></p>
   <nav className="group-rail" aria-label="Type">{[0,1,2,3,4].map(g=>
    <button key={g} className={group===g?'current':''} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g?GROUP_NAMES[g]:'ALL'}</button>)}</nav>
   <div className="picker-grid">{picker.map(p=>{const on=t.party.includes(p.id);
    return <button key={p.id} className={'dispatch-card'+(on?' chosen':'')} disabled={locked||(!on&&t.party.length===5)} aria-pressed={on}
     style={cardStyle(p.rarity) as any} onClick={()=>{setChosen(p.id);action('towerParty',p.id)}}>
     <img src={petCardIcon(p.rarity)||''} alt=""/><strong>{p.name}</strong><small>Lv. {game.familiars[p.id].level}</small></button>})}</div>
   <div className="business-actions"><Button disabled={locked||owned.length<2} onClick={()=>action('towerQuickDeploy')}>Quick Deploy</Button>
    <Button variant="outline" onClick={()=>setTeam(false)}>OK</Button></div>
   {id&&<details className="rules-note tower-skill"><summary>Skill &middot; {towerSkill(id)?towerSkill(id)!.name:'Rage strike'}</summary>
    <p>{towerSkill(id)?towerSkill(id)!.text:'Rage strike: double damage at full Rage.'}</p>
    {passive&&<p>{passive.text} &middot; {passiveActive?'Active':'Stage 2, level 50'}.</p>}
    {id===BASIC_HEAL.id&&<p>{BASIC_HEAL.text} &middot; {basicHealActive({id,...game.familiars[id]})?'Active':'Level 150'}.</p>}
    <p>{criticalBase(id).critBP/100}% critical chance &middot; {criticalBase(id).resistanceBP/100}% resistance.</p></details>}
  </DialogContent></Dialog>

  {/* BOND -- `PetFettersTips1..4`: three rungs, and THREE lines per rung. Attribute was the missing one. */}
  <Dialog open={bond} onOpenChange={setBond}><DialogContent className="save-dialog bond-ladder">
   <DialogTitle>Bond</DialogTitle><DialogDescription className="sr-only">Same-type team bonuses</DialogDescription>
   <ul>{[3,4,5].map(n=>{const b:any=(TOWER_DATA as any).bond[n],on=ownBond?.count===n;
    return <li key={n} className={on?'current':''}><p>The team contains {n} familiars of the same type.</p>
     <b>HP: +{b.HP/100}%</b><b>ATK: +{b.ATK/100}%</b><b>Attribute: +{b.POWER/100}%</b></li>})}</ul>
   <p className="item-status">{ownBond?`Active: ${ownBond.count} ${GROUP_NAMES[ownBond.group]}`:'No bond yet — three of one type activates the first rung.'}</p>
  </DialogContent></Dialog>

  {/* EARNINGS -- 7. The rate table, the idle clock against its cap, pending tiles, and the bonus row. */}
  <Dialog open={earnings} onOpenChange={setEarnings}><DialogContent className="save-dialog tower-earnings">
   <DialogTitle>Familiar Tower Earning Rewards</DialogTitle>
   <DialogDescription>The more stages cleared in Challenge Mode and Endless Mode, the higher the earning efficiency.</DialogDescription>
   {t.cleared?<>
    <h5 className="ribbon-rule">Earning Efficiency</h5>
    <ul className="rate-rows"><li><span>{itemName('levelUp')}</span><b>{income.levelUp.toFixed(1)}</b><i>/hour</i></li>
     <li><span>{itemName('classUp')}</span><b>{income.classUp.toFixed(1)}</b><i>/hour</i></li></ul>
    {(()=>{const step=nextIncomeStep(t.cleared);if(!step)return null;
     // Convention 13: `»` is the future tense. Only the rate that actually moves is printed.
     const rows=[[itemName('levelUp'),income.levelUp,step.income.levelUp],[itemName('classUp'),income.classUp,step.income.classUp]].filter(([,a,b])=>a!==b);
     return <p className="item-status">Floor {step.floor}: {rows.map(([n,a,b])=>`${n} ${a} » ${b}`).join(' · ')}</p>})()}
    <h5 className="ribbon-rule">Current Earning Reward</h5>
    <p className="idle-clock">Idle Time: <b>{clock(idle)}</b>/{clock(SUPPLY_HOLD_MS)}</p>
    <Tiles items={[['levelUp',waiting.levelUp],['classUp',waiting.classUp]] as any}/>
    <p className={'earn-bonus'+(bonusBP>0?' on':'')}>Earnings +{(bonusBP/10).toFixed(1)}% {bonusBP>0?'(Activated)':'(Not Activated)'}</p>
    <p className="item-status">In store: {supplies.levelUp.toLocaleString()} &middot; {supplies.classUp.toLocaleString()}</p>
    <Button className="claim-button" disabled={locked||!(waiting.levelUp||waiting.classUp)} onClick={()=>action('collectFamiliarSupplies')}>Claim</Button>
   </>:<p>Earning unlocks after completing Floor 1.</p>}
  </DialogContent></Dialog>

  {/* REWARDS -- 8: built from all 300 PetTower rows, not the capture's decade spacing. */}
  <Dialog open={ladder} onOpenChange={setLadder}><DialogContent className="save-dialog reward-ladder">
   <DialogTitle>Rewards</DialogTitle><DialogDescription className="sr-only">Every floor&rsquo;s first-clear reward</DialogDescription>
   <ol ref={ladderRef}>{TOWER_DATA.floors.map((f:any)=><li key={f.floor} className={f.floor<=t.cleared?'done':''}>
    <span className="floor-tab">Floor {f.floor}</span>
    <Tiles items={floorRewardItems(f.floor)}/>
    {f.reward.familiar&&<em className="reward-pet">{familiarById(f.reward.familiar)?.name}</em>}
    <b>{f.floor<=t.cleared?'Completed':'Not Achieved'}</b></li>)}</ol>
  </DialogContent></Dialog>

  {/* The current floor's chest: its first-clear reward and who is standing on it. The original shows
      `Enemy Attribute` as one number, and only on the battle screen -- which was not captured (5).
      The stored `Power` column is read verbatim; nothing here composes one. */}
  <Dialog open={chest} onOpenChange={setChest}><DialogContent className="save-dialog floor-detail">
   <DialogTitle>Floor {floor}{data?.boss?' · Boss':''}</DialogTitle>
   <DialogDescription>{enemies.length} {enemies.length===1?'guardian':'guardians'}</DialogDescription>
   {data&&<><h5 className="ribbon-rule">First clear</h5>
    {floorPrepaid(t,floor)?<p className="item-status">Already paid before the redo.</p>:<Tiles items={floorRewardItems(floor)}/>}
    {data.reward.familiar&&<p className="item-status">Familiar: {familiarById(data.reward.familiar)?.name}</p>}</>}
   <p className="attribute-banner">Enemy Attribute <b>&#9673; {short(enemies.reduce((n:number,x:any)=>n+(x.power||0),0))}</b></p>
   <ul className="tower-enemies">{enemies.map((x:any)=><li key={x.id}><b>{familiarById(x.pet)?.name||x.pet}</b> Lv. {x.level} &middot; ATK {x.ATK.toLocaleString()} &middot; HP {x.HP.toLocaleString()} &middot; SPD {x.SPD.toLocaleString()}{towerSkill(x.pet)?` · ${towerSkill(x.pet)!.name}`:''}</li>)}</ul>
   <p className="item-status">{bondLine(teamBond(enemies.map((x:any)=>x.pet)))}</p>
  </DialogContent></Dialog>
 </section>;
}
