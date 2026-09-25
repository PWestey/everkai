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

test('the group aura is NOT wired into Power, because its gate is a counter Everkai does not have',()=>{
 // UnderlingManager.lua:2157 -- `config.unlockReq <= heroData.auraProgress`. I first read `unlockReq`
 // as a star threshold, which was wrong and visibly so: STAR_CAP is 7 and the ladders run to 500.
 // Wiring it to a guessed gate gave a bond-5 Fellow up to +384 Aptitude and moved a fixture 1.85x.
 // This test is what keeps it out until `auraProgress` is measured.
 const s=fresh(T);
 const id=Object.keys(s.fellows)[0];
 assert.ok(!('heroBond' in powerParts(s,id).talent),'no bond contributor in the talent bucket');
 // The ceiling it WOULD have been worth, kept as the measurement rather than as a magnitude in play.
 const byBond={};
 for(const a of BOND_AURAS)byBond[a.bond]=(byBond[a.bond]||0)+a.value;
 assert.equal(byBond['5'],384);
 assert.equal(byBond['3'],160);
 // `bondTalent` still exists and still computes, so the day `auraProgress` lands it is one wire.
 assert.equal(typeof bondTalent(s,id),'number');
 assert.ok(activeBondAuras(s).length===0,'a fresh village owns none of the aura holders');
});
