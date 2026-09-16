import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import overrides from '../lib/content-overrides.json' with {type:'json'};
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {GEAR} from '../lib/adventure.mjs';
const read=n=>readFileSync(new URL('../lib/'+n,import.meta.url),'utf8');
const WORDING=/demon|devil|succub|incub|\bhell\b|hellish|abyss|infernal/i;
// Provenance, render-verification and research records deliberately still describe the original
// game, so they are exempt. Everything else is what the player can see.
const FROZEN_FILES=new Set(['original-content.mjs','public-roster.json','roster-availability.mjs','roster-batch-evidence.json','source-character-index.json','content-overrides.json','family-gallery-data.json','character-skill-inventory.json','inventory-icon-exceptions.json','drakenberg-layout.json']);
const FROZEN_KEYS=/^(id|source|sourceKey|sourceUrl|url|link|href|hallSource|profileSource|localNameKey|.*[Ss]ha256|model|art|src|image|asset|file|path|event|reference|texture|costumeId|requiredEnglishPackage|evidence|provenance|note|textNote|stringsNote|removedItemsNote)$/;

test('no shipped character profile carries the original infernal wording',()=>{
 const people=[...FELLOWS,...FAMILY];
 assert.equal(people.length,266,'259 plus the seven restored crossover records');
 // The rewrite covers the game's OWN infernal cast. The restored crossover is Demon Slayer itself, shipped
 // as it is at the owner's direction, so its seven records and five swords are exempt by id.
 const crossover=new Set(overrides.restored.map(r=>r.id));
 for(const p of people.filter(p=>!crossover.has(p.id)))for(const k of ['name','title','occupation','race','description'])
  assert.ok(!WORDING.test(p[k]||''),`${p.id}.${k}: ${p[k]}`);
 assert.ok(people.some(p=>crossover.has(p.id)&&WORDING.test(p.occupation||'')),'the exemption is doing something');});

// The restored crossover's own wording (Demon Slayer swordsmen and their blades) is not the game's infernal cast.
const CROSSOVER=/Demon[- ]Slayer/i;
test('no live data file carries it either, so a regenerated import cannot quietly undo this',()=>{
 const offenders=[];
 for(const f of readdirSync(new URL('../lib/',import.meta.url))){
  if(!f.endsWith('.json')&&!f.endsWith('.mjs'))continue;
  if(FROZEN_FILES.has(f))continue;
  const text=read(f);
  for(const m of text.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)){
   const [,key,value]=m;
   if(FROZEN_KEYS.test(key)||!WORDING.test(value)||/demonstrat/i.test(value)||CROSSOVER.test(value))continue;
   offenders.push(`${f} [${key}] ${value.slice(0,70)}`);}}
 assert.deepEqual(offenders,[]);});

test('the crossover cast and their gear ship again, with art',()=>{
 // Removed 2026-09-11, restored 2026-09-15 at the owner's direction. `restored` is a record, not a denylist.
 const restored=new Set(overrides.restored.map(r=>r.id));
 assert.equal(restored.size,7);
 assert.equal(overrides.removed,undefined,'nothing filters on it any more');
 for(const id of restored)assert.ok([...FELLOWS,...FAMILY].some(p=>p.id===id),`${id} is not shipped`);
 for(const p of [...FELLOWS,...FAMILY].filter(p=>restored.has(p.id)))
  assert.ok(existsSync(new URL('../public/assets/'+p.art,import.meta.url)),`${p.id} has no art file`);
 assert.equal(overrides.restoredItems.length,5);
 for(const item of overrides.restoredItems)assert.ok(GEAR.some(g=>g.id===item.id),item.id);
 assert.equal(GEAR.length,89);
 // Benizakura is a Fairy Tail crossover, renamed rather than removed, and stays as it is.
 assert.ok(GEAR.some(g=>g.name==='Crimson Blade Benizakura'));});

