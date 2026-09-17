// Generates lib/everkai-additions-data.json from lib/crossover-roster-data.json plus the build
// manifests of the owner's private asset corpus, and installs each character's still into
// public/assets/crossover/.
//
//   CROSSOVER_BUILD=<corpus>/full node scripts/crossover/build-additions.mjs        # install + write
//   node scripts/crossover/build-additions.mjs --check                             # data-only check
//
// Only the 133 `kind:"fellows"` rows are written here. The 30 `kind:"family"` rows of
// docs/crossover-family-split.md need the Family additions layer (their own catalogue records,
// blessings, dating and Fathom tables), which is a separate slice; their arc stages carry
// `kind:"family"` already and will resolve when it lands.
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

export const NEW_RARITY='N';
const KEYS=['id','name','title','occupation','race','rarity','type','description','template','art','clip','artSha256','artBytes','source'];
const assetDir=new URL('../../public/assets/crossover/',import.meta.url);
const dataFile=new URL('../../lib/everkai-additions-data.json',import.meta.url);

export function buildRows({build=process.env.CROSSOVER_BUILD,install=false}={}){
 const rows=[];
 for(const c of roster.characters){
  if(c.kind!=='fellows')continue;
  const already=shipped.fellows.find(f=>f.id===c.id);
  if(already){rows.push(already);continue}                       // shipped prototypes stay byte-identical
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
   rarity:NEW_RARITY,type:c.type,description:c.description,template,
   art:'crossover/'+manifest.still.file,clip:null,artSha256:sha,artBytes:art.length,
   source:{game:manifest.game,assetId:manifest.assetId,bundle:manifest.bundle,bundleSha256:manifest.bundleSha256,
    prefab:manifest.root,clip:manifest.clip,pipeline:'scripts/crossover/build-character.py'}});
 }
 for(const r of rows){
  const keys=Object.keys(r).sort();
  if(keys.join()!==[...KEYS].sort().join())throw new Error(`${r.id}: keys ${keys.join()}`);
 }
 return rows;
}

export const dataFileText=rows=>JSON.stringify({policy:shipped.policy,flag:shipped.flag,fellows:rows},null,1)+'\n';

if(process.argv[1]===new URL(import.meta.url).pathname){
 const check=process.argv.includes('--check');
 const rows=buildRows({install:!check});
 const text=dataFileText(rows);
 if(check){
  if(readFileSync(dataFile,'utf8')!==text){console.error('lib/everkai-additions-data.json is not what build-additions.mjs emits');process.exit(1)}
  console.log(`${rows.length} addition rows match the generator`);
 }else{
  writeFileSync(dataFile,text);
  const missing=rows.filter(r=>!existsSync(new URL(r.art.replace('crossover/',''),assetDir)));
  console.log(`${rows.length} Fellow rows written, ${rows.reduce((n,r)=>n+r.artBytes,0)} bytes of stills, ${missing.length} missing art`);
 }
}
