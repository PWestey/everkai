import PanelPages from './panel-pages';
import FamiliarPanel from './familiar-panel';
import FamiliarTowerPanel from './familiar-tower-panel';
import FamiliarExplorePanel from './familiar-explore-panel';
import FamiliarDispatchPanel from './familiar-dispatch-panel';
// The Familiar Hall ("UI_Pet_Panel_PetMain_ScenePetMain_comTitle" in the original): the collection, the
// Tower, Exploring and Dispatch as top-level pages, so none of them hides behind a selected familiar.
// The Compendium (parity row E8) is not built yet.
export default function FamiliarHall({game,action,locked,initialPage=0}:any){
 return <section className="familiar-detail familiar-hall" aria-label="Familiar Hall"><PanelPages initialPage={initialPage} labels={['Familiars','Tower','Exploring','Dispatch']}>
  <FamiliarPanel game={game} action={action} locked={locked}/>
  <FamiliarTowerPanel game={game} action={action} locked={locked}/>
  <FamiliarExplorePanel game={game} action={action} locked={locked}/>
  <FamiliarDispatchPanel game={game} action={action} locked={locked}/>
 </PanelPages></section>;
}
