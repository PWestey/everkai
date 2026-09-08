import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';
import {COSTUMES,costumeArt,wardrobeScore,wardrobeAppearance} from '../lib/wardrobe.mjs';
import {FAMILY_PICTURES,pictureGate} from '../lib/family-gallery.mjs';
const go=(s,a,t=null,v=null,now=s.lastAt)=>{const r=act(s,a,now,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
const base=()=>go(fresh(1000),'welcome','wife_51');
const withoutWardrobe=s=>{const {wardrobe,...rest}=s;return rest};
test('cosmetic collection requires the exact owned actor, preserves economy and is duplicate-safe',()=>{
 const old=fresh(1000);assert.equal(old.wardrobe,undefined);assert.equal(decode(JSON.stringify(old)).wardrobe,undefined);
 assert.ok(act(old,'wardrobeCollect',1000,'W51C1').error);
 let s=base(),before=structuredClone(s);s=go(s,'wardrobeCollect','W51C1');
 assert.deepEqual(withoutWardrobe(s),before);assert.equal(wardrobeScore(s),COSTUMES.find(r=>r.id==='W51C1').collectionScore);
 assert.deepEqual(go(s,'wardrobeCollect','W51C1'),s);assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(s.familyGallery,undefined);assert.ok(act(s,'wardrobeEquip',1000,'wife_51','W1C1').error);assert.ok(act(s,'wardrobeEquip',1000,'wife_51','unknown').error);
 assert.deepEqual(go(s,'wardrobeEquip','wife_51',null),s);
});
test('equipping admits only owned exact-owner renderable records and base reset preserves collection',()=>{
 const r=COSTUMES.find(r=>costumeArt(r.id))||COSTUMES[0];let s=go(fresh(1000),r.kind==='wife'?'welcome':'recruit',r.ownerId);
 assert.ok(act(s,'wardrobeEquip',s.lastAt,r.ownerId,r.id).error);s=go(s,'wardrobeCollect',r.id);
 if(!costumeArt(r.id)){assert.ok(act(s,'wardrobeEquip',s.lastAt,r.ownerId,r.id).error);return;}
 const before=structuredClone(s);s=go(s,'wardrobeEquip',r.ownerId,r.id);assert.deepEqual(withoutWardrobe(s),withoutWardrobe(before));assert.equal(wardrobeAppearance(s,{id:r.ownerId,art:'base.webp'}).art,costumeArt(r.id).art);
 assert.deepEqual(go(s,'wardrobeEquip',r.ownerId,r.id),s);assert.deepEqual(decode(JSON.stringify(s)),s);
 s=go(s,'wardrobeEquip',r.ownerId,null);assert.equal(s.wardrobe.equipped[r.ownerId],undefined);assert.deepEqual(s.wardrobe.owned,before.wardrobe.owned);
});
test('costume picture requires explicit costume ownership and a later successful threshold date, not equip',()=>{
 const row=FAMILY_PICTURES.find(r=>r.gates.unlockClothingId==='W51C1');let s=base();s.family.wife_51.intimacy=row.gates.unlockIntimacy-1;
 assert.ok(pictureGate(row,s));s=go(s,'wardrobeCollect','W51C1');assert.equal(s.familyGallery,undefined);assert.equal(pictureGate(row,s),null);
 s=go(s,'date',null,0,s.lastAt+300000);assert.equal(s.familyGallery?.owned[row.event],undefined);
 s.family.wife_51.intimacy=row.gates.unlockIntimacy;
 for(let i=0;i<20&&!s.familyGallery?.owned[row.event];i++)s=go(s,'date',null,0,s.lastAt+300000);
 assert.ok(s.familyGallery.owned[row.event]);assert.deepEqual(s.wardrobe.equipped,{});assert.deepEqual(decode(JSON.stringify(s)),s);
 const first=s.familyGallery.owned[row.event].unlockedAt;s=go(s,'date',null,0,s.lastAt+300000);assert.equal(s.familyGallery.owned[row.event].unlockedAt,first);
 const bad=structuredClone(s);delete bad.wardrobe.owned.W51C1;assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));
});
test('malformed wardrobe and foreign actor equip are rejected without converting legacy saves',()=>{
 const s=base();for(const wardrobe of [null,[],{policyVersion:2,owned:{},equipped:{}},{policyVersion:1,owned:{unknown:{collectedAt:1}},equipped:{}},{policyVersion:1,owned:{W51C1:{collectedAt:-1}},equipped:{}},{policyVersion:1,owned:{W51C1:{collectedAt:1}},equipped:{wife_1:'W51C1'}}]){
  const bad={...s,wardrobe};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));
 }
});

test('unknown costume CG type remains locked even after collecting its exact costume',()=>{
 const r=FAMILY_PICTURES.find(r=>r.event==='Wife111C2_DateDialogue1');let s=go(fresh(1000),'welcome',r.familyId);s=go(s,'wardrobeCollect','W111C2');assert.match(pictureGate(r,s),/unresolved/);
});

test('all 257 admitted costume assets have unique exact owners, hashes and a bounded offline footprint',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');
 const assets=JSON.parse(readFileSync(new URL('../lib/wardrobe-assets.json',import.meta.url)));
 assert.equal(assets.length,257);assert.equal(new Set(assets.map(r=>r.costumeId)).size,257);
 assert.equal(assets.filter(r=>r.ownerId.startsWith('wife_')).length,101);assert.equal(assets.filter(r=>r.ownerId.startsWith('hero_')).length,156);
 assert.ok(assets.reduce((n,r)=>n+r.bytes,0)<=32*1024*1024);
 for(const a of assets){const r=COSTUMES.find(r=>r.id===a.costumeId);assert.equal(r.ownerId,a.ownerId);assert.equal(r.modelId.toLowerCase(),a.model.toLowerCase());const bytes=readFileSync(new URL('../public/assets/'+a.art,import.meta.url));assert.equal(bytes.length,a.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.ok(a.bytes<=512*1024);assert.ok(a.dimensions.every(n=>n>0&&n<=960));}
 assert.equal(costumeArt('H117C4'),null);
});
