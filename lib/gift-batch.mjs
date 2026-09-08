import {GIFTS} from './catalog.mjs';
// Client-supported batch presentation; local caps and transaction policy are explicit.
export function giftBatch(s,recipient,value){
 const gift=GIFTS.find(g=>g.id===value?.giftId),member=s.family[recipient],requested=value?.count;
 const fail=error=>({state:s,error});
 if(!gift||!member||!Number.isInteger(requested)||requested<1||requested>1e6)return fail('Choose a family member, gift and whole quantity.');
 const count=Math.max(0,Math.min(requested,s.inventory[gift.id],Math.floor((1e6-member[gift.stat])/gift.amount)));
 if(!count)return fail('No gifts can be used without exceeding the stat limit.');
 return {state:{...s,inventory:{...s.inventory,[gift.id]:s.inventory[gift.id]-count},family:{...s.family,[recipient]:{...member,[gift.stat]:member[gift.stat]+count*gift.amount}},stats:{...s.stats,gifts:Math.min(1e9,s.stats.gifts+count)}},message:`Gave ${count} ${gift.name}: +${count*gift.amount} ${gift.stat==='intimacy'?'Intimacy':'Blessing Power'}.`};
}
