import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {newFellow,powerParts,bondedPower} from '../lib/adventure.mjs';
import {stellaState,stellaEntry,stellaRule,stellaBonus,stellaAppointBp} from '../lib/stella.mjs';
import {stellaAttributes,stellaNextRank,stellaShare,stellaWorth} from '../lib/stella-attributes.mjs';
import {grantFragments} from './progression-helpers.mjs';
import {FELLOWS} from '../lib/catalog.mjs';

// STELLA "ATTRIBUTES" -- docs/character-systems-gap.md 2.3, the accumulated-totals view the original
// shows and Everkai did not. It is a VIEW: nothing here is stored and nothing here is new value, so
// every assertion below compares it against the functions the power model itself reads.
const T=new Date('2026-09-16T09:00:00').getTime();
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
const seat=(id,extra={})=>{const s=fresh(T);return {...s,fellows:{...s.fellows,[id]:{...newFellow(750),breaks:13,aptitude:500,...extra}}};};
/** Activate a Fellow's Stella and buy as far as the granted shards reach. */
function climb(s,id,grants=400){
 s=grantFragments(s,id,grants);
 s=go(s,'stellaActivate',id,{seq:stellaState(s).seq});
 for(let i=0;i<40;i++){
  const r=act(s,'stellaUpgrade',s.lastAt,id,{seq:stellaState(s).seq,count:'max'});
  if(r.error)break;
  s=r.state;
 }
 assert.ok(valid(s),'the climb produced a legal save');
 return s;
}

test('an inactive track reports zeros, its whole ladder, and what activation would grant',()=>{
 const s=seat('hero_264');
 const a=stellaAttributes(s,'hero_264');
 assert.equal(a.rank,null);
 assert.equal(a.ranks,20);
 assert.deepEqual(a.power,{flat:0,selfPercent:0,typedPercent:0,percent:0,worth:0});
 assert.deepEqual(a.aptitude,{own:0,bond:0,familyStella:0,total:0});
 assert.equal(a.appoint.bp,0);
 // "New Aptitude Skill": the original's own unlocks, listed with the rank that opens each.
 assert.deepEqual(a.unlocks.map(u=>u.rank),[1,4,6,8]);
 assert.ok(a.unlocks.every(u=>!u.open&&u.aptitude===0));
 // The next step for an inactive track is the free ACTIVATION, carrying the original's rank-0 values.
 assert.deepEqual(stellaNextRank(s,'hero_264'),
  {level:0,cost:0,flat:0,percent:0,selfPercent:10,appointPercent:10,talentLimit:0});
 assert.equal(stellaAttributes(s,'nobody'),null);
});

test('the totals are the same numbers the power model reads, never a second copy of them',()=>{
 const s=climb(seat('hero_264'),'hero_264');
 const a=stellaAttributes(s,'hero_264'),bonus=stellaBonus(s,'hero_264');
 assert.ok(a.rank>0,`positive control: the track actually climbed (rank ${a.rank})`);
 // Every Power figure is stellaBonus itself, not a re-derivation of it.
 assert.equal(a.power.flat,bonus.flat);
 assert.equal(a.power.selfPercent,Math.round(bonus.selfPercent*100)/100);
 assert.equal(a.power.typedPercent,Math.round(bonus.typedPercent*100)/100);
 assert.equal(a.power.percent,Math.round(bonus.percent*100)/100);
 // And the account-wide appointment column, which is NOT Power.
 assert.equal(a.appoint.bp,stellaAppointBp(s));
 assert.equal(a.appoint.multiplier,Math.round((1+stellaAppointBp(s)/10000)*100)/100);
 // The share line is read off powerParts' own named parts, so it cannot drift from the model.
 const p=powerParts(s,'hero_264'),share=stellaShare(s,'hero_264');
 assert.equal(share.flat,p.flat.stella);
 assert.equal(share.percent,p.percent.stella);
 assert.equal(share.aptitude,(p.talent.stellaTalent||0)+(p.talent.stellaBond||0)+(p.talent.familyStella||0));
 assert.equal(share.flatTotal,Object.values(p.flat).reduce((x,y)=>x+y,0));
 // `worth` is the honest answer to "what is this Fellow's own Stella worth": her Power now, less her
 // Power with her own ledger row removed. Both halves from the same save and the same function.
 const without={...s,stella:{...s.stella,history:s.stella.history.filter(r=>r.owner!=='hero_264')}};
 assert.equal(a.power.worth,bondedPower(s,'hero_264')-bondedPower(without,'hero_264'));
 assert.ok(a.power.worth>0,`positive control: it is worth something (${a.power.worth.toLocaleString()})`);
});

test('the view is read-only: it mints nothing, stores nothing and survives a round trip',()=>{
 const s=climb(seat('hero_264'),'hero_264');
 const before=JSON.stringify(s);
 stellaAttributes(s,'hero_264');stellaNextRank(s,'hero_264');stellaShare(s,'hero_264');stellaWorth(s,'hero_264');
 assert.equal(JSON.stringify(s),before,'reading the totals changed the save');
 assert.deepEqual(decode(before),s);
});

test('a typed percent reaches a Fellow who has bought nothing, and the view says which half it is',()=>{
 // hero_54 is one of the only four characters in the original whose Stella grants a TYPE-wide percent.
 // Any other Fellow of that type receives it without a ledger row of her own -- so the running total
 // has to separate "mine" from "reaching me", which is exactly what the per-rank view cannot do.
 const owner='hero_54',type=stellaRule(owner).type;
 let s=fresh(T);
 s={...s,fellows:{...s.fellows,[owner]:{...newFellow(750),breaks:13,aptitude:500}}};
 // A second Fellow of the same type, with no Stella of her own.
 const guest=FELLOWS.find(f=>f.type===type&&f.id!==owner&&!f.addition).id;
 s={...s,fellows:{...s.fellows,[guest]:{...newFellow(750),breaks:13,aptitude:500}}};
 s=climb(s,owner);
 const g=stellaAttributes(s,guest);
 assert.equal(stellaEntry(s,guest),null,'positive control: the guest owns no Stella row');
 assert.equal(g.rank,null);
 assert.equal(g.power.flat,0,'a flat is the owner\'s own and never broadcasts');
 assert.equal(g.power.selfPercent,0,'a self percent never broadcasts either');
 assert.ok(g.power.typedPercent>0,`the type-wide percent does reach her (${g.power.typedPercent}%)`);
 assert.equal(g.power.percent,g.power.typedPercent);
 assert.equal(g.power.worth,0,'and none of it is HERS, so her own row is worth nothing');
});

test('what the original grants and Everkai holds back is named, not silently dropped',()=>{
 const s=seat('hero_264');
 // `held` is the import's own per-hero unmodelledMax. Shinobu's self|talent column is the largest of
 // them: 17 heroes carry one, up to +2,050, blocked on the Aptitude cap (docs/power-parity-audit.md
 // step 5). A player can see the number is withheld rather than wondering where it went.
 assert.deepEqual(stellaAttributes(s,'hero_264').held,{'self|talent':2050});
 // A Fellow whose track holds nothing back says so with an empty record rather than a missing key.
 const plain=stellaAttributes(seat('hero_15'),'hero_15');
 assert.equal(typeof plain.held,'object');
});
