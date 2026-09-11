import {applyStaticArt as staticArt} from './humanized-static.mjs';
import availability from './roster-availability.mjs';
import original from './original-content.mjs';
import {originalProfile} from './original-catalog.mjs';
import {referenceProfile} from './public-reference.mjs';
import overrides from './content-overrides.json' with {type:'json'};
// Characters Everkai does not ship. The extraction and render records still list them; the roster does not.
export const REMOVED=new Set(overrides.removed.map(r=>r.id));
const additions=(kind,existing)=>availability.filter(r=>r.status==='verified-base'&&r.id.startsWith(kind+'_')&&!existing.includes(r.id)&&!REMOVED.has(r.id)).map(r=>({id:r.id,art:r.art,portrait:r.art,specialty:null}));
// Stable source IDs remain separate from skins, ownership, and progression.
export const FELLOWS=[{id:'hero_15',art:'kaity-idle.webp',portrait:'kaity-still.webp',specialty:'fish'},{id:'hero_1',art:'fifi.webp',portrait:'fifi.webp',specialty:'inn'},{id:'hero_105',art:'augustine.webp',portrait:'augustine.webp',specialty:'garden'},...additions('hero',['hero_15','hero_1','hero_105'])].map(f=>({...f,...originalProfile(f.id),...referenceProfile(f.id)})).map(staticArt);
export const BUILDINGS=[{id:'fish',name:'Fish Stall',price:0,description:'Fresh catches for the village.'},{id:'inn',name:'Village Inn',price:400,description:'A warm welcome for passing travelers.'},{id:'garden',name:'Flower Shop',price:1000,description:'A little color for every home.'}];
export const fellowById=id=>FELLOWS.find(f=>f.id===id);
export const FAMILY=[{id:'wife_2',art:'charlotte.webp'},{id:'wife_3',art:'epona.webp'},...additions('wife',['wife_2','wife_3'])].map(f=>({...f,...originalProfile(f.id),...referenceProfile(f.id)})).map(staticArt);
// Names and gift effects verified in the local English translation table.
const giftPrices={gift1:100,gift2:200,gift3:100,gift4:200,gift5:500}; // Local prices; effects are imported.
export const GIFTS=original.gifts.map(g=>({...g,price:giftPrices[g.id]}));
