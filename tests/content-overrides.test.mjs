import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
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
 assert.equal(people.length,259);
 for(const p of people)for(const k of ['name','title','occupation','race','description'])
  assert.ok(!WORDING.test(p[k]||''),`${p.id}.${k}: ${p[k]}`);});

test('no live data file carries it either, so a regenerated import cannot quietly undo this',()=>{
 const offenders=[];
 for(const f of readdirSync(new URL('../lib/',import.meta.url))){
  if(!f.endsWith('.json')&&!f.endsWith('.mjs'))continue;
  if(FROZEN_FILES.has(f))continue;
  const text=read(f);
  for(const m of text.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)){
   const [,key,value]=m;
   if(FROZEN_KEYS.test(key)||!WORDING.test(value)||/demonstrat/i.test(value))continue;
   offenders.push(`${f} [${key}] ${value.slice(0,70)}`);}}
 assert.deepEqual(offenders,[]);});

test('the Demon Slayer crossover gear is gone and the roster denylist still holds',()=>{
 assert.equal(overrides.removedItems.length,5);
 for(const item of overrides.removedItems){
  assert.equal(GEAR.find(g=>g.id===item.id),undefined,item.id);
  for(const f of item.files)assert.ok(!read(f).includes(item.id),`${f} still names ${item.id}`);}
 assert.equal(GEAR.length,84);
 const removed=new Set(overrides.removed.map(r=>r.id));
 assert.equal(removed.size,7);
 for(const p of [...FELLOWS,...FAMILY])assert.ok(!removed.has(p.id),p.id);
 // Benizakura is a Fairy Tail crossover, not Demon Slayer: renamed, never removed.
 assert.ok(GEAR.some(g=>g.name==='Crimson Blade Benizakura'));});
