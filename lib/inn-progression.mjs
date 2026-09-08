import data from './inn-progression-data.json' with {type:'json'};
export const innRating=i=>data.ratingThresholds.filter(n=>(i.popularity||0)>=n).length;
export const innStaminaCap=i=>data.ratingStamina[innRating(i)-1]||20;
export const nextInnRating=i=>data.ratingThresholds[innRating(i)]??null;
export function innServingGains(i,dish){
 const station=data.recipeStations[dish],level=i.stations[station];
 return {finesse:data.finesseByLevel[level-1]??1,popularity:data.popularity[station]?.[level]??0};
}
export function innServingCoverage(i,dish){const station=data.recipeStations[dish],level=i.stations[station];return {finesse:data.finesseByLevel[level-1]!==undefined,popularity:data.popularity[station]?.[level]!==undefined};}
