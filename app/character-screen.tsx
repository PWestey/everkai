import type {ReactNode} from 'react';
import CharacterShowcase from './character-showcase';

/** A fixed scene with separate, focused action sheets. Gameplay stays in its existing panels. */
export default function CharacterScreen({person,collection,children,subtitle}: {person:any,collection:ReactNode,children:ReactNode,subtitle?:string}) {
 return <section className="character-screen" aria-label={person.name+' character screen'}>
  <div className="character-screen-art"><CharacterShowcase key={person.id+'-'+(person.costumeId||'base')} person={person}/></div>
  <header className="character-screen-heading"><div><small>{subtitle||person.title}</small><h2>{person.name}</h2></div>{collection}</header>
  <div className="character-screen-controls">{children}</div>
 </section>;
}
