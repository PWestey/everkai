// SHAPESHIFT OUTFITS -- the protagonist's wardrobe, and the only account-wide power source in the game.
//
// Every other contributor is scoped to a Fellow or a group of them, so a thin roster gets little from
// most of them, and the 163 Marvel and Star Wars additions are reached by `all` and `country` scopes
// only (lib/hero-scope.mjs). This one belongs to the PLAYER: `{conditionType:'all'}`, so it lifts every
// Fellow equally -- original, crossover, owned since day one or recruited this morning.
//
// THE NUMBERS ARE THE ORIGINAL'S. 50 outfits, five carrying a skill worth 4,000 bp + 2,000 a level to
// level 20 -- 172,000 bp across all five, which docs/power-parity-audit.md reached independently from
// the same table. `atk`/`percent` is the PERCENT bucket, not a combat stat: BeautyManager.lua:1128
// resolves that exact pair and returns it as the percent half of a (percent, talent) pair.
// scripts/import-shapeshift.py asserts all of it.
//
// WHAT IS LOCAL, and it is one thing: the chip faucet. In the original an outfit needs
// `Item_ClothesChip_ShapeshiftClothes<NN>` -- its OWN chip, not a shared currency -- and the client
// spends one to unlock and one for each level (AppearanceManager.lua:766-778). Where those chips come
// from is an event economy Everkai does not have, so CHIP_A_DAY below is a choice, not a measurement,
// and it is the number to re-price if the track paces wrong. Everything else here is sourced.
//
// ALSO NOT MODELLED: `unlockCharm`/`levelUpCharm`. Charm is a player stat with no Everkai counterpart
// (the save carries per-Family `intimacy` and no charm at all). The columns are in the data file so the
// gap stays visible; nothing reads them.
import data from './shapeshift-data.json' with {type:'json'};

export const OUTFITS=Object.freeze(data.outfits.map(Object.freeze));
export const SHAPESHIFT_TOTAL_BP=data.totalBp;                     // 172,000
export const POWERED=Object.freeze(OUTFITS.filter(o=>o.skill));    // the five that pay
const BY_AVATAR=new Map(OUTFITS.map(o=>[o.avatar,o]));
export const outfitById=id=>BY_AVATAR.get(id)||null;

/** LOCAL. One chip a day, for an outfit the player names. See the header. */
export const CHIP_A_DAY=1;
const DAY=86400000;
const dayKey=now=>new Date(now).toISOString().slice(0,10);

const int=(v,max=1e9)=>Number.isInteger(v)&&v>=0&&v<=max;
export const freshShapeshift=()=>({policyVersion:1,levels:{},chips:{},daily:null});
export const shapeshiftState=s=>s?.shapeshift||freshShapeshift();

/** A level of 0 means "not unlocked". Unlock costs one chip and puts the outfit at level 1, so an
 *  outfit at level L has consumed exactly L chips -- which is what makes the ledger checkable. */
export function validShapeshift(s){
 if(s?.shapeshift===undefined)return true;
 const v=s.shapeshift;
 if(!v||v.policyVersion!==1||typeof v.levels!=='object'||typeof v.chips!=='object'||!v.levels||!v.chips)return false;
 if(v.daily!==null&&v.daily!==undefined&&!(typeof v.daily?.day==='string'&&v.daily.day.length===10&&int(v.daily.count,1000)))return false;
 let spent=0;
 for(const [avatar,level] of Object.entries(v.levels)){
  const o=BY_AVATAR.get(avatar);
  if(!o||!int(level,o.maxLevel)||level===0)return false;
  if(level>1&&!o.canLevel)return false;          // isUpdate is the original's own gate on levelling
  spent+=level;
 }
 let held=0;
 for(const [chip,n] of Object.entries(v.chips)){
  if(!OUTFITS.some(o=>o.chip===chip)||!int(n,1e6))return false;
  held+=n;
 }
 // Granted must cover what is held plus what was spent. `granted` is stored, never derived from a
 // table, so widening the outfit list can never invalidate a save (CLAUDE.md rule 12).
 return int(v.granted??0,1e7)&&(v.granted??0)===held+spent;
}

/** The percent this account contributes to EVERY Fellow, in basis points. */
export function shapeshiftPercentBp(s){
 const {levels}=shapeshiftState(s);let bp=0;
 for(const o of POWERED){
  const level=levels[o.avatar]||0;
  if(!level)continue;
  bp+=o.bpInitial+o.bpPerLevel*(Math.min(level,o.skillMaxLevel)-1);
 }
 return bp;
}

/** What the screen shows: every outfit, its level, its chip and what the next step costs. */
export function shapeshiftRows(s){
 const v=shapeshiftState(s);
 return OUTFITS.map(o=>{
  const level=v.levels[o.avatar]||0,chips=v.chips[o.chip]||0;
  const atCap=level>=o.maxLevel||(level>=1&&!o.canLevel);
  return {...o,level,chips,owned:level>0,atCap,
   bp:o.skill?(level?o.bpInitial+o.bpPerLevel*(Math.min(level,o.skillMaxLevel)-1):0):0,
   capBp:o.skill?o.bpInitial+o.bpPerLevel*(o.skillMaxLevel-1):0,
   next:atCap?null:{cost:o.chipCount,affordable:chips>=o.chipCount,verb:level?'Level up':'Unlock'}};
 });
}

export function shapeshiftDaily(s,now=s.lastAt){
 const v=shapeshiftState(s),day=dayKey(now);
 const used=v.daily?.day===day?v.daily.count:0;
 return {day,used,left:Math.max(0,CHIP_A_DAY-used)};
}

export function shapeshiftAction(s,action,now,target){
 if(!['shapeshiftClaim','shapeshiftUnlock','shapeshiftLevel'].includes(action))return null;
 const fail=error=>({state:s,error});
 const v=shapeshiftState(s);
 const next={policyVersion:1,levels:{...v.levels},chips:{...v.chips},daily:v.daily??null,granted:v.granted??0};
 const o=BY_AVATAR.get(target);
 if(!o)return fail('No such outfit.');
 if(action==='shapeshiftClaim'){
  const d=shapeshiftDaily(s,now);
  if(!d.left)return fail('Today’s tailoring is already done. Come back tomorrow.');
  next.chips[o.chip]=(next.chips[o.chip]||0)+1;
  next.granted+=1;
  next.daily={day:d.day,count:d.used+1};
  return {state:{...s,shapeshift:next},message:`A scrap for ${o.clothes.replace('ShapeshiftClothes','Outfit ')}.`};
 }
 const level=next.levels[o.avatar]||0;
 if(action==='shapeshiftUnlock'&&level)return fail('Already tailored.');
 if(action==='shapeshiftLevel'){
  if(!level)return fail('Tailor it first.');
  if(!o.canLevel)return fail('This outfit has no further work in it.');
  if(level>=o.maxLevel)return fail('Already at its best.');
 }
 if((next.chips[o.chip]||0)<o.chipCount)return fail(`Needs ${o.chipCount} scrap for this outfit.`);
 next.chips[o.chip]-=o.chipCount;
 next.levels[o.avatar]=level+1;
 const bp=o.skill?o.bpInitial+o.bpPerLevel*(Math.min(level+1,o.skillMaxLevel)-1):0;
 return {state:{...s,shapeshift:next},
  message:level?`Outfit at Lv. ${level+1}${bp?` — +${(bp/100).toFixed(0)}% to every Fellow`:''}.`
               :`Tailored${bp?` — +${(bp/100).toFixed(0)}% to every Fellow`:''}.`};
}
