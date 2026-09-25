import {useState} from 'react';
import {Button} from '@/components/ui/button';
import CharacterScreen from './character-screen';
import CharacterSkillGuide from './character-skill-guide';
import {heroRow} from '@/lib/original-progression.mjs';
import {heroHalos} from '@/lib/hero-stars.mjs';
import {fellowSource} from '@/lib/fellow-source.mjs';

// THE NOT-YET-JOINED FELLOW, built to docs/fellow-screen-specs/12-locked-fellow.md.
//
// P1, and it is the whole reason this screen exists: Everkai used the SAME screen for owned and
// unowned Fellows, so opening someone you do not have showed live upgrade controls, a Power/Level/
// Aptitude stat block for a Fellow with no record, and a five-section dock where every section was
// inert. Family and Familiar both got a separate preview this month; Fellow was the last roster of
// the three still doing it the old way. The original ships a different screen: same badges, same
// name banner, greyscale art, no dock, no primary action, two tabs.
//
// P4: greyscale, not near-black. Everkai drew unowned Fellows dark with a red frame, which reads as
// "broken"; desaturation reads as "not yet". That is `CharacterScreen`'s `preview` mode, already
// built for the Family locked member and reused unchanged.
//
// P2: `How to Invite` is one line and the entire acquisition UI -- no route button, no odds, no
// fragment progress. Everkai's own faucets fill it: the Recruit counter's price from `recruitPrice`,
// or the Fountain's wish for the handful that appear there.
//
// P5: one stat band, `Initial Aptitude`, which is the only number comparable across Fellows you do
// not own. `heroRow` is that column -- the same base-Aptitude the Power Details dialog shows as
// `Base+N` for an owned Fellow.
//
// P6 IS NOT BUILT, and not for want of trying. The original's Skills tab opens with the aura's own
// name over a row of member portraits, only the missing one greyed. Measured 2026-09-25: every one
// of Everkai's 128 halos belongs to exactly one Fellow, so there is no membership to draw. The row
// needs the `HeroBond` groups, which are catalogue F8, and F6's group auras read the same table --
// they are one slice and this screen should get its row when that lands. The band still appears,
// titled with the aura's own name as the original titles it, saying what recruiting them broadcasts.
//
// ALSO ABSENT, each for its own reason: `Operation Skill` needs spec 07's starting tier, which
// Everkai does not model; `Blessing` needs a per-Fellow map of which family members bless them, and
// `blessingRecipients` answers the opposite question. Neither is faked with a placeholder band.


export default function FellowPreview({game,person,onBack,onPrevious,onNext,locked}:any){
 const [tab,setTab]=useState('info'),[why,setWhy]=useState(false);
 const aptitude=heroRow(game,person.id),halos=heroHalos(person.id);
 return <CharacterScreen person={person} heading="Cultivate" preview
  onPrevious={onPrevious} onNext={onNext}
  collection={<Button className="collection-open" variant="outline" onClick={onBack}>&lsaquo; Fellows roster</Button>}>
  <div className="fellow-preview-wrap">
   <div className="preview-head">
    <button className="source-button" aria-expanded={why} onClick={()=>setWhy(v=>!v)}>Source</button>
    {why&&<p className="source-tip" role="note">How to Invite: {fellowSource(person.id)}</p>}
   </div>
   {/* One band, centred: the only number comparable across Fellows you do not own. */}
   {aptitude!==undefined&&<p className="aptitude-band">&#10022; Initial Aptitude &#10022; <b>{aptitude}</b></p>}
   <nav className="panel-pages preview-tabs" aria-label="Preview">
    {[['info','Info'],['skills','Skills']].map(([k,label])=>
     <Button key={k} variant="ghost" aria-pressed={tab===k} onClick={()=>setTab(k)}>{label}</Button>)}</nav>
   {tab==='info'
    ?<dl className="preview-info">
      <div><dt>Name</dt><dd>{person.name}</dd></div>
      <div><dt>Title</dt><dd>{person.title||'—'}</dd></div>
      <div><dt>Rarity</dt><dd>{person.rarity}</dd></div>
      <div><dt>Type</dt><dd>{person.type}</dd></div>
      <div className="preview-bio"><dt>Bio</dt><dd>{person.description||'No biography was recovered for this character.'}</dd></div>
     </dl>
    :<div className="preview-skills">
      {halos.map((h:any)=><section key={h.id} className="aura-band">
       {/* The band is titled with the AURA'S OWN NAME, not the word "Aura" -- the group identity is
           the heading. Spec 12, and one of the two things it says to carry over wholesale. */}
       <h5>{h.name}</h5>
       <p>Broadcasts {h.prop==='percent'?`+${(h.values?.[0]||0)/100}% Power`:h.prop} to your roster once awakened.</p>
      </section>)}
      {!halos.length&&<p className="aura-none">This Fellow carries no aura.</p>}
      <CharacterSkillGuide key={person.id+'-preview'} id={person.id} game={game} locked={locked}/>
     </div>}
  </div>
 </CharacterScreen>;
}
