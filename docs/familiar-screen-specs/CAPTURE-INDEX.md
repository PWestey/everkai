# Familiar screen captures — index

Captured from the running original client on the replacement private server
(`emulator-5582`, `com.iskslowtest.mislen`, 720x1280), 2026-09-23 and 2026-09-24. Third
companion set to `docs/fellow-screen-specs/` and `docs/family-screen-specs/`, same method,
same depth.

**This file is the capture index only.** The numbered section specs are the next job and
should be written from these images.

`Familiar` is the English UI name. The config tables call it `Pet*` (28 tables:
`Pet`, `PetLevel`, `PetStar`, `PetSkill`, `PetTower`, `PetEndlessTower`, `PetDispatch`,
`PetArea`, `PetBookLevel`, `PetMemoryStory`, `PetLotteryShop`, `PetCatchItem`, `PetBuff`, …).
The private server's modules match: `familiar_growth`, `familiar_tower`, `familiar_endless`,
`familiar_dispatch`, `familiar_explore`, `familiar_book`, `familiar_story`,
`familiar_commerce`, `familiar_avatar`, `familiar_tasks`, `familiar_state`.

## Read this first — what this evidence is and is not

**These captures are a replacement server's reimplementation of the original.**

| Good evidence (use it) | Not evidence (do not use it) |
| --- | --- |
| Which screens exist and how they nest | Costs, prices, drop rates |
| Control layout, proportions, tap targets | Level caps, table lengths, schedules |
| Wording of labels, gates, empty states | Any specific number shown on screen |
| State machines (locked / empty / affordable / maxed) | Which familiars exist, their rarity or roster order |
| Colour semantics, number *formatting* | Growth curves |

Every magnitude must come from the original's own config tables
(`.../apk-audit/configs/config/logic`, 1,499 tables) or the decompiled client
(`.../private-server/readable/*.lua`). Repeat this caveat at the top of every section spec.

The owner's save is heavily progressed: 33 familiars owned, five at Lv. 249 / 5★, Challenge
tower cleared to its Floor 300 ceiling, all 9 dispatch areas unlocked, exploration stamina at
its 50/50 cap. Numbers in the screenshots are end-game. Layout still holds.

## Where Familiar lives

Familiar is **not a dock tab**. Like Family, it is a labelled hotspot on the **Home** room
scene (beside `Family`, `Appearance` and `Artifacts`), partly occluded by the Calendar icon.

The structural surprise: unlike Fellow and Family, which open onto a **roster**, Familiar
opens onto a **scene hub** — an illustrated village with three labelled buildings, a bottom
action row and a bottom bar. The roster (`Familiar Growth`) is one building inside it. Nine
distinct top-level destinations hang off this one screen, and only three of them appear in
the game's own `(i)` manifest.

## The original's own manifest

The hub header's `(i)` (`hub-info-1.png`, `hub-info-2.png`) lists **three** headings:

1. Making Contracts with Monsters
2. Familiar Development
3. Familiar Tower

That is the whole manifest. Dispatch, the Handbook, the Pass, the shop and the bundles are
*not* in it — evidence they were bolted on after the system shipped.

## Screen tree as captured

