import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';
import {COSTUMES,costumeArt,costumeById,wardrobeScore,wardrobeAppearance} from '../lib/wardrobe.mjs';
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
 // This used to run on Wife111C2_DateDialogue1, but W111C2 was one of the 173 costumes the owner
 // removed on 2026-09-17, and a removed costume's gate is deliberately dropped (lib/family-gallery.mjs)
 // so the picture stays reachable and an old save that owns it still loads. No shipped row has an
 // unresolved costume link any more, so the rule is driven SYNTHETICALLY, on a row built from a real
 // one: an unknown CG type, and a costume id that never existed, must both still lock the picture.
 const live=FAMILY_PICTURES.find(r=>r.gates.unlockType===2&&r.gates.unlockClothingId&&costumeById(r.gates.unlockClothingId));
 assert.ok(live,'positive control: a resolvable costume-gated picture still ships');
 let s=go(fresh(1000),'welcome',live.familyId);s=go(s,'wardrobeCollect',live.gates.unlockClothingId);
 assert.equal(pictureGate(live,s),null,'positive control: collecting the costume opens the real row');
 assert.match(pictureGate({...live,gates:{...live.gates,unlockType:5}},s),/unresolved/,'an unknown CG type stays locked');
 assert.match(pictureGate({...live,gates:{...live.gates,unlockClothingId:'W999C9'},clothingVariant:null},s),/unresolved/,'a costume that never existed stays locked');
});

test('all 85 admitted costume assets have unique exact owners, hashes and a bounded offline footprint',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');
 const assets=JSON.parse(readFileSync(new URL('../lib/wardrobe-assets.json',import.meta.url)));
 assert.equal(assets.length,85);assert.equal(new Set(assets.map(r=>r.costumeId)).size,85);
 assert.equal(assets.filter(r=>r.ownerId.startsWith('wife_')).length,42);assert.equal(assets.filter(r=>r.ownerId.startsWith('hero_')).length,43);
 assert.ok(assets.reduce((n,r)=>n+r.bytes,0)<=14*1024*1024);
 for(const a of assets){const r=COSTUMES.find(r=>r.id===a.costumeId);assert.equal(r.ownerId,a.ownerId);assert.equal(r.modelId.toLowerCase(),a.model.toLowerCase());const bytes=readFileSync(new URL('../public/assets/'+a.art,import.meta.url));assert.equal(bytes.length,a.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.ok(a.bytes<=512*1024);assert.ok(a.dimensions.every(n=>n>0&&n<=2048));}
 assert.equal(costumeArt('H117C4'),null);
});
