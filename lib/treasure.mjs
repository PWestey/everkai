import data from './treasure-data.json' with {type:'json'};
import {reaches} from './hero-scope.mjs';
export const TREASURE_AREAS=data.areas,TREASURE_RELICS=data.relics,TREASURE_GEM_GRADES=data.gemGrades;
const areaById=new Map(TREASURE_AREAS.map(a=>[a.id,a])),relicById=new Map(TREASURE_RELICS.map(r=>[r.id,r])),relicIds=new Set(TREASURE_RELICS.map(r=>r.id));
const day=s=>Math.floor(s.lastAt/86400000),int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max,record=x=>x&&typeof x==='object'&&!Array.isArray(x);
// 20 until 2026-09-18. The original's exhibit levels to Exhibit.levelUpMaxLevel 120 (every relic row's
// maxExhibitLevel), i.e. 119 restorations past the level-1 donation; a UR Fellow's relic flat runs 1.24M at
// level 1 to 10.18M at 120 (docs/power-sources-import-spec.md 2.1). A widening: every stored receipt list
// that was <= 20 long is still legal (rule 12). The price per restoration stays Everkai's (level + 1 of the
// relic's own duplicate material).
export const RESTORATION_MAX=119;
export const restorationLevel=r=>r?.restorations?.length||0;
// Legacy receipts (policyVersion 1) minted an invented +1 gold/s each; they keep paying so no existing
// save loses income. New receipts (policyVersion 2) carry no gold -- BUG-27: the original's museum pays
// Item_ExhibitEXP_* hourly (MuseumLevel.rewardHour -> Reward_MuseumLv0..50), never gold, and a restored
// exhibit pays its own levelUpSkill prop instead. See lib/treasure-data.json provenance.effects.
export const restorationIncome=r=>(r?.restorations||[]).reduce((n,x)=>n+(x.goldPerSecond||0),0);
export const treasureIncome=s=>Object.values(s.treasure?.relics||{}).reduce((n,r)=>n+restorationIncome(r),0);
const validReceipt=x=>record(x)&&int(x.materials,1e6)&&x.materials>0&&(x.policyVersion===2&&x.goldPerSecond===undefined||x.policyVersion===1&&int(x.goldPerSecond,1e6)&&x.goldPerSecond>0);
const validRestorations=r=>r.restorations===undefined||r.donated&&Array.isArray(r.restorations)&&r.restorations.length<=RESTORATION_MAX&&r.restorations.every(validReceipt);
export const treasureLevel=t=>Math.min(100,1+Math.floor(t.xp/120));
// BUG-25: stamina was 12 a day against the original's own constants (System.json RelicToolsInitial [100,0,0],
// RelicToolsDayReward [150,1,0], RelicToolsLimit [300,5,5]) -- a 12.5x throttle. Now the original's numbers:
// a new expedition starts with 100, each new day adds 150, and the store holds 300.
export const TREASURE_START_STAMINA=100,TREASURE_DAILY_STAMINA=150,TREASURE_STAMINA_LIMIT=300;
export function treasureState(s){const t=s.treasure||{policyVersion:1,seq:0,seed:123456789,day:day(s),stamina:TREASURE_START_STAMINA,xp:0,trip:null,gems:{},relics:{}};return t.day<day(s)?{...t,day:day(s),stamina:Math.min(TREASURE_STAMINA_LIMIT,t.stamina+TREASURE_DAILY_STAMINA)}:t}
export function validTreasure(s){if(s?.treasure===undefined)return true;const t=s.treasure;if(!record(t)||t.policyVersion!==1||!int(t.seq)||!int(t.seed,4294967295)||!int(t.day)||t.day>day(s)||!int(t.stamina,TREASURE_STAMINA_LIMIT)||!int(t.xp)||!record(t.gems)||!record(t.relics))return false;
 if(!Object.entries(t.gems).every(([id,n])=>areaById.has(id)&&int(n,1e6)))return false;
 if(!Object.entries(t.relics).every(([id,r])=>relicIds.has(id)&&record(r)&&validRestorations(r)&&int(r.materials,1e6)&&typeof r.donated==='boolean'&&typeof r.displayed==='boolean'&&(!r.displayed||r.donated)))return false;
 const p=t.trip;return p===null||record(p)&&int(p.id)&&p.id<=t.seq&&areaById.has(p.area)&&treasureLevel(t)>=areaById.get(p.area).level&&Array.isArray(p.tiles)&&new Set(p.tiles).size===p.tiles.length&&p.tiles.every(n=>int(n,11));}
