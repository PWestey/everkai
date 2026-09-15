import test from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {OPENING_STAGES,CAMPAIGN,LAST_CHAPTER,OPENING,decodeCampaign} from '../lib/opening.mjs';
import {openingChapterName} from '../lib/opening-presentation.mjs';
import raw from '../lib/campaign-chapters-data.json' with {type:'json'};
import scenes from '../lib/stage-scene-data.json' with {type:'json'};

const chapterOf=s=>Number(s._id.split('-')[0]);

test('the stage ladder runs chapters 1-150: 3,150 stages, 21 a chapter, stageIds without gaps',()=>{
 assert.equal(LAST_CHAPTER,150);
 assert.equal(OPENING_STAGES.length,150*21,'126 opening stages + 3,024 imported');
 assert.deepEqual(OPENING_STAGES.map(s=>s.stageId),Array.from({length:3150},(_,i)=>i+1));
 for(let c=1;c<=150;c++){const rows=OPENING_STAGES.filter(s=>chapterOf(s)===c);
  assert.equal(rows.length,21,'chapter '+c);assert.equal(rows.filter(s=>s.boss).length,1);assert.equal(rows.at(-1)._id,c+'-6-0');}
 assert.equal(CAMPAIGN.battles.length,144*20);assert.equal(CAMPAIGN.bosses.length,144);});

test('imported rows are the original values, continuing the opening curve',()=>{
 const at=id=>OPENING_STAGES.find(s=>s._id===id);
 // Measured from BattleNormal/LevelBoss: chapter 6 boss 23,100; chapter 7's first stage is 10,000 and its boss is
 // 27,850; chapter 20's boss is 254,250, the neighbour of Mine Clearance's first guardian (225,000).
 assert.equal(at('6-6-0').atk,23_100);assert.equal(at('7-1-1').atk,10_000);assert.equal(at('7-6-0').atk,27_850);assert.equal(at('20-6-0').atk,254_250);
 // Chapters 51-150, measured from the same tables: 50-6-0 1,513,000; 51-1-1 557,500; 100-6-0 3,725,000;
 // 150-1-1 2,411,000; 150-6-0 6,698,000 (stageId 3150).
 assert.equal(at('50-6-0').atk,1_513_000);assert.equal(at('51-1-1').atk,557_500);assert.equal(at('100-6-0').atk,3_725_000);
 assert.equal(at('150-1-1').atk,2_411_000);assert.deepEqual([at('150-6-0').atk,at('150-6-0').stageId],[6_698_000,3150]);
 const items=new Set(OPENING.items.map(i=>i._id));
 for(const b of CAMPAIGN.bosses)for(const i of b.items)assert.ok(items.has(i.id),`${b._id} rewards ${i.id}, which has no item definition`);
 assert.deepEqual(CAMPAIGN.provenance.droppedBossItems,['Item_Weapon_Equipment_1_2','Item_Weapon_Equipment_2_1','Item_Weapon_Equipment_2_2','Item_Weapon_Equipment_3_1']);
 assert.ok(CAMPAIGN.battles.every(b=>!b.stageEventId),'imported stages carry no roadside events (deferred; see the import script)');
 assert.equal(CAMPAIGN.battles.filter(b=>b.sourceEventId).length,288,'source event ids are kept for later: 88 in 7-50, 200 in 51-150');});

// sha256 of JSON.stringify({battles,bosses,backgrounds}) for chapters 7-50 as format 1 shipped them (167b3e9);
// the import script pins the same digest.
const SHIPPED_7_50='4d9d798606140f30efffe11e21c8b33ce9ef5339f7b8bae7fa1dac87a553f111';
const digest7to50=c=>{const old=r=>chapterOf(r)<=50;return createHash('sha256').update(JSON.stringify({battles:c.battles.filter(old),bosses:c.bosses.filter(old),
 backgrounds:Object.fromEntries(Object.entries(c.backgrounds).filter(([k])=>Number(k)<=50))})).digest('hex')};

