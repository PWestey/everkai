import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode} from '../lib/game.mjs';
import {newFellow,powerParts} from '../lib/adventure.mjs';
import {stellaRule,stellaState,validStella,SPIRIT_SHARD_ITEM} from '../lib/stella.mjs';
import {FAMILY_STELLA,STELLA_BLESS_PAIRS,familyStellaSpend,validFamilyStella} from '../lib/family-stella.mjs';
import {familyStellaParts,familyPairBlessing,stellaBlessPairs} from '../lib/family-stella-power.mjs';
import {validBlessings,blessingRecipients} from '../lib/blessings.mjs';
import {talentSkillCap} from '../lib/talent-skills.mjs';
import {talentCap} from '../lib/talents.mjs';
import {QUENCH_LADDER,QUENCH_TOP,quenchSlots,quenchStepCost,quenchPercent,validQuench} from '../lib/quench.mjs';
import BLESS from '../lib/original-blessing-data.json' with {type:'json'};
import {grantFragments} from './progression-helpers.mjs';

// FAMILY STELLA AND ARTIFACT QUENCHING -- docs/power-sources-import-spec.md section 3.
const T=new Date('2026-09-16T09:00:00').getTime();
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
/** An APK village with `id` owned, its Stella climbed to `rank`, shards to spare, and these family members. */
function village(id,rank,wives=[]){
 let s=go(fresh(T),'activateOriginalProgression');s={...s,fellows:{...s.fellows,[id]:newFellow(1)}};
 const p=stellaRule(id);s=grantFragments(s,id,Math.ceil(p.levels.reduce((n,r)=>n+r.cost,0)/1000)+60);
 s=go(s,'stellaActivate',id,{seq:stellaState(s).seq});for(let i=0;i<rank;i++)s=go(s,'stellaUpgrade',id,{seq:stellaState(s).seq,count:1});
 for(const w of wives)s=go(s,'welcome',w);
 return s;
}

test('the import: 89 members, 58 Stella-unlocked pairs, and the owner’s Family Stella halos',()=>{
 assert.equal(Object.keys(FAMILY_STELLA).length,89);assert.equal(STELLA_BLESS_PAIRS.length,58);
 // Shinobu's member 185 at rank 13 and member 105 at rank 4 give her panel's 15,500 bp and 365 talent.
 assert.deepEqual(FAMILY_STELLA.wife_185.ranks[13].slice(1,3),[355,15000]);
 assert.deepEqual(FAMILY_STELLA.wife_105.ranks[4].slice(1,3),[10,500]);
 assert.deepEqual(STELLA_BLESS_PAIRS.find(p=>p[0]==='wife_115'),['wife_115','hero_114',4]);
 // The ladder: 500 for 83 gold, and the gold track tops out at 1,600 (1,700 costs 2.3e19, past MAX_GOLD).
 assert.deepEqual(QUENCH_LADDER.slice(0,2),[[0,0,0],[5,5,83]]);assert.equal(QUENCH_TOP,16);
 assert.equal(QUENCH_LADDER.find(r=>r[0]===15)[2],6742008608,"1,500: 202 rolls");
 assert.equal(quenchSlots('Item_Weapon_Equipment_1_1'),2);
});

test('Family Stella reaches the member’s blessed Fellows, paid from the shared shards (rule 12 identity)',()=>{
 let s=village('hero_264',0,['wife_185','wife_105']);
 s=go(s,'familyStellaActivate','wife_185');s=go(s,'familyStellaActivate','wife_105');
 const before=stellaState(s).stock[SPIRIT_SHARD_ITEM];
 for(let i=0;i<13;i++)s=go(s,'familyStellaUpgrade','wife_185',1);
 for(let i=0;i<4;i++)s=go(s,'familyStellaUpgrade','wife_105',1);
 const spent=FAMILY_STELLA.wife_185.ranks.slice(1,14).reduce((n,r)=>n+r[0],0)+FAMILY_STELLA.wife_105.ranks.slice(1,5).reduce((n,r)=>n+r[0],0);
 assert.equal(before-stellaState(s).stock[SPIRIT_SHARD_ITEM],spent);assert.deepEqual(familyStellaSpend(s),{[SPIRIT_SHARD_ITEM]:spent});
 assert.ok(valid(s),refusedBy(s));
 const p=familyStellaParts(s,'hero_264');assert.deepEqual([p.talent,p.percent],[365,15500],'the owner’s Shinobu panel, to the unit');
 const pp=powerParts(s,'hero_264');assert.equal(pp.talent.familyStella,365);assert.equal(pp.percent.familyStella,15500);
 // Scope: `bless:<wife>` -- a Fellow neither member blesses receives nothing.
 const other={...s,fellows:{...s.fellows,hero_1:newFellow(1)}};
 assert.deepEqual(familyStellaParts(other,'hero_1'),{talent:0,percent:0,limit:0},'hero_1 is blessed by neither member');
 // NEGATIVE CONTROLS: a rank the shards never paid for, and a rank past the table, are refused.
 assert.equal(validStella({...s,familyStella:{policyVersion:1,ranks:{...s.familyStella.ranks,wife_185:14}}}),false);
 assert.equal(validFamilyStella({...s,familyStella:{policyVersion:1,ranks:{wife_185:21}}}),false);
 assert.equal(validFamilyStella({...s,familyStella:{policyVersion:1,ranks:{wife_2:0}}}),false,'a member with no WifeSpirit');
 const raw=JSON.stringify(s);assert.equal(JSON.stringify(decode(raw)),raw);
});

