// Generates lib/everkai-additions-data.json from lib/crossover-roster-data.json plus the build
// manifests of the owner's private asset corpus, and installs each character's still into
// public/assets/crossover/.
//
//   CROSSOVER_BUILD=<corpus>/full node scripts/crossover/build-additions.mjs        # install + write
//   CROSSOVER_VILLAGE=<corpus>/village node scripts/crossover/build-additions.mjs   # re-install media
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
//
// MEDIA is a separate input from PROSE, and `CROSSOVER_VILLAGE` is the shipping step (docs/
// crossover-plan.md order of work 10). The village build re-renders all 163 characters over the game's
// own painted Isekai backdrops, so it replaces `art`, `artBytes`, `artSha256` and `clip` on EVERY row
// -- Fellow and Family alike -- against the build's own manifest, and copies both files into
// public/assets/crossover/. It deliberately does NOT touch `source`: a village manifest records what
// was rendered and from which backdrop, not which asset bundle the model came from, so the provenance
// stays the corpus's (and `source.clip`, the animation name, is asserted to agree rather than rewritten).
// Without the variable every row carries its shipped measurements through unchanged, which is what
// makes `--check` a data-only check that needs no corpus.
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import roster from '../../lib/crossover-roster-data.json' with {type:'json'};
import shipped from '../../lib/everkai-additions-data.json' with {type:'json'};
import {RARITY_N_ANCHORS} from './pick-template.mjs';
import {familyRecipientMap} from '../../lib/crossover-recipients.mjs';

export const NEW_RARITY='N';
/** Rarity, type and template are DERIVED on every row, generated or carried through, exactly as `rank`
 *  is: rarity is N for every crossover character and the template is its type's rarity-N anchor, so
 *  leaving a shipped row's own values in place is how the two prototypes kept a pre-decision rarity
 *  (Spider-Man SSR, Vader UR) and how Vader kept the UR Brave anchor hero_113 -- which in turn froze
 *  his type, because retyping him would have left type and template disagreeing. Deriving all three
 *  here means a type change in lib/crossover-roster-data.json is enough to move a character. */
const derived=c=>({rarity:NEW_RARITY,type:c.type,template:anchor(c)});
const anchor=c=>{const t=RARITY_N_ANCHORS[c.type];if(!t)throw new Error(`${c.id}: no rarity-N anchor for type ${c.type}`);return t};
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

/** Read one file of a build, check it against the manifest entry that describes it, and install it.
 *  The hash and the byte count are BOTH checked because they answer different questions: the hash says
 *  the pixels are the ones the build measured, the length says the file on disk is not truncated. */
const installFile=(dir,entry,id,magic,install)=>{
 const bytes=readFileSync(dir+entry.file);
 if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error(`${id}: ${entry.file} hash does not match its manifest`);
 if(bytes.length!==entry.bytes)throw new Error(`${id}: ${entry.file} byte count does not match its manifest`);
 if(magic&&bytes.subarray(8,12).toString()!==magic)throw new Error(`${id}: ${entry.file} is not a ${magic}`);
 if(install)copyFileSync(dir+entry.file,new URL(entry.file,assetDir));
 return bytes;
};
/** The clip record the app reads (lib/everkai-additions.mjs additionClip), in ONE key order, taken
 *  from the manifest rather than from whatever an earlier build happened to write. */
const clipRow=m=>({src:'crossover/'+m.file,bytes:m.bytes,sha256:m.sha256,width:m.width,height:m.height,
 fps:m.fps,frames:m.frames,encodedDuration:m.encodedDuration});
/** Re-measure and install one row's media from a village build; identity when no build is given. */
export function withVillageMedia(row,{build=process.env.CROSSOVER_VILLAGE,install=false}={}){
 if(!build)return row;
 const dir=`${build}/${row.id}/`;
 const m=JSON.parse(readFileSync(dir+'manifest.json','utf8'));
 if(m.id!==row.id)throw new Error(`${row.id}: manifest says ${m.id}`);
 // The build states whether it passed its own four checks. Installing a render it failed would put a
 // frozen or torn clip on the phone with nothing downstream able to tell.
 if(!m.ok)throw new Error(`${row.id}: the village build did not pass its own checks`);
 // The animation is provenance, not media: if the village rendered a different clip than the row
 // records, `source` is now wrong and carrying it through silently would be the lie.
 if(m.clip!==row.source.clip)throw new Error(`${row.id}: village rendered ${m.clip}, the row records ${row.source.clip}`);
 installFile(dir,m.still,row.id,'WEBP',install);
 installFile(dir,m.clipFile,row.id,null,install);
 return {...row,art:'crossover/'+m.still.file,clip:clipRow(m.clipFile),artSha256:m.still.sha256,artBytes:m.still.bytes};
}

