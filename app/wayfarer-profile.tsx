import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {OPENING_COUNT,openingPower,openingProsperity,rankCost,rankEarnings,MAX_RANK} from '@/lib/opening.mjs';
import {totalRate} from '@/lib/game.mjs';

const compact=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
/** Where Fame comes from. Each is a module id page.tsx's openModule understands. */
const FAME_SOURCES:[string,string,string][]=[['adventure','Stages','Stage clears pay Fame'],['roaming','Roaming','Every roam pays Fame'],['habits','Habits','Completed habits pay Fame']];

/** The player's own character. Opened from the level badge in the resource bar; the level is the
 *  player rank from the original's ladder (lib/opening.mjs), promoted with Fame and the income
 *  requirement of each rank. The promotion is the same `openingPromote` action the journey's Rank page
 *  dispatches, with the same two requirements shown, so the badge is somewhere to act and not only a
 *  progress readout. */
export default function WayfarerProfile({game,open,onOpenChange,action,onNavigate,locked=false}:{game:any,open:boolean,onOpenChange:(open:boolean)=>void,action:(kind:string,target?:any,value?:any)=>boolean,onNavigate:(id:string)=>void,locked?:boolean}){
 const o=game.opening,rank=o?.rank||1,cleared=o?.cleared||0,cost=rankCost(rank),fame=o?.fame||0;
 // The engine checks openingProsperity(state, totalRate(state)) against rankEarnings(rank); read the same pair.
 const earnings=openingProsperity(game,totalRate(game)),need=rankEarnings(rank);
 const top=rank>=MAX_RANK,fameShort=!top&&fame<cost,earningsShort=!top&&earnings<need;
 const facts:[string,string][]=[['Fellows',Object.keys(game.fellows||{}).length.toLocaleString()],['Family',Object.keys(game.family||{}).length.toLocaleString()],['Power',compact(openingPower(game))],['Stages',`${cleared}/${OPENING_COUNT}`]];
 const go=(id:string)=>{onOpenChange(false);onNavigate(id)};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="wayfarer-profile">
  <img className="wayfarer-art" src="./assets/wayfarer/wayfarer.jpg" alt="The Wayfarer, standing in the village"/>
  <div className="wayfarer-card">
   <DialogTitle>The Wayfarer</DialogTitle>
   <DialogDescription>Level {rank}</DialogDescription>
   {top?<p className="wayfarer-max">Highest rank reached</p>:<>
    <div className="bond-progress"><span>Fame</span><progress value={Math.min(fame,cost)} max={cost} aria-label="Fame toward the next player rank"/><b>{fame.toLocaleString()}/{cost.toLocaleString()}</b></div>
    <div className="bond-progress"><span>Earnings</span><progress value={Math.min(earnings,need)} max={need} aria-label="Village earnings toward the next player rank"/><b>{compact(earnings)}/{compact(need)}/s</b></div>
    {o?<Button className="wayfarer-promote" disabled={locked||fameShort||earningsShort} onClick={()=>action('openingPromote')}>Promote to level {rank+1}</Button>
     :<Button className="wayfarer-promote" disabled={locked} onClick={()=>action('openingStart')}>Begin your journey</Button>}
    <p className="wayfarer-hint" role="status">{!o?'Promotion opens once your journey begins.':fameShort&&earningsShort?`Needs ${(cost-fame).toLocaleString()} more Fame and ${compact(need-earnings)}/s more village earnings.`:fameShort?`Needs ${(cost-fame).toLocaleString()} more Fame.`:earningsShort?`Needs ${compact(need-earnings)}/s more village earnings — grow your businesses.`:'Ready to promote.'}</p>
   </>}
   <dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
   {!top&&<nav className="wayfarer-sources" aria-label="Earn Fame">{FAME_SOURCES.map(([id,label,hint])=><Button key={id} variant="outline" aria-label={hint} onClick={()=>go(id)}>{label}</Button>)}{earningsShort&&<Button variant="outline" aria-label="Grow village earnings" onClick={()=>go('businesses')}>Businesses</Button>}</nav>}
  </div>
 </DialogContent></Dialog>;
}