export const tileGem=i=>i%3===2;
// A gemstone's grade follows the Steeltooth's level: RelicLevel.json carries GemBall1/2/3 weights out of
// 10,000 for levels 1-30 (grade 3 is zero below level 8). Everkai rolls the grade at appraisal rather than
// at dig time -- same distribution for a given level, and no save-shape change.
export const gemGradeWeights=level=>TREASURE_GEM_GRADES[Math.min(TREASURE_GEM_GRADES.length,Math.max(1,level))-1].weights;
export function gradePick(level,roll){const w=gemGradeWeights(level);let v=roll*w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++){v-=w[i];if(v<0)return i}return w.findLastIndex(x=>x>0)}
export function appraisalPick(pool,roll){let v=roll*pool.totalPercent;for(const row of pool.pool){v-=row.percent;if(v<0)return row.id}return pool.pool.at(-1).id}
// The original's exhibit is level 1 the moment it is obtained and each restoration adds a level, so a
// displayed unrestored relic already pays skillProp_Initial.
export const relicEffect=(id,r)=>{const e=relicById.get(id)?.effect;return e&&r?.donated&&r?.displayed?{stat:e.stat,amount:e.initial+restorationLevel(r)*e.perLevel}:null};
/** Every hero-facing prop a displayed relic pays, read from its own Exhibit.levelUpSkill row (effectSource):
 *  `talent` -> aptitude, `atk extradd` -> flat, `atk percent` -> basicPowerPercent (hundredths -> percent), each
 *  with the row's scope. ADDED 2026-09-18: the flat rows (19 of them) were recovered but unpaid ("Recovered but
 *  not modelled: flat attack"), and the talent rows were paid to EVERY Fellow although the original scopes them. */
export function relicEffects(id,r){const e=relicById.get(id)?.effectSource;if(!e||e.target!=='hero'||!r?.donated||!r?.displayed)return [];
 const v=e.initial+restorationLevel(r)*e.perLevel,scope=[e.condition.conditionType,e.condition.id??null];
 if(e.prop==='talent')return [{stat:'aptitude',amount:v,scope}];
 if(e.prop==='atk'&&e.propType==='extradd')return [{stat:'flat',amount:v,scope}];
 if(e.prop==='atk'&&e.propType==='percent')return [{stat:'basicPowerPercent',amount:v/100,scope}];
 return [];}
/** With a Fellow id, what reaches THAT Fellow (the power model); without one, every relic's full amount (the
 *  museum panel's summary). */
export function relicBonus(s,fellow=null){const bonus={aptitude:0,basicPowerPercent:0,powerPercent:0,flat:0};
 for(const [id,r] of Object.entries(s?.treasure?.relics||{}))for(const e of relicEffects(id,r))if(fellow===null||reaches(e.scope,fellow))bonus[e.stat]+=e.amount;
 return bonus;}
