import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {PrimaryAction} from './original-controls';
import {FELLOWS} from '@/lib/catalog.mjs';
import {originalProfile} from '@/lib/original-catalog.mjs';
import {affinityIds} from '@/lib/public-reference.mjs';
import {bondCost,bondFor,supportedIds} from '@/lib/bonds.mjs';
/** FELLOW PAIRING. This used to be the `Bonds` page, which collided with the original's own `Bonds`
 *  -- the relationship rung (docs/family-screen-specs/04-bonds.md). The rung took that dock position
 *  and this moved onto `Blessing`, because the pairing is WHO a blessing reaches and the portraits
 *  above it are the picture of that.
 *
 *  Which is also why most of this file's prose is gone. Spec 04's deletion list retires
 *  `This family member supports their original Fellows together...`, `{n} recruited Fellows receive
 *  this bond...`, `Total bond bonus: +18%...` and the 54-word wiki-snapshot rules-note: the
 *  portrait row and its `POW +n` badges say all four things as pictures. What is left is the one
 *  thing that is a CONTROL rather than a sentence -- choosing the pairing, and strengthening it. */
export default function BondPanel({game,id,action,locked}:any){
 const family=game.family?.[id];
 if(!family)return null;
 const bond=bondFor(game,id),pairs=affinityIds(id),supported=supportedIds(game,id);
 const maxed=bond.level>=10;
 return <div className="bless-row bond-pairing">
  <div className="bless-head"><strong>Pairing <em>Lv. {bond.level}/10</em></strong></div>
  {pairs.length>0
   ?<p className="bless-effect">{pairs.map((f:string)=>originalProfile(f).name).join(' · ')}</p>
   :<p className="bless-effect">Choose one Fellow to support.</p>}
  {!bond.original&&<NativeSelect aria-label="Paired Fellow" value={bond.fellow||''} disabled={locked}
   onChange={(e:any)=>action('bondAssign',id,e.target.value||null)}>
   <NativeSelectOption value="">No Fellow selected</NativeSelectOption>
   {FELLOWS.filter((f:any)=>game.fellows[f.id]).map((f:any)=><NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}
  </NativeSelect>}
  <div className="bless-action">
   {maxed
    ?<span className="inert-pill">Max</span>
    :<PrimaryAction verb="Strengthen" disabled={locked||!supported.length||family.points<bondCost(bond.level)}
      currency="Points" have={family.points} cost={bondCost(bond.level)} onClick={()=>action('bondTrain',id)}/>}
   {/* The same two switches Everkai already had: back to the documented pairing, or to your own. */}
   {pairs.length>0&&<Button variant="outline" className="pairing-switch" disabled={locked}
    onClick={()=>bond.original?action('bondAssign',id,null):action('bondAffinity',id)}>
    {bond.original?'Choose your own':'Use original'}</Button>}
  </div>
 </div>;
}
