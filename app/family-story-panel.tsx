import {Button} from '@/components/ui/button';
import {sceneFor} from '@/lib/scenes.mjs';
import {openingCharacterScene} from '@/lib/opening-presentation.mjs';
import {familyPictures} from '@/lib/family-gallery.mjs';
import {originalProfile} from '@/lib/original-catalog.mjs';
import {fishingDateBonus} from '@/lib/fishing.mjs';

// STORY (docs/family-screen-specs/08-interact.md). The original groups a member's stories under dark
// hatched section ribbons -- `Date Story`, `Become Family` -- and puts the replay control in its own
// boxed button at the right edge of each row, roughly 56px. Everkai rendered one ungrouped button that
// said "Read Charlotte's encounter".
//
// Everkai has ONE encounter per member, not the original's several, so most members show a single row
// under a single ribbon. That is the honest rendering of what this game has: the ribbon names what the
// row is, and a member with nothing to read gets the empty line rather than a missing surface. The
// discovered date pictures are listed under their own ribbon because they are the other thing the
// original files here -- they are opened from the Date Record, so these rows only say what exists.
export default function FamilyStoryPanel({game,person,onRead,locked}:any){
 const scene=sceneFor(person.id)||openingCharacterScene(person.id);
 const found=familyPictures(person.id).filter((r:any)=>game.familyGallery?.owned?.[r.event]);
 return <section className="family-story" aria-label="Story">
  <h2 className="sheet-ribbon">Story</h2>
  <h3 className="story-ribbon">Date Story</h3>
  {scene
   ?<div className="story-row"><span>{originalProfile(person.id).name}’s encounter</span>
     <Button className="story-replay" variant="outline" disabled={locked} aria-label="Replay this story" onClick={()=>onRead(scene.id)}>&#187;</Button></div>
   :<p className="management-hint">No encounter has been written for {person.name}.</p>}
  <h3 className="story-ribbon">Date Record</h3>
  {found.length
   ?<ul className="story-found">{found.map((r:any)=><li key={r.event}>Picture {familyPictures(person.id).indexOf(r)+1}</li>)}</ul>
   :<p className="management-hint">Dates discover illustrated scenes. None yet.</p>}
  <p className="management-hint">Fishing combination bonus: +{fishingDateBonus(game)}% Blessing Points on a date.</p>
 </section>;
}
