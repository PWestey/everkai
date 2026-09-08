import data from './operation-data.json' with {type:'json'};
const byFellow=new Map(data.records.map(r=>[r.fellow,r]));
export function fellowOperation(s,fellow,business){
 const row=byFellow.get(fellow),owned=s.fellows[fellow];
 if(!row||!owned)return {known:false,percent:0,next:[]};
 const matching=row.effects.filter(e=>(!e.type||e.type===business.type)&&(!e.building||e.building===business.id));
 return {known:true,percent:matching.filter(e=>owned.level>=e.minLevel).reduce((sum,e)=>sum+e.percent,0),next:matching.filter(e=>owned.level<e.minLevel),unresolved:row.unresolved};
}
export function assignedOperation(s,business){
 return (s.enterprises?.[business.id]?.fellows||[]).reduce((sum,f)=>sum+fellowOperation(s,f,business).percent+5*(s.opening?.operations[f]||0),0)/100;
}
