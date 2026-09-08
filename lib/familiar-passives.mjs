import data from './familiar-passive-data.json' with {type:'json'};
import {familiarStage} from './familiars.mjs';
export const STAT_PASSIVES=data.skills;
export const statPassive=id=>STAT_PASSIVES.find(p=>p.id===id)||null;
export function passiveStats(base,progress){
 const rule=statPassive(progress.id);
 if(!rule||familiarStage(progress.level)<rule.stage)return {...base};
 const value=Math.floor(base[rule.field]*(100+rule.percent)/100);
 return {...base,[rule.field]:value,...(rule.field==='HP'&&Object.hasOwn(base,'hp')?{hp:value}:{})};
}
