import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,settle,totalRate,effectiveRate} from '../lib/game.mjs';import {habitEarnings,habitDay,habitPeriod,LIFE_AREAS} from '../lib/habits.mjs';
const at=(day,time='12:00')=>new Date(`${day}T${time}:00`).getTime();
const row=(when,domain,freq='daily')=>({id:'x'+when+domain,title:'Task',period:habitPeriod(freq,when),day:habitDay(when),at:when,gold:10,points:1,domain,kind:'complete'});
const close=(a,b)=>assert(Math.abs(a-b)<1e-6*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function done(s,now,spec){let r=act(s,'habitSave',now,null,{title:'Task',...spec});assert(!r.error,r.error);const id=r.state.habits.items.at(-1).id;r=act(r.state,'habitComplete',now,id);assert(!r.error,r.error);return r.state}

test('no habit history leaves earnings unchanged',()=>{assert.deepEqual(habitEarnings(undefined,at('2026-09-09')),{multiplier:1,areas:0,dailies:0});const s=fresh(at('2026-09-09'));assert.equal(effectiveRate(s,s.lastAt),totalRate(s));});

test('eight life areas and a full day of dailies cap at 2x; general does not count as an area',()=>{const now=at('2026-09-09','20:00');assert.equal(LIFE_AREAS.length,8);const history=[...LIFE_AREAS.map((d,i)=>row(now-3600000*(i+1),d)),row(now-1000,'general'),row(now-2000,'general')];const e=habitEarnings({history},now);assert.equal(e.areas,8);assert.equal(e.dailies,10);assert.equal(e.multiplier,2);close(habitEarnings({history:[row(now-1000,'general')]},now).multiplier,1.07);});

test('areas count from Monday of this week and dailies only from today',()=>{const now=at('2026-09-09','09:00');const history=[row(at('2026-09-06'),'career'),row(at('2026-09-07','08:00'),'health'),row(at('2026-09-08'),'rest'),row(at('2026-09-09','07:00'),'health'),row(at('2026-09-09','08:00'),'learning','weekly')];const e=habitEarnings({history},now);assert.equal(e.areas,3);assert.equal(e.dailies,1);close(e.multiplier,1+0.5*3/8+0.07);});

test('settle multiplies passive earnings but a completion never boosts time before it',()=>{const t=at('2026-09-09','10:00');let s=fresh(t);const base=totalRate(s);assert(base>0);const plain=settle(s,t+60000).pending-s.pending;close(plain,60*base);s=done(s,t,{domain:'health',freq:'daily'});close(effectiveRate(s,t),base*(1+0.5/8+0.07));const boosted=settle(s,t+60000).pending-s.pending;close(boosted,60*base*(1+0.5/8+0.07));});

test('away time is split at midnight so today\'s dailies stop counting',()=>{const t=at('2026-09-08','23:00');let s=done(fresh(t),t,{domain:'health',freq:'daily'});const base=totalRate(s),after=settle(s,t+2*3600000).pending-s.pending;close(after,3600*base*(1+0.5/8+0.07)+3600*base*(1+0.5/8));});

test('a new week resets life areas at Monday midnight',()=>{const t=at('2026-09-13','23:00');let s=done(fresh(t),t,{domain:'health',freq:'daily'});const base=totalRate(s),after=settle(s,t+2*3600000).pending-s.pending;close(after,3600*base*(1+0.5/8+0.07)+3600*base);});
