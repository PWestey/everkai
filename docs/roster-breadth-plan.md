# Roster breadth: what 381 characters are for

Owner questions, 2026-09-23: *"With the amount of characters we have, is that [N -> UR pacing] a good
target?"* and *"Content in Isekai uses roster power, not a team power. Also keep in mind that I will
likely want to go rogue and scope out more combat modes like other roster collectors."*

Everything below is measured, with the source named. Nothing here is implemented yet except where it
says SHIPPED.

## 1. The roster

| | originals | crossovers | total |
|---|---|---|---|
| Fellows | 111 | 133 | **244** |
| Family | 107 | 30 | **137** |
| | | | **381** |

All 163 crossovers are born at quality tier 1 and wear the badge of the tier they have climbed to
(`lib/crossover-rarity.mjs`). Tag axes already on every crossover row: 5 types (Brave 36, Unfettered 33,
Informed 25, Diligent 22, Inspiring 17), 8 archetypes (courier 23, artisan 25, steward 16, warden 20,
scholar 15, captain 12, broker 11, duelist 11) and 2 franchises (MSF 95, SWGOH 68). The 30 Family
crossovers carry no type. Those tags are what a faction-gated mode would read.

## 2. Roster power is the gate — SHIPPED, and it is the whole answer

`lib/adventure.mjs:244` already measures the stage ladder against `ladderPower`, the WHOLE roster's
summed Power, because the original compares `battleconf.atk` with `zzPropMgr.heroTotalPower`
(`readable/SceneUnderling.lua:606`), not a party subset. Party Power (`teamPower`, 1-3 Fellows) is only
what the Frontier fights with. So every character that gains a level moves the content gate.

That makes breadth, not depth, the progression path — and by a wide margin. Same Aptitude (50,000) on
every row, so this isolates the level term (`levelADH` x the original's HeroLevel column):

| level | badge | Power | cumulative EXP | **Power per 1M EXP** |
|---|---|---|---|---|
| 100 | N | 46,250,000 | 71,160 | 650,000,000 |
| 200 | R | 96,350,000 | 749,990 | 128,000,000 |
| 300 | SR | 168,100,000 | 5,262,490 | 32,000,000 |
| 350 | SSR | 212,500,000 | 11,732,490 | 18,100,000 |
| 450 | SSR+ | 318,100,000 | 49,082,490 | 6,480,000 |
| 500 | SSR+ | 379,500,000 | 92,707,490 | 4,090,000 |
| 550 | **UR** | 446,750,000 | 253,957,490 | **1,760,000** |
| 750 | LR | 775,000,000 | 5,851,457,490 | 132,000 |

**22 characters at level 350 cost the same 254M EXP as one at 550, and give 4.68 BILLION roster power
against 447M — 10.5x.** The original's EXP column doubles at level 500 (995,000/level -> 2,000,000),
which is what bends the curve.

## 3. So what is UR actually for?

Not roster power. Measured payoffs of the badge itself:

- **Base Aptitude 20 -> 100** and **appointment slot A 30% -> 150%** (`crossoverLadder`,
  `lib/crossover-abilities.mjs`) — a real 5x on village yield, permanent.
- **Quality talent +225 Aptitude** cumulative over ten breaks (`qualityRule`) — negligible against an
  invested Aptitude in the tens of thousands. Rule 6: naming it, not dressing it as a curve.
- **The level cap itself**, which is only worth what section 2 says it is worth.
- Rarity-gated effects that test the displayed badge (8 fishing effect rows are gated `["N"]`;
  12 are gated `["UR"]` — `lib/fishing-species.json`).

**Verdict: UR is a prestige-and-yield badge, not a progression move.** That is a coherent design and it
matches the original, but it should be said out loud in the UI rather than left for the owner to
discover by spending 254M EXP.

## 4. Pacing ruling (owner, 2026-09-23): leave the curve alone

Pinned in `tests/crossover-climb-pacing.test.mjs`. First UR lands in roughly 4-8 weeks of habit play;
N -> SSR is about half a day of day-30 income (21M EXP/day, measured on `power-save-3d47df4-day30`);
breakthrough materials bank in 7 days and are never the bottleneck.

## 5. The jobs gap is NOT a defect — we already match the original

| | Everkai | original |
|---|---|---|
| buildings | 17 | 19 (`BuildingBase.json`) |
| hero posts per building | 5 | 5, flat across all 26 quality tiers (`BuildingQuality.heroLimit`) |
| **total hero posts** | **85** | **95** |

The original runs a 300+ roster against 95 posts too. It does not solve that with more posts — it solves
it with roster power (section 2), which every unassigned character still feeds. `staffCount` in
`BuildingLevel.json` (0-5 at level 1 rising to 19,736+ at level 57) is anonymous staff, not heroes.

So: no invented slot expansion. The breadth payoff already exists and already works.

## 6. Where breadth is genuinely under-used: combat modes

Everkai's combat today is the stage ladder (roster power), the Frontier (party of 3), Mine Clearance
(one owner), Trading Post duels (team of 6) and the Familiar Tower. Only one of those asks the owner to
field more than six characters at once, and none of them read the tag axes in section 1.

This is the slot for the owner's "other roster collectors" direction. The genre's answer — MSF's Arena,
Raids and War, SWGOH's Territory Battles and Grand Arena — is always the same shape, and it is the shape
Everkai is missing: **modes that need SEVERAL squads at once, each squad gated by a tag, so a character
cannot be in two places.**

Candidates, cheapest first, all single-player and offline:

1. **Tagged expedition board** — 5-8 simultaneous postings, each demanding a squad of 5 matching one tag
   (a type, an archetype or a franchise). A character locked into one posting is unavailable to the
   others, so 40 characters are committed at once and the tag spread decides what you can run. Rewards
   are the existing EXP/material faucets, so no new economy. Closest original analogue: the dispatch
   tables already imported for familiars.
2. **Roster ladder** — a ladder of opponent rosters measured against `ladderPower` with a per-tag
   modifier, so a wide roster with balanced tags climbs further than a narrow one. Reuses the stage
   ladder's comparison exactly; nothing new to balance.
3. **Territory-style campaign** — 3 fronts x 3 phases, each front tag-locked, run once per habit day.
   The heaviest lift; best kept until 1 and 2 prove the tag gating is fun.

Not proposed: anything that mints a new currency, or any mode that rewards the same faucet twice.

## 7. Open questions for the owner

- Which of the three modes in section 6, and in what order.
- Should the UR badge advertise what it is for (yield + prestige) on the breakthrough screen, given
  section 3? Currently the screen shows only the new cap.
