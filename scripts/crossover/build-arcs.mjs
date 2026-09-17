// Generates lib/crossover-arc-data.json from lib/crossover-roster-data.json.
//
// The grouping rule is mechanical on purpose (docs/crossover-storyline-plan.md section 3.1): arc n of a
// franchise holds ranks 5n-4 .. 5n of the owner's rank order, so his most wanted arrive first and
// "which arc is this character in" is a one-line calculation a test can re-derive. Taste would put his
// rank-40 pick in arc 2. Run it with:
//
//   node scripts/crossover/build-arcs.mjs          # write lib/crossover-arc-data.json
//   node scripts/crossover/build-arcs.mjs --check  # fail if the shipped file is not what this emits
//
// The arc names, the one-line situations and the 163 stage titles below are the WRITING, and they live
// here rather than in the generated file so that regenerating cannot invent prose and hand-editing the
// generated file cannot survive a rebuild. Every line is a situation in the village. No franchise plot
// is retold and no franchise text is copied -- see docs/crossover-plan.md's standing constraints.
import {readFileSync,writeFileSync} from 'node:fs';
import roster from '../../lib/crossover-roster-data.json' with {type:'json'};

/** Completions per stage by arc tier. The owner halved the planned 20/40/60 to these (decision 2 of
 *  docs/crossover-plan.md: "faster -- about two months"). All three are LOCAL numbers. Tier 1 lands on
 *  10, the same as the eight Isekai arcs, which is a coincidence of the halving and not a shared
 *  constant: each arc carries its own costPerStage in the data. */
export const TIER_COST={1:10,2:20,3:30};
/** Arcs 1-4 of a franchise are tier 1, arcs 5-10 tier 2, arcs 11+ tier 3. */
export const tierOf=arcNumber=>arcNumber<=4?1:arcNumber<=10?2:3;
export const STAGES_PER_ARC=5;

