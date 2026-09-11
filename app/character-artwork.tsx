import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import FamilyArtStage from './family-art-stage';
import clips from '@/lib/character-idle-data.json';
export function characterClip(person:any){const clip=(clips as Record<string,any>)[person.costumeId||person.id];return clip?.owner===person.id&&(clip.costumeId||null)===(person.costumeId||null)?clip:null}
export default function CharacterArtwork({person,large=false,suspended=false}:any){
 const clip=characterClip(person),video=useRef<HTMLVideoElement>(null),resumeAfterCover=useRef(false),[failed,setFailed]=useState(false),[playing,setPlaying]=useState(false);
 useEffect(()=>{
  const el=video.current;if(!el||!clip||failed)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const pause=()=>{el.pause();setPlaying(false)};
  const play=()=>{if(!media.matches&&!document.hidden)el.play().catch(()=>setPlaying(false))};
  const preference=()=>{if(media.matches)pause();else play()};
  const visible=()=>{if(document.hidden)pause()};
  media.addEventListener('change',preference);document.addEventListener('visibilitychange',visible);play();
  return ()=>{media.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visible);el.pause()};
 },[clip,failed]);
 useEffect(()=>{
  const el=video.current;if(!el)return;
  if(suspended){resumeAfterCover.current=!el.paused;el.pause();}
  else if(resumeAfterCover.current){resumeAfterCover.current=false;if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)el.play().catch(()=>setPlaying(false));}
 },[suspended]);
 if(!clip||failed)return person.id.startsWith('wife_')?<FamilyArtStage person={person} large={large}/>:<img src={'./assets/'+person.art} alt={person.name+' full character art'}/>;
 return <div className="character-idle" data-model={clip.id}><img className="character-art-backdrop" src={'./assets/'+person.art} alt="" aria-hidden="true"/><video ref={video} src={'./assets/'+clip.src} poster={'./assets/'+person.art} muted loop playsInline preload="auto" aria-label={person.name+' rendered Idle animation'} onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}/><Button className="idle-control" variant="outline" onClick={()=>{const el=video.current;if(!el)return;if(el.paused)el.play().catch(()=>setPlaying(false));else el.pause()}}>{playing?'Pause animation':'Play animation'}</Button></div>;
}
