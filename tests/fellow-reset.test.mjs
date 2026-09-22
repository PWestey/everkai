import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {newFellow,bondedPower,skillCost,fellowCap} from '../lib/adventure.mjs';
import {summonState} from '../lib/summon.mjs';
import {insightRule} from '../lib/insight.mjs';
import {MAX_FELLOW_XP} from '../lib/limits.mjs';
import {refundWallet,refundPlan,REFUND_COSTS,refundTracks} from '../lib/fellow-reset.mjs';
import {stockOriginal,grantFragments} from './progression-helpers.mjs';
import {freshOpening} from '../lib/opening.mjs';
const withOpeningUpgrade=s=>({...s,opening:{...(s.opening||freshOpening()),upgrades:1}});

const T=1000,ID='hero_54',GEAR='Item_Weapon_Equipment_1_1',ESSENCE='SG3TalentCountry1',APT_ITEMS={Item_Quenching_Equipment_1:10,Item_Box_Talent_1:10,Item_Hero_Talent_Country_1:10,Item_Hero_Attribute_Increase_1:5};
const run=(s,action,value=null,id=ID)=>{const r=act(s,action,s.lastAt,id,value);assert.equal(r.error,undefined,`${action}: ${r.error}`);assert.ok(valid(r.state),action);return r.state};

/** A village with every pool a Fellow investment draws on stocked. `mode`: 'legacy' (no receipts),
 *  'receipts' (APK training costs) or 'original' (APK growth, quality breakthroughs). */
function stocked(mode='original'){
 let s=fresh(T);s.fellows[ID]=newFellow();
 if(mode==='receipts')s=run(s,'activateOriginalTraining');
 if(mode==='original'){s=run(s,'activateOriginalProgression');s=stockOriginal(s,60);}
 s=run(s,'openFarm',null,null);s={...s,opening:freshOpening(),farm:{...s.farm,trade:{policyVersion:1,completed:[0,0,0],dew:0,essences:{[ESSENCE]:60}}}};
 s=grantFragments(s,ID,4);
 const material=insightRule(ID).materialId;
 s={...s,fellowXP:s.fellowXP+5e7,inventory:{...s.inventory,local_skill_scroll:400,local_limit_token:200,Item_Talent_Hero_1:900,[GEAR]:1,...APT_ITEMS},
  summon:{...summonState(s),starShards:500},insight:{balances:{[material]:20000},levels:{}},artifacts:{ore:5000,bag:{}}};
 s=run(s,'stellaActivate',{seq:s.stella.seq});
 s=run(s,'equip',GEAR);
 assert.ok(valid(s));return s;
}

/** Everything a round trip must restore: every pool in the village, this Fellow, and the per-Fellow ledgers. */
function mismatches(start,end){
 const a=refundWallet(start),b=refundWallet(end),out=[];
 for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if((a[k]||0)!==(b[k]||0))out.push(`${k}: ${a[k]} -> ${b[k]}`);
 if(JSON.stringify(start.fellows[ID])!==JSON.stringify(end.fellows[ID]))out.push(`fellow: ${JSON.stringify(start.fellows[ID])} -> ${JSON.stringify(end.fellows[ID])}`);
 for(const k of ['trainingCosts','originalProgression'])if(JSON.stringify(start[k])!==JSON.stringify(end[k]))out.push(k);
 if(JSON.stringify(start.insight?.levels)!==JSON.stringify(end.insight?.levels))out.push('insight levels');
 if(JSON.stringify(start.stella?.history)!==JSON.stringify(end.stella?.history))out.push('stella history');
 return out;
}
const refund=s=>run(s,'refundFellow');

