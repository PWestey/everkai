import {dateReward} from './dating.mjs';
import {habitDay} from './habits.mjs';
import {PUPIL_TYPES} from './school.mjs';
import {schoolCapacity} from './education.mjs';
import data from './family-trip-data.json' with {type:'json'};

// Family trips: the original's TWO paid dates, and the only route by which a Transcender acquires
// children. Rule:text:Wife_16, quoted verbatim in lib/family-rule-evidence.json:
//
//   "Dates with family members are divided into Sailing Trip and Airship Journey. Sailing Trip
//    costs Crystals, grants a large amount of Blessing Points, and guarantees 1 child. Airship
//    Journey costs Perfume, grants a large amount of Blessing Points, and guarantees a twin."
//
// The numbers are not invented. They are the original's own singletons in System.json:
//   DateCost_1          [{"id":"4","count":100}]                      -> 100 Crystals
//   DateCost_1LimitTime 10                                            -> ten trips a day
//   DateCost_2          [{"id":"Item_Date_Wife_Special_1","count":1}] -> 1 Perfume
//   DateCharm_1         10                                            -> +10 Blessing Power
//   DateCharm_2         20                                            -> +20 Blessing Power
//   DateIntimacy        1                                             -> +1 Intimacy per date
// Item "4" is Icon_Diamond_Big / Icon_Diamond_S, the premium currency the English build calls
// Crystals, which is exactly Everkai's s.crystals. Item_Date_Wife_Special_1 carries Icon_Perfume3
// at rarity 5 -- the Perfume the rule names.
//
// ONE value here is local and is marked as such in family-trip-data.json: the Airship's Everkai
// price. Its original price is one Perfume, and Perfume appears in only two places in the whole
// 1,499-table config set -- its own Item.json definition and DateCost_2 -- with no shop row, no
// drop table and no reward entry anywhere, so there is no acquisition route to port and no
// crystal-to-perfume exchange rate to recover. Everkai charges Crystals instead, at the only ratio
// the source does give: DateCharm_2 / DateCharm_1 = 2, and two children instead of one.
//
// BLESSING POINTS ARE DELIBERATELY NOT A NEW FAUCET. A trip pays exactly what a random date with the
// same member pays -- dateReward(), unchanged -- because Blessing Points buy blessings and blessings
// are one of the largest contributors to the default-mode power ceiling. "A large amount" in the
// rule is the original's wording for a paid date against a free one; matching it with a new
// multiplier would move the ceiling, so the trips sell CONVENIENCE AND CHILDREN, not points.
// See docs/parity-catalog.csv F18 for the before/after ceiling measurement.
export const TRIPS = data.trips;
export const TRIPS_PER_DAY = data.perDay;
export const DATE_INTIMACY = data.dateIntimacy;
/** Family stats are capped at 1e6 by validFamily in lib/game.mjs; trips respect the same ceiling. */
export const STAT_CAP = 1e6;
/** Local: children waiting to be enrolled are kept in the save, so the queue must be bounded. */
export const MAX_WAITING_CHILDREN = 60;

const record = v => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (n, max = 1e9) => Number.isSafeInteger(n) && n >= 0 && n <= max;
export const tripById = id => TRIPS.find(t => t.id === id) || null;

export const tripState = s => s?.familyTrips || {policyVersion: 1, day: '', used: 0, nextId: 1, children: []};
export const waitingChildren = s => tripState(s).children;
/** Trips left today. The daily cap is the original's DateCost_1LimitTime. */
export function tripsLeft(s) {
 const t = tripState(s);
 return TRIPS_PER_DAY - (t.day === habitDay(s?.lastAt) ? t.used : 0);
}

export function validFamilyTrips(s) {
 const t = s?.familyTrips;
 if (t === undefined) return true;
 if (!record(t) || t.policyVersion !== 1 || typeof t.day !== 'string' || t.day.length > 10) return false;
 if (!int(t.used, TRIPS_PER_DAY) || !int(t.nextId, 1e9) || t.nextId < 1) return false;
 if (!Array.isArray(t.children) || t.children.length > MAX_WAITING_CHILDREN) return false;
 const ids = new Set();
 for (const c of t.children) {
  // A child must name a Family member the save actually holds, must carry an id below the
  // allocator, and must be unique -- otherwise a hand-edited save could enrol the same child twice.
  if (!record(c) || !int(c.id, 1e9) || c.id < 1 || c.id >= t.nextId) return false;
  if (!Object.hasOwn(s.family || {}, c.caretaker)) return false;
  if (typeof c.twin !== 'boolean' || !Number.isSafeInteger(c.at) || c.at < 0 || c.at > s.lastAt) return false;
  if (!tripById(c.trip)) return false;
  if (ids.has(c.id)) return false;
  ids.add(c.id);
 }
 return true;
}

