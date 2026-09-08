import data from './raphael-data.json' with {type:'json'};
export const RAPHAEL_FANS=data.fans,RAPHAEL_ITEMS=data.items;
export const stageDefinition=(kind,id)=>(kind==='fan'?RAPHAEL_FANS:kind==='item'?RAPHAEL_ITEMS:[]).find(x=>x.id===id);
export const freshStage=()=>({cells:Array(25).fill(null),best:0,performances:0});
export const stageState=s=>s.raphael||freshStage();
const validCell=p=>p===null||!!p&&!!stageDefinition(p.kind,p.id)&&Number.isInteger(p.level)&&p.level>=stageDefinition(p.kind,p.id).levelMin&&p.level<=stageDefinition(p.kind,p.id).levelMax;
export function validStage(s){
 if(s.raphael===undefined)return true;const r=s.raphael;
 if(!r||!Array.isArray(r.cells)||r.cells.length!==25||!r.cells.every(validCell)||!Number.isSafeInteger(r.best)||r.best<0||r.best>1e15||!Number.isInteger(r.performances)||r.performances<0||r.performances>1e9)return false;
 const items=r.cells.filter(x=>x?.kind==='item');return items.length<=4&&new Set(items.map(x=>x.id)).size===items.length;
}
// A target receives support when its coordinate difference matches a documented offset.
export function stageTargets(position,effect){
 const offsets=data.effects[effect]?.offsets||[],x=position%5,y=Math.floor(position/5);
 return Array.from({length:25},(_,i)=>i).filter(i=>i!==position&&offsets.some(([dx,dy])=>(dx===999||i%5-x===dx)&&(dy===999||Math.floor(i/5)-y===dy)));
}
export function stageScore(cells){
 const scores=cells.map((p,i)=>{
  if(p?.kind!=='fan')return 0;
  const base=stageDefinition('fan',p.id).selfEncourage[p.level-1];let flat=0,percent=0;
  for(let j=0;j<cells.length;j++){
   const source=cells[j];if(!source)continue;
   const d=stageDefinition(source.kind,source.id);if(!stageTargets(j,d.effectTypeId).includes(i))continue;
   if(source.kind==='fan')flat+=d.otherEncourage[source.level-1];else percent+=d.enhanceEffect[source.level-1]/10000;
  }
  return Math.ceil(base+flat+base*percent);
 });
 return {total:data.settings.baseScore+scores.reduce((a,b)=>a+b,0),scores};
}
export function stageAction(s,action,target,value){
 if(!['stagePlace','stageRemove','stageMove','stageLevel','stagePerform'].includes(action))return null;
 const r=stageState(s),fail=error=>({state:s,error});
 if(action==='stagePerform'){
  if(!r.cells.some(p=>p?.kind==='fan'))return fail('Place at least one fan before performing.');
  const score=stageScore(r.cells).total;
  return {state:{...s,raphael:{...r,best:Math.max(r.best,score),performances:Math.min(1e9,r.performances+1)}},message:`Performance: ${score.toLocaleString()} encouragement!`};
 }
 if(!Number.isInteger(target)||target<0||target>=25)return fail('Choose a stage square.');
 const cells=r.cells.map(p=>p?{...p}:null);
 if(action==='stageRemove')cells[target]=null;
 if(action==='stagePlace'){
  if(!validCell(value)||value===null)return fail('Choose a fan or support item and a valid level.');
  cells[target]={kind:value.kind,id:value.id,level:value.level};
 }
 if(action==='stageMove'){
  if(!Number.isInteger(value)||value<0||value>=25)return fail('Choose a destination square.');
  [cells[target],cells[value]]=[cells[value],cells[target]];
 }
 if(action==='stageLevel'){
  const p=cells[target];if(!p||![1,-1].includes(value))return fail('Choose an occupied square to change level.');
  p.level+=value;if(!validCell(p))return fail('That is the last documented level.');
 }
 const next={...s,raphael:{...r,cells}};
 if(!validStage(next))return fail('Use up to four different support items; each item can appear once.');
 return {state:next,message:'Stage arrangement saved.'};
}
