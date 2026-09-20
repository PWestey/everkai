import data from './everkai-additions-data.json' with {type:'json'};
/** Everkai additions: Fellows and Family that are NOT from the original APK
 *  (lib/everkai-additions-data.json).
 *
 *  Visibility. They join FELLOWS / FAMILY -- and so the rosters, the Recruit counter and the character
 *  screen -- only when the page is opened with ?crossover=1. Node (tests, sims, imports) has no
 *  `location`, so the catalogue there is exactly the original one.
 *
 *  Saves. fellowById and familyById resolve them whether or not the flag is on, so a village that
 *  recruited or welcomed one with the flag on still loads without it: the character stays owned, keeps
 *  its progress and receipts, and is simply not listed. No save field is added, so SAVE_VERSION does
 *  not move. The two lookups are kept SEPARATE on purpose -- a kind-agnostic `fellowById` would let a
 *  save put a Family addition in `s.fellows` and validVillage would accept it.
 *
 *  Family. A Family record is five integers (lib/game.mjs:99) and every Family system either reads
 *  those or a table keyed by Family id, so an addition needs exactly one authored table of its own:
 *  the blessing recipient list (docs/crossover-family-plan.md 2.4). It lives here rather than in
 *  lib/original-blessing-data.json because tests/family-data-coverage.test.mjs pins that file to the
 *  107 original Family and asserts every key is in FAMILY -- with the flag off (as in Node) adding
 *  crossover keys there fails outright. Crossover Family are capped at the shipped default 36/24
 *  blessing ladder in BOTH modes and never gain an `apkBlessings` record, so nothing stored in a save
 *  is derived from these lists and regrowing one cannot refuse an older save (CLAUDE.md rule 12).
 *  They are also excluded from `fathomBonus` (lib/fathoms.mjs): Fathoms are the original's Wife
 *  Quenching table, and a character absent from that table has no quenching record to port.
 *
 *  Progression. Every per-id table (talent rule, Insight eligibility, skill guide, original growth,
 *  default talent source) is keyed by original ids, and an addition used to BORROW those rows from its
 *  `template` through sourceId(). It no longer does: lib/crossover-abilities.mjs derives them from an
 *  8-row rarity ladder read at the badge the character has climbed to, because borrowing gave a
 *  rarity-N crossover Fellow an SSR anchor's rows. `template` and sourceId() survive as the ART
 *  lineage they always documented -- which render a character was built from -- and no progression path
 *  reads them (docs/crossover-abilities-plan.md 8, decision D4).
 *
 *  Stella. A crossover FELLOW has no constellation page of its own, so it uses the ONE shared shard
 *  track in lib/crossover-stella.mjs (Angie's cost column, her flat x12 since 2026-09-19, percent 0, one pool for the whole
 *  roster). Costumes stay absent and their panel says so.
 *
 *  This module imports only its data, so every lib module can use it without an import cycle. */
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
freeze(data);
export const ADDITIONS_FLAG=data.flag;
// ON by default in the app (the owner asked for them in his normal game, 2026-09-18). The home-screen
// app always opens without a query string, and on iPhone it keeps storage separate from Safari, so a
// link cannot be the switch: a device preference is. ?crossover=0 / =1 and the Settings toggle write it;
// it is never part of the save, so it cannot change what a save holds. Node has no `location`, so tests
// and sims default OFF and still see exactly the original catalogue unless they ask.
export const CROSSOVER_STORE_KEY='everkai-crossover';
const deviceStorage=()=>{try{return typeof localStorage==='undefined'?null:localStorage}catch{return null}};
const inApp=()=>typeof location!=='undefined';
export function crossoverEnabled(search=inApp()?location.search:'',storage=deviceStorage(),byDefault=inApp()){
 const asked=new URLSearchParams(search).get(ADDITIONS_FLAG);
 try{
  if(asked==='1'||asked==='0'){storage?.setItem(CROSSOVER_STORE_KEY,asked);return asked==='1'}
  const stored=storage?.getItem(CROSSOVER_STORE_KEY);
  return stored==='1'?true:stored==='0'?false:byDefault;
 }catch{return asked==='1'||(asked!=='0'&&byDefault)}
}
/** The Settings toggle: remember the choice on this device. The catalogue is fixed at load, so the
 *  caller reloads the page afterwards. */
