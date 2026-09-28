// The original's own roster art, imported by scripts/import-roster-crops.py.
//
// `Hero.json wideHead` / `Wife.json avatarHalf2` name a 500x400 half-body per character and per
// costume. `head` / `avatarHalf` name the list-item COMPONENT that frames it, and that component
// measures 206x291 for heroes and 224x319 for wives -- the portrait card Everkai already draws at
// 206:280. So the original's list row is a portrait card showing this half-body; Everkai was showing
// the 1280x1920 cutscene plate and recovering a crop from a measured bounds table, which is why
// full-scene costume plates came out with the character tiny. See docs/roster-crop-measurement.md.
//
// 299 of 303 views have one. H251C1, hero_180, hero_183 and wife_168 are in neither APK, so
// `hasRosterCrop` is false for them and the caller keeps the old measured-bounds path.
import data from './roster-crop-data.json' with {type:'json'};
import humanized from './humanized-static-data.json' with {type:'json'};

export const ROSTER_CROP_DIR='roster/';
export const rosterCropViews=()=>Object.keys(data.views);
export const hasRosterCrop=view=>!!rosterCrop(view);
export const rosterCropSource=()=>data.source;

// A HUMANIZED COMPOSITION ALWAYS WINS, and this is a correction of my own regression.
//
// Everkai does not ship the original's character art as drawn: `lib/humanized-static-data.json` holds
// 218 adjusted compositions, one for EVERY Fellow and EVERY Family member, and `f.art`/`f.portrait`
// already resolve to them. The 2026-09-28 crop import took precedence over that and put the raw APK
// sprites back on the roster for 215 of the 218 -- horns, animal features and the un-adjusted bodies.
// The owner reported it the same day.
//
// So the crop serves only views that HAVE no adjusted composition, which is the 85 costumes (none of
// them humanized -- lib/wardrobe-assets.json is raw APK art either way, so nothing is lost there and
// the framing is still better). For a Fellow or a Family member this now returns null and the caller
// falls through to the adjusted plate, framed as it was before by lib/art-bounds-data.json.
const HUMANIZED=new Set(humanized.map(r=>r.id));
export const hasAdjustedArt=view=>HUMANIZED.has(view);

/** The crop for a view id, or null -- including null for anything with an adjusted composition. */
export function rosterCrop(view){
 if(!view||HUMANIZED.has(view))return null;
 const row=data.views[view];
 return row?{path:ROSTER_CROP_DIR+row.file,width:row.w,height:row.h,sprite:row.sprite,box:row.box||null}:null;
}

export const CARD_ASPECT=206/280;

/** Where the crop sits in the roster card, as percentages the same shape `rosterArtPlacement` returns.
 *
 *  The card is taller than 5:4, so covering it means the image's height fills and its width overflows;
 *  `left` picks which slice of that width shows. Unlike the old path this is not an estimate: the
 *  half-body renders carry a real alpha channel, so `box` is the figure's exact extent (297 of 299),
 *  and the slice is centred on the figure rather than on the canvas. The two crops with no alpha, and
 *  the four views with no crop at all, fall back to a centred slice.
 *
 *  What is NOT measured: the original's component holds its own display list, which this project does
 *  not parse, so how IT places the image inside 206x291 is unknown. Cover is the choice here. */
export function rosterCropPlacement(box){
 const cardH=100/CARD_ASPECT;                 // card height, in % of card width
 const width=cardH*(500/400);                 // cover: image height == card height
 const visible=100/width;                     // fraction of the image's width the card shows
 const cx=box?(box[0]+box[2])/2:.5;
 const left=Math.min(0,Math.max(100-width,50-width*cx));
 return {width:+width.toFixed(2),left:+left.toFixed(2),top:0,visible:+visible.toFixed(4)};
}
