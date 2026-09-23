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
export default function CharacterScreen({person,collection,children,subtitle,stats=[],statBlock,primary,rail,info,infoOnly,heading,preview,onPrevious,onNext}: {person:any,collection:ReactNode,children:ReactNode,subtitle?:string,stats?:{label:string,value:string|number}[],statBlock?:ReactNode,primary?:ReactNode,rail?:ReactNode,info?:ReactNode,infoOnly?:boolean,heading?:string,preview?:boolean,onPrevious?:()=>void,onNext?:()=>void}) {
 const [hidden,setHidden]=useState(false),[infoOpen,setInfo]=useState(false);
 const tag=subtitle&&subtitle!==person.title?subtitle:null;
 // `preview` is the not-yet-joined screen (docs/family-screen-specs/13-locked-member.md): the art
 // goes greyscale, which does the work of six "welcome this member to..." sentences, and Hide/Info
 // give up the rail -- there is nothing to hide and the Info table is on the screen itself.
 return <section className={'character-screen'+(hidden?' character-hidden':'')+(heading?' character-titled':'')+(preview?' character-preview':'')} aria-label={person.name+' character screen'}>
  <div className="character-screen-art"><CharacterShowcase key={person.id+'-'+(person.costumeId||'base')} person={person}/></div>
  {/* The Family surface's header reads `Family Training`, not the member's name (spec 02). */}
  {heading&&<div className="character-screen-title">{heading}</div>}
  <header className="character-screen-heading"><div className="character-nameplate"><small>{person.title}</small><h2>{person.name}</h2></div></header>
  {(person.rarity||person.type)&&<div className="character-rarity"><strong>{rarityIcon(person.rarity)?<img src={rarityIcon(person.rarity)!} alt={person.rarity}/>:person.rarity}</strong>{person.type&&<span>{countryIcon(person.type)?<img src={countryIcon(person.type)!} alt={person.type}/>:person.type}</span>}</div>}
  <aside className="character-side-actions" aria-label="Character view">{preview?null:<><Button variant="outline" onClick={()=>setHidden(v=>!v)} aria-pressed={hidden} aria-label={hidden?'Show interface':'Hide interface'}>{hidden?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}<span>{hidden?'Show':'Hide'}</span></Button><Button className="character-info-toggle" variant="outline" onClick={()=>setInfo(true)} aria-label={'About '+person.name}><Info aria-hidden="true"/><span>Info</span></Button></>}{rail}</aside>
  {onPrevious&&<Button className="character-arrow character-previous" variant="ghost" aria-label="Previous character" onClick={onPrevious}>‹</Button>}{onNext&&<Button className="character-arrow character-next" variant="ghost" aria-label="Next character" onClick={onNext}>›</Button>}
  <div className="character-lower-stats">{tag&&<small className="character-tag">{tag}</small>}<div className="character-lower-row">{statBlock||(stats.length>0&&<div className="character-stat-row">{stats.map(stat=><div key={stat.label} className="character-stat">{STAT_ICON[stat.label]&&<img src={'./assets/'+STAT_ICON[stat.label]} alt=""/>}<span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>)}{primary&&<div className="character-primary">{primary}</div>}</div></div>
  <div className="character-screen-controls"><div className="character-back">{collection}</div>{children}</div>
  {/* `infoOnly` is the Family sheet (spec 02): titled `Info`, a bordered Name/Title/Race/Bio table and
      nothing else. The Fellow sheet keeps its name heading and loose paragraphs. */}
  <Dialog open={infoOpen} onOpenChange={setInfo}><DialogContent className="save-dialog"><DialogTitle>{infoOnly?'Info':person.name}</DialogTitle><DialogDescription className={infoOnly?'sr-only':undefined}>{person.title}</DialogDescription>{infoOnly?info:<><p>{person.description||'No biography was recovered for this character.'}</p>{info||stats.map(stat=><p key={stat.label}>{stat.label}: {stat.value}</p>)}</>}</DialogContent></Dialog>
 </section>;
}
