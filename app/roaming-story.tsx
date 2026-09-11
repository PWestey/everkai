import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {sceneText} from '@/lib/scenes.mjs';
const meeting=(s:any)=>s.step==='After'?'After joining':'Meeting '+s.step;
/** Reads a roaming member's encounter stories line by line, reusing the village story reader layout. */
export default function RoamingStory({scenes,start=0,person,location,onClose}:any){
 const [pick,setPick]=useState(Math.max(0,Math.min(start,scenes.length-1))),[line,setLine]=useState(0);
 const scene=scenes[pick],l=scene?.lines[Math.min(line,scene.lines.length-1)],last=!!scene&&line>=scene.lines.length-1;
 return <Dialog open onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="stage-detail-sheet roam-story"><DialogTitle>{person?.name}{location?` · ${location}`:''}</DialogTitle><DialogDescription>{scene?`${meeting(scene)} · line ${line+1}/${scene.lines.length}`:'No story yet'}</DialogDescription>
  {scenes.length>1&&<label className="roam-story-pick">Story <select value={pick} onChange={e=>{setPick(Number(e.target.value));setLine(0)}}>{scenes.map((s:any,i:number)=><option key={s.id} value={i}>{meeting(s)}</option>)}</select></label>}
  {scene&&<section className="story-reader story-with-art" aria-label="Roaming encounter"><div className="story-stage"><img src={'./assets/'+person?.art} alt={person?.name}/></div><div className="story-caption" aria-live="polite" aria-atomic="true">{l.speaker&&<strong>{sceneText(l.speaker)}</strong>}<p>{sceneText(l.text)}</p></div><nav className="story-controls" aria-label="Story controls"><Button variant="outline" disabled={line===0} onClick={()=>setLine(line-1)}>Previous line</Button>{last?<Button onClick={onClose}>Finish</Button>:<Button onClick={()=>setLine(line+1)}>Next line</Button>}</nav></section>}
 </DialogContent></Dialog>;
}
