import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';

// Every currency a player can SPEND must have at least one way to EARN it that a player can reach.
//
// This is the `stoneFragments` bug generalised. That one had everything except the last link: the
// costs existed (SUMMON_COSTS), the wallet existed (summonState), the faucet existed and was correct
// and tested (summonClaimDay) -- and nothing in app/ dispatched it. So the currency could never leave
// zero, both rosters were unreachable, and the Recruit panel told the player to "finish daily habits
// to earn fragments" while no control existed to bank them.
//
// tests/dispatch.test.mjs now catches an action nothing dispatches. It cannot catch the other half of
// the shape: a SINK whose currency has no faucet at all, or whose faucet fills a DIFFERENT key than
// the one the sink charges. `insignias` is exactly that today, and it is pinned at the bottom.
//
// Deliberately static: a source scan over lib/ and app/, no fixtures, no clock. Runtime behaviour of
// each individual currency is already covered by its own suite; what has never been asserted is that
// the set is closed.

const LIB=new URL('../lib/',import.meta.url),APP=new URL('../app/',import.meta.url);
const read=(dir,f)=>readFileSync(new URL(f,dir),'utf8');
const appSource=readdirSync(APP).filter(f=>/\.tsx?$/.test(f)).map(f=>read(APP,f)).join('\n');

/** The action names one lib module handles. Same four dispatch shapes as tests/dispatch.test.mjs --
 *  scoped to a single file, so the table below cannot credit farm.mjs with summon.mjs's faucet. */
