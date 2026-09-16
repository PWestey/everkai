import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,VALIDATORS,refusedBy,QUARANTINABLE,lastQuarantine} from '../lib/game.mjs';
import {readFileSync} from 'node:fs';
import {validMine,mineState,MINE_ROWS} from '../lib/mine-clearance.mjs';
import {FARM_MAX_PLOTS} from '../lib/farm.mjs';

// A REAL PLAYER'S SAVE STOPPED LOADING because of the mine import on 2026-09-16, and nothing here
// caught it. The import checked that the eight original ROWS were byte-identical and concluded "no save
// migration" -- which was true of the rows and false of the save, because the validator does not compare
// rows. It compares `after` against min(TOTAL, before+power), and TOTAL is the SUM of the rows: it moved
// from 3,530,000 to 41,678,127,000 when 72 more were added. Every receipt written by a Fellow strong
// enough to bottom out the old mine had stored `after` at the old cap, and every one of them was
// suddenly wrong.
//
// The lesson this file exists to hold: a DERIVED value can break saves even when every source row is
// untouched. Widening a table is not automatically backward compatible.
const T=new Date('2026-09-16T09:00:00').getTime();
const LEGACY_TOTAL=3530000;

// The legacy bottom is row 8's cumulativePower -- derived from the shipped table, not typed in, so this
// fixture stays honest if the first eight rows ever move.
// Derived from the save, not typed in: a fresh village owns hero_15 (Kaity), not hero_1.
const OWNER=Object.keys(fresh(T).fellows)[0];
const LEGACY_ROWS=MINE_ROWS.slice(0,8);
const sum=(k)=>LEGACY_ROWS.reduce((n,r)=>n+r[k],0);
const legacyReceipt=(after,power)=>({
 policyVersion:1,id:1,day:Math.floor(T/86400000),at:T,owner:OWNER,power,before:0,after,
 kills:LEGACY_ROWS.map(r=>({order:r.order,power:r.power,gold:r.gold,fellowEXP:r.fellowEXP,mineCoin:r.mineCoin})),
 gold:sum('gold'),fellowEXP:sum('fellowEXP'),coins:sum('mineCoin')});
const withMine=(r)=>({...fresh(T),mineClearance:{policyVersion:1,seq:1,coins:r.coins,exchanges:[],history:[r]}});

test('a mine receipt clamped to the OLD 8-row total still loads',()=>{
 assert.equal(LEGACY_TOTAL,MINE_ROWS[7].cumulativePower,'the old bottom is row 8 cumulative');
 // Exactly the shape the live save held: a Fellow strong enough to clear the whole old mine, so `after`
 // was pinned to the old total instead of to before+power.
 const power=LEGACY_TOTAL+2_000_000;
 const s=withMine(legacyReceipt(LEGACY_TOTAL,power));
 assert.equal(validMine(s),true,'the historical cap is accepted');
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s,'and it round-trips untouched, not rewritten');});

test('the exemption is exactly one value, so a tampered receipt still fails',()=>{
 const TOTAL=MINE_ROWS.at(-1).cumulativePower;
 assert.ok(TOTAL>LEGACY_TOTAL*1000,`the table really did widen: ${LEGACY_TOTAL} -> ${TOTAL}`);
 const power=LEGACY_TOTAL+2_000_000;
 // NEGATIVE CONTROLS: one either side of the historical value, and a short-changed receipt.
 assert.equal(validMine(withMine(legacyReceipt(LEGACY_TOTAL,power))),true,'the one historical value');
 assert.equal(validMine(withMine(legacyReceipt(LEGACY_TOTAL-1,power))),false,'one below it');
 assert.equal(validMine(withMine(legacyReceipt(LEGACY_TOTAL+1,power))),false,'one above it');
 assert.equal(validMine(withMine(legacyReceipt(0,power))),false);});

test('a receipt cannot claim the old cap without having reached it',()=>{
 // The allowance is conditional on actually overshooting: a Fellow who could not reach the old bottom
 // may not claim it, so the exemption cannot be used to mint depth.
 assert.equal(validMine(withMine(legacyReceipt(LEGACY_TOTAL,10))),false,'10 power cannot land on the old bottom');});

test('a fresh save still round-trips, so the exemption changed nothing else',()=>{
 const s=fresh(T);
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(mineState(s).history.length,0);});

// A SECOND LOCKOUT FROM THE SAME DAY, same shape as the mine one: for about two hours the farm shipped
// with 40 plots (read off SimGame3Farmland) before the decompiled client corrected it to SimGame3Field's
// 12. validFarm caps plots at FARM_MAX_PLOTS, so a save written in that window is refused outright.
// The cap is right; refusing the save is not. Trim and load.
test('a save with more plots than the cap is trimmed, not refused',()=>{
 const plots=n=>({...fresh(T),farm:{knowledge:0,harvests:{},plots:Array(n).fill(null)}});
 for(const n of [FARM_MAX_PLOTS+1,20,40]){
  const back=decode(JSON.stringify(plots(n)));
  assert.equal(back.farm.plots.length,FARM_MAX_PLOTS,`${n} plots trimmed to the cap`);
  assert.ok(valid(back));
 }
 // Inert at or under the cap: a normal save must not be rewritten.
 for(const n of [1,3,FARM_MAX_PLOTS]){
  const s=plots(n);
  assert.deepEqual(decode(JSON.stringify(s)),s,`${n} plots left exactly as they were`);
 }
 // The crop on a surviving plot is untouched -- trimming takes from the end only.
 const withCrop=plots(FARM_MAX_PLOTS+3);
 withCrop.farm.plots[0]={plant:'Plant1',harvestLevel:1,readyAt:T+60000,watered:false};
 const back=decode(JSON.stringify(withCrop));
 assert.deepEqual(back.farm.plots[0],withCrop.farm.plots[0],'plot 1 kept its crop');});

