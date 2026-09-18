import {validSpecialBlessings} from './special-blessings.mjs';
import source from './original-blessing-data.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import {originalCharacter} from './original-catalog.mjs';
import {isAddition,additionKind,additionRecipients} from './everkai-additions.mjs';
import {affinityIds,hasAffinity} from './public-reference.mjs';
// Early complete rows transcribed from https://isekai.wiki/Family, checked 2026-09-07.
// Values are totals at each level, not amounts to accumulate at every upgrade.
export const BLESSINGS={
 flatBlessing:{name:'Fellow Blessing',values:[0,1000,1700,2600,3700,5050,6650,8450,10500,12700,15200,17890,20800,24000,27300,30900,34790,38790,43100,47600,52300,57300,62400,67800,73500,79300,85400,91700,98200,105000,112000,119000,127000,134000,142000,150000,159000],costs:[0,100,110,120,130,140,155,170,185,200,215,235,255,275,295,315,335,355,375,395,415,440,465,490,515,540,565,590,615,640,665,695,725,755,785,815,850]},
 advancedBlessing:{name:'Advanced Blessing',values:[0,.005,.01,.015,.02,.025,.03,.035,.04,.045,.05,.055,.06,.065,.07,.075,.08,.085,.09,.095,.10,.105,.11,.115,.12],costs:[0,500,550,600,650,700,755,810,865,920,975,1030,1080,1140,1190,1250,1310,1370,1430,1490,1550,1610,1680,1740,1810]}
};
export const blessingLevel=(f,key)=>f[key]||0;
const sourceValue=(key,level)=>level===0?0:key==='flatBlessing'?source.rows[level].flat:source.rows[level].percent/10000;
/** Whom this Family member's blessings support. A crossover Family member reads her OWN authored list
 *  in BOTH modes: she has no row in lib/original-blessing-data.json (which is pinned to the 107
 *  originals) and no affinity record in lib/public-roster.json, so without this she supports nobody and
 *  `blessingAction` refuses outright. See docs/crossover-family-plan.md 2.4. */
export const blessingRecipients=(s,id)=>isAddition(id)?additionRecipients(id):originalProgression(s)?source.recipients[id]||[]:affinityIds(id);
/** Does `family` support Fellow `fellow`? The default-mode gate, additions-aware. */
const supports=(family,fellow)=>isAddition(family)?additionRecipients(family).includes(fellow):hasAffinity(family,fellow);
/** Which LADDER this member climbs. The APK one is a property of the save AND of the member: an
 *  addition stays on the shipped default 36/24 ladder in both modes, so `id` has to reach the cost and
 *  value functions. Omitting it keeps the old behaviour exactly, which is what the original 107 want. */
const apkLadder=(s,id)=>originalProgression(s)&&!isAddition(id);
export const blessingValue=(f,key)=>{const h=f.apkBlessings?.[key];return h?h.value+sourceValue(key,blessingLevel(f,key))-sourceValue(key,h.level):BLESSINGS[key].values[blessingLevel(f,key)];};
export const nextBlessingCost=(f,key,s=null,id=null)=>{const level=blessingLevel(f,key);return apkLadder(s,id)?level>=700?null:source.rows[Math.max(1,level)][key==='flatBlessing'?'flatCost':'percentCost']:BLESSINGS[key].costs[level+1]??null;};
export const nextBlessingValue=(s,f,key,id=null)=>apkLadder(s,id)?blessingValue(f,key)+sourceValue(key,blessingLevel(f,key)+1)-sourceValue(key,blessingLevel(f,key)):BLESSINGS[key].values[blessingLevel(f,key)+1];
export const blessingPower=(s,id)=>Object.entries(s.family).reduce((total,[family,f])=>{
 for(const key of Object.keys(BLESSINGS)){const h=f.apkBlessings?.[key],field=key==='flatBlessing'?'flat':'percent';if(h){if(h.legacyRecipients.includes(id))total[field]+=h.value;if(h.recipients.includes(id))total[field]+=sourceValue(key,blessingLevel(f,key))-sourceValue(key,h.level);}else if(supports(family,id))total[field]+=blessingValue(f,key);}return total;
},{flat:0,percent:0});
/** May `x` be a blessing recipient? The old rule was `startsWith('hero_') && originalCharacter(x)`
 *  alone, which made a crossover FELLOW impossible to bless in APK mode: an addition resolves through
 *  the additions data, not the APK index. This is that rule OR'd with additionKind==='fellows', so it
 *  is strictly wider. Deliberately NOT `fellowById`, which is narrower -- the APK index holds hero ids
 *  that never reached the 159-Fellow catalogue and affinityIds legitimately names some of them.
 *  Exported because no shipped list names a crossover Fellow yet, so this rule is the only place the
 *  behaviour can be observed or negative-controlled (docs/crossover-family-plan.md D6). */
