import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,refusedBy,decode} from '../lib/game.mjs';
import {newFellow,powerParts} from '../lib/adventure.mjs';
import {FISH,fishSkill,fishLevelCost,fishSkillSpent,fishExpSpent,fishExp,fishingBonuses,validFishing,FISH_SKILL_MAX} from '../lib/fishing.mjs';
import {relicBonus,RESTORATION_MAX,TREASURE_RELICS} from '../lib/treasure.mjs';
import {heroScope,reaches} from '../lib/hero-scope.mjs';
import DATA from '../lib/fish-skill-data.json' with {type:'json'};

// THE ACCOUNT-WIDE FLAT FLOOR -- docs/power-sources-import-spec.md section 2.
const T=new Date('2026-09-16T09:00:00').getTime();
/** The owner's own normal fish-skill levels (scratchpad/live-player.json, every fish record's `Fish_<id>`). */
const OWNER={F1103:5,F1201:7,F1102:1,F1101:7,F1202:4,F1302:4,F2102:10,F2104:8,F2201:7,F2202:6,F2203:8,F2204:8,F2101:9,F2103:8,F2302:4,F2306:6,F2205:8,F2206:7,F2401:2,F2305:2,F2303:6,F2301:4,F2304:4,F2405:6,F2404:3,F3203:14,F3204:14,F3302:6,F3102:14,F3202:13,F3201:11,F3304:6,F3101:14,F3305:5,F3103:15,F3306:6,F3407:2,F3504:2,F3303:6,F3301:4,F3402:3,F3502:1,F2402:3,F3404:2,F3505:2,F3401:3,F3405:2,F1501:2,F1301:2,F2502:2};
/** A VALID fishing record: one first catch per species (policy 2), plus enough researched duplicates to have
 *  paid for every level exactly -- validFishing re-derives the points from the ladder. `gold` species get a
 *  policy-4 catch in the Gold Crown band instead. */
function tank(levels,gold=[],spare=0){
 const species=new Map(FISH.map(r=>[r.id,r]));const catches=[];let n=0;
 const add=(fish,dup,band)=>{const r=species.get(fish);n++;const c={id:`catch:${n}`,fish,name:r.name,effect:{...r.effect,rarities:[...r.effect.rarities]},ground:'All grounds',caughtAt:T,policyVersion:band?4:2,duplicate:dup};
  if(band){const lb=r.lengthBands?.[band-1]||[0,0];Object.assign(c,{band,length:lb[0]});}catches.push(c);return c;};
 for(const id of Object.keys(levels))add(id,false,gold.includes(id)?4:0);
 // Each species' own FishExp past level 3 comes from ITS duplicates; the rest of the pooled points from the first.
 const spent=Object.entries(levels).reduce((t,[id,l])=>t+fishSkillSpent(id,l),0),researched=[];
 for(const [id,l] of Object.entries(levels))for(let i=0;i<fishExpSpent(id,l);i++)researched.push(add(id,true,0).id);
 while(researched.length<spent+spare)researched.push(add(Object.keys(levels)[0],true,0).id);
 return {bait:20,catches,displayed:Object.keys(levels),researched,skills:{...levels},points:spare};
}
const village=(fellows,fishing)=>{const s=fresh(T);return {...s,fishing,fellows:{...s.fellows,...Object.fromEntries(fellows.map(id=>[id,newFellow()]))}}};

test('the import: 86 normal skills in the census the spec quotes, and 13 FishExp ladders',()=>{
 assert.equal(Object.keys(DATA.species).length,86);
 assert.deepEqual(DATA.census,{'atk/extradd/all':13,'atk/extradd/country':10,'atk/extradd/rare':12,'atk/percent/all':5,'atk/percent/country':10,'talent/None/all':5,'talent/None/country':10,'talent/None/rare':21});
 for(const r of FISH)assert.ok(fishSkill(r.id),r.id+' has no original skill');
 assert.deepEqual(DATA.ladders.Fish_1.slice(0,2),[[1,3,1],[4,6,2]]);
 // Rule 4, one real row: Fish_1101 is +15,000 flat to country 1, +5,000 a level.
 assert.deepEqual([fishSkill('F1101').i,fishSkill('F1101').l,fishSkill('F1101').scope],[15000,5000,['country','1']]);
});

