import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid} from '../lib/game.mjs';
import {FAMILY,familyById} from '../lib/catalog.mjs';
import {dateIds} from '../lib/dating.mjs';

const T=new Date('2026-09-25T09:00:00').getTime();
const welcomed=(n=5)=>{let s=fresh(T);for(const f of FAMILY.slice(0,n)){const r=act(s,'welcome',T,f.id);if(!r.error)s=r.state;}return s;};

// ---------------------------------------------------------------------------------------------
// docs/family-screen-specs/09-auto-date.md: "the missing moment of the system".
// ---------------------------------------------------------------------------------------------
test('autoDate reports every date individually, not one aggregate sentence',()=>{
 let s=welcomed();
 s={...s,family:Object.fromEntries(Object.entries(s.family).map(([id,f])=>[id,{...f,blessingPower:1400}]))};
 assert.ok(valid(s));
 const r=act(s,'autoDate',T);
 assert.equal(r.error,undefined);
 assert.ok(Array.isArray(r.report),'the result carries a per-date report');
 assert.ok(r.report.length>0);
 // One row per date, each naming WHO and WHAT IT PAID -- the two facts the aggregate sentence lost.
 for(const row of r.report){
  assert.ok(dateIds(s).includes(row.id),`${row.id} is a dateable member`);
  assert.equal(row.name,familyById(row.id)?.name);
  assert.ok(Number.isInteger(row.points)&&row.points>0,`${row.id} paid ${row.points}`);
  assert.ok('picture' in row,'every row says whether it unlocked a CG, even when it did not');
 }
 // The rows must SUM to the run, or the cards and the total disagree on screen.
 const before=Object.values(s.family).reduce((n,f)=>n+f.points,0);
 const after=Object.values(r.state.family).reduce((n,f)=>n+f.points,0);
 assert.equal(r.report.reduce((n,x)=>n+x.points,0),after-before,'the cards must account for the whole run');
 assert.match(r.message,/dates completed/,'the toast still says what it always said');
 // NOTHING IS STORED. The report rides on the result, so no save is affected and no validator sees it.
 assert.ok(!('report' in r.state),'the report must not reach the state');
 assert.ok(valid(r.state));
});

test('a date that unlocks a picture says so on its own row',()=>{
 // discoverDatePicture has always unlocked pictures on a qualifying date; the only trace was a toast
 // that scrolled past. This pins the row that announces it.
 let s=welcomed();
 s={...s,family:Object.fromEntries(Object.entries(s.family).map(([id,f])=>[id,{...f,intimacy:200000,blessingPower:1400}]))};
 assert.ok(valid(s),'a high-intimacy family is a valid save');
 const r=act(s,'autoDate',T);
 assert.equal(r.error,undefined);
 const found=r.report.find(x=>x.picture);
 assert.ok(found,'a high-intimacy run unlocks at least one picture');
 assert.equal(typeof found.picture,'string');
 assert.ok(r.state.familyGallery?.owned?.[found.picture],'and the save records it as owned');
 // The field name is the trap this test exists for: `discoverDatePicture` sets `pictureDiscovered`,
 // not `picture`, so a report that read the wrong key would show every row as "no CG" and look fine.
 const single=act(s,'date',T,null,0.3);
 assert.equal(typeof single.pictureDiscovered,'string','the source field is pictureDiscovered');
 assert.equal(single.picture,undefined,'there is no `picture` field to read by mistake');
});

test('the results screen is wired to the report, and reads it from the result not the state',()=>{
 const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(page,/<DateResults report=\{dateReport\}/,'the screen is rendered');
 assert.match(page,/'report' in result/,'and fed from the action result');
 const screen=readFileSync(new URL('../app/date-results.tsx',import.meta.url),'utf8');
 assert.match(screen,/Total Dates:/);
 assert.match(screen,/New CG Unlocked/,'each unlocked CG gets its own announcement');
 assert.match(screen,/Tap to continue/);
});
