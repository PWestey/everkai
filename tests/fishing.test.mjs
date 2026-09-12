import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';import {fishingState,castKey,fishingBonus} from '../lib/fishing.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,id=null)=>{const r=act(s,a,s.lastAt,id);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
// Legacy v54 fixture: preserve three-species policy1 receipts across expansion.
function catchMany(count=6){const s=fresh(1000),fish=[['F1101','Aquafrog','Inspiring',15000,5000],['F1102','Snakehead','Diligent',15000,5000],['F1103','Carp',null,3000,1000]];s.fishing={bait:20-count,catches:Array.from({length:count},(_,n)=>{const [id,name,type,flat,increment]=fish[n%3];return {id:`catch:${n+1}`,fish:id,name,type,flat,increment,caughtAt:1000,policyVersion:1,duplicate:n>=3}}),displayed:[],researched:[],skills:{},points:0};assert.ok(valid(s));return s;}

test('cast receipts, first collection, display activation and research close durable reward loop',()=>{
 let s=catchMany();assert.equal(s.fishing.bait,14);assert.equal(s.fishing.catches.length,6);assert.equal(s.fishing.catches[0].duplicate,false);assert.equal(s.fishing.catches[3].duplicate,true);const receipt=structuredClone(s.fishing.catches[0]);
 s=run(s,'openEnterprise','Building_101');const before=totalRate(s);s=run(s,'displayFish','F1103');assert.equal(fishingBonus(s,'hero_15'),3000);assert.ok(totalRate(s)>before);
 for(const id of ['catch:4','catch:5'])s=run(s,'researchFish',id);s=run(s,'upgradeFish','F1103');assert.equal(s.fishing.points,0);assert.equal(fishingBonus(s,'hero_15'),4000);s=run(s,'removeFish','F1103');assert.equal(fishingBonus(s,'hero_15'),0);assert.equal(s.fishing.skills.F1103,2);s=run(s,'displayFish','F1103');assert.equal(fishingBonus(s,'hero_15'),4000);assert.deepEqual(s.fishing.catches[0],receipt);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('typed bonus, stale casts, research duplication, corrupt state and old-rate settlement',()=>{
 let s=catchMany();s=run(s,'recruit','hero_1');s=run(s,'displayFish','F1102');assert.equal(fishingBonus(s,'hero_1'),15000);assert.equal(fishingBonus(s,'hero_15'),0);const old=totalRate(s);const next=act(s,'displayFish',11000,'F1103').state;assert.equal(next.pending,s.pending+10*old);
 assert.ok(act(s,'castFish',1000,'cast:1').error);assert.ok(act(s,'researchFish',1000,'catch:1').error);s=run(s,'researchFish','catch:4');assert.ok(act(s,'researchFish',1000,'catch:4').error);assert.ok(act(s,'upgradeFish',1000,'F1102').error);
 for(const change of [{points:999},{displayed:['F1101','F1101']},{researched:['catch:1']},{skills:{F1101:4}},{catches:[{...s.fishing.catches[0],id:'catch:2'}]}]){const bad={...s,fishing:{...s.fishing,...change}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 assert.deepEqual(decode(JSON.stringify(fresh(1000))),fresh(1000));
});
test('failed cast or research write cannot admit partial bait spend or duplicate reward',()=>{
 let raw=JSON.stringify(catchMany()),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('full');raw=v}}));p.load(1000);
 for(const [a,t] of [['castFish',castKey(p.current)],['researchFish','catch:4']]){const before=raw;fail=true;assert.throws(()=>p.commit(run(p.current,a,t)));assert.equal(raw,before);fail=false;p.load(1000);p.commit(run(p.current,a,t));p.load(1000);}
 assert.equal(p.current.fishing.catches.length,7);assert.equal(p.current.fishing.bait,14);assert.equal(p.current.fishing.points,1);
});
import {FISH,fishingBonuses} from '../lib/fishing.mjs';import {fellowById} from '../lib/catalog.mjs';
test('history crosses1000 intact, research cannot regrant, and failed overflow save remains recoverable',()=>{
 let s=catchMany(3);const base=s.fishing.catches;s.fishing={bait:20,catches:Array.from({length:1000},(_,n)=>({...base[n%3],id:`catch:${n+1}`,duplicate:n>=3})),displayed:['F1103'],researched:['catch:4','catch:5'],skills:{F1103:2},points:0};assert.ok(valid(s));const history=JSON.stringify(s.fishing.catches),bonus=fishingBonus(s,'hero_15');
 let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('storage full');raw=v}}));p.load(1000);const before=raw;fail=true;assert.throws(()=>p.commit(run(p.current,'castFish',castKey(p.current))));assert.equal(raw,before);fail=false;p.load(1000);p.commit(run(p.current,'castFish',castKey(p.current)));p.load(1000);s=p.current;assert.equal(s.fishing.catches.length,1001);assert.equal(s.fishing.catches.at(-1).policyVersion,2);assert.equal(JSON.stringify(s.fishing.catches.slice(0,1000)),history);assert.equal(fishingBonus(s,'hero_15'),bonus);assert.equal(s.fishing.points,0);assert.ok(act(s,'researchFish',1000,'catch:4').error);assert.equal(s.fishing.bait,20);
});
test('all86 complete normal effects are catchable; type/rarity scope and values apply once',()=>{
 let s=fresh(1000);assert.equal(FISH.length,86);for(let n=0;n<FISH.length;n++){s=run(s,'castFish',castKey(s));}assert.equal(new Set(s.fishing.catches.map(c=>c.fish)).size,86);assert.ok(!s.fishing.catches.some(c=>c.fish==='F3506'));
 for(const c of s.fishing.catches)s=run(s,'displayFish',c.fish);for(const id of ['hero_15','hero_1','hero_117']){const p=fellowById(id),expected={flat:0,aptitude:0,percent:0};for(const c of s.fishing.catches){const e=c.effect;if((!e.type||e.type===p.type)&&(!e.rarities.length||e.rarities.includes(p.rarity)))expected[e.kind]+=e.initial;}assert.deepEqual(fishingBonuses(s,id),expected);}assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('new effect display, research upgrade and removal settle income at previous rate',()=>{
 let s=run(fresh(1000),'openEnterprise','Building_101');for(let n=0;n<88;n++){s=run(s,'castFish',castKey(s));}
 const row=FISH.find(r=>r.effect.kind==='percent'&&!r.effect.rarities.length&&(!r.effect.type||r.effect.type==='Unfettered'));const transition=(a,id)=>{const old=totalRate(s),pending=s.pending;const result=act(s,a,s.lastAt+1000,id);assert.ok(!result.error,result.error);assert.equal(result.state.pending,pending+old);s=result.state;assert.ok(valid(s));};transition('displayFish',row.id);s=run(s,'researchFish','catch:87');s=run(s,'researchFish','catch:88');transition('upgradeFish',row.id);transition('removeFish',row.id);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('historical effect values are used for display/research upgrades, not only stored',()=>{
 let s=catchMany(6);s.fishing.catches=s.fishing.catches.map(c=>c.fish==='F1103'?{...c,flat:1234,increment:7}:c);s=run(s,'displayFish','F1103');assert.equal(fishingBonus(s,'hero_15'),1234);for(const id of ['catch:4','catch:5'])s=run(s,'researchFish',id);s=run(s,'upgradeFish','F1103');assert.equal(fishingBonus(s,'hero_15'),1241);s=decode(JSON.stringify(s));s=run(s,'removeFish','F1103');s=run(s,'displayFish','F1103');assert.equal(fishingBonus(s,'hero_15'),1241);
 const current=structuredClone(s);current.fishing.catches=current.fishing.catches.map(c=>({id:c.id,fish:c.fish,name:c.name,caughtAt:c.caughtAt,duplicate:c.duplicate,policyVersion:2,effect:{kind:'flat',type:c.type,rarities:[],initial:c.flat,increment:c.increment}}));assert.ok(valid(current));assert.equal(fishingBonus(current,'hero_15'),1241);assert.deepEqual(decode(JSON.stringify(current)),current);
});
