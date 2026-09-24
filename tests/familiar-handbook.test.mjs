import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {bondedPower,powerParts} from '../lib/adventure.mjs';
import {TYPE_COUNTRY} from '../lib/hero-scope.mjs';
import {HANDBOOK,HANDBOOK_MAX,HANDBOOK_EXP,HANDBOOK_COEF,HANDBOOK_TOTAL,COUNTRY_TYPE,familiarGrade,familiarBookEXP,
 handbookState,handbookLevel,handbookPending,handbookClaimable,handbookBonus,handbookPowerBP,handbookRungs,
 validFamiliarHandbook} from '../lib/familiar-handbook.mjs';

const T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,t=null,now=s.lastAt)=>{const r=act(s,a,now,t);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),`invalid after ${a}`);return r.state};

// ---------------------------------------------------------------------------------------------
// Coverage guard for the imported table, and the constancy that is the finding (CLAUDE.md rule 6).
// ---------------------------------------------------------------------------------------------
test('PetBookLevel is 300 flat rungs: one cost, one coefficient, and the country cycling one per level',()=>{
 assert.equal(HANDBOOK_MAX,300);
 assert.equal(HANDBOOK_EXP,100,'every level costs the same 100 -- this is not a curve');
 assert.equal(HANDBOOK_COEF,500,'500 basis points = +5%, the same on every rung');
 assert.equal(HANDBOOK_TOTAL,30000);
 assert.equal(HANDBOOK.countries.length,300);
 // THE CORRECTION this import carries: familiar-data-inventory.md §2 recorded the country as cycling
 // "in blocks of 60 rows". It is one country per LEVEL. A blocked reading would have built a
 // Compendium whose first sixty rungs all paid Inspiring; the capture's first five rungs are
 // Inspiring, Diligent, Brave, Informed, Unfettered, and this is why.
 assert.deepEqual(HANDBOOK.countries.slice(0,10),[1,2,3,4,5,1,2,3,4,5]);
 const runs=[];for(const c of HANDBOOK.countries){const last=runs[runs.length-1];if(last&&last[0]===c)last[1]++;else runs.push([c,1]);}
 assert.equal(runs.length,300,'300 runs of length 1, not 5 blocks of 60');
 // Each type still collects 60 of the 300 levels, so the ceiling is unchanged by the interleaving.
 const counts={};for(const c of HANDBOOK.countries)counts[c]=(counts[c]||0)+1;
 assert.deepEqual(counts,{1:60,2:60,3:60,4:60,5:60});
 assert.deepEqual(handbookRungs().slice(0,5).map(r=>`${r.level}:${r.type}`),
  ['1:Inspiring','2:Diligent','3:Brave','4:Informed','5:Unfettered'],'img/handbook-book-level.png, verbatim');
 // And the five type names round-trip through the join Everkai already owned.
 for(const [type,country] of Object.entries(TYPE_COUNTRY))assert.equal(COUNTRY_TYPE[country],type);
});

test('the EXP badge is NewPetBookEXP[grade] + stars x PetStar.BookEXP[grade], and the SP table adds again',()=>{
 assert.deepEqual(HANDBOOK.ownEXP,{1:10,2:20,3:50,4:100,5:400,9:200});
 assert.deepEqual(HANDBOOK.spEXP,HANDBOOK.ownEXP,'the SP table is documented as identical');
 assert.deepEqual(HANDBOOK.starEXP,{1:1,2:2,3:5,4:10,5:40,9:20});
 // The spec's cross-check, derived from the config and corroborated by the capture rather than read
 // off it: a grade-4 familiar at 5 stars reads 150, and at 0 stars reads 100.
 const ssr=FAMILIARS.find(p=>familiarGrade(p.id)===4);
 assert.ok(ssr,'a grade-4 familiar exists');
 assert.equal(familiarBookEXP(ssr.id,{level:1,stars:0}),100);
 assert.equal(familiarBookEXP(ssr.id,{level:249,stars:5}),150);
 assert.equal(familiarBookEXP(ssr.id,{level:1,stars:0},true),200,'a shining variant pays the SP table again');
 assert.equal(familiarBookEXP(ssr.id,null),0,'a familiar you do not own is worth nothing');
 // Every familiar resolves to one of the six grades -- including the one Everkai carries that the
 // original does not, which falls back to its rarity name rather than throwing.
 for(const p of FAMILIARS)assert.ok(String(familiarGrade(p.id)) in HANDBOOK.ownEXP,`${p.id} has no grade`);
 assert.equal(familiarGrade('Pet_8041505'),5,"Everkai's own UR familiar takes the UR band");
});

