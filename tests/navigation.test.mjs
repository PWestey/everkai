import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

// A destination can be reachable and still be broken. page.tsx keeps four lists that must agree:
// modules[] (the heading title), <TabsContent> (the pane), drakenberg-layout.json (the town plate,
// which dispatches openModule(f.id)), and the heading icon path. Nothing checked that they line up.
// Recruit got a plate, a pane and a backdrop but no modules[] row, so its modal opens with a blank
// DialogTitle and requests ./assets/ui/recruit.webp, which does not exist -- on the door to both
// character rosters. tsc cannot see any of this: tab ids are strings and almost every component
// types its props as `any`.
//
// Sibling of tests/dispatch.test.mjs: that one asks whether an action can be reached at all, this
// one asks whether the destination you reach is correctly wired.
const ROOT=new URL('../',import.meta.url);
const page=readFileSync(new URL('app/page.tsx',ROOT),'utf8');
const between=(open,close)=>{const i=page.indexOf(open);if(i<0)return '';const j=page.indexOf(close,i+open.length);return j<0?'':page.slice(i+open.length,j)};
const MODULES=new Map([...between('const modules=[','];').matchAll(/\['([a-z]+)',\s*(['"])(.+?)\2\]/g)].map(m=>[m[1],m[3]]));
const TABS=new Set([...page.matchAll(/<TabsContent value="([a-z]+)"/g)].map(m=>m[1]));
const FACILITIES=JSON.parse(readFileSync(new URL('lib/drakenberg-layout.json',ROOT),'utf8')).facilities.map(f=>f.id);
/** The heading folds many ids onto one journey icon; every other id asks for its own file. */
const ALIAS=new Set([...between("<img src={'./assets/ui/'+([","].includes(tab)?'journey'").matchAll(/'([a-z]+)'/g)].map(m=>m[1]));
const iconFor=id=>(ALIAS.has(id)?'journey':id)+'.webp';

test('the extractors still work (a broken pattern would pass every assertion below vacuously)',()=>{
 assert.ok(MODULES.size>=20,`modules[] parsed ${MODULES.size} rows`);
 assert.ok(TABS.size>=20,`TabsContent parsed ${TABS.size} panes`);
 assert.ok(FACILITIES.length>=15,`layout parsed ${FACILITIES.length} facilities`);
 assert.ok(ALIAS.size>=10,`icon alias parsed ${ALIAS.size} ids`);
 assert.equal(MODULES.get('habits'),'Habit journal'); // a title, not a neighbouring array literal
 assert.equal(iconFor('treasure'),'journey.webp');assert.equal(iconFor('fellows'),'fellows.webp');
});

test('every destination the player can open has a heading title',()=>{
 const missing=[...new Set([...TABS,...FACILITIES])].filter(id=>!MODULES.has(id)).sort();
 assert.deepEqual(missing,[],`reachable but absent from modules[], so the modal heading is blank: ${missing}`);
});

test('every destination has its heading icon on disk',()=>{
 const missing=[...new Set([...MODULES.keys(),...TABS,...FACILITIES])]
  .filter(id=>!existsSync(new URL('public/assets/ui/'+iconFor(id),ROOT))).sort();
 assert.deepEqual(missing,[],`heading icon missing: ${missing.map(id=>id+' -> '+iconFor(id))}`);
});

test('every module id has a pane to show',()=>{
 assert.deepEqual([...MODULES.keys()].filter(id=>!TABS.has(id)),[],'modules[] id with no TabsContent opens an empty modal');
});
