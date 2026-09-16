import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,settle,valid,decode} from '../lib/game.mjs';import {banquetState,seatedGuests,BANQUET_SHOP,BANQUET_PARTIES} from '../lib/banquets.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,id=null,q=null)=>{const r=act(s,a,s.lastAt,id,{seq:banquetState(s).seq,quantity:q});assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};// banquetPrepare is habit-gated now, so fixtures stock the pantry the way it used to.
const stocked=(kind='wine')=>{const m=kind==='wine'?['Item_Ceremony_01','Item_Ceremony_02']:['Item_Ceremony_03','Item_Ceremony_04'];return {...fresh(1000),banquets:{policyVersion:1,seq:0,coins:0,popularity:0,pantry:Object.fromEntries(m.map(id=>[id,1])),run:null,history:[],shop:{day:0,bought:{}}}};};
const hosting=(kind='wine')=>run(stocked(kind),'banquetHost',kind);const complete=kind=>{let s=hosting(kind);s=settle(s,1000+s.banquets.run.guests.length*5000);return run(s,'banquetClaim',s.banquets.run.id)};
test('explicit preparation/hosting consumes only listed materials; no real guests or early rewards',()=>{let s=fresh(1000);assert.ok(act(s,'banquetHost',1000,'wine',{seq:0}).error);s=stocked('wine');assert.equal(s.banquets.run,null);assert.equal(s.banquets.pantry.Item_Ceremony_01,1);s=run(s,'banquetHost','wine');assert.equal(s.banquets.pantry.Item_Ceremony_01,0);assert.equal(s.banquets.run.guestMode,'simulated');assert.equal(s.banquets.run.guests.length,4);assert.deepEqual(s.banquets.run.paid,{Item_Ceremony_01:1,Item_Ceremony_02:1});assert.ok(act(s,'banquetHost',1000,'wine',{seq:s.banquets.seq}).error);assert.ok(act(s,'banquetClaim',1000,s.banquets.run.id,{seq:s.banquets.seq}).error);assert.equal(s.banquets.coins,0)});
test('offline seats and immutable reward snapshot admit one completion without duplicate claims',()=>{for(const kind of ['wine','fine']){let s=hosting(kind),r=s.banquets.run;s=settle(s,11000);assert.equal(seatedGuests(s),2);assert.deepEqual(decode(JSON.stringify(s)).banquets.run,r);s=settle(s,1000+r.guests.length*5000);const seq=s.banquets.seq;s=run(s,'banquetClaim',r.id);assert.equal(s.banquets.coins,r.guests.length*100);assert.equal(s.banquets.history.length,1);assert.ok(act(s,'banquetClaim',s.lastAt,r.id,{seq}).error);assert.ok(act(s,'banquetClaim',s.lastAt,r.id,{seq:s.banquets.seq}).error);assert.deepEqual(decode(JSON.stringify(s)).banquets,s.banquets)}});
test('earned coins buy a source-priced pearl and fund existing Fellow talent training',()=>{let s=complete('wine'),apt=s.fellows.hero_15.aptitude;s=run(s,'banquetBuy','Item_Talent_Hero_1',1);assert.equal(s.banquets.coins,100);assert.equal(s.inventory.Item_Talent_Hero_1,1);const r=act(s,'trainTalent',s.lastAt,'hero_15',1);assert.ok(!r.error,r.error);assert.equal(r.state.fellows.hero_15.aptitude,apt+1);assert.equal(r.state.inventory.Item_Talent_Hero_1,0)});
test('shop exact daily budgets, inventory room, unknown items and insufficient coins',()=>{let s=complete('fine');for(let i=0;i<20;i++)s=run(s,'banquetBuy','Item_GetCE_10',5);assert.equal(s.banquets.shop.bought.Item_GetCE_10,100);assert.ok(act(s,'banquetBuy',s.lastAt,'Item_GetCE_10',{seq:s.banquets.seq,quantity:1}).error);s=settle(s,86400001);s=run(s,'banquetBuy','Item_GetCE_10',1);assert.equal(s.banquets.shop.bought.Item_GetCE_10,1);s.inventory.gift2=1e6;assert.ok(act(s,'banquetBuy',s.lastAt,'gift2',{seq:s.banquets.seq,quantity:1}).error);assert.ok(act(s,'banquetBuy',s.lastAt,'not-an-item',{seq:s.banquets.seq,quantity:1}).error);s.banquets.coins=0;assert.ok(act(s,'banquetBuy',s.lastAt,BANQUET_SHOP[0].id,{seq:s.banquets.seq,quantity:1}).error)});
test('legacy Ceremony payload and other inventory remain intact; malformed runs and double receipts reject',()=>{let s=fresh(1000);s.ceremony={coins:42,inventory:{Item_Ceremony_01:7}};const old=structuredClone(s);s={...s,banquets:{...banquetState(s),pantry:{Item_Ceremony_01:1,Item_Ceremony_02:1}}};s=run(s,'banquetHost','wine');assert.deepEqual(s.ceremony,old.ceremony);assert.deepEqual(s.inventory,old.inventory);for(const edit of [b=>b.policyVersion=2,b=>b.run.guestMode='real',b=>b.run.intervalMs=0,b=>b.run.paid.fake=1,b=>b.run.startedAt=s.lastAt+1,b=>b.pantry.fake=1]){const bad=structuredClone(s);edit(bad.banquets);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)))}const done=complete('wine');done.banquets.history.push({...done.banquets.history[0]});assert.equal(valid(done),false)});
test('failed completion write preserves paid run and retries reward exactly once',()=>{let s=settle(hosting(),21000),raw=JSON.stringify(s),full=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(full)throw Error('quota');raw=v}}));p.load(21000);const id=s.banquets.run.id;full=true;assert.throws(()=>p.commit(run(p.current,'banquetClaim',id)));assert.ok(p.current.banquets.run);assert.equal(p.current.banquets.coins,0);full=false;p.load(21000);p.commit(run(p.current,'banquetClaim',id));assert.equal(decode(raw).banquets.coins,400);assert.equal(decode(raw).banquets.history.length,1)});
test('failed hosting write leaves supplies intact; historical guest rewards are not repriced',()=>{let s=stocked('wine'),raw=JSON.stringify(s),full=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(full)throw Error('quota');raw=v}}));p.load(1000);full=true;assert.throws(()=>p.commit(run(p.current,'banquetHost','wine')));assert.equal(p.current.banquets.pantry.Item_Ceremony_01,1);full=false;p.load(1000);p.commit(run(p.current,'banquetHost','wine'));s=p.current;s.banquets.run.coinsPerGuest=99;s=settle(s,21000);s=run(s,'banquetClaim',s.banquets.run.id);assert.equal(s.banquets.coins,396);assert.equal(s.banquets.history[0].coinsPerGuest,99)});

