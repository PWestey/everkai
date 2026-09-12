# Fellow Stars, and what star shards buy

Star shards were paid out by perfect habit days from the moment the summon economy shipped, into a
subtree nothing read. This is the sink, and this records which parts of it come from the original
and which are ours.

## From the original

- **The ladder is seven deep.** `SkillBase.json` carries 1,004 rows with `skillType:
  "Hero_Star_Halo_Nomal"`, and `maxUpgradeLevel` is 7 on 897 of them.
- **Most characters have one.** 156 of 181 `Hero.json` rows carry a `heroStarHaloSkill`, each a
  single `HeroNN_Star_Skill_1`.
- **The recruit currency doubles as the star currency.** `Item.json` describes
  `Item_Exchange_Hero_Universal` as "Used to encounter new families and fellows in Drakenberg. It can
  also be used to improve Fellow Stars." That is why Everkai spends a habit-earned summon currency on
  stars rather than inventing a separate one.
- **A halo is a percentage buff, not a flat stat**, and in the original it radiates by country:
  `skillProp: {id:'atk', propType:'finalpercent'}` under `targetCondition: {conditionType:'country'}`.

Source: `~/Documents/Codex/2026-09-07/isekai-parallel-roaming/data/{SkillBase,Hero,Item}.json`.

## Ours, and labelled as such

**+5% Aptitude per star, seven stars, costing 10/20/30/50/70/100/140 shards** (420 for a full
Fellow). A perfect day pays 10 shards, so the first star lands after one perfect day and a maxed
Fellow is about 42 of them. These are local balance, in the same class as artifact upgrade costs,
the stage power curve and the Power formula.

Two deliberate departures from the source:

- **Aptitude, not attack.** The original's halos are scoped by `effectSystemName` to Commercial War,
  Tower Defense, Week Boss, Guild War and Co-op Boss — multiplayer and event modes Everkai removed.
  Of the effect types that survive the single-player adaptation (`talentpercent`,
  `equipmentLvLimit`, `factionEducateProsperity`), Aptitude is the one that already drives this
  game's earnings.
- **Self, not country-wide.** The radiating country halo needs a country field wired through the
  roster, and makes the payoff indirect. A star improves the Fellow that earned it.

## Where it applies

The bonus lives in `fellowFactor` in `lib/adventure.mjs`, deliberately, because that is the single
point both `buildingRate` (gold per second) and `fellowPower` (Power) pass through. Putting it in
`bondedPower`'s additive aptitude stack instead — where museum, familiar, fishing and Echo bonuses
sit — would have raised Power while leaving village earnings flat, because `buildingRate` calls
`fellowFactor` on the raw Fellow record.

`bondedPower` has a second branch for original progression that rebuilds the expression by hand
rather than calling `fellowFactor`, so it applies `starredAptitude` separately. A change to one
without the other silently does nothing for players on that track.

Stars are stored on the Fellow record and only once earned, following `talentLevel`. A save without
the field is untouched, and `starredAptitude` at zero stars is an exact no-op rather than a rounding,
which `tests/star-track.test.mjs` asserts directly.

## A calibration that cannot be done, so nobody repeats it

The original's star halos carry `skillProp_Initial` values of 500/1000/1500 with an explicit
`propType`. Whether 500 means 5% or 500% cannot be settled from anything Everkai already trusts:

- `artifact-echo-data.json` and `artifact-support-data.json` are the only shipped data imported from
  this extraction that carry a `percent`. **Every one of their source rows is a flat `{id:'talent'}`
  prop with no `propType`** — `Weapon_6_21_HeroSkill_146` is `skillProp_Initial: 100` and ships as
  `aptitude: 100`; `Weapon_6_18_HeroSkill_W144` is `150` and ships as `aptitude: 150`.
- Their shipped `percent` values (20, 30) came from the `zik-ascend` wiki, not from `SkillBase.json`.
- Zero echo rows resolve to a raw row bearing a `propType`, so there is no known-good pair on both
  sides to compare.

What *is* established: for the flat case, `skillProp_Initial` maps 1:1 to an Aptitude amount. The
percent scale is not recoverable this way, which is why the per-star magnitude above is declared
local balance instead of being presented as sourced.
