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
export const petCardIcon=rarity=>{const n=PET_CARD_RANK[rarity];return n?spritePath('Bg_PetList_Rarity_'+n):null};
export const petFrameIcon=rarity=>{const n=PET_CARD_RANK[rarity];return n?spritePath('Frame_PetList_Rarity_'+n):null};
