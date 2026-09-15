import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {REMOVED} from '../lib/catalog.mjs';
import source from '../lib/original-blessing-data.json' with {type:'json'};
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state),a);return r.state};

// A save that levelled wife_191's blessing before the Demon Slayer crossover characters were removed holds
// a recipient snapshot that still names hero_302 (it was the 8th of 8). validBlessings compares that
// snapshot to the table exactly, so without the repair the whole village refused to load.
function beforeRemoval(){
 let s=run(run(fresh(1000),'welcome','wife_191'),'activateOriginalProgression');
 s.family.wife_191.points=1e6;s=run(s,'trainBlessing','wife_191','flatBlessing');
 const h=s.family.wife_191.apkBlessings.flatBlessing;
 assert.deepEqual(h.recipients,source.recipients.wife_191,'the fixture starts from the current table');
 assert.ok(!h.recipients.includes('hero_302'));
 h.recipients=[...h.recipients,'hero_302'];h.legacyRecipients=[...h.legacyRecipients,'hero_302'];
 return s;
}

test('a save whose blessing snapshot names a removed character loads, with the removed id dropped',()=>{
 const old=beforeRemoval();
 assert.ok(REMOVED.has('hero_302'));
 assert.equal(valid(old),false,'as stored, the old snapshot does not match the table');
 const s=decode(JSON.stringify(old));
 assert.ok(valid(s));
 assert.deepEqual(s.family.wife_191.apkBlessings.flatBlessing.recipients,source.recipients.wife_191);
 assert.ok(!JSON.stringify(s).includes('hero_302'),'no reference to the removed character survives');
 assert.deepEqual(decode(JSON.stringify(s)),s,'the repair is inert on the repaired save');});

test('the repair only drops removed characters; any other mismatch is still refused',()=>{
 const tampered=beforeRemoval();
 const h=tampered.family.wife_191.apkBlessings.flatBlessing;h.recipients=h.recipients.filter(x=>x!=='hero_302');h.recipients.push('hero_15');
 assert.ok(!REMOVED.has('hero_15'));
 assert.throws(()=>decode(JSON.stringify(tampered)),/compatible village save/,'a non-removed extra recipient is not quietly accepted');});
