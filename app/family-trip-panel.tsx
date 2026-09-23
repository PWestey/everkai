import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {TRIPS,TRIPS_PER_DAY,tripsLeft,waitingChildren,tripPlan} from '@/lib/family-trips.mjs';
import {PUPIL_TYPES} from '@/lib/school.mjs';
import {schoolCapacity} from '@/lib/education.mjs';
import {familyById} from '@/lib/catalog.mjs';
// Family trips are the original's TWO paid dates and the only route to a child: Rule:text:Wife_16,
// "Dates with family members are divided into Sailing Trip and Airship Journey". Every cost, limit
// and gain shown here is read back from lib/family-trips.mjs so the screen and the rules cannot drift.
//
// TRAVEL (docs/family-screen-specs/08-interact.md): "the art IS the card, not an icon beside it --
// each journey's scene fills its whole row and the text sits over a scrim", the cost lives INSIDE the
// button, and the daily allowance sits behind an `(i) Instruction` link instead of a line above the
// rows. Everkai rendered both trips as `blessing-row`s with an `<h3>{name} · 80 Crystals</h3>` and a
// sentence, and printed the allowance as a sentence above them.
//
// The banners are the village's own painted scenes, chosen for the journey they carry: the shore for
// the Sailing Trip, the road out of the valley for the Airship. LOCAL: the original ships per-journey
// banner art that is not in the recovered set. NOT reproduced at all: the original's weekly discount
// ladder and its -80% starburst -- the schedule is a config table nobody has measured yet, and a
// discount invented here would be a price change wearing a badge.
const BANNER:Record<string,string>={trip_sail:'facility-scenes/fishing.webp',trip_air:'facility-scenes/journey.webp'};
export default function FamilyTripPanel({game,person,action,locked}:any){
 const [type,setType]=useState(PUPIL_TYPES[0].id);
 const [rules,setRules]=useState(false);
 const member=game.family?.[person.id];
 const left=tripsLeft(game),waiting=waitingChildren(game),full=game.school.pupils.length>=schoolCapacity(game);
 // familyById now, not a prefix strip: stripping an id prefix that a crossover id does not have left
 // the raw `xover_*` id on screen for another caretaker's child (D4). Falls back to the id only for
 // content the game no longer knows.
 const name=(id:string)=>game.family?.[id]?(id===person.id?person.name:familyById(id)?.name??id):id;
 return <section className="family-trips">
  <h2 className="sheet-ribbon">Choose a Journey</h2>
  <button className="instruction-link" aria-expanded={rules} onClick={()=>setRules(r=>!r)}>&#9432; Instruction</button>
  {rules&&<div className="instruction-popover" role="note">
   <p>There are {TRIPS_PER_DAY} journeys a day, shared across the whole family.</p>
   <p>Remaining today: {left} of {TRIPS_PER_DAY}</p>
   <p>Crystals: {game.crystals.toLocaleString()}</p>
  </div>}
  {!member&&<p>Welcome {person.name} to travel together.</p>}
  {member&&TRIPS.map((trip:any)=>{const plan=tripPlan(game,person.id,trip.id);const short=game.crystals<trip.crystals;return <article className="journey-card" key={trip.id}
   style={{backgroundImage:`url(./assets/${BANNER[trip.id]||BANNER.trip_sail})`}}>
   <div className="journey-text">
    <h3>{trip.name}</h3>
    <p>Guarantees {trip.children>1?'twins':'one child'}. +{trip.charm} Blessing Power, +{plan?.points.toLocaleString()??0} Blessing Points.</p>
   </div>
   <Button className="journey-go" disabled={locked||!left||short} onClick={()=>action('familyTrip',person.id,trip.id)}>
    <span>{!left?'No journeys left':short?'Not enough Crystals':trip.name.split(' ')[0]}</span>
    <small>&#128142; {trip.crystals.toLocaleString()}</small>
   </Button>
  </article>})}
  <div className="blessing-row"><h3>Children waiting · {waiting.length}</h3>
   {!waiting.length&&<p>Take a journey to bring a child home. Children become pupils at the School.</p>}
   {!!waiting.length&&<>
    <label>Pupil type <select value={type} disabled={locked} onChange={e=>setType(e.target.value)}>
     {PUPIL_TYPES.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <ul className="trip-children">{waiting.map((child:any)=><li key={child.id}>
     <span>{child.twin?'Twin':'Child'} of {name(child.caretaker)}</span>
     <Button variant="outline" disabled={locked||full} onClick={()=>action('enrollTripChild',child.id,type)}>
      {full?'School is full':'Enrol as a pupil'}</Button></li>)}</ul></>}
  </div>
  <details className="rules-note"><summary>About family trips</summary><p>The original divides dates into the Sailing Trip and the Airship Journey; both are paid, and both guarantee children where a random date does not. The Sailing Trip’s price (100 Crystals), the ten-trips-a-day limit and both Blessing Power gains (+10 and +20) are the original’s own System.json values. The Airship’s original price is one Perfume, an item with no shop row, drop or reward anywhere in the recovered data, so its Crystal price here is local — set at twice the Sailing Trip, the only ratio the source gives. Blessing Points are deliberately the same as a random date with the same member: trips sell children and convenience, not a faster points rate. The original also runs a weekly Crystal discount on the Sailing Trip; that schedule is not in the recovered data and is not reproduced here.</p></details>
 </section>;
}
