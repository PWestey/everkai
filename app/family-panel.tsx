import {useState} from 'react';
import RosterLanding from './roster-landing';
import GiftPanel from './gift-panel';
import CharacterScreen from './character-screen';
import WardrobePanel from './wardrobe-panel';
import {wardrobeAppearance} from '@/lib/wardrobe.mjs';
import {rosterOrder,rosterStep} from '@/lib/roster-filter.mjs';
import FamilyGalleryPanel from './family-gallery-panel';
import {availableDateEnergy,tonicReserve} from '@/lib/tonics.mjs';
import {fishingDateBonus} from '@/lib/fishing.mjs';
import CharacterSkillGuide from './character-skill-guide';
import FamilyTripPanel from './family-trip-panel';
import CharacterScene from './character-scene';
import ConsumableShelf from './consumable-shelf';
import FamilyTraining from './family-training';
import {FamilyStatBlock,FamilyInfo,FamilyRail} from './family-shell';
import FamilyPreview,{PreviewStats,PreviewRail} from './family-preview';
import FamilyRosterTools from './family-overview';
import {Button} from '@/components/ui/button';
import {FAMILY} from '@/lib/catalog.mjs';
import {energyCap,ENERGY_RECOVERY_MS} from '@/lib/progression.mjs';
/** THE FAMILY SURFACE, rebuilt to docs/family-screen-specs/02-member-shell.md.
 *
 *  Was: a `RosterLanding`, then a `CharacterScreen`, then an eleven-page `PanelPages` pager with text
 *  labels and a `Previous . 6 / 11 . Next` footer, whose first page repeated the member's name, title,
 *  bio, three stat tiles, a skill guide, a 78-word rules disclosure, a management hint and the
 *  relationship control. Now: the same roster and the same shell, with the original's FIVE icon tabs
 *  (`app/family-training.tsx`) and its ribbon, medallions and rail (`app/family-shell.tsx`).
 *
 *  The dates block moves to the roster footer, which is where the original keeps Auto Date (specs 01
 *  and 09) and which is also the only honest home for `Across the whole family` numbers -- a per-member
 *  panel is the wrong place to print an account total (spec 06's deletion list). */

/** The roster footer's Energy strip. Everkai's own faucet, in the original's footer position. */
function DateFooter({game,action,locked}:any){
 const joined=Object.keys(game.family).length,energy=availableDateEnergy(game);
 return <div className="roster-date-footer">
  <div className="date-energy"><strong>{Math.floor(game.energy)} / {energyCap(game)}</strong>
   <small>Natural Energy &middot; {tonicReserve(game)} in reserve, spent first</small>
   <small>{game.energy>=energyCap(game)?'Fully recovered':`Next in ${Math.ceil((1-game.energy%1)*ENERGY_RECOVERY_MS/1000)}s`}</small></div>
  <div className="date-actions">
   <Button disabled={locked||energy<1||!joined} onClick={()=>action('date',null,Math.random())}>Date &middot; 1</Button>
   <Button variant="outline" disabled={locked||energy<1||!joined} onClick={()=>action('autoDate')}>Auto Date &middot; {energy}</Button></div>
 </div>;
}

export default function FamilyPanel({game,action,selected,onSelect,locked,onReadStory}:any){
 const person=wardrobeAppearance(game,FAMILY.find(f=>f.id===selected)||FAMILY[0]),member=game.family[person.id];
 // Family lands on its roster too, matching Fellows and the original. The flag is local because this
 // panel already receives selected/onSelect, so page.tsx needs no new state.
 const [browse,setBrowse]=useState(true);
 // `Interact` is the original's default selection and the state with no panel open. The selection is
 // held here, not inside PanelPages, because the RAIL depends on it: Story / Travel / Gift are the
 // Interact tab's three surfaces and the original shows them only while Interact is chosen.
 const [section,setSection]=useState('Interact');
 const [shown,setShown]=useState(person.id);
 if(shown!==person.id){setShown(person.id);setSection('Interact')}
 if(browse)return <RosterLanding kind="Family" album="Wife" family entries={FAMILY} owned={game.family} power={(id:string)=>game.family[id].blessingPower} selected={selected}
  info={<FamilyRosterTools game={game} onSelect={(id:string)=>{onSelect(id);setBrowse(false)}}/>}
  status={(id:string)=>game.family[id]?`Intimacy ${game.family[id].intimacy}`:'Not joined'}
  summary={<><span>{Object.values(game.family).reduce((n:number,f:any)=>n+f.intimacy,0).toLocaleString()} total Intimacy</span><DateFooter game={game} action={action} locked={locked}/></>}
  onSelect={(id:string)=>{onSelect(id);setBrowse(false)}}/>;
 const order=rosterOrder(FAMILY,game.family,(id:string)=>game.family[id].blessingPower);
 // A member who has not joined gets the original's `Preview`: one screen, no dock, greyscale art
 // (spec 13). Everkai used to render the same eleven pages with six "welcome this member to..."
 // empty states between them.
 if(!member)return <CharacterScreen person={person} heading="Preview" preview
  onPrevious={()=>onSelect(rosterStep(order,person.id,-1))} onNext={()=>onSelect(rosterStep(order,person.id,1))}
  statBlock={<PreviewStats person={person}/>} rail={<PreviewRail person={person}/>}
  collection={<Button className="collection-open" variant="outline" onClick={()=>setBrowse(true)}>&lsaquo; Family roster</Button>}>
  <FamilyPreview game={game} person={person}/>
 </CharacterScreen>;
 return <CharacterScreen person={person} heading="Family Training"
  onPrevious={()=>onSelect(rosterStep(order,person.id,-1))} onNext={()=>onSelect(rosterStep(order,person.id,1))}
  statBlock={<FamilyStatBlock game={game} id={person.id}/>}
  infoOnly info={<FamilyInfo person={person}><CharacterSkillGuide key={person.id+'-skill-guide'} id={person.id} game={game} action={action} locked={locked}/></FamilyInfo>}
  rail={<FamilyRail interact={section==='Interact'}>{{
   Story:<><CharacterScene key={person.id+'-encounter'} id={person.id} locked={locked} onRead={onReadStory}/>
    <p className="small-note">Fishing combination bonus: +{fishingDateBonus(game)}% Blessing Points on a date.</p></>,
   Travel:<FamilyTripPanel game={game} person={person} action={action} locked={locked}/>,
   Gift:<><GiftPanel game={game} person={person} action={action} locked={locked}/><ConsumableShelf game={game} action={action} locked={locked} familyId={person.id}/></>,
   Gallery:<FamilyGalleryPanel key={person.id} game={game} person={person} action={action} locked={locked}/>,
   Wardrobe:<WardrobePanel key={person.id} game={game} person={person} action={action} locked={locked}/>}}</FamilyRail>}
  collection={<Button className="collection-open" variant="outline" onClick={()=>setBrowse(true)}>&lsaquo; Family roster</Button>}>
  <FamilyTraining game={game} person={person} action={action} locked={locked} section={section} onSection={setSection}/>
 </CharacterScreen>;
}
