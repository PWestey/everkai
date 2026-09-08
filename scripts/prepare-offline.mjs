import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/client/',import.meta.url);let files=[];
async function walk(path=''){for(const f of await readdir(new URL(path,root),{withFileTypes:true})){if(f.isDirectory())await walk(path+f.name+'/');else if(!['sw.js','offline-files.js'].includes(f.name))files.push(path+f.name)}}
await walk();files.sort();const hash=createHash('sha256');for(const f of files)hash.update(await readFile(new URL(f,root)));hash.update(await readFile(new URL('sw.js',root)));const version=hash.digest('hex').slice(0,16);
await writeFile(new URL('offline-files.js',root),`self.OFFLINE_VERSION=${JSON.stringify(version)};self.OFFLINE_FILES=${JSON.stringify(files)};\n`);console.log(`Offline bundle: ${files.length} files, ${version}`);

// Embed the manifest so every release changes the worker itself, even for older installed clients.
const manifest=await readFile(new URL('offline-files.js',root),'utf8');const worker=await readFile(new URL('sw.js',root),'utf8');await writeFile(new URL('sw.js',root),worker.replace("importScripts('./offline-files.js','./media-range.js');",manifest+"importScripts('./media-range.js');"));
