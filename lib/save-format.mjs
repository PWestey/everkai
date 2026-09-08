// Transport/structure limits protect JSON admission; they do not limit catch count.
// 32MiB exceeds ordinary localStorage capacity and admits the 10k-catch fixture.
export const MAX_SAVE_BYTES=32*1024*1024;
export const MAX_SAVE_DEPTH=64;
export async function readSaveFile(file){
 if(!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_SAVE_BYTES)throw Error('This file exceeds the 32 MB save import limit. Your current village is unchanged.');
 return file.text();
}
export function parseSaveJSON(raw){
 if(typeof raw!=='string'||raw.length>MAX_SAVE_BYTES||new TextEncoder().encode(raw).length>MAX_SAVE_BYTES)throw Error('Save data exceeds the 32 MB admission limit.');
 let depth=0,quoted=false,escaped=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;else if(c==='{'||c==='['){if(++depth>MAX_SAVE_DEPTH)throw Error('Save data is nested too deeply.');}else if(c==='}'||c===']'){if(--depth<0)throw Error('Malformed save data.');}
 }
 if(quoted||depth)throw Error('Incomplete save data.');return JSON.parse(raw);
}
