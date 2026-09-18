// The original's stage ladder, and the two rules its client uses to resolve a stage.
//
// WHERE THE ROWS COME FROM. `LevelNormal.json` and `LevelBoss.json` in the extraction are empty
// wrappers (CLAUDE.md rule 3): `{"LevelNormal":{}}`, 18 bytes. The real rows live in
// `split/LevelNormal_1..12.json` (60,000 chapter-stage rows, 4 battles each),
// `split/BattleNormal_1..48.json` (240,000 battle rows) and `split_levelboss/*.json` (12,000 boss
// rows) -- 252,000 battles over 12,000 chapters, `stageId` running 1..252,000 with no gaps.
// A battle row is `{_id:"1-1-1", atk, consume:[{id:'3',count}], stageId, item1, item5}`; a boss row is
// `{_id:"1-6-0", atk, inspireConsumeBase:[{id:'3',count}], stageId, items:[...]}`. Item ids resolve
// against `Item.json`: **1 = Fellow EXP**, **3 = Gold**, **5 = Player EXP**, 4 = Diamond.
//
// Chapters 1-6,000 of that table are imported and hash-pinned in `opening-data.json`
// (chapters 1-6) and `campaign-chapters-data.json` (chapters 7-6,000, provenance carries the sha256
// of BattleNormal.json / LevelBoss.json / Chapter.json). This module is the single decode of them, so
// the village campaign and the opening journey read ONE copy -- a second import would have added
// another 5MB to the offline precache for rows the bundle already carries.
//
// CHAPTERS 3,001-6,000 LOAD LAZILY (2026-09-18). Measured in headless Chrome with iPhone emulation on the
// built client, the startup JS heap after GC was 38.9 MB with 3,000 chapters in the main bundle and 70.1 MB
// with 6,000 (74.7 MB against 44.0 MB with a 90-day save) -- the later half cost every player ~31 MB at boot
// whether or not they ever reach it. So `campaign-chapters-late-data.json` is a separate chunk, imported only
// when a save's progress comes within LATE_MARGIN_CHAPTERS of chapter 3,000 (lateChaptersWanted), and
// streamed rather than precached (scripts/offline-manifest.mjs). The engine stays SYNCHRONOUS:
//   * validators bound progress by STAGE_COUNT / OPENING_COUNT / LAST_CHAPTER, which come from the small
//     `late` index in the main file, never from how many rows are loaded -- a save at stage 36,000 loads
//     before the late rows arrive;
//   * STAGES, OPENING_STAGES and CAMPAIGN are the same arrays, grown in place by installLateChapters, so
//     every existing reader sees rows appear; a stage that is not loaded yet reads as undefined, and the
//     battle actions refuse it with "still loading" (stagePending / openingPending) instead of "all cleared";
//   * under Node (tests, the pacing sim, scripts) the late file is required synchronously at import, so
//     nothing there turned async. EVERKAI_LAZY_CHAPTERS=1 turns that off to test the lazy path.
//
// WHY 6,000 AND NOT ALL 12,000. The data is a static JSON import, so Vite inlines it into the main
// `index-*.js` chunk: precached, and parsed on every boot. 6,000 chapters is 5.06 MB (1.14 MB gzip),
// ~150 ms and ~96 MB of heap to decode in node; 12,000 would be 10.85 MB, ~290 ms and ~194 MB, and past
// chapter 10,757 a stage's base gold exceeds MAX_GOLD. (The 6,000 extension first
// shipped without lazy loading, reasoning that the owner's roster Power (3.5e9) sits at chapter 4,322's
// boss. But lazy loading follows a SAVE's progress, not roster Power: every save today is at or below
// chapter 3,000, because no earlier build had more. See CHAPTERS 3,001-6,000 LOAD LAZILY above.)
// scripts/import-campaign-chapters.py carries the full table of measurements.
//
// THE TWO RULES, transcribed from the decompiled client.
//
// Normal battle -- `readable/SceneLevelNormalBattle.lua:565-871`:
//     local fightRate = battleconf.atk / fightPower
//     local loss      = math.floor(fightRate^0.25 * 10000)
//     local lossCount = math.floor(_consume.count * loss / 10000)
//     return lossCount <= ownCount, lossCount
// Power is NOT a gate on a normal battle. It sets the PRICE: the gold the battle charges is its base
// `consume` scaled by the fourth root of (enemy atk / your Power), and you clear it if you can pay.
// Above the enemy's atk the price falls below base; below it the price climbs.
//
// Boss battle -- `readable/SceneLevelBossBattleNew.lua:493-508`:
//     local hero_power = zzPropMgr.heroTotalPower
//     hero_power = math.floor(hero_power * (1 + addPercent / 100))
//     return bossConf.atk < hero_power
// The boss IS a hard, strictly-greater Power gate, and it is free to attempt. (`addPercent` is the
// optional "inspire" purchase, `PVEManager:CalcBossInspire`; it is not modelled here, so a boss is
// cleared on Power alone.) Bosses are therefore the only real wall on the ladder, every 6th stage.
//
// `fightPower` / `heroTotalPower` is the WHOLE ROSTER's summed Power, not a party -- the client shows
// the same field as "all fighting" on the roster screen (`readable/SceneUnderling.lua:606`). Both
// halves of every comparison below come from that one source (rule 1), which is why `ladderPower`
// sums every owned Fellow rather than the adventure party.
import data from './opening-data.json' with {type:'json'};
import campaign from './campaign-chapters-data.json' with {type:'json'};