const INVESTMENTS={
 levels:s=>run(s,'train','max'),
 quality:s=>run(run(s,'train','max'),'originalQuality'),
 breaks:s=>run(run(s,'train','max'),'limitBreak'),
 skill:s=>run(run(run(s,'fellowSkill'),'fellowSkill'),'fellowSkill'),
 stars:s=>run(run(s,'summonStar',{seq:summonState(s).seq}),'summonStar',{seq:summonState(s).seq+1}),
 talent:s=>run(s,'trainTalent',5),
 insight:s=>run(s,'trainInsight',5),
 stella:s=>run(s,'stellaUpgrade',{seq:s.stella.seq,count:5}),
 artifact:s=>run(s,'upgradeArtifact'),
 pearlAptitude:s=>run(s,'aptitude',5),
 essence:s=>run(s,'useFarmEssence',{essence:ESSENCE,amount:5}),
 reforge:s=>run(run(s,'openingReforge'),'openingReforge'),
 talentBox:s=>run(s,'openingUse',ID,'Item_Box_Talent_1'),
 countryTalent:s=>run(s,'openingUse',ID,'Item_Hero_Talent_Country_1'),
 addAtk:s=>run(s,'openingUse',ID,'Item_Hero_Attribute_Increase_1'),
};
const MODES={levels:['receipts','original'],quality:['original'],breaks:['receipts'],skill:['legacy','original'],stars:['legacy','original'],talent:['legacy','original'],insight:['legacy','original'],stella:['legacy','original'],artifact:['legacy','original'],pearlAptitude:['legacy','original'],essence:['legacy','original'],reforge:['legacy'],talentBox:['legacy'],countryTalent:['original'],addAtk:['legacy']};

test('every refundable investment, invested then refunded, leaves the wallet and the Fellow exactly as they started',()=>{
 for(const [track,invest] of Object.entries(INVESTMENTS))for(const mode of MODES[track]){
  const start=stocked(mode),spent=invest(start);
  assert.notDeepEqual(refundWallet(spent),refundWallet(start),`${track}/${mode} really spent something`);
  const end=refund(spent);
  assert.deepEqual(mismatches(start,end),[],`${track}/${mode}`);
  assert.deepEqual(decode(JSON.stringify(end)),end,`${track}/${mode} survives a reload`);
 }
});

test('a refunded Fellow matches a fresh recruit on every refunded field',()=>{
 let s=stocked('original');for(const [track,invest] of Object.entries(INVESTMENTS))if(!['levels','breaks'].includes(track))s=invest(s);
 const f=refund(s).fellows[ID],base=newFellow();
 for(const k of ['level','aptitude','skill','breaks'])assert.equal(f[k],base[k],k);
 for(const k of ['stars','talentLevel','originalTalent','gearOreSpent'])assert.equal(f[k],undefined,k);
 assert.equal(f.gearLevel,1,'the artifact stays equipped, back at level 1');
});

// A small deterministic PRNG so a failure names a reproducible seed.
const rng=seed=>()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
test('random investment sequences always refund to the exact starting wallet',()=>{
 const actions=[['train',1],['train',5],['train','max'],['fellowSkill',null],['limitBreak',null],['originalQuality',null],['trainTalent',1],['trainTalent',5],['trainInsight',1],['trainInsight','max'],['summonStar','seq'],['stellaUpgrade','stella'],['upgradeArtifact',null],['upgradeArtifactMax',null],['aptitude',1],['aptitude','max'],['useFarmEssence','essence'],['openingReforge',null],['openingUse','Item_Box_Talent_1'],['openingUse','Item_Hero_Attribute_Increase_1']];
 for(let seed=1;seed<=24;seed++){
  const mode=['receipts','original','legacy'][seed%3],random=rng(seed),start=stocked(mode);let s=start,done=0;
  for(let i=0;i<40;i++){
   // Legacy saves have no training receipts, so their levels are not refundable and training is left out.
   const pool=mode==='legacy'?actions.filter(([a])=>a!=='train'):actions,[action,v]=pool[Math.floor(random()*pool.length)];
   if(action==='openingUse'){const r=act(s,action,s.lastAt,v,ID);if(!r.error){assert.ok(valid(r.state));s=r.state;done++;}continue;}
   const value=v==='essence'?{essence:ESSENCE,amount:1+Math.floor(random()*5)}:v==='seq'?{seq:summonState(s).seq}:v==='stella'?{seq:s.stella.seq,count:1+Math.floor(random()*3)}:v;
   const r=act(s,action,s.lastAt,ID,value);if(r.error)continue;assert.ok(valid(r.state));s=r.state;done++;
  }
  assert.ok(done>5,`seed ${seed} invested`);
  assert.deepEqual(mismatches(start,refund(s)),[],`seed ${seed} (${mode})`);
 }
});

