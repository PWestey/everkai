// Packages original Spine 4.1 character models for live playback (the Spine pilot).
//
//   node scripts/package-spine-model.mjs [--format webp90s] [--measure] <model>...
//
// A model is a handoff model id such as hero_111 or wife_19c1. Everything about it is resolved from
// the humanized active-model map (--map, default below), which records, per model, the exact source
// join to Everkai's identity (owner + costume), the skeleton and the atlas Everkai's shipped renders
// were made from (the humanization handoff's edited atlas where one exists), their sha256, and the full
// humanization recipe. Every hash is re-checked here and the recipe is compared with the live recipe
// file, so a moved or edited source fails loudly instead of packaging something different.
//
// Output, per model, in public/assets/spine/<model>/ (streamed, never precached -- see
// scripts/offline-manifest.mjs): the unchanged .skel, the atlas with its page names rewritten to the
// encoded pages, the encoded pages, and the background Everkai composes behind the figure (if any).
// lib/spine-pilot-data.json gets one row keyed like lib/character-idle-data.json (costume id, else
// owner id) with sha256/bytes of every file, the animation list, the humanization recipe Everkai needs
// at runtime, and the texture memory the pages cost on the GPU.
//
// --measure encodes every page as lossless PNG, lossless WebP, and lossy WebP at q90/q80/q70 (premultiplied) and q90/q80 (straight alpha), decodes
// each back and prints bytes plus the colour error against the source, without writing anything.
//
// Pages are premultiplied-alpha (the atlases say pma:true, and it is checked per pixel).
//
// Image work uses sharp, which this repo has only transitively (wrangler -> miniflare -> sharp); it is
// resolved from there rather than added as a dependency because only this offline tool needs it.
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {dirname,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AtlasAttachmentLoader,SkeletonBinary,TextureAtlas} from '@esotericsoftware/spine-webgl';
import {BOOT_FIXES,transformQuad} from './spine-boot-fixes.mjs';

const app=join(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),flag=name=>{const i=args.indexOf(name);if(i<0)return null;args.splice(i,1);return true};
const option=(name,fallback)=>{const i=args.indexOf(name);if(i<0)return fallback;const v=args[i+1];args.splice(i,2);return v};
const measureOnly=flag('--measure');
const format=option('--format','webp90s'),mapPath=option('--map',join(homedir(),'Documents/Codex/2026-09-08/isekai-source-research/outputs/humanized-active-model-map.json'));
const FORMATS={png:{ext:'png'},webpll:{ext:'webp'},webp90:{ext:'webp',quality:90},webp80:{ext:'webp',quality:80},webp70:{ext:'webp',quality:70},webp90s:{ext:'webp',quality:90,straight:true},webp80s:{ext:'webp',quality:80,straight:true}};
if(!FORMATS[format])throw Error('Unknown --format '+format+'; one of '+Object.keys(FORMATS).join(', '));
if(!args.length)throw Error('Name at least one model, e.g. hero_111');

const req=createRequire(import.meta.url);
function loadSharp(){
 try{return req('sharp')}catch{}
 const wrangler=createRequire(req.resolve('wrangler')),miniflare=createRequire(wrangler.resolve('miniflare'));
 return miniflare('sharp');
}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);

/** Walks an atlas the way spine-core 4.1 parses it: the first line after a blank line is a page name.
 *  Renames each page to its encoded file and, for straight-alpha pages, sets pma:false. */
function rewriteAtlas(text,pageName,straight){
 const out=[],pages=[];let inPage=false;
 for(const line of text.split(/\r?\n/)){
  const trimmed=line.trim();
  if(!trimmed){inPage=false;out.push(line);continue}
  if(!inPage&&!trimmed.includes(':')){inPage=true;pages.push(trimmed);out.push(pageName(trimmed));continue}
  const m=/^(\s*)pma:/.exec(line);
  out.push(m&&straight?m[1]+'pma:false':line);
 }
 return {text:out.join('\n'),pages};
}

