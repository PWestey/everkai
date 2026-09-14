import {rarityIcon,countryIcon} from '@/lib/ui-sprites.mjs';
import {useState,type ReactNode} from 'react';
import {Eye,EyeOff,Info} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import CharacterShowcase from './character-showcase';

/** The original leads each stat with an icon: a heart for Intimacy, the strength emblem for power. */
const STAT_ICON:Record<string,string>={Intimacy:'ui-original/Icons--Icon_Intimacy_1.png','Blessing Power':'ui-original/Icons--Icon_EmblemStrength_1.png',Power:'ui-original/Icons--Icon_EmblemStrength_1.png',Level:'menu/level.png'};

/** Full-bleed art laid out like the original: a name ribbon above the head, an icon rail on the
 *  right, one compact stat row, and a single-row action dock. The ribbon can sit above the head
 *  only because the character modal no longer spends that space on the objective bar. */
export default function CharacterScreen({person,collection,children,subtitle,stats=[],onPrevious,onNext}: {person:any,collection:ReactNode,children:ReactNode,subtitle?:string,stats?:{label:string,value:string|number}[],onPrevious?:()=>void,onNext?:()=>void}) {
 const [hidden,setHidden]=useState(false),[info,setInfo]=useState(false);
 const tag=subtitle&&subtitle!==person.title?subtitle:null;
 return <section className={'character-screen'+(hidden?' character-hidden':'')} aria-label={person.name+' character screen'}>
  <div className="character-screen-art"><CharacterShowcase key={person.id+'-'+(person.costumeId||'base')} person={person}/></div>
  <header className="character-screen-heading"><div className="character-nameplate"><small>{person.title}</small><h2>{person.name}</h2></div></header>
  {(person.rarity||person.type)&&<div className="character-rarity"><strong>{rarityIcon(person.rarity)?<img src={rarityIcon(person.rarity)!} alt={person.rarity}/>:person.rarity}</strong>{person.type&&<span>{countryIcon(person.type)?<img src={countryIcon(person.type)!} alt={person.type}/>:person.type}</span>}</div>}
  <aside className="character-side-actions" aria-label="Character view"><Button variant="outline" onClick={()=>setHidden(v=>!v)} aria-pressed={hidden} aria-label={hidden?'Show interface':'Hide interface'}>{hidden?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}<span>{hidden?'Show':'Hide'}</span></Button><Button className="character-info-toggle" variant="outline" onClick={()=>setInfo(true)} aria-label={'About '+person.name}><Info aria-hidden="true"/><span>Info</span></Button></aside>
  {onPrevious&&<Button className="character-arrow character-previous" variant="ghost" aria-label="Previous character" onClick={onPrevious}>‹</Button>}{onNext&&<Button className="character-arrow character-next" variant="ghost" aria-label="Next character" onClick={onNext}>›</Button>}
  <div className="character-lower-stats">{tag&&<small className="character-tag">{tag}</small>}{stats.length>0&&<div className="character-stat-row">{stats.map(stat=><div key={stat.label} className="character-stat">{STAT_ICON[stat.label]&&<img src={'./assets/'+STAT_ICON[stat.label]} alt=""/>}<span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>}</div>
  <div className="character-screen-controls"><div className="character-back">{collection}</div>{children}</div>
  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="save-dialog"><DialogTitle>{person.name}</DialogTitle><DialogDescription>{person.title}</DialogDescription><p>{person.description||'No biography was recovered for this character.'}</p>{stats.map(stat=><p key={stat.label}>{stat.label}: {stat.value}</p>)}</DialogContent></Dialog>
 </section>;
}