// The data file is compact (format 2: tuples in stage order, with _id, stageId and the gold item id
// derived from position); this rebuilds the exact row objects, keys in the same order, that
// scripts/import-campaign-chapters.py round-trips and that lib/opening-data.json rows use.
export function decodeCampaign(d){
 if(d.format!==2)throw Error('Unknown campaign data format '+d.format);
 const battles=[],bosses=[],backgrounds={},place=(c,i)=>d.firstStageId+(c-d.firstChapter)*21+i;
 for(let c=d.firstChapter;c<=d.lastChapter;c++){const k=c-d.firstChapter;
  d.battles.slice(k*20,(k+1)*20).forEach((t,i)=>{const r={_id:`${c}-${(i>>2)+1}-${i%4+1}`,timelineNameType:t[0],mushRoomType:t[1],atk:t[2],consume:[{id:'3',count:t[3]}],stageId:place(c,i),item1:t[4],item5:t[5]};if(t.length>6)r.sourceEventId=t[6];battles.push(r)});
  const b=d.bosses[k],items=[];for(let j=0;j<b[2].length;j+=2)items.push({id:d.itemIds[b[2][j]],count:b[2][j+1]});
  bosses.push({_id:`${c}-6-0`,atk:b[0],inspireConsumeBase:[{id:'3',count:b[1]}],stageId:place(c,20),items});
  const source=d.backgrounds[k];backgrounds[String(c)]={source,shown:d.backgroundArt[source]};}
 return {firstChapter:d.firstChapter,lastChapter:d.lastChapter,battles,bosses,backgrounds,provenance:d.provenance};
}
/** Chapters 7-3,000 at boot; installLateChapters appends 3,001-6,000 in place (battles, bosses,
 *  backgrounds, lastChapter). `lastChapter` is therefore the last LOADED chapter; LAST_CHAPTER is the ladder's. */
export const CAMPAIGN=decodeCampaign(campaign);
const LATE=campaign.late;
/** The ladder's size, from the main file's small index -- what every validator bounds by. */
export const LAST_CHAPTER=LATE?LATE.lastChapter:campaign.lastChapter;
export const LATE_FIRST_CHAPTER=LATE?LATE.firstChapter:LAST_CHAPTER+1;
export const OPENING_COUNT=LAST_CHAPTER*21,STAGE_COUNT=LAST_CHAPTER*6;
/** Start fetching the late chapters this many chapters before they are needed. */
export const LATE_MARGIN_CHAPTERS=100;
/** @param {any[]} battles @param {any[]} bosses @returns {Array<Record<string,any>>} */
const openingRows=(battles,bosses)=>battles.map(x=>({...x,boss:false})).concat(bosses.map(x=>({...x,boss:true}))).sort((a,b)=>a.stageId-b.stageId);
/** Every battle of the LOADED chapters, in the original's own `stageId` order, 21 a chapter (5 stages x 4
 *  battles, then the boss): 63,000 rows at boot, 126,000 once the late chapters are installed. This is the
 *  granularity the opening journey advances at. Its length is NOT the ladder's size -- use OPENING_COUNT. */
