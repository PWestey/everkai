import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {validMine,mineState,MINE_ROWS} from '../lib/mine-clearance.mjs';

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
