import data from './familiar-portrait-data.json' with {type:'json'};
// Familiar portrait art, extracted by scripts/import-familiar-portraits.py from the FairyGUI package
// in `assets/Android/ui/pet/`. Everkai shipped without any: every familiar surface fell back to a
// rarity-framed card with the name printed on it, and `scripts/import-ui-sprites.py` recorded the
// reason as "Companions have no portrait art of any kind" -- true of the extracted set, not the APK.
//
//   head  128x128   the roster card, the Compendium grid, the encounter plaque
//   half  300x350   the detail screen and the locked preview
//
// 66 of the 71 familiars have both. The five without are Everkai's own extra (`Pet_8041505`) and four
// `90xxxxx` ids that are not in the original's own `Pet.json` either, so there is nothing to extract
// for them; they keep the rarity card, which is why the card fallback stays in the components.
const base=id=>String(id||'').replace(/^Pet_/,'');
// The index is keyed by the sprite's own name (`11111A`); the files are lowercased. Look up either.
const INDEX={head:{},half:{}};
for(const kind of ['head','half'])for(const [k,v] of Object.entries(data[kind]||{}))INDEX[kind][k.toUpperCase()]=v;
const file=(kind,id)=>{const n=INDEX[kind][base(id).toUpperCase()];return n?`./assets/familiars/${n}`:null;};
/** 128x128 head icon, or null when this familiar has no extracted art. */
export const familiarHead=id=>file('head',id);
/** 300x350 half-body portrait, or null. */
export const familiarHalf=id=>file('half',id);
/** The evolved forms the Forms section lists: `A` after the first evolution, `AA` after the second. */
export const familiarHeadForm=(id,form='')=>file('head',base(id)+form);
export const familiarHalfForm=(id,form='')=>file('half',base(id)+form);
export const FAMILIAR_PORTRAITS=data;
