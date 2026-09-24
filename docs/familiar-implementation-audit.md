# Familiar implementation audit — the Everkai side

**Scope.** What Everkai renders for Familiars today, read from the code alone, so that the
screen-by-screen spec work coming next has a truthful baseline. Companion to
`docs/fellow-screen-specs/` and `docs/family-screen-specs/`, which did the same job for the two
character surfaces after their captures landed.

**What this document is not.** There are no captures of the original's Familiar screens and no
client access in this pass — another agent is capturing them, a third is inventorying the `Pet*`
config tables. So this is **half a spec**: the Everkai half. Every place where judging a difference
would need the original's behaviour, the question is written down in §6 instead of answered.

**What that means for §4.** Two kinds of claim get mixed together when this is done carelessly, and
the Fellow specs are careful about it, so this one is too:

| Claim | Evidence needed | Where it goes here |
| --- | --- | --- |
| "This is prose where a picture belongs" | the code, plus the eleven global conventions the Fellow capture already established | judged in §3 and §4 |
| "The original does it differently" | a capture of the original | **not judged** — §6 |

The conventions referenced throughout are the eleven in `docs/fellow-screen-specs/README.md` and the
four additions in `docs/family-screen-specs/README.md` (numbered 12–15). Those were established from
captures of Fellow and Family screens; whether they hold on Familiar screens is itself a §6 question,
but they are the project's working style guide and the owner has already accepted two rebuilds to
them.

**Delivery.** Per `CLAUDE.md` rule 7, every finding below is marked **FIX**, **DEFER** (with the
reason) or **DROP**. Nothing is merely filed.

---

## 0 · Vocabulary

| Original / tables | Everkai UI | Everkai code |
| --- | --- | --- |
| `Pet*` tables, "Familiar" in the English UI | **Familiar**, and **Companions** on the roster header | `familiar*`, `FAMILIARS` |
| `Item_PetLevelUP` — "Magical Fruit" | "level-up items" | `familiarSupplies.levelUp` |
| `Item_PetClassUP` — "Familiar Crystal" | "class-up items" | `familiarSupplies.classUp` |
| `Item_Owner_PetPiece_*` | "fragments" | `familiarExplore.pieces` |
| `Item_PetExploreRunCoin` | "Familiar Tears" | same |
| `PetClass` tier | "Stage" | `familiarStage(level)` |
| `Pet.Group` (Cool / Cute / Playful / Legendary) | "type" | `pet.type` |

The roster header says **Companions** (`app/familiar-panel.tsx:25`) while every other surface — the
village button, the module title, the dock label, the hall's own `aria-label` — says **Familiars**.
Two names for one system. **FIX**, trivially, in whichever direction the capture settles.

---

## 1 · The surface map

### 1.1 How it is reached

| # | Entry | Code | Notes |
| --- | --- | --- | --- |
| A | Village map side button, labelled **Familiars** | `app/page.tsx:170` | The primary route. Uses `./assets/ui/journey.webp` — the same generic icon as Today, Little Helper, Events and Village Events; there is no familiar icon. |
| B | Journey module → page 2, **Familiars** | `app/page.tsx:187` | A dead-end page: one sentence and a button that opens route A. See §2.4. |
| C | Fellow shell right rail → **Familiar** tile → *Select Familiar* dialog | `app/fellow-shell.tsx:174–189` | Built to `docs/fellow-screen-specs/10-familiar-artifact.md`. Binds and unbinds familiars. Never routes to the Hall. |
| D | Today / Little Helper chores | `lib/today.mjs:220`, `lib/helper.mjs:173` | `collectFamiliarSupplies` runs from elsewhere; no familiar screen of its own. |

The Hall is **not** on the six-icon primary dock (`Home · Village · Fellow · Stage · Drakenberg ·
Storage`, `app/page.tsx:163–165`). It is one of five buttons in the `village-side-buttons` stack on
the village map, all five sharing one icon.

### 1.2 The tree

```
Village map → side button "Familiars"
└── Familiar Hall  ................................. app/familiar-hall.tsx
    │   4-entry ICON DOCK + modal sheet + "Previous · n / 4 · Next" footer
    │   (PanelPages in systemPopup mode — app/panel-pages.tsx:32)
    │
    ├── 1 Familiars  ............................... app/familiar-panel.tsx
    │   ├── state: STARTER CHOOSER  (no familiar owned, no starter taken)     :21–23
    │   ├── state: COMPANIONS ROSTER (default; RosterLanding → RosterPicker)  :25–28
    │   ├── state: DETAIL, not contracted — one sentence                      :33
    │   └── state: DETAIL, contracted
    │       │   hero card + 3-cell ATK/HP/SPD stat row                        :30
    │       └── nested TEXT PAGER: Training | Fellow bond | Forms             :31
    │           ├── Training  ....................................            :31
    │           ├── Fellow bond  ................. app/familiar-node-panel.tsx
    │           └── Forms  .......................................            :32
    │
    ├── 2 Tower  ................................... app/familiar-tower-panel.tsx
    │   ├── mode switch: Challenge Mode | Endless Mode (2 buttons)            :27
    │   ├── Hourly earnings card + Collect                                    :28–30
    │   ├── 5 team slots (2 front / 3 back) + member <select> + add/remove    :32–33
    │   ├── Skill disclosure for the selected familiar                        :34
    │   ├── Challenge floor card (enemies as a text <ul>, reward, 2 buttons)  :43–47
    │   ├── Endless floor card  — or its locked hint below floor 200          :38–42
    │   ├── battle result <details open> → nested "Battle record" <details>   :49
    │   └── tower-redo notice (policy-3 saves only)                           :50
    │
    ├── 3 Exploring  ............................... app/familiar-explore-panel.tsx
    │   ├── stamina bar + regen line                                          :13–14
    │   ├── 3 area buttons (locked ones carry their tower floor)              :15
    │   ├── state: IDLE — area card with the original's flavour text          :23–25
    │   ├── state: ENCOUNTER — monster card, Alertness bar, 3 contract
    │   │        buttons, Soothe, Leave it                                    :16–22
    │   ├── last-result line                                                  :26
    │   └── 3 disclosures: Monsters in <area> · Your exploring items ·
    │        Exploring rules and what is measured                             :27–29
    │
    └── 4 Dispatch  ................................ app/familiar-dispatch-panel.tsx
        ├── state: LOCKED (< 5 contracted) — one sentence                     :17
        ├── Team Power + 5 team slots + member <select> + add/remove          :18–21
        ├── state: IDLE — area <select>, 4-row <dl>, reward line, Dispatch    :26–29
        ├── state: AWAY / RETURNED — countdown, reward line, Collect, Cancel  :22–25
        └── disclosure: Dispatch rules and what is measured                   :31–33
```

### 1.3 Count

**Four top-level Hall pages. Seventeen distinct rendered states**, across six panel components,
plus two familiar surfaces outside the Hall (the Fellow rail dialog, the Journey redirect page).

