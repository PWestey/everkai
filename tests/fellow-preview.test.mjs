import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FELLOWS,fellowById} from '../lib/catalog.mjs';
import {RANK_FELLOWS,recruitPrice} from '../lib/summon.mjs';
import {WISH_RECRUITS} from '../lib/fountain.mjs';
import {heroHalos,STAR_HALOS} from '../lib/hero-stars.mjs';
import {fresh} from '../lib/game.mjs';
import {heroRow} from '../lib/original-progression.mjs';
import {fellowSource} from '../lib/fellow-source.mjs';

const read=f=>readFileSync(new URL('../app/'+f,import.meta.url),'utf8');

// ---------------------------------------------------------------------------------------------
// docs/fellow-screen-specs/12-locked-fellow.md. P1: an unowned Fellow gets its OWN screen.
// ---------------------------------------------------------------------------------------------
test('an unowned Fellow never reaches the Cultivate shell',()=>{
 const page=read('page.tsx');
 const i=page.indexOf('<TabsContent value="fellows">');
 const block=page.slice(i,page.indexOf('</TabsContent>',i));
 // The preview branch must come BEFORE the shared CharacterScreen, or an unowned Fellow falls through
 // to the shell with every control inert -- which is the defect this screen exists to remove.
 assert.ok(block.includes('<FellowPreview'),'the fellows route renders FellowPreview');
 assert.ok(block.indexOf('<FellowPreview')<block.indexOf('<CharacterScreen'),
  'the !owned branch must be reached before the Cultivate shell');
 assert.match(block,/!owned\?<FellowPreview/,'the branch is gated on ownership');
 const preview=read('fellow-preview.tsx');
 // P1/P5: no dock, no primary action, one stat band.
 assert.ok(!/primary=/.test(preview),'a preview has no primary action');
 assert.ok(!/rail=/.test(preview),'a preview has no rail');
 assert.match(preview,/preview\b/,'it uses CharacterScreen preview mode (P4: greyscale, not near-black)');
 assert.match(preview,/Initial Aptitude/,'P5: the one comparable number');
});

// ---------------------------------------------------------------------------------------------
// P2: `How to Invite` is one line, and it has to name a route that exists.
// ---------------------------------------------------------------------------------------------
test('every Fellow resolves to a real Everkai acquisition route',()=>{
 // Measured 2026-09-25: 97 from the Recruit counter, 9 Wayfarer rank rewards, 5 in the Fountain's
 // wish. Nothing falls through, so the last branch is a genuine fallback and not the common case --
 // which is the failure mode a "How to Invite" line has: naming a place the player cannot go.
 const wish=new Set(WISH_RECRUITS.filter(r=>r.kind==='fellows').map(r=>r.id));
 const bucket=id=>RANK_FELLOWS.get(id)?'rank':wish.has(id)?'wish':recruitPrice(id)?'recruit':'other';
 const counts={rank:0,wish:0,recruit:0,other:0};
 for(const f of FELLOWS)counts[bucket(f.id)]++;
 assert.equal(counts.other,0,`every Fellow must have a route, ${counts.other} do not`);
 assert.ok(counts.recruit>80&&counts.rank>0&&counts.wish>0,JSON.stringify(counts));
 // Positive control: the three buckets are really distinct, not one predicate matching everything.
 assert.ok(RANK_FELLOWS.get('hero_1'),'hero_1 is a rank reward');
 assert.equal(recruitPrice('hero_1'),null,'and is therefore NOT for sale');
 assert.ok(recruitPrice('hero_101'),'hero_101 is bought at the counter');
 // And the LINE ITSELF, not just the buckets behind it -- the first draft of this test checked the
 // data and would have passed with a `fellowSource` that ignored every branch but the last.
 assert.match(fellowSource('hero_1'),/Wayfarer rank 2/);
 const wishIds=new Set(WISH_RECRUITS.filter(r=>r.kind==='fellows').map(r=>r.id));
 const counter=FELLOWS.find(f=>!RANK_FELLOWS.get(f.id)&&!wishIds.has(f.id)&&recruitPrice(f.id));
 assert.ok(counter,'some Fellow is bought at the counter and nowhere else');
 assert.match(fellowSource(counter.id),/Recruit counter in Drakenberg/);
 assert.match(fellowSource(counter.id),/Acquaint|Insignia|Shard|Fragment/,'the price names its currency');
 const wishId=[...wishIds].find(id=>!RANK_FELLOWS.get(id));
 assert.ok(wishId&&/Fountain/.test(fellowSource(wishId)),'a wish Fellow names the Fountain');
 for(const f of FELLOWS)assert.ok(!/storyline arc/.test(fellowSource(f.id)),`${f.id} fell through to the fallback`);
});

// ---------------------------------------------------------------------------------------------
// P6, and why it is not built.
// ---------------------------------------------------------------------------------------------
test('every halo belongs to exactly one Fellow, so there is no aura membership to draw',()=>{
 // The original's Skills tab opens with a row of member portraits, only the missing one greyed --
 // which says "you have 3 of 4 of this aura" without a sentence. Everkai cannot draw it: this pins
 // WHY, so the day the HeroBond groups (catalogue F8) land, this test fails and points at the row.
 const owners={};
 for(const f of FELLOWS)for(const h of heroHalos(f.id))owners[h.id]=(owners[h.id]||0)+1;
 const shared=Object.entries(owners).filter(([,n])=>n>1);
 assert.deepEqual(shared,[],'a halo with more than one owner means the membership row can now be built');
 // Positive control: the sweep really found halos, so "none are shared" is not vacuous.
 assert.ok(Object.keys(owners).length>40,`only ${Object.keys(owners).length} halos reachable from the roster`);
 assert.ok(Object.keys(STAR_HALOS).length>100);
 // And the band still renders, titled with the aura's OWN name rather than the word "Aura".
 const named=FELLOWS.map(f=>heroHalos(f.id)).flat().filter(h=>h.name);
 assert.ok(named.length>40,'the halos carry their own names, which is what the band is titled with');
});

test('Initial Aptitude is the base-Aptitude column, and every Fellow has one',()=>{
 const s=fresh(new Date('2026-09-25T09:00:00').getTime());
 const missing=FELLOWS.filter(f=>heroRow(s,f.id)===undefined);
 assert.deepEqual(missing.map(f=>f.id),[],'every Fellow has a base-Aptitude row to show');
 assert.equal(heroRow(s,'hero_1'),20);
 assert.equal(heroRow(s,'hero_101'),70,'and it varies by Fellow, so the band compares something');
});
