import {blessingRecipients,blessingValue,BLESSINGS} from './blessings.mjs';
import {familyById} from './catalog.mjs';
// WHO BLESSES THIS FELLOW (docs/fellow-screen-specs/09-blessing.md, difference B1).
//
// "In the original, Blessing is reachable FROM THE FELLOW -- it is a property of the fellow receiving
// it. Everkai reaches it only from the family member giving it." That is the whole structural point
// of spec 09, and the data was always there: `blessingRecipients(s, familyId)` answers the forward
// question, and nothing anywhere asked the reverse one. This is the reverse one.
export function blessersOf(s,fellowId){
 const out=[];
 for(const wid of Object.keys(s.family||{})){
  for(const target of blessingRecipients(s,wid)||[]){
   const id=target?.id||target;
   if(id!==fellowId)continue;
   const f=s.family[wid];
   out.push({id:wid,name:familyById(wid)?.name||wid,
    parts:Object.entries(BLESSINGS).map(([key,rule])=>({key,name:rule.name,value:blessingValue(f,key)})).filter(p=>p.value>0)});
  }
 }
 return out;
}
/** The original draws a fixed FOUR-slot row, filled or silhouetted, because the row communicates
 *  capacity -- "you have two more to fill" -- which a list of however-many cannot (spec 09 B3).
 *  Everkai has no capacity rule of its own, so the four is the original's shape, not a cap we enforce. */
export const BLESSING_SLOTS=4;
