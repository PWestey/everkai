import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode} from '../lib/game.mjs';
import {newFellow,powerParts,validAdventure} from '../lib/adventure.mjs';
import {stellaRule,stellaState,validStella,SPIRIT_SHARD_ITEM} from '../lib/stella.mjs';
import {HERO_STARS,STAR_HALOS,STAR_HELD,effectiveStar,starParts,starHaloParts,originParts,originRule} from '../lib/hero-stars.mjs';
import {heroAdvanceSpend} from '../lib/hero-advance.mjs';
import {talentSkillUnlocked} from '../lib/talent-skills.mjs';
import {grantFragments} from './progression-helpers.mjs';

// STARS, STAR HALOS AND ORIGIN BOOST -- docs/power-sources-import-spec.md section 4.
const T=new Date('2026-09-16T09:00:00').getTime();
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
const roster=(fellows)=>{const s=fresh(T);return {...s,fellows:{...s.fellows,...Object.fromEntries(Object.entries(fellows).map(([id,p])=>[id,{...newFellow(1),...p}]))}}};

test('HeroStar: the original’s own rows, star 7 clamps to 6, and the level gates are honoured at read time',()=>{
 assert.deepEqual(HERO_STARS[3],{percent:3000,flat:1500000,halo:4,next:550});
 assert.deepEqual(HERO_STARS.map(r=>r.next),[300,300,400,550,700,750,null]);
 assert.deepEqual(starParts({stars:3,level:600}),{percent:3000,flat:1500000});
 assert.equal(effectiveStar({stars:7,level:750}),6,'Everkai sells 7; the original has 6');
 // Cimitir's case (spec 4.4): one star at level 150 pays nothing until level 300.
 assert.deepEqual(starParts({stars:1,level:150}),{percent:0,flat:0});
 assert.deepEqual(starParts({stars:1,level:300}),{percent:1000,flat:400000});
 assert.equal(effectiveStar({stars:3,level:399}),2,'star 3 needs level 400');
 // NEVER REFUSED (rule 12): a stored star the level does not support is inactive, not illegal.
 const s=roster({hero_1:{stars:7,level:1}});assert.ok(validAdventure(s));
 const p=powerParts(s,'hero_1');assert.equal(p.percent.stars,0);assert.equal(p.flat.stars,0);
 // Star skills unlock on the counted star, not the bought one.
 const g=roster({hero_264:{stars:3,level:399}});
 assert.deepEqual([1,2,3].map(k=>talentSkillUnlocked(g,'hero_264','Hero_Talent_StarSkill_'+k)),[true,true,false]);
});

test('star halos: percent and talent ship, finalpercent is HELD (owner-confirmed), scope is the original’s',()=>{
 assert.equal(STAR_HELD['atk finalpercent'],211,'the roster-wide final multiplier rows, counted and not shipped');
 assert.ok(Object.values(STAR_HALOS).every(x=>['percent','talent','coef'].includes(x.prop)));
 // Shinobu's halos: bond 22 +1,000..4,000, rare 5 +300..900. At her star 3 (halo level 4): 2,500 and 600.
 assert.deepEqual(STAR_HALOS.Hero264_Star_Skill_2,{prop:'percent',scope:['bond','22'],values:[1000,1500,2000,2500,3000,3500,4000]});
 const s=roster({hero_264:{stars:3,level:600},hero_301:{},hero_114:{}});
 assert.equal(starHaloParts(s,'hero_301').percent>=2500,true,'a bond-22 Demon Slayer receives her bond halo');
 assert.equal(starHaloParts(s,'hero_114').percent-starHaloParts(roster({hero_114:{},hero_301:{}}),'hero_114').percent,600,'a rarity-5 Fellow receives her rare-5 halo');
 // NEGATIVE CONTROL: with no stars (halo level 1) she still broadcasts, at level-1 values.
 const zero=roster({hero_264:{level:600},hero_301:{}});
 assert.ok(starHaloParts(s,'hero_301').percent-starHaloParts(zero,'hero_301').percent===1500,'2,500 at star 3 vs 1,000 at none');
});

test('a Rarity Advance stage swaps a hero’s star halo for its stage version',()=>{
 const s=roster({hero_264:{stars:3,level:600},hero_114:{}});
 const base=starHaloParts(s,'hero_114').percent;
 const m1={...s,heroAdvance:{policyVersion:1,fellows:{hero_264:{magic:80}}}};
 assert.notEqual(starHaloParts(m1,'hero_114').percent,base,'Hero264_Star_Skill_3 -> Hero264M1_Star_Skill_3 at 80');
});

test('Origin Boost: 5 talent a level, +2,000 bp at 50 and 100, +250 talentpercent every 50 from 150',()=>{
 assert.deepEqual(originParts('hero_264',244),{talent:1220,percent:4000,coef:500},'the owner’s Shinobu, table-exact');
 assert.equal(originRule('hero_1'),null);
 let s=go(fresh(T),'activateOriginalProgression');s={...s,fellows:{...s.fellows,hero_264:newFellow(1)}};
 s=grantFragments(s,'hero_264',10);s=go(s,'stellaActivate','hero_264',{seq:stellaState(s).seq});
 s=go(s,'originBoost','hero_264','max');
 const lv=s.heroAdvance.fellows.hero_264.origin;assert.ok(lv>=100,String(lv));
 assert.deepEqual(heroAdvanceSpend(s),{[SPIRIT_SHARD_ITEM]:lv*10});assert.ok(valid(s),refusedBy(s));
 const p=powerParts(s,'hero_264');assert.equal(p.talent.origin,5*lv);assert.equal(p.coefpercent.origin,originParts('hero_264',lv).coef);
 // NEGATIVE CONTROLS: an unpaid level, and a level past 600.
 assert.equal(validStella({...s,heroAdvance:{policyVersion:1,fellows:{hero_264:{origin:lv+1}}}}),false);
 assert.equal(valid({...s,heroAdvance:{policyVersion:1,fellows:{hero_264:{origin:601}}}}),false);
 const raw=JSON.stringify(s);assert.equal(JSON.stringify(decode(raw)),raw);
});
