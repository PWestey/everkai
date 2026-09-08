import sprites from './ui-sprite-data.json' with {type:'json'};
export const GIFT_ICON_NAMES={gift1:'Icon_Intimacy_1',gift2:'Icon_Intimacy_2',gift5:'Icon_Intimacy_3',gift3:'Icon_EmblemStrength_1',gift4:'Icon_EmblemStrength_2'};
export const GIFT_DISPLAY_ORDER=['gift1','gift2','gift5','gift3','gift4'];
export const spritePath=name=>sprites[name]?'./assets/'+sprites[name].src:null;
export const giftIcon=id=>spritePath(GIFT_ICON_NAMES[id]);
export const rarityIcon=rarity=>spritePath('Icon_Rarity_'+({'SSR+':'SSRPlus','UR+':'URPlus'}[rarity]||rarity)+'_1');
export const countryIcon=type=>{const id={Inspiring:1,Diligent:2,Brave:3,Informed:4,Unfettered:5}[type];return id?spritePath('Icon_Hero_Country_'+id):null};
