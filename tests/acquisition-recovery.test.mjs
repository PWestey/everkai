import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,SAVE_KEY,decode} from '../lib/game.mjs';
import {createPersistence} from '../lib/persistence.mjs';
function setup(){
 let saved=fresh(1000);saved=act(saved,'welcome',1000,'wife_2').state;
 saved.fellows.hero_15.level=9;saved.family.wife_2.intimacy=87;
 const values=new Map([[SAVE_KEY,JSON.stringify(saved)]]);
 const disk={fail:false,getItem:k=>values.get(k)??null,setItem(k,v){if(this.fail)throw new DOMException('Full','QuotaExceededError');values.set(k,v)}};
 const store=createPersistence(()=>disk);store.load(1000);return {disk,store};
}
for(const [action,id,key] of [['recruit','hero_1','fellows'],['welcome','wife_1','family']])test(`${action}: failed ownership write, explicit retry, reload and stale targeted request`,()=>{
 const {disk,store}=setup(),before=store.current,raw=disk.getItem(SAVE_KEY);
 const proposed=act(before,action,1000,id);assert.ok(!proposed.error);
 disk.fail=true;assert.throws(()=>store.commit(proposed.state));
 assert.equal(store.current,before);assert.equal(disk.getItem(SAVE_KEY),raw);assert.ok(!store.current[key][id]);
 disk.fail=false;assert.throws(()=>store.commit(proposed.state));
 const recovered=store.load(1000);assert.ok(!recovered[key][id]);
 store.commit(act(recovered,action,1000,id).state);
 const reloaded=createPersistence(()=>disk).load(1000);assert.ok(reloaded[key][id]);
 const stale=act(reloaded,action,1000,id);assert.ok(stale.error);assert.deepEqual(stale.state,reloaded);
 assert.deepEqual(reloaded.fellows.hero_15,before.fellows.hero_15);assert.deepEqual(reloaded.family.wife_2,before.family.wife_2);
 assert.equal(reloaded.gold,before.gold);
});
for(const action of ['recruitAll','welcomeAll'])test(`${action}: interrupted bulk grant is all-or-nothing and preserves existing progress`,()=>{
 const {disk,store}=setup(),before=store.current,raw=disk.getItem(SAVE_KEY),proposed=act(before,action,1000);
 assert.ok(!proposed.error);disk.fail=true;assert.throws(()=>store.commit(proposed.state));assert.equal(disk.getItem(SAVE_KEY),raw);
 disk.fail=false;const recovered=createPersistence(()=>disk);recovered.load(1000);assert.deepEqual(recovered.current,before);
 recovered.commit(act(recovered.current,action,1000).state);
 const loaded=createPersistence(()=>disk).load(1000);assert.deepEqual(loaded,decode(disk.getItem(SAVE_KEY)));
 assert.deepEqual(loaded.fellows.hero_15,before.fellows.hero_15);assert.deepEqual(loaded.family.wife_2,before.family.wife_2);
 for(const key of ['gold','inventory','bonds','buildings','adventure'])assert.deepEqual(loaded[key],before[key]);
 assert.ok(act(loaded,action,1000).error);
});
