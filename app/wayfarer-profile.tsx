import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {playerRank,rankXP} from '@/lib/progression.mjs';
import {OPENING_STAGES,openingPower} from '@/lib/opening.mjs';

/** The player's own character. Opened from the level badge in the resource bar; the level is the
 *  milestone rank (100 rank XP a level, lib/progression.mjs), which is the game's player level. */
export default function WayfarerProfile({game,open,onOpenChange}:{game:any,open:boolean,onOpenChange:(open:boolean)=>void}){
 const rank=playerRank(game),xp=rankXP(game)%100,cleared=game.opening?.cleared||0;
 const facts:[string,string][]=[['Fellows',Object.keys(game.fellows||{}).length.toLocaleString()],['Family',Object.keys(game.family||{}).length.toLocaleString()],['Power',new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(openingPower(game))],['Stages',`${cleared}/${OPENING_STAGES.length}`]];
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="wayfarer-profile">
  <img className="wayfarer-art" src="./assets/wayfarer/wayfarer.jpg" alt="The Wayfarer, standing in the village"/>
  <div className="wayfarer-card">
   <DialogTitle>The Wayfarer</DialogTitle>
   <DialogDescription>Level {rank}</DialogDescription>
   <div className="bond-progress"><span>Lv {rank}</span><progress value={xp} max={100} aria-label="Rank experience toward the next level"/><b>{xp}/100</b></div>
   <dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </div>
 </DialogContent></Dialog>;
}
