import {useMemo} from 'react';
import RosterPicker from './roster-picker';
import OriginalAlbum from './original-album';
// The roster is the landing view, as in the original: you arrive at the grid and choose someone,
// rather than arriving on one character and paging sideways to find anyone else. Reuses the
// `character-collection` class so the tile styling that already existed for the dialog applies here
// too, rather than duplicating those rules.
export default function RosterLanding({entries,owned,selected,onSelect,family=false,kind,album,summary,status}:any){
 const ordered=useMemo(()=>[...entries].sort((a:any,b:any)=>Number(!!owned[b.id])-Number(!!owned[a.id])),[entries,owned]);
 return <section className="roster-landing character-collection" aria-label={kind+' roster'}>
  <header className="roster-landing-heading"><h2>{kind}</h2><p>{Object.keys(owned).length} of {entries.length} joined</p>{summary}</header>
  <RosterPicker grouped entries={ordered} owned={owned} selected={selected} onSelect={onSelect} family={family} pageSize={9} status={status}/>
  {album&&<OriginalAlbum kind={album} onChoose={onSelect}/>}
 </section>;
}
