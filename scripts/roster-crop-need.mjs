// The exact crop list `scripts/import-roster-crops.py` must cover: one row per character view the
// shipped roster can draw, resolved the same way the app resolves it. Written to
// lib/roster-crop-need.json so the importer's coverage assert is against OUR roster, not the APK's.
import {writeFileSync} from 'node:fs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {COSTUMES} from '../lib/wardrobe.mjs';

// MEASURED, not assumed: Hero.json's `wideHead` zero-pads a single-digit id -- row 1 is
// `Half_Hero_01`, not `Half_Hero_1` -- which is why a first pass missed exactly the starter
// characters (hero_1/3/4, wife_1..5) and their costumes. Both spellings are offered and the
// importer takes whichever the package actually holds.
const rows=[];
const pad=key=>key.replace(/^(\d+)/,n=>n.length===1?'0'+n:n);
const add=(view,key,side)=>{
 const names=[...new Set([`Half_${side}_${key}`,`Half_${side}_${pad(key)}`])];
 rows.push({view,sprites:names,file:names[0].toLowerCase().replace(/^half_/,'half-').replace('_','-')+'.webp'});
};
for(const f of FELLOWS)add(f.id,f.id.split('_')[1],'Hero');
for(const f of FAMILY)add(f.id,f.id.split('_')[1],'Wife');
for(const c of COSTUMES)add(c.id,c.id.slice(1),c.id[0]==='H'?'Hero':'Wife');

const dup=rows.map(r=>r.file).filter((f,i,a)=>a.indexOf(f)!==i);
if(dup.length)throw new Error(`file name collision: ${dup.slice(0,5).join(', ')}`);
writeFileSync(new URL('../lib/roster-crop-need.json',import.meta.url),JSON.stringify(rows,null,1)+'\n');
console.log(`${rows.length} views: ${FELLOWS.length} fellow, ${FAMILY.length} family, ${COSTUMES.length} costume`);
console.log('  e.g.',rows[0],rows[FELLOWS.length+FAMILY.length]);
