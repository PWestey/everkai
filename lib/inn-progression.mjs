import data from './inn-progression-data.json' with {type:'json'};
import {INN_BASE_STAMINA} from './inn-economy.mjs';
export const innRating=i=>data.ratingThresholds.filter(n=>(i.popularity||0)>=n).length;
/** BUG-23: ratingStamina is SimGame1Level.energyLimit for levels 2..21, so Everkai rating R is original
 *  level R+1 and rating 0 is original LEVEL 1 -- whose energyLimit is 10, not 20. The old fallback of 20
 *  gave a brand-new Inn double the original's starting stamina. Only the unrated case moves; every
 *  rating from 1 up already read the original's own ladder and is unchanged. */
export const innStaminaCap=i=>data.ratingStamina[innRating(i)-1]||INN_BASE_STAMINA;
export const nextInnRating=i=>data.ratingThresholds[innRating(i)]??null;
export function innServingGains(i,dish){
 const station=data.recipeStations[dish],level=i.stations[station];
 return {finesse:data.finesseByLevel[level-1]??1,popularity:data.popularity[station]?.[level]??0};
}
export function innServingCoverage(i,dish){const station=data.recipeStations[dish],level=i.stations[station];return {finesse:data.finesseByLevel[level-1]!==undefined,popularity:data.popularity[station]?.[level]!==undefined};}