```
Home → Familiar  (scene hub) .................... hub.png
├── (i) Information (3 headings)
├── ⚡ stamina 50/50 (header, capped)
├── speech-bubble pickup on the scene  ← CLAIMS an item when tapped
├── Familiar Dispatch  ......................... dispatch-main.png
│   ├── result modal on entry (auto-reported)
│   ├── (i) Expected Results tooltip
│   ├── Ruin → Areas list (9, "Current Area" ribbon)
│   └── slot → Select your familiars picker
├── Familiar Growth  (the roster) .............. growth-roster.png
│   ├── Sort by ▾  (Default / Rarity — only 2)
│   ├── class filter (ALL + 3)
│   ├── "Not Yet Joined" divider + locked cards
│   ├── card tap (owned) → detail shell ....... detail-shell-ssr.png
│   │   ├── right rail: Hide / Appearance / Info
│   │   ├── left rail: attribute · role (both INERT labels)
│   │   ├── ‹ › edge arrows page between familiars
│   │   ├── Combat Attribute (big modal, skills + descriptions)
│   │   ├── art tap → click-dialog (memory story)
│   │   ├── ✚ slot → Select Fellow (bind, POW old » new)
│   │   └── dock: Metamorphosis · Awaken · Level-Up · Basic Info
│   │       ├── Metamorphosis → Basic / Refined / Purified sub-tabs
│   │       ├── Awaken → star ladder, Universal Insignia, 15★ preview
│   │       ├── Level-Up → 2 milestone rails, Advance, Progress Reversion
│   │       └── Basic Info → returns to the shell (not a panel)
│   └── card tap (locked) → "Familiar Preview" .. locked-preview.png
│       ├── Source button
│       ├── form portraits (Child / Adult)
│       └── tabs: Info · Max Level Preview
├── Familiar Tower  ............................ tower-challenge-exhausted.png
│   ├── (i) Challenge Rules / Earnings / Combat Rule
│   ├── right rail: Challenge ⇄ Endless · Auto
│   ├── Team → isometric formation + ? Bond ladder
│   ├── Earnings → idle accrual modal (48h cap)
│   ├── All Claimed → floor Rewards ladder
│   └── Leaderboard → Endless Mode Ranking
├── Explore  ................................... explore-before is `hub` → Explore
│   ├── (i) Explore Freely
│   ├── Probability (full drop-rate disclosure)
│   ├── Attract → Trap Item (incense)    ← NOT pressed, see below
│   ├── Ruin → world map → Area Detail
│   ├── ? Intro (2-page tutorial)
│   └── Explore (⚡1) → one of at least FOUR event classes:
│       ├── monster encounter  ............. encounter.png
│       │   ├── Alertness bar + flee warning (34/100 after a failed throw)
│       │   ├── Details → Familiar Preview (same component as a locked card)
│       │   ├── contract carousel: Basic (∞) · grade 2 (105) · grade 3 (86)
│       │   ├── Use → throw animation → success ring (NO reward modal)
│       │   └── Soothe (consumes Mochi)   ← NOT pressed
│       ├── Luck Flower (the lottery)  .... explore-luck-flower.png
│       │   ├── Probability (own rate table)
│       │   └── Draw → Congratulations
│       ├── NPC event → Investigate  ...... explore-npc-event.png
│       │   └── Blessing Received (a PetBuff, with `Remaining: n`)
│       └── lost-item cache → Investigate .. explore-lost-item-event.png
│           └── "You've found lost supplies"
├── Pass (Familiar Pass) ....................... Base / Premium ladder
│   └── Get EXP → Periodic Tasks
├── Familiar Daily Offer  ← REAL MONEY ......... bundle-realmoney.png
├── Benefits Card  ← global monetisation surface
├── Handbook  .................................. handbook-familiar-list.png
│   ├── (i) Compendium EXP / Compendium Level
│   └── book icon → Collection Rewards ladder
└── Shop → Familiar Shop  ...................... shop-main.png
    └── Switch Shop → all game shops
```

## Index

