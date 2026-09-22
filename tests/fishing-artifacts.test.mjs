// THE FISHING ARTIFACTS (2026-09-22). The owner: "there are little artifacts that give bonuses (like
// the first one that gives 100% more exp per upgrade). Do we have these?" We do now, and this pins
// that the numbers are the original's and that no save written before them moves.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
process.env.TZ='America/Phoenix';   // the fixtures were written in the owner's zone; CI runs in UTC
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';
import {fishingState,fishingIndex,fishingBonuses,fishingArtifactYield,FISH_ARTIFACTS,fishArtifactCounts,fishArtifactLevel,fishArtifactValue,fishArtifactUpgradeCost,fishArtifactPearl,fishArtifactBonuses,fishArtifactTaxBp,pearls,pearlsFound,PEARL,BLACK_PEARL,FISH_EXP} from '../lib/fishing.mjs';
import {castExtra,drawPool,scriptedAt,ARTIFACT_WEIGHTS,ARTIFACT_SPOT_RANDOM,MAX_EXP_MULTIPLIER} from '../lib/fishing-artifacts.mjs';
import {taxBuffBp} from '../lib/trading-post-ladders.mjs';

const by=id=>FISH_ARTIFACTS.find(r=>r.id===id);
/** A state with the given artifacts held at the given levels, built by hand -- the acquisition path is
 *  tested separately, and this keeps the effect tests independent of the roll. */
function holding(levels,now=1000){
 const s=fresh(now),f=fishingState(s),found=[];
 for(const id of Object.keys(levels))found.push({id:`find:${found.length+1}`,kind:'artifact',artifact:id,ground:'Village River',at:now,duplicate:false});
 // Enough Pearls of each kind to have paid for every level asked for.
 for(const [id,l] of Object.entries(levels)){let n=0;for(let k=1;k<l;k++)n+=fishArtifactUpgradeCost(id,k);
  for(let i=0;i<n;i++)found.push({id:`find:${found.length+1}`,kind:fishArtifactPearl(id),artifact:null,ground:null,at:now,duplicate:false});}
 return {...s,fishing:{...f,artifacts:{policyVersion:1,found,levels:{...levels},bonusExp:0}}};
}

test('all 17 rows are the original FishArtifact table, and A1401 is the owner\'s +100% EXP one',()=>{
 assert.equal(FISH_ARTIFACTS.length,17);
 const a=by('A1401');
 assert.equal(a.name,'Legend Plate - 1');
 assert.equal(a.skill,'FishArtifact_1401');
 assert.deepEqual([a.stat,a.type,a.i,a.l,a.max],['FishExp','percent',10000,10000,200]);
 assert.equal(fishArtifactValue('A1401',1),10000,'level 1 is +100%');
 assert.equal(fishArtifactValue('A1401',2),20000,'and +100% again at every level');
 assert.equal(fishArtifactValue('A1401',200),2000000,'+20,000% at the level-200 cap');
 assert.equal(fishArtifactValue('A1401',201),2000000,'past the cap the value holds');
 assert.equal(MAX_EXP_MULTIPLIER,201);
 // The census the import asserted, so a re-import that loses a row fails here too.
 const census={};for(const r of FISH_ARTIFACTS)census[`${r.system}/${r.field}`]=(census[`${r.system}/${r.field}`]||0)+1;
 assert.deepEqual(census,{'fishing/expPercent':1,'fishing/baitPercent':1,'fishing/goldCrownPercent':1,
  'fishing/dailyCrystal':1,'family/flat':4,'power/percent':3,'village/percent':3,'power/aptitude':2,'tradingPost/taxBuffBp':1});
 // Two ladders, both 1 item a level at 1-5 rising to 20 from 96.
 assert.equal(fishArtifactPearl('A1401'),PEARL);assert.equal(fishArtifactPearl('A2502'),BLACK_PEARL);
 assert.equal(fishArtifactUpgradeCost('A1401',1),1);assert.equal(fishArtifactUpgradeCost('A1401',6),2);
 assert.equal(fishArtifactUpgradeCost('A1401',96),20);assert.equal(fishArtifactUpgradeCost('A1401',200),null,'level 200 is the cap');
 assert.equal(fishArtifactUpgradeCost('A2502',200),20,'the rare-5 ladder is uncapped');
});

