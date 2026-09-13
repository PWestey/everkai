import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid,settle} from '../lib/game.mjs';
import {funded,costOf} from './gear-fixtures.mjs';

// The four accumulate-then-claim surfaces, pinned AS THEY ARE TODAY. This is a characterisation
// test, not an aspiration: it records that the four claims DISAGREE about the wallet ceiling, and
// deliberately does NOT assert which value is right -- that is an open owner decision.
//
// Money accrues somewhere the player cannot spend it, then a button moves it into a wallet. Each of
// the four does that, and each caps it differently:
//   collect            lib/game.mjs      village gold   clamps PARTIALLY at 1e12
//   collectInnDeposit  lib/inn.mjs       village gold   REFUSES outright at 1e9
//   potionCollect      lib/apothecary.mjs village gold   clamps PARTIALLY at 1e9, and is {seq}-guarded
//   collectWorkshop    lib/workshop.mjs  Workshop wallet REFUSES outright at 1e9, never touching gold
//
// Three use 1e9 while the wallet they pay into is bounded at 1e12 by `collect` and by the milestone
// `claim` (game.mjs:184). The measurable consequence is pinned below: a player past 1e9 gold keeps
// collecting village income up to 1e12, but can never collect Inn or Apothecary earnings again.
// Whether the fix is to raise three caps or lower one is not this file's call; noticing a silent
// change to any of them is.

const LIB=new URL('../lib/',import.meta.url);
const read=f=>readFileSync(new URL(f,LIB),'utf8');
const NOW=1000;
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
const refused=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(r.error,`${a} was expected to refuse, but succeeded`);return r.error};

/** The four claims, each with the module that handles it and the wallet it pays into. */
const SITES=[
 {claim:'collect',          module:'game.mjs',       wallet:'gold'},
 {claim:'collectInnDeposit',module:'inn.mjs',        wallet:'gold'},
 {claim:'potionCollect',    module:'apothecary.mjs', wallet:'gold'},
 {claim:'collectWorkshop',  module:'workshop.mjs',   wallet:'workshop.wallet'},
];

/** A claim's own branch text: from its `action==='x'` test to the next action branch. Bounded at the
 *  next `if(action===` on purpose -- a fixed-width window would spill into the following branch and
 *  attribute ITS cap to this claim. collectWorkshop is exactly that case: `buyWorkshopPearl` carries
 *  its own 1e9 about sixty characters later. */
function branchOf(site){
 const src=read(site.module),i=src.indexOf(`action==='${site.claim}'`);
 if(i<0)return null;
 const rest=src.slice(i),j=rest.indexOf('if(action===',1);
 return j<0?rest.slice(0,400):rest.slice(0,j);
}
/** Every distinct wallet-ceiling literal inside that branch. */
const capsOf=site=>{const b=branchOf(site);return b===null?null:[...new Set([...b.matchAll(/\b1e(?:12|9)\b/g)].map(m=>m[0]))]};

// ---------------------------------------------------------------------------------------------
// Extractor guard FIRST. Everything below reads lib source as text; a drifted pattern would let the
// cap table pass while asserting nothing at all.
// ---------------------------------------------------------------------------------------------

test('the cap extractor still works (a drifted pattern must fail loudly, not pass vacuously)',()=>{
 for(const site of SITES){
  const branch=branchOf(site);
  assert.ok(branch,`no \`action==='${site.claim}'\` branch in lib/${site.module}; the pattern has drifted`);
  // A branch that collapses to almost nothing means the slice found the literal in a comment or an
  // includes() list rather than the handler, and would carry no cap at all.
  assert.ok(branch.length>80,`${site.claim}'s branch extracted only ${branch.length} chars from lib/${site.module}`);
  assert.ok(capsOf(site).length,`${site.claim} branch carries no 1e9/1e12 ceiling; the cap pattern has drifted`);
 }
 // The bound must not leak the NEXT branch's cap into this one. buyWorkshopPearl follows
 // collectWorkshop and has its own 1e9, so the workshop branch must stop before reaching it.
 assert.ok(!branchOf(SITES[3]).includes('buyWorkshopPearl'),'the branch bound leaked into the next action');
});

