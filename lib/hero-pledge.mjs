// RESONANCE -- the pledge's own skill, and the one Fellow it reaches.
//
// `docs/resonance-measurement.md` established that Resonance IS Pledge: every SkillBase string carrying
// the word is a HeroNNNPledge row, and `SkillBase:name:Hero142Pledge` is "Resonance Skills". The ladder,
// its cost, its gate and its three `self` talents at level 30/60/100 were already built. This is the
// half that was not: `pledgeSkill`, scoped `{conditionType:'pledge', id:<itself>}`, 10 + 10 a level to
// level 100 -- 1,000 talent at cap, uniform across all 15.
//
// WHO IT REACHES, measured before wiring, which is why this waited a day. Not a broadcast and not the
// owner: `UNDERLING_SELECT_PLEDGE_HERO` binds a CHOSEN hero to a pledge
// (`UnderlingManager:ReqBindHeroAlliance(hid, pledgeHeroId, pledgeId)`), and
// `GetHeroAlliance` reads that partner back out of `pledgeData[pledgeSkill].heroId`. One pledge, one
// partner. That is fellow spec 08's "pairing two fellows for mutual stat gain".
//
// LOCAL, and it is one rule: a pledge may not bind its own owner. The eligible set is decided
// server-side, so this rests on `UnderlingData.lua:784-792` resolving the partner out of the OTHER
// underlings' map (`GetOtherUnderlingAddValues`). Nothing found restricts one Fellow from partnering
// several pledges, so neither does this.
import data from './hero-pledge-data.json' with {type:'json'};
import {pledgeRule,pledgeLevel} from './hero-advance.mjs';

const PLEDGES=data.pledges;
export const PLEDGE_CAP_TALENT=data.capTalent;                       // 1,000
export const pledgeIds=()=>Object.keys(PLEDGES);
export const pledgeRow=pid=>PLEDGES[pid]||null;
/** The pledge a Fellow owns, if any. */
export const pledgeOf=ownerId=>pledgeIds().find(pid=>PLEDGES[pid].owner===ownerId)||null;

/** The Fellow bound to this pledge, read straight off the save. */
export function pledgePartner(s,pid){
 const row=PLEDGES[pid];if(!row)return null;
 const p=s?.heroAdvance?.fellows?.[row.owner]?.partner;
 return typeof p==='string'&&p?p:null;
}

/** What the pledge pays its partner right now: the owner's pledge LEVEL drives it, and level 0 -- an
 *  unstarted ladder -- pays nothing at all. */
export function pledgeValue(s,pid){
 const row=PLEDGES[pid];if(!row)return 0;
 const level=Math.min(pledgeLevel(s,row.owner)||0,row.max);
 return level>0?row.initial+row.perLevel*(level-1):0;
}

/** Every pledge talent reaching this Fellow as somebody's chosen partner. */
export function pledgePartnerTalent(s,fellowId){
 if(!fellowId||!s?.heroAdvance)return 0;
 let n=0;
 for(const pid of pledgeIds())if(pledgePartner(s,pid)===fellowId)n+=pledgeValue(s,pid);
 return n;
}

/** May this Fellow be bound to this pledge? Owner-exclusion is the LOCAL rule; ownership is not. */
export function pledgeBindable(s,pid,fellowId){
 const row=PLEDGES[pid];
 if(!row||!fellowId||!s?.fellows?.[fellowId])return false;
 return fellowId!==row.owner;
}

export function pledgeBindAction(s,action,target,value){
 if(action!=='pledgeBind')return null;
 const fail=error=>({state:s,error});
 const pid=pledgeOf(target);
 if(!pid)return fail('This Fellow has no Resonance.');
 if(!s.fellows?.[target])return fail('Recruit this Fellow first.');
 if(!pledgeRule(target))return fail('This Fellow has no Resonance.');
 const t=s.heroAdvance||{policyVersion:1,fellows:{}};
 const rec=t.fellows[target]||{};
 if(value===null){
  if(rec.partner===undefined)return {state:s,message:'No Resonance partner is set.'};
  const {partner:_gone,...rest}=rec;
  return {state:{...s,heroAdvance:{...t,fellows:{...t.fellows,[target]:rest}}},message:'Resonance partner cleared.'};
 }
 if(value===target)return fail('A Resonance needs a different Fellow.');
 if(!pledgeBindable(s,pid,value))return fail('Recruit that Fellow first.');
 const gain=pledgeValue(s,pid);
 return {state:{...s,heroAdvance:{...t,fellows:{...t.fellows,[target]:{...rec,partner:value}}}},
  message:gain?`Resonance bound — +${gain.toLocaleString('en-US')} Aptitude to them.`
              :'Resonance bound. Raise the Resonance level to make it pay.'};
}
