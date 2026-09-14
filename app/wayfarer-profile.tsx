import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {OPENING_STAGES,openingPower,rankCost,MAX_RANK} from '@/lib/opening.mjs';

/** The player's own character. Opened from the level badge in the resource bar; the level is the
 *  player rank from the original's ladder (lib/opening.mjs), promoted with Fame and the income requirement of each rank. */
export default function WayfarerProfile({game,open,onOpenChange}:{game:any,open:boolean,onOpenChange:(open:boolean)=>void}){
 const rank=game.opening?.rank||1,cleared=game.opening?.cleared||0,cost=rankCost(rank),fame=game.opening?.fame||0;
 const facts:[string,string][]=[['Fellows',Object.keys(game.fellows||{}).length.toLocaleString()],['Family',Object.keys(game.family||{}).length.toLocaleString()],['Power',new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(openingPower(game))],['Stages',`${cleared}/${OPENING_STAGES.length}`]];
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="wayfarer-profile">
  <img className="wayfarer-art" src="./assets/wayfarer/wayfarer.jpg" alt="The Wayfarer, standing in the village"/>
  <div className="wayfarer-card">
   <DialogTitle>The Wayfarer</DialogTitle>
   <DialogDescription>Level {rank}</DialogDescription>
   {rank<MAX_RANK?<div className="bond-progress"><span>Fame</span><progress value={Math.min(fame,cost)} max={cost} aria-label="Fame toward the next player rank"/><b>{fame.toLocaleString()}/{cost.toLocaleString()}</b></div>:<p className="wayfarer-max">Highest rank reached</p>}
   <dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </div>
 </DialogContent></Dialog>;
}
