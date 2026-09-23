import {countryIcon,petCardIcon,cardStyle} from '@/lib/ui-sprites.mjs';
import {useState,useEffect,Fragment} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {filterRoster} from '@/lib/roster-filter.mjs';
import {artBounds,rosterArtPlacement} from '@/lib/art-framing.mjs';
/** A roster card's portrait, placed by the render's measured art bounds (see rosterArtPlacement). */
function RosterArt({path}:{path:string}){const measured=artBounds(path),p=rosterArtPlacement(measured?.bounds);return <span className="roster-tile-art" style={measured?{background:measured.surround}:undefined}><img src={'./assets/'+path} alt="" loading="lazy" decoding="async" style={{width:p.width+'%',left:p.left+'%',top:p.top+'%'}}/></span>}
/** THE ROSTER CARD, rebuilt to docs/fellow-screen-specs/01-roster.md.
 *
 *  The original puts exactly FOUR pieces of data on a card: level, class, name, and "has an action".
 *  Everkai put six -- power, level, a rarity LETTER, the class medallion, the name and a status line.
 *  What changed, and why:
 *
 *   * the LEVEL BANNER is a notched tab on the card's top edge and is ABSENT ENTIRELY on a not-yet-
 *     joined card. That absence is the single strongest owned/unowned signal in the capture;
 *   * the red `!` BADGE means "something here can be improved right now" (difference R4). It is what
 *     makes a 244-card roster scannable and it is the entry point to the whole upgrade loop;
 *   * RARITY moves from a letter tag into the NAME PLATE'S COLOUR (R5) -- the letter belongs on the
 *     detail screen, where the rarity badge already is;
 *   * POWER leaves the card (R3): it belongs on the detail stat block, and the sort order already
 *     says which way the grid is ordered;
 *   * the CLASS FILTER becomes a floating capsule over the foot of the grid (R2), thumb-reachable,
 *     rather than a full-width toolbar pinned under the header;
 *   * the `Everyone` select is gone (R1) -- the Joined / Not joined dividers already say it.
 *
 *  KEPT AGAINST THE SPEC, deliberately: the `Find a fellow…` search. The spec drops it because the
 *  captured roster is 58 cards and "the class filter + sort covers it at this roster size". Everkai's
 *  is 244, four times that, and the capture is no evidence about a roster it never showed. Flagged
 *  for the owner rather than decided silently. */
export default function RosterPicker({entries,selected,onSelect,status,owned={},family=false,pageSize=null,grouped=false,badge,countPill}:any){
 const size=pageSize??(family?2:3),[query,setQuery]=useState(''),[country,setCountry]=useState('all'),[page,setPage]=useState(Math.max(0,Math.floor(entries.findIndex((f:any)=>f.id===selected)/size)));
 useEffect(()=>{const i=entries.findIndex((f:any)=>f.id===selected);if(i>=0){setQuery('');setPage(Math.floor(i/size))}},[selected,entries,size]);
 const matches=filterRoster(entries,query,'all',owned).filter((f:any)=>country==='all'||f.type===country),pages=Math.max(1,Math.ceil(matches.length/size)),current=Math.min(page,pages-1),kind=family?'Family':'Fellow';
 const rarity=(r:string)=>'plate-'+String(r||'n').toLowerCase().replace(/[^a-z0-9]/g,'');
 return <section className="roster-picker" aria-label={kind+' roster'}>
  <div className="roster-search">
   {countPill?countPill(matches.length):<p className="roster-count" role="status">{matches.length} shown</p>}
   <Input type="search" aria-label={'Search playable '+kind.toLowerCase()} placeholder={'Find a '+kind.toLowerCase()+'…'} value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/>
  </div>
  <div className={family?'family-roster':'roster'}>{matches.slice(current*size,(current+1)*size).map((f:any,i:number,page:any[])=><Fragment key={f.id}>
   {grouped&&(i===0||!!owned[page[i-1].id]!==!!owned[f.id])&&<p className="roster-group">{owned[f.id]?'Joined':'Not Yet Joined'}</p>}
   <Button variant="outline" className={'roster-tile '+(selected===f.id?'chosen':'')+(!owned[f.id]?' not-joined':'')} aria-pressed={selected===f.id} style={cardStyle(f.rarity) as any} onClick={()=>onSelect(f.id)}>
    {f.portrait||f.art?<RosterArt path={f.portrait||f.art}/>:<img className="roster-card-only" src={petCardIcon(f.rarity)||''} alt=""/>}
    {owned[f.id]&&status?<span className="level-banner">{status(f.id)}</span>:null}
    {countryIcon(f.type)?<img className="class-medallion" src={countryIcon(f.type)!} alt={f.type}/>:null}
    {badge?.(f.id)?<span className="action-badge" aria-label="Upgrade available">!</span>:null}
    <strong className={'name-plate '+rarity(f.rarity)}>{f.name}</strong>
   </Button></Fragment>)}
  </div>
  {!matches.length&&<p className="roster-count">No matches. Try another search or another type.</p>}
  {pages>1&&<nav className="roster-pagination" aria-label="Roster pages"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</Button><span>{current+1} / {pages}</span><Button variant="outline" disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</Button></nav>}
  {!family&&<nav className="type-capsule" aria-label="Fellow types">{['all','Inspiring','Diligent','Brave','Informed','Unfettered'].map(type=>
   <Button key={type} variant="ghost" aria-label={type==='all'?'All Fellow types':type} aria-pressed={country===type} onClick={()=>{setCountry(type);setPage(0)}}>
    {countryIcon(type)?<img src={countryIcon(type)!} alt=""/>:'ALL'}</Button>)}</nav>}
 </section>;
}
