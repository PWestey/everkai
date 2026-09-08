import {useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import CharacterShowcase from './character-showcase';

/** Fixed scene, source-inspired identity chrome, and independent action sheets. */
export default function CharacterScreen({person,collection,children,subtitle,stats=[],onPrevious,onNext}: {person:any,collection:ReactNode,children:ReactNode,subtitle?:string,stats?:{label:string,value:string|number}[],onPrevious?:()=>void,onNext?:()=>void}) {
 const [hidden,setHidden]=useState(false),[info,setInfo]=useState(false);
 return <section className={'character-screen'+(hidden?' character-hidden':'')} aria-label={person.name+' character screen'}>
  <div className="character-screen-art"><CharacterShowcase key={person.id+'-'+(person.costumeId||'base')} person={person}/></div>
  <header className="character-screen-heading"><div className="character-nameplate"><small>{person.title}</small><h2>{person.name}</h2></div><div className="character-collection-control">{collection}</div></header>
  {(person.rarity||person.type)&&<div className="character-rarity"><strong>{person.rarity}</strong><span>{person.type}</span></div>}
  <aside className="character-side-actions" aria-label="Character view"><Button variant="outline" onClick={()=>setHidden(v=>!v)} aria-pressed={hidden}>{hidden?'Show':'Hide'}</Button><Button className="character-info-toggle" variant="outline" onClick={()=>setInfo(true)}>Info</Button></aside>
  {onPrevious&&<Button className="character-arrow character-previous" variant="ghost" aria-label="Previous character" onClick={onPrevious}>‹</Button>}{onNext&&<Button className="character-arrow character-next" variant="ghost" aria-label="Next character" onClick={onNext}>›</Button>}
  <div className="character-lower-stats"><small>{subtitle}</small>{stats.map(stat=><div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
  <div className="character-screen-controls">{children}</div>
  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="save-dialog"><DialogTitle>{person.name}</DialogTitle><DialogDescription>{person.title}</DialogDescription><p>{person.description||'No biography was recovered for this character.'}</p>{stats.map(stat=><p key={stat.label}>{stat.label}: {stat.value}</p>)}</DialogContent></Dialog>
 </section>;
}