### 1.4 The states each screen has

The Fellow and Family specs turn on locked / empty / affordable / maxed, so here is where each one
lives and how Everkai draws it today.

| Screen | Locked | Empty | Affordable / unaffordable | Maxed |
| --- | --- | --- | --- | --- |
| Companions roster | — (all 71 cards always shown) | — | — | — |
| Roster card, not contracted | `not-joined` class + no level banner + a "Not Yet Joined" group heading (`app/roster-picker.tsx:42–44`) | — | — | — |
| Familiar detail, not contracted | one sentence naming the source (`familiar-panel.tsx:33`) | — | — | — |
| Training | — | — | **Both `Train` buttons and `Add star` are `disabled` when the items are short** — a greyed button, with the cost appended to the verb after a `·`. No colour on the have/cost pair. (`familiar-panel.tsx:31`) | `level < familiarCap(id)` → `next` is `null` → the button greys and drops its cost suffix. No different word. `starCost` returns `null` past star 100 the same way. |
| Fellow bond | — | `Unbound` / `None` text + a `+` in a card frame (`familiar-node-panel.tsx:19`) | Every action reads `· Free` | when `ready.length === 0` the node `<select>` and its Activate button unmount entirely |
| Forms | star gate printed as `(3/15)` | — | — | `✓` |
| Tower, Challenge | `Auto mode unlocks after floor 30` **as the button's own label** (`:47`) | `Add a familiar to the team.` / `Contract a familiar first…` (`:37`) | Challenge is disabled on an empty party only | `All 300 floors cleared!` (`:47`) |
| Tower, Endless | `Endless Mode unlocks after Challenge Mode floor 200.` (`:42`); the mode button reads `Endless · floor 200` (`:27`) | as above | — | uncapped (`ENDLESS_MAX` 1e6) |
| Exploring, areas | area button disabled + ` · tower floor 100` appended to its label (`:15`) | — | Explore disabled below `area.cost` stamina; the free-potion case rewrites the verb to `Explore · free (Special Potion)` (`:25`) | `Stamina is full.` (`:14`) |
| Exploring, contracts | grade-2/3 buttons disabled at 0 count; count printed as a number, `∞` for grade 1 (`:21`) | `None yet. Basic Contracts are unlimited.` (`:28`) | disabled | — |
| Dispatch | `Contract 5 or more familiars to unlock. N contracted.` (`:17`); per-area gate in the `<option>` text and again in the `<dl>` (`:26–27`) | `Empty` under each vacant slot (`:19`) | Dispatch disabled on 3 separate conditions, all silent (`:29`) | — |
| Fellow rail tile | — | `+` glyph plus a red dot badge (`fellow-shell.tsx:130–137`) — the only spec-correct empty state on the whole surface | — | — |

**The pattern.** Everkai's familiar screens express *locked* and *unaffordable* as **a greyed button
plus a sentence**, uniformly. Conventions 3, 7 and 8 — colour on the have/cost pair, a *different
word* at max, the gate as a number on the artwork — are honoured nowhere on this surface except the
one component the Fellow rebuild already touched.

---

## 2 · Built vs. stubbed

### 2.1 Built, with real mechanics

| System | Lib module | What is really there |
| --- | --- | --- |
| Roster, levels, stages, stars | `lib/familiars.mjs` (51 ln), `lib/familiar-data.json` | 71 familiars; 499 level rows, 10 class rows, 100 star rows; `familiarStats` applies level + stage growth and star coefficients. Parity row **E6 Fixed**; all 609 ladder rows verified exact against `PetLevel`/`PetClass`/`PetStar`. |
| Training economy | `lib/familiar-supplies.mjs` (35 ln) | `trainingCost(from,to)` charges `PetLevel.Cost` per level and `PetClass.Cost` at each stage crossing; `starCost` reads `PetStar.Cost`. Hourly tower income, 24-hour hold, settle-on-collect. |
| Binding + nodes | `lib/familiar-nodes.mjs` (38 ln), `lib/familiar-node-data.json` | 71 node records in 6 groups; `familiarBonus` pays a bound Fellow a ninth of the inherent bonus per stage. Feeds `bondedPower` → business earnings. |
| Familiar Tower, Challenge | `lib/familiar-tower.mjs` (278 ln), `lib/familiar-tower-data.json` | All **300** floors, 1,480 enemy rows, per-floor reward and hourly income, boss floors 100/200/300, six familiar rewards, auto-climb from floor 30, three save policies with a tested migration and redo. Parity row **E9 Partial**. |
| Familiar Tower, Endless | same | 23 bands, 705-bot pool, band income stacked on the floor income. |
| Tower combat | 7 modules — `familiar-crit-combat.mjs`, `-dot-`, `-modifier-`, `-status-`, `-support-`, `-trigger-combat.mjs`, `familiar-passives.mjs` | Speed order, 15 rounds, Rage, criticals, DoTs, shields, heals, stat modifiers, 25 stage passives. **63 of 71 familiars have a documented active kit**; the other 8 fall back to a local "Rage strike". |
| Exploring + contracts | `lib/familiar-explore.mjs` (198 ln) | 3 areas, event weights, scripted first meetings, rarity weights, shining chance, 3 contract grades, Alertness, Mochi, stamina, 4 buff items, lost-item and Luck-Flower tables, fragments on a duplicate. Parity row **E5 Fixed**. |
| Dispatch | `lib/familiar-dispatch.mjs` (116 ln) | 9 areas, tower-floor and Power gates, 5-familiar team, timed run, base + Great Success bundles, fragment pools, cancel-forfeits. Parity row **E10 Fixed**. |

That is eight systems with genuine mechanics behind them. **The Familiar surface is not a shell.**
As with Family, the work ahead is overwhelmingly a presentation job.

### 2.2 Stubbed, absent, or a button with a sentence