export function setCrossoverEnabled(on,storage=deviceStorage()){try{storage?.setItem(CROSSOVER_STORE_KEY,on?'1':'0');return true}catch{return false}}
/** A row with no `art` or no `template` would be dropped here, removing a character without a word,
 *  so tests/crossover-family.test.mjs asserts each catalogue length against its raw row count. */
const rows=data.fellows.filter(r=>r.art&&r.template);
const familyRows=(data.family||[]).filter(r=>r.art&&r.template);
const allRows=[...rows,...familyRows];
/** Catalogue records, shaped like FELLOWS entries plus `addition:true` and their provenance. */
export const ADDITION_FELLOWS=Object.freeze(rows.map(r=>Object.freeze({id:r.id,art:r.art,portrait:r.art,specialty:null,name:r.name,title:r.title,occupation:r.occupation,race:r.race,description:r.description,rarity:r.rarity,type:r.type,addition:true,template:r.template,source:r.source})));
/** The same, shaped like FAMILY entries -- which carry no `specialty` and always `type:null`. */
export const ADDITION_FAMILY=Object.freeze(familyRows.map(r=>Object.freeze({id:r.id,art:r.art,portrait:r.art,name:r.name,title:r.title,occupation:r.occupation,race:r.race,description:r.description,rarity:r.rarity,type:r.type??null,addition:true,template:r.template,source:r.source})));
const fellowIndex=new Map(ADDITION_FELLOWS.map(f=>[f.id,f]));
const familyIndex=new Map(ADDITION_FAMILY.map(f=>[f.id,f]));
const byId=new Map([...fellowIndex,...familyIndex]);
/** Kind-agnostic: rarity, art, clips and templates do not care which roster a character is on. */
export const additionById=id=>byId.get(id)||null;
export const isAddition=id=>byId.has(id);
/** Kind-SPECIFIC, for the two catalogue lookups a save is validated against. */
export const additionFellowById=id=>fellowIndex.get(id)||null;
export const additionFamilyById=id=>familyIndex.get(id)||null;
/** 'fellows' | 'family' | null -- what an addition id is, without a `hero_`/`wife_` prefix test. */
export const additionKind=id=>fellowIndex.has(id)?'fellows':familyIndex.has(id)?'family':null;
/** The id to use for a per-id ORIGINAL table: the template for an addition, the id itself otherwise. */
export const sourceId=id=>byId.get(id)?.template??id;
/** THE OWNER'S OWN RANK for an addition (1 = his first pick of that franchise), or null for anything
 *  that is not one. It is a verbatim copy of lib/crossover-roster-data.json's `rank`, carried here by
 *  scripts/crossover/build-additions.mjs, whose `--check` mode fails if the two ever disagree. It is
 *  NOT on the ADDITION_FELLOWS rows: those are catalogue entries, shaped like an original Fellow's,
 *  and nothing in the game may read a rank as if it were a game value. It is a PREFERENCE order, used
 *  only to decide who the Little Helper serves first (lib/helper.mjs stellaOrder). Ranks run per
 *  franchise, so two characters can share one -- the tie is broken by catalogue position there. */
const rankIndex=new Map(allRows.map(r=>[r.id,r.rank]));
export const additionRank=id=>{const r=rankIndex.get(id);return Number.isFinite(r)?r:null};
/** Whom a crossover Family member's blessings support. Authored, see lib/crossover-recipients.mjs. */
const recipients=new Map(familyRows.map(r=>[r.id,Object.freeze([...(r.recipients||[])])]));
const NO_RECIPIENTS=Object.freeze([]);
export const additionRecipients=id=>recipients.get(id)||NO_RECIPIENTS;
/** The rendered idle clip, shaped like a lib/character-idle-data.json row. Base appearance only. */
export function additionClip(person){
 const r=allRows.find(x=>x.id===person?.id);
 return r?.clip&&!person.costumeId?{id:r.id,owner:r.id,costumeId:null,...r.clip}:null;
}
export const ADDITION_ROWS=rows;
export const ADDITION_FAMILY_ROWS=familyRows;
export const ALL_ADDITION_ROWS=allRows;
