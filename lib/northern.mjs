import data from './northern-data.json' with {type:'json'};
import {bondedPower} from './adventure.mjs';
export const NORTH=data.localRules;
const HOUR=3600000,CAP=12,LIMIT=10000;
const int=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export const northern=s=>s.northern||{policyVersion:1,seq:0,supplies:12,recoverAt:null,coins:0,atkXP:0,hpXP:0,atkLevel:0,hpLevel:0,consumed:0,run:null,history:[],exchanges:[]};
export function northernSupplies(s){const n=northern(s);if(n.recoverAt===null||s.lastAt<n.recoverAt)return {supplies:n.supplies,recoverAt:n.recoverAt};const count=1+Math.floor((s.lastAt-n.recoverAt)/HOUR),supplies=Math.min(CAP,n.supplies+count);return {supplies,recoverAt:supplies===CAP?null:n.recoverAt+count*HOUR};}
export function northernStats(s){const n=northern(s),power=Object.keys(s.fellows).reduce((v,id)=>v+bondedPower(s,id),0);return {power,atk:Math.min(200,Math.max(2,Math.floor(Math.sqrt(power)/5)))+n.atkLevel,maxHP:30+5*n.hpLevel};}
const room=floor=>({floor,tiles:Array(9).fill(false),monsterHP:floor*6,hits:0});
export const tileKind=i=>['camp','cache','heal','cache','monster','camp','cache','heal','exit'][i];
export const activeRoom=r=>r.rooms.at(-1);
export const floorReady=r=>activeRoom(r).tiles.slice(0,8).every(Boolean);
const validRun=(r,s)=>{
 if(!r||r.policyVersion!==1||!int(r.id)||!int(r.startedAt,Number.MAX_SAFE_INTEGER)||r.startedAt>s.lastAt||!int(r.power,1e15)||!int(r.atk,210)||r.atk<2||!int(r.maxHP,80)||r.maxHP<30||!int(r.hp,r.maxHP)||!Array.isArray(r.rooms)||!r.rooms.length||r.rooms.length>3||r.paid!==r.rooms.length||!['exploring','gate','lost','cleared'].includes(r.status))return false;
 let coins=0,xp=0;
 for(let j=0;j<r.rooms.length;j++){const q=r.rooms[j];if(!q||q.floor!==j+1||!Array.isArray(q.tiles)||q.tiles.length!==9||q.tiles.some(v=>typeof v!=='boolean')||!int(q.hits,100)||!int(q.monsterHP,6*q.floor)||q.monsterHP!==Math.max(0,6*q.floor-q.hits*r.atk)||q.tiles[4]!== (q.monsterHP===0)||q.hits>Math.ceil(6*q.floor/r.atk)||q.tiles[8]&&!q.tiles.slice(0,8).every(Boolean)||j<r.rooms.length-1&&!q.tiles[8])return false;
 coins+=[1,3,6].filter(i=>q.tiles[i]).length*5;xp+=[0,5].filter(i=>q.tiles[i]).length*2;
 }
 const end=activeRoom(r).tiles[8];return r.coins===coins&&r.atkXP===xp&&r.hpXP===xp&&(r.status==='lost'?r.hp===0:r.hp>0)&&(r.status==='cleared'?end&&r.rooms.length===3:r.status==='gate'?end&&r.rooms.length<3:!end);
};
export function validNorthern(s){if(s?.northern===undefined)return true;const n=s.northern;if(!n||n.policyVersion!==1||!int(n.seq)||!int(n.supplies,12)||(n.recoverAt!==null&&(!int(n.recoverAt,Number.MAX_SAFE_INTEGER)||n.supplies===12))||n.supplies<12&&n.recoverAt===null||!int(n.coins)||!int(n.atkXP)||!int(n.hpXP)||!int(n.atkLevel,10)||!int(n.hpLevel,10)||!int(n.consumed,30000)||!Array.isArray(n.history)||n.history.length>LIMIT||!Array.isArray(n.exchanges)||n.exchanges.length>LIMIT)return false;
 const ids=new Set();let paid=0,earned=0,axp=0,hxp=0,spent=0;
 for(const r of n.history){if(!validRun(r,s)||r.id>n.seq||ids.has(r.id)||!int(r.finishedAt,Number.MAX_SAFE_INTEGER)||r.finishedAt<r.startedAt||r.finishedAt>s.lastAt||!['returned','lost','cleared'].includes(r.outcome)||r.outcome==='lost'&&r.status!=='lost'||r.outcome==='cleared'&&r.status!=='cleared'||r.outcome==='returned'&&!['exploring','gate'].includes(r.status)||r.banked!==(r.outcome==='lost'?0:r.coins+(r.outcome==='cleared'?20:0)))return false;ids.add(r.id);paid+=r.paid;earned+=r.banked;axp+=r.atkXP;hxp+=r.hpXP;}
 if(n.run!==null){if(!validRun(n.run,s)||n.run.id>n.seq||ids.has(n.run.id))return false;paid+=n.run.paid;}
 const exchangeIds=new Set();for(const x of n.exchanges){if(!x||!int(x.id)||x.id>n.seq||exchangeIds.has(x.id)||x.itemId!==NORTH.exchangeItem||x.count!==1||x.paid!==30||!int(x.at,Number.MAX_SAFE_INTEGER)||x.at>s.lastAt)return false;exchangeIds.add(x.id);spent+=x.paid;}
 return paid===n.consumed&&earned-spent===n.coins&&axp-2*n.atkLevel===n.atkXP&&hxp-2*n.hpLevel===n.hpXP;
}
export function northernAction(s,action,target,value){if(!['northSupply','northStart','northTile','northAttack','northNext','northFinish','northTrain','northExchange'].includes(action))return null;const old=northern(s),fail=error=>({state:s,error});if(value?.seq!==old.seq||old.seq>=1e9)return fail('The expedition changed. Use current controls.');const n={...old,...northernSupplies(s),seq:old.seq+1},done=message=>({state:{...s,northern:n},message});
 const spend=()=>{n.supplies--;n.consumed++;if(n.recoverAt===null)n.recoverAt=s.lastAt+HOUR;};
 if(action==='northSupply'){if(n.supplies===12)return fail('Supplies are already full.');n.supplies=12;n.recoverAt=null;return done('Supplies prepared · free sandbox.');}
 if(action==='northTrain'){if(n.run)return fail('Return from your expedition before training.');if(!['atk','hp'].includes(target))return fail('Choose ATK or HP training.');const xp=target+'XP',level=target+'Level';if(n[xp]<2||n[level]>=10)return fail('Training needs 2 earned experience and an available level.');n[xp]-=2;n[level]++;return done('Training saved · applies to your next expedition.');}
 if(action==='northExchange'){if(n.coins<30||s.inventory[NORTH.exchangeItem]>=1e6||n.exchanges.length>=LIMIT)return fail('Need 30 expedition coins and Bag/receipt space.');n.coins-=30;n.exchanges=[...n.exchanges,{id:n.seq,itemId:NORTH.exchangeItem,count:1,paid:30,at:s.lastAt}];return {state:{...s,northern:n,inventory:{...s.inventory,[NORTH.exchangeItem]:s.inventory[NORTH.exchangeItem]+1}},message:'Exchanged 30 expedition coins for a Basic Earnings Card · local reward.'};}
 if(action==='northStart'){if(n.run||n.supplies<1||n.history.length>=LIMIT)return fail('Need one Supply and room for a new expedition record.');const stats=northernStats(s);spend();n.run={policyVersion:1,id:n.seq,startedAt:s.lastAt,...stats,hp:stats.maxHP,paid:1,rooms:[room(1)],coins:0,atkXP:0,hpXP:0,status:'exploring'};return done('Expedition saved · local map and balance.');}
 if(!n.run||value.runId!==n.run.id)return fail('Choose your current saved expedition.');const r=structuredClone(n.run);n.run=r;const q=activeRoom(r);
 if(action==='northFinish'){const outcome=r.status==='lost'?'lost':r.status==='cleared'?'cleared':'returned',banked=outcome==='lost'?0:r.coins+(outcome==='cleared'?20:0);if(n.coins+banked>1e9||n.atkXP+r.atkXP>1e9||n.hpXP+r.hpXP>1e9||n.history.length>=LIMIT)return fail('Reward storage is full. Expedition retained.');n.coins+=banked;n.atkXP+=r.atkXP;n.hpXP+=r.hpXP;n.history=[...n.history,{...r,outcome,banked,finishedAt:s.lastAt}];n.run=null;return done(`${outcome==='lost'?'Rescued':outcome==='cleared'?'Expedition cleared':'Returned'} · ${banked} coins · ${r.atkXP} ATK XP · ${r.hpXP} HP XP.`);}
 if(action==='northNext'){if(r.status!=='gate'||n.supplies<1)return fail('Reach the signpost and prepare one Supply first.');spend();r.paid++;r.rooms.push(room(r.rooms.length+1));r.status='exploring';return done('Entered the next floor · one Supply spent.');}
 if(r.status!=='exploring')return fail('This expedition is ready to finish or continue.');
 if(action==='northAttack'){if(q.tiles[4]||q.monsterHP<=0)return fail('The ice beast is already defeated.');q.hits++;q.monsterHP=Math.max(0,q.monsterHP-r.atk);q.tiles[4]=q.monsterHP===0;r.hp=Math.max(0,r.hp-(q.floor+1));if(!r.hp)r.status='lost';return done(r.hp?`Ice beast ${q.monsterHP} HP · expedition ${r.hp} HP.`:'Expedition ended. Return to bank learned XP; expedition coins are lost.');}
 if(!Number.isSafeInteger(target)||target<0||target>8||q.tiles[target]||target===4)return fail('Choose an unexplored tile or attack the ice beast.');if(target===8&&!floorReady(r))return fail('Resolve the other eight tiles before using the signpost.');q.tiles[target]=true;
 const kind=tileKind(target);if(kind==='camp'){r.atkXP+=2;r.hpXP+=2;}if(kind==='cache')r.coins+=5;if(kind==='heal')r.hp=Math.min(r.maxHP,r.hp+10);if(kind==='exit')r.status=q.floor===3?'cleared':'gate';return done(kind==='exit'?'Signpost reached. Return safely or continue.':kind==='camp'?'Learned 2 ATK XP and 2 HP XP. Bank them by returning.':kind==='cache'?'Found 5 expedition coins.':`Restored HP · ${r.hp}/${r.maxHP}.`);
}