test('chapters 7-50 decode to exactly the rows that shipped before the compact format',()=>{
 assert.equal(CAMPAIGN.provenance.chapters7to50Sha256,SHIPPED_7_50);
 assert.equal(digest7to50(CAMPAIGN),SHIPPED_7_50);
 // Negative controls: one changed value, or a reordered key, must change the digest.
 const bumped=structuredClone(raw);bumped.battles[13*20+5][2]++;
 assert.notEqual(digest7to50(decodeCampaign(bumped)),SHIPPED_7_50,'a changed atk in chapter 20 is detected');
 const reordered=decodeCampaign(raw);reordered.bosses[0]={items:reordered.bosses[0].items,...reordered.bosses[0]};
 assert.notEqual(digest7to50(reordered),SHIPPED_7_50,'key order is part of the pinned shape');
 assert.throws(()=>decodeCampaign({...raw,format:1}),/Unknown campaign data format/);});

test('decoded rows keep the opening row shape and derive ids from position',()=>{
 const keys=Object.keys(OPENING.battles[0]).join();
 for(const b of CAMPAIGN.battles)assert.equal(Object.keys(b).filter(k=>k!=='sourceEventId').join(),keys,b._id);
 assert.deepEqual(Object.keys(CAMPAIGN.bosses[0]),['_id','atk','inspireConsumeBase','stageId','items']);
 assert.deepEqual(OPENING_STAGES.find(s=>s._id==='73-4-3').consume.map(c=>c.id),['3']);
 assert.equal(raw.format,2);assert.ok(JSON.stringify(raw).length<200_000,'compact data stays far below the 140 KB format 1 needed for 44 chapters');});

test('every chapter background resolves to a shipped stage scene',()=>{
 const shipped=new Set(Object.values(scenes.chapters).map(c=>c.background));
 assert.equal(Object.keys(CAMPAIGN.backgrounds).length,144);
 for(const [n,b] of Object.entries(CAMPAIGN.backgrounds))assert.ok(shipped.has(b.shown),`chapter ${n}: ${b.source} shows ${b.shown}, which has no scene art`);
 assert.deepEqual(CAMPAIGN.backgrounds['59'],{source:'Bg_Mountain_01',shown:'Bg_Level_03'});
 // Negative control: an unmapped source decodes to no scene.
 const broken=structuredClone(raw);delete broken.backgroundArt.Bg_Mountain_01;
 assert.equal(shipped.has(decodeCampaign(broken).backgrounds['59'].shown),false);});

test('clearing chapter 6 opens chapter 7, and a save past stage 126 is valid',()=>{
 let s=act(fresh(0),'openingStart',0).state;
 s.opening.cleared=125;s.fellows.hero_15.aptitude=1000;s.gold=1e9;
 let r=act(s,'openingBattle',0,'6-6-0');assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(OPENING_STAGES[s.opening.cleared]._id,'7-1-1');
 r=act(s,'openingBattle',0,'7-1-1');assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(s.opening.cleared,127);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(openingChapterName(7),'Chapter 7');
 s.opening.cleared=OPENING_STAGES.length+1;assert.equal(valid(s),false,'cannot clear past the last stage');});

test('clearing chapter 50 opens chapter 51, and the last stage of chapter 150 can be cleared',()=>{
 let s=act(fresh(0),'openingStart',0).state;
 // Aptitude 1,000 at level 50 is 10,800,000 Power, above the 6,698,000 of chapter 150's boss.
 s.opening.cleared=1049;s.fellows.hero_15.aptitude=1000;s.fellows.hero_15.level=50;s.gold=1e14;
 let r=act(s,'openingBattle',0,'50-6-0');assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(OPENING_STAGES[s.opening.cleared]._id,'51-1-1');
 s.opening.cleared=3149;s.gold=1e14;
 r=act(s,'openingBattle',0,'150-6-0');assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(s.opening.cleared,3150);assert.equal(OPENING_STAGES[s.opening.cleared],undefined);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);assert.equal(openingChapterName(150),'Chapter 150');
 assert.ok(act(s,'openingBattle',0,'150-6-0').error,'nothing to fight past the last stage');});