const ARC_TEXT=[
['XoverMsf01','Rooftop Watch','Something is moving across the roofs at night, and the watch is one pair of eyes short.',
 ['A light on the eaves','Claws at the woodpile','The shield in the shed','Sparks over the forge','The green in the field']],
['XoverMsf02','The Storm Gate','A summer storm takes the gate off its hinges and the repair needs more than carpenters.',
 ['Thunder on the ridge','The tower lamp lit','Iron in the hinge','The orchard thinned','A chart at the crossroads']],
['XoverMsf03','Lanterns Out','Every lantern on the east lane goes dark in one night, and nobody will say why.',
 ['A name remembered','The kiln at midnight','A story worth coin','Charms on the door','Stones on the border']],
['XoverMsf04','The Long Ward','The clinic fills after the harvest and the village runs out of people to sit up with it.',
 ['The job nobody wanted','Measured twice','The grain store opened','News before the couriers','The coldest shift']],
['XoverMsf05','Quiet Quarter','The oldest quarter has gone quiet, and quiet is not how it used to be.',
 ['Rain before the sky','Trouble two streets away','Both sides satisfied','Stone at first light','The larder counted']],
['XoverMsf06','Kiln and Anvil','The forge, the kiln and the mill all want the same hour of the same morning.',
 ['Post over the ridge','Every oven lit','Who owes whom','Four wrenches at once','Kites where they should not be']],
['XoverMsf07','Night Market','The market starts trading after dark, which suits some traders rather too well.',
 ['What was taken back',"The other side's asking price",'Whose water it is','Singing up the pass','Every comb counted']],
['XoverMsf08','The Seed Vault','The seed store must survive the winter, and something has been getting into it.',
 ['Midnight to dawn','Labelled twice','Springs and small parts','Gloves on the reins','The clumsiest recruit']],
['XoverMsf09','Bells at Dusk','The chapel bell is rung at the wrong hour and the whole lane comes out to argue about it.',
 ['Saplings by the school','Arrows for the range','Post at odd hours','The reading room catalogued','Luck at the card table']],
['XoverMsf10','The Mended Wall','The west wall is patched, badly, and the patch is now the village’s favourite argument.',
 ['The night road turned back','Polite about the rent','Every job at once','Settled in the square','The clock kept true']],
['XoverMsf11','Frost on the Well','Frost reaches the well and the village discovers how many things depend on one bucket.',
 ['The useful thing said','A held temper','The understudy called','The bell from anywhere','Gear sharp and oiled']],
['XoverMsf12','Deep Shaft','The old shaft is reopened for stone and immediately needs stronger backs than the village has.',
 ['A warning worth hearing','The beam carried alone','The cart out of the mud','Immaculate notes','Errands before opening']],
['XoverMsf13','The Signal Fire','A fire is lit on the far hill, and nobody agrees on what answering it commits the village to.',
 ['Never locked out','The round nobody wanted','A meeting without words','The graves tended','The kitchen kept open']],
['XoverMsf14','Salt Road','The salt road washes out and the village has a fortnight to find another way to the coast.',
 ['Every extra shift','The next mistake named','The festival lights','The highest watch','Every lock tested']],
['XoverMsf15','The Hollow Lane','Half the houses on the hollow lane stand empty, and the other half have questions.',
 ['The answer unsoftened','What took the livestock','Drilled for the worst night','The end of the lane','Exactly what he meant']],
['XoverMsf16','Paper Lanterns','The lantern festival is a week away and nothing that should be ready is ready.',
 ['Home before the bell','Done properly or not at all','The shortest route','One point off the record','The room not lost']],
['XoverMsf17','The Cold Kitchen','The inn’s kitchen fire goes out in the coldest week of the year.',
 ['Three words, nothing missed','The paperwork in order','Lamps without a taper','The door nobody goes near','The herb you came for']],
['XoverMsf18','Watch Change','The watch rota is rewritten and half the village finds itself on a shift it did not expect.',
 ['Never out by a sack','The standard carried','The far road reported','The roster nobody can improve','Letters unread on the way']],
['XoverMsf19','Last Light','The last of the summer light goes, and the village takes stock of who stayed.',
 ["A hand’s width a day",'A lantern at the crossroads','The records corrected','What everyone else missed','Wars with no record']],
['XoverSwgoh01','The Cracked Helm','A stranger arrives with broken armour, and the village has to decide what to do with him.',
 ['The watchtower lit','A better deal than she left with','Too fast for most students','Command taken young','A faster road than the map']],
['XoverSwgoh02','Two Lanterns','Two lanterns are left burning at the crossroads all week, and each one means something different.',
 ['The recruit who nearly quit','Advice good for somebody','Indispensable and unwelcome','Patience, taught twice','The pump that never fails']],
['XoverSwgoh03','The Library Steps','The reading room’s steps crack, and the repair uncovers records older than the village.',
 ['The slow lesson','Paid in bread','Apologies for their manners','Both sides heard','The far end of the yard']],
['XoverSwgoh04','Old Debts','A ledger of unpaid favours turns up, and everyone named in it has an explanation.',
 ['Half of them working again','Down only for salt','Winning, and unsatisfied','How the village fails','Two sets of notes']],
['XoverSwgoh05','The Toll Ledger','The road toll is collected twice in one month, and the second collector is a mystery.',
 ['Still proving something','Paid in advance','Every debt on the square','Ruled once','The field walked twice']],
['XoverSwgoh06','Dust and Gears','The mill, the pump and the airship winch fail in the same fortnight.',
 ['Never lost a charge','The elegant form','Several bouts at once','Everyone leaves happy','Careful only about what stays']],
['XoverSwgoh07','The Council Table','The council table is too small for the number of people who now want a seat at it.',
 ['On schedule, to the day','Finished on time','The old banner carried','The hardest ground','Colder when he leaves']],
['XoverSwgoh08','Quiet Signals','Messages start arriving that nobody admits to sending.',
 ['News the couriers missed','Proved right later','What was agreed last time','The tide called early','Checked afterwards']],
['XoverSwgoh09','The Exile’s Bench','The bench by the gate is where the village puts people it has not decided about.',
 ['The scaffold he climbed himself','Older than the years','The chairs put away','Paying something off','The letter of the bargain']],
['XoverSwgoh10','Workshop Sparks','The workshop takes on more work than it can finish and starts recruiting from the lane.',
 ['Never a crew left behind','A wall improved unasked','The route she chose','The note passed at the back','Both errands on time']],
['XoverSwgoh11','The Hidden Landing','A second landing stage is found below the cliff, and it has been used recently.',
 ['Laughing about it by supper','The militia keeps turning up','The room never shown','There before anyone','The answers the watch needed']],
['XoverSwgoh12','Rust and Rain','A month of rain rusts every hinge, latch and blade the village owns.',
 ['The job exactly as instructed','Gone by morning','Every name in the ranks','Getting back up','Staying for the drink']],
['XoverSwgoh13','The Foundling Path','Children start walking the long path to school alone, and the village decides that will not do.',
 ['Credit taken early','The woodland round','Order kept once a night','A careful pace','The question the physician avoided']],
['XoverSwgoh14','Small Hands','The smallest hands in the village turn out to be the ones holding it together.',
 ['Never once raised her voice','Everything on the lane fixed','Catching up faster than expected']],
];

