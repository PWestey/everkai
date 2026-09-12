import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,settle,totalRate} from '../lib/game.mjs';import {newFellow} from '../lib/adventure.mjs';import {FELLOWS} from '../lib/catalog.mjs';
import {talentRule,resolveTalentProfile,talentTrainingPlan} from '../lib/talents.mjs';import {insightRule,insightState,insightTrainingPlan} from '../lib/insight.mjs';
// claimInsight used to hand over 1,000 of a Fellow's own Insight type. It is earned now, so fixtures
// stock the exact material that Fellow spends, at the amount the old grant gave.
const stock=(s,id)=>{const i=insightState(s),k=insightRule(id).materialId;return {...s,insight:{...i,balances:{...i.balances,[k]:(i.balances[k]||0)+1000}}};};import {createPersistence} from '../lib/persistence.mjs';
import {BUSINESSES} from '../lib/businesses.mjs';
import guide from '../lib/character-skill-guide.json' with {type:'json'};
const go=(s,a,id='hero_15',v=null)=>{const r=act(s,a,s.lastAt,id,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
test('all158 exact talent identities spend only their supported cost and add only their effect',()=>{
 let s=fresh(1000);for(const f of FELLOWS)s.fellows[f.id]=newFellow();s.inventory.Item_Talent_Hero_1=10000;let count=0,spent=0;
 for(const f of FELLOWS){const r=talentRule(f.id);if(!r)continue;count++;const before=s.fellows[f.id].aptitude;s=go(s,'trainTalent',f.id,'max');assert.equal(s.fellows[f.id].talentLevel,r.cap);assert.equal(s.fellows[f.id].aptitude,before+r.amount*r.cap);spent+=r.cost*r.cap;assert.equal(talentTrainingPlan(s,f.id,'max').count,0);}
 assert.equal(count,153);assert.equal(s.inventory.Item_Talent_Hero_1,10000-spent);assert.equal(talentRule('hero_60'),null);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('UR and rarity-advance labels use the exact default node, while ambiguous and costume nodes refuse',()=>{
 for(const id of ['hero_113','hero_121','hero_142'])assert.equal(talentRule(id).amount,3);assert.equal(talentRule('hero_186').amount,2);
 const p=guide.profiles.find(p=>p.id==='hero_113'),node=p.skills.find(n=>n.id==='Hero_Talent_Base_3');assert.ok(resolveTalentProfile(p));
 for(const profile of [{...p,category:'family'},{...p,skills:[node,node]},{...p,skills:[{...node,name:'Other talent'}]},{...p,skills:[{...node,lines:['Unlock: Costume C1','Base cap: 300','+3 Aptitude per level']}]},{...p,skills:[{...node,id:'Hero_Talent_StarSkill_1'}]}])assert.equal(resolveTalentProfile(profile),null);assert.equal(talentRule('wife_1'),null);
});
test('legacy45Insight preserves previous Aptitude and charges25500 for remaining255levels',()=>{
 let s=fresh(1000);s.insight={balances:{Item_Hero_Talent_Country_5:25500},levels:{hero_15:45}};s.fellows.hero_15.aptitude=197;const before=structuredClone(s);assert.deepEqual(decode(JSON.stringify(s)),before);const plan=insightTrainingPlan(s,'hero_15','max');assert.equal(plan.count,255);assert.equal(plan.cost,25500);s=go(s,'trainInsight','hero_15','max');assert.equal(s.insight.levels.hero_15,300);assert.equal(s.insight.balances.Item_Hero_Talent_Country_5,0);assert.equal(s.fellows.hero_15.aptitude,452);assert.ok(act(s,'trainInsight',s.lastAt,'hero_15','max').error);
});
test('both skill planners clip to Aptitude room without consuming for blocked effects',()=>{
 let s=go(fresh(1000),'recruit','hero_113');s.inventory.Item_Talent_Hero_1=100;s.fellows.hero_113.aptitude=998;assert.equal(talentTrainingPlan(s,'hero_113','max').count,0);assert.ok(act(s,'trainTalent',s.lastAt,'hero_113','max').error);s=stock(s,'hero_113');assert.equal(insightTrainingPlan(s,'hero_113','max').count,2);s=go(s,'trainInsight','hero_113','max');assert.equal(s.fellows.hero_113.aptitude,1000);assert.equal(s.insight.balances[insightRule('hero_113').materialId],800);const inv=structuredClone(s.inventory),insight=structuredClone(s.insight);assert.ok(act(s,'trainInsight',s.lastAt,'hero_113',5).error);assert.deepEqual(s.inventory,inv);assert.deepEqual(s.insight,insight);
});
test('failed remaining255-level batch admits neither payment nor effect until explicit reload/retry',()=>{
 const s=fresh(1000);s.insight={balances:{Item_Hero_Talent_Country_5:25500},levels:{hero_15:45}};s.fellows.hero_15.aptitude=55;let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;assert.throws(()=>p.commit(go(p.current,'trainInsight','hero_15','max')));assert.deepEqual(p.current,s);assert.deepEqual(JSON.parse(raw),s);fail=false;p.load(1000);p.commit(go(p.current,'trainInsight','hero_15','max'));p.load(1000);assert.equal(p.current.insight.levels.hero_15,300);assert.equal(p.current.insight.balances.Item_Hero_Talent_Country_5,0);assert.equal(p.current.fellows.hero_15.aptitude,310);
});
test('new talent training settles old income and preserves current Mine, Northern and Trading records',()=>{
 let s=go(fresh(1000),'recruit','hero_113');s=stock(s,'hero_113');s.inventory.Item_Talent_Hero_1=60;s=go(s,'openEnterprise',BUSINESSES[0].id);s=go(s,'mineDeploy','hero_15',{seq:0,day:0});s=go(s,'northStart',null,{seq:0});s=go(s,'tradeBegin','learner',{seq:0,team:['hero_113']});const snapshots=structuredClone({mine:s.mineClearance,north:s.northern,trade:s.tradingPost}),expected=settle(s,2000),oldRate=totalRate(s);const r=act(s,'trainTalent',2000,'hero_113','max');assert.ok(!r.error,r.error);s=r.state;assert.equal(s.pending,expected.pending);assert.ok(totalRate(s)>oldRate);assert.deepEqual({mine:s.mineClearance,north:s.northern,trade:s.tradingPost},snapshots);assert.equal(s.fellows.hero_113.talentLevel,20);assert.equal(s.inventory.Item_Talent_Hero_1,0);
});
