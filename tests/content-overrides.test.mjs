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

test('no player-visible data names a removed character, so bond pairings and albums cannot list them',async()=>{
 const {affinityIds}=await import('../lib/public-reference.mjs');
 const {searchCharacters}=await import('../lib/original-catalog.mjs');
 const {supportedIds}=await import('../lib/bonds.mjs');
 const ids=overrides.removed.map(r=>r.id),names=[...new Set(overrides.removed.map(r=>r.name))];
 const tokens=[...ids.map(id=>`"${id}"`),...names];
 // Positive control: the frozen provenance roster still names them, so the scan below can see them.
 assert.ok(tokens.every(t=>read('public-roster.json').includes(t)||read('original-content.mjs').includes(t)),'the scan cannot find removed characters even in provenance');
 for(const f of overrides.removedReferences)assert.ok(!FROZEN_FILES.has(f),`${f} is frozen provenance; filter it at load time instead`);
 const offenders=[];
 for(const f of readdirSync(new URL('../lib/',import.meta.url))){
  if((!f.endsWith('.json')&&!f.endsWith('.mjs'))||FROZEN_FILES.has(f))continue;
  const text=read(f);
  for(const t of tokens)if(text.includes(t))offenders.push(`${f} names removed character ${t}; add it to removedReferences and run scripts/apply-content-overrides.py`);}
 assert.deepEqual(offenders,[]);
 const removed=new Set(ids);
 // Bridget (wife_191) is documented with Tanjiro Kamado in the frozen roster; it must not reach the Bonds sheet.
 assert.ok(JSON.parse(read('public-roster.json')).records.wife_191.blessedFellows.includes('hero_302'));
 const shown=[];
 for(const p of FAMILY)for(const f of affinityIds(p.id))if(removed.has(f))shown.push(`${p.id} Documented Fellows lists ${f}`);
 const village={bonds:{},fellows:Object.fromEntries(ids.map(id=>[id,{}]))};
 for(const p of FAMILY)for(const f of supportedIds(village,p.id))if(removed.has(f))shown.push(`${p.id} bond supports ${f}`);
 for(const kind of ['Hero','Wife'])for(const c of searchCharacters(kind))if(removed.has(c.id))shown.push(`${kind} album lists ${c.id}`);
 assert.deepEqual(shown,[]);});
