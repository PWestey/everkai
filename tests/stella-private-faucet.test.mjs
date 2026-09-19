import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The fixture's clock is UTC noon; nothing below reads a local day except the habit multiplier during
// settle, so the zone is pinned to what the fixture was written in (CI runs UTC; tests/power-pacing.test.mjs).
process.env.TZ='UTC';
import {decode,valid,refusedBy,act,settle,lastQuarantine} from '../lib/game.mjs';
import {bondedPower,powerParts} from '../lib/adventure.mjs';
import {stellaState,stellaEntry,stellaPlan,stellaRule,validStella,SPIRIT_SHARD_ITEM,LEGACY_OWNER_ITEMS,STELLA_ITEMS} from '../lib/stella.mjs';
import {CROSSOVER_SHARD_ITEM} from '../lib/crossover-stella.mjs';
import {HELPER_TASKS} from '../lib/helper.mjs';

// ---------------------------------------------------------------------------------------------------------------
// THE OWNER'S REPORT, 2026-09-19: "Why is a level 1 with no investment at 25 mil? Then Spider-Man at 5.2 mil?
// Then my level 319 UR at 2.2 mil?" -- Elise (hero_190, SR, Lv 1), Spider-Man (crossover, Lv 1), Neptune (UR).
//
// The fixture is that roster's shape, written by the PREVIOUS build (main f178138, scratchpad faucet/gen-owner.mjs,
// every step through act()): APK growth; Neptune (hero_195, a starter) trained to level 319 with no Stella; Elise and
// Spider-Man recruited at level 1; four idle days, which minted 2,000 of Elise's PRIVATE fragment for her alone;
// her whole ladder bought with them (20 ranks, 1,500 fragments, +15,300,000 flat); Spider-Man given 5 crossover
// ranks. Previous build's Power: Elise 15,329,160 at level 1, Spider-Man 7,887,000 at level 1, Neptune 749,860 at 319.
// ---------------------------------------------------------------------------------------------------------------
const RAW=readFileSync(new URL('./stella-owner-save-f178138.json',import.meta.url),'utf8');
const ELISE='hero_190',SPIDEY='xover_msf_spiderman',NEPTUNE='hero_195',OWN='Item_Owner_HeroPiece_190';
const run=(s,a,t,v)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a} ${t}: ${r.error}`);assert.ok(valid(r.state),refusedBy(r.state));return r.state;};
const stella=(id,s)=>HELPER_TASKS.find(t=>t.id==='stella').run(s,act,s.lastAt).state;

test('RULE 12: the owner-shaped save the previous build wrote decodes byte-identically and stays valid',()=>{
 const s=JSON.parse(RAW),t=s.stella;
 // Positive control: the fixture really holds what this change touches -- a private item in stock, in the idle
 // ledger, and named by paid receipts.
 assert.equal(t.stock[OWN],500);assert.equal(t.idle[OWN],2000);
 assert.equal(t.history.filter(r=>r.owner===ELISE&&r.level>0&&r.itemId===OWN).length,20);
 assert.equal(s.fellows[NEPTUNE].level,319);
 const back=decode(RAW);
 assert.equal(JSON.stringify(back),RAW,'byte-identical round trip');
 assert.deepEqual(lastQuarantine,[],'nothing quarantined');
 assert.ok(valid(back),refusedBy(back));
 // Power is derived, and nothing here changed how it is derived.
 assert.deepEqual([ELISE,SPIDEY,NEPTUNE].map(id=>bondedPower(back,id)),[15329160,7887000,749860]);
});

test('the private faucet is closed: another day mints the pool, never Elise’s own fragment',()=>{
 const s=decode(RAW),later=settle(s,s.lastAt+86400000),t=stellaState(later);
 assert.equal(t.stock[OWN],500,'her leftover stays');
 assert.equal(t.idle[OWN],2000,'and her idle ledger does not move');
 assert.ok(t.stock[SPIRIT_SHARD_ITEM]>stellaState(s).stock[SPIRIT_SHARD_ITEM],'the village pool accrues');
 assert.ok(t.stock[CROSSOVER_SHARD_ITEM]>stellaState(s).stock[CROSSOVER_SHARD_ITEM],'the crossover pool accrues');
 assert.ok(valid(later),refusedBy(later));
 // The faucet total, measured on this village: three streams a day before (village, crossover, Elise's own),
 // two after. Per day at the base rate that is 1,500 -> 1,000.
 const gained=Object.fromEntries(STELLA_ITEMS.map(k=>[k,(t.idle?.[k]||0)-(stellaState(s).idle?.[k]||0)]).filter(([,n])=>n));
 assert.deepEqual(Object.keys(gained).sort(),[SPIRIT_SHARD_ITEM,CROSSOVER_SHARD_ITEM].sort());
});

test('a formerly private ladder spends its own leftover first, then the pool, and refunds each to where it came from',()=>{
 let s=decode(RAW);
 // Refund all on Elise: 1,500 back to HER item (every receipt named it), none to the pool.
 const pool=stellaState(s).stock[SPIRIT_SHARD_ITEM];
 s=run(s,'refundFellow',ELISE);
 assert.equal(stellaState(s).stock[OWN],2000,'Refund returns her own fragments exactly');
 assert.equal(stellaState(s).stock[SPIRIT_SHARD_ITEM],pool,'and the pool is untouched');
 assert.equal(stellaEntry(s,ELISE).level,0);
 assert.equal(bondedPower(s,ELISE),18360,'Elise back to her own level-1 Power (the free activation stays)');
 // Own item first: with 2,000 of her own and 2,000 in the pool, her whole ladder comes out of her own.
 const plan=stellaPlan(s,ELISE,'max');
 assert.equal(plan.rows.length,20);assert.deepEqual(plan.paid,{[OWN]:1500});
 // Spend it down to a remainder too small for a row, then the pool pays the rest: mixed receipts, one item each.
 const drained={...s,stella:{...stellaState(s),stock:{...stellaState(s).stock,[OWN]:120},grants:stellaState(s).grants}};
 // (a hand-edit, so re-balance the ledger: the 1,880 difference becomes a converted amount -- see the next test)
 drained.stella.converted={[OWN]:1880};drained.stella.stock[SPIRIT_SHARD_ITEM]+=1880;
 assert.ok(valid(drained),refusedBy(drained));
 const mixed=stellaPlan(drained,ELISE,'max');
 assert.ok(mixed.paid[OWN]>0&&mixed.paid[SPIRIT_SHARD_ITEM]>0,JSON.stringify(mixed.paid));
 const bought=run(drained,'stellaUpgrade',ELISE,{seq:stellaState(drained).seq,count:'max'});
 const items=new Set(stellaState(bought).history.filter(r=>r.owner===ELISE&&r.level>0).map(r=>r.itemId));
 assert.deepEqual([...items].sort(),[OWN,SPIRIT_SHARD_ITEM].sort());
 // And Refund still balances with receipts in two items.
 const back=run(bought,'refundFellow',ELISE);
 assert.equal(stellaState(back).stock[OWN],120);
 assert.equal(stellaState(back).stock[SPIRIT_SHARD_ITEM],stellaState(drained).stock[SPIRIT_SHARD_ITEM]);
});

test('stellaConvert: a retired private fragment moves into the village pool 1:1, one way, and the ledger adds up',()=>{
 let s=run(decode(RAW),'refundFellow',ELISE);
 const pool=stellaState(s).stock[SPIRIT_SHARD_ITEM];
 s=run(s,'stellaConvert',OWN,{seq:stellaState(s).seq});
 assert.equal(stellaState(s).stock[OWN],0);
 assert.equal(stellaState(s).stock[SPIRIT_SHARD_ITEM],pool+2000);
 assert.deepEqual(stellaState(s).converted,{[OWN]:2000});
 assert.deepEqual(decode(JSON.stringify(s)),s,'round-trips');
 // Refusals: not a private item (the pool itself, a crossover shard, nonsense), nothing left, stale seq.
 for(const bad of [SPIRIT_SHARD_ITEM,CROSSOVER_SHARD_ITEM,'Item_Owner_HeroPiece_1'])
  assert.ok(act(s,'stellaConvert',s.lastAt,bad,{seq:stellaState(s).seq}).error,bad);
 assert.ok(act(s,'stellaConvert',s.lastAt,OWN,{seq:stellaState(s).seq}).error,'nothing left');
 assert.ok(act(s,'stellaConvert',s.lastAt,OWN,{seq:stellaState(s).seq-1}).error,'stale');
 assert.deepEqual([...LEGACY_OWNER_ITEMS].sort(),['Item_Owner_HeroPiece_190','Item_Owner_HeroPiece_52','Item_Owner_HeroPiece_54','Item_Owner_HeroPiece_56']);
 // The pool's 1e6 cap: only what fits moves.
 const full={...s,stella:{...stellaState(s),stock:{...stellaState(s).stock,[OWN]:10}}};full.stella.grants=[...full.stella.grants,{id:full.stella.seq+1,itemId:OWN,count:10,at:s.lastAt}];full.stella.seq++;
 const cap=1e6-full.stella.stock[SPIRIT_SHARD_ITEM];
 full.stella.grants.push({id:full.stella.seq+1,itemId:SPIRIT_SHARD_ITEM,count:cap-4,at:s.lastAt});full.stella.seq++;full.stella.stock[SPIRIT_SHARD_ITEM]+=cap-4;
 assert.ok(valid(full),refusedBy(full));
 const capped=run(full,'stellaConvert',OWN,{seq:full.stella.seq});
 assert.equal(stellaState(capped).stock[SPIRIT_SHARD_ITEM],1e6);assert.equal(stellaState(capped).stock[OWN],6);
});

test('NEGATIVE CONTROLS: the validator still bites on every new path',()=>{
 const r=run(decode(RAW),'refundFellow',ELISE);let s=run(r,'stellaConvert',OWN,{seq:stellaState(r).seq});
 s=decode(JSON.stringify(s));
 const t=stellaState(s);
 const bad=f=>{const x=structuredClone(s);f(x.stella);return validStella(x);};
 assert.equal(bad(t=>{t.converted[OWN]++;}),false,'converted more than was moved');
 assert.equal(bad(t=>{t.converted={[SPIRIT_SHARD_ITEM]:1};}),false,'converting the pool itself');
 assert.equal(bad(t=>{t.converted={[OWN]:0};}),false,'a zero conversion row');
 assert.equal(bad(t=>{t.converted=[];}),false,'wrong shape');
 assert.equal(bad(t=>{t.stock[OWN]=1;}),false,'private stock above its ledger');
 // A receipt may name its ladder's pool or ITS OWN old item -- never another ladder's old item.
 const bought=run(s,'stellaUpgrade',ELISE,{seq:t.seq,count:1});
 assert.equal(stellaState(bought).history.at(-1).itemId,SPIRIT_SHARD_ITEM,'no own item left, so the pool paid');
 const x=structuredClone(bought);x.stella.history.at(-1).itemId='Item_Owner_HeroPiece_54';
 assert.equal(validStella(x),false,'a receipt paid in another Fellow’s private fragment');
 assert.equal(validStella(bought),true,'positive control');
 assert.equal(stellaRule(ELISE).ownItemId,OWN);assert.equal(stellaRule(NEPTUNE).ownItemId,undefined);
});

test('the owner’s case after this change: the chore spends the village pool on the level-319 UR first',()=>{
 // What he should do: Refund all on Elise, then convert her fragments, then let the chore run.
 let s=run(decode(RAW),'refundFellow',ELISE);
 // WITHOUT converting, her own fragments are still hers: the chore re-buys HER ladder from them, because they buy
 // nothing else. This is the trap the conversion exists for, pinned so it is stated rather than discovered.
 const unconverted=stella(null,s);
 assert.equal(stellaEntry(unconverted,ELISE).level,20,'unconverted private fragments go straight back into Elise');
 assert.equal(stellaState(unconverted).stock[OWN],500);
 // Converted, the same fragments are village shards, and the chore spends them by level.
 s=run(s,'stellaConvert',OWN,{seq:stellaState(s).seq});
 const before=stellaState(s).history.length,after=stella(null,s);
 const bought=stellaState(after).history.slice(before).filter(r=>r.level>0&&r.itemId===SPIRIT_SHARD_ITEM);
 assert.ok(bought.length>0,'the chore bought something');
 assert.equal(bought[0].owner,NEPTUNE,'the first village-pool rank goes to the highest-level Fellow');
 assert.ok(stellaEntry(after,NEPTUNE).level>0);
 // Neptune now outranks the level-1 Elise, which is the whole of the owner's question.
 assert.ok(bondedPower(after,NEPTUNE)>bondedPower(after,ELISE),`Neptune ${bondedPower(after,NEPTUNE)} vs Elise ${bondedPower(after,ELISE)}`);
 // The crossover pool is separate by design: only crossover Fellows can spend it, so Spider-Man keeps taking it
 // whatever the order. Refund returns his ranks to that pool, not to the village pool.
 const spidey=run(after,'refundFellow',SPIDEY);
 assert.equal(stellaEntry(spidey,SPIDEY).level,0);
 assert.ok(stellaState(spidey).stock[CROSSOVER_SHARD_ITEM]>stellaState(after).stock[CROSSOVER_SHARD_ITEM]);
 assert.equal(stellaState(spidey).stock[SPIRIT_SHARD_ITEM],stellaState(after).stock[SPIRIT_SHARD_ITEM]);
 // Power Details: the flat is its own part, so a level-1 Fellow's Power reads as mostly Stella at a glance.
 const p=powerParts(decode(RAW),ELISE);
 assert.equal(p.flat.stella,15300000);assert.ok(p.flat.stella/p.power>0.99);
});