| File | Screen | How reached from the Familiar hub | State shown |
| --- | --- | --- | --- |
| `hub.png` | Familiar hub scene | entry point | Default; 3 buildings, all with red `!` badges |
| `hub-info-1.png` | Hub `(i)` Information | hub → `(i)` top-left | Top of panel — headings 1–2 |
| `hub-info-2.png` | Hub `(i)` Information | scrolled | Bottom — heading 3, end of list |
| `hub-egg-bubble.png` | Scene pickup reward | hub → speech bubble | "Congratulations / Tap to continue" — **this claimed an item**, see below |
| **Growth (roster)** |
| `growth-roster.png` | Familiar Growth roster | hub → Familiar Growth | Default sort, ALL filter, count 33; lv.249 and lv.1 cards side by side |
| `growth-sort-open.png` | Sort dropdown | roster → `Sort by Default ▾` | Open — only **2** options (Default, Rarity) |
| `growth-filter-applied.png` | Class filter applied | roster → water class icon | Filtered; note the `33` counter does **not** change |
| `growth-roster-scrolled.png` | Roster mid-scroll | roster → swipe up ×2 | Mixed rarity nameplates (brown/purple/blue/green) |
| `growth-not-yet-joined.png` | "Not Yet Joined" divider | roster → scroll to bottom | Divider + first locked rows |
| `growth-locked-cards.png` | Locked card grid | roster → scroll to end | All-locked rows; rarity tint differs (purple SR, blue R) |
| **Owned familiar detail** |
| `detail-shell-ssr.png` | Detail shell | roster → owned card | SSR, Lv. 249, 5★, all rails present, empty ✚ bind slot |
| `detail-shell-lv1.png` | Detail shell | shell → `‹` edge arrow | **Lv. 1, 0★** — fresh state, same rail set |
| `detail-hide.png` | Hide → full-art mode | shell → Hide | Chrome hidden, single `Show` toggle |
| `detail-info.png` | Info panel | shell → Info | Name/Attribute/Source/Bio + Habit rows |
| `detail-info-habits.png` | Info panel, habits | scrolled | **3 habit slots, all unlearned — empty state** |
| `detail-appearance.png` | Appearance picker | shell → Appearance | Current form `Selected` (green, inert) |
| `appearance-locked-form.png` | Appearance, locked form | Appearance → locked tile | **Greyscale art + grey inert `Select`** + unlock caption |
| `detail-combat-attribute.png` | Combat Attribute modal | shell → Combat Attribute | Paw-power, Attack/Health/Speed, named Combat Skills |
| `detail-combat-attribute-scrolled.png` | same, scrolled | swipe | Full skill descriptions |
| `detail-combatpower-info.png` | Familiar Attribute modal | Combat Attribute → `(i)` | Basic + Special attribute glossary (modal stacked on modal) |
| `detail-click-dialog.png` | Click-dialog / memory story | shell → tap the familiar's art | Typewriter caption box mid-render ("When feeding it, k…") |
| `detail-bindslot.png` | Select Fellow | shell → ✚ slot | Bind picker; `POW old » new`, `Free Attempts: 2` in red |
| **Level-Up tab** |
| `detail-levelup.png` | Level-Up | detail dock → Level-Up | Lv. 249; two milestone rails; `Advance 6878/3000` **green/affordable** |
| `detail-levelup-lv1.png` | Level-Up | Lv. 1 familiar | Low-progress: empty rails |
| `levelup-info.png` | Familiar Attribute | Level-Up → `(i)` | Shared glossary modal (same one as above) |
| `levelup-node-locked.png` | Milestone node tooltip | Level-Up → locked node | Small modal: icon + `Power+50K` |
| **Awaken tab** |
| `detail-awaken.png` | Awaken | detail dock → Awaken | 5★; `Awaken 0/20` **red/unaffordable**; 6/7/10★ padlocked |
| `detail-awaken-lv1.png` | Awaken | Lv. 1 familiar | **0★, all stars padlocked; `Awaken 100/20` green/affordable** |
| `awaken-info.png` | Familiar Attribute | Awaken → `(i)` | Shared glossary modal |
| `awaken-newappearance.png` | 15★ appearance preview | Awaken → "New Appearance! 15★" | Full-screen art preview |
| **Metamorphosis tab** |
| `detail-metamorphosis.png` | Basic Metamorphose | detail dock → Metamorphosis | `10/1` **green**; `???` slots; "Unequipped by Fellows" gate banner |
| `metamorph-refined.png` | Refined Metamorphose | sub-tab 2 | Rare-tier attribute pool |
| `metamorph-purified.png` | Purified Metamorphose | sub-tab 3 | `0/1` **red/unaffordable**; Super Rare pool |
| `metamorph-info.png` | Metamorphosis `(i)` | → `(i)` | Rules text |
| **Locked familiar preview** |
| `locked-preview.png` | "Familiar Preview" | roster → locked card | SR; **grey silhouette art**; Info tab (Name/Attribute/Source/Bio) |
| `locked-source.png` | Source tooltip | preview → Source | Where the familiar drops |
| `locked-maxlevel.png` | Max Level Preview tab | preview → tab 2 | Final Power Bonus + bonus grid |
| `locked-maxlevel-scrolled.png` | same, scrolled | swipe | Combat Attribute rows |
| `locked-combat-skill.png` | Combat Skill section | scrolled further | Two skill medallions (SR) |
| `locked-skill-tooltip.png` | Skill tooltip modal | → skill medallion | Name + effect text |
| `locked-preview-r-paged.png` | Preview, paged | preview → `‹` edge arrow | **R rarity — only ONE combat skill** vs SR's two |
| `locked-preview-child-form.png` | Preview, child form | preview → form portrait | Rail label flips to "Initial Appearance" |
| **Dispatch** |
| `dispatch-result-modal.png` | Result modal | hub → Familiar Dispatch | Fires **on entry**; a finished dispatch auto-reported |
| `dispatch-main.png` | Dispatch screen | dismiss result | Basic/Extra rewards, 5 slots, 20 hr duration, `Great Success 0.00%` |
| `dispatch-expected-info.png` | Expected Results tooltip | → `(i)` | "Higher Attribute of Familiar team leads to higher chance…" |
| `dispatch-area-select.png` | Areas list | → Ruin | Top of list, per-area Basic/Extra rewards |
| `dispatch-areas-scrolled.png` | Areas list, bottom | scrolled | **"Current Area" ribbon**; all 9 unlocked |
| `dispatch-familiar-picker.png` | Select your familiars | → a slot circle | ✓ overlays on chosen; **filter bar has 4 classes here** |
| **Tower** |
| `tower-challenge-exhausted.png` | Tower, Challenge mode | hub → Familiar Tower | **Content exhausted** — Floor 300, "Please stay tuned.", All Claimed |
| `tower-floors-locked.png` | Tower, Endless mode | right rail → Endless | Floors 60–62 **locked** (padlock-and-chain barriers) |
| `tower-info.png` | Tower `(i)` | → `(i)` | Challenge Rules — states Endless unlocks at 200 Challenge floors |
| `tower-info-2.png` | Tower `(i)`, scrolled | swipe | Earnings + Combat Rule (team of 1–5) |
| `tower-team.png` | Team | → Team | Isometric formation, 5 placed, roster picker, Quick Deploy |
| `tower-team-bond.png` | Bond modal | Team → `?` | Same-type ladder: 3/4/5 → +10%/+13%/+15% |
| `tower-earnings.png` | Earning Rewards | → Earnings | **Idle Time 48:00:00/48:00:00 — capped/maxed**; `Earnings +10% (Activated)` |
| `tower-rewards-ladder.png` | Floor Rewards ladder | → All Claimed | Floor 10/20/30/40… all "Completed" |
| `tower-leaderboard.png` | Endless Mode Ranking | → Leaderboard | **One row, "Me", rank 1** — multiplayer surface, single player |
| **Explore** |
| `explore-info.png` | Explore `(i)` | Explore → `(i)` | "Explore Freely" — stamina, contracts, **Alertness** mechanic |
| `explore-probability.png` | Probability | → Probability | Full rate disclosure: SSR 4.5% / SR 15% / R 47%, per-familiar |
| `explore-attract.png` | Trap Item | → Attract | Basic/Advanced Incense, "No stamina consumed" |
| `explore-areas.png` | Explore world map | → Ruin | Hand-drawn map, area pins, `Contracted: 17/25` |
| `explore-area-showall.png` | Area Detail | map → Show All | Catchable roster by rarity; first padlock visible |
| `explore-area-detail-locked.png` | Area Detail, scrolled | swipe | **Locked entries: greyscale + padlock, name still shown** |
| `explore-intro.png` | Intro tutorial, page 1 | → `?` | "Explore Area" |
| `explore-intro-2.png` | Intro tutorial, page 2 | → `›` | "Contract Monsters" |
| **Explore — the encounter loop** (5 presses, 3 stamina; see accounting below) |
| `encounter.png` | Monster encounter | Explore → press `Explore` | N-rarity Clapme; **Alertness 0/100**; `Contract Success Rate: 70%` / `Failed: Alertness +30-40`; Basic Contract `∞` selected |
| `locked-preview-n-from-encounter.png` | Familiar Preview | encounter → Details | **Rarity N** — a tier below anything on the roster; same component as a locked roster card |
| `explore-luck-flower.png` | Luck Flower event | Explore → press `Explore` | **The familiar lottery.** 6-petal wheel, own `Probability`, `Draw` |
| `explore-luck-flower-probability.png` | Luck Flower rates | → Probability | Ultra-rare 2% / Rare 5% / Precious 93% (40/15/38) — a *different* table from the monster one |
| `explore-luck-flower-result.png` | Draw result | → Draw | Petal lights, "Congratulations", 50 Familiar Crystal. **No cost charged** |
| `explore-npc-event.png` | NPC event | Explore → press `Explore` | "Special Potion"; NPC speech bubble; `Investigate` replaces `Explore` |
| `explore-blessing-buff.png` | Blessing Received | NPC event → Investigate | **A `PetBuff`.** Special Potion, `Remaining: 2`, "The following exploration doesn't cost stamina" |
| `explore-blessing-buff-2.png` | Blessing Received | second NPC event | Fruitful Guidance, `Remaining: 2`, "…you get twice the rewards" — a second buff class |
| `explore-buff-active.png` | Active buff badge | after a blessing | Buff shows as a **third badge in the top-left counter stack**, under the two pity counters |
| `explore-after.png` | Explore at rest | after the first 5-press run | **Stamina 47/50**, buff badge at `1`, lost-item counter 18 → 20 |
| **Explore — second run, `Skip` unticked** (5 presses, 3 stamina) |
| `explore-lost-item-event.png` | Pleasant Surprise | Explore → press `Explore` | **A fourth event class** — the lost-item cache; `Investigate` replaces `Explore` |
| `explore-lost-item-result.png` | Lost-supplies reward | → Investigate | "You've found lost supplies", 10 Magical Fruit. Note the **subtitle line** the other reward cards lack |
| `encounter-contract-animation.png` | Contract throw | encounter → `Use`, `Skip` **off** | Full-screen, all chrome hidden, seal spinning above the monster. **This is what `Skip` suppresses** |
| `encounter-alertness-raised.png` | Contract **failed** | after a failed throw | **Alertness 34/100**, bar red — inside the promised `+30-40`. Encounter continues, `Use` still live |
| `encounter-contract-success.png` | Contract **succeeded** | second `Use` on the same monster | The capture beat: creature silhouetted white in a glowing ring on a starfield. **No modal follows** — see below |
| `encounter-r-rarity.png` | Monster encounter, **R** | Explore → press `Explore` | Spikiehog; `Contract Success Rate: 10%` against the N-tier's 70% — matches `PetCatchItem` grade 1 `RProb: 1000`. `Skip` shown unticked |
| **Handbook** |
| `handbook-familiar-list.png` | Familiar List | hub bottom bar → Handbook | Compendium Lv.1, 5-type bonus strip, EXP badges, Quick Collect |
| `handbook-info.png` | Handbook `(i)` | → `(i)` | Compendium EXP / Compendium Level rules |
| `handbook-book-level.png` | Collection Rewards | → book icon | Lv.1–5 ladder; **"Completed" vs "Not Achieved"** pair |
| **Shop / Pass / monetisation** |
| `shop-main.png` | Familiar Shop | hub bottom bar → Shop | Crystal shop, discount starbursts, `Limit: N` |
| `shop-scrolled.png` | Familiar Shop, scrolled | swipe | More stock; a second currency appears |
| `shop-switched.png` | Switch Shop | → Switch Shop | **Global shop switcher** — Familiar Shop is one tab of a shared shell |
| `pass-getexp.png` | Periodic Tasks | Pass → Get EXP | Pass-EXP task list, "automatically added" footnote |
| `bundle-realmoney.png` | Familiar Bundle | hub → Familiar Daily Offer | **REAL MONEY** ($0.99/$2.99, VIP EXP). Opened, nothing touched |
| `benefits-card.png` | Benefits Card | hub → Benefits Card | Global monthly-pass surface; lists "Familiar Tower Idle Earnings" |

