import HabitPanel from './habit-panel';
import GameResources from './game-resources';
import {bondedPower} from '@/lib/adventure.mjs';
import CharacterScreen from './character-screen';
import {wardrobeAppearance} from '@/lib/wardrobe.mjs';
import {openingTask,openingRequirement} from '@/lib/opening.mjs';
import {openingObjective} from '@/lib/opening-presentation.mjs';
import MineClearancePanel from './mine-clearance-panel';
import NorthernPanel from './northern-panel';
import TradingPost from './trading-post';
import StorybookPanel from './storybook-panel';
import ExpoPanel from './expo-panel';
import {readSaveFile} from '@/lib/save-format.mjs';
import FishingPanel from './fishing-panel';
import VillageMap from './village-map';
import CharacterCollection from './character-collection';
import CharacterShowcase from './character-showcase';
import {BUSINESSES,enterpriseState} from '@/lib/businesses.mjs';
import FarmPanel from './farm-panel';
import WorkshopPanel from './workshop-panel';
import InnPanel from './inn-panel';
import BusinessPanel from './business-panel';
import {createPersistence} from '@/lib/persistence.mjs';
import FamiliarPanel from './familiar-panel';
import PanelPages,{SystemMenus} from './panel-pages';
import FacilityScene,{isDrakenbergFacility} from './facility-scene';
import MuseumPanel from './museum-panel';
import ApothecaryPanel from './apothecary-panel';
import FountainPanel from './fountain-panel';
import BanquetPanel from './banquet-panel';
import TreasurePanel from './treasure-panel';
import RaphaelPanel from './raphael-panel';
import CharacterScene from './character-scene';
import FellowChooser from './fellow-chooser';
import {useEffect,useRef,useState} from 'react';
import {Coins,Sparkles,Download,ShieldCheck,HardDrive,Share2,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Dialog,DialogClose,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsContent} from '@/components/ui/tabs';
import {FELLOWS,BUILDINGS,FAMILY,fellowById} from '@/lib/catalog.mjs';
import {SAVE_KEY,SAVE_VERSION,MAX_BUILDING_LEVEL,buildingCost,buildingRate,totalRate,effectiveRate,earningsMultiplier,fresh,decode,settle,act} from '@/lib/game.mjs';
import FamilyPanel from './family-panel';
import FellowTraining from './fellow-training';
import StageScreen from './stage-screen';
import StoragePanel from './storage-panel';
import SchoolPanel from './school-panel';
import JourneyPanel from './journey-panel';
import {playerRank} from '@/lib/progression.mjs';
const fmt=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Math.floor(n));
export default function App(){
 const [game,setGame]=useState(()=>fresh()),[loaded,setLoaded]=useState(false),[notice,setNotice]=useState(''),[saveStatus,setSaveStatus]=useState('Loading save…'),[offline,setOffline]=useState('Preparing offline play…'),[panel,setPanel]=useState(false),[pulse,setPulse]=useState(0),[failedLoad,setFailedLoad]=useState(false),[saveFailed,setSaveFailed]=useState(false);
 const [treasurePage,setTreasurePage]=useState('dig'),[townMenu,setTownMenu]=useState(false);
 const [tab,setTab]=useState('fellows'),[moduleOpen,setModuleOpen]=useState(false),[familySelected,setFamilySelected]=useState('wife_2');
 const [restore,setRestore]=useState<any>(null),[selected,setSelected]=useState('hero_15'),[assigning,setAssigning]=useState<string|null>(null);
 const storage=useRef(createPersistence(()=>localStorage));
 const state=useRef(game),ready=useRef(false),timer=useRef<any>(null),file=useRef<HTMLInputElement>(null);
 function tell(message:string){setNotice(message);clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),4000)}
 function saveFailure(){ready.current=false;setSaveFailed(true);setPanel(true);if(storage.current.current){state.current=storage.current.current;setGame(state.current)}setSaveStatus('Saving paused — no new changes applied');}
 function persist(next:any){try{const saved=storage.current.commit(next);state.current=saved;setGame(saved);setSaveStatus('Saved on this device');return true}catch{saveFailure();return false}}
 function loadSaved(){try{const saved=storage.current.load(Date.now());state.current=saved;setGame(saved);ready.current=true;setSaveFailed(false);setFailedLoad(false);setSaveStatus('Saved on this device');return true}catch{saveFailure();setFailedLoad(!storage.current.current);return false}}
 useEffect(()=>{loadSaved();setLoaded(true);
  // Actions save immediately. The display clock does not need a disk write;
  // checkpoints bound idle recovery, and leaving the page also checkpoints.
  let lastCheckpoint=Date.now();
  const tick=setInterval(()=>{if(!ready.current)return;const now=Date.now();if(now-lastCheckpoint>=30000){if(persist(settle(state.current,now)))lastCheckpoint=now}else setGame(settle(state.current,now))},1000);
  const save=()=>{if(ready.current)persist(settle(state.current,Date.now()))};document.addEventListener('visibilitychange',save);window.addEventListener('pagehide',save);
  return()=>{clearInterval(tick);clearTimeout(timer.current);document.removeEventListener('visibilitychange',save);window.removeEventListener('pagehide',save)};
 },[]);
 async function cacheGame(){
  if(!('serviceWorker' in navigator)){setOffline('Offline download unavailable in this browser');return}
  setOffline('Downloading for offline play…');
  // Ask a specific worker how much of its own bundle it has cached. The installing worker
  // owns the new bundle; the active one still answers for the version already installed.
  const ask=(worker:ServiceWorker)=>new Promise<any>((resolve,reject)=>{
   const channel=new MessageChannel();
   const timeout=setTimeout(()=>reject(Error('timeout')),15000);
   channel.port1.onmessage=e=>{clearTimeout(timeout);resolve(e.data)};
   worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
  });
  const pct=(n:number,total:number)=>Math.min(99,Math.floor(n/total*100));
  try{
   const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
   let seen=-1,since=Date.now();
   for(;;){
    const pending=registration.installing||registration.waiting;
    const worker=pending||registration.active||navigator.serviceWorker.controller;
    if(!worker){await new Promise(r=>setTimeout(r,2000));continue}
    let status:any=null;
    try{status=await ask(worker)}catch{}
    if(status&&typeof status.files==='number'&&typeof status.total==='number'){
     if(status.ready&&!pending){setOffline('Ready for offline play');return}
     // A large update is downloaded in full before it takes over, so report real progress
     // instead of failing on a timeout.
     if(pending)setOffline(`Downloading update · ${pct(status.files,status.total)}% (${status.files.toLocaleString()} of ${status.total.toLocaleString()} files) — keep this open`);
     else if(status.ready)setOffline('Ready for offline play');
     if(status.files!==seen){seen=status.files;since=Date.now()}
    }
    if(worker.state==='redundant'){setOffline('Offline download interrupted — reopen to resume');return}
    if(Date.now()-since>600000){setOffline('Offline download stalled — tap to retry');return}
    await new Promise(r=>setTimeout(r,2000));
   }
  }catch{setOffline('Offline download incomplete — tap to retry')}
 }
 useEffect(()=>{let refreshing=false;const changed=()=>{if(!refreshing){refreshing=true;window.location.reload()}};navigator.serviceWorker?.addEventListener('controllerchange',changed);if(import.meta.env.PROD)cacheGame();else setOffline('Preview · offline download available in installed build');return()=>navigator.serviceWorker?.removeEventListener('controllerchange',changed)},[]);
 function action(kind:string,target:any=null,value:any=null){if(!ready.current)return false;const result=act(state.current,kind,Date.now(),target,value);if(!persist(result.state))return false;if('error' in result){tell(result.error);return false;}else {tell(result.message||'Village updated');if('recruited' in result&&result.recruited)setSelected(result.recruited);if('welcomed' in result&&result.welcomed)setFamilySelected(result.welcomed);setPulse(n=>n+1);return true;}}
 function exportSave(){const blob=new Blob([JSON.stringify(settle(state.current,Date.now()),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='isekai-village-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);tell('Save exported')}
 async function importSave(e:any){const f=e.target.files?.[0];if(!f)return;try{const s=decode(await readSaveFile(f));setRestore(s)}catch(err:any){tell(err.message||'Could not read that save.')}finally{e.target.value=''}}
 const [businessSelected,setBusinessSelected]=useState(BUSINESSES[0].id),[businessVisit,setBusinessVisit]=useState(0),[businessPage,setBusinessPage]=useState(0),[storyVisit,setStoryVisit]=useState(0);
 const modules=[['habits','Habit journal'],['fellows','Fellows'],['family','Family'],['adventure','Adventure'],['supplies','Storage'],['businesses','Businesses'],['school','School'],['mine','Mine Clearance'],['northern','Northern Odyssey'],['trading','Trading Post'],['fountain','Fountain of Wishes'],['banquets','Banquets'],['apothecary','Apothecary'],['museum','Museum'],['treasure','Treasure Hunt'],['fishing','Fishing'],['expo','Mushroom Expo'],['stories','Village stories'],['journey','Journey'],['raphael',"Raphael’s Stage"]];
 function openModule(id:string){if(id==='businesses')setBusinessPage(0);if(id==='treasure')setTreasurePage('dig');setTab(id);setModuleOpen(true)}
 function openRelics(){setTreasurePage('relics');setTab('treasure');setModuleOpen(true)}
 const journey=(game as any).opening,nextJourneyTask=openingTask(game),nextJourneyRequirement=openingRequirement(game),nextJourneyObjective=openingObjective(nextJourneyTask);
 const character=wardrobeAppearance(game,fellowById(selected)||FELLOWS[0]);const displayCharacter=tab==='family'?wardrobeAppearance(game,FAMILY.find(f=>f.id===familySelected)||FAMILY[0]):character;const owned=game.fellows[character.id];const workplace=BUILDINGS.find(b=>game.buildings[b.id]?.fellow===character.id)||BUSINESSES.find(b=>enterpriseState(game)[b.id]?.fellows.includes(character.id));const locked=!loaded||failedLoad||saveFailed;
 const primaryNavigation=(<nav className="village-dock original-primary-dock" aria-label="Village destinations">{[
 ['Home','family','family'],['Village','village','businesses'],['Fellow','fellows','fellows'],['Stage','adventure','adventure'],['Drakenberg','town','journey'],['Storage','supplies','supplies']
 ].map(([label,id,icon])=><Button key={id} className="village-icon" aria-current={!moduleOpen&&id==='village'?'page':undefined} aria-haspopup={id==='village'?undefined:'dialog'} onClick={()=>{if(id==='village')setModuleOpen(false);else if(id==='town'){setModuleOpen(false);setTownMenu(true)}else openModule(id)}}><img src={'./assets/ui/'+icon+'.webp'} alt=""/><span>{label}</span></Button>)}</nav>);
 return <main className="game">
  <GameResources gold={game.gold} crystals={game.crystals} income={effectiveRate(game,game.lastAt)} multiplier={earningsMultiplier(game,game.lastAt)} onSettings={()=>setPanel(true)}/>
  <section className="village-next-step" aria-label="Your next objective"><div><small>{journey?'ADVENTURE RANK '+journey.rank:'START YOUR STORY'}</small><p>{!journey?'Build a village, earn companions and explore.':nextJourneyObjective?.text||'Opening journey complete. Your village keeps growing.'}</p></div><Button disabled={locked} onClick={()=>{if(!journey){if(action('openingStart'))openModule('adventure')}else if(nextJourneyTask&&nextJourneyRequirement.ready){if(action('openingClaim',nextJourneyTask._id))openModule('adventure')}else openModule('adventure')}}>{!journey?'Start journey':nextJourneyTask&&nextJourneyRequirement.ready?'Claim quest reward':'Next objective'}</Button></section>
  <VillageMap menuOpen={townMenu} setMenuOpen={setTownMenu} game={game} locked={locked} income={effectiveRate(game,game.lastAt).toFixed(1)} pending={fmt(game.pending)} collect={()=>action('collect')} openModule={openModule} openBusiness={(id:string)=>{setBusinessSelected(id);setBusinessVisit(n=>n+1);openModule('businesses')}}/>
  {primaryNavigation}
  <Dialog open={moduleOpen} onOpenChange={setModuleOpen}><DialogContent className={'game-modal'+(['family','fellows'].includes(tab)?' character-modal':'')} showCloseButton={false}><GameResources gold={game.gold} crystals={game.crystals} income={effectiveRate(game,game.lastAt)} multiplier={earningsMultiplier(game,game.lastAt)} onSettings={()=>setPanel(true)}/><div className="modal-heading"><img src={'./assets/ui/'+(['habits','raphael','fishing','expo','stories','treasure','museum','apothecary','banquets','fountain','trading','northern','mine'].includes(tab)?'journey':tab)+'.webp'} alt=""/><div><DialogTitle>{modules.find(([id])=>id===tab)?.[1]}</DialogTitle><DialogDescription>{fmt(game.gold)} gold · {fmt(game.crystals)} crystals</DialogDescription></div><DialogClose className="village-close" aria-label="Return to village"><img src="./assets/ui/close.webp" alt=""/></DialogClose></div>{isDrakenbergFacility(tab)&&<FacilityScene id={tab}/>}{journey&&tab!=='adventure'&&<Button className="return-objective" variant="outline" onClick={()=>openModule('adventure')}>Return to next objective</Button>}<div className="modal-body" key={tab}><SystemMenus autoOpen={!isDrakenbergFacility(tab)} name={modules.find(([id])=>id===tab)?.[1]||''} resources={<GameResources gold={game.gold} crystals={game.crystals} income={totalRate(game)}/> }><Tabs value={tab} className="system-content">
 <TabsContent value="fellows"><CharacterScreen person={character} onPrevious={()=>setSelected(FELLOWS[(FELLOWS.findIndex(f=>f.id===character.id)+FELLOWS.length-1)%FELLOWS.length].id)} onNext={()=>setSelected(FELLOWS[(FELLOWS.findIndex(f=>f.id===character.id)+1)%FELLOWS.length].id)} stats={owned?[{label:'Power',value:fmt(bondedPower(game,character.id))},{label:'Level',value:owned.level}]:[]} subtitle={owned?`Lv. ${owned.level} · ${character.occupation}`:character.title} collection={<CharacterCollection owned={game.fellows} entries={FELLOWS} selected={selected} onSelect={setSelected}/>}>
{owned?<FellowTraining game={game} id={character.id} action={action} locked={locked} workplace={workplace?.name} overview={<><p>{character.description}</p><CharacterScene key={character.id} id={character.id} locked={locked} onRead={(scene:string)=>{action('storyOpen',scene);openModule('stories')}}/> <Button className="recruit" disabled={locked||Object.keys(game.fellows).length===FELLOWS.length} onClick={()=>action('recruit',owned?null:character.id)}><Sparkles size={18}/>{Object.keys(game.fellows).length===FELLOWS.length?'Everyone has joined':owned?'Welcome a new Fellow · Free':`Welcome ${character.name} · Free`}</Button><Button variant="outline" disabled={locked||Object.keys(game.fellows).length===FELLOWS.length} onClick={()=>action('recruitAll')}>Welcome all remaining Fellows · Free</Button><p className="next-goal">Guaranteed new arrival. No duplicates or purchases.</p></>}/>:<PanelPages key={character.id} popup personName={character.name} labels={['Welcome']}>{<><p>{character.description}</p><CharacterScene key={character.id} id={character.id} locked={locked} onRead={(scene:string)=>{action('storyOpen',scene);openModule('stories')}}/> <Button className="recruit" disabled={locked||Object.keys(game.fellows).length===FELLOWS.length} onClick={()=>action('recruit',owned?null:character.id)}><Sparkles size={18}/>{Object.keys(game.fellows).length===FELLOWS.length?'Everyone has joined':owned?'Welcome a new Fellow · Free':`Welcome ${character.name} · Free`}</Button><Button variant="outline" disabled={locked||Object.keys(game.fellows).length===FELLOWS.length} onClick={()=>action('recruitAll')}>Welcome all remaining Fellows · Free</Button><p className="next-goal">Guaranteed new arrival. No duplicates or purchases.</p></>}</PanelPages>}
</CharacterScreen></TabsContent>
 <TabsContent value="businesses"><PanelPages key={businessVisit} initialPage={businessPage} labels={['Original businesses','Inn service','Workshop','Magic Farm','Starter businesses']}><BusinessPanel onApothecary={()=>openModule('apothecary')} game={game} action={action} locked={locked} selectedBusiness={businessSelected} onBusinessSelect={setBusinessSelected}/><InnPanel game={game} action={action} locked={locked}/><WorkshopPanel game={game} action={action} locked={locked}/><FarmPanel game={game} action={action} locked={locked}/><section className="business-list"><p className="management-hint">One Fellow per business. Moving a Fellow leaves their old workplace vacant. Every Fellow earns the same base rate at the same level.</p>{BUILDINGS.map(b=>{const entry=game.buildings[b.id],f=entry?.fellow?fellowById(entry.fellow):null;return <article className="business-card" key={b.id}><div className="identity"><h2>{b.name}</h2><span className="level">{entry?'Lv. '+entry.level:'Locked'}</span></div><p>{b.description}</p>{entry?<><div className="worker"><span>{f?f.name:'No Fellow assigned'}</span><strong>+{buildingRate(game,b.id).toFixed(1)} gold/s</strong></div><div className="business-actions"><Button variant="outline" disabled={locked} onClick={()=>setAssigning(b.id)}>{f?'Change Fellow':'Assign Fellow'}</Button><Button disabled={locked||entry.level>=MAX_BUILDING_LEVEL||game.gold<buildingCost(entry.level)} onClick={()=>action('buildingUpgrade',b.id)}>{entry.level>=MAX_BUILDING_LEVEL?'Fully upgraded':`Upgrade · ${fmt(buildingCost(entry.level))}`}</Button></div><p className="small-note">{Math.round((entry.level-1)*20)}% business bonus{entry.level<MAX_BUILDING_LEVEL?' → '+(entry.level*20)+'% next level':''}</p></>:<Button disabled={locked||game.gold<b.price} onClick={()=>action('unlock',b.id)}>Open business · {fmt(b.price)} gold</Button>}</article>})}</section></PanelPages></TabsContent><TabsContent value="family"><FamilyPanel onReadStory={(scene:string)=>{action('storyOpen',scene);openModule('stories')}} game={game} action={action} selected={familySelected} onSelect={setFamilySelected} locked={locked}/></TabsContent><TabsContent value="expo"><ExpoPanel game={game} action={action} locked={locked}/></TabsContent><TabsContent value="mine"><MineClearancePanel game={game} action={action} locked={locked} onBag={()=>openModule('supplies')} onFellow={(id:string)=>{setSelected(id);openModule('fellows')}}/></TabsContent><TabsContent value="northern"><NorthernPanel game={game} action={action} locked={locked} onBag={()=>openModule('supplies')}/></TabsContent><TabsContent value="trading"><TradingPost game={game} action={action} locked={locked} onBag={()=>openModule('supplies')}/></TabsContent><TabsContent value="fountain"><FountainPanel game={game} action={action} locked={locked} onBag={()=>openModule('supplies')} onRoster={(kind:string,id:string)=>{if(kind==='fellows')setSelected(id);else setFamilySelected(id);openModule(kind)}}/></TabsContent>
 <TabsContent value="habits"><HabitPanel game={game} action={action} locked={locked} onSaveSettings={()=>setPanel(true)}/></TabsContent><TabsContent value="banquets"><BanquetPanel game={game} action={action} locked={locked} onBag={()=>openModule('supplies')}/></TabsContent><TabsContent value="apothecary"><ApothecaryPanel onStaffing={()=>{setBusinessSelected('Building_201');setBusinessVisit(n=>n+1);openModule('businesses')}} onTraining={()=>openModule('fellows')} onVillage={()=>setModuleOpen(false)} game={game} action={action} locked={locked}/></TabsContent><TabsContent value="museum"><PanelPages labels={['Keepsakes']}><MuseumPanel game={game} action={action} locked={locked} onRelics={openRelics}/></PanelPages></TabsContent><TabsContent value="treasure"><TreasurePanel initialPage={treasurePage} onMuseum={()=>openModule('museum')} onVillage={()=>setModuleOpen(false)} game={game} action={action} locked={locked}/></TabsContent><TabsContent value="fishing"><FishingPanel game={game} action={action} locked={locked}/></TabsContent><TabsContent value="stories"><StorybookPanel key={storyVisit} game={game} action={action} locked={locked} onAdventure={()=>openModule('adventure')}/></TabsContent><TabsContent value="school"><SchoolPanel game={game} action={action} locked={locked}/></TabsContent><TabsContent value="adventure"><StageScreen suspended={panel||failedLoad||saveFailed} game={game} action={action} locked={locked} onNavigate={(id:string,target?:string,page=0)=>{if(id==='village')setModuleOpen(false);else {if(id==='stories'&&target){action('storyOpen',target);setStoryVisit(n=>n+1)}openModule(id);if(id==='businesses'){if(target&&BUSINESSES.some(b=>b.id===target))setBusinessSelected(target);setBusinessPage(page);setBusinessVisit(n=>n+1)}if(id==='fellows'&&target)setSelected(target);if(id==='family'&&target)setFamilySelected(target)}}}/></TabsContent><TabsContent value="supplies"><StoragePanel game={game} action={action} locked={locked} onNavigate={openModule}/></TabsContent><TabsContent value="raphael"><RaphaelPanel game={game} action={action} locked={locked} onBag={()=>openModule('supplies')}/></TabsContent><TabsContent value="journey"><PanelPages labels={['Milestones','Familiars','Museum']}><JourneyPanel game={game} action={action} locked={locked} onNavigate={(id:string)=>id==='village'?setModuleOpen(false):openModule(id)}/><FamiliarPanel game={game} action={action} locked={locked}/><MuseumPanel game={game} action={action} locked={locked} onRelics={openRelics}/></PanelPages></TabsContent></Tabs></SystemMenus></div>{!['family','fellows'].includes(tab)&&primaryNavigation}{notice&&<div className="module-notice" key={pulse} role="status">{notice}</div>}</DialogContent></Dialog>
 <Dialog open={!!assigning} onOpenChange={open=>{if(!open)setAssigning(null)}}><DialogContent className="save-dialog"><DialogTitle>Assign a Fellow</DialogTitle><DialogDescription>Choose who will work at {BUILDINGS.find(b=>b.id===assigning)?.name}. Moving them stops earnings at their previous workplace.</DialogDescription><FellowChooser game={game} locked={locked} selected={assigning&&game.buildings[assigning]?.fellow?[game.buildings[assigning].fellow]:[]} onChoose={(id:string)=>{action('assign',assigning,id);setAssigning(null)}} status={(id:string)=>BUILDINGS.find(b=>game.buildings[b.id]?.fellow===id)?.name||'Available'}/><Button variant="outline" onClick={()=>{action('assign',assigning,null);setAssigning(null)}}>Leave vacant</Button></DialogContent></Dialog>
  <footer><button onClick={()=>setPanel(true)}><ShieldCheck size={14}/>{saveStatus}</button><button onClick={()=>setPanel(true)}>{offline==='Ready for offline play'?<Check size={14}/>:<HardDrive size={14}/>}Offline & saves</button></footer>
  <Dialog open={panel||failedLoad||saveFailed} onOpenChange={setPanel}><DialogContent className="save-dialog"><DialogTitle>Keep your village</DialogTitle><DialogDescription>Progress lives on this device. No game account or game server is used.</DialogDescription><div className="offline-state"><ShieldCheck size={20}/><div><strong>{offline}</strong><p>{saveStatus}</p></div></div>{saveFailed&&<div role="alert"><p>Saving is unavailable. Play is paused, and the failed action was not applied. Free device storage or allow website storage, then retry.</p><Button onClick={()=>{if(loadSaved())tell('Saved game recovered. You can resume play.')}}>Retry saved game</Button></div>}<Button className="wide" variant="outline" onClick={cacheGame}>Download / check offline files</Button><div className="install-steps"><h3>On your iPhone</h3><ol><li>Open this private link in Safari and sign in if prompted.</li><li>Tap Share <Share2 size={14}/> → Add to Home Screen.</li><li>Open the new app online once. Wait for “Ready for offline play” here.</li><li>Close it, turn on airplane mode, and reopen it.</li></ol></div><Button variant="outline" disabled={locked} onClick={()=>action('sandboxSupplies')}>Sandbox: add gifts & refill Energy</Button><div className="backup-row"><Button onClick={exportSave} disabled={failedLoad}>Export save</Button><Button variant="outline" onClick={()=>file.current?.click()}>Restore save</Button><input type="file" accept="application/json,.json" hidden ref={file} onChange={importSave}/></div><p className="small-note">Safari and the Home Screen app may keep separate saves. Export and restore to move progress. Clearing website data removes local files and saves.</p><p className="small-note">Private reconstruction · original extracted art and rendered character animations. This village uses new local progression rules, not the original client or full game. Away earnings are capped at 8 hours.</p>{failedLoad&&<p className="save-error" role="alert">The saved game could not be loaded or created. Retry storage or restore a valid backup. An unreadable save has not been overwritten.</p>}</DialogContent></Dialog>
 <AlertDialog open={!!restore} onOpenChange={open=>{if(!open)setRestore(null)}}><AlertDialogContent><AlertDialogTitle>Restore this village?</AlertDialogTitle><AlertDialogDescription>Replace your current save with Kaity at level {restore?.fellows?.hero_15?.level} and {fmt(restore?.gold||0)} gold.</AlertDialogDescription><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>{try{const saved=storage.current.restore(restore,Date.now());state.current=saved;setGame(saved);ready.current=true;setSaveFailed(false);setFailedLoad(false);setSaveStatus('Saved on this device');setRestore(null);tell('Village restored')}catch{saveFailure()}}}>Restore village</AlertDialogAction></AlertDialogContent></AlertDialog>
 {notice&&!moduleOpen&&<div className="toast" key={pulse} role="status">{notice}</div>}
 </main>
}