test('each claim declares exactly one ceiling, and they do not agree: 1e12, 1e9, 1e9, 1e9',()=>{
 // The EXPECTED side is written out by hand on purpose. A test that read the cap from source on both
 // sides would pass unchanged through any value change -- the exact failure that let "away earnings
 // capped to eight hours" survive the move to twelve hours.
 assert.deepEqual(SITES.map(capsOf),[['1e12'],['1e9'],['1e9'],['1e9']],
  'the four claim ceilings have moved. This test does not say which value is correct -- it says a '
  +'change to any of them must be deliberate. Update the expectation WITH the decision, not before it.');
 // Stated as a count too, so the inconsistency itself is the thing under guard rather than a side
 // effect of four independent literals that happen to differ today.
 const caps=SITES.map(s=>capsOf(s)[0]);
 assert.equal(caps.filter(c=>c==='1e9').length,3,'three claims cap at 1e9');
 assert.equal(caps.filter(c=>c==='1e12').length,1,'one claim caps at 1e12');
 // ...and the wallet three of them pay into is bounded at 1e12 everywhere else it is credited.
 assert.match(read('game.mjs'),/gold:Math\.min\(1e12,s\.gold\+m\.reward\.gold\)/,'milestone claim no longer bounds gold at 1e12');
});

// ---------------------------------------------------------------------------------------------
// Fixtures. Each opens one claim surface and lets it accumulate exactly one payout.
// ---------------------------------------------------------------------------------------------

/** An open Inn that has served one guest: 50 gold sitting in the Inn's own deposit. */
function inn(){
 let s=funded(fresh(NOW),costOf('Building_101'));
 for(const [a,t,v] of [['openEnterprise','Building_101'],['openInnService'],['developInnRecipe','57'],['receiveInnGuests','57',1]])s=run(s,a,t,v);
 return settle(s,NOW+10000);
}
/** An open Workshop with one finished product: 3,600 coins in the Workshop deposit. */
function workshop(){
 let s=funded(fresh(NOW));
 for(const [a,t] of [['openEnterprise','Building_301'],['openWorkshop'],['recruit','hero_1']])s=run(s,a,t);
 return settle(run(s,'startWorkshop','2001',{fellow:'hero_1',count:1}),NOW+300000);
}
/** An open Apothecary whose free starter bottle has sold: 10 gold in the counter's deposit. */
const potion=()=>settle(run(fresh(NOW),'apothecaryOpen'),NOW+20000);
/** potionCollect is optimistic-concurrency guarded, so every call carries the counter's seq. */
const collectPotion=s=>run(s,'potionCollect',null,{seq:s.apothecary.seq});

test('all four claims exist and move accrued earnings into a wallet',()=>{
 const i=inn();          assert.equal(i.inn.deposit,50);
 assert.equal(run(i,'collectInnDeposit').gold,i.gold+50);
 const w=workshop();     assert.equal(w.workshop.deposit,3600);
 assert.equal(run(w,'collectWorkshop').workshop.wallet,3600);
 const p=potion();       assert.equal(p.apothecary.deposit,10);
 assert.equal(collectPotion(p).gold,p.gold+10);
 const v={...fresh(NOW),pending:100};
 assert.equal(run(v,'collect').gold,v.gold+100);
 // An empty till refuses rather than paying nothing quietly, at all four.
 assert.match(refused(run(i,'collectInnDeposit'),'collectInnDeposit'),/No Inn earnings/);
 assert.match(refused(run(w,'collectWorkshop'),'collectWorkshop'),/No Workshop coins/);
 const drained=collectPotion(p);
 assert.match(refused(drained,'potionCollect',null,{seq:drained.apothecary.seq}),/deposit is empty/);
});

test('collectWorkshop is the only one that does not pay into village gold',()=>{
 // The Workshop keeps its own wallet, spent only by buyWorkshopPearl. So its 1e9 cap is a bound on a
 // different currency than the other three, which is why "three of four use 1e9" is not the whole story.
 const w=workshop(),after=run(w,'collectWorkshop');
 assert.equal(after.gold,w.gold,'collectWorkshop must not touch village gold');
 assert.equal(after.workshop.wallet,3600);
 for(const [before,after2] of [[inn(),s=>run(s,'collectInnDeposit')],[potion(),collectPotion]])
  assert.ok(after2(before).gold>before.gold,'the other three pay into village gold');
});

// ---------------------------------------------------------------------------------------------
// The caps, exercised. Each number below was measured by running this code.
// ---------------------------------------------------------------------------------------------

test('collect clamps PARTIALLY at 1e12, paying what fits and leaving the rest pending',()=>{
 const s={...fresh(NOW),gold:1e12-5,pending:100};
 assert.ok(valid(s));
 const after=run(s,'collect');
 assert.equal(after.gold,1e12);          // filled exactly to the ceiling
 assert.equal(after.pending,95);         // and the remainder is kept, not burned
 assert.ok(valid(after));
 // At the ceiling it pays nothing but still succeeds -- collect has no refusal branch at all.
 const full=run({...s,gold:1e12},'collect');
 assert.equal(full.gold,1e12);assert.equal(full.pending,100);
});