export function buildRows({build=process.env.CROSSOVER_BUILD,install=false,village=process.env.CROSSOVER_VILLAGE}={}){
 const rows=[];
 for(const c of roster.characters){
  if(c.kind!=='fellows')continue;
  const already=shipped.fellows.find(f=>f.id===c.id);
  // A row already in the file keeps its own measured media bytes and prose; `rank` plus the three
  // derived fields are re-mirrored from the roster, which is where they came from (it is a verbatim
  // mirror and the derivation is pure, so this is idempotent).
  if(already){rows.push(withVillageMedia({...already,rank:c.rank,...derived(c)},{build:village,install}));continue}
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
  rows.push(withVillageMedia({id:c.id,name:c.character,title:c.title,occupation:c.occupation,race:c.race,
   ...derived(c),description:c.description,rank:c.rank,
   art:'crossover/'+manifest.still.file,clip:null,artSha256:sha,artBytes:art.length,
   source:{game:manifest.game,assetId:manifest.assetId,bundle:manifest.bundle,bundleSha256:manifest.bundleSha256,
    prefab:manifest.root,clip:manifest.clip,pipeline:'scripts/crossover/build-character.py'}},{build:village,install}));
 }
 return rows.map(r=>inOrder(r,KEYS));
}

/** The 30 Family rows, carried through with their prose and measured media untouched, their `rank`
 *  re-mirrored from the roster and their `recipients` RE-DERIVED from `fellowRows` by the one rule in
 *  lib/crossover-recipients.mjs. Nothing stored in a save is derived from a recipient list (an addition
 *  never gains an `apkBlessings` record), so regrowing them cannot refuse an older save -- CLAUDE.md
 *  rule 12, which is why these lists are allowed to move when Fellow rows land. */
export function buildFamilyRows(fellowRows,{village=process.env.CROSSOVER_VILLAGE,install=false}={}){
 const ranked=new Map(roster.characters.map(c=>[c.id,c]));
 const ranks=(shipped.family||[]).map(r=>{
  const c=ranked.get(r.id);
  if(!c)throw new Error(`${r.id} is not in lib/crossover-roster-data.json`);
  if(c.kind!=='family')throw new Error(`${r.id} is a ${c.kind} row in the roster, not family`);
  // Prose, blessings and provenance are authored and untouched; only the MEDIA is re-measured, and
  // only when a village build is given. The 30 Family already declared a clip before this step, so
  // for them the village install is a replacement rather than a first arrival.
  return withVillageMedia({...r,rank:c.rank},{build:village,install});
 });
 // Derived from the WHOLE Family list at once: a member's band of the rank order is decided by her
 // place among the Family of her franchise, so the lists are only even taken together.
 const lists=familyRecipientMap(ranks,fellowRows);
 return ranks.map(r=>inOrder({...r,recipients:lists[r.id]},FAMILY_KEYS));
}

export const dataFileText=(rows,familyRows=buildFamilyRows(rows))=>
 JSON.stringify({policy:shipped.policy,flag:shipped.flag,fellows:rows,family:familyRows},null,1)+'\n';

if(process.argv[1]===new URL(import.meta.url).pathname){
 const check=process.argv.includes('--check');
 // --check must read NO build directory: it is the guard that runs in CI, where the owner's private
 // corpus is not present. Blanking both build variables is what makes that true rather than hoped.
 const rows=buildRows(check?{build:undefined,village:undefined}:{install:true});
 const familyRows=buildFamilyRows(rows,check?{village:undefined}:{install:true});
 const text=dataFileText(rows,familyRows);
 if(check){
  if(readFileSync(dataFile,'utf8')!==text){console.error('lib/everkai-additions-data.json is not what build-additions.mjs emits');process.exit(1)}
  console.log(`${rows.length} Fellow and ${familyRows.length} Family addition rows match the generator`);
 }else{
  writeFileSync(dataFile,text);
  const all=[...rows,...familyRows];
  const missing=all.filter(r=>!existsSync(new URL(r.art.replace('crossover/',''),assetDir))
   ||(r.clip&&!existsSync(new URL(r.clip.src.replace('crossover/',''),assetDir))));
  const pairings=familyRows.reduce((n,r)=>n+r.recipients.length,0);
  const stills=all.reduce((n,r)=>n+r.artBytes,0),clipBytes=all.reduce((n,r)=>n+(r.clip?.bytes||0),0);
  console.log(`${rows.length} Fellow and ${familyRows.length} Family rows written; `
   +`${stills} bytes of stills + ${clipBytes} bytes of idle clips = ${((stills+clipBytes)/1048576).toFixed(1)} MiB of streamed media, `
   +`${missing.length} missing; ${pairings} blessing pairings re-derived`);
 }
}
