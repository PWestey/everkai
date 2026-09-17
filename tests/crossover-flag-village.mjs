// Child process for tests/everkai-additions.test.mjs: the catalogue reads ?crossover=1 once at import,
// so a flag-on village has to be built in its own process. Prints one JSON line.
globalThis.location={search:'?crossover=1'};
const T=new Date('2026-09-16T09:00:00').getTime();
const {startingSave,act,valid,refusedBy}=await import('../lib/game.mjs');
const {FELLOWS}=await import('../lib/catalog.mjs');
const {recruitOffers}=await import('../lib/summon.mjs');
const {bondedPower}=await import('../lib/adventure.mjs');
const {insightRule}=await import('../lib/insight.mjs');
const ids=['xover_msf_spiderman','xover_swgoh_vaderduelsend'];
const log=[];
let s=startingSave(T);
s={...s,fellowXP:1e9,inventory:{...s.inventory,Item_Talent_Hero_1:500},summon:{policyVersion:1,seq:0,stoneFragments:0,stones:5,insigniaFragments:0,valiant:5,archangel:0,starShards:0,days:[],weeks:[],recruited:[]}};
const offered=recruitOffers(s).filter(o=>ids.includes(o.id)).map(o=>({id:o.id,rarity:o.rarity,cost:o.cost}));
const step=(action,target,value)=>{const r=act(s,action,T,target,value);log.push({action,target,error:r.error||null,message:r.message||null});if(!r.error)s=r.state;return r};
for(const id of ids){
 step('summonRecruit',id,{seq:s.summon.seq});
 step('train',id,5);
 step('trainTalent',id,5);
 const rule=insightRule(id);
 if(rule){s={...s,insight:{balances:{...(s.insight?.balances||{}),[rule.materialId]:1000},levels:{...(s.insight?.levels||{})}}};step('trainInsight',id,1)}
}
step('activateOriginalProgression');
console.log(JSON.stringify({listed:FELLOWS.filter(f=>ids.includes(f.id)).map(f=>f.id),offered,log,valid:valid(s),refusedBy:refusedBy(s),
 fellows:Object.fromEntries(ids.map(id=>[id,s.fellows[id]||null])),power:Object.fromEntries(ids.map(id=>[id,s.fellows[id]?bondedPower(s,id):null])),save:JSON.stringify(s)}));