test('refund, optimize, refund returns the same wallet both times, and optimize raises Power without gold or crystals',()=>{
 for(const mode of ['receipts','original','legacy']){
  let s=stocked(mode);s=INVESTMENTS.skill(INVESTMENTS.talent(s));
  const first=refund(s),before=bondedPower(first,ID);
  const optimized=run(first,'optimizeFellow');
  assert.ok(bondedPower(optimized,ID)>before,`${mode}: Power rose`);
  assert.equal(optimized.gold,first.gold);assert.equal(optimized.crystals,first.crystals);
  const second=refund(optimized);
  assert.deepEqual(mismatches(first,second),[],mode);
 }
});

test('optimize spends only on tracks Refund can undo',()=>{
 const legacy=run(stocked('legacy'),'optimizeFellow');
 assert.equal(legacy.fellows[ID].level,1,'without training receipts, levels are left alone');
 assert.equal(legacy.fellowXP,stocked('legacy').fellowXP,'and no EXP is spent');
 const opened=withOpeningUpgrade(stocked('original'));assert.ok(valid(opened),'fixture is a valid village');assert.equal(refundTracks(opened,ID).artifact,false);
 const o=run(opened,'optimizeFellow');assert.equal(o.artifacts.ore,opened.artifacts.ore,'opening-subsidised artifacts are not upgraded');
 const nothing=act(fresh(T),'optimizeFellow',T,'hero_15');assert.ok(nothing.error);
});

test('investments that cannot be priced exactly are kept, and said so',()=>{
 let s=stocked('legacy');s={...s,fellows:{...s.fellows,[ID]:{...s.fellows[ID],level:40,skill:2}}};assert.ok(valid(s));
 const r=act(s,'refundFellow',T,ID);assert.equal(r.error,undefined);
 assert.equal(r.state.fellows[ID].level,40,'levels without receipts stay');assert.match(r.message,/Kept: levels/);
 assert.equal(r.state.inventory.local_skill_scroll,s.inventory.local_skill_scroll+skillCost({skill:0})+skillCost({skill:1}));
 // An artifact whose Ore was recorded under an opening upgrade is kept rather than possibly minted.
 const a=withOpeningUpgrade(INVESTMENTS.skill(INVESTMENTS.artifact(stocked('legacy'))));assert.ok(valid(a),'fixture is a valid village');
 const plan=refundPlan(a,ID);assert.equal(plan.error,undefined);
 assert.equal(plan.state.fellows[ID].gearLevel,2);assert.equal(plan.back.ore,undefined);assert.match(run(a,'refundFellow')&&act(a,'refundFellow',T,ID).message,/artifact levels/);
 assert.ok(act(stocked('legacy'),'refundFellow',T,ID).error,'nothing invested -> nothing to refund');
});

test('a refund that would overflow a capped pool is refused whole, never truncated',()=>{
 let s=INVESTMENTS.levels(stocked('receipts'));s={...s,fellowXP:MAX_FELLOW_XP-1};assert.ok(valid(s));
 const r=act(s,'refundFellow',T,ID);assert.match(r.error,/Not enough room/);
 assert.deepEqual(r.state.fellows[ID],s.fellows[ID]);assert.equal(r.state.fellowXP,s.fellowXP);
 let k=INVESTMENTS.skill(stocked('legacy'));k={...k,inventory:{...k.inventory,local_skill_scroll:1e6}};assert.ok(valid(k));
 assert.match(act(k,'refundFellow',T,ID).error,/scrolls/);
});

