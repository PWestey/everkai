import sprites from './ui-sprite-data.json' with {type:'json'};
export const GIFT_ICON_NAMES={gift1:'Icon_Intimacy_1',gift2:'Icon_Intimacy_2',gift5:'Icon_Intimacy_3',gift3:'Icon_EmblemStrength_1',gift4:'Icon_EmblemStrength_2'};
export const GIFT_DISPLAY_ORDER=['gift1','gift2','gift5','gift3','gift4'];
export const spritePath=name=>sprites[name]?'./assets/'+sprites[name].src:null;
export const giftIcon=id=>spritePath(GIFT_ICON_NAMES[id]);
export const rarityIcon=rarity=>spritePath('Icon_Rarity_'+({'SSR+':'SSRPlus','UR+':'URPlus'}[rarity]||rarity)+'_1');
export const countryIcon=type=>{const id={Inspiring:1,Diligent:2,Brave:3,Informed:4,Unfettered:5}[type];return id?spritePath('Icon_Hero_Country_'+id):null};
// Companion list cards. Familiars ship no portrait art at all, so their roster tiles are the
// original's rarity-tinted card ground plus its frame, exactly as the original presents them.
// The index is a DISPLAY RANK, not the original's grade value: Pet.json's `grade` joins to these
// rarities across 70 of 71 familiars (1=N, 2=R, 3=SR, 4=SSR, 9=SSR+, 5=UR), while the six sprites
// run a colour ramp -- green, blue, purple, orange, dark red, violet -- in tier order.
const PET_CARD_RANK={N:1,R:2,SR:3,SSR:4,'SSR+':5,UR:6};
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