// Lossy WebP of PREMULTIPLIED pixels (webp90 etc.) is measurably wrong: the encoder is free to invent
// colour under near-transparent pixels, which premultiplied blending then ADDS, drawing a light halo
// around every outline. The *s formats store straight alpha instead (colour divided by alpha before
// encoding, atlas pma:false); the component asks WebGL to premultiply on upload, so blending and
// filtering stay premultiplied on the GPU.
const unpremultiply=raw=>{const d=Buffer.from(raw.data);for(let i=0;i<d.length;i+=4){const a=d[i+3];for(let c=0;c<3;c++)d[i+c]=a?Math.min(255,Math.round(d[i+c]*255/a)):0}return {...raw,data:d}};
const premultiply=data=>{for(let i=0;i<data.length;i+=4){const a=data[i+3];for(let c=0;c<3;c++)data[i+c]=Math.round(data[i+c]*a/255)}return data};
async function encode(sharp,raw,kind){
 if(FORMATS[kind].straight)raw=unpremultiply(raw);
 const image=sharp(raw.data,{raw:{width:raw.width,height:raw.height,channels:4}});
 const f=FORMATS[kind];
 if(f.ext==='png')return image.png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
 return f.quality?image.webp({quality:f.quality,alphaQuality:100,effort:6,smartSubsample:true}).toBuffer():image.webp({lossless:true,effort:6}).toBuffer();
}
/** Mean and max absolute channel error of an encoded page against its source, and how many pixels
 *  break the premultiplied invariant (a colour channel brighter than alpha) after decoding. */
async function fidelity(sharp,raw,bytes,kind){
 let {data}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(FORMATS[kind].straight)data=premultiply(data);
 let sum=0,max=0,n=0,pmaBroken=0;
 for(let i=0;i<data.length;i+=4){
  if(raw.data[i+3]===0&&data[i+3]===0)continue;
  for(let c=0;c<4;c++){const e=Math.abs(data[i+c]-raw.data[i+c]);sum+=e;if(e>max)max=e}
  n+=4;if(Math.max(data[i],data[i+1],data[i+2])>data[i+3]+2)pmaBroken++;
 }
 return {meanError:+(sum/Math.max(1,n)).toFixed(3),maxError:max,pmaBroken};
}

function parseSkeleton(atlasText,skelBytes){
 const atlas=new TextureAtlas(atlasText);
 // Reading a skeleton sizes mesh UVs from each page's image; no pixels are needed for that.
 for(const page of atlas.pages)page.setTexture({getImage:()=>({width:page.width,height:page.height}),setFilters(){},setWraps(){},dispose(){}});
 const data=new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(skelBytes);
 return {atlas,data};
}

const map=JSON.parse(readFileSync(mapPath,'utf8')),mapSha=sha256(readFileSync(mapPath));
const sharp=loadSharp();
const dataPath=join(app,'lib/spine-pilot-data.json');
const table=existsSync(dataPath)?JSON.parse(readFileSync(dataPath,'utf8')):{note:'',models:{}};
table.note='Generated by scripts/package-spine-model.mjs. Live Spine playback pilot: models listed here play their original Spine 4.1 animation instead of the idle clip when the page is opened with ?spine=1. Files live in public/assets/spine/<model>/ and stream (never precached).';