export function treasureAction(s,action,target,value){if(!['treasureRestore','treasureStart','treasureDig','treasureReturn','treasureAppraise','treasureDonate','treasureDisplay'].includes(action))return null;
 const old=treasureState(s),fail=error=>({state:s,error});if(value!==old.seq)return fail('This expedition changed. Use the current controls.');if(old.seq>=1e9)return fail('Expedition action limit reached.');
 const t={...old,seq:old.seq+1,gems:{...old.gems},relics:{...old.relics}};let message='';
 if(action==='treasureStart'){const a=areaById.get(target);if(!a||treasureLevel(t)<a.level)return fail('Raise Steeltooth’s level to visit this region.');if(t.trip)return fail('Return to camp first.');if((t.gems[a.id]||0)>999996||t.xp>999999880)return fail('Make room at camp before starting another expedition.');t.trip={id:t.seq,area:a.id,tiles:[]};message=`Exploring ${a.name}. Radar marks gemstones.`;}
 if(action==='treasureDig'){if(!t.trip||!int(target,11)||t.trip.tiles.includes(target))return fail('Choose an undug tile.');if(!t.stamina)return fail('Refill Steeltooth’s stamina at camp.');t.trip={...t.trip,tiles:[...t.trip.tiles,target]};t.stamina--;message=tileGem(target)?'Gemstone found! Return to camp to unload it.':'Stone stored. Return to camp to gain EXP.';}
 if(action==='treasureReturn'){if(!t.trip)return fail('You are already at camp.');const gems=t.trip.tiles.filter(tileGem).length,xp=t.trip.tiles.length*10,id=t.trip.area;if((t.gems[id]||0)+gems>1e6||t.xp+xp>1e9)return fail('Camp storage is full.');t.gems[id]=(t.gems[id]||0)+gems;t.xp+=xp;t.trip=null;message=`Returned: ${gems} gemstones and ${xp} Steeltooth EXP.`;}
 if(action==='treasureAppraise'){if(t.trip)return fail('Return to camp for appraisal.');const a=areaById.get(target);if(!a||!(t.gems[target]>0))return fail('Find a gemstone in this region first.');
  const roll=()=>{t.seed=(Math.imul(t.seed,1664525)+1013904223)>>>0;return t.seed/4294967296};
  const grade=a.grades[gradePick(treasureLevel(t),roll())],id=appraisalPick(grade,roll()),r=t.relics[id];
  if(r?.materials>=1e6)return fail('This relic’s material storage is full.');
  t.gems[target]--;t.relics[id]=r?{...r,materials:r.materials+1}:{materials:0,donated:false,displayed:false};
  const whole=relicById.get(id),assembled=assemble(t,whole);
  message=`${whole.name}${r?' · duplicate converted to its own material.':' discovered! Donate it to the relic collection.'}${assembled?` All parts recovered · ${assembled} assembled!`:''}`;}
 if(action==='treasureRestore'){const r=t.relics[target];if(!r?.donated)return fail('Donate this relic first.');const level=restorationLevel(r);if(level>=RESTORATION_MAX)return fail('This relic is fully restored.');const cost=level+1;if(r.materials<cost)return fail(`Requires ${cost} of this relic’s duplicate materials.`);
  t.relics[target]={...r,materials:r.materials-cost,restorations:[...(r.restorations||[]),{policyVersion:2,materials:cost}]};
  const e=relicEffects(target,t.relics[target])[0]||null;
  message=e?`Restored to ${level+1}/${RESTORATION_MAX} · ${relicById.get(target).name} now grants +${e.amount.toLocaleString()}${e.stat==='aptitude'?' Aptitude':e.stat==='flat'?' Power':'% Power'}.`:`Restored to ${level+1}/${RESTORATION_MAX} · this exhibit's original effect has no Everkai equivalent yet.`;}
 if(action==='treasureDonate'||action==='treasureDisplay'){const r=t.relics[target];if(!r)return fail('Appraise this relic first.');if(action==='treasureDonate'){if(r.donated)return fail('Already donated.');t.relics[target]={...r,donated:true,displayed:true};message='Relic donated and displayed.'}else{if(!r.donated)return fail('Donate this relic first.');t.relics[target]={...r,displayed:!r.displayed};message=r.displayed?'Relic stored.':'Relic displayed.';}}
 return {state:{...s,treasure:t},message};}
// BUG-26: the two multi-part exhibits are never in a gacha pool -- their pieces are. Completing a set
// assembles the whole exhibit, exactly as ExhibitPart.exhibitID describes.
function assemble(t,part){if(!part?.partOf)return null;const whole=relicById.get(part.partOf);
 if(t.relics[whole.id]||!whole.assembledFrom.every(id=>t.relics[id]))return null;
 t.relics[whole.id]={materials:0,donated:false,displayed:false};return whole.name;}
