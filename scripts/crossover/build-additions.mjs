// Generates lib/everkai-additions-data.json from lib/crossover-roster-data.json plus the build
// manifests of the owner's private asset corpus, and installs each character's still into
// public/assets/crossover/.
//
//   CROSSOVER_BUILD=<corpus>/full node scripts/crossover/build-additions.mjs        # install + write
//   node scripts/crossover/build-additions.mjs --check                             # data-only check
//
// The 133 `kind:"fellows"` rows are GENERATED here from the roster plus each build's manifest. The 30
// `kind:"family"` rows of docs/crossover-family-split.md are hand-authored prose (they carry their own
// catalogue records, blessings, dating and Fathom tables) and are carried through UNCHANGED -- except
// for `recipients`, which is DERIVED: familyRecipients() in lib/crossover-recipients.mjs, re-run over
// whatever Fellow rows exist, is the single source for those lists. That is why this generator has to
// emit the whole file rather than just the Fellow array: the two arrays are coupled through the rank
// rule, and a Fellow row landing changes which Fellows a Family member blesses.
//
// `rank` is the owner's rank within his franchise, mirrored from the roster onto EVERY row. It is not
// cosmetic: familyRecipients() sorts the Fellow pool by it, so a Fellow row without a rank sorts as
// Infinity and the recipient lists degrade from "nearest in rank" to alphabetical.
//
// Rarity is "N" for every new row (docs/crossover-plan.md: "rarity N for every crossover, climbing to
// the top through the shipped quality ladder"), and the template is the per-type SSR anchor from
// scripts/crossover/pick-template.mjs, chosen by TYPE alone -- rarity N has no template of its own.
// `clip` is null on the new rows: the 163 idle mp4s are 98 MB and are installed with the shipping step
// (docs/crossover-plan.md order of work 10). additionClip() returns null for them, and
// app/character-artwork.tsx already falls back to the still.
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import roster from '../../lib/crossover-roster-data.json' with {type:'json'};
import shipped from '../../lib/everkai-additions-data.json' with {type:'json'};
import {RARITY_N_ANCHORS} from './pick-template.mjs';
import {familyRecipients} from '../../lib/crossover-recipients.mjs';

export const NEW_RARITY='N';
const KEYS=['id','name','title','occupation','race','rarity','type','description','rank','template','art','clip','artSha256','artBytes','source'];
/** The Family rows carry one authored table of their own, and it sits between the media and the
 *  provenance -- see lib/everkai-additions.mjs. */
const FAMILY_KEYS=KEYS.flatMap(k=>k==='source'?['recipients','source']:[k]);
/** Every row is emitted in ONE key order, whether it was generated now or carried through from the
 *  shipped file, so a row's bytes are a function of its values and not of when it was written. */
const inOrder=(row,keys)=>{
 const extra=Object.keys(row).filter(k=>!keys.includes(k));
 if(extra.length)throw new Error(`${row.id}: unexpected key(s) ${extra.join()}`);
 const missing=keys.filter(k=>!(k in row));
 if(missing.length)throw new Error(`${row.id}: missing key(s) ${missing.join()}`);
 return Object.fromEntries(keys.map(k=>[k,row[k]]));
};
const assetDir=new URL('../../public/assets/crossover/',import.meta.url);
const dataFile=new URL('../../lib/everkai-additions-data.json',import.meta.url);

