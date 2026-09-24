import {useMemo,useState} from 'react';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import RosterPicker from './roster-picker';
import OriginalAlbum from './original-album';
import {rosterSort} from '@/lib/roster-filter.mjs';

const SORT_LABEL:Record<string,string>={default:'Default',power:'Power',level:'Level',aptitude:'Aptitude',awakening:'Awakening',rarity:'Rarity',name:'Name'};
const readSort=(kind:string)=>{try{return localStorage.getItem('everkai-roster-sort-'+kind)||'power'}catch{return 'power'}};
// The roster is the landing view, as in the original: you arrive at the grid and choose someone,
// rather than arriving on one character and paging sideways to find anyone else.
//
// REBUILT TO docs/fellow-screen-specs/01-roster.md. The header was a card reading
// `Fellows — 106 of 244 joined` with a `Sort by` select beside it; the original's title row is an
// `(i)` badge, the word `Fellow`, a glyph+number COUNT PILL that tracks the active filter (so it
// reads "fellows matching what you are looking at", not "fellows owned" -- difference R6) and one
// `Sort by <choice>` button. Its four orders are Default / Power / Aptitude / Awakening, and
// Awakening is offered now that spec 05's stars exist.
export default function RosterLanding({entries,owned,selected,onSelect,family=false,kind,album,summary,status,power,sortKeys,sortOrders,info,badge,search=true,pageSize=9,sub}:any){
 // A caller that brings its own sort keys gets exactly those; the Fellow list is not a default every
 // roster should inherit. The Companions roster has no Aptitude and no Awakening, so offering them
 // sorted 71 familiars by a key that returns 0 for all of them.
 const sorts=sortOrders||(sortKeys?['default',...Object.keys(sortKeys),'rarity','name']:family?['power','rarity','name']:['default','power','aptitude','awakening','level','name']);
 const [sort,setSort]=useState(()=>{const v=readSort(kind);return sorts.includes(v)?v:sorts.includes('power')?'power':sorts[0]});
 const choose=(v:string)=>{setSort(v);try{localStorage.setItem('everkai-roster-sort-'+kind,v)}catch{}};
 const key=rosterSort(entries,owned,sort,{power,keys:sortKeys}).map((f:any)=>f.id).join(',');
 const ordered=useMemo(()=>{const byId=new Map(entries.map((f:any)=>[f.id,f]));return key.split(',').map(id=>byId.get(id))},[key,entries]);
 return <section className="roster-landing character-collection" aria-label={kind+' roster'}>
  <header className="roster-title-row">{info}<h2>{kind}</h2>
   {(power||sortKeys)&&<label className="roster-sort">Sort by <NativeSelect aria-label={'Sort '+kind} value={sort} onChange={(e:any)=>choose(e.target.value)}>{sorts.map((v:string)=><NativeSelectOption key={v} value={v}>{SORT_LABEL[v]}</NativeSelectOption>)}</NativeSelect></label>}</header>
  {summary}
  <RosterPicker grouped entries={ordered} owned={owned} selected={selected} onSelect={onSelect} family={family} pageSize={pageSize} status={status} badge={badge} search={search} sub={sub}
   countPill={(shown:number)=><span className="count-pill"><b aria-hidden="true">&#9679;</b>{shown}</span>}/>
  {album&&<OriginalAlbum kind={album} onChoose={onSelect}/>}
 </section>;
}
