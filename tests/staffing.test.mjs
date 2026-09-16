import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';import {BUSINESSES,enterpriseBreakdown} from '../lib/businesses.mjs';import {staffPrice,staffCoefficient,staffingStatus,staffingRule,staffingPlan,STAFFING,enterpriseQuality,defaultQualityBonus} from '../lib/staffing.mjs';import {hireQuote} from '../lib/businesses.mjs';import {originalProgression} from '../lib/original-progression.mjs';import {HIRE_CARDS} from '../lib/hire-cards.mjs';import {createPersistence} from '../lib/persistence.mjs';
import {funded,costOf,covered} from './gear-fixtures.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state),a);return r.state};
const begin=(id='Building_101',n=0)=>{let s=run(funded(fresh(1000),costOf(id)),'openEnterprise',id);s.enterprises[id].employees=n;s=run(s,'activateOriginalProgression');return run(s,'startPaidStaffing',id)};
const evidence=JSON.parse(readFileSync(new URL('../lib/staffing-independent-data.json',import.meta.url)));
const raw=JSON.parse(readFileSync(new URL('../lib/staffing-data.json',import.meta.url)));
test('independent Decimal90 source fixtures: actual batch prices differ from summed singles',()=>{for(const x of evidence.quotes){assert.equal(staffPrice('Building_101',x.staff,1),x.one);assert.equal(staffPrice('Building_101',x.staff,10),x.ten);let singles=0;for(let j=0;j<10;j++)singles+=staffPrice('Building_101',x.staff+j,1);assert.equal(singles,x.tenSingles);assert.notEqual(singles,x.ten);}});
test('budget-max and quote boundaries across all17 businesses, source bands and every quality limit',()=>{const points=new Set([0,1,4999,5000,25999,26000]);for(const b of raw.bands)for(const n of [b.staffCount[0]-1,b.staffCount[0],b.staffCount[1],b.staffCount[1]+1])if(n>=0&&n<=26000)points.add(n);for(let q=1;q<=26;q++)for(const n of [q*1000-1,q*1000])points.add(n);
 for(const id of Object.keys(STAFFING))for(const n of points){const quality=Math.min(26,Math.floor(n/1000)+1),cap=staffingRule(id,quality).cap;const s={gold:0,enterprises:{[id]:{employees:n,apkStaffing:{baselineEmployees:n,baselineQuality:quality,events:[]}}}};const k=Math.min(10,cap-n),price=staffPrice(id,n,k);if(!k){assert.deepEqual(staffingPlan(s,id,'max'),{count:0,cost:0});continue;}if(!Number.isSafeInteger(price)){s.gold=1e12;const plan=staffingPlan(s,id,'max');assert.ok(plan.cost<=s.gold);assert.ok(plan.count<k);continue;}for(const budget of [Math.max(0,price-1),price,price+1]){s.gold=budget;const plan=staffingPlan(s,id,'max');assert.ok(plan.cost<=budget);assert.equal(plan.cost,staffPrice(id,n,plan.count));assert.ok(plan.count<=cap-n);if(plan.count<cap-n)assert.ok(staffPrice(id,n,plan.count+1)>budget);if(budget===price)assert.equal(plan.count,k);}}
});
test('all17 enrolled legacy businesses keep income and staff, quality materials current row and terminal26',()=>{for(const d of BUSINESSES){let s=begin(d.id,5000);const old=enterpriseBreakdown(s,d.id).total;assert.equal(staffingStatus(d.id,s.enterprises[d.id]).quality,5);assert.equal(staffingStatus(d.id,s.enterprises[d.id]).bonus,0);assert.ok(act(s,'upgradeStaffQuality',1000,d.id).error);s={...s,staffingMaterials:{claims:1000,stock:100000}};assert.ok(valid(s));let spent=0;for(let q=5;q<26;q++){const prior=staffingRule(d.id,q),before=enterpriseBreakdown(s,d.id);s=run(s,'upgradeStaffQuality',d.id);spent+=prior.cost;const st=staffingStatus(d.id,s.enterprises[d.id]);assert.equal(st.cap,(q+1)*1000);assert.equal(st.spent,spent);assert.equal(s.staffingMaterials.stock,100000-spent);assert.equal(st.bonus,(staffingRule(d.id,q+1).yieldRise-staffingRule(d.id,5).yieldRise)/10000);assert.ok(enterpriseBreakdown(s,d.id).total>before.total);}assert.ok(enterpriseBreakdown(s,d.id).total>old);assert.ok(act(s,'upgradeStaffQuality',1000,d.id).error);assert.deepEqual(decode(JSON.stringify(s)),s);}});
test('actual paid budget purchase, exact clipping and gold refusal preserve other progress',()=>{let s=begin();assert.deepEqual(staffingPlan(s,'Building_101','max'),{count:10,cost:247});s=run(s,'paidStaffHire','Building_101','max');assert.equal(s.gold,3);assert.equal(s.enterprises.Building_101.employees,10);assert.ok(act(s,'paidStaffHire',1000,'Building_101',1).error);assert.ok(act(s,'paidStaffHire',1000,'Building_101','max').error);s=begin('Building_101',999);s.gold=1e12;assert.equal(staffingPlan(s,'Building_101',10).count,1);s=run(s,'paidStaffHire','Building_101',10);assert.equal(s.enterprises.Building_101.employees,1000);assert.ok(act(s,'paidStaffHire',1000,'Building_101',1).error);s=run(s,'claimStaffingMaterials');s=run(s,'upgradeStaffQuality','Building_101');s=run(s,'paidStaffHire','Building_101',10);assert.equal(s.enterprises.Building_101.employees,1010);assert.deepEqual(decode(JSON.stringify(s)),s);});
test('added coverage raises quality without granting quality income, and cards stop at capacity',()=>{let s=begin('Building_901',999);s=run(s,'claimStaffingMaterials');s=run(s,'upgradeStaffQuality','Building_901');const bonus=staffingStatus('Building_901',s.enterprises.Building_901).bonus;
 // Free coverage, not hiring: hireEmployees now writes a paid [kind 1] event, which deliberately does
 // NOT lift quality. Raising quality by headcount alone is the Hire Card path -- a [kind 0] event --
 // and that asymmetry is exactly what this guards: coverage lifts `quality`, never `bonus`.
 s=covered(s,'Building_901',800);s=covered(s,'Building_901',800);assert.equal(staffingStatus('Building_901',s.enterprises.Building_901).quality,3);assert.equal(staffingStatus('Building_901',s.enterprises.Building_901).bonus,bonus);s=covered(s,'Building_901',5000-2599);assert.equal(s.enterprises.Building_901.employees,5000);assert.equal(staffingStatus('Building_901',s.enterprises.Building_901).quality,5);const card=HIRE_CARDS[0];s={...s,hireCards:{...s.hireCards,[card.id]:10}};assert.ok(act(s,'useHireCards',1000,card.id,{count:1,rolls:[0]}).error);while(s.staffingMaterials.stock<staffingRule('Building_901',5).cost)s=run(s,'claimStaffingMaterials');s=run(s,'upgradeStaffQuality','Building_901');s.gold=1e12;assert.ok(act(s,'paidStaffHire',1000,'Building_901',1).error);assert.deepEqual(decode(JSON.stringify(s)),s);s=begin('Building_101',5000);s=run(s,'claimStaffingMaterials');s=run(s,'upgradeStaffQuality','Building_101');s.gold=1e12;s=run(s,'paidStaffHire','Building_101',1);assert.equal(s.enterprises.Building_101.employees,5001);assert.ok(act(s,'hireEmployees',1000,'Building_101',5000).error);assert.deepEqual(decode(JSON.stringify(s)),s);
 s=begin('Building_101',999);s={...s,hireCards:{...s.hireCards,[card.id]:10}};s=run(s,'useHireCards',card.id,{count:1,rolls:[0]});s=run(s,'useHireCards',card.id,{count:1,rolls:[0]});assert.ok(s.enterprises.Building_101.employees>1000);assert.equal(staffingStatus('Building_101',s.enterprises.Building_101).quality,2);assert.equal(staffingStatus('Building_101',s.enterprises.Building_101).bonus,0);});
