import CharacterArtwork,{characterClip} from './character-artwork';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export default function CharacterShowcase({person}:any){const [open,setOpen]=useState(false);return <><div className="character-showcase"><CharacterArtwork key={person.id+'-'+(person.costumeId||'base')} person={person} suspended={open}/><Button variant="outline" onClick={()=>setOpen(true)}>View {person.name} artwork</Button></div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="save-dialog character-art-view"><DialogTitle>{person.name}</DialogTitle><DialogDescription>{person.title} · {characterClip(person)?'Rendered original Idle animation':'Static character artwork'}</DialogDescription><CharacterArtwork key={person.id+'-'+(person.costumeId||'base')} person={person} large/></DialogContent></Dialog></>}