test('the Power artifacts land in the 9.1 buckets, and nothing else moves',()=>{
 // docs/power-parity-audit.md 9.1: "Fishing percent -> fishingBonuses.percent", "Fishing Aptitude ->
 // fishingBonuses.aptitude". Magnitudes are the table's: atk/percent 500 bp +100 a level, talent 10 +2.
 const none=fresh(1000);
 assert.deepEqual(fishingBonuses(none,'hero_15'),{flat:0,aptitude:0,percent:0});
 const s=holding({A2502:1,A3503:1,A4505:1,A3504:1,A4506:1});
 const b=fishingBonuses(s,'hero_15');
 assert.equal(b.percent,15,'three "All Fellow Power +5%" artifacts at level 1');
 assert.equal(b.aptitude,20,'two "All Fellow Aptitude +10" artifacts at level 1');
 assert.equal(b.flat,0,'no artifact grants a flat, so none is invented');
 // They are scoped `all`, so every Fellow gets them -- unlike the rarity-scoped fish skills.
 for(const id of Object.keys(s.fellows))assert.equal(fishingBonuses(s,id).percent,15);
 const ten=fishingBonuses(holding({A2502:10}),'hero_15');
 assert.equal(ten.percent,(500+9*100)/100,'level 10 is 500 + 9x100 bp');
});

test('the village, bait, crown, EXP and Trading Post effects each reach exactly their own system',()=>{
 // All Building Earnings: the same shape as potionYield, inside buildingRate.
 const base=totalRate(fresh(1000));
 assert.equal(fishingArtifactYield(fresh(1000)),0,'no artifact, no change: every existing rate is untouched');
 const village=holding({A2503:1,A3501:1,A4502:1});
 assert.equal(fishingArtifactYield(village),0.6,'three x +20%');
 assert.ok(Math.abs(totalRate(village)-base*1.6)<1e-9);
 // The Trading Post Counter rate: exactly where CommercialWarManager.lua:53-60 adds count_fishAdd.
 assert.equal(fishArtifactTaxBp(fresh(1000)),0);
 assert.equal(fishArtifactTaxBp(holding({A4501:1})),1000,'+10% Counter Earnings Ratio');
 assert.equal(taxBuffBp(1,fishArtifactTaxBp(holding({A4501:1}))),3000,'2000 + 1000, added to the level row');
 assert.equal(by('A4501').fromActivity,'FishBP','and it is battle-pass only, so today nothing grants it');
 // Fishing EXP, the owner's one, is banked as it is earned and never applied to stored catches.
 const before=fishingIndex(fishingState(holding({A1401:1}))).exp;
 assert.equal(before,0,'a save gains no retroactive EXP from owning the artifact');
});

test('a cast keeps its fish and banks the artifact EXP as it is earned',()=>{
 const run=(s,a,t=null,g=null)=>{const r=act(s,a,s.lastAt,t,g);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state));return r.state};
 let plain=fresh(1000),lucky=holding({A1401:1});
 const key=s=>`cast:${fishingState(s).catches.length+1}`;
 plain=run(plain,'castFish',key(plain),'Village River');
 lucky=run(lucky,'castFish',key(lucky),'Village River');
 const a=plain.fishing.catches[0],b=lucky.fishing.catches[0];
 assert.equal(a.fish,b.fish,'the fish a cast draws does not move when an artifact is held');
 assert.equal(a.band,b.band);assert.equal(a.length,b.length);
 assert.equal(fishingIndex(plain.fishing).exp,FISH_EXP);
 assert.equal(fishingIndex(lucky.fishing).exp,FISH_EXP*2,'+100% EXP, paid on the cast that earned it');
 assert.equal(lucky.fishing.artifacts.bonusExp,FISH_EXP);
 // NEGATIVE CONTROL: bonusExp beyond what every catch could ever have paid is refused.
 const bad=structuredClone(lucky);
 bad.fishing.artifacts.bonusExp=bad.fishing.catches.length*FISH_EXP*MAX_EXP_MULTIPLIER+1;
 assert.equal(valid(bad),false,'artifact EXP beyond every catch\'s ceiling must be refused');assert.throws(()=>decode(JSON.stringify(bad)),/Invalid Fishing/);
});

test('the scripted grants fire at the original\'s own catch counts, and only there',()=>{
 // FishSpot.FishUnspokenRules: A1401 at the 15th Village River catch (S01).
 assert.deepEqual(by('A1401').scripted,[{spot:'S01',count:15}]);
 assert.deepEqual(scriptedAt('S01',15).map(r=>r.id),['A1401']);
 assert.deepEqual(scriptedAt('S01',14),[],'not a catch early');
 assert.deepEqual(scriptedAt('S11',5).map(r=>r.id),['A1402']);
 assert.deepEqual(scriptedAt('S11',31).map(r=>r.id),['A1404']);
 let s=fresh(1000);
 s={...s,fishing:{...fishingState(s),bait:100}};
 for(let i=0;i<15;i++){const r=act(s,'castFish',s.lastAt,`cast:${fishingState(s).catches.length+1}`,'Village River');assert.equal(r.error,undefined);s=r.state}
 assert.ok(valid(s));
 assert.ok(fishArtifactCounts(s.fishing).has('A1401'),'the 15th Village River catch grants Legend Plate - 1');
 assert.equal(fishArtifactLevel(s.fishing,'A1401'),1,'and it starts at level 1, unupgraded');
 assert.equal(fishingIndex(s.fishing).exp,15*FISH_EXP,'the artifact pays from the NEXT cast, not this one');
 // The four `isCantGet` rows are exactly the four the script grants; the draw can never produce them.
 assert.deepEqual(FISH_ARTIFACTS.filter(r=>r.scripted.length).map(r=>r.id),['A1401','A1402','A1403','A1404']);
 for(const r of FISH_ARTIFACTS)assert.equal(drawPool(r.spots[0]||'S01').includes(r),!r.isCantGet&&!!r.spots.length);
});