export function buildRows({build=process.env.CROSSOVER_BUILD,install=false}={}){
 const rows=[];
 for(const c of roster.characters){
  if(c.kind!=='fellows')continue;
  const already=shipped.fellows.find(f=>f.id===c.id);
  // A row already in the file keeps its own measured media bytes and prose; only `rank` is re-mirrored
  // from the roster, which is where it came from (it is a verbatim mirror, so this is idempotent).
  if(already){rows.push({...already,rank:c.rank});continue}
  if(!build)throw new Error(`CROSSOVER_BUILD is not set and ${c.id} is not shipped yet`);
  const dir=`${build}/${c.id}/`;
  const manifest=JSON.parse(readFileSync(dir+'manifest.json','utf8'));
  if(manifest.id!==c.id)throw new Error(`${c.id}: manifest says ${manifest.id}`);
  const art=readFileSync(dir+manifest.still.file);
  const sha=createHash('sha256').update(art).digest('hex');
  if(sha!==manifest.still.sha256)throw new Error(`${c.id}: still hash does not match its manifest`);
  if(art.length!==manifest.still.bytes)throw new Error(`${c.id}: still byte count does not match its manifest`);
  if(art.subarray(8,12).toString()!=='WEBP')throw new Error(`${c.id}: still is not a webp`);
  if(install)copyFileSync(dir+manifest.still.file,new URL(manifest.still.file,assetDir));
  const template=RARITY_N_ANCHORS[c.type];
  if(!template)throw new Error(`${c.id}: no rarity-N anchor for type ${c.type}`);
  rows.push({id:c.id,name:c.character,title:c.title,occupation:c.occupation,race:c.race,
   rarity:NEW_RARITY,type:c.type,description:c.description,rank:c.rank,template,
   art:'crossover/'+manifest.still.file,clip:null,artSha256:sha,artBytes:art.length,
   source:{game:manifest.game,assetId:manifest.assetId,bundle:manifest.bundle,bundleSha256:manifest.bundleSha256,
    prefab:manifest.root,clip:manifest.clip,pipeline:'scripts/crossover/build-character.py'}});
 }
 return rows.map(r=>inOrder(r,KEYS));
}

/** The 30 Family rows, carried through with their prose and measured media untouched, their `rank`
 *  re-mirrored from the roster and their `recipients` RE-DERIVED from `fellowRows` by the one rule in
 *  lib/crossover-recipients.mjs. Nothing stored in a save is derived from a recipient list (an addition
 *  never gains an `apkBlessings` record), so regrowing them cannot refuse an older save -- CLAUDE.md
 *  rule 12, which is why these lists are allowed to move when Fellow rows land. */
export function buildFamilyRows(fellowRows){
 const ranked=new Map(roster.characters.map(c=>[c.id,c]));
 return (shipped.family||[]).map(r=>{
  const c=ranked.get(r.id);
  if(!c)throw new Error(`${r.id} is not in lib/crossover-roster-data.json`);
  if(c.kind!=='family')throw new Error(`${r.id} is a ${c.kind} row in the roster, not family`);
  return inOrder({...r,rank:c.rank,recipients:familyRecipients({...r,rank:c.rank},fellowRows)},FAMILY_KEYS);
 });
}

export const dataFileText=(rows,familyRows=buildFamilyRows(rows))=>
 JSON.stringify({policy:shipped.policy,flag:shipped.flag,fellows:rows,family:familyRows},null,1)+'\n';

if(process.argv[1]===new URL(import.meta.url).pathname){
 const check=process.argv.includes('--check');
 const rows=buildRows({install:!check});
 const familyRows=buildFamilyRows(rows);
 const text=dataFileText(rows,familyRows);
 if(check){
  if(readFileSync(dataFile,'utf8')!==text){console.error('lib/everkai-additions-data.json is not what build-additions.mjs emits');process.exit(1)}
  console.log(`${rows.length} Fellow and ${familyRows.length} Family addition rows match the generator`);
 }else{
  writeFileSync(dataFile,text);
  const missing=rows.filter(r=>!existsSync(new URL(r.art.replace('crossover/',''),assetDir)));
  const pairings=familyRows.reduce((n,r)=>n+r.recipients.length,0);
  console.log(`${rows.length} Fellow rows written, ${rows.reduce((n,r)=>n+r.artBytes,0)} bytes of stills, ${missing.length} missing art; `
   +`${familyRows.length} Family rows re-derived to ${pairings} blessing pairings`);
 }
}
