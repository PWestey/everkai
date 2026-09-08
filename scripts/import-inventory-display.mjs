import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EXTRA_ITEMS} from '../lib/adventure.mjs';
import {GIFTS} from '../lib/catalog.mjs';
const [path,sha]=process.argv.slice(2),bytes=readFileSync(path);
if(createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('Unreviewed inventory index');
const ids=new Set([...EXTRA_ITEMS,...GIFTS].map(x=>x.id)),source=JSON.parse(bytes),selected=source.items.filter(x=>ids.has(x.id));
writeFileSync(new URL('../lib/inventory-display-data.json',import.meta.url),JSON.stringify(Object.fromEntries(selected.map(x=>[x.id,{name:x.name,rarity:x.rarity,isActivity:x.isActivity,icon:x.icon,sourceSha256:sha}])),null,2)+'\n');
console.log('Imported display fields for',selected.length,'existing item identities');