// WHEN A SAVE IS REFUSED, THE PLAYER MUST BE TOLD BY WHAT. decode() names most subtrees individually
// ("Invalid Museum collection.") but ends in a composite valid() of 40 terms that named nothing -- a
// real save hit exactly that path and the message was "This is not a compatible village save.", which
// is true and useless. VALIDATORS is the same list, named, so the refusal can say which term said no.
//
// The hole that would make this LIE is a term added to valid() and not to VALIDATORS, so that is what
// this pins: the two are compared by reading valid()'s own source.
test('every term valid() composes is named in VALIDATORS',()=>{
 const src=readFileSync(new URL('../lib/game.mjs',import.meta.url),'utf8');
 const body=src.match(/export function valid\(s\)\{return ([^}]*)\}/);
 assert.ok(body,'the valid() extractor has drifted; fix it rather than deleting this test');
 const terms=[...new Set([...body[1].matchAll(/(valid[A-Za-z0-9]+)\(s\)/g)].map(m=>m[1]))];
 assert.ok(terms.length>=30,`read only ${terms.length} terms from valid()`);
 assert.deepEqual(terms.sort(),Object.keys(VALIDATORS).sort(),
  'valid() and VALIDATORS disagree -- a refused save would name the wrong system, or none');});

test('refusedBy names the system, and says nothing about a healthy save',()=>{
 const s=fresh(T);
 assert.equal(refusedBy(s),'','a healthy save is refused by nothing');
 // A deliberately broken subtree must be named, not merely detected.
 assert.equal(refusedBy({...s,version:9}),'validV4');
 assert.equal(refusedBy({...s,helper:{tasks:{nosuch:1},ranAt:0}}),'validHelper');
 // The thrown message carries the name -- but only where the quarantine below cannot recover the save.
 // A broken OPTIONAL subtree is now dropped instead of thrown, so the throw path is tested with the
 // core village shape, which is deliberately not quarantinable.
 try{decode(JSON.stringify({...s,bonds:null}));assert.fail('should have thrown')}
 catch(e){assert.match(e.message,/Refused by: valid/)}
 // A validator that THROWS is reported rather than crashing the load path.
 assert.match(refusedBy({...s,fellows:null}),/^valid/);});

// THE POINT OF THE QUARANTINE: a village must not be lost because one subsystem is malformed. After
// every targeted repair has run, if the save would still be REFUSED ENTIRELY, drop the smallest thing
// that makes it loadable and say so. Losing the Familiars is bad; losing the village is worse.
test('a malformed optional subtree is dropped, and the village survives',()=>{
 const s={...fresh(T),gold:123456,crystals:77};
 const broken={...s,helper:{tasks:{nosuchchore:1},ranAt:0}};
 assert.equal(valid(broken),false,'the fixture really is refused');
 const back=decode(JSON.stringify(broken));
 assert.ok(valid(back));
 assert.deepEqual(lastQuarantine,['helper'],'and it named what it dropped');
 assert.equal(back.gold,123456,'the village came through');
 assert.equal(back.crystals,77);
 assert.equal(Object.keys(back.fellows).length,Object.keys(s.fellows).length);});

test('a healthy save is never quarantined, and the core is never dropped',()=>{
 const s=fresh(T);
 const back=decode(JSON.stringify(s));
 assert.deepEqual(lastQuarantine,[],'nothing dropped from a good save');
 assert.deepEqual(back,s,'and it is byte-identical');
 // The core village shape is NOT quarantinable: a broken one must still be refused, not silently reset.
 assert.equal(QUARANTINABLE.includes('bonds'),false);
 assert.equal(QUARANTINABLE.includes('fellows'),false);
 assert.equal(QUARANTINABLE.includes('habits'),false,'the habit journal is never dropped');
 assert.throws(()=>decode(JSON.stringify({...s,bonds:null})),/Refused by: validBonds/);});

test('every quarantinable subtree really is optional',()=>{
 // The list is only safe if dropping any member leaves a valid save. Checked rather than asserted,
 // because a wrong entry here would delete a subtree that the engine still requires.
 const s=fresh(T);
 for(const key of QUARANTINABLE){
  const without={...s};delete without[key];
  assert.equal(refusedBy(without),'',`dropping ${key} left the save invalid`);
 }
 assert.ok(QUARANTINABLE.length>=30,`only ${QUARANTINABLE.length} subtrees listed`);});
