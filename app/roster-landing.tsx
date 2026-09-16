import {useMemo} from 'react';
import RosterPicker from './roster-picker';
import OriginalAlbum from './original-album';
import {rosterOrder} from '@/lib/roster-filter.mjs';
// The roster is the landing view, as in the original: you arrive at the grid and choose someone,
// rather than arriving on one character and paging sideways to find anyone else. Reuses the
// `character-collection` class so the tile styling that already existed for the dialog applies here
// too, rather than duplicating those rules.
export default function RosterLanding({entries,owned,selected,onSelect,family=false,kind,album,summary,status,power}:any){
 // Joined characters strongest first (`power`, the stat their character screen shows), then the rest.
 // The memo is keyed on the resulting order, not on `power`'s identity: RosterPicker resets its page
 // whenever `entries` changes, and a new array every clock tick would pin the player to page one.
 const key=rosterOrder(entries,owned,power).map((f:any)=>f.id).join(',');
 const ordered=useMemo(()=>{const byId=new Map(entries.map((f:any)=>[f.id,f]));return key.split(',').map(id=>byId.get(id))},[key,entries]);
 return <section className="roster-landing character-collection" aria-label={kind+' roster'}>
  <header className="roster-landing-heading"><h2>{kind}</h2><p>{Object.keys(owned).length} of {entries.length} joined</p>{summary}</header>
  <RosterPicker grouped entries={ordered} owned={owned} selected={selected} onSelect={onSelect} family={family} pageSize={9} status={status}/>
  {album&&<OriginalAlbum kind={album} onChoose={onSelect}/>}
 </section>;
}
