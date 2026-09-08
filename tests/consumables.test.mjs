import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {CONSUMABLES as ALL_CONSUMABLES,V7_ITEMS} from '../lib/adventure.mjs';
import {usableCount} from '../lib/consumables.mjs';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import itemArt from '../lib/item-art.mjs';
const CONSUMABLES=ALL_CONSUMABLES.filter(i=>!['gold','points'].includes(i.stat));
test('v7 migration preserves every existing item and progression while new supplies start empty',()=>{
 const old=act(fresh(0),'welcome',0).state;old.version=7;
 old.inventory=Object.fromEntries(Object.entries(old.inventory).filter(([id])=>id.startsWith('gift')||V7_ITEMS.some(i=>i.id===id)));
 old.inventory.Item_Weapon_Equipment_1_1=8;old.family.wife_2.intimacy=72;old.fellowXP=771;
 const s=decode(JSON.stringify(old));assert.ok(valid(s));for(const [id,n] of Object.entries(old.inventory))assert.equal(s.inventory[id],n);
 for(const i of CONSUMABLES)assert.equal(s.inventory[i.id],0);
 for(const k of ['fellows','family','bonds','adventure','school','gold','fellowXP'])assert.deepEqual(s[k],old[k]);
});
test('every imported consumable applies its exact full effect and survives reload',()=>{
 assert.equal(CONSUMABLES.length,14);let s=act(fresh(0),'welcome',0).state;
 for(const i of CONSUMABLES){const snapshot=structuredClone(s),grant=act(s,'claimConsumable',0,i.id);assert.equal(grant.state.gold,s.gold);assert.equal(grant.state.crystals,s.crystals);assert.deepEqual(s,snapshot);s=grant.state;
 const before=i.target==='family'?s.family.wife_2[i.stat]:s[i.stat];const r=act(s,'useConsumable',0,i.id,{count:10,recipient:'wife_2'});assert.ok(!r.error);s=r.state;
 assert.equal(i.target==='family'?s.family.wife_2[i.stat]:s[i.stat],before+i.amount*10);assert.equal(s.inventory[i.id],0);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);}
 assert.equal(s.stats.gifts,100);
});
test('bulk use conserves items at caps and never discards a partial effect',()=>{
 let s=act(fresh(0),'welcome',0).state;
 for(const i of CONSUMABLES){s.inventory[i.id]=100;const cap=i.target==='family'?1e6:1e9;
 if(i.target==='family')s.family.wife_2[i.stat]=cap-i.amount*2-1;else s[i.stat]=cap-i.amount*2-1;
 assert.equal(usableCount(s,i,'wife_2'),2);const r=act(s,'useConsumable',0,i.id,{count:'all',recipient:'wife_2'});assert.ok(!r.error);s=r.state;assert.equal(s.inventory[i.id],98);assert.equal(usableCount(s,i,'wife_2'),0);
 const denied=act(s,'useConsumable',0,i.id,{count:1,recipient:'wife_2'});assert.ok(denied.error);assert.deepEqual(denied.state,s);assert.ok(valid(s));}
});
test('invalid quantities, missing recipients, empty bags and unknown IDs cannot grant effects',()=>{
 const s=fresh(0),xp=CONSUMABLES[0],gift=CONSUMABLES.find(i=>i.target==='family');s.inventory[xp.id]=10;s.inventory[gift.id]=10;
 for(const [id,value] of [[xp.id,{count:0}],[xp.id,{count:-1}],[xp.id,{count:1.5}],[xp.id,{count:1e9}],[gift.id,{count:1,recipient:'wife_2'}],['unknown',{count:1}],[xp.id,null]]){const r=act(s,'useConsumable',0,id,value);assert.ok(r.error);assert.deepEqual(r.state,s);}
 s.inventory[xp.id]=0;assert.ok(act(s,'useConsumable',0,xp.id,{count:1}).error);
 const malformed=structuredClone(s);delete malformed.inventory[xp.id];assert.throws(()=>decode(JSON.stringify(malformed)));
 const extra=structuredClone(s);extra.inventory.unknown=1;assert.throws(()=>decode(JSON.stringify(extra)));
});
test('numeric effects remain linked to the literal original text, with no random ranges or event Energy',()=>{
 for(const i of CONSUMABLES){assert.ok(i.sourceKeys.includes('Item:description:'+i.id));assert.ok(!i.description.includes('{'));const pattern=i.target==='player'?/Used to obtain ([\d,]+) Fellow EXP\./:/(?:Intimacy|Blessing Power).*? by (\d+)\./i;assert.equal(Number(i.description.match(pattern)[1].replaceAll(',','')),i.amount);}
 assert.deepEqual(CONSUMABLES.filter(i=>i.target==='player').map(i=>i.amount),[2500,10000,50000,250000]);
 assert.ok(!CONSUMABLES.some(i=>/Random|GetDE|Monopoly04/.test(i.id)));
});

test('original gift icons are complete, unchanged atlas crops with matching identifiers',()=>{
 const evidence=JSON.parse(readFileSync(new URL('../lib/item-art-evidence.json',import.meta.url)));
 assert.equal(Object.keys(itemArt).length,10);
 for(const [id,path] of Object.entries(itemArt)){const e=evidence[id];assert.equal(e.sprite.name,id.replace('Item_','Icon_'));assert.ok(CONSUMABLES.some(i=>i.id===id));assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+path,import.meta.url))).digest('hex'),e.sha256);assert.ok(e.width>0&&e.height>0);}
});
test('ordinary family gifts also preserve inventory if their full bonus cannot fit',()=>{
 const s=act(fresh(0),'welcome',0).state;s.family.wife_2.intimacy=999999;s.inventory.gift2=1;
 const r=act(s,'gift',0,'wife_2','gift2');assert.ok(r.error);assert.deepEqual(r.state,s);
});