test('negative control: a wrong cost row is caught by the round-trip check',()=>{
 const start=stocked('legacy'),spent=INVESTMENTS.skill(start);
 const honest=refundPlan(spent,ID);assert.deepEqual(mismatches(start,honest.state),[]);
 for(const broken of [{...REFUND_COSTS,skill:k=>REFUND_COSTS.skill(k)+1},{...REFUND_COSTS,skill:k=>Math.max(0,REFUND_COSTS.skill(k)-1)}]){
  const plan=refundPlan(spent,ID,broken);
  assert.ok(mismatches(start,plan.state).some(m=>m.startsWith('item:local_skill_scroll')),'a mispriced skill row must show up as a scroll mismatch');
 }
 const stars=INVESTMENTS.stars(stocked('legacy'));
 assert.ok(mismatches(stocked('legacy'),refundPlan(stars,ID,{...REFUND_COSTS,star:k=>REFUND_COSTS.star(k)*2}).state).some(m=>m.startsWith('starShards')));
});

test('ledgered Aptitude records gain and exact payment per source, and survives a reload',()=>{
 let s=stocked('legacy');
 s=INVESTMENTS.addAtk(INVESTMENTS.reforge(INVESTMENTS.essence(INVESTMENTS.pearlAptitude(s))));
 assert.deepEqual(s.fellows[ID].aptitudeLedger,{policyVersion:1,entries:{'item:Item_Talent_Hero_1':{paid:5,gain:5},'essence:SG3TalentCountry1':{paid:5,gain:5},'item:Item_Quenching_Equipment_1':{paid:2,gain:2},'item:Item_Hero_Attribute_Increase_1':{paid:1,gain:30}}});
 assert.equal(s.fellows[ID].aptitude,10+5+5+2+30);
 assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('a Fellow with Aptitude from before tracking refunds only the ledgered part',()=>{
 let s=stocked('legacy');s={...s,fellows:{...s.fellows,[ID]:{...s.fellows[ID],aptitude:47}}};assert.ok(valid(s),'legacy Aptitude with no ledger loads');
 const start=s;s=INVESTMENTS.essence(INVESTMENTS.pearlAptitude(s));assert.equal(s.fellows[ID].aptitude,57);
 const plan=refundPlan(s,ID);assert.equal(plan.error,undefined);
 assert.deepEqual(plan.aptitude,{refunded:10,tracked:10,kept:37});
 const end=refund(s);assert.equal(end.fellows[ID].aptitude,47);assert.equal(end.fellows[ID].aptitudeLedger,undefined);
 assert.deepEqual(mismatches(start,end),[]);
});

test('ledgered item refunds respect the bag cap and refuse whole',()=>{
 let s=INVESTMENTS.reforge(stocked('legacy'));s={...s,inventory:{...s.inventory,Item_Quenching_Equipment_1:1e6-1}};assert.ok(valid(s));
 const r=act(s,'refundFellow',T,ID);assert.match(r.error,/Not enough room/);assert.deepEqual(r.state.fellows[ID],s.fellows[ID]);
 // An essence whose farm is gone has nowhere to return to: that Aptitude and its record stay.
 let e=INVESTMENTS.skill(INVESTMENTS.essence(stocked('legacy')));const nofarm={...e};delete nofarm.farm;assert.ok(valid(nofarm));
 const kept=refund(nofarm);assert.equal(kept.fellows[ID].aptitude,15);assert.deepEqual(kept.fellows[ID].aptitudeLedger.entries,{'essence:SG3TalentCountry1':{paid:5,gain:5}});
});

test('negative control: a tampered Aptitude ledger is refused',()=>{
 const s=INVESTMENTS.pearlAptitude(stocked('legacy'));assert.ok(valid(s));
 const tamper=[
  l=>{l.entries['item:Item_Talent_Hero_1'].gain=6},             // more Aptitude than the Fellow holds above base
  l=>{l.entries['item:Item_Talent_Hero_1'].paid=1.5},
  l=>{l.entries['item:Item_Talent_Hero_1'].paid=0},
  l=>{l.entries['essence:NotAnEssence']={paid:1,gain:1}},
  l=>{l.entries['gold:x']={paid:1,gain:1}},
  l=>{l.entries['item:Item_Talent_Hero_1'].extra=1},
  l=>{l.policyVersion=2},
  l=>{l.entries={}},
 ];
 for(const change of tamper){const bad=structuredClone(s);change(bad.fellows[ID].aptitudeLedger);assert.equal(valid(bad),false,String(change));assert.throws(()=>decode(JSON.stringify(bad)));}
});

// -------------------------------------------------------------------------------------------------
// LIMIT TOKENS AFTER A SWITCH TO APK GROWTH (2026-09-22). The cap in APK growth now also reads `breaks`
// (lib/original-progression.mjs sourceTier), so the old `originalProgression(s)||` short-circuit in
// refundPlan would have handed back every limit token while the Fellow kept the cap those tokens bought.
// Refund's promise is the opposite: it never returns anything that is still doing work. APK growth sells
// no limit breaks of its own, so the only way to hold them there is to have bought them on the classic
// curve and then switched -- which is exactly the save this guards.
// -------------------------------------------------------------------------------------------------
test('after a switch to APK growth, limit tokens come back only while the kept level still fits without them',()=>{
 let s=stocked('receipts');
 s=run(s,'train','max');
 assert.equal(s.fellows[ID].level,100,'positive control: no breaks caps at 100');
 s=run(s,'limitBreak');s=run(s,'train','max');
 assert.equal(s.fellows[ID].level,150,'positive control: one break is tier 2, cap 150');
 s=run(s,'limitBreak');s=run(s,'train','max');
 assert.equal(s.fellows[ID].level,200,'positive control: two breaks is tier 3, cap 200');
 s=run(s,'activateOriginalProgression',null,null);
 assert.equal(fellowCap(s.fellows[ID],s,ID),200,'the switch carried the cap those two tokens bought');
 const tokens=s.inventory.local_limit_token;
 // Levels have receipts, so Refund takes the level back to its baseline -- and then both breaks are idle.
 const all=refundPlan(s,ID);
 assert.equal(all.error,undefined,all.error);
 assert.equal(all.state.fellows[ID].level,1);
 assert.equal(all.state.fellows[ID].breaks,0);
 assert.equal(all.state.inventory.local_limit_token,tokens+REFUND_COSTS.breaks(0)+REFUND_COSTS.breaks(1));
 assert.ok(valid(all.state));
 // The same Fellow with its levels NOT priced by a receipt: the level stays, so the breaks holding its cap
 // must stay too, and no token may be minted. Without the fix both tokens came back here.
 const noReceipts={...s,trainingCosts:{...s.trainingCosts,baselineLevels:{...s.trainingCosts.baselineLevels,[ID]:200},receipts:s.trainingCosts.receipts.filter(r=>r.id!==ID)}};
 assert.ok(valid(noReceipts),'positive control: a save whose levels predate its receipts is legal');
 const kept=refundPlan(noReceipts,ID);
 // Nothing at all comes back, and that is the point: the level stays, so the two breaks holding its cap
 // stay with it and no token is minted. Without the fix this returned both tokens and kept the cap.
 assert.equal(kept.error,'Nothing on this Fellow can be refunded.');
 assert.equal(kept.state,undefined,'a refusal leaves no state to commit');
 assert.ok(kept.kept.includes('limit breaks the kept level needs'),kept.kept.join('; '));
});