test('Family Stella’s NewHalo_4 raises the talent level cap of the member’s Fellows',()=>{
 let s=village('hero_264',0,['wife_185']);s=go(s,'familyStellaActivate','wife_185');
 const base=[talentCap(s,'hero_264'),talentSkillCap(s,'hero_264','Hero264_Talent_extra2_2')];
 for(let i=0;i<6;i++)s=go(s,'familyStellaUpgrade','wife_185',1);
 assert.deepEqual([talentCap(s,'hero_264'),talentSkillCap(s,'hero_264','Hero264_Talent_extra2_2')],base.map(n=>n+30),'rank 6: +30 levels');
});

test('Stella-unlocked pairs are a SEPARATE set: Orivita’s rank 4 opens wife 115, recipients untouched',()=>{
 let s=village('hero_114',3,['wife_115']);
 // APK record for wife 115 created by training -- its recipients must stay the source list (validBlessings).
 s={...s,family:{...s.family,wife_115:{...s.family.wife_115,points:1e7}}};
 s=go(s,'trainBlessingsMax','wife_115','flatBlessing');s=go(s,'trainBlessingsMax','wife_115','advancedBlessing');
 assert.ok(!BLESS.recipients.wife_115.includes('hero_114'),'positive control: she is NOT in the source list');
 assert.deepEqual(s.family.wife_115.apkBlessings.flatBlessing.recipients,BLESS.recipients.wife_115);
 assert.deepEqual(stellaBlessPairs(s),[],'rank 3: locked');assert.deepEqual(familyPairBlessing(s,'hero_114'),{flat:0,percent:0});
 s=go(s,'stellaUpgrade','hero_114',{seq:stellaState(s).seq,count:1});
 assert.deepEqual(stellaBlessPairs(s),[['wife_115','hero_114']]);
 const pair=familyPairBlessing(s,'hero_114');assert.ok(pair.flat>0&&pair.percent>0,JSON.stringify(pair));
 assert.equal(powerParts(s,'hero_114').flat.familyPair,pair.flat);
 assert.ok(validBlessings(s),'the recipients-equality guard still holds');assert.ok(valid(s),refusedBy(s));
 assert.deepEqual(blessingRecipients(s,'wife_115'),BLESS.recipients.wife_115,'the list itself never widened');
});

test('quenching: the cheapest slot steps first, gold is spent at the ladder’s price, Power takes the percent',()=>{
 let s=go(fresh(T),'activateOriginalProgression');s={...s,gold:1e13,inventory:{...s.inventory,Item_Weapon_Equipment_1_1:1}};
 s=go(s,'equip','hero_15','Item_Weapon_Equipment_1_1');
 s=go(s,'quenchArtifact','hero_15',1);
 assert.deepEqual(s.fellows.hero_15.quench,{Item_Weapon_Equipment_1_1:[5,0]});assert.equal(1e13-s.gold,83);
 s=go(s,'quenchArtifact','hero_15','max');
 assert.deepEqual(s.fellows.hero_15.quench.Item_Weapon_Equipment_1_1,[16,16],'both slots to the top of the gold ladder');
 assert.equal(1e13-s.gold,2*QUENCH_LADDER.at(-1)[2]);
 assert.equal(quenchPercent(s.fellows.hero_15),3200);assert.equal(powerParts(s,'hero_15').percent.quench,3200);
 assert.ok(valid(s),refusedBy(s));assert.match(act(s,'quenchArtifact',s.lastAt,'hero_15',1).error,/top of the gold ladder/);
 // NEGATIVE CONTROLS: an unreachable row, a row between the table's steps, and a third slot are refused.
 const q=rows=>({...s,fellows:{...s.fellows,hero_15:{...s.fellows.hero_15,quench:{Item_Weapon_Equipment_1_1:rows}}}});
 assert.equal(validQuench(q([17,16])),false);assert.equal(validQuench(q([3,16])),false);assert.equal(validQuench(q([16,16,16])),false);
 assert.equal(quenchStepCost(16),null);
 const raw=JSON.stringify(s);assert.equal(JSON.stringify(decode(raw)),raw);
});