export const OPENING_STAGES=openingRows([...data.battles,...CAMPAIGN.battles],[...data.bosses,...CAMPAIGN.bosses]);

/** `math.floor(base * math.floor((atk/power)^0.25 * 10000) / 10000)` in exact integer arithmetic.
 *  Done in BigInt with a binary search for the integer fourth root so the answer is deterministic on
 *  every device -- a Math.pow would drift in the last digit and make an offline save's receipts
 *  un-recomputable. */
export function battleQuote(atk,base,power){
 if(!Number.isFinite(power)||power<=0)return null;
 const a=BigInt(atk)*10000n**4n,p=BigInt(Math.floor(power));
 let lo=0n,hi=1n;while(hi**4n*p<=a)hi*=2n;
 while(hi-lo>1n){const mid=(lo+hi)/2n;if(mid**4n*p<=a)lo=mid;else hi=mid;}
 return Number(lo*BigInt(base)/10000n);
}
/** The gold one BATTLE row charges at this Power. Bosses are free to attempt (the original charges
 *  only the optional inspire, which is not modelled). */
export function openingQuote(stage,power){if(!stage||!Number.isFinite(power)||power<=0)return null;if(stage.boss)return 0;return battleQuote(stage.atk,stage.consume[0].count,power);}
/** The boss rule, strictly greater, exactly as `canWinLevelBoss` has it. */
export const openingBossReady=(stage,power)=>!!stage&&Number.isFinite(power)&&power>stage.atk;

// THE VILLAGE CAMPAIGN'S LADDER, at the original's STAGE granularity.
//
// `Chapter.json` (12,000 rows, one per chapter) gives each chapter exactly `levelNormal` 1-5 plus one
// `levelBoss`, and the shipped rows agree: all 6,000 imported chapters have the shape
// `1:4,2:4,3:4,4:4,5:4,6:1` -- five normal stages of four battles, then a single boss. So a chapter is
// 6 stages and every 6th stage is a boss. Everkai's previous invented ladder already assumed that
// cadence (`chapter: ceil(n/6)`, `boss: n%6===0`), which is why the migration below is an identity.
//
// A stage's numbers are its own battles' numbers, summed or maxed -- nothing here is invented:
//   atk   = the hardest battle in the stage (the boss row's atk for a boss stage)
//   parts = each battle's (atk, base gold) pair, so the stage price is the SUM of the battles' own
//           quotes, each at its own atk -- quoting once against the max atk would overcharge
//   xp    = the stage's own Fellow EXP (item id '1'): the four `item1` values, or the boss's item '1'
//   fame  = the stage's own Player EXP (item id '5')
//   bottles = the boss row's own `Item_Token_Gacha_Universal` count
const rows=[];
function appendStageRows(list){
 let chapter=0,section=0,cur=null;
 for(const st of list){
  const dash=st._id.indexOf('-'),c=+st._id.slice(0,dash),s=+st._id.slice(dash+1,st._id.indexOf('-',dash+1));
  if(c!==chapter||s!==section){chapter=c;section=s;cur={id:rows.length+1,chapter:c,section:s,boss:!!st.boss,atk:0,parts:[],xp:0,fame:0,bottles:0,stageId:st.stageId};rows.push(cur);}
  cur.atk=Math.max(cur.atk,st.atk);
  if(st.boss){for(const it of st.items){if(it.id==='1')cur.xp+=it.count;else if(it.id==='5')cur.fame+=it.count;else if(it.id==='Item_Token_Gacha_Universal')cur.bottles+=it.count;}}
  else {cur.parts.push([st.atk,st.consume[0].count]);cur.xp+=st.item1;cur.fame+=st.item5;}
 }
}
appendStageRows(OPENING_STAGES);
/** The village campaign: 36,000 stages (STAGE_COUNT), chapters 1-6,000, six stages a chapter, every 6th a
 *  boss. `atk` runs 1,350 at stage 1 to 52,620,000,000 at stage 36,000 (1,191,000,000 at stage 18,000).
 *  Holds the LOADED stages: 18,000 at boot, all 36,000 once installLateChapters has run. */
