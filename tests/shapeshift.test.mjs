import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,valid,decode} from '../lib/game.mjs';
import {powerParts} from '../lib/adventure.mjs';
import {FELLOWS} from '../lib/catalog.mjs';
import {reaches} from '../lib/hero-scope.mjs';
import {OUTFITS,POWERED,SHAPESHIFT_TOTAL_BP,CHIP_A_DAY,shapeshiftPercentBp,shapeshiftRows,
        shapeshiftDaily,validShapeshift,outfitById} from '../lib/shapeshift.mjs';
import {legacyStart} from './progression-helpers.mjs';

const NOW=1767225600000,DAY=86400000;
const data=JSON.parse(readFileSync(new URL('../lib/shapeshift-data.json',import.meta.url),'utf8'));
const run=(s,a,now,t)=>{const r=act(s,a,now,t);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state;};

test('the table is the original’s, and the total reproduces the audit',()=>{
 assert.equal(OUTFITS.length,50,'Avatar.json links 50 outfits');
 assert.equal(POWERED.length,5,'five carry a clothesSkill');
 // docs/power-parity-audit.md reached 172,000 bp from this table by a different route.
 assert.equal(SHAPESHIFT_TOTAL_BP,172000);
 assert.equal(POWERED.reduce((n,o)=>n+o.bpInitial+o.bpPerLevel*(o.skillMaxLevel-1),0),172000,
  'the rows must still sum to the figure the audit reached independently');
 assert.equal(data.bucket,'percent');assert.equal(data.scope,'all');
 // Rule 6: the one that cannot be levelled is the one whose skill stops at 1. Two columns, one rule.
 const fixed=POWERED.filter(o=>!o.canLevel);
 assert.equal(fixed.length,1);
 assert.equal(fixed[0].clothes,'ShapeshiftClothes07');
 assert.equal(fixed[0].skillMaxLevel,1);
 for(const o of POWERED)assert.equal(o.skillMaxLevel>1,o.canLevel,`${o.clothes}: isUpdate and maxUpgradeLevel disagree`);
});

test('it reaches EVERY Fellow, which is the reason it was built',()=>{
 // The skill is targetCondition {conditionType:'all'}; hero-scope resolves that without a hero row,
 // which is what makes it the only source the 133 crossover Fellows receive in full.
 assert.ok(FELLOWS.every(f=>reaches(['all'],f.id)),'`all` must reach every catalogue Fellow');
 assert.ok(reaches(['all'],'xover_msf_spiderman'),'and a crossover Fellow with no Hero.json row');
 assert.equal(reaches(['rare',3],'xover_msf_spiderman'),false,'a rare scope still must not');
});

test('an unlocked outfit pays every Fellow the same basis points',()=>{
 let s=legacyStart(NOW);
 const before=Object.keys(s.fellows).map(id=>powerParts(s,id).percent.shapeshift);
 assert.deepEqual([...new Set(before)],[0],'nothing before it is tailored');
 s=run(s,'shapeshiftClaim',NOW,'shap15');
 s=run(s,'shapeshiftUnlock',NOW,'shap15');
 const after=Object.keys(s.fellows).map(id=>powerParts(s,id).percent.shapeshift);
 assert.deepEqual([...new Set(after)],[4000],'every Fellow gets the same 4,000 bp, with no per-Fellow join');
 assert.equal(shapeshiftPercentBp(s),4000);
});

test('levelling follows the original’s ladder to its own cap',()=>{
 let s=legacyStart(NOW),now=NOW;
 s=run(s,'shapeshiftClaim',now,'shap15');s=run(s,'shapeshiftUnlock',now,'shap15');
 for(let i=0;i<19;i++){now+=DAY;s=run(s,'shapeshiftClaim',now,'shap15');s=run(s,'shapeshiftLevel',now,'shap15');}
 assert.equal(s.shapeshift.levels.shap15,20);
 assert.equal(shapeshiftPercentBp(s),42000,'4,000 + 2,000 x 19');
 const capped=act(s,'shapeshiftLevel',now,'shap15');
 assert.equal(capped.error,'Already at its best.');
 assert.ok(valid(s));
});

test('the outfit the original will not level cannot be levelled here either',()=>{
 let s=legacyStart(NOW);
 s=run(s,'shapeshiftClaim',NOW,'shap07');s=run(s,'shapeshiftUnlock',NOW,'shap07');
 s=run(s,'shapeshiftClaim',NOW+DAY,'shap07');
 const r=act(s,'shapeshiftLevel',NOW+DAY,'shap07');
 assert.equal(r.error,'This outfit has no further work in it.');
 assert.equal(shapeshiftPercentBp(s),4000,'it stays at its initial value forever');
});

test('the chip is per-outfit, and the daily grant is the local number',()=>{
 assert.equal(CHIP_A_DAY,1);
 let s=legacyStart(NOW);
 s=run(s,'shapeshiftClaim',NOW,'shap15');
 assert.equal(act(s,'shapeshiftClaim',NOW,'shap22').error,'Today’s tailoring is already done. Come back tomorrow.');
 // A shap15 chip cannot tailor shap22 -- the original gives each outfit its own item.
 assert.equal(act(s,'shapeshiftUnlock',NOW,'shap22').error,'Needs 1 scrap for this outfit.');
 assert.equal(shapeshiftDaily(s,NOW).left,0);
 assert.equal(shapeshiftDaily(s,NOW+DAY).left,1);
 assert.equal(act(s,'shapeshiftUnlock',NOW,'nope').error,'No such outfit.');
});

test('the ledger refuses a save that granted itself chips',()=>{
 let s=legacyStart(NOW);
 s=run(s,'shapeshiftClaim',NOW,'shap15');
 assert.ok(validShapeshift(s));
 const forged={...s,shapeshift:{...s.shapeshift,chips:{...s.shapeshift.chips,Item_ClothesChip_ShapeshiftClothes15:99}}};
 assert.equal(validShapeshift(forged),false,'held + spent must equal what was granted');
 const overCap={...s,shapeshift:{...s.shapeshift,levels:{shap15:21},granted:21}};
 assert.equal(validShapeshift(overCap),false,'past the outfit’s own MaxLevel');
 const unlevelable={...s,shapeshift:{...s.shapeshift,levels:{shap07:2},granted:3}};
 assert.equal(validShapeshift(unlevelable),false,'shap07 has no isUpdate');
 assert.equal(validShapeshift({}),true,'an absent subtree is a valid old save');
});

test('a save written before this feature still decodes',()=>{
 const s=legacyStart(NOW);
 const old={...s};delete old.shapeshift;
 const back=decode(JSON.stringify(old));
 assert.ok(back,'decode must accept a save with no shapeshift subtree');
 assert.equal(back.shapeshift,undefined);
 assert.equal(shapeshiftPercentBp(back),0,'and it contributes nothing');
});

test('the screen rows describe what the player can do next',()=>{
 let s=legacyStart(NOW);
 const rows=shapeshiftRows(s);
 assert.equal(rows.length,50);
 assert.equal(rows.filter(r=>r.capBp).length,5);
 const r0=rows.find(r=>r.avatar==='shap15');
 assert.deepEqual([r0.owned,r0.level,r0.bp,r0.capBp],[false,0,0,42000]);
 assert.equal(r0.next.verb,'Unlock');assert.equal(r0.next.affordable,false);
 s=run(s,'shapeshiftClaim',NOW,'shap15');
 assert.equal(shapeshiftRows(s).find(r=>r.avatar==='shap15').next.affordable,true);
 assert.equal(outfitById('shap15').clothes,'ShapeshiftClothes15');
 assert.equal(outfitById('nope'),null);
});
