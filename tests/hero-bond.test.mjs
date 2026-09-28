import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid} from '../lib/game.mjs';
import {FELLOWS} from '../lib/catalog.mjs';
import {BOND_GROUPS,BOND_AURAS,BOND_ACTIVATION,bondsOf,bondGroup,bondGroups,activeBondAuras,bondTalent} from '../lib/hero-bond.mjs';
import {reaches} from '../lib/hero-scope.mjs';
import {powerParts} from '../lib/adventure.mjs';
import {heroHalos} from '../lib/hero-stars.mjs';

const T=new Date('2026-09-25T09:00:00').getTime();

test('HeroBond is 23 groups over 131 heroes, and only four of them pay',()=>{
 assert.equal(Object.keys(BOND_GROUPS).length,23);
 const named=new Set(Object.values(BOND_GROUPS).flatMap(g=>g.members));
 assert.equal(named.size,131);
 // Rule 6: the shape is the finding. 57 auras across FOUR groups, all granting `talent`, at 2/10/20.
 assert.equal(BOND_AURAS.length,57);
 assert.deepEqual([...new Set(BOND_AURAS.map(a=>a.bond))].sort(),['10','13','3','5']);
 assert.deepEqual([...new Set(BOND_AURAS.map(a=>a.prop))],['talent']);
 assert.deepEqual([...new Set(BOND_AURAS.map(a=>a.value))].sort((a,b)=>a-b),[2,10,20]);
 // So most groups are a set to finish, not a bonus to chase -- which is what the screen says.
 const paying=new Set(BOND_AURAS.map(a=>a.bond));
 assert.equal(Object.keys(BOND_GROUPS).filter(id=>!paying.has(id)).length,19);
 // And the one activation condition in the shipped config is exactly that: one.
 assert.equal(BOND_ACTIVATION.bond,'5');
 assert.equal(BOND_ACTIVATION.need,5);
 assert.equal(BOND_ACTIVATION.heroes.length,13);
});

test('this is the group membership Everkai never had, and it reaches most of the roster',()=>{
 // Measured 2026-09-25 while building the locked-fellow preview: every one of the 128 star halos
 // belongs to exactly ONE Fellow, so there was no membership anywhere. That is why F6 and F8 are one
 // slice, and this is the assertion that proves the gap is now closed.
 const soloHalos={};
 for(const f of FELLOWS)for(const h of heroHalos(f.id))soloHalos[h.id]=(soloHalos[h.id]||0)+1;
 assert.ok(Object.values(soloHalos).every(n=>n===1),'star halos are still one-Fellow each');
 const inAGroup=FELLOWS.filter(f=>bondsOf(f.id).length);
 assert.ok(inAGroup.length>80,`only ${inAGroup.length} Fellows are in a group`);
 // The fourth targetCondition scope the original uses, which `reaches` could not express before.
 const member=BOND_GROUPS['5'].members[0];
 assert.equal(reaches(['bond','5'],member),true);
 assert.equal(reaches(['bond','5'],'hero_nobody'),false);
 assert.equal(reaches(['bond','1'],member),false,'a scope must not match every group');
});

test('collection progress counts what the village owns, and needs no magnitude at all',()=>{
 let s=fresh(T);
 // A group whose members are all in Everkai's own catalogue -- 131 heroes are named across the 23
 // groups and Everkai carries 111 Fellows, so not every group is completable here.
 const playable=new Set(FELLOWS.map(f=>f.id));
 const gid=Object.keys(BOND_GROUPS).find(id=>BOND_GROUPS[id].members.length&&BOND_GROUPS[id].members.every(m=>playable.has(m)));
 assert.ok(gid,'some group is entirely inside the shipped roster');
 const g0=bondGroup(s,gid);
 assert.equal(g0.have,0);
 assert.equal(g0.complete,false);
 const members=BOND_GROUPS[gid].members;
 let s1={...s,fellows:{...s.fellows,[members[0]]:{level:1,aptitude:10,skill:0,breaks:0,gear:null}}};
 assert.ok(valid(s1));
 assert.equal(bondGroup(s1,gid).have,1);
 let sAll={...s,fellows:{...s.fellows,...Object.fromEntries(members.map(m=>[m,{level:1,aptitude:10,skill:0,breaks:0,gear:null}]))}};
 assert.ok(valid(sAll));
 assert.equal(bondGroup(sAll,gid).complete,true);
 // The empty placeholder row is not offered as a group to complete.
 assert.ok(!bondGroups(s).some(x=>x.total===0),'a zero-member group is not listed');
 assert.equal(bondGroups(s).length,22);
});

test('the group aura is wired now, and an ungated village still gets nothing',()=>{
 // HISTORY, kept because it cost real time. UnderlingManager.lua:2165 gates the aura on
 // `config.unlockReq <= heroData.auraProgress`. I first read `unlockReq` as a star threshold, which
 // was wrong and visibly so -- STAR_CAP is 7 and the ladders run to 250 -- and wiring it to that
 // guessed gate moved a fixture 1.85x. It then sat unwired from 2026-09-25 to 2026-09-28 on a second
 // wrong claim: that no config carried `auraProgress`. It does; my search was case-sensitive. See
 // docs/aura-progress-measurement.md.
 const s=fresh(T);
 const id=Object.keys(s.fellows)[0];
 assert.equal(typeof powerParts(s,id).talent.bondAura,'number','the contributor exists now');
 assert.equal(powerParts(s,id).talent.bondAura,0,'and a fresh village has earned none of it');
 assert.equal(activeBondAuras(s).length,0,'it owns none of the aura holders, let alone their gates');
 // The ceiling, unchanged by the wiring: this is a small contributor and is pinned as one.
 const byBond={};
 for(const a of BOND_AURAS)byBond[a.bond]=(byBond[a.bond]||0)+a.value;
 assert.equal(byBond['5'],384);
 assert.equal(byBond['3'],160);
});


