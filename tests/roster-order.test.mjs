import test from 'node:test';import assert from 'node:assert/strict';
import {rosterOrder,rosterStep} from '../lib/roster-filter.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {startingSave} from '../lib/game.mjs';
import {bondedPower,newFellow} from '../lib/adventure.mjs';

test('joined Fellows sort by the Power their character screen shows, strongest first, then the rest',()=>{
 const s=startingSave(Date.UTC(2026,8,16));
 const ids=FELLOWS.slice(0,6).map(f=>f.id);
 s.fellows={};ids.slice(0,4).forEach((id,i)=>{s.fellows[id]={...newFellow(),level:[5,40,1,20][i]}});
 const order=rosterOrder(FELLOWS,s.fellows,id=>bondedPower(s,id)).map(f=>f.id);
 const powers=order.slice(0,4).map(id=>bondedPower(s,id));
 assert.deepEqual([...powers].sort((a,b)=>b-a),powers,'descending Power');
 assert.ok(powers[0]>powers[3],'positive control: the levels chosen really give different Power');
 assert.deepEqual(new Set(order.slice(0,4)),new Set(ids.slice(0,4)),'joined first');
 assert.deepEqual(order.slice(4),FELLOWS.map(f=>f.id).filter(id=>!ids.slice(0,4).includes(id)),'not joined keep catalogue order');
 assert.equal(order.length,FELLOWS.length);
});

test('Family sort by Blessing Power; ties keep catalogue order; arrows wrap through the same order',()=>{
 const owned={[FAMILY[0].id]:{blessingPower:3},[FAMILY[1].id]:{blessingPower:9},[FAMILY[2].id]:{blessingPower:3}};
 const order=rosterOrder(FAMILY,owned,id=>owned[id].blessingPower);
 assert.deepEqual(order.slice(0,3).map(f=>f.id),[FAMILY[1].id,FAMILY[0].id,FAMILY[2].id]);
 assert.equal(rosterStep(order,FAMILY[1].id,-1),order.at(-1).id,'previous from the strongest wraps to the end');
 assert.equal(rosterStep(order,order.at(-1).id,1),FAMILY[1].id,'next from the end wraps to the strongest');
 assert.equal(rosterStep(order,FAMILY[1].id,1),FAMILY[0].id);
});

// The owner reported the roster "doesn't organize by power": it did, but tiles showed only the level, so a
// strong low-level Fellow above a weak high-level one looked unsorted. The roster now shows the number it
// sorts by and offers a sort menu; these pin every mode.
import {rosterSort,rarityRank} from '../lib/roster-filter.mjs';
test('the roster sort menu orders joined characters by the chosen key, then the rest',()=>{
 const E=[{id:'a',name:'Zed',rarity:'SR'},{id:'b',name:'Amy',rarity:'SSR -> UR'},{id:'c',name:'Moe',rarity:'N'},{id:'d',name:'Kit',rarity:'UR'}];
 const owned={a:{level:300},b:{level:10},c:{level:600}};
 const power={a:50,b:900,c:20};
 const ids=m=>rosterSort(E,owned,m,{power:id=>power[id]}).map(f=>f.id);
 assert.deepEqual(ids('power'),['b','a','c','d'],'Power: strongest first, even when the level says otherwise');
 assert.deepEqual(ids('level'),['c','a','b','d'],'Level: highest first');
 assert.deepEqual(ids('rarity'),['b','a','c','d'],'Rarity reads the head of a chain: SSR > SR > N');
 assert.deepEqual(ids('name'),['b','c','a','d'],'Name: alphabetical');
 // Not-joined always trail in catalogue order, whatever the mode.
 for(const m of ['power','level','rarity','name'])assert.equal(ids(m).at(-1),'d',m);
 // Negative controls: the modes really differ on this fixture, and an unknown rarity sorts last.
 assert.notDeepEqual(ids('power'),ids('level'));
 assert.equal(rarityRank('???'),-1);assert.ok(rarityRank('LR')>rarityRank('UR'));});
