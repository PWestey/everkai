import FamiliarTowerPanel from './familiar-tower-panel';
import FamiliarNodePanel from './familiar-node-panel';
import PanelPages from './panel-pages';
import RosterLanding from './roster-landing';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {FAMILIARS,familiarById,familiarStats,familiarStage,familiarCap} from '@/lib/familiars.mjs';
export default function FamiliarPanel({game,action,locked}:any){
 const [id,setId]=useState(FAMILIARS[0].id),pet=familiarById(id)!,progress=game.familiars?.[id],stats=familiarStats(id,progress||{level:1,stars:0});
 // Companions land on the roster too, matching Family and Fellows. No album: OriginalAlbum covers
 // Hero and Wife only. Familiars carry no portrait, so RosterPicker falls back to the rarity card.
 const [browse,setBrowse]=useState(true);
 if(browse)return <RosterLanding kind="Companions" entries={FAMILIARS} owned={game.familiars||{}} selected={id}
  status={(x:string)=>game.familiars?.[x]?`Lv. ${game.familiars[x].level}`:'Not joined'}
  summary={<span>{FAMILIARS.filter(p=>game.familiars?.[p.id]).length} welcomed</span>}
  onSelect={(x:string)=>{setId(x);setBrowse(false)}}/>;
 return <section className="family-detail"><Button className="collection-open" variant="outline" onClick={()=>setBrowse(true)}>‹ Companions roster</Button><h3>{pet.name}</h3><p>{pet.rarity} · {pet.type}</p><div className="family-stats"><div><span>Attack</span><strong>{stats.ATK.toLocaleString()}</strong></div><div><span>Health</span><strong>{stats.HP.toLocaleString()}</strong></div><div><span>Speed</span><strong>{stats.SPD.toLocaleString()}</strong></div></div>
 {progress?<PanelPages labels={['Training','Fellow bond','Tower']}><><p>Level {progress.level} / {familiarCap(id)} · Stage {familiarStage(progress.level)} · {progress.stars} stars</p><div className="business-actions"><Button disabled={locked||progress.level>=familiarCap(id)} onClick={()=>action('trainFamiliar',id,1)}>Train +1 · Free</Button><Button variant="outline" disabled={locked||progress.level>=familiarCap(id)} onClick={()=>action('trainFamiliar',id,10)}>Train up to 10 · Free</Button></div><Button disabled={locked||progress.stars>=100} onClick={()=>action('starFamiliar',id)}>Add star · Free</Button></><FamiliarNodePanel game={game} id={id} action={action} locked={locked}/><FamiliarTowerPanel game={game} action={action} locked={locked}/></PanelPages>:<Button disabled={locked} onClick={()=>action('adoptFamiliar',id)}>Welcome {pet.name} · Free</Button>}
 <Button variant="outline" disabled={locked||Object.keys(game.familiars||{}).length===FAMILIARS.length} onClick={()=>action('adoptFamiliars')}>Welcome all familiars · Free</Button><details className="rules-note"><summary>About familiar progression</summary><p>These base stats and level, stage and star calculations follow The Ascended’s public familiar calculator. Training and recruitment are free sandbox actions; stages advance with level. A separate 12-floor sandbox Tower is playable; original combat skills, enemy tables and acquisition costs remain unverified. Newer familiars may postdate the APK. Explicitly activated nodes benefit the bound Fellow and therefore roster-based business earnings; training alone does not activate nodes.</p></details></section>
}
