import test from 'node:test';import assert from 'node:assert/strict';
import {MAX_SAVE_BYTES,MAX_SAVE_DEPTH,parseSaveJSON,readSaveFile} from '../lib/save-format.mjs';import {decode,fresh} from '../lib/game.mjs';
test('save admission bounds size before reading files and rejects deep/malformed JSON',async()=>{
 let read=false;await assert.rejects(readSaveFile({size:MAX_SAVE_BYTES+1,text:()=>{read=true;return ''}}),/32 MB/);assert.equal(read,false);
 assert.throws(()=>parseSaveJSON(' '.repeat(MAX_SAVE_BYTES+1)),/32 MB/);assert.throws(()=>parseSaveJSON('['.repeat(MAX_SAVE_DEPTH+1)+'0'+']'.repeat(MAX_SAVE_DEPTH+1)),/deeply/);
 for(const raw of ['{"x":','{"x":"unterminated','}{','{"x":]}'])assert.throws(()=>parseSaveJSON(raw));
 assert.deepEqual(parseSaveJSON(JSON.stringify({text:'[brackets] {and} "quotes" \\ escaped',nested:{a:1}})),{text:'[brackets] {and} "quotes" \\ escaped',nested:{a:1}});assert.deepEqual(decode(JSON.stringify(fresh(1000))),fresh(1000));
});