/** What one trip with this member would cost and pay, without taking it. */
export function tripPlan(s, id, tripId) {
 const trip = tripById(tripId), member = s?.family?.[id];
 if (!trip || !member) return null;
 return {
  trip,
  crystals: trip.crystals,
  points: dateReward(s, id).credited,
  charm: Math.min(STAT_CAP, member.blessingPower + trip.charm) - member.blessingPower,
  intimacy: Math.min(STAT_CAP, member.intimacy + DATE_INTIMACY) - member.intimacy,
  children: trip.children,
 };
}

export function familyTripAction(s, action, target, value) {
 if (!['familyTrip', 'enrollTripChild'].includes(action)) return null;
 const fail = error => ({state: s, error});
 const t = tripState(s), today = habitDay(s.lastAt);
 const used = t.day === today ? t.used : 0;

 if (action === 'familyTrip') {
  const member = s.family?.[target], trip = tripById(value);
  if (!member || !trip) return fail('Choose a family member and a trip.');
  if (used >= TRIPS_PER_DAY) return fail('Today’s ' + TRIPS_PER_DAY + ' family trips are already used.');
  if (s.crystals < trip.crystals) return fail('This trip costs ' + trip.crystals.toLocaleString() + ' Crystals.');
  if (t.children.length + trip.children > MAX_WAITING_CHILDREN)
   return fail('Enrol some of the children already waiting before travelling again.');
  if (t.nextId + trip.children > 1e9) return fail('Child record limit reached.');
  const plan = tripPlan(s, target, trip.id);
  const children = Array.from({length: trip.children}, (_, i) => ({
   id: t.nextId + i, caretaker: target, twin: trip.children > 1, trip: trip.id, at: Math.floor(s.lastAt),
  }));
  return {
   state: {
    ...s,
    crystals: s.crystals - trip.crystals,
    family: {...s.family, [target]: {
     ...member,
     points: Math.min(1e9, member.points + plan.points),
     blessingPower: member.blessingPower + plan.charm,
     intimacy: member.intimacy + plan.intimacy,
    }},
    stats: {...s.stats, dates: Math.min(1e9, s.stats.dates + 1)},
    familyTrips: {policyVersion: 1, day: today, used: used + 1, nextId: t.nextId + trip.children,
                  children: [...t.children, ...children]},
   },
   message: `${trip.name}: +${plan.points.toLocaleString()} Blessing Points, +${plan.charm} Blessing Power, ` +
            `and ${trip.children > 1 ? 'twins' : 'a child'} came home.`,
   welcomed: target,
  };
 }

 // enrollTripChild: the original's acquisition route for pupils. target is the child id, value the
 // pupil type. Intellect follows the caretaker's relationship tier, exactly as the legacy free
 // 'enroll' action does, so a trip child is never worth less than one conjured out of nothing.
 const child = t.children.find(c => c.id === Number(target));
 if (!child) return fail('Choose a child who has come home from a trip.');
 if (!PUPIL_TYPES.some(x => x.id === value)) return fail('Choose a pupil type.');
 if (s.school.pupils.length >= schoolCapacity(s)) return fail('Graduate a pupil to make room.');
 if (s.school.nextId >= 1e9) return fail('Enrollment limit reached.');
 const caretaker = s.family[child.caretaker];
 if (!caretaker) return fail('This child’s caretaker is no longer in your family.');
 const pupil = {id: s.school.nextId, caretaker: child.caretaker, type: value,
                intellect: caretaker.relationship * 10, progress: 0, education: 0};
 return {
  state: {
   ...s,
   school: {...s.school, nextId: s.school.nextId + 1, pupils: [...s.school.pupils, pupil]},
   familyTrips: {...t, policyVersion: 1, children: t.children.filter(c => c.id !== child.id)},
  },
  message: `Pupil ${pupil.id} enrolled from ${child.twin ? 'the Airship Journey' : 'the Sailing Trip'}.`,
 };
}
