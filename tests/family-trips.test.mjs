import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh, act, valid, decode} from '../lib/game.mjs';
import {dateReward} from '../lib/dating.mjs';
import {TRIPS, TRIPS_PER_DAY, DATE_INTIMACY, MAX_WAITING_CHILDREN,
        tripById, tripsLeft, waitingChildren, tripPlan} from '../lib/family-trips.mjs';
import data from '../lib/family-trip-data.json' with {type: 'json'};

const run = (s, a, t = null, v = null) => {
 const r = act(s, a, s.lastAt, t, v);
 assert.ok(!r.error, String(r.error));
 assert.ok(valid(r.state), a + ' produced an invalid save');
 return r.state;
};
/** A save with one Family member welcomed and enough Crystals for `trips` Airship Journeys. */
const ready = (trips = 1) => {
 const s = run(fresh(1000), 'welcome', 'wife_2');
 return {...s, crystals: 200 * trips};
};

test('the shipped constants are the original System.json singletons, with one marked exception', () => {
 // System.json (sha256 d8ea3b50...): DateCost_1 = 100 of item "4" (Icon_Diamond_Big = Crystals),
 // DateCost_1LimitTime = 10, DateCharm_1 = 10, DateCharm_2 = 20, DateIntimacy = 1.
 // DateCost_2 = 1 Item_Date_Wife_Special_1 (Icon_Perfume3) -- an item with NO acquisition route
 // anywhere in the 1,499-table config set, so the Airship's Crystal price is the one local number.
 assert.equal(TRIPS_PER_DAY, 10);
 assert.equal(DATE_INTIMACY, 1);
 assert.deepEqual(TRIPS.map(t => t.id), ['sailing', 'airship']);
 assert.equal(tripById('sailing').crystals, 100);
 assert.equal(tripById('sailing').charm, 10);
 assert.equal(tripById('sailing').children, 1);
 assert.equal(tripById('airship').charm, 20);
 assert.equal(tripById('airship').children, 2);
 // Exactly one invented value, and the file says which. If a second one appears unmarked, or the
 // marked one moves without its note, this fails.
 assert.equal(TRIPS.filter(t => t.crystalsAreOriginal).length, 1);
 assert.equal(TRIPS.find(t => !t.crystalsAreOriginal).id, 'airship');
 assert.equal(data.provenance.invented.length, 2);
 assert.match(data.provenance.invented[0].value, /airship|trips\[1\]\.crystals/);
 assert.equal(data.provenance.sources[0].sha256, 'd8ea3b50e218ba4b0e4eeeffbcec6b30824387ad2db6d77b0340c63750359312');
 assert.equal(data.provenance.sources[1].sha256, 'c2ebdd64dfdbb6fa803319d541ea5d1bff9f31d3bad153f1755b0b6e5997152f');
});

test('a Sailing Trip charges Crystals, pays a date, and brings home exactly one child', () => {
 let s = ready();
 assert.equal(s.familyTrips, undefined, 'a save without trips must stay undefined');
 assert.deepEqual(decode(JSON.stringify(s)), s, 'the absent subtree survives a round trip');
 const before = structuredClone(s);
 const expectedPoints = dateReward(s, 'wife_2').credited;
 s = run(s, 'familyTrip', 'wife_2', 'sailing');
 assert.equal(s.crystals, before.crystals - 100);
 assert.equal(s.family.wife_2.blessingPower, before.family.wife_2.blessingPower + 10);
 assert.equal(s.family.wife_2.intimacy, before.family.wife_2.intimacy + 1);
 assert.equal(s.family.wife_2.points, before.family.wife_2.points + expectedPoints);
 assert.equal(s.stats.dates, before.stats.dates + 1);
 assert.equal(waitingChildren(s).length, 1);
 assert.equal(waitingChildren(s)[0].caretaker, 'wife_2');
 assert.equal(waitingChildren(s)[0].twin, false);
 // Nothing outside the Family, the trip subtree and Crystals moved.
 for (const k of ['gold', 'pending', 'earned', 'fellows', 'buildings', 'inventory', 'school'])
  assert.deepEqual(s[k], before[k], k + ' changed during a trip');
 assert.deepEqual(decode(JSON.stringify(s)), s);
});

test('an Airship Journey brings home twins and pays double the Blessing Power', () => {
 const start = ready();
 assert.equal(start.family.wife_2.blessingPower, 10, 'a welcomed member starts at 10 Blessing Power');
 let s = run(start, 'familyTrip', 'wife_2', 'airship');
 assert.equal(s.crystals, 0);
 assert.equal(s.family.wife_2.blessingPower, 10 + 20, 'DateCharm_2 is twice DateCharm_1');
 assert.equal(waitingChildren(s).length, 2);
 assert.ok(waitingChildren(s).every(c => c.twin === true));
 assert.equal(new Set(waitingChildren(s).map(c => c.id)).size, 2, 'twins must have distinct ids');
 assert.deepEqual(decode(JSON.stringify(s)), s);
});

