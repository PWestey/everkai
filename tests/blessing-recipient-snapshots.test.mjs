import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import source from '../lib/original-blessing-data.json' with {type:'json'};
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state),a);return r.state};

// Levelling a blessing stores a SNAPSHOT of its recipient list, and validBlessings (lib/blessings.mjs:25)
// requires that snapshot to equal the shipped table EXACTLY. So every change to the shipped cast strands
// the saves written on the other side of it, in both directions. wife_191 is the case that bit twice:
// hero_302 was the 8th of her 8 recipients, removed 2026-09-11 and restored 2026-09-15.
function levelled(){
 let s=run(run(fresh(1000),'welcome','wife_191'),'activateOriginalProgression');
 s.family.wife_191.points=1e6;s=run(s,'trainBlessing','wife_191','flatBlessing');
 return s;
}
const snapshot=s=>s.family.wife_191.apkBlessings.flatBlessing;

test('the restored crossover Fellow is back in the table, so pre-removal saves load untouched',()=>{
 const s=levelled();
 assert.ok(source.recipients.wife_191.includes('hero_302'),'the table must name the restored character');
 assert.deepEqual(snapshot(s).recipients,source.recipients.wife_191);
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s,'nothing is rewritten on load');});

test('a save written while the character was removed is repaired, not refused',()=>{
 // Exactly what a player who levelled this blessing between 2026-09-11 and 2026-09-15 holds: the
 // snapshot was written without hero_302, and the restored table has him again.
 const old=levelled();
 const h=snapshot(old);h.recipients=h.recipients.filter(x=>x!=='hero_302');
 assert.equal(valid(old),false,'as stored, the mid-window snapshot does not match the restored table');
 const s=decode(JSON.stringify(old));
 assert.ok(valid(s));
 assert.deepEqual(snapshot(s).recipients,source.recipients.wife_191,'re-pinned to the shipped table');
 assert.deepEqual(decode(JSON.stringify(s)),s,'the repair is inert on the repaired save');});

test('a snapshot naming a removed id is still repaired the other way',()=>{
 // The 2026-09-11 direction, driven with an id the original index does not know. The repair keys off
 // originalCharacter(), not off any list of what was removed, so it survives the next cast change too.
 const old=levelled();
 const h=snapshot(old);h.recipients=[...h.recipients,'hero_99999'];
 assert.equal(valid(old),false);
 const s=decode(JSON.stringify(old));
 assert.deepEqual(snapshot(s).recipients,source.recipients.wife_191);
 assert.ok(valid(s));});

test('the repair only heals cast changes; any other mismatch is still refused',()=>{
 // Negative control: hero_15 is a real, shipped character the table never listed for wife_191, so this
 // is tampering rather than a cast change and must not be quietly accepted.
 const tampered=levelled();
 const h=snapshot(tampered);h.recipients=[...h.recipients,'hero_15'];
 assert.ok(source.recipients.wife_191.includes('hero_302')&&!source.recipients.wife_191.includes('hero_15'));
 assert.throws(()=>decode(JSON.stringify(tampered)),/compatible village save/);});
