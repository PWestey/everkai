import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import ts from 'typescript';

// Every action lib handles must be reachable from app/, or a player cannot run it however correct,
// guarded and tested it is. Three shipped unreachable before this test existed:
//   summonClaimDay / summonClaimWeek -- paid the habit currency every Invite button spends, so
//     stoneFragments could never leave 0 and BOTH rosters were permanently unreachable, while the
//     Recruit panel told the player "Finish daily habits to earn fragments".
//   farmYieldUpgrade -- the Magic Tree, 201 levels at +5% village earnings to +1000%.
// All three were found by hand-sweeping. This makes the sweep permanent.

const LIB=new URL('../lib/',import.meta.url),APP=new URL('../app/',import.meta.url);
const libFiles=readdirSync(LIB).filter(f=>f.endsWith('.mjs'));
const appFiles=readdirSync(APP).filter(f=>/\.tsx?$/.test(f));

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

/** The four functions app/ dispatches through. `action` and `run` take the name first; `act` takes
 *  (state, name, now) and `btn` takes (label, name, ...), so the name is not always argument 0 and
 *  it is often inside a ternary -- `run(x.done?'habitUncheck':'habitComplete',x.id)`. Every string
 *  literal anywhere inside one of these calls' arguments therefore counts.
 *
 *  A LITERAL ANYWHERE IN app/ IS NOT ENOUGH, and that was BUG-14: `recruit` (game.mjs:257, grants a
 *  Fellow free) passed this guard for months on the strength of `<TabsContent value="recruit">` in
 *  page.tsx and the tab option `['recruit','Recruit']` in fountain-panel.tsx. Neither dispatches
 *  anything. Measured 2026-09-15: restricting to these four callees strands `recruit` and nothing
 *  else -- the other six stranded names were already in ALLOWED. */
const DISPATCHERS=['action','run','act','btn'];
function dispatchedNames(){
 const names=new Set(),callees=new Set();
 for(const f of appFiles){
  const sf=ts.createSourceFile(f,readFileSync(new URL(f,APP),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const literals=n=>{if(ts.isStringLiteral(n))names.add(n.text);n.forEachChild(literals)};
  const walk=n=>{
   if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)){
    callees.add(n.expression.text);
    if(DISPATCHERS.includes(n.expression.text))for(const a of n.arguments)literals(a);
   }
   n.forEachChild(walk);
  };
  walk(sf);
 }
 return {names,callees};
}
const {names:DISPATCHED,callees:CALLEES}=dispatchedNames();
const dispatched=name=>DISPATCHED.has(name);

/** Deliberately unreachable, each with the reason. Documented in docs/backlog.md. */
const ALLOWED=new Map([
 ['enroll','Superseded by enrollPupil (education.mjs), which the School panel dispatches. Validates PUPIL_TYPES and builds a pupil with no name or grade, so requiredLessons falls back to 6 instead of 100-280. NOT dead code: five test files dispatch it, education.test.mjs:14 pins the 6-lesson result, and opening.test.mjs drives it for the ChildGain/ChildEducation quest steps. Removing it needs an owner decision, not a cleanup.'],
 ['welcome','Family acquisition goes through summonRecruit and its cost table. See docs/free-action-audit.md.'],
 ['recruitAll','Test/CLI only; grants the whole roster at once.'],
 ['welcomeAll','Test/CLI only; grants the whole family at once.'],
 ['upgrade','Alias handled by game.mjs:159, which rewrites it to train before adventureAction sees it.'],
 ['recruit','Free acquisition (game.mjs:257 grants the next unowned Fellow outright). The Recruit panel buys through summonRecruit and SUMMON_COSTS instead. Added 2026-09-15 with BUG-14: it had been passing this guard on a tab id, not a dispatch. NOT dead code -- docs/free-action-audit.md counts it in 40 test files, so it needs a fixture shim before removal, the same call as `welcome`.'],
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

test('the dispatch reader still works (guards the app/ half against a rename or a parse failure)',()=>{
 // Symmetric to the guard above: if every dispatcher were renamed, or the TSX parse silently
 // returned nothing, the reachability test would strand all 231 actions rather than pass vacuously
 // -- but it would strand them with a useless message. These assertions name the real cause.
 for(const d of DISPATCHERS)
  assert.ok(CALLEES.has(d),`app/ no longer calls ${d}(); update DISPATCHERS or the dispatch reader is blind`);
 assert.ok(DISPATCHED.size>200,`read only ${DISPATCHED.size} dispatched literals; the TSX walk has drifted`);
 // One per argument position, so losing any shape fails here rather than silently.
 for(const [known,shape] of [['collect','act(state,NAME,now)'],['habitComplete','run(ternary,id)'],
                             ['openingBuild','btn(label,NAME,arg)'],['sowFarm','action(NAME,...)']])
  assert.ok(dispatched(known),`dispatch reader missed ${known}; the ${shape} shape has broken`);
 // And the defect this guard exists for: a bare literal that is not a dispatch must not count.
 assert.ok(!DISPATCHED.has('drakenberg'),'a tab id is being read as a dispatch again; see BUG-14');
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