| # | Thing | Where it says so | Status |
| --- | --- | --- | --- |
| S1 | **Forms** (Child / Adult / Awakened) | `familiar-panel.tsx:32` | A `<ul>` of two or three `<li>`, plus a sentence naming the Spine skeleton files. No art, no switch, no preview. The gate numbers are real (`PetStar.IsEvolve` at stars 15 and 50). |
| S2 | **Metamorphosis** (parity **E7**) | `familiar-explore-panel.tsx:28` — `· kept for Metamorphosis, not built yet` | No screen. Two Metamorphixir grades accumulate in the save with no sink. Fully measured in the catalogue; carries a balance warning that makes it an owner decision. |
| S3 | **Compendium** (parity **E8**) | `familiar-hall.tsx:8` — a code comment only | No screen, no UI string, nothing in the Hall dock. A player cannot tell it is missing. |
| S4 | **Familiar Shop** | `familiar-explore-panel.tsx:28` — `· the Familiar Shop is not built yet` | No screen. Familiar Tears accumulate with no sink. |
| S5 | **Fragments have no sink** | `familiar-explore-panel.tsx:28` — `Kept for stars; star costs still use class-up items.` | Collected from three sources, displayed in two places, spendable nowhere. Deliberate: E6 records that 24 of 71 familiars have no fragment source in Everkai, so a switch would freeze their stars. |
| S6 | **Journey → Familiars page** | `page.tsx:187` | Literally `<p>Familiars have their own hall: your collection, the Familiar Tower, Exploring and Dispatch.</p>` and one button. A navigation stub occupying a dock slot. |
| S7 | Endless per-floor reward item | `familiar-tower.mjs:245`; panel `:51` | `Reward_PetEndlessTower_1` is `Item_PetFeedBox`, not modelled. |
| S8 | Incense / Attract, Energy Drinks, auto-explore, the SSR wish | `familiar-explore-panel.tsx:29`, module header | Named in a rules disclosure, built nowhere. |
| S9 | Progress Reversion | `docs/permanent-systems.md:432` | No refund table found; absent. |
| S10 | Locked-familiar detail | `familiar-panel.tsx:33` | One sentence. The Fellow surface's equivalent (`12-locked-fellow.md`) has a Source tooltip, an Info tab and a five-section Skills tab. |

**Ten stubbed or absent systems.**

### 2.3 Dead code and dead data found on the way

| Thing | Where | Status |
| --- | --- | --- |
| `status={x => …:'Not contracted'}` | `familiar-panel.tsx:26` | Dead string. `RosterPicker` only renders the level banner when `owned[f.id]` (`roster-picker.tsx:45`), so the "Not contracted" branch can never render. **FIX** (delete). |
| `initialPage` prop on `FamiliarHall` | `familiar-hall.tsx:9` | Never passed — `page.tsx:187` mounts `<FamiliarHall game action locked/>`. Dead parameter. **FIX** (delete, or wire it so the Today/Helper chores can deep-link to Tower). |
| `<p className="small-note">Base binding bonus applies…` | `familiar-node-panel.tsx:19` | **Hidden by CSS.** `app/globals.css:768` is `.familiar-detail .small-note{display:none}`, and `:850` hides it again inside a `system-sheet`. The sentence is in the bundle and on no screen. **FIX** (delete the element, not just let CSS hide it). |
| `lib/familiar-skill-inventory.json` (71 profiles) | — | `docs/data-provenance.md:94`: *"Dead data — nothing reads it."* **DEFER** — harmless, and it is the snapshot the six combat data files are checked against. |
| `adoptFamiliar` / `adoptFamiliars` | `lib/familiars.mjs:30–37` | Deliberately unreachable from the UI; `tests/free-acquisition-unreachable.test.mjs` guards it. Test fixtures only. **Correct as-is.** |

### 2.4 Stale docs found on the way

`docs/permanent-systems.md` still reports **E5 ABSENT** (`:423`), **E9 PARTIAL — 12 authored
floors** (`:450`) and **E10 ABSENT** (`:459`). All three shipped in the 2026-09-15/16 passes; the
parity catalogue is current, this file is not. **FIX** — a three-line correction, or a pointer to
`docs/parity-catalog.csv` as the single source.

---

## 3 · The word-heavy inventory

This is the section the owner's complaint is about — *"we are very word heavy in a lot of areas"* —
and the one the spec work will consume. Every string below is quoted as it ships, with its file and
line.

**Totals.** Six `<details className="rules-note">` disclosures carrying **≈ 860 words of running
prose**, plus roughly twenty inline explanatory sentences, plus two list-rendered text walls (the
enemy line-ups and the battle record). For comparison, the Family README records that
`app/latency-panel.tsx` — "Everkai's Latency prose is 4× the original's" — carried nine paragraphs.
The Familiar surface carries **six disclosure blocks across four pages**, and three of them are not
game rules at all.

### 3.1 The six `rules-note` disclosures

| # | File:line | Summary label | Words | What it is |
| --- | --- | --- | --- | --- |
| P1 | `app/familiar-panel.tsx:34` | *About familiar progression* | 183 | Rules **and** provenance essay |
| P2 | `app/familiar-node-panel.tsx:19` | *About these rules* | 24 | Provenance only |
| P3 | `app/familiar-tower-panel.tsx:51` | *Tower rules and what is measured* | 249 (3 ¶) | Provenance essay |
| P4 | `app/familiar-explore-panel.tsx:29` | *Exploring rules and what is measured* | 196 (2 ¶) | Provenance essay |
| P5 | `app/familiar-explore-panel.tsx:28` | *Your exploring items* | list | Inventory + two "not built yet" apologies |
| P6 | `app/familiar-explore-panel.tsx:27` | *Monsters in \<area\>* | list | Up to 25 familiar **names** per rarity, comma-joined |
| P7 | `app/familiar-dispatch-panel.tsx:31–33` | *Dispatch rules and what is measured* | 203 (2 ¶) | Provenance essay |
| P8 | `app/familiar-tower-panel.tsx:34` | *Skill · \<name\>* | ~40 | Genuine game rules — the one disclosure that belongs |

**The single biggest finding in this section: four of these eight are provenance essays.** P2, P3,
P4 and P7 — and the second half of P1 — do not tell a player how to play. They tell a *reader of this
repository* which numbers came from `PetDispatch.json` and which are Everkai's own rule. Quoting P7
in full (`app/familiar-dispatch-panel.tsx:33`):

> *"Two things are local and flagged. The duration table does not name its unit, and no other
> familiar table holds one, so Everkai reads 20 as hours: at that rate the best area pays about 450
> level-up items an hour against the tower's 187, while reading it as minutes would pay 144 times the
> tower. And the original's Great Success formula is not in any table — only its inputs are, so
> Everkai uses 30% at exactly the Power gate plus half of any surplus, capped at 100%. A Great
> Success also pays one draw from each of the area's original fragment pools; fragments are kept for
> stars, which still cost class-up items. Cancelling forfeits the run, as in the original. Each area
> opens at its original Familiar Tower floor."*

Convention 10 says `(i)` is the only place prose is allowed. But this is not the kind of prose an
`(i)` holds either — the original has no reason to explain its own provenance to a player. **There
is no visual that replaces a provenance essay; it is not information the screen should carry at
all.** It belongs in `docs/parity-catalog.csv` (where every sentence of it already exists, verbatim,
in the E5/E9/E10 notes) and in the module header comments (where it also already exists). This is
duplication in the most expensive place.

**FIX: delete P2, P3, P4, P7 and the provenance half of P1 outright.** That is ~700 of the ~860
words, and it costs no information, because all of it is already recorded twice in the repo. The
remaining game rules move behind an `(i)`.

### 3.2 The disclosures, quoted

**P1 — `app/familiar-panel.tsx:34`**, `<details className="rules-note"><summary>About familiar
progression</summary>` (183 words, one paragraph):

