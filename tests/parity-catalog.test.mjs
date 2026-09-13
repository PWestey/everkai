import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// docs/parity-catalog.csv is the roadmap of record: 200+ measured rows, cross-referenced by ID from
// commit messages, test comments and each other. It is edited far more often by script than by hand,
// and that is exactly how it gets broken.
//
// THIS FILE EXISTS BECAUSE THE BREAK ALREADY HAPPENED, TWICE IN ONE NIGHT:
//   1. A row was appended carrying an ID that already existed (BUG-17), and the renumber that was
//      meant to fix it picked BUG-18 -- which also already existed. Neither collision was visible.
//   2. A byte-level substring replacement dropped comma-bearing prose into an UNQUOTED field. CSV
//      splits on those commas, so one row silently became 15 columns instead of 12. Nothing noticed
//      until an ad-hoc assertion happened to check, and by then it was committed.
//
// Both are invisible to every other check in this repo, survive a green `pnpm test`, and corrupt the
// one document the roadmap is steered by. So they are pinned here.

const CSV=readFileSync(new URL('../docs/parity-catalog.csv',import.meta.url),'utf8');

/** Minimal RFC 4180 reader: quoted fields may contain commas, newlines and "" escapes. Hand-written
 *  because splitting on ',' is precisely the bug this file guards against, and node ships no parser. */
function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c!=='"'){field+=c;continue}
   if(text[i+1]==='"'){field+='"';i++;continue}
   quoted=false;continue;
  }
  if(c==='"'){quoted=true;continue}
  if(c===','){row.push(field);field='';continue}
  if(c==='\r'&&text[i+1]==='\n'){row.push(field);rows.push(row);row=[];field='';i++;continue}
  if(c==='\n'||c==='\r'){row.push(field);rows.push(row);row=[];field='';continue}
  field+=c;
 }
 if(field!==''||row.length)  {row.push(field);rows.push(row)}
 return rows;
}

// -----------------------------------------------------------------------------------------------
// EXTRACTOR GUARD FIRST. Every assertion below rests on this parser. If it silently returned nothing
// -- or split naively on commas -- the structural checks would pass while proving nothing at all.
// -----------------------------------------------------------------------------------------------

test('the CSV parser works, and specifically does NOT split inside quoted fields',()=>{
 // It must handle the three shapes the catalogue actually contains.
 assert.deepEqual(parseCSV('a,b,c\r\n'),[['a','b','c']]);
 assert.deepEqual(parseCSV('a,"b,still b",c\r\n'),[['a','b,still b','c']],
  'the parser split on a comma INSIDE a quoted field; it would not detect the real defect');
 assert.deepEqual(parseCSV('a,"he said ""hi""",c\r\n'),[['a','he said "hi"','c']]);
 assert.deepEqual(parseCSV('a,"two\r\nlines",c\r\n'),[['a','two\r\nlines','c']]);
 // NEGATIVE CONTROL: it must be ABLE to see a wrong column count, or the check below is vacuous.
 assert.equal(parseCSV('a,b,c\r\nd,e,f,g\r\n')[1].length,4,
  'the parser cannot see an over-wide row, so the column check proves nothing');
 // And the real file must actually be reaching it.
 assert.ok(CSV.length>50_000,'docs/parity-catalog.csv looks empty or truncated');
});

const ROWS=parseCSV(CSV);
const HEADER=ROWS[0];
const BODY=ROWS.slice(1).filter(r=>r.length>1||r[0]!=='');

test('the header is the twelve documented columns',()=>{
 assert.deepEqual(HEADER,['ID','System/Slice','Item','What parity requires','Current Everkai status',
  'Source of truth','Numbers-or-Flow','Effort','Priority','Sprint','Status','Notes/Evidence'],
  'the catalogue columns changed. If that is deliberate, update this list WITH the change.');
});

test('every row has exactly twelve columns — an unquoted comma splits a row silently',()=>{
 const wrong=BODY.map((r,i)=>[i+2,r[0],r.length]).filter(([,,n])=>n!==HEADER.length);
 assert.deepEqual(wrong,[],
  'These rows do not have 12 columns. The usual cause is prose containing a comma written into an '
  +'UNQUOTED field by a byte-level substring replacement -- CSV then splits on those commas and the '
  +'row silently grows. Rejoining the overflow columns with "," restores the text verbatim. '
  +'Reported as [line, ID, columns]: '+JSON.stringify(wrong));
 assert.ok(BODY.length>200,`only ${BODY.length} rows parsed; the catalogue or the parser has drifted`);
});

test('every ID is present and unique — a duplicate makes every cross-reference ambiguous',()=>{
 const ids=BODY.map(r=>r[0]);
 assert.deepEqual(ids.filter(id=>!id.trim()),[],'a row has a blank ID');
 const seen=new Set(),dupes=[];
 for(const id of ids){if(seen.has(id)&&!dupes.includes(id))dupes.push(id);seen.add(id)}
 assert.deepEqual(dupes,[],
  'Duplicate catalogue IDs. Commit messages, test comments and other rows reference these by ID, so '
  +'a duplicate silently points at two different findings. When adding a row, choose the next free ID '
  +'by scanning the WHOLE id set -- hard-coding "the next one" is what produced both collisions: '
  +JSON.stringify(dupes));
});
