import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=name=>JSON.parse(readFileSync(new URL('../lib/'+name,import.meta.url)));
const clips=read('character-idle-data.json'),base=read('humanized-static-data.json'),costumes=read('wardrobe-data.json').costumes;
test('all 516 admitted animations match exact appearance ownership and bytes',()=>{
 assert.equal(Object.keys(clips).length,516);let total=0,baseCount=0,costumeCount=0;const paths=new Set();
 for(const [key,c]of Object.entries(clips)){
  if(c.costumeId){const expected=costumes.find(x=>x.id===key);assert.equal(expected.ownerId,c.owner);assert.equal(expected.modelId,c.id);costumeCount++}else{const expected=base.find(x=>x.id===key);assert.equal(c.owner,key);assert.equal(expected.model,c.id);baseCount++}
  assert(!paths.has(c.src));paths.add(c.src);const bytes=readFileSync(new URL('../public/assets/'+c.src,import.meta.url));assert.equal(bytes.length,c.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert(c.bytes<=1048576);total+=c.bytes;
 }
 assert.equal(baseCount,259);assert.equal(costumeCount,257);assert.equal(total,84330126);assert.equal(clips.wife_1.sha256,'272d2eb116438f7439b019664f0287d18e178ec96bba3579fca901a426c32f16');assert.equal(clips.hero_1.sha256,'1bfe76fa20c831f28bf054ff0bcb77f683d4d6dbb903686dbd62b4cd1d1b1711');
});
