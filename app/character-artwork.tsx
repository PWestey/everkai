import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {Button} from '@/components/ui/button';
import FamilyArtStage from './family-art-stage';
import clips from '@/lib/character-idle-data.json';
import {spineModel,spinePilotEnabled} from '@/lib/spine-pilot.mjs';
import {useArtFraming} from './art-framing';
const SpineCharacter=lazy(()=>import('./spine-character'));
export function characterClip(person:any){const clip=(clips as Record<string,any>)[person.costumeId||person.id];return clip?.owner===person.id&&(clip.costumeId||null)===(person.costumeId||null)?clip:null}
const reducedMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
export default function CharacterArtwork({person,large=false,suspended=false}:any){
 const clip=characterClip(person),video=useRef<HTMLVideoElement>(null),still=useRef<HTMLImageElement>(null),resumeAfterCover=useRef(false),[failed,setFailed]=useState(false),[playing,setPlaying]=useState(false);
 // Live Spine pilot (?spine=1, packaged models only). Any failure drops to the idle clip below.
 const spine=spinePilotEnabled()?spineModel(person):null,[spineFailed,setSpineFailed]=useState(false),[spinePlaying,setSpinePlaying]=useState(()=>!reducedMotion());
 const live=!!spine&&!spineFailed;
 useArtFraming(video,clip&&!failed&&!live?clip.src:undefined,!!person.costumeId);useArtFraming(still,(!clip||failed)&&!live?person.art:undefined,!!person.costumeId);
 useEffect(()=>{
  const el=video.current;if(!el||!clip||failed)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const pause=()=>{el.pause();setPlaying(false)};
  const play=()=>{if(!media.matches&&!document.hidden)el.play().catch(()=>setPlaying(false))};
  const preference=()=>{if(media.matches)pause();else play()};
  const visible=()=>{if(document.hidden)pause()};
  media.addEventListener('change',preference);document.addEventListener('visibilitychange',visible);play();
  return ()=>{media.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visible);el.pause()};
 },[clip,failed,live]);
 useEffect(()=>{
  const el=video.current;if(!el)return;
  if(suspended){resumeAfterCover.current=!el.paused;el.pause();}
  else if(resumeAfterCover.current){resumeAfterCover.current=false;if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)el.play().catch(()=>setPlaying(false));}
 },[suspended]);
 useEffect(()=>{if(!live)return;const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setSpinePlaying(!media.matches);media.addEventListener('change',change);return ()=>media.removeEventListener('change',change)},[live]);
 if(live)return <div className={'character-idle character-spine-stage spine-'+spine.framing+(spine.background?' spine-scene':' spine-plain')} data-model={spine.model}>
  <img className="character-art-backdrop" src={'./assets/'+person.art} alt="" aria-hidden="true"/>
  {spine.background&&<img className="character-spine-background" src={'./assets/'+spine.base+spine.background.file} alt="" aria-hidden="true"/>}
  <Suspense fallback={null}><SpineCharacter row={spine} label={person.name+' original Idle animation'} running={spinePlaying&&!suspended} onError={()=>setSpineFailed(true)}/></Suspense>
  <Button className="idle-control" variant="outline" aria-label={spinePlaying?'Pause animation':'Play animation'} onClick={()=>setSpinePlaying(p=>!p)}>{spinePlaying?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}<span>{spinePlaying?'Pause':'Play'}</span></Button>
 </div>;
 if(!clip||failed)return person.id.startsWith('wife_')?<FamilyArtStage person={person} large={large}/>:<img ref={still} src={'./assets/'+person.art} alt={person.name+' full character art'}/>;
 return <div className="character-idle" data-model={clip.id}><img className="character-art-backdrop" src={'./assets/'+person.art} alt="" aria-hidden="true"/><video ref={video} src={'./assets/'+clip.src} poster={'./assets/'+person.art} muted loop playsInline preload="auto" aria-label={person.name+' rendered Idle animation'} onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}/><Button className="idle-control" variant="outline" aria-label={playing?'Pause animation':'Play animation'} onClick={()=>{const el=video.current;if(!el)return;if(el.paused)el.play().catch(()=>setPlaying(false));else el.pause()}}>{playing?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}<span>{playing?'Pause':'Play'}</span></Button></div>;
}
