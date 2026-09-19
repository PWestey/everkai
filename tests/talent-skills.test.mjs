import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode} from '../lib/game.mjs';
import {newFellow,powerParts} from '../lib/adventure.mjs';
import {stellaRule,stellaState,validStella,SPIRIT_SHARD_ITEM} from '../lib/stella.mjs';
import {TALENT_SKILLS,STAR_TALENT_SKILLS,SKILL_PEARL,heroTalentSkills,talentSkillParts,talentSkillCap,talentSkillPlan,talentSkillLevel,validTalentSkills} from '../lib/talent-skills.mjs';
import {magicRule,pledgeRule,magicBonus,heroAdvanceSpend,validHeroAdvance} from '../lib/hero-advance.mjs';
import {APTITUDE_CAP,LEGACY_APTITUDE_CAP} from '../lib/aptitude-cap.mjs';
import {familyLimitBound} from '../lib/family-stella.mjs';
import {insightRule} from '../lib/insight.mjs';
import {refundPlan} from '../lib/fellow-reset.mjs';
import {ORIGINAL_FELLOWS} from '../lib/catalog.mjs';
import DATA from '../lib/talent-skill-data.json' with {type:'json'};
import {grantFragments} from './progression-helpers.mjs';

// SKILL APTITUDE -- docs/power-sources-import-spec.md section 1 (scripts/import-talent-skills.py).
const T=new Date('2026-09-16T09:00:00').getTime();
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
const value=(skill,level)=>TALENT_SKILLS[skill].i+(level-1)*TALENT_SKILLS[skill].l;
/** An APK-growth village owning one Fellow with its Stella climbed to `rank` through the real actions. */
function owner(id,rank=20){
 let s=go(fresh(T),'activateOriginalProgression');s={...s,fellows:{...s.fellows,[id]:newFellow(1)}};
 const p=stellaRule(id);s=grantFragments(s,id,Math.ceil(p.levels.reduce((n,r)=>n+r.cost,0)/1000)+20);
 s=go(s,'stellaActivate',id,{seq:stellaState(s).seq});
 for(let i=0;i<rank;i++)s=go(s,'stellaUpgrade',id,{seq:stellaState(s).seq,count:1});
 return s;
}
const set=(s,id,patch)=>({...s,fellows:{...s.fellows,[id]:{...s.fellows[id],...patch}}});
/** The owner's own Shinobu, levels read from his account (scratchpad/live-player.json, hero 264 `skills`). */
const SHINOBU={Hero264_Talent_extra2_2:2,Hero264_Talent_extra6_1:2,Hero264_Talent_extra3_2:149,Hero264_Talent_extra4_3:2,Hero_Talent_Country4Base_2:2,Hero264_Talent_extra5_4:3,Hero264_Talent_extra7_4:2,Hero264_Talent_Country4Base_3:2,Hero264_Talent_Bonus1:400,Hero264_Talent_Bonus2:400,Hero264_Talent_Bonus3:400,Hero264_Talent_Bonus5:400};

test('the import: Shinobu’s controls, the 107,198 ceiling, and the cap it now sets',()=>{
 assert.equal(DATA.ceiling.cap,107198);assert.equal(DATA.ceiling.hero,'hero_253');
 assert.equal(APTITUDE_CAP,107198);assert.ok(APTITUDE_CAP>=LEGACY_APTITUDE_CAP);
 assert.equal(Object.keys(DATA.heroes).length,159,'every shipped original plus every released one a save may hold');
 for(const f of ORIGINAL_FELLOWS)assert.ok(DATA.heroes[f.id.slice(5)],f.id+' has no talent-skill record');
 assert.deepEqual(STAR_TALENT_SKILLS,[1,2,3,4,5,6].map(k=>`Hero_Talent_StarSkill_${k}`));
 // Three real rows (rule 4): value = initial + (L-1) x perLevel.
 assert.equal(value('Hero264_Talent_Bonus5',400),2000);
 assert.equal(value('Hero264_Talent_extra3_2',149),298);
 assert.equal(value('Hero_Talent_StarSkill_3',1),3);
 assert.equal(magicBonus('hero_264',200),1000);assert.equal(magicBonus('hero_142',30),142,'the original’s own dip ships as read');
});