> *"Familiars join by choosing a starter, by contract while Exploring, or as Familiar Tower floor
> rewards; familiars a village already had are kept. Base stats and level, stage and star
> calculations follow The Ascended's public familiar calculator, and the level, stage and star cost
> ladders match the original tables. Training costs the original's level-up items per level and
> class-up items at each new stage, earned from the Familiar Tower each hour (held for up to 24
> hours), from Exploring and from Dispatch. Stars cost class-up items, a local choice: the original
> spends each familiar's own fragments, which Exploring, tower rewards and Dispatch now collect.
> Stars stay on class-up items because 24 of the 71 familiars (the SSR+, UR and collaboration
> familiars) have no fragment source in Everkai, so switching would freeze their stars. A bound
> familiar gives its Fellow nothing at stage 1, then a ninth of its bonus per stage up to the full
> bonus at stage 10. Newer familiars may postdate the APK. Explicitly activated nodes benefit the
> bound Fellow and therefore roster-based business earnings; training alone does not activate
> nodes."*

The one player-facing rule buried in it is the last two sentences: **the bond pays a ninth per stage,
and nodes must be activated.** That is a chart — ten pips, one per stage, filled to the current one —
not 183 words.

**P2 — `app/familiar-node-panel.tsx:19`**, `<summary>About these rules</summary>`:

> *"Level and star nodes use public reference values. Activation and rebinding are free sandbox
> choices. Power ordering is reconstructed; original activation costs are unresolved."*

Pure provenance. The Fellow spec already ruled on this exact string:
`docs/fellow-screen-specs/10-familiar-artifact.md` row **E7** classifies
`About these rules on the familiar panel` as **structural** and its "Prose to delete" table replaces
it with the `(i)`. **That decision has already been made and not yet applied here.**