test('the extra roll uses the original weights and never touches the fish share',()=>{
 // FishLevel row 10: fish 9,890 / artifact1 80 / artifact2 30 / random 1,000 (total 11,000).
 assert.deepEqual(ARTIFACT_WEIGHTS[9],[9890,80,30,1000]);
 assert.deepEqual(ARTIFACT_SPOT_RANDOM.S11,{pearl:200,blackPearl:80,total:1280});
 // Anything inside the fish + rare-4 share is "nothing extra" -- the cast is just its fish.
 assert.equal(castExtra('S11',10,0,0),null);
 assert.equal(castExtra('S11',10,(9890+79)/11000,0),null,'the un-drawable rare-4 share falls back to the fish');
 // The rare-5 share draws from that spot's own pool.
 assert.deepEqual(castExtra('S11',10,(9890+80+1)/11000,0),{kind:'artifact',artifact:'A2501'});
 // The random share splits on FishSpot.random: 200/1280 Pearl, 80/1280 Black Pearl, rest unbuilt boxes.
 assert.equal(castExtra('S11',10,(9890+80+30+1)/11000,0).kind,PEARL);
 assert.equal(castExtra('S11',10,(9890+80+30+1000*200/1280+1)/11000,0).kind,BLACK_PEARL);
 assert.equal(castExtra('S11',10,(9890+80+30+1000*281/1280)/11000,0),null,'events 3/4/5 are boxes Everkai has not built');
 // Levels 1-2 have no artifact or random weight at all, exactly as the table says.
 assert.deepEqual(ARTIFACT_WEIGHTS[0],[10000,0,0,0]);
 assert.equal(castExtra('S01',1,0.999999,0),null,'nothing extra exists before fishing level 3');
 // Measured per-cast odds, against the source rows.
 const w=ARTIFACT_WEIGHTS[9],t=w[0]+w[1]+w[2]+w[3],sr=ARTIFACT_SPOT_RANDOM.S21;
 console.log(`  At fishing level 10, per cast: artifact ${(100*w[2]/t).toFixed(2)}%,`
  +` Pearl ${(100*w[3]*sr.pearl/sr.total/t).toFixed(2)}%, Black Pearl ${(100*w[3]*sr.blackPearl/sr.total/t).toFixed(2)}% (ocean spot)`);
 assert.ok(Math.abs(100*w[3]*sr.pearl/sr.total/t-2.12)<0.01,'2.12% a cast, the figure the tables give');
});

test('Pearls buy levels, a repeat artifact pays nothing, and a forged level is refused',()=>{
 let s=holding({A2502:1});
 assert.equal(pearls(s.fishing,BLACK_PEARL),0);
 assert.match(act(s,'upgradeFishArtifact',s.lastAt,'A2502').error,/Black Pearls/);
 assert.match(act(s,'upgradeFishArtifact',s.lastAt,'A3503').error,/Fish this artifact up first/);
 // Give it three Black Pearls and two more copies of the artifact: only the Pearls buy anything.
 const f=s.fishing,found=[...f.artifacts.found];
 for(let i=0;i<3;i++)found.push({id:`find:${found.length+1}`,kind:BLACK_PEARL,artifact:null,ground:null,at:s.lastAt,duplicate:false});
 for(let i=0;i<2;i++)found.push({id:`find:${found.length+1}`,kind:'artifact',artifact:'A2502',ground:'Drakenberg River Bank',at:s.lastAt,duplicate:true});
 s={...s,fishing:{...f,artifacts:{...f.artifacts,found}}};
 assert.ok(valid(s));
 assert.equal(fishArtifactCounts(s.fishing).get('A2502'),3,'the repeats are recorded');
 assert.equal(pearls(s.fishing,BLACK_PEARL),3,'and pay nothing -- the original has no duplicate conversion');
 for(let i=0;i<3;i++){const r=act(s,'upgradeFishArtifact',s.lastAt,'A2502');assert.equal(r.error,undefined,r.error);s=r.state}
 assert.equal(fishArtifactLevel(s.fishing,'A2502'),4);
 assert.equal(pearls(s.fishing,BLACK_PEARL),0);
 assert.equal(fishingBonuses(s,'hero_15').percent,8,'500 + 3x100 bp');
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)).fishing.artifacts,s.fishing.artifacts);
 // NEGATIVE CONTROLS, one per rule the validator enforces.
 for(const [why,mutate] of [
  ['a level no Pearl paid for',a=>a.levels.A2502=5],
  ['a level on an unowned artifact',a=>a.levels.A3503=2],
  ['an unknown artifact id',a=>a.found[0].artifact='A9999'],
  ['a renumbered find list',a=>a.found[1].id='find:99'],
  ['a mislabelled duplicate',a=>a.found.at(-1).duplicate=false],
  ['an unknown kind',a=>a.found[0].kind='diamond'],
  ['a level past the cap',a=>a.levels.A2502=1e9],
  ['a level of zero',a=>a.levels.A2502=0],
  ['a wrong policy version',a=>a.policyVersion=2],
  ['a negative bonusExp',a=>a.bonusExp=-1]]){
  const bad=structuredClone(s);mutate(bad.fishing.artifacts);
  assert.equal(valid(bad),false,`${why} must be refused`);
  assert.throws(()=>decode(JSON.stringify(bad)),/Invalid Fishing/,why);
 }
});

