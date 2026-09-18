import sprites from './ui-sprite-data.json' with {type:'json'};
export const GIFT_ICON_NAMES={gift1:'Icon_Intimacy_1',gift2:'Icon_Intimacy_2',gift5:'Icon_Intimacy_3',gift3:'Icon_EmblemStrength_1',gift4:'Icon_EmblemStrength_2'};
export const GIFT_DISPLAY_ORDER=['gift1','gift2','gift5','gift3','gift4'];
export const spritePath=name=>sprites[name]?'./assets/'+sprites[name].src:null;
export const giftIcon=id=>spritePath(GIFT_ICON_NAMES[id]);
// `UR*` is how the roster snapshot and lib/public-reference.mjs spell the original's rarity code 6;
// the sprite index spells the same tier `URPlus`, which is why the `UR+` alias already existed. Without
// the `UR*` entry rarityIcon asked for `Icon_Rarity_UR*_1`, which is not a key, so it returned null for
// the 3 roster records whose rarity IS `UR*`, for every chain ending in it, and for quality tier 13 of
// the crossover ladder (lib/crossover-rarity.mjs). All eight tiers of that ladder now resolve.
export const RARITY_ICON_ALIAS=Object.freeze({'SSR+':'SSRPlus','UR+':'URPlus','UR*':'URPlus'});
export const rarityIcon=rarity=>spritePath('Icon_Rarity_'+(RARITY_ICON_ALIAS[rarity]||rarity)+'_1');
export const countryIcon=type=>{const id={Inspiring:1,Diligent:2,Brave:3,Informed:4,Unfettered:5}[type];return id?spritePath('Icon_Hero_Country_'+id):null};
// Companion list cards. Familiars ship no portrait art at all, so their roster tiles are the
// original's rarity-tinted card ground plus its frame, exactly as the original presents them.
// The index is a DISPLAY RANK, not the original's grade value: Pet.json's `grade` joins to these
// rarities across 70 of 71 familiars (1=N, 2=R, 3=SR, 4=SSR, 9=SSR+, 5=UR), while the six sprites
// run a colour ramp -- green, blue, purple, orange, dark red, violet -- in tier order.
// LR is the ladder's top rung (lib/crossover-rarity.mjs tier 14) and the index holds only SIX card
// grounds, so it shares UR's violet one -- the same fold cardRarity already applies to `UR*`. Measured:
// `Icon_Rarity_LR_1` exists but `Bg_PetList_Rarity_7` does not, so without this a climbed Fellow's tile
// lost its ground, frame and portrait mask while its rarity badge kept working.
const PET_CARD_RANK={N:1,R:2,SR:3,SSR:4,'SSR+':5,UR:6,LR:6};
// Catalog rarities can be an ascension chain ('SSR+ -> UR*', 47 of 259 characters); a card shows
// the rank the character starts at, so only the first step counts and the '*' variant mark is dropped.
export const cardRarity=rarity=>String(rarity||'').split('->')[0].trim().replace(/\*$/,'');
export const petCardIcon=rarity=>{const n=PET_CARD_RANK[cardRarity(rarity)];return n?spritePath('Bg_PetList_Rarity_'+n):null};
export const petFrameIcon=rarity=>{const n=PET_CARD_RANK[cardRarity(rarity)];return n?spritePath('Frame_PetList_Rarity_'+n):null};
// CSS custom properties for a framed rarity card (--card-bg ground/mask, --card-frame overlay).
// The URLs are made absolute on purpose. A relative url() inside a custom property is resolved where
// var() is substituted -- the built stylesheet in assets/ -- so './assets/x.png' became
// '/assets/assets/x.png' in production (404), leaving the card with no ground, no frame and a mask
// that hid the portrait. The dev server injects CSS into the document, which is why only the built
// site (the installed phone app) showed blank cards.
const absolute=path=>typeof document==='undefined'?path:new URL(path,document.baseURI).href;
export const cardStyle=rarity=>{const bg=petCardIcon(rarity||'N'),frame=petFrameIcon(rarity||'N');return {'--card-bg':bg?`url("${absolute(bg)}")`:undefined,'--card-frame':frame?`url("${absolute(frame)}")`:undefined}};
