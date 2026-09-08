import data from './original-progression-data.json' with {type:'json'};
export const originalProgression=s=>s?.originalProgression?.policyVersion===1;
export const originalCost=level=>level<750?data.levels[level]?.cost??null:null;
export const sourceQuality=(s,id)=>s.originalProgression?.quality[id]??1;
export const qualityRule=q=>data.quality[q]||null;
export const sourceCap=(s,id)=>qualityRule(sourceQuality(s,id)).cap;
export const sourceAptitudeBonus=(s,id)=>originalProgression(s)?data.heroes[id]-10+qualityRule(sourceQuality(s,id)).talent:0;
export const sourceCoefficient=level=>data.levels[level]?.coefficient;
export const SOURCE_MATERIALS=data.materials;
export function validOriginalProgression(s){
 const p=s.originalProgression;if(p===undefined)return true;
 const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 if(!p||p.policyVersion!==1||s.trainingCosts?.policyVersion!==2||!int(p.claims,10000)||!p.quality||Array.isArray(p.quality)||typeof p.quality!=='object'||!p.stock||Array.isArray(p.stock)||typeof p.stock!=='object'||!Array.isArray(p.receipts)||p.receipts.length>3000)return false;
 const qualities={},spent=Object.fromEntries(Object.keys(SOURCE_MATERIALS).map(id=>[id,0]));
 for(const r of p.receipts){if(!r||!Object.hasOwn(s.fellows,r.id)||!int(r.from,13)||r.from<1||r.to!==r.from+1||r.from!==(qualities[r.id]??1)||!int(r.level,750)||r.level<qualityRule(r.from).cap||JSON.stringify(r.cost)!==JSON.stringify(qualityRule(r.from).consume))return false;for(const c of r.cost)spent[c.id]+=c.count;qualities[r.id]=r.to;}
 if(Object.entries(p.quality).some(([id,q])=>!Object.hasOwn(s.fellows,id)||!int(q,14)||q<1||q!==(qualities[id]??1)))return false;
 if(Object.entries(s.fellows).some(([id,f])=>!data.heroes[id]||sourceQuality(s,id)!==(qualities[id]??1)||f.level>sourceCap(s,id)))return false;
 return Object.keys(p.stock).length===9&&Object.entries(SOURCE_MATERIALS).every(([id])=>int(p.stock[id],1e6)&&p.stock[id]===p.claims*100-spent[id]);
}
export function originalProgressionAction(s,action,id){
 const fail=error=>({state:s,error}),p=s.originalProgression;
 if(action==='activateOriginalProgression'){
  if(originalProgression(s))return fail('Original growth is already active.');
  if(Object.keys(s.fellows).some(id=>!data.heroes[id]))return fail('An owned Fellow has no verified original growth record.');
  return {state:{...s,trainingCosts:s.trainingCosts||{policyVersion:2,baselineLevels:Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,f.level])),receipts:[]},originalProgression:{policyVersion:1,claims:0,quality:{},stock:Object.fromEntries(Object.keys(SOURCE_MATERIALS).map(id=>[id,0])),receipts:[]}},message:'Original growth enabled. Existing levels, earned upgrades and receipts preserved.'};
 }
 if(!['claimOriginalSupplies','originalQuality'].includes(action))return null;
 if(!originalProgression(s))return fail('Enable original growth in Training Rules first.');
 if(action==='claimOriginalSupplies'){
  if(p.claims>=10000||Object.values(p.stock).some(n=>n>1e6-100))return fail('Breakthrough supply storage is full.');
  return {state:{...s,fellowXP:Math.min(1e9,s.fellowXP+10000000),originalProgression:{...p,claims:p.claims+1,stock:Object.fromEntries(Object.entries(p.stock).map(([id,n])=>[id,n+100]))}},message:'Sandbox supplies: up to 10M EXP and 100 of each breakthrough material.'};
 }
 const f=s.fellows[id],q=sourceQuality(s,id),rule=qualityRule(q);if(!f||q>=14)return fail('Choose a Fellow below final quality.');
 if(f.level<rule.cap)return fail(`Reach level ${rule.cap} first.`);if(p.receipts.length>=3000)return fail('Breakthrough receipt storage is full.');
 if(rule.consume.some(c=>p.stock[c.id]<c.count))return fail('Collect the required breakthrough materials.');
 const stock={...p.stock};for(const c of rule.consume)stock[c.id]-=c.count;
 return {state:{...s,originalProgression:{...p,stock,quality:{...p.quality,[id]:q+1},receipts:[...p.receipts,{id,from:q,to:q+1,level:f.level,cost:rule.consume.map(c=>({...c}))}]}},message:`Quality ${q+1} · level limit ${qualityRule(q+1).cap} · original Aptitude bonus +${qualityRule(q+1).talent}.`};
}
