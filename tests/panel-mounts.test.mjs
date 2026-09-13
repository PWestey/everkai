import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';

// Every component in app/ must be reachable from the entry point by following imports.
//
// A panel can be finished, correct, guarded and tested and still be a screen nobody can open --
// lib/fathoms.mjs shipped with no UI at all, and `farmYieldUpgrade` shipped with no control. Those
// are lib-side holes, and tests/dispatch.test.mjs now catches them. This is the app-side equivalent:
// a .tsx file that renders a real panel but that nothing imports, so it is compiled, type-checked,
// and never mounted. tsc cannot report it (an unused module is not an error), the bundler silently
// drops it, and every test of the logic behind it keeps passing.
//
// Sibling of tests/navigation.test.mjs: that one asks whether a destination you can open is wired
// correctly; this one asks whether the component behind it is connected to the app at all.
//
// Static import-graph analysis only -- no DOM, no render, no new dependency.

const APP=new URL('../app/',import.meta.url);
const read=f=>readFileSync(new URL(f,APP),'utf8');
const FILES=readdirSync(APP).filter(f=>f.endsWith('.tsx')).sort();

/** app/*.tsx files this file imports, resolved to bare filenames.
 *  Three specifier shapes are load-bearing:
 *    './habit-panel'          the common relative form
 *    '@/app/habit-panel'      the alias form
 *    import('@/lib/...')      dynamic; app/roaming-panel.tsx uses one, so it must be swept too
 *  Everything else -- '@/lib/*.mjs', '@/components/ui/*', 'react', './globals.css' -- resolves to no
 *  app component and is dropped. */
function importsOf(file){
 const src=read(file),out=new Set();
 for(const m of src.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)){
  let p=m[1];
  if(p.startsWith('./'))p=p.slice(2);
  else if(p.startsWith('@/app/'))p=p.slice(6);
  else continue;
  if(!p.endsWith('.tsx'))p+='.tsx';
  if(FILES.includes(p))out.add(p);
 }
 return [...out];
}

/** Breadth-first from the roots, recording the shortest hop count to each file. */
function reach(roots){
 const depth=new Map(roots.map(r=>[r,0]));
 for(let frontier=roots;frontier.length;){
  const next=[];
  for(const f of frontier)for(const d of importsOf(f))if(!depth.has(d)){depth.set(d,depth.get(f)+1);next.push(d)}
  frontier=next;
 }
 return depth;
}

/** Files with no importer by design, each with the reason it is still live.
 *  An entry here is a claim that the file is mounted by something OUTSIDE the app/ import graph, so
 *  each one must say what mounts it. */
const ROOTS=new Map([
 ['main.tsx','The entry point. index.html mounts it directly via <script type="module" src="/app/main.tsx">, so nothing in app/ imports it.'],
]);

const DEPTH=reach([...ROOTS.keys()]);

// ---------------------------------------------------------------------------------------------
// Extractor guard FIRST. The whole file is one regex over source text; if it stops resolving
// specifiers the graph collapses and "every file is reachable" would be asserted about nothing --
// or, worse, a graph that matched too loosely would mark every file reachable and never fail.
// ---------------------------------------------------------------------------------------------

test('the import scanner still works (a drifted pattern would pass or fail everything vacuously)',()=>{
 assert.ok(FILES.length>=60,`found only ${FILES.length} app/*.tsx files; the directory sweep has drifted`);
 for(const root of ROOTS.keys())assert.ok(FILES.includes(root),`root ${root} is gone from app/`);

 // The entry point's real edges, by hand.
 assert.deepEqual(importsOf('main.tsx').sort(),['page.tsx','startup-recovery.tsx'],
  'main.tsx no longer imports exactly page.tsx and startup-recovery.tsx; the relative form has broken');
 // page.tsx is the hub, and uses the same './x' form at volume.
 assert.ok(importsOf('page.tsx').length>=30,`page.tsx resolved only ${importsOf('page.tsx').length} imports`);
 assert.ok(importsOf('page.tsx').includes('habit-panel.tsx'),'scanner missed a plain `./habit-panel` import');
 // Non-app specifiers must resolve to nothing, or the graph would be meaningless.
 assert.ok(!importsOf('main.tsx').includes('globals.css'),'a stylesheet resolved as a component');
 for(const f of importsOf('page.tsx'))assert.ok(FILES.includes(f),`${f} is not an app/*.tsx file`);
 // The dynamic form is swept: app/roaming-panel.tsx loads a lib module through import(). It resolves
 // to no component, but the pattern that finds it must still be live for the day one points at app/.
 assert.match(read('roaming-panel.tsx'),/import\('@\/lib\/roaming-story\.mjs'\)/,'the dynamic import this pattern exists for is gone');

 // And the graph must be genuinely TRANSITIVE, not "page.tsx imports everything". If it ever were,
 // this test would pass while proving nothing about deeper panels.
 assert.ok(!importsOf('page.tsx').includes('equipment-shelf.tsx'),
  'equipment-shelf.tsx is now a direct import of page.tsx; pick another file to prove transitivity');
 assert.ok(DEPTH.get('equipment-shelf.tsx')>=3,
  `equipment-shelf.tsx sits at depth ${DEPTH.get('equipment-shelf.tsx')}; it should be reached only through a chain`);
 assert.ok(Math.max(...DEPTH.values())>=3,'the graph is only two levels deep; transitivity is untested');
});

test('every component in app/ is mounted: reachable from the entry point by imports',()=>{
 const orphans=FILES.filter(f=>!DEPTH.has(f)).sort();
 assert.deepEqual(orphans,[],
  'these app/*.tsx files exist but nothing reachable from app/main.tsx imports them, so they are '
  +'compiled and type-checked but never mounted — a finished panel nobody can open:\n'
  +orphans.map(f=>`  app/${f}`).join('\n')
  +'\n\nImport it from the screen that should show it, or add it to ROOTS with what mounts it.');
});

test('the roots list has not rotted: each entry really has no importer inside app/',()=>{
 for(const [root,reason] of ROOTS){
  const importers=FILES.filter(f=>f!==root&&importsOf(f).includes(root));
  assert.deepEqual(importers,[],
   `ROOTS lists ${root} as having no importer, but app/${importers[0]} imports it — drop the entry. `
   +`Reason on file: ${reason}`);
  assert.ok(reason.length>40,`${root}: a root must state what mounts it from outside app/`);
 }
 // index.html is the thing that mounts the entry point; if that link goes, so does the root claim.
 const html=readFileSync(new URL('../index.html',APP),'utf8');
 assert.match(html,/src="\/app\/main\.tsx"/,'index.html no longer mounts app/main.tsx; ROOTS is out of date');
});

test('no component is reachable only from itself: every non-root has a real importer',()=>{
 // A cycle detached from the entry point would be "reachable" from inside itself but never mounted.
 // BFS from the roots already excludes that, so this asserts the complementary fact: every reached
 // file that is not a root is imported by at least one OTHER reached file.
 const reached=[...DEPTH.keys()];
 for(const f of reached){
  if(ROOTS.has(f))continue;
  const importers=reached.filter(x=>x!==f&&DEPTH.has(x)&&importsOf(x).includes(f));
  assert.ok(importers.length,`app/${f} is reached but has no importer among reached files`);
 }
});
