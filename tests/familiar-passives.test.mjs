import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {STAT_PASSIVES,passiveStats} from '../lib/familiar-passives.mjs';import {familiarStats} from '../lib/familiars.mjs';import {towerBattle,towerKey} from '../lib/familiar-tower.mjs';import {fresh,act,decode,valid} from '../lib/game.mjs';import {createPersistence} from '../lib/persistence.mjs';
const team=['Pet_3191','Pet_8043501','Pet_8043502'].map(id=>({id,level:50,stars:0}));
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
test('25 literal self stat passives start at stage2 independent of stars; no base mutation',()=>{
 assert.equal(STAT_PASSIVES.length,25);
 for(const rule of STAT_PASSIVES)for(const stars of [0,1,100])for(const level of [49,50,150,250]){
  const p={id:rule.id,level,stars},base=familiarStats(p.id,p),copy=structuredClone(base),result=passiveStats(base,p);
  for(const field of ['ATK','HP','SPD'])assert.equal(result[field],level>=50&&field===rule.field?Math.floor(base[field]*(100+rule.percent)/100):base[field]);
  assert.deepEqual(base,copy);const initialized=passiveStats({...base,hp:base.HP},p);assert.equal(initialized.hp,initialized.HP);
 }
 const base={ATK:100,HP:100,SPD:100};assert.deepEqual(passiveStats(base,{id:'Guardian 1',level:500}),base);
});
test('frozen combat versions1–6 retain report hashes while v7 has separate initialized stats',()=>{
 const hashes=['6c5b63c1ae3e73f46e25df3768b08eb0fb5fadac24c32098ec9312db893cb1c4','6c5b63c1ae3e73f46e25df3768b08eb0fb5fadac24c32098ec9312db893cb1c4','6c5b63c1ae3e73f46e25df3768b08eb0fb5fadac24c32098ec9312db893cb1c4','16dbd890bd9f64f3df2a3975e8f5694c9316606217ed83789551adfe97ad523a','0ddd6f385b446d6e5e3dddc14843e32713b808cc63817a0431a3928c3bfe1724','2155590012276d53b546507958167a69c9a4cd4bea177ae1e237a0f687f78d7d'];
 hashes.forEach((h,i)=>assert.equal(createHash('sha256').update(JSON.stringify(towerBattle(10,team,i+1))).digest('hex'),h));
 const seven=towerBattle(10,team,7);assert.notDeepEqual(seven,towerBattle(10,team,6));assert.deepEqual(seven,towerBattle(10,team,7));
 const low=team.map(p=>({...p,level:49}));assert.deepEqual(towerBattle(10,low,7),towerBattle(10,low,6));
});
test('new battle save/retry uses v8 once and preserves training, binding and report snapshots',()=>{
 let s=run(fresh(1000),'adoptFamiliars');for(const p of team){for(let n=0;n<5;n++)s=run(s,'trainFamiliar',p.id,10);s=run(s,'towerParty',p.id);}
 let raw=JSON.stringify(s),fail=false;const storage=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');raw=v}}));storage.load(1000);const before=raw,after=run(storage.current,'towerFight',towerKey(storage.current));
 assert.equal(after.familiarTower.last.combatVersion,10);assert.deepEqual(after.familiars,s.familiars);assert.deepEqual(after.bonds,s.bonds);
 fail=true;assert.throws(()=>storage.commit(after));assert.equal(raw,before);fail=false;storage.load(1000);storage.commit(run(storage.current,'towerFight',towerKey(storage.current)));storage.load(1000);assert.deepEqual(storage.current.familiarTower,after.familiarTower);assert.deepEqual(decode(raw),storage.current);
});
