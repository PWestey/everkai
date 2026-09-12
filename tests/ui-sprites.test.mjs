import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {giftIcon,GIFT_DISPLAY_ORDER,countryIcon,rarityIcon} from '../lib/ui-sprites.mjs';
const sprites=JSON.parse(readFileSync(new URL('../lib/ui-sprite-data.json',import.meta.url)));
test('exact named UI sprites retain admitted hashes and source identity joins',()=>{assert.equal(Object.keys(sprites).length,33);
 // Companion roster chrome: 6 rarity card grounds, 6 rarity frames, 3 career badges. Familiars have
 // no portrait art at all, so their tiles are built from these instead.
 for(const n of [...Array(6)].flatMap((_,i)=>['Bg_PetList_Rarity_'+(i+1),'Frame_PetList_Rarity_'+(i+1)]))assert.ok(sprites[n],n);
 for(let i=1;i<=3;i++)assert.ok(sprites['Icon_Pet_Career_'+i],'career '+i);
 assert.equal(sprites.Bg_PetList_Rarity_1.width,206);assert.equal(sprites.Icon_Pet_Career_1.width,70);for(const row of Object.values(sprites)){assert.equal(createHash('sha256').update(readFileSync(new URL('../public/assets/'+row.src,import.meta.url))).digest('hex'),row.sha256);assert.equal(row.sourceIndexSha256,'b11445f106363ab64ea6e52d794f77575bbbac7441805ab43cd0318c12a4385f')}assert.deepEqual(GIFT_DISPLAY_ORDER,['gift1','gift2','gift5','gift3','gift4']);assert(giftIcon('gift5').endsWith('Icons--Icon_Intimacy_3.png'));assert(countryIcon('Brave').endsWith('Base--Icon_Hero_Country_3.png'));assert(rarityIcon('SSR').endsWith('Base--Icon_Rarity_SSR_1.png'));assert.equal(countryIcon('unknown'),null);assert.equal(rarityIcon(4),null);assert.equal(giftIcon('fake'),null)});
