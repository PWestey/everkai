import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import RosterPicker from './roster-picker';
import {FELLOWS,FAMILY} from '@/lib/catalog.mjs';
import {summonState,recruitPrice,CURRENCY_NAMES,STONE_FRAGMENTS_PER_STONE,INSIGNIA_FRAGMENTS_PER_INSIGNIA,SUMMON_KINDS,summonDay,weekStartDay,WEEK_DAYS_FOR_BONUS,WEEK_AREAS_FOR_BONUS,STONE_FRAGMENTS_PER_DAILY,STONE_FRAGMENTS_DAILY_CAP,PERFECT_DAY_BONUS} from '@/lib/summon.mjs';
import {habitEarnings} from '@/lib/habits.mjs';

/** rarityIcon has no sprite for a chain like "SSR -> UR", and the price comes from the head anyway. */
const head=(rarity:string)=>String(rarity||'').split(' ->')[0].trim();
const priceLabel=(id:string)=>{const c=recruitPrice(id);if(!c)return 'No price recorded';
 const [currency,amount]=Object.entries(c)[0] as [string,number];return `${amount} ${CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}`;};

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

 return <section className="treasure-panel" aria-label="Recruit">
  <h2>Recruit</h2>
  <p>{r.stones} Acquaint Stones · {r.stoneFragments} fragments · {r.insignias??0} insignias · {r.starShards??0} star shards</p>
  <p className="small-note">Finish daily habits to earn fragments; ten make a stone. Characters are chosen, not drawn — pick who you want and pay their price. Perfect days also pay star shards, spent on a Fellow’s stars in their own training panel.</p>

  {/* The claim was the missing half of this panel. summonClaimDay/Week were dispatched nowhere in the
      app, so stoneFragments could never leave 0 and every Invite button below read "Needs 3 Acquaint
      Stone Fragments" forever -- the habits-to-roster loop had no door. */}
  <article className="school-card">
   <h3>Habit rewards</h3>
   <p>{day.done}/{day.due} daily habits today{day.perfect?' · perfect day':''}</p>
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

  <div className="business-actions">
   <Button variant="outline" aria-pressed={!family} onClick={()=>{setTab('fellows');setSelected(null)}}>Fellows</Button>
   <Button variant="outline" aria-pressed={family} onClick={()=>{setTab('family');setSelected(null)}}>Family</Button>
  </div>

  <RosterPicker entries={entries} owned={owned} selected={pick} onSelect={(id:string)=>setSelected(id)}
   family={family} pageSize={6} status={(id:string)=>owned[id]?'Joined':priceLabel(id)}/>

  {person&&<article className="school-card">
   <h3>{person.name}</h3>
   <p>{head(person.rarity)}{person.type?' · '+person.type:''} · {priceLabel(person.id)}</p>
   <Button disabled={locked||!afford||!cost} onClick={()=>{run('summonRecruit',person.id);setSelected(null)}}>
    {cost?(afford?`Invite for ${amount} ${CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}`:`Needs ${amount} ${CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}`):'No price recorded'}
   </Button>
  </article>}

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
