import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import RosterPicker from './roster-picker';
import OriginalAlbum from './original-album';
export default function CharacterCollection({entries,owned,selected,onSelect,family=false}:any){
 const [open,setOpen]=useState(false),kind=family?'Family':'Fellow',ordered=useMemo(()=>[...entries].sort((a,b)=>Number(!!owned[b.id])-Number(!!owned[a.id])),[entries,owned]);
 const choose=(id:string)=>{onSelect(id);setOpen(false)};
 return <><Button className="collection-open" variant="outline" onClick={()=>setOpen(true)}>Browse {kind} collection · {Object.keys(owned).length}/{entries.length}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="save-dialog character-collection"><DialogTitle>{kind} collection</DialogTitle><DialogDescription>Choose a portrait to open their details. Joined characters appear first.</DialogDescription>{family&&<p>{Object.values(owned).reduce((n:number,f:any)=>n+f.intimacy,0).toLocaleString()} total Intimacy · {Object.values(owned).reduce((n:number,f:any)=>n+f.blessingPower,0).toLocaleString()} total Blessing Power</p>}<RosterPicker entries={ordered} owned={owned} selected={selected} onSelect={choose} family={family} pageSize={6} status={(id:string)=>owned[id]?(family?'Family':`Lv. ${owned[id].level}`):'Not joined'}/><OriginalAlbum kind={family?'Wife':'Hero'} onChoose={choose}/></DialogContent></Dialog></>;
}