**P3 — `app/familiar-tower-panel.tsx:51`**, three paragraphs, 249 words. Paragraph 1 is a floor-table
summary ("All 300 floors come from the original tower table… Floors 100, 200 and 300 are boss
floors…"); paragraph 2 is combat provenance ("Local and flagged: battles use Everkai's combat engine
(Speed order, up to 15 rounds, Rage fills by 25 when attacking or hit, higher remaining Health wins,
ties lose)…"); paragraph 3 is Endless Mode provenance ("…are Everkai's own repeatable rule, because
the original chose them on its server. Its per-floor reward item is not modelled.").

**P4 — `app/familiar-explore-panel.tsx:29`**, two paragraphs, 196 words. Paragraph 1 is a wall of
percentages that the screen could show as bars: *"…events weighted 40% monster, 50% lost item, 10%
Luck Flower; monster rarity weighted N 33.5%, R 47%, SR 15%, SSR 4.5%; each familiar's shining
chance; contract success by contract grade and rarity (Basic Contract N 70%, R 10%, SR 7.2%, SSR
3.1% and unlimited; Advanced 100/80/40/10%; Super always succeeds)…"* — note that **every one of
those contract percentages is already printed on the contract buttons themselves** at `:21`
(`{k.name} · {catchChance(c.pet,k.grade)/100}% · {count}`). The disclosure restates them.

**P5 — `app/familiar-explore-panel.tsx:28`**, *Your exploring items*. An inventory rendered as a
`<ul>` of sentences, each item's own description appended after a `·`:

> *"Track Identification ×2 · When exploring, the chance of finding an SSR monster next time
> increases."*
> *"Familiar Tears ×14 · Dropped when a familiar runs away. Collect enough to exchange for rewards in
> the Familiar Shop. · the Familiar Shop is not built yet"*
> *"Basic Metamorphixir ×3 · kept for Metamorphosis, not built yet"*
> *"None yet. Basic Contracts are unlimited."* (the empty state)

An item bag is the canonical grid-of-icons-with-a-count. Everkai has `assets/` sprites for these
items via `ui-sprites.mjs` and does not use them here. Convention 9: *empty slots are drawn, not
described.*

**P6 — `app/familiar-explore-panel.tsx:27`**, *Monsters in Verdant Forest*. Four `<li>`, one per
rarity, each a comma-joined list of **up to 25 familiar names** with a `✓` appended to owned ones,
plus a trailing paragraph:

> *"Appears only once contracted elsewhere: Snowbear, Treeraffe (a Familiar Tower reward)."*

This is a **collection grid** written as running text — 25 names where 25 rarity-framed thumbnails
with a padlock or a tick would say the same thing faster and show the art. The card art already
exists: `petCardIcon(rarity)` is used three lines above.

**P7 — `app/familiar-dispatch-panel.tsx:31–33`**, quoted in full in §3.1 above. Paragraph 1 (73
words) is table provenance; paragraph 2 (130 words) is the two local rules.

**P8 — `app/familiar-tower-panel.tsx:34`**, *Skill · \<name\>*. **This one is fine.** It is the
selected familiar's active-skill text, its stage passive, and its base critical chance and
resistance. That is game data about a unit, which is exactly what an `(i)` is for. Its only problem
is that it hides behind a `<summary>` instead of sitting on the familiar's card, and that its
fallback sentence apologises for Everkai: *"This familiar uses a local double-damage Rage strike; its
original skill is not implemented."* (8 of 71 familiars).

### 3.3 Inline prose — the `<p>`s that a visual replaces

| File:line | Class | String (as it ships) | Replace with |
| --- | --- | --- | --- |
| `familiar-panel.tsx:21` | — | *"Choose a familiar to join your adventure. Unselected familiars will appear in later explorations."* | three rarity-framed art cards; the second sentence is an `(i)` |
| `familiar-panel.tsx:23` | `item-status` | *"After this, familiars join by contract while Exploring, or as Familiar Tower rewards."* | delete — it is the Hall's own dock |
| `familiar-panel.tsx:31` | — | `Level 212 / 450 · Stage 5 · 3 stars` | an EXP bar with `Lv.212/450` on it and a 10-pip stage strip (convention 1) |
| `familiar-panel.tsx:31` | `item-status` | `18,400 level-up items · 260 class-up items · 40 fragments` | three item icons with counts; colour them green/red against the next cost (convention 3) |
| `familiar-panel.tsx:31` | button label | `Train +1 · 1,240 level-up + 50 class-up` | cost **inside** the button, under the verb (convention 2) |
| `familiar-panel.tsx:31` | `bond-progress` | `Tower income` → `Clear floor 1` / `Next full hour` / `4,400 + 180 waiting` | a filling meter; "Clear floor 1" is a locked state, so convention 8 (gate as a number on the art) |
| `familiar-panel.tsx:32` | `<li>`×3 | `Child Form · unlocked by contract ✓` / `Adult Form · star 15 (3/15)` / `Awakened Form · star 50 (3/50)` | three portrait tiles, the locked ones greyed with `★15` on the art (convention 15) |
| `familiar-panel.tsx:32` | `item-status` | *"In the original each form is an animated portrait (a Spine skeleton: …). Everkai has not rendered familiar animations yet, so forms are listed but not shown."* | delete (provenance); if the art is genuinely missing, the tile is a silhouette |
| `familiar-panel.tsx:33` | `item-status` | *"Not contracted yet. Explore Verdant Forest or Snowy Plains · Familiar Tower floor 60"* | the Fellow surface's **Source tooltip** (`12-locked-fellow.md`) |
| `familiar-panel.tsx:15` | (via `source()`) | *"Not found in exploring or the tower: in the original it came from events, the Legendary Familiar draw or bundles, which Everkai does not have."* | a short "unobtainable" badge; the explanation is an `(i)` |
| `familiar-node-panel.tsx:19` | `small-note` | *"Base binding bonus applies while bound; activated nodes add to it. One Familiar per Fellow. Rebinding moves its activated bonuses with it."* | **already hidden by CSS** — delete the element. `10-familiar-artifact.md`'s prose table already assigns its replacement. |
| `familiar-node-panel.tsx:19` | button labels | `Bind Fellow · Free` / `Activate node · Free` / `Activate all 7 ready · Free` | `Equip` / `Swap` per the Fellow spec; `· Free` is a non-cost and convention 2 puts real costs inside the button |
| `familiar-node-panel.tsx:15` | `<option>` text | `Level 150: +2,400,000 Power, +18 Aptitude` and 30+ siblings in a `<select>` | the node **track** the Stella specs describe — a path of nodes with the reward panel beside it |
| `familiar-tower-panel.tsx:28` | — | *"187 level-up + 8 class-up items an hour, held up to 24 hours."* / *"Earning unlocks after completing Floor 1."* | a filling store meter with the two item icons |
| `familiar-tower-panel.tsx:28` | — | *"Floor 214 raises it to 188 + 8."* | `187 » 188` in gold (convention 13 — a future-tense tier change) |
| `familiar-tower-panel.tsx:35` | `item-status` | `Bond: 3 Cool · +10% ATK and HP` / `No bond (needs 3 of one type)` | the type medallions on the five team slots, lit when the bond is met |
| `familiar-tower-panel.tsx:37` | `tower-hint` | *"Contract a familiar first: choose a starter on the Familiars page."* | empty slots already say this; convention 9 |
| `familiar-tower-panel.tsx:39, :44` | `<ul class="tower-enemies">` | `Snowbear Tank · Lv. 200 · ATK 41,220 · HP 1,140,000 · SPD 380 · Frost Guard` × 5 | **the enemy formation drawn as five cards in two rows**, like the player's own team slots directly above them. Everkai already draws its own team that way. |
| `familiar-tower-panel.tsx:45` | `tower-reward` | `First clear: 120 level-up + 5 class-up + 1 Advanced Contract` / `already paid before the redo` | reward item icons with counts |
| `familiar-tower-panel.tsx:47` | button label | `Auto mode unlocks after floor 30` | a padlock badge with `30` on it (convention 8); the verb stays `Auto` |
| `familiar-tower-panel.tsx:48` | `item-status` | *"Floor 200 opens Endless Desert for exploring. Floor 300 rewards Eldwyrm."* | milestone pips on the floor progress bar |
| `familiar-tower-panel.tsx:49` | `<ol>` | the **battle record** — one `<li>` per hit, e.g. *"Round 3: Snowbear → Treeraffe (enemy) · Critical · Frost Guard · damage 41,220"*; a 5v5 over 15 rounds runs to dozens of lines | a replay, or an HP-bar-per-unit summary; at minimum keep it nested and closed (it currently sits inside a `<details open>`) |
| `familiar-tower-panel.tsx:50` | `item-status` | *"Tower redo: your village had reached floor 175 before the full tower existed, so you climb it again from floor 1 and earn every floor reward on the way. Dispatch and exploring areas you had opened stay open (up to floor 175)."* | a one-time dismissible notice, not a permanent paragraph on the page |
| `familiar-explore-panel.tsx:14` | `item-status` | *"+1 stamina in 46m · one point every 90 minutes"* | the timer under the stamina bar; the rate is an `(i)` |
| `familiar-explore-panel.tsx:18` | — | *"Already contracted: a new contract pays 40 fragments."* / *"Not yet contracted."* + *" This first meeting succeeds by attempt 2."* | a `✓`/fragment badge on the monster card; the scripted-meeting clause is Everkai's own reading and should not be on screen at all |
| `familiar-explore-panel.tsx:20` | `item-status` | *"A failed contract raises Alertness by 30-40. At 100 it flees and leaves 4 Familiar Tears."* | the Alertness bar is directly above it; colour the bar, put the rule in the `(i)` |
| `familiar-explore-panel.tsx:22` | button label | `Soothe with Ordinary Mochi · -30 · 7 left · 3 uses` | item icon + count, `-30` as a badge |
| `familiar-explore-panel.tsx:24` | `item-status` | *"Explored 41 times here. Events: monster 40% · lost item 50% · Luck Flower 10%."* | three weighted bars, or an `(i)` |
| `familiar-explore-panel.tsx:23` | — | `{area.text}` — the original's own flavour text, up to 50 words | keep, but it is the *area art's* caption; the original ships area art |
| `familiar-explore-panel.tsx:30` | `item-status` | `Tower floor 175 cleared.` | duplicate — the Tower page already shows it |
| `familiar-dispatch-panel.tsx:17` | `tower-hint` | *"Contract 5 or more familiars to unlock. 2 contracted."* | five slot tiles, three of them padlocked; `2/5` (conventions 9 and 15) |
| `familiar-dispatch-panel.tsx:26` | `<option>` text | `Area 7 · 5,000,000 Power · floor 200` | area cards with art, gate badge and a Power bar |
| `familiar-dispatch-panel.tsx:27` | `<dl>` | `Unlocks / Familiar Tower floor 200 · 175/200` · `Power needed / 5,000,000` · `Duration / 20 hours` · `Great Success / Fill the team` | **the three-bar gate block from `family-screen-specs` convention 12** — have/need printed *inside* the fill, so the short bar is visibly short |
| `familiar-dispatch-panel.tsx:23, :28` | `tower-reward` | *"Base 7,000 level-up items + 25 class-up · Great Success adds 1,400 + 25 and 3 fragment draws"* | reward item icons, Great Success on a second row with its chance |
| `familiar-dispatch-panel.tsx:25` | button label | `Cancel dispatch · forfeits all rewards` | `Cancel` in the de-emphasised treatment; the consequence goes in the confirm dialog |
| `page.tsx:187` | — | *"Familiars have their own hall: your collection, the Familiar Tower, Exploring and Dispatch."* | delete the page (see D8 below) |

### 3.4 Item names

Everkai prints `level-up items` and `class-up items` — the field names from
`lib/familiar-supply-data.json` — **28 times across the four panels** (9 in `familiar-panel`, 10 in
`familiar-tower-panel`, 8 in `familiar-dispatch-panel`, 1 in `familiar-explore-panel`). The original
names them **Magical Fruit** and **Familiar Crystal** (`docs/permanent-systems.md:428`,
`docs/parity-catalog.csv` E6/E10). Everkai is showing a player its own internal variable names, and
doing so in the place a named item with art would go. **FIX** — a rename plus two sprites removes a
lot of the remaining word count on its own, because "1,240 Magical Fruit" abbreviates to an icon and
a number in a way "1,240 level-up items" does not.

---

## 4 · Structural divergences identifiable from the code alone

Classified as the Fellow and Family specs classify them. **Structural** = the shape of the screen is
wrong, not just its dressing. Everything here is judged against Everkai's *own* established
conventions and its own two rebuilt surfaces — **not** against the original, which has not been
captured. Anything needing the original is in §6.

| # | Divergence | Kind |
| --- | --- | --- |
| **D1** | **Binding is implemented twice, divergently.** `app/fellow-shell.tsx:148–171` ships `SelectFamiliar`, built to `docs/fellow-screen-specs/10-familiar-artifact.md`: the bound familiar on a raised band with an orange `Unbind`, a rule, then candidates as art cards, each carrying **the current holder's portrait** over its art, with `Equip` for free ones and `Swap` for contested ones. `app/familiar-node-panel.tsx:19` ships the *pre-rebuild* version of the same two actions — a `NativeSelect` of Fellow names, a `Bind Fellow · Free` button, an `Unbind` button and a `rules-note`. Same `bindFamiliar` / `unbindFamiliar` calls, two completely different UIs, and spec 10's differences E2, E3, E4 and E7 are all still live in the second one. **FIX: delete the binding half of `familiar-node-panel.tsx` and reuse `SelectFamiliar`.** | **structural** |
| **D2** | **A text pager nested inside an icon dock.** The Hall's four pages are an icon dock (`panel-pages.tsx:21` maps `Familiars:'bonds', Tower:'rank', Exploring:'mastery', Dispatch:'building'`) with a `Previous · n / 4 · Next` footer. Inside page 1, the contracted-familiar detail opens a *second* `PanelPages` in its plain branch (`panel-pages.tsx:33`) — three **text-labelled** buttons, `Training | Fellow bond | Forms`. Both character rebuilds deleted exactly this control: eleven text labels became five icon tabs on Family, six became a dock on Fellow. It is still here, one level down. | **structural** |
| **D3** | **A `<select>` is doing a collection's job, three times.** The Tower team picker (`:33`), the Dispatch team picker (`:20`), the Dispatch area picker (`:26`) and the node picker (`familiar-node-panel.tsx:19`) are all `NativeSelect` elements whose `<option>` text carries the art's information as a string — `Poundme · Lv. 212 · In team`, `Area 7 · 5,000,000 Power · floor 200`, `Level 150: +2,400,000 Power, +18 Aptitude`. Everkai already renders the team **slots** as art cards immediately above two of these dropdowns; the picker should be the same cards. | **structural** |
| **D4** | **Enemies are a text list; your own team is art.** `familiar-tower-panel.tsx:32` draws the player's five familiars as rarity-framed `framed-card` tiles in a front/back `<ol>`. Thirteen lines later, `:39` and `:44` draw the *enemy* five as `<li>` sentences. One battle, two renderings, and the art for the enemy side is available from the same `familiarById` lookup the text uses. | **structural** |
| **D5** | **The Companions roster is the Fellow roster with Fellow-only furniture.** `RosterLanding` is called without `family` (`familiar-panel.tsx:25`), so `RosterPicker` renders its `type-capsule` filter — and that capsule hardcodes `['all','Inspiring','Diligent','Brave','Informed','Unfettered']` (`roster-picker.tsx:53`). Familiar types are **Cool / Cute / Playful / Legendary**. Pressing any capsule filters on `f.type === 'Brave'` and yields *"No matches. Try another search or another type."* on all 71 cards. `countryIcon()` (`ui-sprites.mjs:13`) also returns `null` for the four familiar types, so the class medallion never draws on a familiar card. **A broken control, not merely a cosmetic one. FIX.** | **structural** |
| **D6** | Roster furniture the Fellow roster has and the Companions roster silently loses: `RosterLanding` gates its `Sort by` control on the `power` prop (`roster-landing.tsx:26`), which `familiar-panel.tsx:25` does not pass — so the four sort orders exist in `rosterSort` and are unreachable. `badge` is not passed either, so the red `!` "something here can be improved" badge — which `docs/fellow-screen-specs/01-roster.md` calls difference R4 and "what makes a 244-card roster scannable" — is absent from a 71-card roster where training, starring and node activation are all per-familiar. | **structural** |
| **D7** | **One system is split across two pages that share a screen's worth of state.** Tower income is the *only* source of training items, and it is rendered on the Tower page (`familiar-tower-panel.tsx:28–30`, an "Hourly earnings" card with a `Collect tower items` button) **and again** on the Training page (`familiar-panel.tsx:31`, a `Tower income` progress row with a second `Collect tower items` button calling the same `collectFamiliarSupplies`). Two buttons, one action, two pages. | **structural** |
| **D8** | **A navigation stub holds a dock slot.** Journey's page 2 (`page.tsx:187`) renders one sentence and an "Open the Familiar Hall" button. It is a redirect wearing a page. **FIX: delete it** — route A already exists and the Hall's own dock is the navigation. | **structural** |
| **D9** | **Explanatory prose ships where no `(i)` exists to hold it.** Four of the six `rules-note` disclosures are provenance (§3.1). Convention 10 permits prose behind an `(i)`; it does not create a place for "which of these numbers Everkai measured". | **structural** |
| **D10** | Everkai's own team slots use a `+` in a `tower-empty` div (`:32`, `:19`) but carry `<small>Front</small>` / `<small>Empty</small>` captions beneath. Convention 9: empty slots are drawn, not described. The `+` alone is correct; the caption is the divergence. | cosmetic |
| **D11** | Costs are appended to a verb after a `·` — `Train +1 · 1,240 level-up + 50 class-up`, `Add star · 20 class-up`, `Soothe with Ordinary Mochi · -30 · 7 left · 3 uses`. Convention 2 puts the cost **inside** the button on a smaller second line. | cosmetic but pervasive |
| **D12** | No quantity selector anywhere. Training offers exactly `Train +1` and `Train up to 10` as two separate buttons. Convention 4 (reaffirmed by the Family README, which explicitly tells Everkai *not* to copy the original's own inconsistency here) is a 4-segment `Quick \| x1 \| x10 \| x100` above one button whose verb reads the clamped count. | **structural** |
| **D13** | Disabled-vs-maxed are the same treatment. `Train +1` greys both when you cannot afford it and when the familiar is at `familiarCap`. Convention 7: a disabled state is a *different word*. | cosmetic |
| **D14** | `<details open>` on the battle result (`:49`) means a wall of combat log is expanded by default after every fight, above the redo notice and the rules disclosure. | cosmetic |
| **D15** | The village entry button, the module heading and the Journey page all use `./assets/ui/journey.webp`; five unrelated side buttons share that one icon. | cosmetic |
| **D16** | Two names for the system — "Familiars" everywhere, "Companions" on the roster header (§0). | cosmetic |

---

## 5 · What the app invents

The repo marks these. Here is where the markings are, gathered in one place.

### 5.1 Marked in the data provenance index (`docs/data-provenance.md`)

| Data file | Marking | What it means |
| --- | --- | --- |
| `familiar-node-data.json` (71 records) | `:91` — source *"wiki/community"*, `tableSha256 472a83f9… (community table, not an original)`, *"Power ordering explicitly reconstructed"* | **The entire node system's values are not from the original's tables.** Everything the "Fellow bond" page pays a Fellow rests on a community table plus a reconstruction. |
| `familiar-data.json` (71 pets) | `:88`, `:371–374` | 609/609 ladder rows and 70/70 pet stat rows verified **exact**. The 71st, `Pet_8041505` "Phoenix" (UR), is **absent from the original `Pet` table** — an isl-tools page with a page sha. *"It should not be treated as version-matched."* |
| `familiar-crit-data.json` (8), `-dot-` (5), `-modifier-` (13), `-skill-` (13), `-status-` (17), `-support-` (7) | `:87–96` — all *"wiki/community"*, snapshot `b49c78d0` | **All 63 documented combat kits are community-derived**, not read from `PetSkill`. The importers are verifiers, not generators. |
| `familiar-passive-data.json` (25) | `:92` — *"Local policy layered on community data"*, *"local v7 stage policy"* | The stage at which each passive turns on is Everkai's. |
| `familiar-trigger-data.json` | `:97` — *"APK Pet/PetSkill + community wording + local timing policy"*, no importer, *"cannot be regenerated"* | |
| `familiar-skill-inventory.json` (71) | `:94` — *"Dead data — nothing reads it."* | |

### 5.2 Marked in the module headers

| Local rule | Marked at |
| --- | --- |
| The **bond's per-stage share** — a ninth of the inherent bonus per stage. *"The per-stage share is a local rule; the original scales its hero bonus by star (`PetStar.ExternalAdd1`), not yet imported."* | `lib/familiar-nodes.mjs:16–19` |
| **Node activation is free.** *"Free sandbox activation."* | `lib/familiar-nodes.mjs:37` |
| **Stars are paid in class-up items**, not the familiar's own fragments as the original does. Deliberate; reason recorded (24 of 71 familiars would freeze). | catalogue row E6; panel `familiar-panel.tsx:34` |
| **Dispatch duration unit.** `PetDispatch.Time` is 20 on all nine rows and names no unit; read as **hours**. The argument is measured and recorded. | `lib/familiar-dispatch.mjs:19–29` |
| **Great Success arithmetic.** Inputs measured, expression not in any table; local rule = 30% at the gate + half the surplus ratio, clamped. | `lib/familiar-dispatch.mjs:30–32, :47` |
| **Fragment draw order** (pools and weights measured). | `lib/familiar-dispatch.mjs:55` |
| **Dispatched familiars are not withheld** from the Tower team. | `lib/familiar-dispatch.mjs:36` |
| **Exploring RNG** — one LCG seeded in the save, so a reload cannot re-roll. | `lib/familiar-explore.mjs:28–30` |
| **`MustCatch` reading** — "succeeds by that attempt at the latest"; *"the table does not say it."* | `lib/familiar-explore.mjs:31–34` |
| **Buff arithmetic** — `PetExploreBuff_01 = 500` read as +500 on the SSR encounter weight; each buff consumed by the next applicable event. | `lib/familiar-explore.mjs:35–38` |
| **The `Leave it` button** — *"The original screen has no such button that we could read; Everkai offers it so a player without contracts is never stuck."* | `lib/familiar-explore.mjs:39–41` |
| **Luck Flower `OutTime`/`Level` unused** — meaning not in any table. | `lib/familiar-explore.mjs:42` |
| **Tower combat engine** — Speed order, 15 rounds, Rage +25, higher remaining HP wins, ties lose; bond applied to base stats before stage passives; enemies get no stage passives; undocumented kits fall back to a Rage strike. | `lib/familiar-tower.mjs:53–55`; panel `:51` |
| **Auto-climb batch size** = 10 floors a tap. | `lib/familiar-tower.mjs:64` |
| **Endless enemy draw and stat scaling** — *"LOCAL (the server draws bots; no table or client file says how)"*: 1–2 Tanks in front, ≤1 Support, Attackers fill to five; band coef read like `Lvcoef`. | `lib/familiar-tower.mjs:159`; panel `:51` |
| **`PetArrayAdd`'s POWER field not applied**; `Item_PetFeedBox` (Endless reward) not modelled. | `lib/familiar-tower.mjs:245`; catalogue E9 |
| **Legacy-tower floor mapping** — a 12-floor sandbox save reads as original floor 25n. | `lib/familiar-supplies.mjs:11–20` |

**Assessment.** The marking discipline on this surface is good — better than the audit brief
assumed. Every local rule is stated in the module that implements it *and* in the panel that shows
it *and* in `docs/parity-catalog.csv`. The problem is not that inventions are hidden; it is that
**the third copy is on the player's screen** (§3.1).

One gap: the invented values in §5.1 — the node table's reconstructed Power ordering, the 63
community combat kits, the 71st familiar — are marked in `docs/data-provenance.md` and, for the node
table only, in a `rules-note`. They are **not** marked in `docs/parity-catalog.csv`'s E6 or E9 rows,
which describe those systems as verified against the original tables. **FIX** — a sentence in each
row, so rule 8's "no invented value remains unmarked" is true at the catalogue level too.

---

## 6 · Questions for the capture agent

Things that cannot be judged without the original's Familiar screens. Written down rather than
answered, per the brief.

1. **Is there a "Familiar Hall" in the original at all, and what are its top-level tabs?** Everkai's
   four (`Familiars · Tower · Exploring · Dispatch`) were chosen in the 2026-09-16 pass because the
   owner could not find the Tower or Dispatch; `familiar-hall.tsx:6` cites
   `UI_Pet_Panel_PetMain_ScenePetMain_comTitle` as the original's name for the surface. Does the
   original fold the Compendium (E8) and Metamorphosis (E7) into the same dock? Everkai's dock has no
   slot for either.
2. **Where is Familiars reached from?** The Family README established that the original reaches
   Family from a labelled hotspot on the **Home room scene**, beside `Familiar`, `Appearance` and
   `Artifacts` — so a `Familiar` hotspot exists on that scene. Is that the only route? Everkai uses a
   village-map side button.
3. **Does the original's familiar detail have a dock, and how many entries?** Everkai's three
   (Training / Fellow bond / Forms) are a text pager (D2). Both character rebuilds replaced text
   pagers with icon docks, but the *number* of entries is a capture question.
4. **Is binding reached from the familiar, from the Fellow, or from both?** Everkai has it in both
   places (D1) with two different UIs. Spec 10 captured the Fellow side. The Familiar side is
   unknown, and if the original only binds from the Fellow, D1 resolves by deletion.
5. **What does the node / development track look like?** Everkai renders it as a `<select>` of
   thirty-plus strings plus an "Activate all N ready" button. The Fellow and Family Stella specs
   describe a *path* of nodes with a per-node reward panel. Is the familiar's the same shape? And
   **do nodes cost anything in the original?** `familiar-node-panel.tsx:19` says *"original
   activation costs are unresolved"*.
6. **Does the original show the Tower's enemy line-up before the fight, and as art or as stats?**
   (D4.) And is there a battle *replay*, or only a result?
7. **How does the original present the exploring area's monster roster** — the thing Everkai writes
   as 25 comma-joined names (P6)? A grid with padlocks is the obvious answer but it is a guess.
8. **Does the original have a "Leave it" control on an encounter?** `familiar-explore.mjs:39` says
   the screen could not be read and Everkai added the button so a player is never stuck. A capture
   settles it.
9. **Forms.** Everkai lists Child / Adult / Awakened with their star gates. Is there a form
   *switcher* (like the Fellow's Form Switch), and does the familiar's art on every other screen
   change with the form?
10. **Item names and art.** Confirm **Magical Fruit** / **Familiar Crystal** as the English UI names
    for `Item_PetLevelUP` / `Item_PetClassUP` (§3.4), and capture their icons.
11. **Dispatch's gate block.** Family convention 12 gives the three-bar `have/need`-inside-the-fill
    pattern for Bonds. Does Dispatch's area gate use the same? Everkai uses a `<dl>`.
12. **Is `Free Attempts: N` (spec 10's unported counter) a familiar-side concept?** It appeared on
    the Fellow's Select Familiar dialog and was deliberately not ported. If the Familiar Hall shows
    it too, it needs a table lookup before anyone builds it.

---

## 7 · Recommended order for the spec work

Mirrors the two READMEs' logic: the shell first, because it makes every other section cheaper, then
the wordiest screens, then the rest.

1. **D1 — delete the second binding UI.** No capture needed. `SelectFamiliar` already exists, already
   built to spec, already styled (`globals.css:1617–1639`). This deletes a `NativeSelect`, two
   buttons, a hidden `small-note` and a `rules-note` in one change.
2. **§3.1 — delete the four provenance disclosures** (P2, P3, P4, P7) and the provenance half of P1.
   ~700 words, no capture needed, no information lost: every sentence already lives in
   `docs/parity-catalog.csv` and the module headers.
3. **D5 — fix the broken type filter** on the Companions roster, and pass `power`/`badge`
   (D6). No capture needed; D5 is a defect.
4. **D2 + D3 — the detail shell and the four `<select>`s.** Gated on capture question 3.
5. **D4 — the enemy formation as cards.** The player's own team slots are the template.
6. **Training, Exploring, Dispatch presentation** — conventions 1–4 (before→after, cost in the
   button, have/cost colour, quantity selector) and the Family three-bar gate block for Dispatch.
7. **D7 — collapse the duplicated tower-income control.** Gated on capture question 1.
8. **S1, S3, S10 (Forms, Compendium, locked detail)** — systems Everkai lacks or stubs. Gated on the
   `Pet*` table inventory and an owner decision for E7/E8.

---

## 8 · Findings ledger

Per rule 7 — every row is Fix, Defer or Drop.

| # | Finding | Disposition |
| --- | --- | --- |
| §0 | "Companions" vs "Familiars" | **FIX** — one name, direction from the capture |
| D1 | Binding implemented twice | **FIX** — delete `familiar-node-panel`'s half, reuse `SelectFamiliar` |
| D2 | Text pager nested in an icon dock | **FIX** — gated on capture Q3 |
| D3 | Four `<select>`s doing collection work | **FIX** — gated on capture Q5 for the node track; the three team/area pickers need no capture |
| D4 | Enemies as text, own team as art | **FIX** |
| D5 | Fellow type filter on the Familiar roster returns 0 matches | **FIX** — this is a defect, not a style point |
| D6 | Sort control and action badge suppressed on the Companions roster | **FIX** |
| D7 | Tower income control duplicated across two pages | **FIX** — gated on capture Q1 |
| D8 | Journey → Familiars redirect page | **FIX** — delete |
| D9 | Provenance prose on the player's screen | **FIX** — delete (≈700 words) |
| D10–D16 | Cosmetic: slot captions, cost after a `·`, disabled-vs-maxed, `<details open>`, shared icon, two names | **FIX** with the sections they sit in |
| D12 | No quantity selector | **FIX** — convention 4 |
| §2.3 | `'Not contracted'` dead string; dead `initialPage` prop; CSS-hidden `small-note` | **FIX** — delete all three |
| §2.3 | `familiar-skill-inventory.json` dead data | **DEFER** — it is the snapshot the six combat files verify against |
| §2.4 | `docs/permanent-systems.md` E5/E9/E10 stale | **FIX** — correct or point at the catalogue |
| §3.4 | "level-up items" / "class-up items" printed 28 times | **FIX** — rename to Magical Fruit / Familiar Crystal, add sprites; gated on capture Q10 |
| §5.2 | Every local rule is marked in module, panel and catalogue | **no action** — the discipline is correct; only the panel copy goes |
| §5.1 | Node table, 63 combat kits and `Pet_8041505` are community-sourced and not flagged in the catalogue's E6/E9 rows | **FIX** — one sentence per row, so rule 8 holds at catalogue level |
| S1 Forms | Listed, not shown | **DEFER** — needs capture Q9 and familiar Spine rendering, which is its own slice |
| S2 Metamorphosis (E7) | Measured, not built | **DEFER** — catalogue carries an explicit balance warning making it an owner decision |
| S3 Compendium (E8) | Absent, invisible | **DEFER** — catalogue reason stands (Country enum + 300 reward bundles) |
| S4 Familiar Shop | Absent; Familiar Tears have no sink | **DEFER** — a shop slice of its own, per E5 |
| S5 Fragments have no sink | Collected, unspendable | **DEFER** — reason recorded in E6 and load-bearing (24 familiars would freeze) |
| S7 `Item_PetFeedBox` | Not modelled | **DEFER** — E9 |
| S8 Incense / Energy Drinks / auto-explore / SSR wish | Not built | **DEFER** — E5 |
| S9 Progress Reversion | No refund table found | **DROP** until a table turns up |
| S10 Locked-familiar detail | One sentence | **FIX** — gated on the Fellow surface's `12-locked-fellow.md` pattern |
