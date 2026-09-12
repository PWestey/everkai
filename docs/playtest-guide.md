# Playtest guide

There is no tutorial yet, and building one now would mean rewriting it every time a system changes.
This is the cheap substitute: what to do, in what order, and where your feedback is worth most.

## Before you start

Tap **Start over** if you are still on the old sandbox save. A new village starts with three
characters — Kaity, **Neptune** (UR) and **Bridget** (SSR) — and an empty habit journal loaded with
78 starter tasks.

Every Drakenberg facility now carries a maturity label, on its plate, in the town List view, and in
its own header:

| Label | What it means for you |
|---|---|
| **Ready** | Complete for its scope. Play it properly; progress is safe. |
| **Limited** | Works and keeps your progress, but the content is thin. Judge the loop, not the volume. |
| **Early** | Still being built. Look, but don't invest — this may be reworked. |

## The intended path

1. **Habit journal** (Ready). This is the premise: real habits drive everything else. Finish a daily
   or two. A *perfect day* — every daily due today completed — pays the best rewards.
2. **Collect village gold** on the map, and open a business or two.
3. **Journey** (Early) — tap *Start journey* on the home strip for the opening quest chain. It is
   the closest thing to guided content, and it ends at chapter 6.
4. **Recruit** (Ready). Habits pay Acquaint Stone Fragments; ten make a stone. Characters are
   **chosen, not drawn** — pick who you want and pay their price. 257 are buyable.
5. **Fellows → a character → Skills.** Spend star shards from perfect days on stars: +5% Aptitude
   each, seven per Fellow. Aptitude raises both Power and that Fellow's workplace earnings.
6. **Supplies → Equipment.** Forge an artifact from Magic Ore, then equip and upgrade it.

## What I most need feedback on

These are the parts that are finished enough that your reaction is the real signal:

- **Pace.** Does earning feel steady or grindy? A perfect day pays 24 Magic Ore, 10 star shards, an
  insignia fragment and up to 16 stone fragments. Is the first star too slow? Is the first character?
- **The habit → game link.** Does finishing real tasks feel connected to the village, or bolted on?
- **Recruit prices.** An N costs 3 fragments, an R 5, an SR 1 stone, an SSR 2, a UR 2 insignias.
  Do the cheap characters feel reachable and the expensive ones worth saving for?
- **Clarity.** Anywhere you could not tell what a screen wanted from you. That is the tutorial
  question answering itself — every spot you get stuck is evidence for what onboarding must cover.

## What to skip for now

Marked **Early**, and known to be thin — bug reports here mostly tell me things I already know:

- **Northern Odyssey** — 3 authored floors.
- **Trading Post** — 3 opponents, 4 shop items, simulated.
- **Banquets** — 2 party types, simulated guests.
- **Mushroom Expo** — 5 of 100 stages.
- **Journey** — 11 milestones; the quest chain stops at chapter 6.

Still worth reporting from these: anything **broken**, anything that **loses progress**, or anything
that reads as finished when the label says it isn't.

## Always worth reporting

- A save that fails, or progress that disappears.
- Art that doesn't load, or a character with no picture.
- Numbers that look wrong — earnings, prices, counts that don't add up.
- Wording that misleads. The save-failure message used to blame device storage when the real cause
  was the browser's per-site allowance; that one cost real time before it was fixed.
- Any mention of demons. The rewrite covered 28 characters, 33 data strings and seven removed
  crossover records, but the extraction is large and something may have been missed.

## Known and already logged

No need to report these:

- No tutorial or onboarding.
- Battles are a Power-vs-requirement comparison, not a simulation.
- Character idle animations stream on demand, so on a poor connection you'll see the still portrait
  instead. That is deliberate — precaching them was breaking saving entirely.
