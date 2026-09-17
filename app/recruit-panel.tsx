import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import RosterPicker from './roster-picker';
import {FELLOWS,FAMILY} from '@/lib/catalog.mjs';
import {summonState,recruitPrice,RANK_FELLOWS,CURRENCY_NAMES,STONE_FRAGMENTS_PER_STONE,INSIGNIA_FRAGMENTS_PER_INSIGNIA,SUMMON_KINDS,summonDay,weekStartDay,WEEK_DAYS_FOR_BONUS,WEEK_AREAS_FOR_BONUS,STONE_FRAGMENTS_PER_DAILY,STONE_FRAGMENTS_DAILY_CAP,PERFECT_DAY_BONUS} from '@/lib/summon.mjs';
import {habitEarnings} from '@/lib/habits.mjs';
import {isAddition} from '@/lib/everkai-additions.mjs';
import {unlockEvent} from '@/lib/events.mjs';

/** rarityIcon has no sprite for a chain like "SSR -> UR", and the price comes from the head anyway. */
const head=(rarity:string)=>String(rarity||'').split(' ->')[0].trim();
/** Everkai additions are not sold here (lib/summon.mjs recruitPrice). The counter has to say what the
 *  route actually is, or 163 characters read as "No price recorded", which looks like a data fault. */
const storyLabel=(id:string)=>isAddition(id)?`Story · ${unlockEvent(id)?.name??'not in an arc yet'}`:null;
const priceLabel=(id:string)=>{if(RANK_FELLOWS.has(id))return `Rank ${RANK_FELLOWS.get(id)}`;
 const story=storyLabel(id);if(story)return story;
 const c=recruitPrice(id);if(!c)return 'No price recorded';
 const [currency,amount]=Object.entries(c)[0] as [string,number];
 if(!amount)return 'Free';
 return `${amount} ${CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}`;};

