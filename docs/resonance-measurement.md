# "Resonance" is the original's name for what Everkai already calls Pledge

**Measurement only.** Nothing was built from this.

Fellow spec 08 lists **L3 — Resonance** as *"Everkai has no Resonance system — no pairing of two
fellows for mutual stat gain, and no resonance skill ladder"*, and it was sized on 2026-09-25 as the
largest single remaining Fellow item, needing a measure-first pass before it could be estimated.
This is that pass, and the answer is that **most of it is already built under a different name.**

**Rule 2 positive control:** `en/translate.json` has 239,580 rows and returns 26 for `Familiar Tower`.
It came back correct.

## The join

`Resonance` appears in **360** English strings. Filtered to `SkillBase`, **57** of them:

| Key | English |
| --- | --- |
| `SkillBase:name:Hero142Pledge` | **`Resonance Skills`** |
| `SkillBase:name:Hero142_Talent_Pledge1` | `Resonance I` |
| `SkillBase:name:Hero142_Talent_Pledge2` | `Resonance II` |
| `SkillBase:name:Hero142_Talent_Pledge3` | `Resonance III` |

All 57 resolve in `SkillBase`. **`Resonance` is the display name of `Pledge`.** The spec's phrase
"pairing two fellows for mutual stat gain" is the `targetCondition` those skills carry:

```
Hero142Pledge   targetCondition { conditionType: "pledge", id: "Hero142Pledge" }
                maxUpgradeLevel 100, skillEffectType "prop"
```

## What Everkai already has

`lib/hero-advance.mjs` models the ladder, and its own header describes it exactly:

> *Pledge — `HeroPledge`: 15 heroes. The pledge level (1..100) costs 10 of `Item_HeroPledge_<id>` a
> level and unlocks talent skills at pledge levels 30 / 60 / 100. It may only be raised once the gate
> `Hero.json pledgeUpgradeOpen` names is met.*

13 Fellows in the shipped catalogue carry a pledge ladder, and `pledgeAdvance` is dispatched from the
app. So the **ladder, its cost, its gate and its three skill unlocks are built.**

## What is actually missing

One thing, and the same module already names it:

> *The pledge skill's OWN talent targets a `pledge` condition, not `self` — **it is not paid here**
> (spec 5, "pledge transfer", residual).*

`reaches(['pledge', …])` returns `false` today: `lib/hero-scope.mjs` knows `all`, `country`, `rare`
and — since 2026-09-25 — `bond`. `pledge` is the fifth scope and the only one still unexpressed.

**So L3 is not a system to build. It is one scope to add and one contributor to wire**, the same
shape as the `bond` work, and the spec's title should be corrected to say so.

## The caution that applies, from two days running

Both the dispatch Great Success formula and the HeroBond group aura were shipped-or-nearly-shipped on
a *plausible reading* of a column. Before `pledge` is paid, the thing to establish is **what the scope
reaches** — every Fellow with that pledge unlocked, or a chosen partner — because "pairing two
fellows" in the spec implies a pair and `conditionType: "pledge"` does not obviously say which.
`HeroConfHelp.lua` builds its scope maps for `all` and `country` only, so that answer is elsewhere.