test('RULE 12: a save written before the artifacts decodes byte-identically',()=>{
 // The real thing: the day-30 save the live build wrote.
 const raw=gunzipSync(readFileSync(new URL('./live-save-45828d3-day30.json.gz',import.meta.url))).toString('utf8');
 const s=decode(raw);
 assert.ok(valid(s));
 assert.equal(s.fishing.artifacts,undefined,'no artifact state appears from nowhere');
 assert.equal(fishArtifactCounts(s.fishing).size,0,'and no artifact is granted retroactively');
 assert.equal(pearlsFound(s.fishing,PEARL),0);
 assert.deepEqual({...fishArtifactBonuses(s.fishing)},{});
 assert.equal(fishArtifactTaxBp(s),0);
 assert.equal(fishingArtifactYield(s),0,'so the village rate this save was written against is unchanged');
 // The two things the import spec warns about: fish levels 2-3 keep their n(n-1) price, and `points`
 // is still re-derived from it. Round-tripping proves both survived.
 assert.deepEqual(decode(JSON.stringify(s)).fishing,s.fishing);
 // The import spec's warning: `points` is re-derived from the fish-skill prices, so those prices could
 // not move. validFishing IS that identity, and this save passing it is the proof it still holds.
 assert.ok(Object.keys(s.fishing.skills).length>0,'the fixture must actually hold upgraded fish skills');
 const shifted=structuredClone(s);shifted.fishing.points++;
 assert.equal(valid(shifted),false,'NEGATIVE CONTROL: the research-point identity is still enforced');
});

test('what a realistic account gains, measured',()=>{
 // RULE 1: the PRICE is the original's SkillUpgrade ladder; the FLOOR is composePower on this build.
 const full=Object.fromEntries(FISH_ARTIFACTS.filter(r=>r.system==='power').map(r=>[r.id,1]));
 const rows=[1,5,10,20,50].map(level=>{
  const st=holding(Object.fromEntries(Object.keys(full).map(id=>[id,level])));
  const x=fishingBonuses(st,'hero_15');
  const pearls=Object.keys(full).reduce((n,id)=>{let t=0;for(let k=1;k<level;k++)t+=fishArtifactUpgradeCost(id,k);return n+t},0);
  return {level,percent:x.percent,aptitude:x.aptitude,pearls};
 });
 assert.equal(rows[0].percent,15);assert.equal(rows[0].aptitude,20);
 assert.equal(rows.at(-1).percent,3*(500+49*100)/100,'+160.5% at level 50, three artifacts');
 assert.equal(rows.at(-1).aptitude,2*(10+49*2),'+216 Aptitude at level 50, two artifacts');
 console.log('  Account-wide floor from the five Power antiques (every Fellow, scope `all`):');
 for(const r of rows)console.log(`   Lv.${String(r.level).padStart(2)}  +${r.percent}% Power  +${r.aptitude} Aptitude  · ${r.pearls} Pearls spent`);
 const v=holding(Object.fromEntries(FISH_ARTIFACTS.filter(r=>r.system==='village').map(r=>[r.id,10])));
 console.log(`  Village: the three building antiques at Lv.10 are +${(fishingArtifactYield(v)*100).toFixed(0)}% building earnings`);
 console.log(`  Fishing EXP: A1401 at Lv.10 is x${1+fishArtifactValue('A1401',10)/10000} per cast (x201 at its Lv.200 cap)`);
 assert.equal(1+fishArtifactValue('A1401',10)/10000,11);
});
