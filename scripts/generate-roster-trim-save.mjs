// Regenerates tests/roster-trim-save-a0efe2b-invested.json.
//
// THIS SCRIPT ONLY RUNS AGAINST a0efe2b OR EARLIER -- the build BEFORE the owner's 2026-09-17 roster
// trim. That is the whole point (CLAUDE.md rule 12): it builds, with the previous build's catalogue, a
// village that owns several of the 48 Fellows the trim deletes and has really invested in them, so the
// trimmed build can be asked to decode a save it could never create. Against the current build it stops
// at the first `recruit`, because those Fellows are no longer in the catalogue.
//
//   git archive a0efe2b | tar -x -C <dir> && cd <dir>
//   node scripts/generate-roster-trim-save.mjs <out.json>
//
// Every value in the fixture comes from an actual action; nothing is hand-written.
import {fresh,act,valid} from '../lib/game.mjs';
import {newFellow} from '../lib/adventure.mjs';
import {summonState} from '../lib/summon.mjs';
import {BUSINESSES,businessCost} from '../lib/businesses.mjs';
import {writeFileSync} from 'node:fs';
import {stockOriginal,grantFragments} from '../tests/progression-helpers.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {completionsEarned} from '../lib/events.mjs';

const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null,at=null)=>{const r=act(s,a,at??s.lastAt,t,v);if(r.error)throw Error(`${a} ${t??''}: ${r.error}`);if(!valid(r.state))throw Error(`${a} ${t??''} left an invalid village`);return r.state};

let s=fresh(T);
s={...s,gold:s.gold+BUSINESSES.reduce((n,b)=>n+(businessCost(b.id)||0),0)};
s=run(s,'activateOriginalProgression');

// The removed Fellows this village owns. hero_52 (Angie) is the only one of the 48 with a Stella curve,
// so she carries that track; the rest carry levels, quality, breaks, skill, stars and an artifact.
const OWNED=['hero_52','hero_105','hero_102','hero_2','hero_13'];
// hero_102 arrives through the Fountain, paid for in Acquaint Stones, so the release has a priced
// receipt to hand back; the rest join through the ordinary counter.
s={...s,fountain:{policyVersion:1,seq:0,seed:123456789,bottles:0,total:0,ledger:{Lottery_4:10},history:[],recruited:[]}};
s=run(s,'wishRecruit','hero_102',{seq:0});
for(const id of OWNED.filter(id=>id!=='hero_102'))s=run(s,'recruit',id);
s=run(s,'welcome','wife_2');
s=run(s,'welcome','wife_1');

// Stock every pool the investments draw on, then record what was held BEFORE any of it was spent.
s={...s,fellowXP:s.fellowXP+5e7,
 inventory:{...s.inventory,local_skill_scroll:400,local_limit_token:200,Item_Talent_Hero_1:900,Item_Weapon_Equipment_1_1:1,Item_Quenching_Equipment_1:10},
 summon:{...summonState(s),starShards:5000},
 artifacts:{ore:50000,bag:{}},
 };
s=stockOriginal(s,60);
s=grantFragments(s,'hero_52',4);
if(!valid(s))throw Error('stocking left an invalid village');

for(const id of OWNED){
 s=run(s,'train',id,'max');
 s=run(s,'originalQuality',id);
 s=run(s,'train',id,'max');
 s=run(s,'fellowSkill',id);s=run(s,'fellowSkill',id);s=run(s,'fellowSkill',id);
 s=run(s,'summonStar',id,{seq:summonState(s).seq});
 s=run(s,'summonStar',id,{seq:summonState(s).seq});
 s=run(s,'aptitude',id,5);
}
// One of them also carries an equipped, Ore-upgraded artifact, and one carries Stella levels.
s=run(s,'equip','hero_105','Item_Weapon_Equipment_1_1');
s=run(s,'upgradeArtifact','hero_105');
s=run(s,'stellaActivate','hero_52',{seq:s.stella.seq});
s=run(s,'stellaUpgrade','hero_52',{seq:s.stella.seq,count:5});

// Costumes about to be removed, on characters that stay AND on characters that go.
// H105C1 and H2C1 belong to deleted Fellows; W1C1 is a removed costume on a Family member who STAYS;
// W2C1 is a costume that survives the trim and must come through untouched.
for(const c of ['H105C1','H2C1','W1C1','W2C1'])s=run(s,'wardrobeCollect',c);
s=run(s,'wardrobeEquip','hero_105','H105C1');
s=run(s,'wardrobeEquip','wife_1','W1C1');
s=run(s,'wardrobeEquip','wife_2','W2C1');

// ...and one acquaintance who SURVIVES the trim, whose receipt and stones must not move.
s=run(s,'wishRecruit','hero_104',{seq:s.fountain.seq});
if(!valid(s))throw Error('fountain left an invalid village');

// An Isekai arc, claimed past a stage whose member the trim deletes. DanMachi stage 1 is hero_167
// (Bell Cranel, deleted); stages 2-4 are kept. Habit completions are the currency, so they are earned.
s={...s,habits:starterHabits(T)};
for(let day=0;completionsEarned(s)<40&&day<400;day++){
 const at=T+day*86400000;
 for(const h of s.habits.items.filter(x=>x.freq==='daily')){
  if(completionsEarned(s)>=40)break;
  const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
 }
}
if(completionsEarned(s)<40)throw Error('fixture earned only '+completionsEarned(s)+' completions');
if(!valid(s))throw Error('habits left an invalid village');
for(let i=0;i<4;i++)s=run(s,'eventClaim','DanMachi');

// ...and they are doing things in the village: working a building and standing in the party.
s=run(s,'unlock','garden');
s=run(s,'assign','garden','hero_105');
s=run(s,'party','hero_2');s=run(s,'party','hero_13');

if(!valid(s))throw Error('the finished village is not valid');
writeFileSync(process.argv[2],JSON.stringify(s));
console.log('fellows',Object.keys(s.fellows).length,'events',JSON.stringify(s.events),'stella stock',JSON.stringify(s.stella.stock));