// ---------------------------------------------------------------------------------------------
// The claim loop, and the level that rises on its own.
// ---------------------------------------------------------------------------------------------
test('claiming banks each familiar once, re-claims only what stars have since added, and levels automatically',()=>{
 let s=fresh(T);
 assert.equal(handbookClaimable(s),0,'a village with no familiars has nothing to claim');
 assert.match(act(s,'handbookClaimAll',T).error,/No Compendium EXP/);
 s=at(s,'adoptFamiliars');
 const first=handbookClaimable(s);
 assert.equal(first,FAMILIARS.reduce((n,p)=>n+familiarBookEXP(p.id,s.familiars[p.id]),0));
 s=at(s,'handbookClaimAll');
 assert.equal(handbookClaimable(s),0,'nothing is claimable twice');
 assert.equal(handbookState(s).exp,first);
 assert.equal(handbookLevel(handbookState(s).exp),Math.floor(first/HANDBOOK_EXP));
 // Stars keep rising after the first claim, so the badge is a DIFFERENCE, not a boolean.
 const id=FAMILIARS[0].id,worth=HANDBOOK.starEXP[String(familiarGrade(id))];
 s={...s,familiars:{...s.familiars,[id]:{...s.familiars[id],stars:3}}};
 assert.ok(valid(s));
 assert.equal(handbookPending(s,id),3*worth,'three new stars are worth three stars, not a whole familiar again');
 const before=handbookState(s).exp;
 s=at(s,'handbookClaim',id);
 assert.equal(handbookState(s).exp,before+3*worth);
 assert.equal(handbookPending(s,id),0);
 // There is no level-up control anywhere, by design (§3: the (i) says the level rises automatically).
 assert.throws(()=>act(s,'handbookLevelUp',T,null),/Unknown action/,'there is no level-up control, by design');
});

test('the Compendium raises Power on Fellows of the rung’s type, and only those',()=>{
 let s=at(fresh(T),'adoptFamiliars');
 const id=Object.keys(s.fellows)[0];
 const base=bondedPower(s,id);
 assert.equal(handbookPowerBP(s,id),0,'a village that has claimed nothing gets nothing');
 s=at(s,'handbookClaimAll');
 const bonus=handbookBonus(s);
 // Rung 1 pays Inspiring, so at level 1 exactly one type is up and the other four are flat.
 const one={familiarHandbook:{exp:HANDBOOK_EXP,claimed:{}},familiars:s.familiars,familiarExplore:s.familiarExplore};
 assert.deepEqual(handbookBonus(one),{Inspiring:500,Diligent:0,Brave:0,Informed:0,Unfettered:0});
 assert.ok(Object.values(bonus).every(v=>v>0),'a full sweep of the roster reaches every type');
 assert.ok(bondedPower(s,id)>base,'and a Fellow of a bonused type is stronger for it');
 // The term is a percentage bonus, which is the row the Fellow Power Details dialog already names.
 assert.equal(powerParts(s,id).percent.compendium,handbookPowerBP(s,id));
 // The ceiling, both halves from the config set (rule 1): 60 levels x 500 bp to each of five types.
 const max={familiarHandbook:{exp:HANDBOOK_TOTAL,claimed:{}}};
 assert.deepEqual(handbookBonus(max),{Inspiring:30000,Diligent:30000,Brave:30000,Informed:30000,Unfettered:30000});
});

// ---------------------------------------------------------------------------------------------
test('NEGATIVE CONTROL: the validator refuses hand-edited Compendium state, and old saves still load',()=>{
 let s=at(at(fresh(T),'adoptFamiliars'),'handbookClaimAll');
 const h=handbookState(s),id=FAMILIARS[0].id;
 const bad=(x,why)=>assert.equal(validFamiliarHandbook({...s,familiarHandbook:x}),false,why);
 bad({...h,exp:h.exp+100},'EXP that no badge paid for');
 bad({...h,exp:HANDBOOK_TOTAL+1},'EXP past the ceiling');
 bad({...h,exp:1.5},'fractional EXP');
 bad({...h,claimed:{...h.claimed,[id]:h.claimed[id]+1}},'more banked for a familiar than it is worth');
 bad({...h,claimed:{...h.claimed,Pet_not_real:10}},'a familiar that does not exist');
 bad({exp:h.exp},'a missing claimed ledger');
 bad({...h,extra:1},'an extra field');
 // The bar IS the sum of the badges: dropping a ledger entry without dropping its EXP is refused.
 const dropped={...h.claimed};delete dropped[id];
 bad({...h,claimed:dropped},'a ledger that no longer sums to the bar');
 assert.equal(valid({...s,familiarHandbook:{...h,exp:h.exp+100}}),false,'valid() carries the refusal');
 assert.ok(validFamiliarHandbook(fresh(T)),'a save with no Compendium key is fine');
 // RULE 12. A save from before this table existed has no key, so its level is 0, its bonus is 0 and
 // every Power it ever recorded is unchanged. That is why this can ship without a SAVE_VERSION bump.
 const old=at(fresh(T),'adoptFamiliars');
 delete old.familiarHandbook;
 const reloaded=decode(JSON.stringify(old));
 assert.equal(reloaded.familiarHandbook,undefined);
 assert.equal(handbookPowerBP(reloaded,Object.keys(reloaded.fellows)[0]),0);
 assert.equal(bondedPower(reloaded,Object.keys(reloaded.fellows)[0]),bondedPower(old,Object.keys(old.fellows)[0]));
});