// ---------------------------------------------------------------------------------------------
// THE GROUP AURAS, wired 2026-09-28 on the gate docs/aura-progress-measurement.md traced.
// ---------------------------------------------------------------------------------------------
import {auraProgress,bondAuraRows} from '../lib/hero-bond.mjs';
import {startingSave as start2} from '../lib/game.mjs';

const AURA_T=1767225600000;
const withSkills=(s,id,skills)=>({...s,fellows:{...s.fellows,[id]:{...s.fellows[id],talentSkills:skills}}});
const full=()=>act(start2(AURA_T),'recruitAll',AURA_T).state;

test('auraProgress counts levels BOUGHT, not levels held',()=>{
 let s=full();
 assert.equal(auraProgress(s,'hero_114'),0,'an untrained Fellow has none');
 // A skill's first level is its free unlock, so level 1 is worth nothing. LOCAL, and marked as such
 // in lib/hero-bond.mjs; it is the reading of System.AuraProgress = 1.
 assert.equal(auraProgress(withSkills(s,'hero_114',{A:1}),'hero_114'),0,'level 1 is the unlock');
 assert.equal(auraProgress(withSkills(s,'hero_114',{A:2}),'hero_114'),1);
 assert.equal(auraProgress(withSkills(s,'hero_114',{A:60,B:40}),'hero_114'),98,'59 + 39');
 assert.equal(auraProgress(withSkills(s,'hero_114',{A:'x'}),'hero_114'),0,'a malformed level counts nothing');
});

test('an aura is locked until its OWNER clears its own unlockReq',()=>{
 let s=full();
 assert.equal(activeBondAuras(s).length,0,'nothing is unlocked on an untrained roster');
 const owner=BOND_AURAS[0].hero,req=BOND_AURAS[0].unlockReq;
 // Exactly at the threshold it opens; one short it does not. The gate is on the AURA'S OWNER, which
 // is what UnderlingManager.lua:2165 reads (CheckHeroAuraRed keys the rows on that heroId).
 const below=withSkills(s,owner,{A:req}),at=withSkills(s,owner,{A:req+1});
 assert.equal(auraProgress(below,owner),req-1);
 assert.equal(activeBondAuras(below).some(a=>a.hero===owner),false,'one short stays shut');
 assert.equal(activeBondAuras(at).some(a=>a.hero===owner),true,'at the threshold it opens');
});

test('an unlocked aura pays every member of its bond, and reaches Power',()=>{
 let s=full();
 const aura=BOND_AURAS.find(a=>bondsOf(a.hero).includes(a.bond))||BOND_AURAS[0];
 s=withSkills(s,aura.hero,{A:aura.unlockReq+1});
 const member=BOND_GROUPS[aura.bond].members.find(m=>s.fellows[m]);
 assert.ok(member,'the bond must have an owned member to pay');
 assert.ok(bondTalent(s,member)>=aura.value,'the member receives at least this aura');
 assert.equal(powerParts(s,member).talent.bondAura,bondTalent(s,member),'and it lands in the talent bucket');
 const outsider=Object.keys(s.fellows).find(id=>!bondsOf(id).includes(aura.bond));
 if(outsider)assert.equal(bondTalent(s,outsider),0,'a Fellow outside the bond gets nothing from it');
});

test('the ceiling of this contributor is small, and named',()=>{
 // 384 talent is the most any one Fellow can receive (bond 5, 36 auras), against a maxed talent
 // bucket of 10,996. Pinned so a re-priced gate cannot quietly make this a major faucet.
 const byBond={};
 for(const a of BOND_AURAS)byBond[a.bond]=(byBond[a.bond]||0)+a.value;
 assert.equal(Math.max(...Object.values(byBond)),384);
 assert.deepEqual(Object.keys(byBond).sort(),['10','13','3','5']);
});

test('the Compendium can show a locked aura rather than hiding it',()=>{
 let s=full();
 const rows=bondAuraRows(s);
 assert.ok(rows.length>0,'owned auras are listed even while locked');
 assert.ok(rows.every(r=>r.unlocked===false),'all locked on an untrained roster');
 const owner=rows[0].hero;
 const opened=bondAuraRows(withSkills(s,owner,{A:1000}));
 assert.ok(opened.some(r=>r.hero===owner&&r.unlocked),'and they open when the gate is met');
});

test('the gate is on the aura’s OWNER, not on whoever receives it',()=>{
 // UnderlingManager.lua:2165 -- CheckHeroAuraRed(heroId) reads the HeroBondBonus rows keyed on that
 // heroId against THAT hero's auraProgress. So training the owner opens the aura for the whole bond,
 // including members who have bought no skills at all. Gating on the recipient instead would look
 // identical in every other test in this file, which is why this one exists.
 let s=act(start2(AURA_T),'recruitAll',AURA_T).state;
 const aura=BOND_AURAS.find(a=>{
  const members=BOND_GROUPS[a.bond].members.filter(m=>m!==a.hero);
  return members.length&&members.some(m=>s.fellows[m]);});
 assert.ok(aura,'need an aura whose bond has another owned member');
 const mate=BOND_GROUPS[aura.bond].members.find(m=>m!==aura.hero&&s.fellows[m]);
 s=withSkills(s,aura.hero,{A:aura.unlockReq+1});          // ONLY the owner is trained
 assert.equal(auraProgress(s,mate),0,'the bond-mate has bought nothing');
 assert.ok(bondTalent(s,mate)>=aura.value,
  'and still receives the aura, because the gate is the owner’s');
});