test('scope is the original’s: country OR Hero.json rarity OR all, never Everkai’s rarity labels',()=>{
 assert.deepEqual(heroScope('hero_264'),{country:'4',rarity:9});assert.deepEqual(heroScope('hero_114'),{country:'5',rarity:5});
 assert.equal(reaches(['rare','5'],'hero_114'),true);assert.equal(reaches(['rare','5'],'hero_264'),false,'Shinobu (rarity 9) is not rare 5');
 assert.equal(reaches(['country','4'],'hero_264'),true);assert.equal(reaches(['country','4'],'hero_114'),false,'Orivita (country 5) is not country 4');
 // A rarity-scoped fish (F2405, +15 talent to rare 5) reaches Orivita; the old {type, rarities:['UR']} record could not,
 // because her catalogue rarity is the LABEL "UR" only by accident of the wiki and most UR Fellows read "SSR+ -> UR".
 const x=fishSkill('F2405');assert.deepEqual(x.scope,['rare','5']);
 const s=village(['hero_114','hero_264'],tank({F2405:1}));
 assert.ok(fishingBonuses(s,'hero_114')[x.stat==='talent'?'aptitude':'flat']>0,'Orivita receives the rare-5 fish');
 assert.deepEqual(fishingBonuses(s,'hero_264'),{flat:0,aptitude:0,percent:0},'Shinobu (rarity 9) does not');
});

test('the owner’s fish levels reproduce his panels’ normal-skill fishing to the unit',()=>{
 // docs/power-sources-import-spec.md 2.2: the tables at his levels give Shinobu 1,031,000 flat / 1,250 bp and
 // Orivita 2,251,000 / 3,250 -- normal AND Gold Crown skills at his levels. The normal half, from Everkai:
 const s=village(['hero_264','hero_114'],tank(OWNER));
 assert.ok(validFishing(s),'the tank is a legal save');
 assert.deepEqual(fishingBonuses(s,'hero_264'),{flat:481000,aptitude:25,percent:8});
 assert.deepEqual(fishingBonuses(s,'hero_114'),{flat:1731000,aptitude:86,percent:8});
 const pp=powerParts(s,'hero_264');assert.equal(pp.flat.fishing,481000);assert.equal(pp.percent.fishing,800);
});

test('Gold Crown: a species caught in its Gold band pays its skillB at level 1, derived from the stored catch',()=>{
 const plain=village(['hero_15'],tank({F1101:1})),gold=village(['hero_15'],tank({F1101:1},['F1101']));
 assert.equal(heroScope('hero_15').country,'5');
 const inspiring=village(['hero_115'],tank({F1101:1},['F1101']));
 assert.equal(fishingBonuses(inspiring,'hero_115').flat,15000+30000,'normal 15,000 + Gold 30,000 to country 1');
 assert.equal(fishingBonuses(village(['hero_115'],tank({F1101:1})),'hero_115').flat,15000,'no Gold catch, no Gold skill');
 assert.deepEqual(fishingBonuses(gold,'hero_15'),fishingBonuses(plain,'hero_15'),'and never to another country');
 assert.ok(validFishing(inspiring),refusedBy(inspiring));
});

