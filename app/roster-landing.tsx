import {useMemo,useState} from 'react';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import RosterPicker from './roster-picker';
import OriginalAlbum from './original-album';
import {rosterSort} from '@/lib/roster-filter.mjs';

const compact=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
const SORT_LABEL:Record<string,string>={power:'Power',level:'Level',rarity:'Rarity',name:'Name'};
const readSort=(kind:string)=>{try{return localStorage.getItem('everkai-roster-sort-'+kind)||'power'}catch{return 'power'}};
// The roster is the landing view, as in the original: you arrive at the grid and choose someone,
// rather than arriving on one character and paging sideways to find anyone else. Reuses the
// `character-collection` class so the tile styling that already existed for the dialog applies here
// too, rather than duplicating those rules.
export default function RosterLanding({entries,owned,selected,onSelect,family=false,kind,album,summary,status,power}:any){
 // Joined characters strongest first (`power`, the stat their character screen shows), then the rest.
 // The memo is keyed on the resulting order, not on `power`'s identity: RosterPicker resets its page
 // whenever `entries` changes, and a new array every clock tick would pin the player to page one.
 // The sort is remembered per roster on this device (never in the save). Family have no level, so
 // their menu offers Power (Blessing Power), Rarity and Name.
 const sorts=family?['power','rarity','name']:['power','level','rarity','name'];
 const [sort,setSort]=useState(()=>{const v=readSort(kind);return sorts.includes(v)?v:'power'});
 const choose=(v:string)=>{setSort(v);try{localStorage.setItem('everkai-roster-sort-'+kind,v)}catch{}};
 const key=rosterSort(entries,owned,sort,{power}).map((f:any)=>f.id).join(',');
 // Tiles show the number the roster is sorted by, so the order reads as an order.
 const shown=(id:string)=>{const base=status?status(id):'';if(!Object.hasOwn(owned,id)||!power)return base;
  const p=Number(power(id));return Number.isFinite(p)?`${compact(p)} power${base?' · '+base:''}`:base};
 const ordered=useMemo(()=>{const byId=new Map(entries.map((f:any)=>[f.id,f]));return key.split(',').map(id=>byId.get(id))},[key,entries]);
 return <section className="roster-landing character-collection" aria-label={kind+' roster'}>
  <header className="roster-landing-heading"><h2>{kind}</h2><p>{entries.filter((f:any)=>Object.hasOwn(owned,f.id)).length} of {entries.length} joined</p>{summary}
   {power&&<label className="roster-sort">Sort by <NativeSelect aria-label={'Sort '+kind} value={sort} onChange={(e:any)=>choose(e.target.value)}>{sorts.map(v=><NativeSelectOption key={v} value={v}>{SORT_LABEL[v]}</NativeSelectOption>)}</NativeSelect></label>}</header>
  <RosterPicker grouped entries={ordered} owned={owned} selected={selected} onSelect={onSelect} family={family} pageSize={9} status={power?shown:status}/>
  {album&&<OriginalAlbum kind={album} onChoose={onSelect}/>}
 </section>;
}
