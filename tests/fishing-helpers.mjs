import {FISH} from '../lib/fishing.mjs';
// Casts now draw from the original rarity table, so a test that needs particular species builds the
// catch receipts a cast would have written, in the old FISH order, instead of casting for them.
export function withCatches(s,count){
 const f=s.fishing||{bait:20,catches:[],displayed:[],researched:[],skills:{},points:0},seen=new Set(f.catches.map(c=>c.fish)),catches=[...f.catches];
 for(let n=0;n<count;n++){const fish=FISH[catches.length%FISH.length];catches.push({id:`catch:${catches.length+1}`,fish:fish.id,name:fish.name,effect:{...fish.effect,rarities:[...fish.effect.rarities]},ground:fish.locations[0],caughtAt:s.lastAt,policyVersion:2,duplicate:seen.has(fish.id)});seen.add(fish.id);}
 return {...s,fishing:{...f,catches}};
}
