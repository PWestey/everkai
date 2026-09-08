import test from 'node:test';import assert from 'node:assert/strict';
import {SCENES,sceneFor,sceneLine,sceneText} from '../lib/scenes.mjs';
import original from '../lib/original-content.mjs';
import {fresh,decode} from '../lib/game.mjs';
test('36 encounters retain 411 lines with stable character IDs and complete numeric ordering',()=>{
 assert.equal(SCENES.length,36);assert.equal(SCENES.reduce((n,s)=>n+s.lines.length,0),411);assert.equal(new Set(SCENES.map(s=>s.id)).size,36);
 for(const s of SCENES){assert.ok(original.characters.some(c=>c.id===s.characterId));assert.deepEqual(s.lines.map(l=>l.number),Array.from({length:s.lines.length},(_,i)=>i+1));for(const l of s.lines){assert.equal(l.sourceKey,`Dialog:context:${s.id}-${l.number}`);assert.ok(l.text.trim());assert.ok(!l.text.toLowerCase().includes('momoca'));}}
});
test('Kaity encounter preserves conversation order, source text and known player speaker',()=>{
 const s=sceneFor('hero_15');assert.equal(s.lines.length,10);assert.match(sceneLine(s,1).text,/Hello! Welcome to town/);assert.equal(sceneLine(s,1).speaker,'{playerName}');assert.equal(sceneLine(s,0).speaker,null);assert.match(sceneLine(s,9).text,/guess I'll stay here/);
 assert.equal(sceneLine(s,-1),s.lines[0]);assert.equal(sceneLine(s,100),s.lines[9]);assert.equal(sceneFor('unknown'),null);assert.equal(sceneLine(null,0),null);
});
test('player placeholder is formatted only for display; replay leaves source and saves untouched',()=>{
 const before=JSON.stringify(SCENES),save=fresh(0),raw=JSON.stringify(save);
 assert.equal(sceneText('{playerName}, hello!'),'Village Elder, hello!');assert.equal(sceneText('[b]Hello[/b]'),'Hello');
 for(const s of SCENES)for(const l of s.lines){sceneText(l.text);sceneText(l.speaker);}
 assert.equal(JSON.stringify(SCENES),before);assert.equal(JSON.stringify(save),raw);assert.deepEqual(decode(raw),save);
});
