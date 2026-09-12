import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {BANQUET_SHOP,banquetState,banquetPurchasePlan} from '../lib/banquets.mjs';
import {HIRE_CARDS,hireCardCount} from '../lib/hire-cards.mjs';
const T=new Date('2026-09-19T09:00:00').getTime();
const card=HIRE_CARDS[0];
const row=BANQUET_SHOP.find(r=>r.id===card.id);
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
/** A save holding banquet coins, which is what the shop spends. */
const withCoins=(coins=1000)=>{const s=fresh(T),b=banquetState(s);return {...s,banquets:{...b,coins}};};
// The shop is the fall-through of banquetBuy, after the prepare/host and claim branches return.
const buy=(s,quantity=1)=>run(s,'banquetBuy',card.id,{seq:banquetState(s).seq,quantity});

test('Basic Hire Cards are bought, never taken',()=>{
 const s=fresh(T);
 assert.equal(hireCardCount(s,card.id),0);
 assert.throws(()=>act(s,'claimHireCards',T,card.id),/Unknown action/,'the free Hire Card faucet is gone');});

test('the banquet shop stocks the card at a real price',()=>{
 assert.ok(row,'Basic Hire Card is a shop row');
 assert.equal(row.price,150);
 assert.equal(row.dailyLimit,5);});

test('a purchase spends coins and lands in Staffing, not the Bag',()=>{
 let s=withCoins(1000);
 const plan=banquetPurchasePlan(s,card.id,1);
 assert.equal(plan.quantity,1);assert.equal(plan.cost,150);
 s=buy(s);
 assert.equal(hireCardCount(s,card.id),1);
 assert.equal(banquetState(s).coins,850);
 assert.equal(s.inventory[card.id],undefined,'hire cards are not Bag items');
 const receipt=banquetState(s).purchases.at(-1);
 assert.equal(receipt.itemId,card.id);
 assert.equal(receipt.destination,'staffing');
 assert.equal(receipt.paid,150);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('the daily allowance caps the run, and coins still have to cover it',()=>{
 let s=withCoins(1000);
 for(let n=0;n<row.dailyLimit;n++)s=buy(s);
 assert.equal(hireCardCount(s,card.id),row.dailyLimit);
 assert.equal(banquetPurchasePlan(s,card.id,1).quantity,0,'the daily allowance is spent');
 assert.ok(act(s,'banquetBuy',s.lastAt,card.id,{seq:banquetState(s).seq,quantity:1}).error);
 const broke=withCoins(row.price-1);
 assert.equal(banquetPurchasePlan(broke,card.id,1).quantity,0,'coins have to cover the price');});
