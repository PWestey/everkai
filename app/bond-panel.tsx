import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {FELLOWS} from '@/lib/catalog.mjs';
import {originalProfile} from '@/lib/original-catalog.mjs';
import {affinityIds} from '@/lib/public-reference.mjs';
import {bondCost,bondFactor,bondFor,supportedIds} from '@/lib/bonds.mjs';
export default function BondPanel({game,id,action,locked}:any){
 const family=game.family[id],bond=bondFor(game,id),pairs=affinityIds(id),supported=supportedIds(game,id);
 return <article className="family-detail"><h2>Fellow bonds</h2>
 <p>{bond.original?'This family member supports their documented Fellows together.':'Sandbox pairing · choose one Fellow to support.'} Dates supply Blessing Points for training.</p>
 {family?<>
 {pairs.length>0&&<div className="blessing-row"><h3>Documented Fellows</h3><p>{pairs.map((f:string)=>`${originalProfile(f).name}${game.fellows[f]?'':FELLOWS.some(p=>p.id===f)?' (not recruited)':' (album only)'}`).join(' · ')}</p>{!bond.original&&<Button variant="outline" disabled={locked} onClick={()=>action('bondAffinity',id)}>Use documented pairings · keep level</Button>}</div>}
 {!pairs.length&&<p>No documented pairing is available for this character yet.</p>}
 {!bond.original&&<><label htmlFor="bond-fellow">Sandbox Fellow</label><NativeSelect id="bond-fellow" value={bond.fellow||''} disabled={locked} onChange={e=>action('bondAssign',id,e.target.value||null)}><NativeSelectOption value="">No Fellow selected</NativeSelectOption>{FELLOWS.filter(f=>game.fellows[f.id]).map(f=><NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}</NativeSelect></>}
 <div className="family-stats"><div><span>Bond level</span><strong>{bond.level}/10</strong></div><div><span>Bonus per Fellow</span><strong>+{bond.level*2}%</strong></div><div><span>Blessing Points</span><strong>{family.points}</strong></div></div>
 <p>{supported.length} recruited {supported.length===1?'Fellow receives':'Fellows receive'} this bond. Bonuses from other family members stack.</p>
 {!bond.original&&bond.fellow&&<p>Total bond bonus: +{Math.round((bondFactor(game,bond.fellow)-1)*100)}% Power and business earnings.</p>}
 <Button disabled={locked||!supported.length||bond.level>=10||family.points<bondCost(bond.level)} onClick={()=>action('bondTrain',id)}>{bond.level>=10?'Bond fully trained':`Strengthen · ${bondCost(bond.level)} points`}</Button>
 {bond.original&&<Button variant="outline" disabled={locked} onClick={()=>action('bondAssign',id,null)}>Choose a sandbox pairing instead</Button>}
 </>:<p>Welcome this family member to create a bond.</p>}
 <details className="rules-note"><summary>About these rules</summary><p>Pairings come from The Ascended community wiki snapshot of September 7, 2026, which may include newer content than our APK. Training costs, the level cap and +2% per level remain local sandbox balance. Existing custom bonds are preserved until you switch them. Changing modes keeps the trained level.</p></details></article>
}
