# VIP-locked characters, and where they live in Everkai

The original sold nine characters exclusively through paid VIP levels. Everkai has no recharge, no
VIP track and no real-money path of any kind, so in this game those nine had **no acquisition route
at all**. This records which nine they are, how that was established, and what Everkai does instead.

## The decision

- **Neptune (`hero_195`) and Bridget (`wife_191`) are granted at the start.** They are seeded by
  `startingSave()` in `lib/game.mjs`, and `newJourney()` grants them too, so starting over does not
  silently take them away.
- **The other seven need nothing special.** The Recruit counter sells every shipped, priced
  character, so all seven are already reachable with habit-earned currency at ordinary prices.

`fresh()` deliberately does **not** include them. It is the baseline for the test suite and for save
validation, not what a player receives — and `tests/summon-recruit.test.mjs` buys these exact two ids
to prove a UR costs two insignias and that Family members arrive in Family shape.

## The nine

Shipped name is what Everkai renders; source name is what the APK extraction contains. `hero_193` is
the one that differs: the demon→angel rewrite renamed Mammon to Maren and set the race to Angel, via
`lib/content-overrides.json`. The extraction itself is left factual on purpose.

| VIP tier | id | Shipped name | Source name | Rarity | In Everkai |
|---|---|---|---|---|---|
| 1 | `hero_190` | Elise | Elise | SR | Recruit · 1 Acquaint Stone |
| 2 | `hero_193` | **Maren** | Mammon | SSR | Recruit · 2 Acquaint Stones |
| 3 | `wife_191` | Bridget | Bridget | SSR | **Starter pick** |
| 4 | `hero_191` | Trady | Trady | SSR → UR | Recruit · 2 Acquaint Stones |
| 5 | `hero_192` | Mescal | Mescal | SSR → UR | Recruit · 2 Acquaint Stones |
| 6 | `wife_192` | Nibel | Nibel | SSR | Recruit · 2 Acquaint Stones |
| 7 | `hero_194` | Shlomo | Shlomo | SSR → UR* | Recruit · 2 Acquaint Stones |
| 8 | `hero_195` | Neptune | Neptune | UR | **Starter pick** |
| 9 | `wife_201` | Nirvana | Nirvana | UR | Recruit · 2 insignias |

Verified shipped, priced and offered: all nine resolve through `FELLOWS`/`FAMILY`, carry a rarity in
`public-roster.json`, and appear in `recruitOffers()`. That check matters — `hero_60` proves a
catalog entry can exist with no rarity anywhere and therefore no price.

## Method

VIP tiers live in `Vip.json`, but it references rewards by id (`reward: "Reward_VIP_3"`) and never
names characters. The character grants are in `Rewards.json`, where a character is handed over as a
`Item_Owner_<Id>` content entry. Joining the two gives the list:

    Vip.json  →  Reward_VIP_<tier>  →  Rewards.json content[]  →  Item_Owner_Hero_195

Source: `~/Documents/Codex/2026-09-07/isekai-parallel-roaming/data/{Vip,Rewards}.json`.

"VIP-locked" is defined as: **every** reward row granting that character's `Item_Owner_*` is a
`Reward_VIP_*` row. Under that test exactly nine qualify, and zero characters appear in a VIP reward
while also being reachable some other way — the set is cleanly exclusive, with no partial cases to
adjudicate.

## Two scans that produced wrong answers

Recorded so the numbers above can be trusted, in the same spirit as `docs/faucet-map.md`.

- **Not every VIP reward id ends in a number.** Region variants exist (`Reward_VIP_2_TWJP`), so
  sorting tiers with `int(id.rsplit('_',1)[1])` throws. Parse tiers tolerantly.
- **`Test_Hero_Pack20` is not an acquisition path.** Counting that QA pack as a real source made
  every character look non-exclusive and produced a confident "0 characters are VIP-only", which is
  wrong. Exclude `Test_*` rows before deciding what is reachable.
