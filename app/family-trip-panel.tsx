import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {TRIPS,TRIPS_PER_DAY,tripsLeft,waitingChildren,tripPlan} from '@/lib/family-trips.mjs';
import {PUPIL_TYPES} from '@/lib/school.mjs';
import {schoolCapacity} from '@/lib/education.mjs';
import {familyById} from '@/lib/catalog.mjs';
// Family trips are the original's TWO paid dates and the only route to a child: Rule:text:Wife_16,
// "Dates with family members are divided into Sailing Trip and Airship Journey". Every cost, limit
// and gain shown here is read back from lib/family-trips.mjs so the screen and the rules cannot drift.
export default function FamilyTripPanel({game,person,action,locked}:any){
 const [type,setType]=useState(PUPIL_TYPES[0].id);
 const member=game.family?.[person.id];
 const left=tripsLeft(game),waiting=waitingChildren(game),full=game.school.pupils.length>=schoolCapacity(game);
 // familyById now, not a prefix strip: stripping an id prefix that a crossover id does not have left
 // the raw `xover_*` id on screen for another caretaker's child (D4). Falls back to the id only for
 // content the game no longer knows.
 const name=(id:string)=>game.family?.[id]?(id===person.id?person.name:familyById(id)?.name??id):id;
 return <section className="family-trips"><h2>Family trips</h2>
  {/* management-hint, not small-note: `.character-sheet:not(.system-sheet) .small-note` is
      display:none, and this panel always renders inside the Family character sheet, so a
      small-note here would be invisible in play while passing every test. Checked in the browser. */}
  <p className="management-hint">{left} of {TRIPS_PER_DAY} trips left today · {game.crystals.toLocaleString()} Crystals</p>
  {!member&&<p>Welcome {person.name} to travel together.</p>}
  {member&&TRIPS.map((trip:any)=>{const plan=tripPlan(game,person.id,trip.id);return <div className="blessing-row" key={trip.id}>
   <h3>{trip.name} · {trip.crystals.toLocaleString()} Crystals</h3>
   <p>Guarantees {trip.children>1?'twins':'one child'} · +{trip.charm} Blessing Power · +{plan?.points.toLocaleString()??0} Blessing Points{trip.crystalsAreOriginal?'':' · Crystal price is local: the original charges 1 Perfume, an item with no route in the recovered data'}</p>
   <Button disabled={locked||!left||game.crystals<trip.crystals} onClick={()=>action('familyTrip',person.id,trip.id)}>
    {!left?'No trips left today':game.crystals<trip.crystals?`Needs ${trip.crystals.toLocaleString()} Crystals`:`Take the ${trip.name}`}</Button>
  </div>})}
  <div className="blessing-row"><h3>Children waiting · {waiting.length}</h3>
   {!waiting.length&&<p>Take a trip to bring a child home. Children become pupils at the School.</p>}
   {!!waiting.length&&<>
    <label>Pupil type <select value={type} disabled={locked} onChange={e=>setType(e.target.value)}>
     {PUPIL_TYPES.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <ul className="trip-children">{waiting.map((child:any)=><li key={child.id}>
     <span>{child.twin?'Twin':'Child'} of {name(child.caretaker)}</span>
     <Button variant="outline" disabled={locked||full} onClick={()=>action('enrollTripChild',child.id,type)}>
      {full?'School is full':'Enrol as a pupil'}</Button></li>)}</ul></>}
  </div>
  <details className="rules-note"><summary>About family trips</summary><p>The original divides dates into the Sailing Trip and the Airship Journey; both are paid, and both guarantee children where a random date does not. The Sailing Trip’s price (100 Crystals), the ten-trips-a-day limit and both Blessing Power gains (+10 and +20) are the original’s own System.json values. The Airship’s original price is one Perfume, an item with no shop row, drop or reward anywhere in the recovered data, so its Crystal price here is local — set at twice the Sailing Trip, the only ratio the source gives. Blessing Points are deliberately the same as a random date with the same member: trips sell children and convenience, not a faster points rate.</p></details>
 </section>;
}
