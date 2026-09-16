import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {newFellow,bondedPower,skillCost} from '../lib/adventure.mjs';
import {summonState} from '../lib/summon.mjs';
import {insightRule} from '../lib/insight.mjs';
import {MAX_FELLOW_XP} from '../lib/limits.mjs';
import {refundWallet,refundPlan,REFUND_COSTS,refundTracks} from '../lib/fellow-reset.mjs';
import {stockOriginal,grantFragments} from './progression-helpers.mjs';
import {freshOpening} from '../lib/opening.mjs';
const withOpeningUpgrade=s=>({...s,opening:{...(s.opening||freshOpening()),upgrades:1}});

const T=1000,ID='hero_54',GEAR='Item_Weapon_Equipment_1_1';
const run=(s,action,value=null,id=ID)=>{const r=act(s,action,s.lastAt,id,value);assert.equal(r.error,undefined,`${action}: ${r.error}`);assert.ok(valid(r.state),action);return r.state};

/** A village with every pool a Fellow investment draws on stocked. `mode`: 'legacy' (no receipts),
 *  'receipts' (APK training costs) or 'original' (APK growth, quality breakthroughs). */
function stocked(mode='original'){
 let s=fresh(T);s.fellows[ID]=newFellow();
 if(mode==='receipts')s=run(s,'activateOriginalTraining');
 if(mode==='original'){s=run(s,'activateOriginalProgression');s=stockOriginal(s,60);}
 s=grantFragments(s,ID,4);
 const material=insightRule(ID).materialId;
 s={...s,fellowXP:s.fellowXP+5e7,inventory:{...s.inventory,local_skill_scroll:400,local_limit_token:200,Item_Talent_Hero_1:900,[GEAR]:1},
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
};
const MODES={levels:['receipts','original'],quality:['original'],breaks:['receipts'],skill:['legacy','original'],stars:['legacy','original'],talent:['legacy','original'],insight:['legacy','original'],stella:['legacy','original'],artifact:['legacy','original']};

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
 const actions=[['train',1],['train',5],['train','max'],['fellowSkill',null],['limitBreak',null],['originalQuality',null],['trainTalent',1],['trainTalent',5],['trainInsight',1],['trainInsight','max'],['summonStar','seq'],['stellaUpgrade','stella'],['upgradeArtifact',null],['upgradeArtifactMax',null]];
 for(let seed=1;seed<=24;seed++){
  const mode=['receipts','original','legacy'][seed%3],random=rng(seed),start=stocked(mode);let s=start,done=0;
  for(let i=0;i<40;i++){
   // Legacy saves have no training receipts, so their levels are not refundable and training is left out.
   const pool=mode==='legacy'?actions.filter(([a])=>a!=='train'):actions,[action,v]=pool[Math.floor(random()*pool.length)];
   const value=v==='seq'?{seq:summonState(s).seq}:v==='stella'?{seq:s.stella.seq,count:1+Math.floor(random()*3)}:v;
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
