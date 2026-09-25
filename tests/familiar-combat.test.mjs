import test from 'node:test';import assert from 'node:assert/strict';
import {FAMILIARS,familiarStats} from '../lib/familiars.mjs';
import {FAMILIAR_COMBAT,familiarSkill,familiarBuff,familiarSkillIds,familiarAttrs,familiarCombatPower} from '../lib/familiar-combat.mjs';
import {FAMILIAR_PORTRAITS,familiarHead,familiarHalf,familiarHeadForm} from '../lib/familiar-portraits.mjs';
import {DISPATCH_AREAS} from '../lib/familiar-dispatch.mjs';

// ---------------------------------------------------------------------------------------------
// Coverage guard. PetSkill (192) + PetBuff (137) are 329 rows and were 42% of everything absent.
// ---------------------------------------------------------------------------------------------
test('every PetSkill, PetBuff, PetAttr and per-familiar row is imported and resolves',()=>{
 assert.equal(Object.keys(FAMILIAR_COMBAT.skills).length,192);
 assert.equal(Object.keys(FAMILIAR_COMBAT.buffs).length,137);
 assert.equal(Object.keys(FAMILIAR_COMBAT.pets).length,70);
 // ALL NINE PetAttr rows, in the original's own order, with the weights Everkai read three of.
 const attrs=Object.values(FAMILIAR_COMBAT.attr);
 assert.equal(attrs.length,9);
 assert.deepEqual(attrs.map(a=>a.field),['ATK','HP','SPD','CRIT','CRIT_RES','Block','ACC','DI','DR']);
 assert.deepEqual(attrs.map(a=>a.combatAdd),[15,1,30,5,5,5,5,30,30]);
 // The three Everkai used to read are the three with the largest weights, which is why the old
 // number tracked the real one closely enough to go unnoticed for as long as it did.
 assert.deepEqual(attrs.filter(a=>['ATK','HP','SPD'].includes(a.field)).map(a=>a.combatAdd),[15,1,30]);
 // Passive skills unlock at stages 2, 4 and 6 -- the only three PetClass rows carrying the column.
 assert.deepEqual(FAMILIAR_COMBAT.passiveUnlock,{2:'PassiveSkill1',4:'PassiveSkill2',6:'PassiveSkill3'});
 // Every skill a familiar points at resolves, and every BuffID a skill names resolves.
 for(const [pid,row] of Object.entries(FAMILIAR_COMBAT.pets))
  for(const [slot,sid] of Object.entries(row.skills))
   assert.ok(familiarSkill(sid),`${pid} ${slot} -> ${sid}`);
 for(const [sid,s] of Object.entries(FAMILIAR_COMBAT.skills)){
  assert.ok(!('Combatcoef' in s)||[2,3].includes(s.SkillType),`${sid} carries Combatcoef at SkillType ${s.SkillType}`);
  for(const b of s.BuffID||[])assert.ok(familiarBuff(b),`${sid} -> buff ${b}`);
 }
});

