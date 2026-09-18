import data from './aptitude-cap-data.json' with {type:'json'};
/** THE APTITUDE CAP, measured rather than chosen (2026-09-18).
 *
 *  `fellow.aptitude` was capped at a flat 1,000 that no table carries, and docs/power-parity-audit.md 1.4
 *  measured the owner's own Shinobu at Aptitude 12,897. The stored record is Everkai's container for the
 *  original's talent-LEVEL skills (Hero_Talent_Base_N, the per-hero Talent_extra skills and the Country
 *  talent skills), and the original bounds those by their maxUpgradeLevel (300) raised by every
 *  `talentLvLimit` that reaches the hero. scripts/import-aptitude-cap.py measures that bound for all 181
 *  heroes (lib/aptitude-cap-data.json); the highest is hero_253 at 31,122 = 5,400 at level 300 plus
 *  18 a level x 1,429 raised levels.
 *
 *  ONE cap for every Fellow, the original's maximum, rather than a per-hero cap: the record also holds
 *  Everkai-only faucets with no per-hero skill structure (direct Skill Pearl training, Alraune essences),
 *  and a per-hero cap would put 38 of the 111 originals BELOW the old 1,000 (hero_1 measures 720) and
 *  refuse saves that legally hold 1,000 today. A single cap at or above every old value only widens, so
 *  every save that decodes today still decodes (CLAUDE.md saves rule). The per-hero column stays in the
 *  data file for the day a per-hero cap is wanted.
 *
 *  What actually paces Aptitude is unchanged: talent levels still stop at talentCap (299 + a Stella
 *  raise), and Skill Pearls still double in price every 2,500 bought over a save's life. */
export const APTITUDE_CAP=data.cap;
/** The old cap. Kept as a named floor: nothing may ever set the cap below a value real saves hold. */
export const LEGACY_APTITUDE_CAP=1000;
if(!(APTITUDE_CAP>=LEGACY_APTITUDE_CAP))throw new Error('lib/aptitude-cap-data.json would put the Aptitude cap below 1,000 and refuse real saves');
export const APTITUDE_CAP_SOURCE=data;
/** DIRECT SKILL PEARL TRAINING STOPS AT THE OLD 1,000 (owner-delegated balancing decision, 2026-09-18).
 *  Buying Aptitude point-for-point with Skill Pearls is Everkai-only: the original has no pearl -> Aptitude
 *  trade, its talent comes from talent LEVELS, each capped. With the 31,122 bound the pacing sim bought one
 *  Fellow to 31,122 by day 30 and made it 6-8x the previous build's strongest (power-parity-audit 9.6/9.8.6).
 *  So the Everkai-only faucet keeps exactly its pre-rebuild reach: it raises a Fellow's Aptitude only while
 *  that Fellow is below 1,000 -- the same rule main shipped. Every source the original has (talent levels,
 *  Stella talent, artifacts, family, museum, fishing, echo, insight, essences, opening items) keeps the
 *  APTITUDE_CAP bound. This is a PLANNER limit, not a validator: nothing stored is re-checked against it, so
 *  no save can be refused by it (a Fellow already above 1,000 simply gets no pearl offer). */
export const PEARL_APTITUDE_CAP=LEGACY_APTITUDE_CAP;
