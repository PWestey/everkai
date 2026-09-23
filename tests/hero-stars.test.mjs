import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode} from '../lib/game.mjs';
import {newFellow,powerParts,validAdventure} from '../lib/adventure.mjs';
import {stellaRule,stellaState,validStella,SPIRIT_SHARD_ITEM} from '../lib/stella.mjs';
import {HERO_STARS,STAR_HALOS,STAR_HELD,STAR_TIER_NAMES,effectiveStar,starParts,starHaloParts,originParts,originRule,gateLine,awakenView} from '../lib/hero-stars.mjs';
import {heroAdvanceSpend} from '../lib/hero-advance.mjs';
import {talentSkillUnlocked} from '../lib/talent-skills.mjs';
import {grantFragments} from './progression-helpers.mjs';
import operationData from '../lib/operation-data.json' with {type:'json'};

// STARS, STAR HALOS AND ORIGIN BOOST -- docs/power-sources-import-spec.md section 4.
const T=new Date('2026-09-16T09:00:00').getTime();
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
const roster=(fellows)=>{const s=fresh(T);return {...s,fellows:{...s.fellows,...Object.fromEntries(Object.entries(fellows).map(([id,p])=>[id,{...newFellow(1),...p}]))}}};

test('HeroStar: the original’s own rows, star 7 clamps to 6, and the level gates are honoured at read time',()=>{
 assert.deepEqual(HERO_STARS[3],{percent:3000,flat:1500000,halo:4,next:550,roster:[3,15],stones:15});
 assert.deepEqual(HERO_STARS.map(r=>r.next),[300,300,400,550,700,750,null]);
 // THE ROSTER PREREQUISITE and the original's own price, imported 2026-09-22. `roster` is
 // needHeroStarCount -- the account must hold 15/20/25 Fellows at 3/4/5 stars to reach 4/5/6 -- and
 // `stones` is what the original charges in Acquaint Stones, recorded for the panel and never
 // charged (Everkai keeps its own star shards so lib/fellow-reset.mjs's refunds stay honest).
 assert.deepEqual(HERO_STARS.map(r=>r.roster),[null,null,null,[3,15],[4,20],[5,25],null]);
 assert.deepEqual(HERO_STARS.map(r=>r.stones),[3,5,10,15,30,50,null]);
 assert.equal(HERO_STARS.reduce((n,r)=>n+(r.stones||0),0),113,'one Fellow 0 -> 6 stars in the original');
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
 // `name` joined 2026-09-22 from the original's own en/translate.json, for the talent rows
 // docs/fellow-screen-specs/05-awaken.md specifies (`Lv.4 Power Boost`). Wording is exactly what
 // that spec says the captures ARE evidence for, so the panel invents no names of its own; the
 // three columns that carry VALUE are unchanged, which this still asserts.
 assert.deepEqual(STAR_HALOS.Hero264_Star_Skill_2,{prop:'percent',scope:['bond','22'],values:[1000,1500,2000,2500,3000,3500,4000],name:'Power Boost'});
 assert.equal(Object.values(STAR_HALOS).filter(x=>x.name).length,Object.keys(STAR_HALOS).length,'every halo is named');
 // The seven names the original's own tooltip gives halo levels 1..7.
 assert.deepEqual(STAR_TIER_NAMES,['Novice','Proficient','Virtuoso','Outstanding','Perfect','Divine','Ascendent']);
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

// ---- THE SCREEN, against docs/fellow-screen-specs (captured from the original, 2026-09-22) ----
// Those captures are evidence for LAYOUT, WORDING and STATE and explicitly NOT for numbers, so what
// is pinned here is the generated text and the row shape; every magnitude still comes from the
// tables and is pinned above.

test('the Awaken gate line is generated in the original\'s own two forms, verbatim',()=>{
 // spec 05: `Reach Lv. 550 and have 3-Star Fellows x15 to awaken to next Star.` and, when only a
 // level gate applies, `Reach Lv. 300 to awaken to the next Star.` -- the second form drops the
 // roster clause entirely. The line is generated from the requirement, never authored per Fellow.
 //
 // OWNER RULING 2026-09-22: the roster clause is a ROSTER requirement, not a multiplayer one, so
 // Everkai's single-player design rule does not apply and it ships exactly as measured -- not
 // adapted, not softened, not replaced. This assertion is what holds that.
 const at=stars=>gateLine(roster({hero_1:{stars,level:750,breaks:13}}),'hero_1');
 assert.equal(at(0),'Reach Lv. 300 to awaken to the next Star.');
 assert.equal(at(1),'Reach Lv. 300 to awaken to the next Star.');
 assert.equal(at(2),'Reach Lv. 400 to awaken to the next Star.');
 assert.equal(at(3),'Reach Lv. 550 and have 3-Star Fellows x15 to awaken to next Star.');
 assert.equal(at(4),'Reach Lv. 700 and have 4-Star Fellows x20 to awaken to next Star.');
 assert.equal(at(5),'Reach Lv. 750 and have 5-Star Fellows x25 to awaken to next Star.');
 assert.equal(at(6),null,'the top star has no next gate and therefore no line');
});

test('Awaken talent rows carry the original\'s own name, level, tier name and next value',()=>{
 // spec 05: `Lv.4 Support Power` / effect / `(Next Level +3%)`, and an (i) listing the whole seven
 // tier ladder with the current one in parentheses. Shinobu at star 3 broadcasts at halo level 4.
 const s=roster({hero_264:{stars:3,level:600,breaks:13}});
 const v=awakenView(s,'hero_264');
 assert.equal(v.active,3);
 assert.equal(v.halo,4);
 assert.ok(v.talents.length>0,'positive control: she broadcasts halos Everkai pays');
 const boost=v.talents.find(t=>t.name==='Power Boost');
 assert.ok(boost,'the halo is named from the original, not from an invented string');
 assert.equal(boost.level,4);
 assert.equal(boost.tierName,'Outstanding','Lv.4 and Outstanding are the same value said two ways');
 assert.equal(boost.value,2500);
 assert.equal(boost.next,3000);
 assert.equal(boost.ladder.length,7);
 assert.deepEqual(boost.ladder.map(r=>r.tierName),STAR_TIER_NAMES);
 assert.deepEqual(boost.ladder.map(r=>r.value),[1000,1500,2000,2500,3000,3500,4000]);
 // The top star has no next level, so the row says so rather than inventing one.
 const top=awakenView(roster({hero_264:{stars:6,level:750,breaks:13}}),'hero_264');
 assert.equal(top.halo,7);
 assert.equal(top.talents.find(t=>t.name==='Power Boost').next,null);
 // The rows follow the ACTIVE star, not the stored one: a star the Fellow's level does not yet
 // support broadcasts nothing, and the panel must not advertise a level it is not paying.
 const early=awakenView(roster({hero_264:{stars:6,level:600,breaks:13}}),'hero_264');
 assert.equal(early.stored,6);
 assert.equal(early.active,4,'Lv. 600 supports 4 stars, not 6');
 assert.equal(early.halo,5,'so the halos broadcast at level 5, not 7');
 assert.equal(early.talents.find(t=>t.name==='Power Boost').value,3000);
 // A Fellow may show FEWER rows than the original's four, and that is the measured hold rather than
 // a gap: 442 of the original's 444 roster-wide finalpercent halos fire only in content Everkai has
 // none of, so they are counted in STAR_HELD and never paid.
 assert.equal(STAR_HELD['atk finalpercent'],211);
});

test('the Operation skill carries the original\'s own name and roman tier',()=>{
 // spec 07: the title is `Operation Faculty V: Lv. 101/300` -- the roman numeral is part of the
 // skill's NAME and the arabic level follows a colon. Both come from the original: the name from
 // en/translate.json, the tier from SkillBase.stars.
 const named=operationData.records.flatMap(r=>r.effects).filter(e=>e.name);
 assert.equal(named.length,144,'every levelable row is named; the fixed Extra rows are not');
 assert.ok(named.every(e=>/^(Operation Faculty|Omnipotent Operator) [IVXⅠ-Ⅻ]+$/.test(e.name)),
  'a name that is not the original\'s own shape');
 assert.ok(named.every(e=>Number.isInteger(e.tier)&&e.tier>=1&&e.tier<=7));
 // The fixed rows carry no name in the original either, which is exactly why the spec renders them
 // as star-bulleted sentences under `Operation Effect` with no title, level, cost or button.
 const fixed=operationData.records.flatMap(r=>r.effects).filter(e=>!e.perLevel);
 assert.equal(fixed.length,350);
 assert.ok(fixed.every(e=>e.name===undefined));
});
