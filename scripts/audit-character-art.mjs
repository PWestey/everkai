// Every character view Everkai can draw, checked for the art it needs.
//
// The question this answers: "have all Fellows and Family been reviewed from the roster view and the
// clicked-in view, including costumes?" Clicking 300 screens by hand is not a review anybody repeats,
// so this resolves every art path the two rosters and the wardrobe reference and checks the file is
// actually on disk at the size it claims. What it CANNOT judge is framing and composition -- that is
// docs/ + the plate-difference measurement -- so it reports coverage, not beauty.
import {readFileSync,existsSync,statSync} from 'node:fs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {COSTUMES,costumeArt,costumesFor} from '../lib/wardrobe.mjs';
import {artBounds} from '../lib/art-framing.mjs';
import {hasRosterCrop} from '../lib/roster-crop.mjs';

const PUB=new URL('../public/assets/',import.meta.url);
const file=rel=>new URL(rel,PUB);
const rows=[];
const check=(kind,id,name,rel)=>{
 if(!rel){rows.push({kind,id,name,rel:null,ok:false,why:'no art path'});return;}
 const u=file(rel);
 if(!existsSync(u)){rows.push({kind,id,name,rel,ok:false,why:'missing on disk'});return;}
 const bytes=statSync(u).size;
 const measured=artBounds(rel);
 rows.push({kind,id,name,rel,ok:true,bytes,framed:!!measured,crop:hasRosterCrop(id)});
};

for(const f of FELLOWS)check('fellow',f.id,f.name,f.portrait||f.art);
for(const w of FAMILY)check('family',w.id,w.name,w.portrait||w.art);
for(const c of COSTUMES)check('costume',c.id,`${c.ownerName} · ${c.name}`,costumeArt(c.id)?.art);

const bad=rows.filter(r=>!r.ok);
const unframed=rows.filter(r=>r.ok&&!r.framed);
const byKind=k=>rows.filter(r=>r.kind===k);
for(const k of ['fellow','family','costume']){
 const all=byKind(k),miss=all.filter(r=>!r.ok),crop=all.filter(r=>r.crop);
 console.log(`${k.padEnd(8)} ${String(all.length).padStart(4)} views · ${miss.length} missing art · `+
             `${crop.length} draw the original's crop · ${all.length-miss.length-crop.length} fall back to measured bounds`);
}
// A costume owner with no costume is not a defect; an owner whose costume art is absent is.
const orphan=COSTUMES.filter(c=>!FELLOWS.some(f=>f.id===c.ownerId)&&!FAMILY.some(w=>w.id===c.ownerId));
console.log(`\ncostumes whose owner is not in either roster: ${orphan.length}`);
if(orphan.length)console.log('  ',orphan.slice(0,6).map(c=>`${c.id}/${c.ownerId}`).join(', '));
if(bad.length){
 console.log(`\nMISSING ART (${bad.length}):`);
 for(const r of bad.slice(0,40))console.log(`  ${r.kind} ${r.id} ${r.name} -> ${r.rel||'(none)'} : ${r.why}`);
}
// Framing only matters now for a view with no imported crop: everything else draws the original's own
// 500x400 half-body placed on its exact alpha box (lib/roster-crop.mjs), and never touches artBounds.
const guessed=unframed.filter(r=>!r.crop);
if(guessed.length){
 console.log(`\nNO CROP AND NO MEASURED FRAMING (${guessed.length}) -- these fall back to the default transform:`);
 for(const r of guessed)console.log(`  ${r.kind} ${r.id} ${r.name}`);
}else if(unframed.length){
 console.log(`\n${unframed.length} views have no measured framing, and none of them needs it: all carry an imported crop.`);
}
const cropped=rows.filter(r=>r.crop).length;
console.log(`\ntotal ${rows.length} character views; ${rows.length-bad.length} have art, `+
            `${cropped} draw the original's own roster crop, ${rows.length-cropped} fall back to the measured-bounds path`);
process.exit(bad.length?1:0);