for(const model of args){
 const rows=map.rows.filter(r=>r.modelId===model);
 if(rows.length!==1)throw Error(model+': expected exactly one map row, found '+rows.length);
 const row=rows[0];
 if(row.status!=='exact-source-field'||row.activeJoins.length!==1)throw Error(model+': no single exact identity join ('+row.status+')');
 const join0=row.activeJoins[0],owner=join0.identity,costumeId=join0.costumeId||null;
 const skelBytes=readFileSync(row.paths.skeleton),atlasBytes=readFileSync(row.paths.selectedAtlas);
 if(sha256(skelBytes)!==row.fileHashes.skeleton)throw Error(model+': skeleton hash differs from the map');
 if(sha256(atlasBytes)!==row.fileHashes.selectedAtlas)throw Error(model+': atlas hash differs from the map');
 const recipes=JSON.parse(readFileSync(row.paths.recipeFile,'utf8')),live=recipes[model];
 if(canonical(live??null)!==canonical(row.recipe??null))throw Error(model+': live recipe differs from the map row');
 const recipe=row.recipe||{hideSlots:[]};

 const atlasDir=dirname(row.paths.selectedAtlas),ext=FORMATS[format].ext;
 const {text:atlasText,pages:pageNames}=rewriteAtlas(atlasBytes.toString('utf8'),name=>name.replace(/\.png$/i,'.'+ext),!!FORMATS[format].straight);
 const {data:skeletonData,atlas}=parseSkeleton(atlasBytes.toString('utf8'),skelBytes);

 // The recipe must fit this skeleton: every slot it hides or replaces exists, and every replacement
 // region exists in the selected atlas.
 const missing=[...(recipe.hideSlots||[]).filter(s=>!skeletonData.findSlot(s)),...(recipe.replacements||[]).flatMap(r=>[skeletonData.findSlot(r.slot)?null:r.slot,atlas.findRegion(r.region)?null:r.region]).filter(Boolean)];
 if(missing.length)throw Error(model+': recipe names what the skeleton/atlas lacks: '+missing.join(', '));
 const fixes=BOOT_FIXES[model]||[];
 const replacements=(recipe.replacements||[]).map((r,i)=>fixes[i]?{...r,vertices:transformQuad(r.vertices,fixes[i]).map(v=>+v.toFixed(3)),sourceVertices:r.vertices,fix:fixes[i]}:r);

 const animations=skeletonData.animations.map(a=>({name:a.name,duration:+a.duration.toFixed(4)}));
 const idle=(animations.find(a=>/^idle$/i.test(a.name))||animations[0]).name;

 const pages=[];
 const outDir=join(app,'public/assets/spine',model);
 if(!measureOnly){rmSync(outDir,{recursive:true,force:true});mkdirSync(outDir,{recursive:true})}
 for(const name of pageNames){
  const source=join(atlasDir,name),decoded=await sharp(readFileSync(source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let raw={data:decoded.data,width:decoded.info.width,height:decoded.info.height};
  let notPma=0;for(let i=0;i<raw.data.length;i+=4)if(Math.max(raw.data[i],raw.data[i+1],raw.data[i+2])>raw.data[i+3])notPma++;
  if(measureOnly){
   const results={};
   for(const kind of Object.keys(FORMATS)){const bytes=await encode(sharp,raw,kind);results[kind]={bytes:bytes.length,...await fidelity(sharp,raw,bytes,kind)}}
   console.log(JSON.stringify({model,page:name,width:raw.width,height:raw.height,sourceBytes:readFileSync(source).length,notPremultipliedPixels:notPma,results}));
   continue;
  }
  const bytes=await encode(sharp,raw,format),file=name.replace(/\.png$/i,'.'+ext);
  writeFileSync(join(outDir,file),bytes);
  pages.push({file,width:raw.width,height:raw.height,sha256:sha256(bytes),bytes:bytes.length,sourceSha256:sha256(readFileSync(source)),notPremultipliedPixels:notPma,...await fidelity(sharp,raw,bytes,format)});
 }
 if(measureOnly)continue;

 const skelFile=basename(row.paths.skeleton),atlasFile=basename(row.paths.selectedAtlas);
 writeFileSync(join(outDir,skelFile),skelBytes);writeFileSync(join(outDir,atlasFile),atlasText);

 // The background Everkai composes behind a lone figure (Family profile room, or a Fellow's reused
 // scene). Costume cards and plain Fellows have none: their scenery, if any, is inside the skeleton.
 const bgRel=row.familyPresentation?.background||row.fellowBackground?.image||null;
 let background=null;
 if(bgRel){
  const bgSource=join(dirname(row.paths.recipeFile),bgRel),bytes=await sharp(readFileSync(bgSource)).webp({quality:85,effort:6}).toBuffer(),meta=await sharp(bytes).metadata();
  writeFileSync(join(outDir,'background.webp'),bytes);
  background={file:'background.webp',width:meta.width,height:meta.height,sha256:sha256(bytes),bytes:bytes.length,source:bgRel,sourceSha256:sha256(readFileSync(bgSource))};
 }
 const file=(name,bytes)=>({file:name,sha256:sha256(bytes),bytes:bytes.length});
 const files=[file(skelFile,skelBytes),file(atlasFile,Buffer.from(atlasText)),...pages,...(background?[background]:[])];
 const key=costumeId||owner;
 table.models[key]={
  model,owner,costumeId,base:'spine/'+model+'/',
  framing:costumeId&&!background?'card':'figure',
  idle,animations,
  skeleton:file(skelFile,skelBytes),atlas:file(atlasFile,Buffer.from(atlasText)),pages,background,
  humanization:{status:recipe.status,hideSlots:recipe.hideSlots||[],replacements},
  format,premultiplied:!FORMATS[format].straight,
  textureMemoryBytes:pages.reduce((s,p)=>s+p.width*p.height*4,0),
  totalBytes:files.reduce((s,f)=>s+f.bytes,0),
  source:{map:mapSha,skeleton:row.fileHashes.skeleton,atlas:row.fileHashes.selectedAtlas,recipeFile:row.fileHashes.recipeFile,skeletonVersion:skeletonData.version}
 };
 console.log(model,'->',key,idle,animations.map(a=>a.name).join('/'),'pages',pages.map(p=>p.width+'x'+p.height+' '+p.bytes).join(', '),'total',table.models[key].totalBytes);
}
if(!measureOnly){
 table.models=Object.fromEntries(Object.entries(table.models).sort(([a],[b])=>a.localeCompare(b)));
 writeFileSync(dataPath,JSON.stringify(table,null,1)+'\n');
}