export default function RecruitPanel({game,action,locked}:any){
 const [tab,setTab]=useState<'fellows'|'family'>('fellows');
 const [selected,setSelected]=useState<string|null>(null);
 const r=summonState(game);
 const run=(a:string,target:any=null)=>action(a,target,{seq:r.seq});
 const family=tab==='family';
 const owned=family?game.family:game.fellows;
 // Chains show their head's rarity so the tile icon resolves; the price already uses the head.
 const entries=useMemo(()=>(family?FAMILY:FELLOWS)
  .map((f:any)=>({...f,rarity:head(f.rarity)}))
  .sort((a:any,b:any)=>Number(!!owned[a.id])-Number(!!owned[b.id])),[family,owned]);
 const pick=selected&&!owned[selected]?selected:null;
 const cost=pick?recruitPrice(pick):null;
 const currency=cost?Object.keys(cost)[0]:null;
 const amount=cost?Object.values(cost)[0] as number:0;
 const afford=!!currency&&(r as any)[currency]>=amount;
 const person=pick?(family?FAMILY:FELLOWS).find((f:any)=>f.id===pick):null;
 const day=summonDay(game,game.lastAt),week=weekStartDay(game.lastAt);
 const dayClaimed=(r.days||[]).some((d:string)=>d.startsWith(day.day)),weekClaimed=(r.weeks||[]).includes(week);
 const perfectDays=(r.days||[]).filter((d:string)=>d.endsWith('!')&&d.slice(0,10)>=week).length;
 const {areas}=habitEarnings(game.habits,game.lastAt);

 return <section className="treasure-panel recruit-panel" aria-label="Recruit">
  <h2 className="sr-only">Recruit</h2>
  {/* Counts only; how fragments are earned is on the Habit rewards card below. */}
  <dl className="recruit-wallet" aria-label="Recruit currencies">
   {[['Stones',r.stones],['Fragments',r.stoneFragments],['Valiant',r.valiant??0],['Archangel',r.archangel??0],['Star shards',r.starShards??0]].map(([k,v])=><div key={k as string}><dt>{k}</dt><dd>{v as number}</dd></div>)}
  </dl>

  <div className="recruit-tabs">
   <Button variant="outline" aria-pressed={!family} onClick={()=>{setTab('fellows');setSelected(null)}}>Fellows</Button>
   <Button variant="outline" aria-pressed={family} onClick={()=>{setTab('family');setSelected(null)}}>Family</Button>
  </div>

  {person&&<article className="school-card recruit-invite">
   <h3>{person.name}</h3>
   <p>{head(person.rarity)}{person.type?' · '+person.type:''} · {priceLabel(person.id)}</p>
   {isAddition(person.id)
    ? <p className="item-status">{unlockEvent(person.id)?.name
       ?`Not for sale. ${person.name} joins by playing ${unlockEvent(person.id)?.name} on the Events tab.`
       :`Not for sale, and not in a storyline yet.`}</p>
    : <Button disabled={locked||!afford||!cost} onClick={()=>{run('summonRecruit',person.id);setSelected(null)}}>
       {RANK_FELLOWS.has(person.id)?`Joins at player rank ${RANK_FELLOWS.get(person.id)}`:cost?(!amount?'Invite · free':afford?`Invite for ${amount} ${CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}`:`Needs ${amount} ${CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}`):'No price recorded'}
      </Button>}
  </article>}

  <div className="roster-cards">
   <RosterPicker entries={entries} owned={owned} selected={pick} onSelect={(id:string)=>setSelected(id)}
    family={family} pageSize={6} status={(id:string)=>owned[id]?'Joined':priceLabel(id)}/>
  </div>

  {/* The claim was the missing half of this panel. summonClaimDay/Week were dispatched nowhere in the
      app, so stoneFragments could never leave 0 and every Invite button below read "Needs 3 Acquaint
      Stone Fragments" forever -- the habits-to-roster loop had no door. */}
  <article className="school-card">
   <h3>Habit rewards</h3>
   <p>{day.done}/{day.due} daily habits today{day.perfect?' · perfect day':''} · {STONE_FRAGMENTS_PER_STONE} fragments make a stone</p>
   <Button disabled={locked||dayClaimed||!day.done} onClick={()=>run('summonClaimDay')}>
    {dayClaimed?'Today’s rewards claimed'
     :!day.done?'Complete a daily habit first'
     :`Claim ${Math.min(STONE_FRAGMENTS_DAILY_CAP,day.done)*STONE_FRAGMENTS_PER_DAILY+(day.perfect?PERFECT_DAY_BONUS:0)} fragments`}
   </Button>
   <Button variant="outline" disabled={locked||weekClaimed||perfectDays<WEEK_DAYS_FOR_BONUS||areas<WEEK_AREAS_FOR_BONUS} onClick={()=>run('summonClaimWeek')}>
    {weekClaimed?'This week’s bonus claimed'
     :`Weekly bonus · ${perfectDays}/${WEEK_DAYS_FOR_BONUS} perfect days, ${areas}/${WEEK_AREAS_FOR_BONUS} life areas`}
   </Button>
  </article>

  <article className="school-card">
   <h3>Forge</h3>
   <p>{STONE_FRAGMENTS_PER_STONE} fragments make an Acquaint Stone · {INSIGNIA_FRAGMENTS_PER_INSIGNIA} insignia fragments make an insignia</p>
   <p>{r.insigniaFragments} insignia fragments · {r.valiant} Valiant · {r.archangel} Archangel</p>
   <div className="business-actions">
    <Button variant="outline" disabled={locked||r.stoneFragments<STONE_FRAGMENTS_PER_STONE} onClick={()=>run('summonForge','stone')}>Forge a stone</Button>
    {SUMMON_KINDS.map((kind:string)=><Button key={kind} variant="outline" disabled={locked||r.insigniaFragments<INSIGNIA_FRAGMENTS_PER_INSIGNIA} onClick={()=>run('summonForge',kind)}>
     Forge {kind==='valiant'?'a Valiant':'an Archangel'} insignia</Button>)}
   </div>
  </article>

  {!!r.recruited?.length&&<article className="school-card">
   <h3>Invited here</h3>
   <p>{r.recruited.length} so far</p>
   {r.recruited.slice(-4).reverse().map((x:any)=><p key={x.id}>{[...FELLOWS,...FAMILY].find((f:any)=>f.id===x.id)?.name??x.id} · {x.paid} {CURRENCY_NAMES[x.currency as keyof typeof CURRENCY_NAMES]}</p>)}
  </article>}
 </section>;
}
