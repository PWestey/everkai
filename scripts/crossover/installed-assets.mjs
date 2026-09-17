// Which crossover renders are actually in public/assets today.
//
// Why this exists. lib/art-bounds-data.json is generated from FELLOWS and FAMILY, which are FLAG-GATED
// (lib/catalog.mjs), so in Node -- where both the generator and tests/art-framing.test.mjs run -- no
// crossover path was ever measured. artBounds() therefore returned null for every crossover render and
// no framing transform was applied to any of them, and art-framing.test.mjs could not catch it because
// the paths it checks never mention them (docs/crossover-family-plan.md D7).
//
// The set is computed from the additions data INTERSECTED with what is on disk, because the media lands
// in batches: 30 crossover Family rows carry their art path and hashes, and only three of them ship
// their files so far (the full install is a later step of docs/crossover-plan.md). Both the generator
// and the test read this one function, so they stay in lockstep as the rest of the media arrives --
// nothing has to be edited when it does.
import {statSync} from 'node:fs';
import {ALL_ADDITION_ROWS} from '../../lib/everkai-additions.mjs';

const ASSETS=new URL('../../public/assets/',import.meta.url);
// An installed asset is a FILE. This used to be existsSync, and the empty string resolves to the
// assets directory -- which always exists -- so `installedAsset(r.clip?.src||'')` reported the 131
// Fellow rows whose `clip` is null as having an installed clip. The pending count was right by
// accident; it is right on purpose now.
export const installedAsset=path=>{
 if(!path)return false;
 try{return statSync(new URL(path,ASSETS)).isFile()}catch{return false}
};
/** Every crossover still and idle clip whose file is present, sorted, ready to measure. */
export const installedCrossoverAssets=()=>[...new Set(ALL_ADDITION_ROWS.flatMap(r=>[r.art,r.clip?.src]).filter(Boolean))]
 .filter(installedAsset).sort();
/** Rows whose media has NOT been installed yet -- recorded, framed later, never silently forgotten.
 *  A row with `clip:null` declares no clip, so only its still can be pending. */
export const pendingCrossoverRows=()=>ALL_ADDITION_ROWS.filter(r=>
 !installedAsset(r.art)||(r.clip&&!installedAsset(r.clip.src)));
