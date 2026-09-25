import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid} from '../lib/game.mjs';
import {FAMILY,FELLOWS} from '../lib/catalog.mjs';
import {blessersOf,BLESSING_SLOTS} from '../lib/fellow-blessers.mjs';
import {blessingRecipients} from '../lib/blessings.mjs';
import {bondsOf} from '../lib/hero-bond.mjs';

const T=new Date('2026-09-25T09:00:00').getTime();
const withFamily=(n=6)=>{let s=fresh(T);for(const f of FAMILY.slice(0,n)){const r=act(s,'welcome',T,f.id);if(!r.error)s=r.state;}return s;};

// ---------------------------------------------------------------------------------------------
// docs/fellow-screen-specs/09-blessing.md, difference B1.
// ---------------------------------------------------------------------------------------------
test('a Fellow can finally see who blesses THEM, which is the reverse of the only question Everkai asked',()=>{
 const s=withFamily();
 assert.ok(Object.keys(s.family).length>1,'positive control: the village has family to bless with');
 // The forward direction is what Everkai has always had.
 const givers=Object.keys(s.family).filter(w=>(blessingRecipients(s,w)||[]).length);
 assert.ok(givers.length,'some family member blesses someone');
 // The reverse must agree with it exactly -- every (giver -> fellow) pair shows up as (fellow <- giver).
 const forward=new Set();
 for(const w of Object.keys(s.family))for(const t of blessingRecipients(s,w)||[])forward.add(`${w}->${t?.id||t}`);
 const reverse=new Set();
 for(const f of FELLOWS)for(const b of blessersOf(s,f.id))reverse.add(`${b.id}->${f.id}`);
 assert.deepEqual([...reverse].sort(),[...forward].filter(p=>FELLOWS.some(f=>p.endsWith('->'+f.id))).sort(),
  'the inverse must be exactly the forward map, or the rail shows a blessing nobody gives');
 assert.ok(reverse.size>0,'and it is not empty, so this is not vacuous');
});

test('the slot row is the original’s four, and Everkai enforces no cap of its own',()=>{
 // B3: the row communicates CAPACITY, which a list of however-many cannot. But four is the
 // original's shape, not a rule Everkai applies -- a Fellow with five blessers must still show five.
 assert.equal(BLESSING_SLOTS,4);
 const s=withFamily(FAMILY.length);
 const most=FELLOWS.map(f=>blessersOf(s,f.id).length).reduce((a,b)=>Math.max(a,b),0);
 assert.ok(most>=1,'some Fellow is blessed');
 const rail=readFileSync(new URL('../app/fellow-blessing-rail.tsx',import.meta.url),'utf8');
 assert.match(rail,/Math\.max\(BLESSING_SLOTS,blessers\.length\)/,'the row grows past four rather than truncating');
});

test('the Group pill reads HeroBond, which is why it could not be built before today',()=>{
 const s=fresh(T);
 const inGroups=FELLOWS.filter(f=>bondsOf(f.id).length);
 assert.ok(inGroups.length>80,`${inGroups.length} Fellows are in a bond group`);
 const rail=readFileSync(new URL('../app/fellow-blessing-rail.tsx',import.meta.url),'utf8');
 assert.match(rail,/bondsOf/);
 assert.match(rail,/bondGroup/);
 // What is deliberately NOT here, so a later reader does not think it was forgotten.
 assert.match(rail,/Resonance/,'the absent systems are named with their reasons');
 assert.match(rail,/Custom Blessings/);
 assert.ok(!/resonancePair|resonanceSkill/.test(rail),'and none of them is stubbed');
 assert.ok(valid(s));
});