// Coverage guard for the two shipped parties. Until 2026-09-15 their only provenance was a
// community wiki page marked "not version matched"; measured against the original's Ceremony table
// both are exact, and this pins them so a future edit cannot quietly drift the seats or the
// materials the pantry, the shop prices and every stored receipt all rest on.
// The base game has FOUR ceremonies, not the six rows in Ceremony.json: CeremonyPkg row 1 lists
// allowCeremonys [1,2,4,5], and 101/102 belong to the FE01 festival package.
const CEREMONY_SOURCE={
 '4':{participantsNom:4,openingCost:['Item_Ceremony_01','Item_Ceremony_02']},
 '5':{participantsNom:8,openingCost:['Item_Ceremony_03','Item_Ceremony_04']},
};
const auditParties=parties=>{
 if(parties.length!==2)return 'Everkai ships the two material-hosted ceremonies, 4 and 5';
 for(const p of parties){
  const src=CEREMONY_SOURCE[p.sourceCeremony];
  if(!src)return `party ${p.id} does not name a base Ceremony row`;
  if(p.seats!==src.participantsNom)return `party ${p.id} seats ${p.seats} disagree with Ceremony ${p.sourceCeremony} participantsNom ${src.participantsNom}`;
  if(p.materials.length!==src.openingCost.length||p.materials.some((m,i)=>m!==src.openingCost[i]))return `party ${p.id} materials disagree with Ceremony ${p.sourceCeremony} openingCost`;
 }
 if(new Set(parties.map(p=>p.sourceCeremony)).size!==2)return 'both parties map to the same Ceremony row';
 return null;
};
test('both banquet parties match their Ceremony rows, and the guard catches seat and material drift',()=>{
 assert.equal(auditParties(BANQUET_PARTIES),null);
 assert.deepEqual(BANQUET_PARTIES.map(p=>p.sourceCeremony),['4','5']);
 // Negative controls: every one of these shipped silently before this guard existed.
 const clone=()=>structuredClone(BANQUET_PARTIES);
 const breaks=[
  [ps=>{ps[1].seats=12;return ps},/seats 12 disagree/,'inflated seats pay 12 guests a banquet'],
  [ps=>{ps[0].seats=8;return ps},/seats 8 disagree/,'a 4-seat party silently doubled'],
  [ps=>{ps[0].materials=['Item_Ceremony_03','Item_Ceremony_04'];return ps},/materials disagree/,'swapped materials'],
  [ps=>{ps[0].materials=['Item_Ceremony_01'];return ps},/materials disagree/,'a dropped material makes hosting cheaper'],
  [ps=>{ps[1].sourceCeremony='4';return ps},/seats 8 disagree/,'a party pointed at the wrong source row'],
  [ps=>{ps[0].sourceCeremony='101';return ps},/does not name a base Ceremony row/,'a festival-package row passed off as base game'],
  [ps=>ps.slice(0,1),/ships the two material-hosted/,'a dropped party'],
 ];
 for(const [mutate,pattern,why] of breaks){const got=auditParties(mutate(clone()));assert.ok(got,`${why} must be caught`);assert.match(got,pattern,why);}
});