test('one Skill Pearl buys one Aptitude on every pearl skill but two; Country skills cost 100 books per Aptitude',()=>{
 let pearl=0,books=0;
 for(const [id,r] of Object.entries(TALENT_SKILLS)){
  // The original's own two exceptions: extra7_4 on heroes 251 and 260 is +4 a level for 3 pearls.
  if(r.c===SKILL_PEARL){if(['Hero251_Talent_extra7_4','Hero260_Talent_extra7_4'].includes(id))assert.deepEqual([r.p,r.l],[3,4]);else assert.equal(r.p,r.l,id);pearl++;}
  else if(/^Item_Hero_Talent_Country_\d$/.test(r.c)){assert.equal(r.p,100*r.l,id);books++;}
 }
 assert.ok(pearl>300&&books>10,`${pearl} pearl skills, ${books} Country skills`);
});

test('never counted twice: the Fellow’s Base_N and its Insight I stay with their own modules',()=>{
 let checked=0;
 for(const f of ORIGINAL_FELLOWS){const ids=heroTalentSkills(f.id).map(x=>x.skill),own=DATA.heroes[f.id.slice(5)].base.filter(x=>/^Hero_Talent_Base_\d$/.test(x));
  // The Base_N in Hero.json is lib/talents.mjs's. (A Rarity Advance stage may ADD a different Base_N --
  // hero_186's does -- and that one is a separate skill, trained here.)
  if(f.id!=='hero_60')assert.ok(!own.some(x=>ids.includes(x)),f.id+' trains its Base_N twice');
  assert.ok(!ids.includes(insightRule(f.id).skillId),f.id+' trains Insight I twice');checked++;}
 assert.equal(checked,111);
 // hero_60 has no resolved lib/talents.mjs rule, so its Base_2 is trained HERE -- once.
 assert.ok(heroTalentSkills('hero_60').some(x=>x.skill==='Hero_Talent_Base_2'));
});

test('the owner’s Shinobu reproduces Skill 6,155 and her Stella, Rarity Advance and stage talent',()=>{
 let s=owner('hero_264');
 s={...set(s,'hero_264',{level:600,stars:3,talentSkills:SHINOBU}),heroAdvance:{policyVersion:1,fellows:{hero_264:{magic:200,pledge:60}}}};
 s={...s,bonds:{...s.bonds,wife_185:{fellow:'hero_264',level:10,original:false}},family:{...s.family,wife_185:{points:0}}};
 const p=talentSkillParts(s,'hero_264');
 // 6,155 = these skills + intimacy 200 + Base_3 at L400 (1,200, lib/talents.mjs) + Country4Base_1 at L2 (2, lib/insight.mjs)
 assert.equal(p.skills+p.intimacy+1200+2,6155);
 assert.deepEqual([p.intimacy,p.stella,p.rarity,p.stage],[200,2050,1000,140]);
 // NEGATIVE CONTROL: each unlock really gates. Without Rarity Advance the stage skills stop counting;
 // without stars the star skills do; with the Stella rank below 8, Bonus5's 2,000 is gone.
 const noMagic={...s,heroAdvance:{policyVersion:1,fellows:{}}};
 assert.ok(talentSkillParts(noMagic,'hero_264').skills<p.skills-298);
 assert.equal(talentSkillParts(set(s,'hero_264',{stars:0}),'hero_264').skills,p.skills-6);
 const low=owner('hero_264',7);const lowS={...set(low,'hero_264',{level:600,stars:3,talentSkills:SHINOBU}),heroAdvance:s.heroAdvance};
 assert.equal(talentSkillParts(lowS,'hero_264').skills,p.skills-2000);
 // The whole thing reaches Power through the talent bucket.
 const pp=powerParts(s,'hero_264');assert.equal(pp.talent.skills,p.skills);assert.equal(pp.talent.stellaTalent,2050);
});

test('the owner’s Orivita reproduces her 920 and her bond-5 Stella talent of 340',()=>{
 const s=set(owner('hero_114'),'hero_114',{level:550,stars:3});
 const p=talentSkillParts(s,'hero_114');
 // 920 = these L1 skills + Base_3 at L300 (900) + Country5Base_1 at L1 (1, Insight)
 assert.equal(p.skills+900+1,920);assert.equal(p.stellaBond,340);
});