test('potionCollect clamps PARTIALLY at 1e9, and refuses only once the wallet is genuinely full',()=>{
 const s={...potion(),gold:1e9-3};
 const after=collectPotion(s);
 assert.equal(after.gold,1e9);                    // three of the ten fit
 assert.equal(after.apothecary.deposit,7);        // and seven are kept on the counter
 assert.ok(valid(after));
 assert.match(refused(after,'potionCollect',null,{seq:after.apothecary.seq}),/wallet is full/);
});

test('collectInnDeposit is ALL-OR-NOTHING at 1e9: it pays zero where potionCollect would pay a part',()=>{
 // The sharpest form of the inconsistency. Same wallet headroom, same deposit, opposite behaviour.
 const headroom=3,deposit=10;
 const i={...inn(),gold:1e9-headroom,inn:{...inn().inn,deposit}};   // deposit seeded, not served
 assert.ok(valid(i));
 assert.match(refused(i,'collectInnDeposit'),/Make room for the full deposit/);
 const p={...potion(),gold:1e9-headroom};
 assert.equal(p.apothecary.deposit,deposit);
 assert.equal(collectPotion(p).gold,1e9);          // the Apothecary banks the 3 that fit
 assert.equal(collectPotion(p).apothecary.deposit,deposit-headroom);
 // ...and the Inn's till is untouched by the refusal, so nothing is lost -- only stranded.
 assert.equal(i.inn.deposit,deposit);
});

test('collectWorkshop is ALL-OR-NOTHING at 1e9 against the Workshop wallet, not against gold',()=>{
 const w=workshop();
 const tight={...w,workshop:{...w.workshop,wallet:1e9-1000}};        // 3,600 due, 1,000 of room
 assert.ok(valid(tight));
 assert.match(refused(tight,'collectWorkshop'),/Spend wallet coins/);
 // Village gold is irrelevant to it: a maxed-out gold wallet does not block a Workshop collection.
 const richInGold={...w,gold:1e12};
 assert.equal(run(richInGold,'collectWorkshop').workshop.wallet,3600);
});

test('potionCollect alone is {seq}-guarded, so a stale control cannot claim the deposit twice',()=>{
 const p=potion(),seq=p.apothecary.seq;
 const after=collectPotion(p);
 assert.equal(after.apothecary.seq,seq+1);
 // Replaying the pre-collection request -- a double tap, or a restored older screen -- is refused.
 assert.match(refused(after,'potionCollect',null,{seq}),/changed\. Use its current controls/);
 // The other three carry no such guard; they are idempotent only because the till is emptied.
 for(const [state,action] of [[inn(),'collectInnDeposit'],[workshop(),'collectWorkshop']])
  assert.ok(!branchOf(SITES.find(x=>x.claim===action)).includes('seq'),`${action} has gained a seq guard`);
});

test('THE INCONSISTENCY, measured: past 1e9 gold two claims die while village income keeps paying',()=>{
 // Not a style complaint. At 2e9 gold -- reachable, since collect itself allows up to 1e12 -- the Inn
 // and the Apothecary are permanently uncollectable, and their tills fill and stop. This is the
 // player-visible consequence of the caps disagreeing, and it is what must not change silently.
 const rich=2e9;
 const v={...fresh(NOW),gold:rich,pending:100};
 assert.equal(run(v,'collect').gold,rich+100,'village gold still collects far above 1e9');

 const i={...inn(),gold:rich};
 assert.match(refused(i,'collectInnDeposit'),/Make room for the full deposit/);

 const p={...potion(),gold:rich};
 assert.match(refused(p,'potionCollect',null,{seq:p.apothecary.seq}),/wallet is full/);

 const w={...workshop(),gold:rich};
 assert.equal(run(w,'collectWorkshop').workshop.wallet,3600,'the Workshop is unaffected: separate wallet');

 // Stated once more as the contract, so the shape of the disagreement is legible without reading the
 // assertions above: at 2e9 gold, two of the three gold-paying claims are dead.
 const dead=[['collectInnDeposit',i,null],['potionCollect',p,{seq:p.apothecary.seq}]]
  .filter(([a,s,v2])=>act(s,a,s.lastAt,null,v2).error).map(([a])=>a);
 assert.deepEqual(dead,['collectInnDeposit','potionCollect']);
});
