import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,SAVE_KEY} from '../lib/game.mjs';
import {FELLOWS} from '../lib/catalog.mjs';import {FRONTIER,frontierState,frontierKey} from '../lib/frontier.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null,now=s.lastAt)=>{const r=act(s,a,now,t,v);assert.ok(!r.error,`${a}: ${r.error}`);assert.ok(valid(r.state));return r.state};
function legacy(){const s=fresh(1000);s.adventure.cleared=30;s.gold=100000;const ids=['hero_15',...FELLOWS.filter(f=>f.id!=='hero_15').slice(0,2).map(f=>f.id)];for(const id of ids)s.fellows[id]={...s.fellows.hero_15,level:30,breaks:1,aptitude:100};s.adventure.party=ids;return s;}
function finish(s){while(s.frontier.active){const a=s.frontier.active,e=FRONTIER[a.encounter-1],id=a.party.find(id=>!e.distinct||!a.used.includes(id));s=run(s,'frontierWave',id,frontierKey(a));}return s;}
test('legacy30 opens separately; all styles and chapter rewards persist exactly once',()=>{
 let s=legacy();const old=structuredClone(s.adventure),inv={...s.inventory},gold=s.gold,xp=s.fellowXP;
 assert.equal(decode(JSON.stringify(s)).frontier,undefined);for(const e of FRONTIER){s=run(s,'startFrontier',e.id);s=finish(s);s=decode(JSON.stringify(s));assert.deepEqual(s.adventure,old);assert.ok(act(s,'startFrontier',s.lastAt,e.id).error);}
 assert.equal(s.frontier.cleared,12);assert.equal(s.inventory.local_limit_token,inv.local_limit_token+9);assert.equal(s.crystals,150);assert.equal(s.fellowXP,xp+FRONTIER.reduce((n,e)=>n+e.rewards.xp,0));assert.equal(s.gold,gold+FRONTIER.reduce((n,e)=>n+e.rewards.gold-e.entry,0));
});
test('waves pin party, reject stale requests and repeat leaders; retreat changes attempt key',()=>{
 let s=run(legacy(),'startFrontier',1);const key=frontierKey(s.frontier.active),id=s.adventure.party[0];s=run(s,'frontierWave',id,key);assert.ok(act(s,'frontierWave',s.lastAt,id,key).error);s=run(s,'retreatFrontier');s=run(s,'startFrontier',1);assert.notEqual(frontierKey(s.frontier.active),key);assert.ok(act(s,'frontierWave',s.lastAt,id,key).error);
 s=run(s,'party',id);assert.ok(s.frontier.active.party.includes(id));s=finish(s);s.frontier={policyVersion:1,cleared:4,attempts:1,active:null};s.adventure.party=Object.keys(s.fellows);s=run(s,'startFrontier',5);s=run(s,'frontierWave',id,frontierKey(s.frontier.active));assert.ok(act(s,'frontierWave',s.lastAt,id,frontierKey(s.frontier.active)).error);
 const bad=structuredClone(s);bad.frontier.active.wave=3;assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));
});
test('final reward overflow and failed storage admission retain wave without granting reward',()=>{
 let s=run(legacy(),'startFrontier',1);s=run(s,'frontierWave',s.adventure.party[0],frontierKey(s.frontier.active));const id=s.adventure.party[0],key=frontierKey(s.frontier.active);
 const full={...s,fellowXP:1e9};const refused=act(full,'frontierWave',full.lastAt,id,key);assert.ok(refused.error);assert.equal(refused.state.frontier.cleared,0);
 let raw=JSON.stringify(s),blocked=false;const storage={getItem:()=>raw,setItem:(k,v)=>{if(blocked)throw Error('Quota');if(k===SAVE_KEY)raw=v;}};const p=createPersistence(()=>storage);p.load(s.lastAt);const reward=act(p.current,'frontierWave',s.lastAt,id,key).state;blocked=true;assert.throws(()=>p.commit(reward));assert.equal(p.current.frontier.cleared,0);assert.equal(decode(raw).frontier.cleared,0);blocked=false;p.load(s.lastAt);p.commit(act(p.current,'frontierWave',s.lastAt,id,key).state);assert.equal(decode(raw).frontier.cleared,1);assert.equal(decode(raw).fellowXP,s.fellowXP+3000);assert.ok(act(p.current,'frontierWave',s.lastAt,id,key).error);
});
test('fresh player reaches all chapters through ordinary income, stages, supplies, training and patrols',()=>{
 let s=fresh(1000);assert.ok(act(s,'startFrontier',1000,1).error);s=run(s,'collect',null,null,s.lastAt+28800000);
 for(const f of FELLOWS.filter(f=>f.id!=='hero_15').slice(0,2)){s=run(s,'recruit',f.id);s=run(s,'party',f.id);}
 const ids=[...s.adventure.party];for(const id of ids)for(let i=0;i<90;i++){s=run(s,'buySupply','Item_Talent_Hero_1');s=run(s,'aptitude',id);}
 for(let stage=1;stage<=30;stage++){s=run(s,'battle',stage);for(const id of ids){const r=act(s,'train',s.lastAt,id,'max');if(!r.error)s=r.state;}}
 for(const id of ids){while(s.fellows[id].level<20){s=run(s,'patrol',30);const r=act(s,'train',s.lastAt,id,'max');if(!r.error)s=r.state;}s=run(s,'limitBreak',id);let guard=0;while(s.fellows[id].level<30&&guard++<200){s=run(s,'patrol',30);const r=act(s,'train',s.lastAt,id,'max');if(!r.error)s=r.state;}assert.equal(s.fellows[id].level,30);}
 for(const e of FRONTIER){s=run(s,'startFrontier',e.id);s=finish(s);}assert.equal(s.frontier.cleared,12);assert.ok(valid(decode(JSON.stringify(s))));
});
test('type advantage affects effective Power and insufficient wave Power spends nothing',async()=>{
 const {frontierPower}=await import('../lib/frontier.mjs');const {fellowById}=await import('../lib/catalog.mjs');let s=run(legacy(),'startFrontier',1),a=s.frontier.active;const {bondedPower}=await import('../lib/adventure.mjs');for(const id of a.party){const base=a.party.reduce((n,f)=>n+bondedPower(s,f),0);assert.equal(frontierPower(s,a,id),Math.floor(base*(fellowById(id).type==='Inspiring'?1.25:1)));}
 for(const id of a.party)s.fellows[id]={...s.fellows[id],level:1,aptitude:10};const r=act(s,'frontierWave',s.lastAt,a.party[0],frontierKey(a));assert.ok(r.error);assert.deepEqual(r.state,s);
});
