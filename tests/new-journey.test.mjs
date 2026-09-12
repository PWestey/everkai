import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,valid,settle,newJourney,startingSave,SAVE_KEY} from '../lib/game.mjs';import {createPersistence} from '../lib/persistence.mjs';
const T=new Date('2026-09-10T09:00:00').getTime();
const play=()=>{let s=fresh(T);let r=act(s,'habitSave',T,null,{title:'Morning walk',freq:'daily',domain:'health'});assert(!r.error,r.error);s=r.state;
 r=act(s,'habitComplete',T,s.habits.items.at(-1).id);assert(!r.error,r.error);s=r.state;
 r=act(s,'welcome',T,'wife_3');assert(!r.error,r.error);s=r.state;
 r=act(s,'roamGo',T,null,{seq:0,roll:.42});assert(!r.error,r.error);return r.state};

test('a new journey keeps the habit journal and resets everything else',()=>{const played=play(),base=startingSave(T+1000),next=newJourney(played,T+1000);
 assert.deepEqual(next.habits,played.habits);
 const strip=x=>{const {habits,...rest}=x;return rest};
 assert.deepEqual(strip(next),strip(base));
 assert.equal(next.roaming,undefined);
 // The played save welcomed wife_3; a new journey drops her and keeps only the starter picks.
 assert.equal(next.family.wife_3,undefined);assert.deepEqual(next.family,base.family);
 assert.deepEqual(Object.keys(next.fellows),Object.keys(base.fellows));
 assert.deepEqual(Object.keys(next.fellows),['hero_15','hero_195']);
 assert.equal(next.gold,base.gold);assert.equal(next.lastAt,T+1000);
 assert.ok(valid(next));assert.deepEqual(decode(JSON.stringify(next)),next);
 // A journey started from a save with no journal is exactly a starting save.
 assert.deepEqual(newJourney(fresh(T),T+1000),startingSave(T+1000));});

test('a new journey settles and persists, keeping the previous save as a backup',()=>{const played=play(),store=new Map([[SAVE_KEY,JSON.stringify(played)]]);
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(k,v)}},p=createPersistence(()=>storage);
 p.load(T+1000);const saved=p.restore(newJourney(played,T+2000),T+2000);
 assert.deepEqual(saved,settle(newJourney(played,T+2000),T+2000));
 assert.deepEqual(JSON.parse(store.get(SAVE_KEY+'-before-restore')).family,played.family);
 assert.deepEqual(decode(store.get(SAVE_KEY)).habits.items,played.habits.items);
 const restored=decode(store.get(SAVE_KEY));
 assert.equal(restored.family.wife_3,undefined,'the played save\'s Family does not survive a new journey');
 assert.deepEqual(Object.keys(restored.family),['wife_191'],'only the starter pick remains');});
