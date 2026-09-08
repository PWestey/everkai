import test from 'node:test';import assert from 'node:assert/strict';
import {createPersistence} from '../lib/persistence.mjs';
import {fresh,act,SAVE_KEY,decode,settle} from '../lib/game.mjs';
function fixture(raw=JSON.stringify(fresh(1000))){const values=new Map(raw===null?[]:[[SAVE_KEY,raw]]);let fail=false,writes=0;
 return {values,get writes(){return writes},set fail(v){fail=v},getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw new DOMException('Full','QuotaExceededError');values.set(k,v);writes++}};
}
test('failed write never admits an action and blocks subsequent writes until recovery',()=>{
 const disk=fixture(),store=createPersistence(()=>disk),saved=store.load(1000),raw=disk.getItem(SAVE_KEY);
 const next=act(saved,'collect',1000).state;disk.fail=true;
 assert.throws(()=>store.commit(next));assert.equal(store.current,saved);assert.equal(store.blocked,true);assert.equal(disk.getItem(SAVE_KEY),raw);
 disk.fail=false;assert.throws(()=>store.commit(next));store.load(2000);
 assert.equal(store.current.gold,saved.gold);assert.equal(store.blocked,false);
 const reload=createPersistence(()=>disk);assert.equal(reload.load(2000).gold,saved.gold);
});
test('new game, migration backup and denied storage failures do not claim saved state',()=>{
 const disk=fixture(null);disk.fail=true;const store=createPersistence(()=>disk);
 assert.throws(()=>store.load(1000));assert.equal(store.current,null);assert.equal(store.blocked,true);
 const denied=createPersistence(()=>{throw new DOMException('Denied','SecurityError')});assert.throws(()=>denied.load(1000));assert.equal(denied.current,null);
 const old=JSON.stringify({version:1,level:1,gold:500,pending:0,lastAt:1000,earned:0,upgrades:0});const legacy=fixture(old);legacy.fail=true;
 assert.throws(()=>createPersistence(()=>legacy).load(1000));assert.equal(legacy.getItem(SAVE_KEY),old);
});
test('restore failure retains prior save, successful retry preserves its backup',()=>{
 const disk=fixture(),store=createPersistence(()=>disk),saved=store.load(1000),raw=disk.getItem(SAVE_KEY),other={...fresh(1000),gold:9000};
 disk.fail=true;assert.throws(()=>store.restore(other,1000));assert.equal(store.current,saved);assert.equal(disk.getItem(SAVE_KEY),raw);
 disk.fail=false;store.restore(other,1000);assert.equal(store.current.gold,9000);assert.equal(disk.getItem(SAVE_KEY+'-before-restore'),raw);
 assert.equal(createPersistence(()=>disk).load(1000).gold,9000);
});
test('clock previews require no writes and a later action recovers the same elapsed income',()=>{
 const disk=fixture(),store=createPersistence(()=>disk);store.load(1000);const writes=disk.writes;
 for(let n=1;n<=29;n++)settle(store.current,1000+n*1000);
 assert.equal(disk.writes,writes);assert.equal(store.current.lastAt,1000);
 const accepted=act(store.current,'collect',30000).state;store.commit(accepted);
 assert.deepEqual(decode(disk.getItem(SAVE_KEY)),accepted);
 assert.equal(createPersistence(()=>disk).load(30000).gold,accepted.gold);
});
test('corrupt saves are preserved and recovery cannot silently replace them',()=>{
 const disk=fixture('{broken'),store=createPersistence(()=>disk);assert.throws(()=>store.load(1000));assert.equal(disk.getItem(SAVE_KEY),'{broken');assert.equal(store.current,null);
 store.restore(fresh(1000),1000);assert.equal(disk.getItem(SAVE_KEY+'-before-restore'),'{broken');
});
test('Inn queued rewards and collection survive refusal/reload without duplicates',()=>{
 const disk=fixture(),store=createPersistence(()=>disk);let s=store.load(1000);
 for(const [action,target,value] of [['openEnterprise','Building_101'],['openInnService'],['developInnRecipe','57'],['receiveInnGuests','57',5]]){s=act(s,action,1000,target,value).state;store.commit(s);}
 const raw=disk.getItem(SAVE_KEY);disk.fail=true;assert.throws(()=>store.commit(settle(s,51000)));assert.equal(disk.getItem(SAVE_KEY),raw);assert.equal(store.current.inn.served,0);
 disk.fail=false;const recovered=store.load(51000);assert.equal(recovered.inn.served,5);assert.equal(recovered.inn.deposit,250);
 const collected=act(recovered,'collectInnDeposit',51000).state;disk.fail=true;assert.throws(()=>store.commit(collected));disk.fail=false;
 const retry=store.load(51000);assert.equal(retry.gold,recovered.gold);assert.equal(retry.inn.deposit,250);store.commit(act(retry,'collectInnDeposit',51000).state);
 const final=createPersistence(()=>disk).load(61000);assert.equal(final.gold,recovered.gold+250);assert.equal(final.inn.served,5);assert.equal(final.inn.deposit,0);
});
test('Workshop failed completion and wallet collection recover without duplicated coins or Sales EXP',()=>{
 const disk=fixture(),store=createPersistence(()=>disk);let s=store.load(1000);
 for(const [a,t,v] of [['openEnterprise','Building_301'],['openWorkshop'],['recruit','hero_1'],['startWorkshop','2001',{fellow:'hero_1',count:1}]]){s=act(s,a,1000,t,v).state;store.commit(s);}
 disk.fail=true;assert.throws(()=>store.commit(settle(s,301000)));assert.equal(store.current.workshop.deposit,0);disk.fail=false;
 const done=store.load(301000);assert.equal(done.workshop.deposit,3600);assert.equal(done.workshop.salesXP.hero_1,36);
 disk.fail=true;assert.throws(()=>store.commit(act(done,'collectWorkshop',301000).state));disk.fail=false;
 const recovered=store.load(301000);assert.equal(recovered.workshop.wallet,0);store.commit(act(recovered,'collectWorkshop',301000).state);
 const last=createPersistence(()=>disk).load(401000);assert.equal(last.workshop.wallet,3600);assert.equal(last.workshop.deposit,0);assert.equal(last.workshop.salesXP.hero_1,36);
});
test('failed Farm harvest cannot admit duplicate crops or Knowledge on reload',()=>{
 const disk=fixture(),store=createPersistence(()=>disk);let s=store.load(1000);
 for(const [a,t,v] of [['openFarm'],['sowFarm',0,'Plant1'],['waterFarm',0],['finishFarm',0]]){s=act(s,a,1000,t,v).state;store.commit(s);}
 disk.fail=true;assert.throws(()=>store.commit(act(s,'harvestFarm',1000,0).state));disk.fail=false;const recovered=store.load(1000);assert.equal(recovered.farm.harvests.Plant1,undefined);assert.equal(recovered.farm.knowledge,20);
 store.commit(act(recovered,'harvestFarm',1000,0).state);const last=createPersistence(()=>disk).load(2000);assert.equal(last.farm.harvests.Plant1,10);assert.equal(last.farm.knowledge,26);assert.equal(last.farm.plots[0],null);
});
test('Farm order and essence write refusal cannot consume crops or grant Aptitude twice',()=>{
 const disk=fixture(),store=createPersistence(()=>disk);let s=store.load(1000);
 for(const [a,t,v] of [['openFarm'],['recruit','hero_1'],['sowFarm',0,'Plant1'],['finishFarm',0],['harvestFarm',0]]){s=act(s,a,1000,t,v).state;store.commit(s);}
 disk.fail=true;assert.throws(()=>store.commit(act(s,'deliverFarmOrder',1000,0,'0:0').state));disk.fail=false;s=store.load(1000);assert.equal(s.farm.harvests.Plant1,10);assert.equal(s.farm.trade,undefined);
 s=act(s,'deliverFarmOrder',1000,0,'0:0').state;store.commit(s);s=act(s,'buyFarmEssence',1000,'SG3TalentCountry2').state;store.commit(s);
 disk.fail=true;assert.throws(()=>store.commit(act(s,'useFarmEssence',1000,'hero_1','SG3TalentCountry2').state));disk.fail=false;s=store.load(1000);assert.equal(s.fellows.hero_1.aptitude,10);assert.equal(s.farm.trade.essences.SG3TalentCountry2,1);
 store.commit(act(s,'useFarmEssence',1000,'hero_1','SG3TalentCountry2').state);const last=createPersistence(()=>disk).load(2000);assert.equal(last.fellows.hero_1.aptitude,11);assert.equal(last.farm.trade.essences.SG3TalentCountry2,0);
});
