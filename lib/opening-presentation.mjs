import data from './opening-presentation-data.json' with {type:'json'};
import {BUSINESSES} from './businesses.mjs';
import {INN_DISHES} from './inn.mjs';
import {medicineRule} from './medicine-discovery.mjs';
export const OPENING_SCENES=data.scenes;
export const OPENING_STORY_IDS=Object.values(data.links);
export const openingSceneId=owner=>data.links[owner]||null;
export const openingChapterName=id=>data.chapters[String(id)]||'Beyond the village';
export const openingCharacterScene=id=>OPENING_SCENES.find(s=>s.characterId===id)||null;
export function openingObjective(task){
 if(!task)return null;const r=task.taskReq,t=data.taskTemplates.find(t=>t.requirementType===r.type);if(!t)return null;
 const id=r.id==='Building_Bank'?'Farmstead':BUSINESSES.find(b=>b.id===r.id)?.name||(r.type==='StageClear'?r.id.replaceAll('-','·'):r.id)||'';
 const name=r.type==='SimGame1RecipeUnlockSpecify'?INN_DISHES.find(d=>d.id===r.id)?.name||'recipe '+r.id:id;
 const values={count:r.count??1,num:r.num??1,id,name,name1:'the recipe visitor',name2:medicineRule(r.id)?.name||'Medicine '+r.id};
 const text=t.text.replace(/\{(count|num|id|name|name1|name2)\}/g,(_,key)=>String(values[key]));
 const adapter=({BuildingLvupCount:'Farmstead progress uses your Fish Stall level.',CollectBuildingMoneyCount:'Counted here when you collect positive village Gold.',BuildingStar:'Use opening business stars in Workshop.',BuildingTotalStar:'Counted here as opening business stars.',ChildEducation:'Counted here as admitted lesson progress.',WifeQuench:'Use local Fathoms practice in Workshop.',MedicineUnlock:'The visitor label is local; current recipe access completes this objective.'})[r.type]||'';
 return {text,sourceKey:t.key,adapter};
}
