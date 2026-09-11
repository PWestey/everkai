import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import PanelPages from './panel-pages';
import RoamingStory from './roaming-story';
import {FAMILY} from '@/lib/catalog.mjs';
import {ROAM_FAMILY,ROAM_EVENTS,ROAM_FAME,ROAM_QUICK_MAX,roamingState,roamStamina,roamLocation} from '@/lib/roaming.mjs';
import {habitEarnings,habitDay} from '@/lib/habits.mjs';
const ITEM_NAMES:Record<string,string>={gift1:'Gold Ring',gift2:'Gemstone Ring',gift3:'Flower Necklace',gift4:'Jewel Necklace',Item_GetCE_10:'Focus Candy'};
const person=(id:string)=>FAMILY.find((f:any)=>f.id===id) as any;
const clock=(ms:number)=>{const t=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`};
function entryText(h:any){const p=person(h.target),goal=ROAM_FAMILY.find((f:any)=>f.id===h.target)?.bondGoal;
 if(h.kind==='joined')return `${p?.name} joined your family!`;
 if(h.kind==='bond')return `${p?.name} has spent a wonderful time with you · Bond ${h.amount}/${goal}`;
 if(h.kind==='intimacy')return `${p?.name} · Intimacy +${h.amount}`;
 return `${ROAM_EVENTS.find((e:any)=>e.id===h.target)?.text||''}${h.item?` · ${ITEM_NAMES[h.item]||h.item}`:''}`}
function EncounterCard({h,scene,onWatch}:{h:any,scene:any,onWatch:()=>void}){const p=h.kind==='event'?null:person(h.target),goal=ROAM_FAMILY.find((f:any)=>f.id===h.target)?.bondGoal;
 return <article className={'roam-card roam-'+h.kind}>{p?<img src={'./assets/'+p.art} alt={p.name}/>:<span className="roam-event-icon" aria-hidden="true">✦</span>}<div><small>{roamLocation(h.location)?.name}</small><p>{entryText(h)}</p>{h.kind==='bond'&&goal&&<progress aria-label="Bond" max={goal} value={h.amount}/>}{scene&&(scene.lines.length===1?<blockquote>{scene.lines[0].text.replaceAll('{playerName}','Village Elder')}</blockquote>:<Button variant="outline" className="roam-watch" onClick={onWatch}>Watch encounter · {scene.lines.length} lines</Button>)}<small>Fame +{ROAM_FAME}</small></div></article>}
export default function RoamingPanel({game,action,locked}:any){
 const r=roamingState(game),st=roamStamina(game),last=r.history.at(-1),quick=Math.min(ROAM_QUICK_MAX,st.stamina);
 const {dailies}=habitEarnings(game.habits,game.lastAt),refillUsed=r.refillDay===habitDay(game.lastAt);
 const [story,setStory]=useState<any>(null),[reading,setReading]=useState<any>(null);
 // The encounter stories are about 190 KB of text, so they load separately from the main game bundle.
 useEffect(()=>{let live=true;import('@/lib/roaming-story.mjs').then(m=>{if(live)setStory(m)});return()=>{live=false}},[]);
 const run=(kind:string,extra:any={})=>action(kind,null,{seq:r.seq,...extra});
 const open=(id:string,scenes:any[],start:number,location?:string)=>setReading({key:Date.now(),person:person(id),scenes,start,location});
 const lastScene=story&&last?story.roamStoryFor(last):null;
 return <section className="roaming-panel"><PanelPages labels={['Roam','Encounters','Records']}>
  <div className="roam-page"><div className="roam-hud"><div><small>ROAMING STAMINA</small><strong>{st.stamina}/{st.cap}</strong><span>{st.recoverAt?`Next point in ${clock(st.recoverAt-game.lastAt)}`:'Full'}</span></div><div><small>FAME</small><strong>{r.fame.toLocaleString()}</strong><span>{r.travels.toLocaleString()} roams</span></div></div>
   <div className="roam-actions"><Button disabled={locked||st.stamina<1} onClick={()=>run('roamGo',{roll:Math.random()})}>Go · 1 Stamina</Button><Button variant="outline" disabled={locked||quick<2} onClick={()=>run('roamQuick',{rolls:Array.from({length:quick},()=>Math.random())})}>Quick roam ×{Math.max(quick,2)}</Button></div>
   <Button variant="outline" className="roam-refill" disabled={locked||refillUsed||dailies<1||st.stamina>=st.cap} onClick={()=>run('roamRefill')}>{refillUsed?'Habit refill used today':dailies<1?'Complete a daily habit to refill stamina':`Habit refill · +${Math.min(6,dailies)} Stamina`}</Button>
   {last?<EncounterCard h={last} scene={lastScene} onWatch={()=>open(last.target,[lastScene],0,roamLocation(last.location)?.name)}/>:<p className="small-note">Stroll through Drakenberg to meet Family members and Fellows. Uninvited Family members grow closer with each meeting and join your family when your bond is strong enough.</p>}
  </div>
  <div className="roam-grid">{ROAM_FAMILY.map((f:any)=>{const p=person(f.id),owned=!!game.family[f.id],bond=r.bonds[f.id]||0,unlocked=story?story.roamUnlockedStories(game,f.id):[],total=story?story.roamScenesFor(f.id).length:0;return <article key={f.id} className={'roam-member'+(owned?' owned':'')}><img src={'./assets/'+p.art} alt=""/><div><strong>{p.name}</strong><small>{roamLocation(f.location)?.name}</small>{owned?<span>Joined · Intimacy {game.family[f.id].intimacy.toLocaleString()}</span>:<><span>Bond {bond}/{f.bondGoal}</span><progress aria-label={`Bond with ${p.name}`} max={f.bondGoal} value={bond}/></>}{story&&<Button variant="outline" className="roam-stories" disabled={!unlocked.length} onClick={()=>open(f.id,unlocked,unlocked.length-1,roamLocation(f.location)?.name)}>Stories {unlocked.length}/{total}</Button>}</div></article>})}<p className="small-note">Meeting uninvited Family members raises your bond and plays their next story; at the goal they join your family. Kaka (35) and Ena (50) goals match the original; other goals follow those by rarity.</p></div>
  <div className="roam-records">{r.history.length?[...r.history].reverse().slice(0,20).map((h:any)=><p key={h.id}><small>{new Date(h.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · {roamLocation(h.location)?.name}</small>{entryText(h)}</p>):<p className="small-note">No roams yet.</p>}</div>
 </PanelPages>{reading&&<RoamingStory key={reading.key} scenes={reading.scenes} start={reading.start} person={reading.person} location={reading.location} onClose={()=>setReading(null)}/>}</section>;
}