90 images. Every image is 270x480 (downscaled from 720x1280), matching the Fellow and
Family sets.

## Not reached, and why

| Thing | Why |
| --- | --- |
| **Monster flees at Alertness 100** | Reached 34/100 on one failed throw, then succeeded on the next. Getting to a flee needs three consecutive failures on one monster — possible for free (the Basic Contract is `∞`) but it did not come up. The screen states the rule in the game's own words. |
| `Soothe` (encounter screen) | Consumes Ordinary Mochi — a finite consumable, and the stop rule applies. Its effect (lowering Alertness) is stated in the Explore `(i)`. |
| `Attract` / `Use` on an Incense | **Deliberately excluded.** `explore-attract.png` records the dialog's own words — "No stamina consumed" — so Attract reaches the *same* encounter loop that `Explore` reaches, while burning a finite consumable to skip a stamina cost that regenerates. Its only unique surface is the dialog, which is already captured. |
| Contract grades 2 and 3 | Selecting a different contract in the carousel is free, but *using* one consumes a finite item (105 and 86 in stock). The rate difference is in `PetCatchItem.json` (grade 1/2/3 → N 70%/100%/100%, SSR 3.1%/10%/100%). |
| `Advance` (Level-Up) | A spend. Both the affordable (`6878/3000` green) and low-progress states are captured; the button was not pressed. |
| `Awaken` | A spend. **Both** states captured — unaffordable `0/20` red and affordable `100/20` green. |
| `Quick Activate` (Level-Up and Awaken) | A bulk spend. |
| `Progress Reversion` (Level-Up) | Not opened. Unlike a cost dialog, I could not establish from outside whether it confirms first or reverts immediately, and a reversion is an irreversible change to the owner's familiar. Deliberately left alone. |
| `Metamorphose` / `Clear` | A spend and a destructive wipe. Affordable/unaffordable pair captured on the sub-tabs instead. |
| `Challenge` (tower, both modes) | Starts a battle and can advance the owner's floor. The battle screen and its result modal are therefore **not captured** — a second real gap. |
| `Auto` (tower) | A spend automation. Icon and position specced from the capture. |
| `Claim` (tower Earnings) | A gain, but it resets the owner's 48-hour idle accrual — the maxed state in `tower-earnings.png` would have been destroyed by capturing the claimed state. Kept the maxed state. |
| `Quick Collect` / tapping a Handbook card | The Handbook `(i)` states tapping a familiar **claims** its Compendium EXP. Same trap as the Family capture's gallery chests. Not tapped. |
| `Confirm` (dispatch) | Commits the owner's 5 familiars for 20 hours. |
| `Quick Deploy` / dragging the tower formation | Rewrites the owner's saved team. |
| `Equip` (Select Fellow) | Rebinds a familiar to a different Fellow. Dialog captured, button not pressed. |
| Any purchase in `Familiar Shop`, `Familiar Bundle`, `Benefits Card`, `Pass` | Currency and real-money spends. Panels captured at rest; **nothing inside them was pressed**. |
| `PetLotteryConfig` / `PetLotteryShop` | Still unlocated **as a shop**. `PetExploreLottery` is now found and captured — see the correction below. |
| **`PetCareer` / `PetClass` beyond the filter icons** | The attribute (`Cute`/`Cool`/`Playful`) and role (`Attacker`) badges on the detail shell are **inert** — tapping them does nothing. There is no class/career detail screen. |