export const blessingRecipientId=x=>typeof x==='string'&&((x.startsWith('hero_')&&!!originalCharacter(x))||additionKind(x)==='fellows');
export function validBlessings(s){return validSpecialBlessings(s)&&Object.entries(s.family).every(([id,f])=>{
 // An addition never gains an apkBlessings record (blessingAction below), so holding one is not a
 // legal state: it is the only way her level could exceed the default ladder's 36/24.
 if(f.apkBlessings!==undefined&&(isAddition(id)||!originalProgression(s)||!f.apkBlessings||Array.isArray(f.apkBlessings)||typeof f.apkBlessings!=='object'||Object.keys(f.apkBlessings).some(k=>!BLESSINGS[k])))return false;
 return Object.entries(BLESSINGS).every(([key,r])=>{const level=blessingLevel(f,key),h=f.apkBlessings?.[key];if(!Number.isInteger(level)||level<0||level>700)return false;if(!h)return level<r.values.length;
 if(h.policyVersion!==1||!Number.isInteger(h.level)||h.level<0||h.level>=r.values.length||h.value!==r.values[h.level]||!Array.isArray(h.receipts)||!h.receipts.length||h.receipts.length>700)return false;
 // The length, uniqueness and snapshot-equality checks around blessingRecipientId are untouched.
 const ids=a=>Array.isArray(a)&&a.length<=300&&new Set(a).size===a.length&&a.every(blessingRecipientId);if(!ids(h.legacyRecipients)||!ids(h.recipients)||!h.recipients.length||JSON.stringify(h.recipients)!==JSON.stringify(source.recipients[id]))return false;
 let n=h.level;for(const x of h.receipts){if(!x||x.from!==n||!Number.isInteger(x.to)||x.to<=n||x.to>700)return false;let cost=0;for(let l=n;l<x.to;l++)cost+=source.rows[Math.max(1,l)][key==='flatBlessing'?'flatCost':'percentCost'];if(x.cost!==cost)return false;n=x.to;}return n===level;
 });
});}
export function blessingAction(s,action,target,key){
 if(!['trainBlessing','trainBlessingsMax'].includes(action))return null;
 const fail=error=>({state:s,error}),f=s.family[target];
 if(!f||!Object.hasOwn(BLESSINGS,key))return fail('Choose a family member and a blessing.');
 const recipients=blessingRecipients(s,target);if(!recipients.length)return fail('No supported ungated Fellows are available for new blessings.');
 const plan=blessingPlan(f,key,s,action==='trainBlessing'?1:700,target);if(!plan.count)return fail('No affordable supported upgrades remain.');
 // No apkBlessings record for an addition, in EITHER mode: with none, validBlessings:23 enforces
 // `level < r.values.length`, i.e. the shipped default 36/24 ladder (+159,000 flat, +12% Power). The
 // APK ladder is 101.6x larger and is already a 32x strand before crossovers touch it
 // (docs/crossover-family-plan.md 2.6), so it is a bad place to spend the accepted headroom.
 let extra={};if(originalProgression(s)&&!isAddition(target)){const old=f.apkBlessings?.[key]||{policyVersion:1,level:blessingLevel(f,key),value:blessingValue(f,key),legacyRecipients:[...affinityIds(target)],recipients:[...recipients],receipts:[]};extra={apkBlessings:{...f.apkBlessings,[key]:{...old,receipts:[...old.receipts,{from:blessingLevel(f,key),to:plan.level,cost:plan.cost}]}}};}
 return {state:{...s,family:{...s.family,[target]:{...f,...extra,[key]:plan.level,points:f.points-plan.cost}}},message:`${BLESSINGS[key].name}: ${plan.count} upgrades for ${plan.cost.toLocaleString()} Blessing Points.`};
}
export function blessingPlan(f,key,s=null,max=700,id=null){
 let level=blessingLevel(f,key),cost=0,count=0;
 while(count<max){const price=nextBlessingCost({...f,[key]:level},key,s,id);if(price===null||cost+price>f.points)break;cost+=price;level++;count++;}
 return {level,cost,count};
}