test('Blessing Points are NOT a new faucet: a trip pays exactly what a random date pays', () => {
 // This is the balance guard. Blessings are one of the largest contributors to the power ceiling,
 // so the trips must sell children and convenience, never a higher points rate. If a future edit
 // multiplies the payout, this fails loudly.
 let s = ready(3);
 s = {...s, family: {...s.family, wife_2: {...s.family.wife_2, blessingPower: 1000}}};
 const perDate = dateReward(s, 'wife_2').credited;
 for (const trip of ['sailing', 'airship']) {
  const before = s.family.wife_2.points, expected = dateReward(s, 'wife_2').credited;
  s = run(s, 'familyTrip', 'wife_2', trip);
  assert.equal(s.family.wife_2.points - before, expected);
 }
 // and the rate never exceeded one date's worth even as Blessing Power rose from the trips
 assert.ok(perDate > 0 && tripPlan(s, 'wife_2', 'sailing').points >= perDate);
});

test('the daily cap is the original DateCost_1LimitTime and is shared by both trips', () => {
 let s = ready(TRIPS_PER_DAY + 1);
 assert.equal(tripsLeft(s), TRIPS_PER_DAY);
 for (let i = 0; i < TRIPS_PER_DAY; i++) s = run(s, 'familyTrip', 'wife_2', 'sailing');
 assert.equal(tripsLeft(s), 0);
 const blocked = act(s, 'familyTrip', s.lastAt, 'wife_2', 'sailing');
 assert.match(String(blocked.error), /already used/);
 // The cap is shared: the Airship is blocked too, not given its own ten.
 assert.match(String(act(s, 'familyTrip', s.lastAt, 'wife_2', 'airship').error), /already used/);
 assert.equal(waitingChildren(s).length, TRIPS_PER_DAY);
 assert.deepEqual(decode(JSON.stringify(s)), s);
});

test('a trip is refused, atomically, without Crystals or a member', () => {
 const poor = {...ready(), crystals: 99};
 const r = act(poor, 'familyTrip', poor.lastAt, 'wife_2', 'sailing');
 assert.match(String(r.error), /100 Crystals/);
 assert.deepEqual(r.state, poor, 'a refused trip must change nothing');
 assert.ok(act(ready(), 'familyTrip', 1000, 'wife_3', 'sailing').error, 'unwelcomed member');
 assert.ok(act(ready(), 'familyTrip', 1000, 'wife_2', 'nonesuch').error, 'unknown trip');
});

test('a trip child enrolls as a pupil and is consumed exactly once', () => {
 let s = run(ready(), 'familyTrip', 'wife_2', 'sailing');
 const child = waitingChildren(s)[0];
 assert.equal(s.school.pupils.length, 0);
 s = run(s, 'enrollTripChild', child.id, 'curious');
 assert.equal(s.school.pupils.length, 1);
 assert.equal(s.school.pupils[0].caretaker, 'wife_2');
 assert.equal(s.school.pupils[0].intellect, s.family.wife_2.relationship * 10);
 assert.equal(waitingChildren(s).length, 0, 'the child must be consumed');
 // The same child cannot be enrolled twice, and an unknown id is refused.
 assert.ok(act(s, 'enrollTripChild', s.lastAt, child.id, 'curious').error);
 assert.ok(act(s, 'enrollTripChild', s.lastAt, 999999, 'curious').error);
 assert.deepEqual(decode(JSON.stringify(s)), s);
});

test('a tampered trip subtree is refused rather than loaded', () => {
 const s = run(ready(), 'familyTrip', 'wife_2', 'sailing');
 const breaks = [
  x => {x.familyTrips.children[0].caretaker = 'wife_99'},        // a member the save does not hold
  x => {x.familyTrips.children[0].id = x.familyTrips.nextId},    // an id at or above the allocator
  x => {x.familyTrips.children.push({...x.familyTrips.children[0]})}, // a duplicated child
  x => {x.familyTrips.used = TRIPS_PER_DAY + 1},                 // more trips than a day allows
  x => {x.familyTrips.policyVersion = 2},
  x => {x.familyTrips.children[0].twin = 'yes'},
  x => {x.familyTrips.children[0].trip = 'zeppelin'},
  x => {x.familyTrips.children = Array.from({length: MAX_WAITING_CHILDREN + 1},
        (_, i) => ({...x.familyTrips.children[0], id: i + 1}))},
 ];
 for (const [i, mutate] of breaks.entries()) {
  const bad = structuredClone(s);
  mutate(bad);
  assert.equal(valid(bad), false, 'break ' + i + ' was accepted by valid()');
  assert.throws(() => decode(JSON.stringify(bad)), 'break ' + i + ' was loaded by decode()');
 }
 // Negative control for the guards themselves: the untampered save still loads.
 assert.deepEqual(decode(JSON.stringify(s)), s);
});