// ---------------------------------------------------------------------------------------------
// `PetInfo:GetPower`, transcribed. private-server/readable/PetInfo.lua:763.
// ---------------------------------------------------------------------------------------------
test('Power is all nine attributes by CombatAdd, then the active and unlocked-passive Combatcoef',()=>{
 const id='Pet_1191',at=p=>familiarCombatPower(id,p);
 // A stage-1 familiar owns only its active skill; passives arrive at stages 2, 4 and 6 (levels 50,
 // 150, 250), which is the ONLY thing that changes between these two beyond the growth ladders.
 assert.deepEqual(familiarSkillIds(id,{level:1,stars:0}),['1191_1']);
 assert.deepEqual(familiarSkillIds(id,{level:60,stars:0}),['1191_1','1191_2']);
 assert.deepEqual(familiarSkillIds(id,{level:160,stars:0}),['1191_1','1191_2','1191_3']);
 assert.deepEqual(familiarSkillIds(id,{level:260,stars:0}),['1191_1','1191_2','1191_3','1191_4'],'stage 6 adds the third passive');
 // Recomputed here from the parts rather than restated, so a drift in either half fails.
 const check=p=>{
  const a=familiarAttrs(id,p);
  let sum=0;for(const c of Object.values(FAMILIAR_COMBAT.attr))sum+=a[c.field]*c.combatAdd;
  let bp=0;for(const sid of familiarSkillIds(id,p)){const s=familiarSkill(sid);if(s?.Combatcoef)bp+=s.Combatcoef;}
  assert.ok(bp>0,'this familiar does carry a Combatcoef, so the ratio is exercised');
  return Math.floor(sum*(1+bp/10000));
 };
 for(const p of [{level:1,stars:0},{level:200,stars:20},{level:499,stars:100}])assert.equal(at(p),check(p));
 // ATK, HP and SPD still match `familiarStats`, which is the COMBAT function and deliberately
 // unchanged -- the stat-modifying SkillType 4 rows reach Power here and not the battle, because
 // the combatVersion ladder versions the engine and not the stat function.
 const p={level:200,stars:20},combat=familiarStats(id,p),power=familiarAttrs(id,p);
 for(const f of ['ATK','HP','SPD'])assert.equal(power[f],combat[f],`${f} may not drift from the combat stat`);
 // THE SIX NEW ATTRIBUTES, and what does NOT vary in them is the finding (CLAUDE.md rule 6).
 // Across all 70 familiars `CRIT_RES`, `ACC`, `DI` and `DR` are ZERO on every row, and `CRIT` and
 // `Block` carry 500 on 55 of the 70. So the nine-term sum is a five-term sum in the shipped data,
 // and adding the four empty columns costs nothing -- but they are carried anyway, because both
 // `CRIT` and `Block` are flagged `IsNoInitia` in `PetAttr` (no initial value: they are meant to be
 // filled by the SkillType 4 modifiers), so a familiar that gains one gains real Power from it.
 const zero=f=>Object.values(FAMILIAR_COMBAT.pets).every(r=>!r.attrs[f]);
 for(const f of ['CRIT_RES','ACC','DI','DR'])assert.ok(zero(f),`${f} is empty on every familiar`);
 for(const f of ['CRIT','Block'])assert.ok(!zero(f),`${f} is carried by some familiars`);
 assert.equal(Object.values(FAMILIAR_COMBAT.pets).filter(r=>r.attrs.CRIT).length,55,'CRIT on 55 of 70');
 assert.equal(Object.values(FAMILIAR_COMBAT.pets).filter(r=>r.attrs.Block).length,55,'Block on 55 of 70');
 for(const f of ['ATK','HP','SPD','CRIT','Block'])assert.ok(power[f]>0,`${f} is a real number here`);
 // NEGATIVE CONTROL in place: the old three-attribute figure is strictly smaller on every familiar.
 for(const pet of FAMILIARS.slice(0,10)){
  const s=familiarStats(pet.id,p),old=s.ATK*15+s.HP*1+s.SPD*30;
  assert.ok(familiarCombatPower(pet.id,p)>old,`${pet.id}: nine attributes must exceed three`);
 }
});

test('the nine dispatch gates form a ladder a finished account can finish',()=>{
 // This is the check that would have caught the old formula. Under it, the five strongest familiars
 // at the ABSOLUTE ceiling reached only 1.38x area 9's gate -- the last rung of a nine-rung ladder
 // was marginal for a maxed account. It is design coherence, not proof; the proof is the transcription.
 const five=[...FAMILIARS].map(f=>f.id)
  .sort((a,b)=>familiarCombatPower(b,{level:1,stars:0})-familiarCombatPower(a,{level:1,stars:0})).slice(0,5);
 const total=p=>five.reduce((n,id)=>n+familiarCombatPower(id,p),0);
 const top=DISPATCH_AREAS.at(-1).power;
 const near=total({level:300,stars:50})/top,maxed=total({level:499,stars:100})/top;
 assert.ok(near>0.8&&near<2,`a near-endgame team lands on the last gate, got ${near.toFixed(2)}x`);
 assert.ok(maxed>4,`and a maxed one is comfortably past it, got ${maxed.toFixed(2)}x`);
 // Under the OLD three-attribute formula this same maxed team reached 1.38x. That is the shape of
 // the error: the top rung was marginal for an account with nothing left to train.
 assert.ok(maxed>1.38*3,'the corrected figure is several times the three-attribute one');
});

// ---------------------------------------------------------------------------------------------
// Portraits: extracted from the FairyGUI package in the APK's ui/pet bundles.
// ---------------------------------------------------------------------------------------------
test('66 of the 71 familiars have a head icon and a half-body portrait, and the rest fall back',()=>{
 const withArt=FAMILIARS.filter(p=>familiarHead(p.id));
 assert.equal(withArt.length,66);
 assert.equal(FAMILIARS.filter(p=>familiarHalf(p.id)).length,66,'head and half cover the same set');
 // The five without are Everkai's own extra plus four ids absent from the original's own Pet.json,
 // so there is nothing to extract for them -- the rarity card stays as the fallback.
 assert.deepEqual(FAMILIARS.filter(p=>!familiarHead(p.id)).map(p=>p.id).sort(),
  ['Pet_8041505','Pet_9011901','Pet_9023401','Pet_9041501','Pet_9041502']);
 assert.equal(familiarHead('Pet_11111'),'./assets/familiars/head-11111.webp');
 assert.equal(familiarHalf('Pet_11111'),'./assets/familiars/half-11111.webp');
 // The evolved forms the Forms section lists are extracted too, and the lookup is case-insensitive
 // because the index is keyed by the sprite's own name (`11111A`) and the files are lowercased.
 assert.equal(familiarHeadForm('Pet_11111','A'),familiarHeadForm('Pet_11111','a'));
 assert.ok(familiarHeadForm('Pet_11111','A'));
 assert.equal(Object.keys(FAMILIAR_PORTRAITS.head).length,143);
 assert.equal(Object.keys(FAMILIAR_PORTRAITS.half).length,143);
});
