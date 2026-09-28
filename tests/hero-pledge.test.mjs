import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,valid,decode,startingSave} from '../lib/game.mjs';
import {powerParts} from '../lib/adventure.mjs';
import {reaches} from '../lib/hero-scope.mjs';
import {pledgeIds,pledgeRow,pledgeOf,pledgePartner,pledgeValue,pledgePartnerTalent,
        pledgeBindable,PLEDGE_CAP_TALENT} from '../lib/hero-pledge.mjs';

const NOW=1767225600000;
const data=JSON.parse(readFileSync(new URL('../lib/hero-pledge-data.json',import.meta.url),'utf8'));
const roster=()=>act(startingSave(NOW),'recruitAll',NOW).state;
const OWNER='hero_251',PID='Hero251Pledge';
const laddered=(s,owner,level)=>({...s,heroAdvance:{...s.heroAdvance,
 fellows:{...s.heroAdvance.fellows,[owner]:{...s.heroAdvance.fellows?.[owner],pledge:level}}}});

test('the table is the original’s, and the ladder is uniform',()=>{
 assert.equal(pledgeIds().length,15,'HeroPledge has 15 rows');
 assert.equal(PLEDGE_CAP_TALENT,1000,'10 + 10 a level to level 100');
 assert.equal(data.bucket,'talent');
 // Rule 6: the constancy IS the finding, so it is named rather than averaged away. All 15 are identical,
 // and a future row that differs must fail the importer rather than be silently absorbed.
 const shapes=new Set(Object.values(data.pledges).map(r=>`${r.initial}/${r.perLevel}/${r.max}`));
 assert.deepEqual([...shapes],['10/10/100'],'every pledge is the same ladder');
 assert.equal(pledgeOf(OWNER),PID);
 assert.equal(pledgeOf('hero_15'),null,'a Fellow without a pledge has none');
 assert.equal(pledgeRow('nope'),null);
});

test('it reaches the bound partner, and nobody else',()=>{
 let s=roster();
 assert.equal(pledgePartner(s,PID),null,'nothing is bound to begin with');
 s=act(s,'pledgeBind',NOW,OWNER,'hero_15').state;
 assert.equal(pledgePartner(s,PID),'hero_15');
 s=laddered(s,OWNER,100);
 assert.equal(pledgeValue(s,PID),1000);
 assert.equal(pledgePartnerTalent(s,'hero_15'),1000,'the partner is paid');
 assert.equal(pledgePartnerTalent(s,OWNER),0,'and the owner is NOT -- the three self talents are separate');
 for(const other of ['hero_1','hero_253'])assert.equal(pledgePartnerTalent(s,other),0,`${other} must get nothing`);
});

test('the scope needs the save, because a binding is save state',()=>{
 let s=roster();
 s=act(s,'pledgeBind',NOW,OWNER,'hero_15').state;
 assert.equal(reaches(['pledge',PID],'hero_15',s),true);
 assert.equal(reaches(['pledge',PID],'hero_1',s),false);
 // The four pre-existing callers pass no state; `pledge` must answer false rather than throw.
 assert.equal(reaches(['pledge',PID],'hero_15'),false,'no state means no binding to read');
 assert.equal(reaches(['all'],'hero_15'),true,'and the other scopes are untouched');
});

test('an unstarted ladder pays nothing, so binding early is not a free 1,000',()=>{
 let s=roster();
 s=act(s,'pledgeBind',NOW,OWNER,'hero_15').state;
 assert.equal(pledgeValue(s,PID),0,'pledge level 0');
 assert.equal(powerParts(s,'hero_15').talent.resonance,0);
 assert.equal(pledgeValue(laddered(s,OWNER,1),PID),10,'level 1 is the initial');
 assert.equal(pledgeValue(laddered(s,OWNER,50),PID),500);
 assert.equal(pledgeValue(laddered(s,OWNER,100),PID),1000);
});

test('the one LOCAL rule: a pledge cannot bind its own owner',()=>{
 const s=roster();
 assert.equal(pledgeBindable(s,PID,OWNER),false);
 assert.equal(pledgeBindable(s,PID,'hero_15'),true);
 assert.equal(act(s,'pledgeBind',NOW,OWNER,OWNER).error,'A Resonance needs a different Fellow.');
 assert.equal(act(s,'pledgeBind',NOW,OWNER,'hero_999').error,'Recruit that Fellow first.');
 assert.equal(act(s,'pledgeBind',NOW,'hero_15','hero_1').error,'This Fellow has no Resonance.');
});

test('one Fellow may partner several pledges, because nothing measured forbids it',()=>{
 let s=roster();
 for(const owner of ['hero_251','hero_253','hero_254'])s=act(s,'pledgeBind',NOW,owner,'hero_15').state;
 // The bindings alone are a reachable state, so validity is asserted HERE, before the ladder is faked.
 // `laddered` writes a paid pledge level without the Stella pool validHeroAdvance requires for it, so a
 // laddered fixture is deliberately not a valid save and must not be asserted as one.
 assert.ok(valid(s),'three bindings on a real roster is a reachable save');
 let paid=s;
 for(const owner of ['hero_251','hero_253','hero_254'])paid=laddered(paid,owner,100);
 assert.equal(pledgePartnerTalent(paid,'hero_15'),3000,'three pledges, 1,000 each');
});

test('the binding survives a save round-trip, and a forged one is refused',()=>{
 let s=roster();
 s=act(s,'pledgeBind',NOW,OWNER,'hero_15').state;
 const back=decode(JSON.stringify(s));
 assert.equal(pledgePartner(back,PID),'hero_15');
 assert.ok(valid(back));
 const self={...s,heroAdvance:{...s.heroAdvance,fellows:{...s.heroAdvance.fellows,[OWNER]:{partner:OWNER}}}};
 assert.equal(valid(self),false,'the owner as its own partner must not pass validation');
 const unowned={...s,heroAdvance:{...s.heroAdvance,fellows:{...s.heroAdvance.fellows,[OWNER]:{partner:'hero_999'}}}};
 assert.equal(valid(unowned),false,'nor an unrecruited Fellow');
 const nonPledge={...s,heroAdvance:{...s.heroAdvance,fellows:{...s.heroAdvance.fellows,hero_15:{partner:'hero_1'}}}};
 assert.equal(valid(nonPledge),false,'nor a partner on a Fellow with no pledge at all');
});

test('a save written before Resonance still loads',()=>{
 const s=roster();
 assert.equal(s.heroAdvance?.fellows?.[OWNER]?.partner,undefined);
 assert.ok(valid(decode(JSON.stringify(s))));
 assert.equal(pledgePartnerTalent(s,'hero_15'),0);
});