### Two things I previously recorded as absent, and was wrong about

Both were found by spending the approved stamina. Correcting them here rather than leaving
the earlier claim standing:

- **The familiar lottery exists.** It is `Luck Flower` (`explore-luck-flower.png`), and it is
  an **exploration encounter event**, not a shop — which is why searching the shop surfaces
  for it found nothing. It has its own `Probability` modal with its own rate table
  (Ultra-rare 2% / Rare 5% / Precious 93%), a six-petal wheel and a `Draw` that charges
  nothing. That maps to `PetExploreLottery`, not to `PetLotteryShop`.
- **`PetBuff` has a surface.** Exploration **blessings**, granted by NPC encounters
  (`explore-blessing-buff.png`, `explore-blessing-buff-2.png`). Each is a named buff with a
  `Remaining: n` counter and a one-line effect, and while active it shows as an extra badge
  in the Explore screen's top-left counter stack (`explore-buff-active.png`). Two distinct
  classes observed: a **stamina waiver** ("the following exploration doesn't cost stamina")
  and a **reward multiplier** ("the next time you find lost item, you get twice the
  rewards"). There is no buff *panel*; the badge stack is the whole UI.

### The class-filter discrepancy, resolved

Against the config set (positive control re-run per CLAUDE.md rule 2: `Wife` returns 151 rows):

- **`PetClass.json` is not a class table at all.** Its 10 rows are a star-tier growth curve —
  `Cost`, `LevelMax`, `ATKcoef`, `HPcoef`, `SPDadd`. It matches `Pet.ClassMax: 10` and the
  Awaken screen's star ladder. Nothing filters on it.
- **The filter is `Group`.** `PetGroup.json` has **4** rows, and `Pet.Group` uses all four,
  distributed 19 / 19 / 19 / 13 across the 70 familiars.
- `PetCareer.json` has 3 rows and is the *role* (Attacker and two others), shown as the
  second left-rail badge — not a filter anywhere.

**So 4 is the real set, and the roster's 3-icon bar is short by one.** I confirmed on the
device that the roster rail does not scroll or page — the `《 》` chevrons flanking it are
decorative end-caps, not controls, and tapping them does nothing. The dispatch picker
(`dispatch-familiar-picker.png`) shows the full four. The likeliest explanation is that the
roster omits a Group the owner has no members of, while the dispatch picker renders the
static set; **I did not confirm that the owner owns zero Group-4 familiars**, so treat that as
the remaining question. Either way, build against `PetGroup`'s four.
| Tower current-floor view with `Recommended` + reward chest | Seen on first entry and lost to a naming error on my side; the list then auto-anchored to the next locked floor and would not scroll back. `tower-floors-locked.png` covers the locked-floor state. Re-capturable in seconds on a fresh entry. |

## What the Explore run cost

Approved budget: five presses. Used: five.

| Press | Event | Stamina after |
| --- | --- | --- |
| — | *(before)* | **50 / 50** |
| 1 | Monster encounter (N, Clapme) → Basic Contract used → **succeeded** | 49 |
| 2 | Luck Flower → Draw → 50 Familiar Crystal | 48 |
| 3 | NPC event → Blessing: Special Potion ×2 (stamina waiver) | 47 |
| 4 | NPC event → Blessing: Fruitful Guidance ×2 (reward ×2) | 47 — **free**, spent a Special Potion charge |
| 5 | Lost-item find, doubled by Fruitful Guidance (counter 18 → 20) | 47 — **free**, spent the second charge |
| — | *(after)* | **47 / 50** |

**Net cost: 3 stamina out of a 50 cap that refills on its own.** Two of the five presses ran
free on the Special Potion blessing. One Special Potion charge remains unspent. The account
came out ahead in items: one contracted familiar, 50 Familiar Crystal, and a doubled
lost-item find.

### Second run — `Skip` unticked, 2026-09-24

Approved to untick the encounter screen's `Skip`, capture the suppressed result, and restore
it. Five presses again; **47/50 → 44/50, 3 stamina.** Press 1 ran free on the last Special
Potion charge. Repeated `Use` presses on one monster are free (the Basic Contract is `∞`) and
do not count against the press budget, which is spent on `Explore` rolls only.

What unticking `Skip` revealed, and the finding that matters:

- `Skip` suppresses **two animation beats**, not a modal. The throw
  (`encounter-contract-animation.png`) and, on success, the capture ring
  (`encounter-contract-success.png`). Both are full-screen with all chrome hidden.
- **There is no "new familiar" reward modal.** With `Skip` off, the successful catch plays
  the capture animation and returns straight to the Explore screen. No Congratulations card,
  no item grid — unlike the Luck Flower draw, the lost-item find and the blessing grant, which
  all use the shared ribbon component. The catch is the one reward in the system presented
  purely as animation. Two captures 1.3 s apart bracket the transition and neither shows a
  card; a modal shorter than that is possible but nothing observed suggests one.

**`Skip` was restored.** Its pre-change state was read off the encounter screen and recorded
as **ticked** before anything was touched (not recalled from memory). After the capture it was
re-ticked on the next encounter and verified by reading it back from two fresh screenshots
taken three seconds apart, both showing the green check. The checkbox lives only on the
encounter screen and persists across encounters — it was still unticked on a later,
separately-rolled monster (`encounter-r-rarity.png`), which is both the proof it is a stored
preference and the reason restoring it mattered. The Explore screen's separate
`Skip Animation` checkbox was never touched and remains ticked.

Nothing finite was consumed to get there. The Basic Contract used on press 1 displays `∞`
rather than a count — it is the unlimited free-tier contract, which is why its success rate
is the lowest of the three (`PetCatchItem` grade 1: N 70%, SSR 3.1%). The two finite
contracts (105 and 86 in stock) were left alone, as were the Incenses and the Mochi.

## Things that happened and should be on the record

- **Tapping the speech bubble on the hub scene claimed an item** (1 Ordinary Mochi,
  `hub-egg-bubble.png`). It is a scene pickup, not a decoration, and it sits in open scene
  space with no badge to warn you. Same class of trap as the Family capture's gallery chests.
- **Entering Familiar Dispatch auto-reported a completed dispatch** and showed a Success
  result modal before I could capture the screen behind it (`dispatch-result-modal.png`).
  I did not trigger this; it fires on entry. The `OK` press only dismissed an
  already-granted reward.
- **The client was restarted during this session.** Before the capture began it was stuck
  behind a broken tutorial overlay (`Guide Click Block. group name=FirstUnlockShapeshiftClothes`,
  a guide whose step errors in `GuideLayer.lua` and so never clears). The restart lost the
  Frida-injected client patches and had to be recovered through the harness's own launcher.
  **Do not tap the top-left player avatar** — that is what arms the trigger
  (`ScenePlayerInfo.lua:136`). If it arms anyway, opening the player-info screen's **Figure**
  tab sets a device-local flag that suppresses it permanently and spends nothing
  (`ScenePlayerInfo.lua:443`).
- On entry the client was sitting on a **paid fund panel** ("Rissette Exclusive Fund").
  It was closed via the panel's own back arrow without touching the ladder.
- **The Explore run (2026-09-24) was an approved, budgeted spend** of five presses. It cost
  3 stamina of 50 and returned one contracted familiar, 50 Familiar Crystal and a doubled
  lost-item find. Full accounting above. Nothing finite was consumed.
- The hub's **speech-bubble pickup had not respawned** when the Explore run began, so it was
  not re-tapped. The finding from the first session stands as recorded.

## Observations worth carrying into the section specs

These are structural notes from the capture, not spec decisions.

1. **The entry point is a scene, not a roster.** Fellow and Family both open onto a list.
   Familiar opens onto an illustrated hub with three labelled buildings, a four-button action
   row and a two-button bottom bar. Nine top-level destinations hang off it. If Everkai copies
   one thing from this capture, the question to settle first is whether it copies the hub or
   flattens it — everything else follows from that.
2. **The game's own manifest covers three of those nine.** Contracts, Development, Tower.
   Dispatch, Handbook, Pass, Shop, Daily Offer and Benefits Card are not mentioned. Two of
   the nine are monetisation surfaces that are not familiar-specific at all.
3. **The fourth dock tab is not a panel.** `Basic Info` closes whatever panel is open and
   returns to the shell. It is a "close" verb dressed as a tab.
4. **One glossary modal is reused three ways.** `Familiar Attribute` is what opens from the
   `(i)` on Level-Up, on Awaken, and inside the Combat Attribute modal — and in the third case
   it stacks on top of another modal. One component, three call sites.
5. **Locked art is greyscale, everywhere, consistently.** Locked appearance tile, locked
   preview silhouette, locked Area Detail entries. The art is the state; the padlock is
   secondary. This is the Family capture's convention 15 holding on a third system.
6. **Affordability is colour, and both halves were captured for every gate.** `Advance`
   6878/3000 green; `Awaken` 0/20 red against 100/20 green on a different familiar;
   Metamorphose 10/1 green against Purified 0/1 red on the same screen. Convention 3 from the
   Fellow README holds without exception.
7. **The two tower modes are sequential, not parallel** — the `(i)` says Endless unlocks after
   200 Challenge floors, and the save bears it out: Challenge exhausted at its Floor 300
   ceiling ("Please stay tuned."), Endless in progress at floor ~59. My first reading of these
   two screens was backwards; the `(i)` text is what settles it.
8. **The class filter bar is inconsistent between screens.** The Growth roster and the tower
   Team picker show ALL + 3 classes; the dispatch picker shows ALL + 4. Worth resolving against
   `PetClass.json` before specifying either.
9. **The Familiar Shop is not familiar UI.** `Switch Shop` reveals it as one tab of the game's
   generic shop shell alongside Drakenberg, Golemore, Trading Post, Banquet, Wish and Alraune.
   Spec it as a shared component, not a familiar screen.
10. **Exploration is not one screen, it is a slot machine over at least three event classes.**
    One `Explore` press yields a monster encounter, a Luck Flower lottery, an NPC blessing, or
    a lost-item find — each with its own layout, its own primary verb (`Use` / `Draw` /
    `Investigate`) and, for two of them, its own rate table. The `Explore` button is a single
    control with four or more destinations behind it. Anything Everkai builds here has to
    model the event roll first and the screens second.
11. **One reward component is reused everywhere.** The "Congratulations / Tap to continue"
    ribbon is identical for the hub scene pickup, the Luck Flower draw and the blessing grant
    (which swaps the word to "Blessing Received" and adds a `Remaining: n` pill). One
    component, four call sites.
12. **The Handbook pays out in Fellow types.** Its 5-icon bonus strip and its Collection
    Rewards ladder both grant "Power of [Type] Fellow +5%" across the same five Fellow types
    the Fellow roster filters by. The familiar system feeds the fellow system; that cross-link
    should be explicit in the specs.
13. **Memory stories are click-dialogs on the art, not a screen.** `Pet.ClickDialog` carries
    three lines for all 70 familiars, surfaced by `pet_read_story` when you tap the familiar in
    its detail view. It renders as a translucent full-width caption box low on the art, with a
    typewriter reveal, no speaker name and no dismiss control. There is no story gallery.