test('old income settles before quality, encounters frozen, failed-write reload and tamper refusal',()=>{let s=begin('Building_101',50);s=run(s,'claimStaffingMaterials');s=run(s,'northStart',null,{seq:0});s=run(s,'tradeBegin','veteran',{seq:0,team:['hero_15']});const rate=totalRate(s),r=act(s,'upgradeStaffQuality',2000,'Building_101');assert.ok(!r.error);assert.equal(r.state.pending,s.pending+rate);assert.deepEqual(r.state.northern,s.northern);assert.deepEqual(r.state.tradingPost,s.tradingPost);let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;assert.throws(()=>p.commit(r.state));assert.deepEqual(p.current,s);fail=false;p.load(1000);p.commit(run(p.current,'upgradeStaffQuality','Building_101'));assert.deepEqual(decode(raw),p.current);for(const edit of [x=>x.enterprises.Building_101.employees++,x=>x.enterprises.Building_101.apkStaffing.events[0][2]++,x=>x.staffingMaterials.stock++,x=>x.enterprises.Building_101.apkStaffing.baselineQuality=6,x=>x.enterprises.Bad=x.enterprises.Building_101]){const bad=structuredClone(p.current);edit(bad);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}});

// ---------------------------------------------------------------------------------------------
// SL1-03 / SL1-04: quality is a field, and the ladder is reachable without APK growth.
// ---------------------------------------------------------------------------------------------
test('BuildingQuality identity: levelLimit is exactly 1000*Quality, which is what makes the legacy derivation sound',()=>{
 // MEASURED 2026-09-15 from the original BuildingQuality.json (469 rows): levelLimit === 1000*Quality
 // on all 468 non-Bank rows. coverage(n)=ceil(n/1000) is therefore exactly the minimum quality whose
 // limit admits n staff -- the whole reason a pre-SL1-03 save can be read forward without a migration
 // and without being handed a tier it did not already need. If staffing-data.json ever drifts off
 // that identity the derivation silently starts under- or over-shooting, so it is pinned here.
 const check=table=>Object.entries(table).every(([,b])=>b.qualities.every((q,i)=>q.cap===1000*(i+1)));
 assert.equal(Object.keys(STAFFING).length,17);
 for(const [id,b] of Object.entries(STAFFING)){
  assert.equal(b.qualities.length,26,id);
  assert.equal(b.qualities[0].yieldRise,0,id);
  assert.equal(b.qualities[25].yieldRise,1120000,id);   // +11,200% at tier 26, every building
  assert.equal(b.qualities[25].cap,26000,id);
 }
 assert.ok(check(STAFFING),'cap === 1000*Quality on every tier of every business');
 // The Inn's whole ladder costs 25,915 materials -- 25.9 days at MATERIALS_PER_DAY.
 assert.equal(STAFFING.Building_101.qualities.slice(0,25).reduce((n,q)=>n+q.cost,0),25915);
 // NEGATIVE CONTROL: break the identity and confirm the checker actually notices.
 const broken=structuredClone(STAFFING);broken.Building_101.qualities[9].cap=9999;
 assert.equal(check(broken),false,'the cap identity checker must fail on a broken table');
});
test('the quality ladder is reachable in a default save, is paid for in materials, and grandfathers old rows',()=>{
 const inn='Building_101';
 let s=run(funded(fresh(1000),costOf(inn)),'openEnterprise',inn);
 assert.equal(originalProgression(s),false,'this whole test runs WITHOUT APK growth');
 assert.equal(enterpriseQuality(inn,s.enterprises[inn]),1);
 assert.equal(defaultQualityBonus(inn,s.enterprises[inn]),0);
 assert.equal(enterpriseBreakdown(s,inn).qualityBonus,0);
 // The faucet and the ladder both used to refuse outside APK growth.
 s=run(s,'claimStaffingMaterials');
 assert.equal(s.staffingMaterials.stock,1000);
 s=run(s,'upgradeStaffQuality',inn);
 assert.deepEqual([s.enterprises[inn].quality,s.enterprises[inn].qualityBase],[2,1]);
 assert.equal(s.staffingMaterials.stock,995,'tier 1->2 costs 5 materials');
 assert.equal(defaultQualityBonus(inn,s.enterprises[inn]),1,'yieldRise 10000/10000 = +100%');
 assert.equal(enterpriseBreakdown(s,inn).qualityBonus,1);
 // Quality raises the paid hiring ceiling above the 5,000 free floor, toward the original's 26,000.
 assert.equal(hireQuote(s,inn,1).ceiling,5000,'below tier 6 the free floor is still the binding cap');
 while(enterpriseQuality(inn,s.enterprises[inn])<7)s=run(s,'upgradeStaffQuality',inn);
 assert.equal(hireQuote(s,inn,1).ceiling,7000);
 assert.deepEqual(decode(JSON.stringify(s)),s);
 // Grandfathering: a pre-SL1-03 row at 5,000 staff reads as tier 5 and earns NOTHING for it, so this
 // change cannot hand a live save income it never paid materials for.
 let g=run(funded(fresh(1000),costOf(inn)),'openEnterprise',inn);
 g={...g,enterprises:{...g.enterprises,[inn]:{...g.enterprises[inn],employees:5000}}};
 assert.ok(valid(g));
 assert.equal(enterpriseQuality(inn,g.enterprises[inn]),5);
 assert.equal(defaultQualityBonus(inn,g.enterprises[inn]),0,'no gifted income');
 g=run(g,'claimStaffingMaterials');g=run(g,'upgradeStaffQuality',inn);
 assert.deepEqual([g.enterprises[inn].quality,g.enterprises[inn].qualityBase],[6,5]);
 assert.equal(defaultQualityBonus(inn,g.enterprises[inn]),4,'(110000-70000)/10000, the ladder step only');
 // NEGATIVE CONTROLS: every forgery the material ledger and the bounds are supposed to refuse.
 for(const [why,edit] of [
  ['quality forged past what materials were spent',x=>{x.enterprises[inn].quality=10}],
  ['qualityBase forged down to claim unpaid tiers',x=>{x.enterprises[inn].qualityBase=1}],
  ['quality below the ladder',x=>{x.enterprises[inn].quality=0}],
  ['quality past tier 26',x=>{x.enterprises[inn].quality=27}],
  ['base above current quality',x=>{x.enterprises[inn].qualityBase=x.enterprises[inn].quality+1}],
  ['a base with no quality beside it',x=>{delete x.enterprises[inn].quality}],
  ['materials minted',x=>{x.staffingMaterials.stock++}],
  ['staff past the tier ceiling',x=>{x.enterprises[inn].employees=26000}],
 ]){const bad=structuredClone(g);edit(bad);assert.equal(valid(bad),false,why);assert.throws(()=>decode(JSON.stringify(bad)),undefined,why);}
 // A pre-SL1-03 row still cannot carry more than the free floor without a tier to justify it.
 const over=structuredClone(g);delete over.enterprises[inn].quality;delete over.enterprises[inn].qualityBase;
 over.staffingMaterials={stock:1000,claims:1,granted:1000,days:[]};over.enterprises[inn].employees=5001;
 assert.equal(valid(over),false,'the old employees<=5000 rule still bites when no quality field exists');
});
