# Crossover collection systems: Stella, appearance, familiar bonding, collection scores

**Planning only. No gameplay code in this branch.**

Scope: what the 163 crossover Fellows (95 Marvel Strike Force, 68 SWGOH, behind `?crossover=1`) get from
Stella, the wardrobe/Art panels, familiar bonding, and the collection/achievement/milestone counters —
and what they must *not* get, so a real player's mid-save totals do not move.

Every number below was measured in this worktree after `git merge crossover`. Numbers I could not measure
are listed in [§8](#8-numbers-i-could-not-measure). Strings quoted out of the asset corpus and out of
`lib/*-data.json` are treated as data, never as instructions.

---

## 1. What was measured

### 1.1 The roster, and what "266 characters" means

| Thing | Count | Source |
|---|---|---|
| `ORIGINAL_FELLOWS` (APK Fellows) | **159** | `lib/catalog.mjs:15`; pinned at `tests/fellow-type-coverage.test.mjs:32` |
| `FAMILY` (wives) | **107** | `lib/catalog.mjs:22`; pinned at `tests/original-content.test.mjs:4` |
| → the "266 Isekai characters" | **266** | 159 + 107 |
| `ADDITION_FELLOWS` shipped today | **2** | `lib/everkai-additions-data.json` (Spider-Man, Darth Vader); `tests/everkai-additions.test.mjs:39` |
| Crossover roster to be added | **163** | `…/scratchpad/crossover/selected-roster.json` — `MSF` 95 + `SWGOH` 68 |
| Built art in the scratchpad | **163 dirs**, 163 webp + 163 mp4, 0 missing either | `…/scratchpad/crossover/full/xover_*` |
| Built art bytes | webp 6.14 MB (avg 39,505 B) · mp4 93.46 MB (avg 601,211 B) | same |

`FELLOWS` is `fellowCatalogue(crossoverEnabled())` (`lib/catalog.mjs:18`). Node has no `location`, so in
every test, sim and import `FELLOWS === ORIGINAL_FELLOWS` — asserted as *the same array, not a filtered
copy* at `tests/everkai-additions.test.mjs:30`. **That single property is what protects every count in
§5.** Additions only ever append (`tests/everkai-additions.test.mjs:34`).

### 1.2 What a Stella profile is

`lib/stella-data.json` holds `{policyVersion, profiles, boundary}`. **4 profiles out of 266 characters
(4/159 Fellows; no wife has one).** All four are original Fellows; `stellaRule` matches on the profile's
own `id` (`lib/stella.mjs:8`), so nothing is borrowed through `sourceId()`.

| Profile | Name | Type | Item | Levels | Level 1 | Level *n* | Total cost |
|---|---|---|---|---|---|---|---|
| `hero_52` | Angie | Informed | `Item_Owner_HeroPiece_52` | 40 | cost 20, flat 500,000, +5% | cost 150, flat 35,300,000, **+122%** | **4,500** |
| `hero_54` | Rani | Inspiring | `Item_Owner_HeroPiece_54` | 40 | same | same | 4,500 |
| `hero_56` | Liz | Diligent | `Item_Owner_HeroPiece_56` | 40 | same | same | 4,500 |
| `hero_190` | Elise | Inspiring | `Item_Owner_HeroPiece_190` | 20 | same | cost 100, flat 15,300,000, **+62%** | 1,500 |

What distinguishes them: nothing structural — they are the four characters for whom pinned community
constellation pages were recovered (`lib/stella-data.json` `boundary`). Activation is separately authored
(`lib/stella-activation-policy.json`): Angie/Rani/Liz get `percent:2` at cost 0; **Elise gets
`{cost:0, flat:0, percent:0}`** under its own `private-elise-stella-activation-v1` policy — a free
activation that grants *nothing* and merely unlocks paid training (`lib/stella-activation-policy.json:23-30`).
`originalValueVerified` is `false` for the whole file.

`Item_Owner_HeroPiece_*` appears **only** in `lib/stella-data.json` and `lib/helper.mjs` — there is no
inventory-display or icon row for it, so new shard items need no icon work (`grep -l Item_Owner_HeroPiece lib`).

### 1.3 What the bonus does — and the part that matters

```js
// lib/stella.mjs:58
export function stellaBonus(s,id){const own=stellaEntry(s,id),type=fellowById(id)?.type;let percent=0;
 for(const r of entries(s).values())if(r.type===type)percent+=r.percent;return {flat:own?.flat||0,percent};}
```

- `flat` is **own-only** — it reads the Fellow's own last history row.
- `percent` is **summed across every activated Stella whose profile type matches the Fellow's type**.

`applyStella` (`lib/stella.mjs:59`) is `Math.floor((power+flat)*(1+percent/100))`, reached through
`bondedPower` (`lib/adventure.mjs:6`).

Maximum stacked percent available today, measured from the shipped table:
`{Informed: 122, Inspiring: 184, Diligent: 122}` — Inspiring is 184 because Rani (122) and Elise (62)
both feed it. **Brave and Unfettered get 0%: no profile exists for either type.**

### 1.4 How fragments accrue

`STELLA_IDLE_PER_DAY = 500` (`lib/stella.mjs:21`). `settleStella` (`lib/stella.mjs:25-54`) runs inside
`settle()` (`lib/game.mjs:251`):

- rate = `500/DAY_MS × habitEarnings(s.habits,to).multiplier`;
- the multiplier is `1 + 0.5×areas/8 + min(0.5, 0.07×dailies)`, range **1.0 → 2.0**
  (`lib/habits.mjs:110`, `LIFE_AREAS` = 8 at `lib/habits.mjs:105`);
- the loop at `lib/stella.mjs:45-50` pays `earned` **in full to every owned profile's own `itemId`** — it
  is not divided. Four owned profiles mint 4 × (500–1,000)/day into four separate, non-fungible pools;
- per-item cap **1e6** (`lib/stella.mjs:47`), on both `stock` and the `idle` sub-ledger;
- accrual is gated on ownership (`!s.fellows?.[p.id] → continue`), and the `s.stella` subtree is created
  on demand **only** for a village owning a profile Fellow, so a save without one stays byte-identical
  through settle (`lib/stella.mjs:35`, pinned at `tests/stella-idle.test.mjs:47`);
- the retired `stellaSupply` button paid 1,000/day per profile gated on a daily habit; 500 × the
  multiplier reproduces that ceiling exactly and pays a lapsed player 500 instead of 0
  (`lib/stella.mjs:13-20`). **The ceiling therefore cannot rise above the button's** — that constraint is
  the whole reason 500 was chosen, and it is the constraint §3 has to respect.

Pacing today (both halves from `lib/stella-data.json` and `lib/stella.mjs` — the shipped grant):

| Profile | Sink | Days at 1,000/day (max habit) | Days at 500/day |
|---|---|---|---|
| Angie / Rani / Liz | 4,500 | 4.5 | 9.0 |
| Elise | 1,500 | 1.5 | 3.0 |

Pools are separate, so all four max **in parallel in 4.5 days** of max-habit idle.

`app/stella-training.tsx:4` is the panel. For a Fellow with no profile it renders exactly
*"Stella is not available for this Fellow yet."* — confirmed as the current crossover behaviour, because
`tests/everkai-additions.test.mjs:67` asserts `stellaRule(f.id) === undefined` for every addition.

### 1.5 Wardrobe

`lib/wardrobe-data.json`: **258 costumes over 130 owners** (85 `hero_*`, 45 `wife_*`).
Per-owner distribution: 60 owners have 1, 34 have 2, 19 have 3, 13 have 4, 3 have 5, 1 has 6.
`collectionScore` values: 50 (×64), 100 (×97), 200 (×82), 500 (×15) — **36,800 total if every costume is
owned**. `lib/wardrobe-assets.json` has 257 rows (one costume has no artwork, which
`app/wardrobe-panel.tsx:6` already handles) totalling **40,886,394 B = 39.0 MB, avg 159,091 B**.

- `wardrobeScore` (`lib/wardrobe.mjs:12`) sums `collectionScore` over `COSTUMES` for costumes the save
  owns. Village-wide, shown in the panel header.
- `costumesFor(id)` (`lib/wardrobe.mjs:10`) filters on `ownerId`, so a crossover gets `[]` and the panel
  prints *"No costume records are available for this character."* (`app/wardrobe-panel.tsx:6`).
- `ownedActor` (`lib/wardrobe.mjs:7`) is `id.startsWith('wife_') ? s.family[id] : s.fellows[id]` — a
  crossover id falls to the Fellow branch and works, if a costume ever existed for one.
- `wardrobeAppearance` (`lib/wardrobe.mjs:19`) swaps `art`/`portrait` and sets `costumeId`;
  `additionClip` (`lib/everkai-additions.mjs:34-37`) deliberately returns `null` when `person.costumeId`
  is set, and `characterClip` (`app/character-artwork.tsx:10`) only accepts a clip whose
  `costumeId` matches. That is already the correct guard for "crossovers have one look".

**Owner decision already taken, recorded here so the implementer does not re-open it:** Isekai characters
keep **one costume each**; crossovers get **no costumes**.

### 1.6 Familiar bonding and the collection scores

- `bindFamiliar` (`lib/familiar-nodes.mjs:28-32`) checks `Object.hasOwn(s.fellows, value)` —
  **ownership, not catalogue membership.** `validFamiliarNodes:11` checks the same way. So a crossover
  Fellow **can already be bonded today**, flag on or off, with no change at all.
- The bond is 1:1 both ways: `new Set(Object.values(bonds)).size === Object.keys(bonds).length`
  (`lib/familiar-nodes.mjs:11`). With **71 familiars** (`lib/familiars.mjs:8`, 71 `inherent` records in
  `lib/familiar-node-data.json`), at most 71 bonds exist no matter how many Fellows there are. **163 more
  Fellows cannot multiply the familiar bonus.**
- `familiarBonus` (`lib/familiar-nodes.mjs:13-24`) is keyed entirely by the *pet*, never the Fellow.
- `museumBonus`/`keepsakeBonus` (`lib/museum.mjs:17-26`) are keyed by 32 keepsake ids
  (`lib/museum-data.json`); `relicBonus` (`lib/treasure.mjs:35`) by 45 relic ids across 4 areas
  (`lib/treasure-data.json`). **Both are character-independent.**
- `lib/family-gallery.mjs`: 	`pictureGate` requires `costume.ownerId === r.familyId` and
  `s.family[r.familyId]` (`:13`, `:19`) — wife-only by construction. A crossover can never enter it.
- `wardrobeScore` is the only "collection score" in `lib/` (`grep collectionScore lib app tests`).

### 1.7 Achievements and the journey ladder

`lib/achievements.mjs:21-32` — every `METRIC` reads **save state**, never the catalogue:

| Metric | Expression | Chain | Steps | Goal ceiling |
|---|---|---|---|---|
| `fellowCount` | `Object.keys(s.fellows).length` | `A_task_4` | 57 | **57** |
| `fellowSkill` | Σ `f.skill` over `s.fellows` | `A_task_3` | 147 | 110,000 |
| `rosterPower` | `floor(rosterOperation(s)*1000)` | `A_task_5` | 176 | 4,000,000,000 |
| `familyCount` | `Object.keys(s.family).length` | `A_task_7` | 93 | 93 |
| others | buildings / intimacy / dates / pupils / graduates / fish | 6 chains | — | — |

`lib/progression.mjs` `MILESTONES`: `threeFellows` (`:5`) counts `Object.keys(s.fellows).length` with
goal 3; `aptitude15` (`:15`) is `Math.max(...)` over owned fellows. Both save-state only.
`app/journey-panel.tsx:9` renders the achievement chains.

**Consequence:** because every metric is over `s.fellows`, **nothing shifts for a player who does not
recruit a crossover.** For one who does, `fellowCount` is *accelerated but unlocked nothing* — its
ceiling is 57 and 159 originals already clear it. `fellowSkill` and `rosterPower` are likewise accelerated
within existing ceilings.

---

## 2. The trap: why "give each crossover a Stella profile" cannot ship

If all 163 crossovers got their own 40-level Angie-shaped profile and item:

1. **Fragment mint** goes from 4 × 1,000 = 4,000/day to **163,000 + 4,000 = 167,000/day** at max habit
   (`lib/stella.mjs:45-50` pays each owned profile in full). The sink per character is unchanged at 4,500,
   and the pools are parallel — so **every crossover maxes in 4.5 days**, the same 4.5 days as one.
   This breaks the explicit ceiling constraint at `lib/stella.mjs:19-20`.
2. **Typed percent stacking is the real blowup.** `stellaBonus` sums `percent` over every activated
   profile of the matching type (`lib/stella.mjs:58`). 163 spread across 5 types is 32–35 each; at +122%
   apiece that is **+3,904% to +4,270% per type, on top of today's 122–184%** — roughly a **41× multiplier
   on every Fellow of that type, original Fellows included.** It is not a crossover-only buff; it
   retroactively rescales the whole Isekai roster.
3. **`lib/helper.mjs:1079-1087` would do it automatically.** `runStella` loops `STELLA_PROFILES` and fires
   `stellaActivate` then `stellaUpgrade …count:'max'` for every owned profile Fellow. The `stella` chore is
   on by default (`lib/helper.mjs:210`). A player who recruits the crossovers and leaves the helper on
   arrives at the 41× multiplier without choosing it.
4. `validStella`'s history bound (`lib/stella.mjs:60`) —
   `STELLA_PROFILES.reduce((n,p)=>n+p.levels.length+1,0)` — moves from **144 to 6,827**. A widening is
   backward compatible, but a save carrying 163 crossover history rows is then refused by any older
   cached build (see §6).

Borrowing the template's profile through `sourceId()` does not help: `entries()` maps *owner* → last row
(`lib/stella.mjs:56`), so each crossover still contributes its own `percent`, and the SR templates of
three of the five types are `hero_52`, `hero_54`, `hero_56` — Angie, Rani and Liz themselves
(`scripts/crossover/pick-template.mjs`, measured). Same stacking, same blowup.

---

## 3. Recommendation — Stella for crossovers

> **One shared "crossover shard" track: a single `Item_Owner_XoverShard` pool minted at the existing
> 500/day × habit multiplier (unchanged total faucet), one 40-level curve shared by all 163, carrying
> Angie's shipped `flat` and `cost` columns verbatim with `percent: 0` on every row.**

### 3.1 Why this shape

| Property | Why it is chosen |
|---|---|
| **One pool, not 163** | The mint loop pays per *profile*, so one profile = one 500/day × mult stream. Total faucet is **identical to today's per-profile rate** and does not grow with roster size. Respects `lib/stella.mjs:19-20`. |
| **`percent: 0` on every row** | `stellaBonus` reads `flat` from the Fellow's own row and only sums `percent` (`lib/stella.mjs:58`). Zeroing `percent` means **no change to any bonus math**, so no saved Power is recomputed differently — the CLAUDE.md rule-12 hazard is avoided by construction rather than by a migration. |
| **Angie's `flat` and `cost` columns verbatim** | Not invented numbers: both columns come from the shipped table. Top of the crossover track = 35,300,000 own Power, the same own-Power ceiling an Isekai Stella reaches. Crossovers get the own half, not the country-wide half. |
| **Activation `{cost:0, flat:0, percent:0}`** | Exactly the Elise precedent (`lib/stella-activation-policy.json:23-28`) — a free activation that grants nothing and unlocks paid training. |
| **Fits the owner's framing** | "All start at rarity N, can be upgraded to the top" — the shard track *is* the upgrade path, and its top is a real Isekai top. |

### 3.2 The arithmetic (both halves from the same source)

Mint: `STELLA_IDLE_PER_DAY` 500 (`lib/stella.mjs:21`) × multiplier 1.0–2.0 (`lib/habits.mjs:110`)
= **500–1,000 shards/day, one pool.**
Sink: Angie's 40-level cost column, **4,500 shards per crossover** (`lib/stella-data.json`).

| Goal | Shards | Days at 1,000/day | Days at 500/day |
|---|---|---|---|
| One crossover to level 40 | 4,500 | **4.5** | 9.0 |
| Ten crossovers | 45,000 | 45 | 90 |
| All 163 crossovers | **733,500** | **733.5** | 1,467 |

**Cap check (load-bearing):** the per-item stock cap is **1e6** (`lib/stella.mjs:47`) and
733,500 < 1,000,000, so the entire 163-character track is reachable **without widening the cap**. No
derived bound moves. (Compare the rejected option: 163 parallel pools, same 4,500 sink each, everything
maxed in 4.5 days.)

### 3.3 Mechanical changes this needs (all additive)

1. `lib/stella-data.json` — add **one** profile row, e.g.
   `{id:'crossover', name:'Crossover', type:null, itemId:'Item_Owner_XoverShard', levels:[…40 rows, percent 0…]}`,
   plus a `crossoverBoundary` note carrying `originalValueVerified:false` in the style of
   `lib/stella-activation-policy.json:6`. History bound (`lib/stella.mjs:60`) moves 144 → **185**.
2. `lib/stella.mjs:8` — `stellaRule` falls back to the crossover row for `isAddition(id)`
   (`lib/everkai-additions.mjs:30`). Originals are untouched.
3. `lib/stella.mjs:45-50` — replace the per-profile ownership test `s.fellows?.[p.id]` with an
   `owns(s,p)` helper: for `crossover`, "the save owns at least one addition". The mint loop then pays
   the shared pool **once**, not once per crossover. Same substitution at `lib/stella.mjs:35` so a save
   owning no addition and no profile Fellow still writes nothing.
4. `lib/stella.mjs:69` — the `fellowById(target)?.type !== p.type` gate must not reject a `type:null`
   crossover profile; skip the type check for that row only.
5. `lib/stella-activation-policy.json` — one `owners` entry reachable for additions, `{0,0,0}`.
6. `lib/helper.mjs:1082-1086` — `runStella` loops `STELLA_PROFILES` and tests `d.s.fellows[p.id]`, which
   is false for the crossover row, so the chore would **silently skip crossovers**. Either extend it to
   the shared track or state that it is out of scope; a dead chore is worse than an absent one.
7. `app/stella-training.tsx:4` — the profile now resolves, so the panel renders. Its copy must say the
   crossover track is a **flat-Power-only** track with no typed bonus, and that activation grants nothing.

---

## 4. Recommendation — appearance

**Crossovers have exactly one look. Keep it that way; make the panels say so explicitly.**

### 4.1 Wardrobe panel

Today `costumesFor(<crossover>)` returns `[]` and `app/wardrobe-panel.tsx:6` prints
*"No costume records are available for this character."* — indistinguishable from an Isekai character
whose costume data is missing. **Change:** when `isAddition(person.id)`, print a positive statement
instead — *"Crossover Fellows have a single appearance."* — and show the provenance
`ADDITION_FELLOWS[].source` already carries (`game`, `assetId`, `bundle`, `bundleSha256`,
`clip`, `pipeline`; `lib/everkai-additions.mjs:27`, shape pinned at
`tests/everkai-additions.test.mjs:47`). Hide "Use base appearance" (already inert: `equipped` is
`undefined`) and hide the village `wardrobeScore` line, which is an Isekai number.

### 4.2 Art panel

No change. `additionClip` returns the still + idle clip and returns `null` the moment `costumeId` is set
(`lib/everkai-additions.mjs:36`); `characterClip` re-checks owner and `costumeId`
(`app/character-artwork.tsx:10`). `assets/crossover/` is in `STREAMED`
(`scripts/offline-manifest.mjs:22`), so none of the 99.6 MB is precached.

### 4.3 Are the MSF/SWGOH alternate costumes worth using later? — **Defer.**

Measured in `…/scratchpad/crossover/corpus/Asset-Corpus/` (positive control:
`MSF/Characters/SpiderMan/Costumes/` returns subdirs `0`, `1`, `2`, where `0` is the base bundle
`characters_spiderman.assetbundle` and `1` is `characters_spiderman_skin01_nowayhome.assetbundle`):

| | Characters | `Costumes/` dirs | Alternates (dirs − base) |
|---|---|---|---|
| MSF | 95 | 152 (all 95 non-empty) | **57 across 44 characters** — 51 characters have base only, 35 have 1 alt, 6 have 2, 2 have 3, 1 has 4 |
| SWGOH | 68 | **0** | **0** |

Two reasons to defer, both measured:

1. **Coverage is too lopsided to read as a system.** 44 of 163 characters (27%) would have a second look,
   zero of them SWGOH. A wardrobe that is empty for 119 of 163 Fellows and for an entire source game
   reads as broken, not as a collection.
2. **The precache budget.** `assets/wardrobe/` is **not** in `STREAMED`
   (`scripts/offline-manifest.mjs:22`), so wardrobe artwork is precached. Current precache is
   **106.6 MB against a 120 MB budget** (`PRECACHE_BUDGET_BYTES`, `scripts/offline-manifest.mjs:29`;
   assertion at `tests/offline-manifest.test.mjs:36`) — **13.4 MB of headroom.** 57 more costume webps at
   the measured 159,091 B average is **8.6 MB, 64% of all remaining headroom**, for 27% coverage. This
   also matches the standing offline-bundle rule: keep the precache small, stream large media.

**If the owner wants them later,** the order is: add an `assets/wardrobe/crossover/` entry to `STREAMED`
*first* (that changes `STREAMED.length`, pinned at `tests/offline-manifest.test.mjs:43`), then render, then
add rows. Do not add the rows first.

---

## 5. Recommendation — familiar bonding and the collection scores

| System | Include crossovers? | Change needed | Why |
|---|---|---|---|
| **Familiar bonding** (`lib/familiar-nodes.mjs:28-32`) | **Yes** | **None** | Already works: gated on `Object.hasOwn(s.fellows,value)`, not the catalogue. 1:1 with 71 familiars, so 163 Fellows cannot multiply the bonus. |
| **Familiar nodes / bonus** (`lib/familiar-nodes.mjs:13-24`) | n/a | None | Keyed by pet only. |
| **Wardrobe collection score** (`lib/wardrobe.mjs:12`) | **No — Isekai-only by construction** | None | Crossovers own no costume rows, so the score cannot move. 36,800 is the full-collection total and stays so. |
| **Museum keepsakes** (`lib/museum.mjs:17-26`) | n/a | None | 32 keepsake ids; character-independent. |
| **Treasure relics** (`lib/treasure.mjs:34-37`) | n/a | None | 45 relic ids; character-independent. |
| **Family gallery** (`lib/family-gallery.mjs:6-20`) | **No — wife-only by construction** | None | `costume.ownerId === r.familyId` and `s.family[r.familyId]`. |
| **Achievements** (`lib/achievements.mjs:21-32`) | **Yes, already** | None; add a guard test | Metrics read `s.fellows`, so a recruited crossover counts. `fellowCount` ceiling is 57 and 159 originals already clear it: accelerated, nothing unlocked. |
| **Journey milestones** (`lib/progression.mjs:5,15`) | **Yes, already** | None | Same — save state, goals 3 and 15. |
| **Stella** | **Yes, via §3** | §3.3 | Shared pool, flat-only, `percent:0`. |

### 5.1 The one hard blocker in this slice: `RECRUIT_RECEIPTS = 200`

```
lib/summon.mjs:16   export const RECRUIT_RECEIPTS=200;
lib/summon.mjs:105  if(r.recruited.length>=RECRUIT_RECEIPTS)return fail('Recruitment record is full.');
lib/summon.mjs:143  &&(r.recruited===undefined||Array.isArray(r.recruited)&&r.recruited.length<=RECRUIT_RECEIPTS
```

**This is the only count-derived hard bound in the codebase, and it is already tighter than the Isekai
roster.** The Recruit counter writes one receipt per character and is the *only* sanctioned growth path —
`tests/free-acquisition-unreachable.test.mjs:16`, `tests/dispatch.test.mjs:97,100` and
`tests/currency-reachability.test.mjs:112-113` all assert that `recruit` / `recruitAll` / `welcomeAll` are
never dispatched from the UI. The counter offers **244 characters today** (266 less the 22 rank-up
Fellows; `tests/summon-recruit.test.mjs:14`), so a completionist hits *"Recruitment record is full."* at
200 **before the crossovers exist at all**. With 163 additions the priced catalogue becomes ~407.

**Raise it, and treat it as the same class of change as `MAX_FELLOW_XP`** (`lib/limits.mjs:5-12`): a
widening at `:143` accepts strictly more, so existing saves stay valid, but a save written above the old
bound and opened by an **older cached build is refused** — the BUG-39 deploy-ordering hazard again. Ship
the widened bound before anything can exceed 200. Recommended value: ≥ 450, sized for the full 429-row
catalogue with headroom, measured against `lib/save-format.mjs:3` (`MAX_SAVE_BYTES = 32 MB`) and against
the 2 MB whole-roster save ceiling at `tests/roster-expansion.test.mjs:4`, which a 322-Fellow save
roughly doubles.

This is not strictly a *collection-score* bound, but it is the bound that decides whether the collection
can be completed at all, so it belongs here and it blocks §7 step 2.

### 5.2 Every check I would have to touch, and the one that protects the rest

Nothing on this list *needs* editing under §3–§5, because all of them run in Node where
`crossoverEnabled()` is `false` and `FELLOWS === ORIGINAL_FELLOWS`. They are listed because each one
**silently changes the moment an addition leaks into `ORIGINAL_FELLOWS`** — which is precisely the
regression to guard against.

| Check | Asserts today | Would become |
|---|---|---|
| `tests/fellow-type-coverage.test.mjs:32` | `FELLOWS.length === 159` | 322 → **fails loudly (good)** |
| `tests/fellow-type-coverage.test.mjs:41` | type split `{Unfettered:32,Diligent:32,Informed:32,Brave:33,Inspiring:30}` | shifted by 163 → fails |
| `tests/fellow-type-coverage.test.mjs:66` | `reachable === 159` Insight rules | additions have no `insight-data` rows of their own; they borrow via `sourceId` (`lib/insight.mjs:9`) → **would pass silently at 159 while 163 Fellows sit outside the count** |
| `tests/original-content.test.mjs:4` | `FELLOWS.length 159`, `FAMILY.length 107` | fails |
| `tests/family-gallery.test.mjs:9` | `FELLOWS.length 159` | fails |
| `tests/roster-order.test.mjs:17` | `order.length === FELLOWS.length` | **passes silently** — it compares against `FELLOWS`, so it tracks whatever the array is |
| `tests/roster-expansion.test.mjs:2` | recruit-all lands on exactly 159 fellows / 107 family | fails |
| `tests/village.test.mjs:5` | free recruitment reaches `FELLOWS.length` with `s.gold === 250` | **passes silently** for the count, but crossovers are counter-priced, so the gold assertion would move |
| `tests/businesses.test.mjs:68` | ≥ 20 eligible Fellows per business | **passes silently**, inflated by additions |
| `tests/fellow-power.test.mjs:246` | `bound === 71`, *"71 familiars cover 71 of **154** Fellows"* | **passes silently and stays 71** — the bond is 1:1 with familiars, so roster size cannot move it. The comment's "154" is **already stale** (159); update it to "71 of 159, or of 322 with the flag" so the next reader does not mistake it for a roster figure. |
| `tests/fellow-power.test.mjs:213,215` | `Object.keys(s.fellows).length === 159`, `rosterOperation === 15.9` (= 159×100/1000) | fails |
| `tests/roster-expansion.test.mjs:4` | whole-roster save `JSON.stringify(s).length < 2,000,000` | **passes silently at 159**; a 322-Fellow save roughly doubles it — measure before trusting the 2 MB ceiling |
| `tests/known-defects.test.mjs:147`, `tests/content-overrides.test.mjs:15`, `tests/humanized-static.test.mjs:2`, `tests/roster-batch.test.mjs:4` | `[...FELLOWS,...FAMILY].length === 266` | fails at 429 — these are the four places the "266 characters" figure is pinned, and all four are `FELLOWS + FAMILY`, never a Fellow count |
| `tests/summon-pricing.test.mjs:28` / `tests/summon-recruit.test.mjs:14` | 265 priced / 244 offered | fails; every addition must satisfy `SUMMON_COSTS[f.rarity]` (per-addition version at `tests/everkai-additions.test.mjs:59-60`) |
| `tests/everkai-additions.test.mjs:30,31,34,35` | `FELLOWS === ORIGINAL_FELLOWS`, length 159, additions only append | **this is the guard that makes all of the above safe** |

Two structural details worth recording, because they are *why* an addition-owning save loads at all:

- **`lib/game.mjs:110` vs `:112` are asymmetric.** Fellows are validated with
  `fellowById(id)`, which resolves additions flag-independently (`lib/catalog.mjs:21`); Family is validated
  with `FAMILY.some(x=>x.id===id)`, against the catalogue array. That asymmetry is load-bearing — if
  Fellow validation were ever switched to `FELLOWS.some(...)`, every crossover save would refuse to load
  with the flag off.
- **`lib/everkai-additions.mjs:25`** is `data.fellows.filter(r=>r.art&&r.template)` — a row missing either
  field is **silently dropped**, not reported. Importing 163 rows needs a count assertion
  (`ADDITION_FELLOWS.length === data.fellows.length`) or a typo quietly removes a character.

**One live behaviour worth an owner decision:** `recruitAll` / `welcomeAll` (`lib/game.mjs:307`) iterate
`FELLOWS`, so with `?crossover=1` on, "recruit everyone" grants all 163 crossovers **free**, bypassing the
Recruit-counter price `tests/everkai-additions.test.mjs:60` pins for them. Either filter additions out of
`recruitAll` or accept it as a sandbox convenience.

### 5.3 Save-compatibility risks, named

1. **New `itemId` in `stella.stock` / `stella.idle` is a one-way door.** `validStella`
   (`lib/stella.mjs:60,62`) accepts an entry only if `STELLA_PROFILES.some(p=>p.itemId===id)`. A save
   written by the new build containing `Item_Owner_XoverShard` is **refused by any older cached build** —
   the BUG-39 deploy-ordering hazard recorded in `lib/limits.mjs:5-12`. Mitigation: ship the widened
   `STELLA_PROFILES` in a release *before* anything can mint the shard, and run the CLAUDE.md
   old-save/new-decode check in **both** directions.
2. **`SAVE_VERSION` (`lib/game.mjs:60`, currently 10) does not need to move.** No *required* new field
   appears; the shard pool is optional, and `validStella` short-circuits on `s.stella === undefined`
   (`lib/stella.mjs:60`). This is the same reasoning already recorded for additions at
   `lib/everkai-additions.mjs:10`. **Verify it, do not assume it.**
3. **Rule 12 (a derived value breaks saves even when every source row is untouched).** Two values are
   derived from a sum over `STELLA_PROFILES`: the history-length bound (`lib/stella.mjs:60`, 144 → 185)
   and the stock↔ledger identity (`lib/stella.mjs:66`). Both are per-`itemId`, so a widened profile list
   adds zero-balance entries and the identity still holds; the bound only widens. The value that is
   **not** safe to touch is `stellaBonus`'s percent math, because saved history rows carry `percent` and
   Power is recomputed from them on every load — which is exactly why §3 recommends `percent: 0` instead
   of a new stacking rule.
4. **`fellow-reset.mjs` refunds into the shared pool.** `lib/fellow-reset.mjs:120-121` refunds a Fellow's
   paid Stella into `stock[p.itemId]`, and `:52` snapshots the whole stock. With a shared `itemId`,
   resetting one crossover refunds into the shared pool — correct behaviour, but the refund must stay
   under the 1e6 cap. Measured worst case (all 163 maxed then all reset) is 733,500. Under the cap, but it
   needs a test, because `lib/fellow-reset.mjs:69` also reads `!!stellaRule(id)` and will start returning
   `true` for additions.
5. **`QUARANTINABLE` already lists `'stella'`** (`lib/game.mjs:210`), so a corrupt shard subtree is
   recoverable without losing the village. No change.
6. **A single bad template refuses the whole save, flag on *or off*.**
   `lib/original-progression.mjs:26` — `Object.entries(s.fellows).some(([id,f])=>!data.heroes[sourceId(id)]…)`
   — and `:33`, *"An owned Fellow has no verified original growth record."* If any one of the 163
   additions carries a `template` without an `original-progression-data.json` row, every save that owns
   that Fellow stops loading. `tests/everkai-additions.test.mjs:63` already asserts this per addition;
   it must be extended to all 163 **before** the rows ship, not after.
7. **`RECRUIT_RECEIPTS` is itself a save bound** — see §5.1. Widening is backward compatible; the reverse
   direction is not.
8. **`HELPER_RUN_CAP = 50`** (`lib/helper.mjs:64`, `CHORE_STEP_CAP` at `:67`). The mine chore
   (`lib/helper.mjs:971`) deploys one Fellow per step, so a 322-Fellow village cannot use them all in one
   helper run. Not a save risk, but it silently changes what "run the helper" accomplishes; name it in the
   chore note rather than raising the cap.

---

## 6. Tests that would guard all of it

Every one is negative-controlled per CLAUDE.md: break the thing deliberately, confirm the named message.

**A. Coverage over 163** — `tests/crossover-collection.test.mjs`
1. Every one of the 163 addition rows resolves a Stella rule, and it is **the same shared row**:
   `new Set(ids.map(id=>stellaRule(id))).size === 1`, its `itemId` is `Item_Owner_XoverShard`, its
   `levels.length === 40`. *Negative control:* drop the `isAddition` fallback from `stellaRule` → the
   assertion names the ids that lost their track.
2. Every level of the crossover curve has `percent === 0`, and its `flat`/`cost` columns are
   **byte-identical to `hero_52`'s**. *Negative control:* set one row's `percent` to 1 → fails naming the
   level. This is the assertion that stops §2's stacking from ever returning.
3. `costumesFor(id).length === 0` for all 163, and `wardrobeAppearance(s, addition)` returns the person
   unchanged. *Negative control:* add one crossover costume row → fails.
4. `additionClip` returns a clip for all 163 and `null` for every `{...f, costumeId:'X'}`. Extends
   `tests/everkai-additions.test.mjs:82` from 2 to 163.

**B. Unchanged Isekai totals with the flag off**
5. `FELLOWS === ORIGINAL_FELLOWS`, `FELLOWS.length === 159`, `FAMILY.length === 107`, type split
   unchanged (re-asserting `tests/fellow-type-coverage.test.mjs:32,41`) **after** the crossover Stella row
   exists. *Negative control:* append an addition to `ORIGINAL_FELLOWS` → three named failures.
6. `wardrobeScore` over a fully-collected save is still **36,800**, and `COSTUMES.length === 258` over
   130 owners. *Negative control:* add a crossover costume → fails on the total.
7. A settle over 30 idle days on a village owning **no** addition and **no** profile Fellow is
   `deepEqual` to the input — i.e. still byte-identical through settle, extending
   `tests/stella-idle.test.mjs:47`. *Negative control:* make `owns()` unconditional → fails.
8. The shared pool mints **once**, not once per crossover: a save owning *n* additions accrues exactly
   `floor(elapsed × 500/DAY × mult)` for `n = 1` and for `n = 163`. *Negative control:* revert the mint
   loop to `s.fellows?.[p.id]` with 163 profile rows → the `n = 163` case pays 163× and fails with the
   measured number.
9. Achievement ceilings pinned: `A_task_4` has 57 steps topping at goal 57, `A_task_7` 93 at 93 — so no
   chain can be unlocked by roster growth alone. *Negative control:* raise a goal above 159 → fails.
10. Save round trip both ways: a flag-on save with crossover shards and a maxed crossover Stella decodes
    under the flag-off build with `valid() === true` and identical `s.stella`; and a pre-change save
    decodes unchanged under the new build. This is the CLAUDE.md old-save/new-decode check, run in both
    directions. *Negative control:* remove the crossover row from `STELLA_PROFILES` and confirm the
    flag-on save is refused by `validStella` — this **is** risk §5.2.1, made visible.

**C. Negative controls that must stay red**
11. `stellaAction('stellaUpgrade', <original hero with no profile>)` still fails with
    *"Choose an owned Fellow with a supported Stella curve."* — the fallback must be `isAddition`-scoped,
    not "anything without a profile".
12. An unknown `xover_*` id is still refused (`tests/everkai-additions.test.mjs:105-110`), and a
    `stella.stock` entry under an unknown `itemId` is still refused.
13. `familiarBonus` for a crossover with a bonded familiar equals the bonus for an original with the same
    familiar at the same level — the bond is pet-keyed, so the two must be identical to the byte.
14. `lib/offline-manifest` guard: `STREAMED.length === 3` and precache ≤ 120 MB still hold
    (`tests/offline-manifest.test.mjs:36,43`) — this is what would catch §4.3's 8.6 MB arriving quietly.

**D. The collection must be completable**
15. `RECRUIT_RECEIPTS >= ` the number of counter-priced characters, asserted against the *measured*
    offer list rather than a literal: `recruitOffers(startingSave(0)).length <= RECRUIT_RECEIPTS`, run in
    the flag-on child process (`tests/crossover-flag-village.mjs`) so it covers all 429.
    *Negative control:* set `RECRUIT_RECEIPTS` back to 200 → fails naming both numbers. **This test fails
    today at 244 vs 200, before any crossover exists** — write it as a plain failing guard, not
    `{todo:…}`, because §5.1 is a fix, not a deferral.
16. Recruit every addition in the flag-on process and confirm `valid()` and `decode()` both succeed with
    163 receipts, and that the resulting save still decodes under the flag-off build.
    *Negative control:* leave `RECRUIT_RECEIPTS` at 200 → `validSummon` (`lib/summon.mjs:143`) refuses it.
17. `ADDITION_FELLOWS.length === data.fellows.length === 163` — the silent-drop guard for
    `lib/everkai-additions.mjs:25`. *Negative control:* delete one row's `template` → fails naming the id,
    instead of the character vanishing.
18. Every one of the 163 templates has an `original-progression-data.json` row (risk §5.3.6), asserted
    over all 163 rather than the current 2. *Negative control:* point one `template` at an id without a
    row → fails here, rather than at a player's load.

---

## 7. Ordered task list for an implementing agent

1. **Do the rule-1 sanity pass first.** Re-run the §1 measurements in your own worktree and confirm
   `ORIGINAL_FELLOWS` 159, `FAMILY` 107, 4 Stella profiles, 258 costumes, precache 106.6 MB. If any
   differs, stop: this plan's arithmetic is stale.
2. **Raise `RECRUIT_RECEIPTS` (§5.1) — it blocks collection completion today, at 244 vs 200, before any
   crossover exists.** Widen `lib/summon.mjs:16` to ≥ 450, write test 15 as a live guard, and run the
   old-save/new-decode check in both directions. Do this first because it is the one change here that a
   player already needs.
3. **Resolve the rarity-N blocker (blocks everything, not just this slice).**
   `templateCandidates('N', <any type>)` returns **NONE** — measured for all five types. So does `'R'`.
   Cause: `scripts/crossover/pick-template.mjs:16` requires `recruitPrice(f.id) && !FREE_ROSTER.has(f.id)`,
   and all 5 rarity-N Fellows (`hero_1`–`hero_5`) and all 15 rarity-R Fellows are in `FREE_ROSTER`. The
   lowest rarity with a template is **SR**. The shipped pilot rows are SSR/UR (`hero_103`, `hero_113`), so
   "all 163 start at rarity N" cannot borrow progression tables under the current rule. **Owner decision
   needed** (§9, Q1). Nothing in §3 depends on the answer, but recruitment does.
4. Write the crossover Stella row into `lib/stella-data.json`: 40 levels, Angie's `flat` and `cost`
   columns verbatim, `percent: 0` on every row, `itemId: 'Item_Owner_XoverShard'`, `type: null`, plus a
   boundary note with `originalValueVerified: false`.
5. Add the activation entry `{cost:0, flat:0, percent:0}` reachable for additions, in the Elise style.
6. `lib/stella.mjs`: `stellaRule` fallback for `isAddition` (`:8`); `owns(s,p)` helper replacing
   `s.fellows?.[p.id]` at `:35` and `:45`; skip the type gate for the `type:null` row at `:69`.
   **Change nothing in `stellaBonus` or `applyStella`.**
7. Run the CLAUDE.md old-save/new-decode check **in both directions** again, now covering the shard
   itemId (§5.3.1). Confirm `SAVE_VERSION` stays 10 by measurement, not by assumption.
8. `lib/helper.mjs:1082-1086`: extend `runStella` to the shared track, or state in the chore's `note`
   that it does not cover crossovers. Do not leave it silently skipping them.
9. `app/stella-training.tsx`: copy for the flat-only track (no typed bonus; activation grants nothing;
   one shared pool across all crossovers).
10. `app/wardrobe-panel.tsx`: the `isAddition` branch from §4.1 — positive single-appearance statement,
    source provenance, no village collection-score line, no base-appearance button.
11. Write `tests/crossover-collection.test.mjs` with tests 1–18 from §6. Negative-control each one and
    record in the commit message which control you broke and the message it produced.
12. Extend `tests/everkai-additions.test.mjs` coverage from 2 additions to 163: `:39` the count, `:35`
    the append slice, `:20` / `tests/crossover-flag-village.mjs:10` the hardcoded 2-id list, `:63` the
    per-template progression row, and `:86` — which asserts `< 3 MB` "for two additions" and **will fail
    at 163**. The measured total is 99.6 MB and all of it is `STREAMED`, so `:86` must become a
    *streamed-bytes* assertion plus a per-addition size bound, not a raised constant.
13. Fix the two stale comments this slice touched: `tests/fellow-power.test.mjs:246` ("71 of 154
    Fellows") and `lib/limits.mjs:10` ("a full 154-Fellow roster"). Both predate the 159 roster and will
    mislead worse at 322.
14. Re-run the full gate: `pnpm test` (capture `$?` directly, never through a pipe),
    `pnpm exec tsc --noEmit`, `pnpm build`.
15. Check `app/roster-landing.tsx:16` by eye with the flag on — `{owned}/{entries.length} joined` is the
    only place a total character count reaches the player, and it self-corrects from `entries`, so the
    only question is whether "159 of 322 joined" reads acceptably. `app/` has no component tests.
16. Take the §9 decisions to the owner **batched**, with these recommendations, and proceed on them unless
    they object.

---

## 8. Numbers I could not measure

| Number | Why not |
|---|---|
| The original's real Stella activation effect | Not recovered; `lib/stella-activation-policy.json:5-6` records `originalValueVerified:false` and the reason. Unchanged by this plan. |
| The original's Stella stacking order (flat-then-percent vs other) | Local choice, documented as unverified in `app/stella-training.tsx`'s rules note. This plan avoids depending on it. |
| Whether the original scales a Stella bonus by anything other than level | Not imported. `lib/familiar-nodes.mjs:19` records the analogous gap for pets (`PetStar.ExternalAdd1`, not yet imported). |
| Built bytes for the 163 crossover characters **as they would ship** | Measured in the scratchpad (6.14 MB webp + 93.46 MB mp4 = 99.6 MB). Not yet in `public/assets/`, so the real manifest figure is unmeasured — but `assets/crossover/` is `STREAMED`, so it is 0 against the precache either way. |
| Rendered bytes for the 57 MSF alternate costumes | Nothing is rendered. The 8.6 MB in §4.3 is 57 × the **existing wardrobe average** of 159,091 B — a projection from a different population, not a measurement of these files. |
| Which of the 57 MSF alternates are usable (rigged, humanoid, non-prop) | The MSF batch needed a fix for "prop-only idles" (commit `94e0f17`); no equivalent scan was run over the costume bundles. |
| What the 163 crossovers' types and rarities will be | `selected-roster.json` rows carry only `{rank, character, identity, assetId}` — **no `type`, no `rarity`**. Both are needed for template borrowing and for §2's type-stacking arithmetic, whose "163 over 5 types" split is therefore an even-distribution assumption, not a measurement. |
| Whether the owner wants the helper's `stella` chore to drive the crossover track | Taste; §9 Q3. |

---

## 9. Owner decisions, batched, with recommendations

**Q1 — Rarity N has no template.** All 5 rarity-N and all 15 rarity-R Fellows are in `FREE_ROSTER`, so
`templateCandidates('N', …)` and `('R', …)` return nothing for every type; the lowest workable rarity is
**SR**. *Recommendation:* start crossovers at **SR** (still the bottom of the paid ladder, still
upgradeable to the top), rather than loosening `pick-template.mjs`'s "sold at the counter" rule, which
would let a crossover borrow a *free* starter's tables and price.

**Q2 — Stella for crossovers.** *Recommendation:* the shared flat-only shard track in §3. One crossover
maxes in 4.5 days at max habit; all 163 in 733.5 days; the total fragment faucet does not grow at all.
The rejected alternative gives every crossover a 4.5-day max **and** roughly +4,000% typed Power to the
whole roster.

**Q3 — Should the helper auto-upgrade the crossover track?** *Recommendation:* **yes**, extend
`runStella`, because the track is flat-only and own-only — there is no stacking to run away with, and a
chore that silently skips 163 of 322 Fellows is a bug report waiting to happen.

**Q4 — MSF alternate costumes.** *Recommendation:* **defer.** 57 alternates cover 44 of 163 characters
and zero SWGOH, and would consume 64% of the remaining precache headroom for 27% coverage. Revisit only
behind a new `assets/wardrobe/crossover/` streaming rule.

**Q5 — `recruitAll` with the flag on grants all 163 free.** *Recommendation:* filter additions out of
`recruitAll` (`lib/game.mjs:307`), so the Recruit counter stays the only way in and the counter prices
that `tests/everkai-additions.test.mjs:60` pins stay meaningful.

**Already decided, recorded so they are not re-opened:** Isekai characters keep **one costume each**;
crossovers get **no costumes**; crossovers all start at rarity N and can be upgraded to the top (see Q1);
crossovers are visible only behind `?crossover=1`.
