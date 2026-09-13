import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';

// Every action lib handles must be reachable from app/, or a player cannot run it however correct,
// guarded and tested it is. Three shipped unreachable before this test existed:
//   summonClaimDay / summonClaimWeek -- paid the habit currency every Invite button spends, so
//     stoneFragments could never leave 0 and BOTH rosters were permanently unreachable, while the
//     Recruit panel told the player "Finish daily habits to earn fragments".
//   farmYieldUpgrade -- the Magic Tree, 201 levels at +5% village earnings to +1000%.
// All three were found by hand-sweeping. This makes the sweep permanent.

const LIB=new URL('../lib/',import.meta.url),APP=new URL('../app/',import.meta.url);
const libFiles=readdirSync(LIB).filter(f=>f.endsWith('.mjs'));
const appSource=readdirSync(APP).filter(f=>/\.tsx?$/.test(f))
 .map(f=>readFileSync(new URL(f,APP),'utf8')).join('\n');

/** Action names lib dispatches on. Four shapes, all load-bearing:
 *    action==='x'                 the common form
 *    action!=='x'                 a module handling exactly one action, early-returning null;
 *                                 seven live actions use it, including fathomAdvance
 *    [...].includes(action)       a module handling several
 *    case 'openingX':             opening.mjs gates on action.startsWith('opening') then switches,
 *                                 so its 15 arms appear in no comparison at all
 *  The opening prefix is required, not incidental. A bare `case 'x':` would also sweep up that
 *  file's task-type identifiers (CollectBuildingMoneyCount, HeroTotalLv, BuildingLvup, ...), which
 *  are matched against journey task rows and are not actions -- 39 invented stranded entries. */
function libActions(){
 const found=new Set();
 for(const f of libFiles){
  const src=readFileSync(new URL(f,LIB),'utf8');
  for(const m of src.matchAll(/action(?:===|!==)(['"])([A-Za-z][A-Za-z0-9]*)\1/g))found.add(m[2]);
  for(const m of src.matchAll(/\[([^\]]*)\]\.includes\(action\)/g))
   for(const q of m[1].matchAll(/(['"])([A-Za-z][A-Za-z0-9]*)\1/g))found.add(q[2]);
  for(const m of src.matchAll(/case (['"])(opening[A-Za-z0-9]*)\1:/g))found.add(m[2]);
 }
 return found;
}

/** A literal anywhere in app/, which covers both action('x') and wrapper forms like run('x'). */
const dispatched=name=>new RegExp(`(['"])${name}\\1`).test(appSource);

/** Deliberately unreachable, each with the reason. Documented in docs/backlog.md. */
const ALLOWED=new Map([
 ['enroll','Superseded by enrollPupil (education.mjs), which the School panel dispatches. Validates PUPIL_TYPES and builds a pupil with no name or grade.'],
 ['habitOrder','Superseded by habitReorder (habits.mjs:47), which the Arrange modal dispatches via move(). Replaces the whole item list rather than permuting a subset.'],
 ['welcome','Family acquisition goes through summonRecruit and its cost table. See docs/free-action-audit.md.'],
 ['recruitAll','Test/CLI only; grants the whole roster at once.'],
 ['welcomeAll','Test/CLI only; grants the whole family at once.'],
 ['upgrade','Alias handled by game.mjs:159, which rewrites it to train before adventureAction sees it.'],
]);

test('the action extractor still works (guards this whole file against a silent regex break)',()=>{
 const actions=libActions();
 // If the patterns above stop matching, every assertion below would pass vacuously. This guard has
 // already earned its keep: it caught the first version missing every `action!==` module.
 assert.ok(actions.size>200,`extracted only ${actions.size} actions; the patterns have drifted`);
 // One known action per shape, so losing any single pattern fails here rather than silently.
 for(const [known,shape] of [['collect','==='],['hireEmployees','includes'],['fathomAdvance','!=='],
                             ['summonClaimDay','includes'],['farmYieldUpgrade','includes'],
                             ['openingFathoms','case opening*']])
  assert.ok(actions.has(known),`extractor missed ${known}; the ${shape} pattern has broken`);
});

test('every lib action is reachable from app/, or is a documented exception',()=>{
 const stranded=[...libActions()].filter(a=>!ALLOWED.has(a)&&!dispatched(a)).sort();
 assert.deepEqual(stranded,[],
  `these actions exist in lib but nothing in app/ dispatches them, so a player cannot run them:\n`
  +stranded.map(a=>`  ${a}`).join('\n')
  +`\n\nAdd a control, or add the action to ALLOWED with the reason it is unreachable.`);
});

test('the exception list has not rotted: each entry is genuinely still unreachable',()=>{
 const actions=libActions();
 for(const [name,reason] of ALLOWED){
  assert.ok(actions.has(name),`ALLOWED lists ${name}, but lib no longer handles it — drop the entry.`);
  assert.ok(!dispatched(name),`ALLOWED lists ${name} as unreachable, but app/ now dispatches it — drop the entry. Reason on file: ${reason}`);
 }
});