test('levels past 3 are bought on the FishExp ladder; levels 2-3 keep their price (rule 12)',()=>{
 // n(n-1) through level 3 -- what every save written before 2026-09-18 paid -- then the ladder.
 assert.deepEqual([1,2,3].map(n=>fishSkillSpent('F1101',n)),[0,2,6]);
 assert.equal(fishSkillSpent('F1101',7),13,'2 + 4, then the ladder: 1 + 2 + 2 + 2 (n(n-1) would be 42)');
 assert.deepEqual([3,4,5,6,90,91,401].map(l=>fishLevelCost('F1101',l)),[1,2,2,2,29,30,150]);
 const s=village(['hero_115'],tank({F1101:7}));assert.equal(validFishing(s),true);
 // NEGATIVE CONTROLS: a level the points never paid for, and a level past the bound, are refused.
 assert.equal(validFishing({...s,fishing:{...s.fishing,skills:{F1101:8}}}),false);
 assert.equal(validFishing({...s,fishing:{...s.fishing,skills:{F1101:FISH_SKILL_MAX+1}}}),false);
 // A level-3 tank written with the old rule is still exactly legal.
 assert.equal(validFishing(village(['hero_115'],tank({F1101:3}))),true);
 // FishExp is per species (the owner's save keeps normalExp on each fish): past level 3 a species levels only on
 // its OWN researched duplicates. F1101 at 7 has used 1+2+2+2 = 7 of them.
 assert.equal(fishExpSpent('F1101',7),7);assert.ok(fishExp(s.fishing,'F1101')>=7);
 // NEGATIVE CONTROL: the same levels paid from ANOTHER species' duplicates are refused.
 const pooled=village(['hero_115'],tank({F1102:1,F1101:3},[],7));
 assert.equal(validFishing({...pooled,fishing:{...pooled.fishing,skills:{...pooled.fishing.skills,F1101:7},points:pooled.fishing.points-7}}),false,'pooled points cannot buy another species past 3');
 // Upgrading past 3 through the action spends the ladder's price.
 const v0=village(['hero_115'],tank({F1102:1,F1101:3},[],5));assert.ok(valid(v0),refusedBy(v0));
 assert.match(act(v0,'upgradeFish',v0.lastAt,'F1101').error||'',/own FishExp/,'spare points of the wrong species do not count');
 const v=village(['hero_115'],tank({F1101:3},[],5));assert.ok(valid(v),refusedBy(v));
 const r=act(v,'upgradeFish',v.lastAt,'F1101');assert.ok(!r.error,r.error);
 assert.deepEqual([r.state.fishing.skills.F1101,r.state.fishing.points],[4,4]);
});

test('relics pay their flat, scoped: a country-1 UR Fellow gets 1,220,000 at level 1 and 9,966,500 at 120',()=>{
 assert.equal(RESTORATION_MAX,119,'Exhibit.levelUpMaxLevel 120 = the donation level + 119 restorations');
 const all=(level)=>{const s=fresh(T);const relics={};for(const r of TREASURE_RELICS)relics[r.id]={materials:0,donated:true,displayed:true,...(level>1?{restorations:Array.from({length:level-1},()=>({policyVersion:2,materials:1}))}:{})};
  return {...s,treasure:{policyVersion:1,seq:0,seed:1,day:0,stamina:0,xp:0,trip:null,gems:{},relics},fellows:{...s.fellows,hero_115:newFellow(),hero_264:newFellow()}}};
 // The spec's 1,239,600 / 10,176,500 also count Hall3 Exhibit_1..5 and Museum_Collection_0 (19,600 at level 1,
 // 210,000 at 120), which Everkai does not ship -- deferred, stated in the spec's step-2 log.
 assert.equal(relicBonus(all(1),'hero_115').flat,1239600-19600);
 assert.equal(relicBonus(all(120),'hero_115').flat,10176500-210000);
 // Shinobu (country 4, rarity 9): only the `all` and country-4 rows.
 assert.equal(relicBonus(all(1),'hero_264').flat,60000+20000+100000+40000);
 // The talent rows are scoped now too (they used to reach everyone): rare-5 Ladon's Skeleton is Orivita's kind, not Shinobu's.
 assert.ok(relicBonus(all(1),'hero_115').aptitude>relicBonus(all(1),'hero_264').aptitude);
 const s=all(1);assert.equal(powerParts(s,'hero_115').flat.museum,1220000);
 const v=all(120);
 const raw=JSON.stringify(v);assert.equal(JSON.stringify(decode(raw)),raw,'a 119-restoration relic save round-trips');
});