const PREFIX={Marvel:'XoverMsf','Star Wars':'XoverSwgoh'};

export function buildArcs(characters=roster.characters){
 const events=[];
 for(const franchise of ['Marvel','Star Wars']){
  const ranked=characters.filter(c=>c.franchise===franchise).sort((a,b)=>a.rank-b.rank);
  for(let i=0;i<ranked.length;i+=STAGES_PER_ARC){
   const block=ranked.slice(i,i+STAGES_PER_ARC),n=i/STAGES_PER_ARC+1;
   const id=PREFIX[franchise]+String(n).padStart(2,'0');
   const written=ARC_TEXT.find(t=>t[0]===id);
   if(!written)throw new Error('no written text for '+id);
   const [,name,situation,titles]=written;
   if(titles.length!==block.length)throw new Error(`${id}: ${titles.length} stage titles for ${block.length} characters`);
   events.push({id,name,franchise,situation,flag:'crossover',tier:tierOf(n),costPerStage:TIER_COST[tierOf(n)],
    cast:block.map(c=>({id:c.id,name:c.character,kind:c.kind==='family'?'Family':'Fellow',title:c.title,label:c.character})),
    stages:block.map((c,k)=>({step:k+1,member:c.id,kind:c.kind,title:titles[k]}))});
  }
 }
 return events;
}

const file=new URL('../../lib/crossover-arc-data.json',import.meta.url);
export const arcFileText=()=>JSON.stringify({
 policy:'GENERATED by scripts/crossover/build-arcs.mjs from lib/crossover-roster-data.json. Do not edit by hand: a rebuild overwrites it, and tests/crossover-arcs.test.mjs re-derives the grouping from the roster file. Kept separate from lib/event-data.json so the eight Isekai arcs -- whose names, cast and costPerStage:10 are APK-derived and save-critical (CLAUDE.md rule 12) -- stay byte-identical while these 33 are regenerated.',
 localNumbers:'Stage costs are LOCAL: tier 1 = 10 completions, tier 2 = 20, tier 3 = 30 (the owner halved the planned 20/40/60). 163 stages cost 3,490 completions all told. Arc names, situations and stage titles are written for Everkai; no franchise plot is retold.',
 flag:'crossover',
 tiers:TIER_COST,
 events:buildArcs()},null,1)+'\n';

if(process.argv[1]===new URL(import.meta.url).pathname){
 const text=arcFileText();
 if(process.argv.includes('--check')){
  const have=readFileSync(file,'utf8');
  if(have!==text){console.error('lib/crossover-arc-data.json is not what build-arcs.mjs emits');process.exit(1)}
  console.log('lib/crossover-arc-data.json matches the generator');
 }else{
  writeFileSync(file,text);
  const events=buildArcs();
  console.log(`${events.length} arcs, ${events.reduce((n,e)=>n+e.stages.length,0)} stages, ${events.reduce((n,e)=>n+e.stages.length*e.costPerStage,0)} completions`);
 }
}
