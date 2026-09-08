import records from './humanized-static-data.json' with {type:'json'};
const byId=new Map(records.map(r=>[r.id,r]));
const aliases=new Map();for(const r of records)for(const path of r.aliases||[])aliases.set(path,r.art);
export const selectedStaticArt=id=>byId.get(id)||null;
export function applyStaticArt(person){const row=byId.get(person.id);return row?{...person,art:row.art,portrait:row.art}:person}
export function staticPortraitPath(path){if(!path)return null;const clean=path.replace(/^\.\//,'').replace(/^\//,'');if(!clean.startsWith('assets/'))return './'+clean;const asset=clean.slice(7);return './assets/'+(aliases.get(asset)||asset)}