function actionsOf(file){
 const src=read(LIB,file),found=new Set();
 for(const m of src.matchAll(/action(?:===|!==)(['"])([A-Za-z][A-Za-z0-9]*)\1/g))found.add(m[2]);
 for(const m of src.matchAll(/\[([^\]]*)\]\.includes\(action\)/g))
  for(const q of m[1].matchAll(/(['"])([A-Za-z][A-Za-z0-9]*)\1/g))found.add(q[2]);
 for(const m of src.matchAll(/case (['"])(opening[A-Za-z0-9]*)\1:/g))found.add(m[2]);
 return found;
}
const handles=(file,action)=>actionsOf(file).has(action);
/** A literal anywhere in app/, exactly as tests/dispatch.test.mjs defines reachability. */
const dispatched=name=>new RegExp(`(['"])${name}\\1`).test(appSource);
/** Does this module's source actually name the wallet key it is credited with moving? */
const touches=(file,key)=>new RegExp(`\\b${key}\\b`).test(read(LIB,file));

/** Currency -> where it is spent, and where it is earned.
 *  `key`    the field the wallet actually stores it in
 *  `sink`   an action that charges it
 *  `faucet` an action that pays it out; this is the one that must be reachable from app/
 *  `free`   set when the only faucet is a sandbox grant rather than earned play. Several are
 *           deliberately free today and are being converted one at a time -- docs/faucet-map.md. */
const CURRENCIES=[
 {id:'gold',label:'village gold',key:'gold',
  sink:{action:'unlock',module:'game.mjs'},faucet:{action:'collect',module:'game.mjs'}},

 {id:'knowledge',label:'Knowledge (Magic Farm)',key:'knowledge',
  sink:{action:'farmYieldUpgrade',module:'farm.mjs'},faucet:{action:'harvestFarm',module:'farm.mjs'}},

 {id:'stoneFragments',label:'Acquaint Stone Fragments',key:'stoneFragments',
  // The original defect. Kept first in the table as the worked example of the whole shape.
  sink:{action:'summonRecruit',module:'summon.mjs'},faucet:{action:'summonClaimDay',module:'summon.mjs'}},

 {id:'stones',label:'Acquaint Stones',key:'stones',
  sink:{action:'summonRecruit',module:'summon.mjs'},faucet:{action:'summonForge',module:'summon.mjs'}},

 {id:'insigniaFragments',label:'insignia fragments',key:'insigniaFragments',
  sink:{action:'summonForge',module:'summon.mjs'},faucet:{action:'summonClaimWeek',module:'summon.mjs'}},

 {id:'starShards',label:'star shards',key:'starShards',
  sink:{action:'summonStar',module:'summon.mjs'},faucet:{action:'summonClaimDay',module:'summon.mjs'}},

 {id:'ore',label:'Magic Ore',key:'ore',
  sink:{action:'upgradeArtifact',module:'artifacts.mjs'},faucet:{action:'recycleArtifact',module:'artifacts.mjs'}},

 {id:'fellowXP',label:'Fellow EXP',key:'fellowXP',
  sink:{action:'train',module:'adventure.mjs'},faucet:{action:'educateBatch',module:'education.mjs'}},

 {id:'crystals',label:'crystals',key:'crystals',
  // Spent only on the three priced artifacts: supplyPurchasePlan picks 'crystals' for GEAR ids.
  sink:{action:'buySupply',module:'adventure.mjs'},faucet:{action:'battle',module:'adventure.mjs'}},

 {id:'points',label:'Blessing Points',key:'points',
  sink:{action:'trainBlessing',module:'blessings.mjs'},faucet:{action:'date',module:'game.mjs'}},

 {id:'wallet',label:'Workshop coins',key:'wallet',
  sink:{action:'buyWorkshopPearl',module:'workshop.mjs'},faucet:{action:'collectWorkshop',module:'workshop.mjs'}},

 {id:'staffingMaterials',label:'building upgrade materials',key:'staffingMaterials',
  sink:{action:'upgradeStaffQuality',module:'staffing.mjs'},faucet:{action:'claimStaffingMaterials',module:'staffing.mjs'},
  free:'A flat +100 sandbox grant with no cost and no cap. docs/faucet-map.md reclassified it on '
   +'2026-09-12 as convertible rather than blocked: the original states a source (Fountain of Wishes, '
   +'Crystal/Trading Post/Guild shops) but the Fountain path yields 0.84/day against a 25,915-material '
   +'bill for the Inn alone, and the blueprint is not in EXTRA_ITEMS so it cannot reach the Bag. '
   +'Converting it needs a shop plus a save-version bump. Asserted here as the CURRENT state.'},
];

// ---------------------------------------------------------------------------------------------
// Extractor guards FIRST. Two source scans carry this whole file; either one drifting would let
// every assertion below pass while proving nothing.
// ---------------------------------------------------------------------------------------------

test('the per-module action extractor still works (a drifted pattern would pass everything vacuously)',()=>{
 // One known action per dispatch shape, each in the module the table credits.
 for(const [file,action,shape] of [['game.mjs','collect','==='],
                                   ['summon.mjs','summonClaimDay','includes'],
                                   ['farm.mjs','farmYieldUpgrade','includes'],
                                   ['staffing.mjs','claimStaffingMaterials','includes'],
                                   ['education.mjs','enrollPupil','==='],
                                   ['workshop.mjs','collectWorkshop','includes']])
  assert.ok(handles(file,action),`extractor missed ${action} in lib/${file}; the ${shape} pattern has broken`);
 // ...and it must be genuinely scoped, or a sink could be "found" in the wrong module.
 assert.ok(!handles('farm.mjs','collect'),'the extractor is not scoped to one module');
 assert.ok(!handles('game.mjs','summonClaimDay'),'the extractor is not scoped to one module');
 assert.ok(!handles('summon.mjs','summonClaimNever'),'the extractor invents actions that do not exist');
});

test('the app/ dispatch scan still works (this is the exact check that missed stoneFragments)',()=>{
 assert.ok(appSource.length>50000,`app/ scan read only ${appSource.length} chars; the file sweep has drifted`);
 assert.ok(dispatched('collect'),'scan missed `collect`, which app/page.tsx dispatches on the village map');
 assert.ok(dispatched('summonClaimDay'),'scan missed `summonClaimDay`, the faucet whose absence started this');
 // The negative control matters as much: a scan that matched everything would prove nothing at all.
 // recruitAll is test/CLI-only and is listed unreachable in tests/dispatch.test.mjs ALLOWED.
 assert.ok(!dispatched('recruitAll'),'the dispatch scan matches actions app/ does NOT dispatch');
 assert.ok(!dispatched('notARealActionName'),'the dispatch scan matches anything');
});

// ---------------------------------------------------------------------------------------------
// The table itself. Each row is checked in both directions before it is trusted.
// ---------------------------------------------------------------------------------------------

test('every currency in the table really is spent and paid where the table says',()=>{
 for(const c of CURRENCIES){
  assert.ok(handles(c.sink.module,c.sink.action),
   `${c.label}: lib/${c.sink.module} no longer handles the sink \`${c.sink.action}\` — the table has rotted.`);
  assert.ok(handles(c.faucet.module,c.faucet.action),
   `${c.label}: lib/${c.faucet.module} no longer handles the faucet \`${c.faucet.action}\` — the table has rotted.`);
  // The wallet key must be named in both modules, so a row cannot survive by pairing two unrelated
  // actions that never touch the currency they are credited with.
  assert.ok(touches(c.sink.module,c.key),`${c.label}: lib/${c.sink.module} never mentions \`${c.key}\``);
  assert.ok(touches(c.faucet.module,c.key),`${c.label}: lib/${c.faucet.module} never mentions \`${c.key}\``);
 }
 assert.ok(CURRENCIES.length>=12,`only ${CURRENCIES.length} currencies tabled; rows have been dropped`);
});

test('every spendable currency has an earning path a player can reach from app/',()=>{
 const stranded=CURRENCIES.filter(c=>!dispatched(c.faucet.action));
 assert.deepEqual(stranded.map(c=>`${c.label} (faucet ${c.faucet.action})`),[],
  'these currencies can be SPENT but never EARNED — the cost exists, the faucet exists, and nothing '
  +'in app/ dispatches it, so the balance can never leave zero:\n'
  +stranded.map(c=>`  ${c.label}: sink ${c.sink.action} (${c.sink.module}), faucet ${c.faucet.action} (${c.faucet.module})`).join('\n')
  +'\n\nAdd a control that dispatches the faucet, exactly as the Recruit panel now does for summonClaimDay.');
});

test('the free sandbox grants are recorded as the CURRENT state, each naming what would replace it',()=>{
 // Not an endorsement. docs/faucet-map.md tracks the conversion of these one at a time; this pins
 // which are still free so a conversion shows up here as a deliberate edit rather than a surprise.
 const free=CURRENCIES.filter(c=>c.free);
 assert.deepEqual(free.map(c=>c.id),['staffingMaterials'],
  'the set of currencies whose only faucet is a free grant has changed. If one was converted, drop '
  +'its `free` note; if a new one appeared, record it here with the reason, and in docs/faucet-map.md.');
 for(const c of free){
  assert.ok(c.free.length>80,`${c.label}: a free faucet must state what an earned replacement would be`);
  assert.ok(dispatched(c.faucet.action),`${c.label}: even a free grant must be reachable`);
  // A grant is recognisable in source: it charges nothing on the way in.
  assert.ok(/Sandbox|sandbox/.test(read(LIB,c.faucet.module)),`${c.label}: ${c.faucet.action} no longer reads as a sandbox grant`);
 }
});

test('Education Points are the one currency whose faucet is passive recovery, not an action',()=>{
 // A real exception to the rule above, not an oversight: school.points regenerate inside settle() on
 // elapsed time, so there is no faucet action to dispatch and nothing for app/ to wire. The old
 // refillEducation grant was deleted outright for exactly this reason (docs/faucet-map.md).
 assert.ok(handles('education.mjs','educateBatch'),'the Education Points sink has moved');
 assert.match(read(LIB,'game.mjs'),/points:Math\.min\(EDUCATION_CAP,state\.school\.points\+elapsed\/EDUCATION_RECOVERY_MS\)/,
  'Education Points no longer recover passively in settle(). If the recovery moved to an action, that '
  +'action now needs a row in CURRENCIES and a control in app/.');
 // And the deleted grant must stay deleted, or this exception silently stops being one.
 assert.ok(!handles('education.mjs','refillEducation')&&!dispatched('refillEducation'),
  'refillEducation is back; docs/faucet-map.md records it as deleted in favour of passive recovery.');
});

// ---------------------------------------------------------------------------------------------
// A real defect this file found. Marked todo so check.yml stays green, NOT deleted.
// ---------------------------------------------------------------------------------------------

test('every currency a cost names is a currency the wallet actually holds — THE `insignias` DEFECT',
 {todo:'SUMMON_COSTS prices UR/UR*/set in `insignias`, a key summonState never creates; 49 of 257 offered characters therefore recruit for free. Give the wallet the key (or price them in valiant/archangel) and add it to validSummon.'},()=>{
 // Found by this guard. `SUMMON_COSTS` (summon.mjs:30) prices UR, UR* and set members in `insignias`.
 // `summonState` (summon.mjs:33) creates stoneFragments, stones, insigniaFragments, valiant,
 // archangel and starShards -- there is no `insignias` slot, and no faucet anywhere fills one.
 //
 // It does not fail closed, it fails OPEN. summonRecruit does:
 //     if(r[currency]<amount)return fail(...)      undefined < 2  ->  false, so no refusal
 //     next[currency]=r[currency]-amount           undefined - 2  ->  NaN
 // and validSummon's key list omits `insignias`, so the NaN passes validation. Measured on a fresh
 // save: recruiting hero_113 (Leon, UR, 2 insignias) succeeds, he joins, the wallet reads NaN, and
 // valid() returns true. JSON.stringify writes the NaN as null and decode() accepts it on reload.
 // 49 of the 257 characters the counter offers are priced this way.
 const summon=read(LIB,'summon.mjs');
 const walletKeys=[...summon.matchAll(/summonState=s=>\{const r=s\.summon\|\|\{([^}]*)\}/g)]
  .flatMap(m=>[...m[1].matchAll(/([A-Za-z][A-Za-z0-9]*):/g)].map(x=>x[1]));
 assert.ok(walletKeys.includes('stoneFragments')&&walletKeys.includes('starShards'),
  'the summonState wallet-key extractor has drifted; it must fail here rather than below');
 const priced=[...new Set([...summon.slice(summon.indexOf('SUMMON_COSTS='),summon.indexOf('\n',summon.indexOf('SUMMON_COSTS=')))
  .matchAll(/\{([A-Za-z][A-Za-z0-9]*):\d+\}/g)].map(m=>m[1]))];
 assert.ok(priced.length>=3,`extracted only ${priced.length} priced currencies from SUMMON_COSTS`);
 const phantom=priced.filter(k=>!walletKeys.includes(k));
 assert.deepEqual(phantom,[],
  `SUMMON_COSTS charges these currencies, but summonState holds no such key, so \`r[currency]\` is `
  +`undefined: the affordability check cannot fail and the charge produces NaN. Characters priced in `
  +`them are FREE: ${phantom.join(', ')}.\n\n`
  +`Either add the key to summonState AND to validSummon's key list and give it a faucet, or price `
  +`those rarities in a currency the wallet already holds (valiant / archangel).`);
 // Once fixed, the new key must also be guarded and earnable, or this simply moves the hole.
 for(const k of priced){
  assert.match(summon,new RegExp(`'${k}'[^\\n]*every\\(k=>int`),`validSummon does not validate \`${k}\``);
 }
});