export const STAGES=rows;
/** The stage at 1-based ladder position `id`, or undefined past the end OR not loaded yet (stagePending). */
export const stageAt=id=>Number.isInteger(id)&&id>=1&&id<=STAGES.length?STAGES[id-1]:undefined;
/** True for a real ladder position whose rows have not arrived yet -- "loading", never "cleared". */
export const stagePending=id=>Number.isInteger(id)&&id>STAGES.length&&id<=STAGE_COUNT;
/** The same for the opening journey, by its `cleared` count (the next row's index). */
export const openingPending=cleared=>Number.isInteger(cleared)&&cleared>=OPENING_STAGES.length&&cleared<OPENING_COUNT;

// ---- THE LATE CHAPTERS ---------------------------------------------------------------------------------
let lateInstalled=!LATE,lateLoading=null;
export const lateChaptersLoaded=()=>lateInstalled;
/** Appends a decoded late file to CAMPAIGN, OPENING_STAGES and STAGES in place. Refuses a file that does not
 *  continue the main file exactly, so a stale or wrong chunk can never shift a stage id. Idempotent. */
export function installLateChapters(d){
 if(lateInstalled)return false;
 if(!d||d.format!==2||d.firstChapter!==LATE.firstChapter||d.lastChapter!==LATE.lastChapter||d.firstStageId!==LATE.firstStageId||d.battles?.length!==LATE.battles||d.bosses?.length!==LATE.bosses)
  throw Error('The late chapter file does not continue the stage ladder');
 const c=decodeCampaign(d);
 for(const b of c.battles)CAMPAIGN.battles.push(b);
 for(const b of c.bosses)CAMPAIGN.bosses.push(b);
 Object.assign(CAMPAIGN.backgrounds,c.backgrounds);CAMPAIGN.lastChapter=c.lastChapter;
 const added=openingRows(c.battles,c.bosses);
 if(added[0].stageId!==OPENING_STAGES.length+1)throw Error('The late chapters do not start where the ladder ends');
 for(const r of added)OPENING_STAGES.push(r);
 appendStageRows(added);
 lateInstalled=true;return true;
}
/** Fetch and install the late chapters once. Resolves true when they are in place. */
export function loadLateChapters(){
 if(lateInstalled)return Promise.resolve(true);
 // Node reads the file directly (a bare JSON import() needs an import attribute there, and an attribute
 // stops the bundler from rewriting the specifier to its chunk); the browser gets Vite's lazy chunk.
 const req=nodeRequire();
 return lateLoading??=(req?Promise.resolve({default:req('./'+LATE.file)}):import('./campaign-chapters-late-data.json'))
  .then(m=>{installLateChapters(m.default);return true},e=>{lateLoading=null;throw e});
}
/** Does this save's progress call for the late chapters? True within LATE_MARGIN_CHAPTERS of the split in
 *  either ladder (the village campaign or the opening journey). */
export function lateChaptersWanted(s){
 if(lateInstalled)return false;
 const from=LATE_FIRST_CHAPTER-LATE_MARGIN_CHAPTERS;
 return (s?.adventure?.cleared||0)>=(from-1)*6||(s?.opening?.cleared||0)>=(from-1)*21;
}
/** A synchronous require under Node, or null in a browser. */
function nodeRequire(){const P=globalThis.process;return P?.versions?.node&&typeof P.getBuiltinModule==='function'?P.getBuiltinModule('node:module').createRequire(import.meta.url):null}
// Node (tests, the pacing sim, scripts): install synchronously so nothing there has to await.
if(!lateInstalled&&nodeRequire()&&globalThis.process.env?.['EVERKAI_LAZY_CHAPTERS']!=='1')installLateChapters(nodeRequire()('./'+LATE.file));
/** What this stage charges in gold at this Power: the sum of its battles' own quotes. A boss is free.
 *  Returns null when Power is not yet a usable number (no trained Fellow). */
export function stageCost(stage,power){
 if(!stage||!Number.isFinite(power)||power<=0)return null;
 let n=0;for(const [atk,base] of stage.parts)n+=battleQuote(atk,base,power);return n;
}
/** Can this stage be cleared right now? The original's two rules, unchanged: a boss needs Power
 *  strictly above its atk; a normal stage needs only enough gold to pay its (Power-scaled) price. */
export function stageReady(stage,power,gold){
 if(!stage)return false;
 if(stage.boss)return openingBossReady(stage,power);
 const cost=stageCost(stage,power);return cost!==null&&gold>=cost;
}
