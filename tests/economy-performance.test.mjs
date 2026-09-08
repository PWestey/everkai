import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,totalRate,settle,valid,buildingRate} from '../lib/game.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {newFellow,fellowPower} from '../lib/adventure.mjs';
import {BUSINESSES,enterpriseRate} from '../lib/businesses.mjs';
import {affinityIds,referenceFor} from '../lib/public-reference.mjs';
import {BLESSINGS} from '../lib/blessings.mjs';
import {ORIGINAL_CHARACTERS} from '../lib/original-catalog.mjs';
import reference from '../lib/public-roster.json' with {type:'json'};
function populated(){const s=fresh(1000);s.fellows=Object.fromEntries(FELLOWS.map(f=>[f.id,newFellow()]));s.family=Object.fromEntries(FAMILY.map(f=>[f.id,{intimacy:100,blessingPower:100,points:100000,skill:10,relationship:2,flatBlessing:10,advancedBlessing:10}]));s.bonds=Object.fromEntries(FAMILY.filter(f=>affinityIds(f.id).length).map(f=>[f.id,{fellow:null,original:true,level:10}]));s.enterprises=Object.fromEntries(BUSINESSES.map(b=>[b.id,{employees:5000,fellows:[]}]));return s;}
// Independent pre-optimization membership and summation, intentionally slow.
const oldAffinity=family=>[...new Set(reference.records[family]?.blessedFellows||[])].filter(id=>ORIGINAL_CHARACTERS.find(c=>c.id===id));
function oldPower(s,id){let flat=0,percent=0;
 for(const [family,f] of Object.entries(s.family))if(oldAffinity(family).includes(id)){flat+=BLESSINGS.flatBlessing.values[f.flatBlessing||0];percent+=BLESSINGS.advancedBlessing.values[f.advancedBlessing||0];}
 const bond=1+Object.entries(s.bonds).filter(([family,b])=>(b.original?oldAffinity(family):b.fellow?[b.fellow]:[]).filter(f=>Object.hasOwn(s.fellows,f)).includes(id)).reduce((n,[,b])=>n+b.level*.02,0);
 return Math.floor(fellowPower(s.fellows[id])*(bond+percent)+flat);
}
const oldOperation=s=>Object.keys(s.fellows).reduce((n,id)=>n+oldPower(s,id)/1000,0);
test('full-roster optimized income equals prior arithmetic exactly',()=>{
 const s=populated();assert.ok(valid(s));const operation=oldOperation(s);
 const expected=BUSINESSES.reduce((n,b)=>n+(5000*b.employeeRate+operation),0);
 assert.equal(enterpriseRate(s),expected);assert.equal(totalRate(s),expected+buildingRate(s,'fish'));
 assert.equal(settle(s,2000).pending,s.pending+totalRate(s));assert.equal(s.lastAt,1000);
});
test('each rate evaluation reads current training, bonds and roster rather than caching save state',()=>{
 const s=populated(),before=enterpriseRate(s);
 s.fellows.hero_15.aptitude+=40;assert.ok(enterpriseRate(s)>before);
 const base=enterpriseRate(s);const family=Object.keys(s.bonds)[0];s.bonds[family]={fellow:'hero_15',level:1};
 const operation=oldOperation(s);assert.equal(enterpriseRate(s),BUSINESSES.reduce((n,b)=>n+(5000*b.employeeRate+operation),0));assert.notEqual(enterpriseRate(s),base);
 const copy=structuredClone(s);copy.family[family].flatBlessing=0;assert.notEqual(enterpriseRate(copy),enterpriseRate(s));
 assert.equal(enterpriseRate({...s,enterprises:{}}),0);
});
test('identity and affinity indexes are immutable and preserve unknown-ID behavior',()=>{
 assert.equal(new Set(ORIGINAL_CHARACTERS.map(c=>c.id)).size,ORIGINAL_CHARACTERS.length);
 assert.ok(Object.isFrozen(ORIGINAL_CHARACTERS));assert.ok(Object.isFrozen(ORIGINAL_CHARACTERS[0]));
 assert.throws(()=>ORIGINAL_CHARACTERS[0].id='changed');assert.ok(Object.isFrozen(affinityIds('wife_2')));
 assert.throws(()=>affinityIds('wife_2').push('hero_fake'));
 assert.equal(referenceFor('unknown'),null);assert.deepEqual(affinityIds('unknown'),[]);
});
