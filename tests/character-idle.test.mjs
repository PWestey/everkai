import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=name=>JSON.parse(readFileSync(new URL('../lib/'+name,import.meta.url)));
const clips=read('character-idle-data.json'),base=read('humanized-static-data.json'),costumes=read('wardrobe-data.json').costumes;
// 297 after the owner's 2026-09-17 roster trim: 516 less the 47 base clips of the 48 deleted Fellows
// (one of them never had one) and the 172 costume clips of the 173 removed costumes (one had none).
// The byte total is the whole point of the trim and is pinned for the same reason it always was.
test('all 297 admitted animations match exact appearance ownership and bytes',()=>{
 assert.equal(Object.keys(clips).length,297);let total=0,baseCount=0,costumeCount=0;const paths=new Set();
 for(const [key,c]of Object.entries(clips)){
  if(c.costumeId){const expected=costumes.find(x=>x.id===key);assert.equal(expected.ownerId,c.owner);assert.equal(expected.modelId,c.id);costumeCount++}else{const expected=base.find(x=>x.id===key);assert.equal(c.owner,key);assert.equal(expected.model,c.id);baseCount++}
  assert(!paths.has(c.src));paths.add(c.src);const bytes=readFileSync(new URL('../public/assets/'+c.src,import.meta.url));assert.equal(bytes.length,c.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert(c.bytes<=12*1024*1024);total+=c.bytes;
 }
 assert.equal(total,402700415);assert.equal(baseCount,212);assert.equal(costumeCount,85);assert.equal(clips.wife_1.sha256,'92ed49260a4a01e806f3a269d081701d82804268962659d6ff3304b0302009e8');assert.equal(clips.hero_1.sha256,'76f09d7f749df601757ed4c701fb6c85d31684ab19ea0b16cf5c88a70692bf11');
});