test('training: cap is 300 + the Stella talent limit, pearls are spent 1:1, a locked skill refuses',()=>{
 let s=owner('hero_264');s={...s,inventory:{...s.inventory,[SKILL_PEARL]:10000}};
 const skill='Hero264_Talent_Bonus1';
 assert.equal(talentSkillCap(s,'hero_264',skill),300+100,'Stella rank 20 raises the talent level cap by 100');
 s=go(s,'trainTalentSkill','hero_264',{skill,amount:'max'});
 assert.equal(talentSkillLevel(s,'hero_264',skill),400);assert.equal(s.inventory[SKILL_PEARL],10000-399);
 assert.equal(s.fellows.hero_264.aptitude,10,'nothing is written into the stored Aptitude record');
 assert.ok(valid(s),refusedBy(s));
 const r=act(s,'trainTalentSkill',s.lastAt,'hero_264',{skill,amount:1});assert.match(r.error,/level cap/);
 const locked=act(s,'trainTalentSkill',s.lastAt,'hero_264',{skill:'Hero264_Talent_extra3_2',amount:1});assert.match(locked.error,/locked/);
 // Refund returns every pearl exactly and the village still loads.
 const back=refundPlan(s,'hero_264');assert.ok(!back.error,back.error);assert.equal(back.back['item:'+SKILL_PEARL],399);
 assert.equal(back.state.fellows.hero_264.talentSkills,undefined);assert.ok(valid(back.state),refusedBy(back.state));
});

test('validTalentSkills refuses what no level could be (negative controls)',()=>{
 const s=set(owner('hero_264'),'hero_264',{talentSkills:{Hero264_Talent_Bonus1:400}});assert.equal(validTalentSkills(s),true);
 assert.equal(validTalentSkills(set(s,'hero_264',{talentSkills:{Hero_Talent_Base_3:5}})),false,'Base_N belongs to lib/talents.mjs');
 assert.equal(validTalentSkills(set(s,'hero_264',{talentSkills:{Hero264_Talent_Bonus1:1}})),false,'level 1 is free and never stored');
 // The bound is 300 + the largest Stella limit (100) + the largest Family Stella limit any member blessing her
 // can give (300 for Shinobu, lib/family-stella.mjs familyLimitBound): 700.
 assert.equal(familyLimitBound('hero_264'),300);
 assert.equal(validTalentSkills(set(s,'hero_264',{talentSkills:{Hero264_Talent_Bonus1:700}})),true);
 assert.equal(validTalentSkills(set(s,'hero_264',{talentSkills:{Hero264_Talent_Bonus1:701}})),false,'above 300 + the largest limit');
 assert.equal(validTalentSkills(set(s,'hero_264',{talentSkills:{Hero114_Talent_Bonus1:2}})),false,'another hero’s skill');
});

test('Rarity Advance spends the shared Stella shards, and validStella counts that spend (rule 12)',()=>{
 let s=owner('hero_264');
 const before=stellaState(s).stock[SPIRIT_SHARD_ITEM];
 assert.equal(magicRule('hero_264').cost,10);assert.equal(pledgeRule('hero_264').open[1],200);
 assert.match(act(s,'pledgeAdvance',s.lastAt,'hero_264',10).error,/Rarity Advance first/);
 s=go(s,'rarityAdvance','hero_264','max');
 assert.equal(s.heroAdvance.fellows.hero_264.magic,Math.min(200,Math.floor(before/10)));
 assert.deepEqual(heroAdvanceSpend(s),{[SPIRIT_SHARD_ITEM]:s.heroAdvance.fellows.hero_264.magic*10});
 assert.ok(valid(s),refusedBy(s));
 // NEGATIVE CONTROLS: a level the shards never paid for, and a level above the table, are both refused.
 const free={...s,heroAdvance:{policyVersion:1,fellows:{hero_264:{magic:s.heroAdvance.fellows.hero_264.magic+1}}}};
 assert.equal(validStella(free),false);
 assert.equal(validHeroAdvance({...s,heroAdvance:{policyVersion:1,fellows:{hero_264:{magic:201}}}}),false);
 assert.equal(validHeroAdvance({...s,heroAdvance:{policyVersion:1,fellows:{hero_1:{magic:1}}}}),false,'a hero with no HeroMagicLevel');
 // Refund puts every shard back and removes the level.
 const back=refundPlan(s,'hero_264');assert.ok(!back.error,back.error);
 assert.equal(back.state.heroAdvance.fellows.hero_264,undefined);assert.ok(valid(back.state),refusedBy(back.state));
 // A save written by this build round-trips byte-identically.
 const raw=JSON.stringify(s);assert.equal(JSON.stringify(decode(raw)),raw);
});
