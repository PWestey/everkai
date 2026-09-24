# 01 · The Familiar hub scene

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/hub.png`, `img/hub-info-1.png`, `img/hub-info-2.png`, `img/hub-egg-bubble.png`
(`img/pass-getexp.png`, `img/handbook-familiar-list.png`, `img/shop-main.png`,
`img/bundle-realmoney.png`, `img/benefits-card.png` for the destinations that hang off it).

Serves manifest headings 1, 2, 3 — which is all three of them.

## The structural headline

Fellow opens onto a roster. Family opens onto a roster. **Familiar opens onto a scene** — an
illustrated village with three labelled buildings, a task ticker, an action row and a bottom
bar. The roster (`Familiar Growth`) is one building inside it. **Nine top-level destinations
hang off this one screen**, and the game's own `(i)` manifest names three of them.

Everkai reaches the same systems through a four-entry icon dock with a
`Previous · n / 4 · Next` footer (`app/familiar-hall.tsx:9`, `app/panel-pages.tsx:32`). That
is the single difference this whole spec set turns on, and it is the one the owner has to
rule on before anything else is built: **hub or flat dock.** Everything else follows.

This spec assumes the hub, because it is what the original does and because Everkai already
has the component that draws one (`app/drakenberg-town.tsx` — a painting with labelled
`town-plate` hotspots positioned by percentage, plus a list fallback for accessibility).

## Layout

720 × 1280. Measured off the 270 × 480 capture and scaled ×2.67, so treat the pixel figures
as proportions rather than as exact values.

| Band | y | share | Contents |
| --- | --- | --- | --- |
| Currency bar | 0–45 | 3.5% | Earnings/s + `(i)`, gold, crystals, `⊕`. Persistent chrome, not part of this screen. |
| Header strip | 50–90 | 3% | `(i)` badge then the word **Familiar**, left at x ≈ 20, on a semi-transparent plate. At the right edge, the **stamina pill**. |
| Scene | 90–1190 | 86% | The illustrated village. Three building plates, wandering familiars, the speech-bubble pickup, the task ticker, the action row, the `Explore` medallion. Everything is *on* the art; there is no panel, no card and no scroll container. |
| Bottom bar | 1190–1280 | 7% | `«` back plinth at the far left; `Handbook` and `Shop` at the right. Nothing in the middle. |

```
 0 ─────────────────────────────────────────────────────── currency bar
50 │ (i) Familiar                              ⚡ n/cap    │ header strip
   │        ╭──────╮                                      │
   │        │ item │  ← speech-bubble pickup (CLAIMS)     │  bubble ≈ (230,110)-(320,200)
   │  ╱▔▔╲  ╰──┬───╯                                      │
   │ ╱house╲   ▼        ┌ Familiar Dispatch ⊙ ┐           │  plate y ≈ 250
   │                                                      │
   │        ┌ Familiar Growth ⊙ ┐                         │  plate y ≈ 420
   │                                                      │
   │              (familiars wander the scene)            │
   │                          ┌ Familiar Tower ⊙ ┐        │  plate y ≈ 790
   │ ┌───────────────────────────┐                        │
   │ │ ◙ <task text>             │          ╭────────╮    │  task ticker y ≈ 960-1040
   │ │   n/n  ✓                  │          │ map    │    │  Explore, d ≈ 140
   │ └───────────────────────────┘          ╰────────╯    │
   │  (Pass)  (Familiar   (Benefits           Explore     │  action row y ≈ 1050-1150
   │           Daily Offer) Card)                         │  circles d ≈ 90
1190├──────────────────────────────────────────────────────┤
   │  «                              Handbook    Shop     │  bottom bar
1280└──────────────────────────────────────────────────────┘
```

`⊙` marks a red `!` badge. In the capture **every** destination carried one — three buildings,
`Explore`, `Familiar Daily Offer`, `Benefits Card`, `Handbook`. That is the roster card's
badge convention (Fellow spec 01, difference R4) applied to a whole screen: the scene is the
notification surface.

## The nine destinations

| # | Where it sits | Label | What it opens | In the `(i)` manifest? |
| --- | --- | --- | --- | --- |
| 1 | scene, upper | `Familiar Dispatch` | the 5-slot dispatch screen; a finished run auto-reports on entry | no |
| 2 | scene, middle | `Familiar Growth` | the roster — spec 02 | yes (heading 2) |
| 3 | scene, lower | `Familiar Tower` | Challenge / Endless, Team, Earnings, Leaderboard | yes (heading 3) |
| 4 | action row, right | `Explore` | the exploration loop — the encounter, Luck Flower and NPC events | yes (heading 1) |
| 5 | action row, 1st | the Familiar Pass | `Familiar Pass` → Base/Premium ladder → `Get EXP` → `Periodic Tasks` | no |
| 6 | action row, 2nd | `Familiar Daily Offer` | a **real-money** bundle panel | no |
| 7 | action row, 3rd | `Benefits Card` | the game-wide monthly-pass surface | no |
| 8 | bottom bar | `Handbook` | the Compendium: familiar list, Compendium level, Collection Rewards | no |
| 9 | bottom bar | `Shop` | `Familiar Shop`, which `Switch Shop` reveals to be one tab of the game's generic shop shell | no |

The Pass button's label is obscured by its own sparkle VFX in `hub.png`; it is identified from
`img/pass-getexp.png`, whose header strip reads `Familiar Pass`, and from
`System.PetBPID` (`PetBP01`) with `System.PetBPRightShow`, which lists the Pass's perk ladder.

**Two of the nine are not familiar systems at all** (`Familiar Daily Offer`, `Benefits Card`)
and one is a shared component (`Shop`). Everkai has no monetisation, so the honest port of the
hub is **six live destinations** — Dispatch, Growth, Tower, Explore, Pass and Handbook — with
Shop appearing when the Familiar Shop slice lands (audit S4). Do not draw dead buildings.

## The `(i)` Information panel

A cream parchment sheet inset ~24 px, titled `Information`, with a red `✕` tab clipped to its
top-right corner. It scrolls. Three `- Heading -` blocks, each a run of `◆`-bulleted lines:

1. **Making Contracts with Monsters** — exploration, stamina, contract grades, Alertness.
2. **Familiar Development** — contracting makes a monster your familiar; items raise level and
   stars; *"Powerful Familiars can provide significant support when bound to a Fellow."*
3. **Familiar Tower** — team up, clear floors, and *"As the total number of floors cleared
   increases, the gains from the Familiar Tower improve."*

That is the whole manifest: **three headings for nine destinations.** Dispatch, the Handbook,
the Pass, the shop and the bundles are absent from it — evidence they were bolted on after the
system shipped, and a reason to treat them as second-tier when ordering the rebuild.

It is also the only prose on the surface. Convention 10 holds here exactly as it does on the
Fellow and Family rosters: **one `(i)`, one panel, everything the game wants to say.**

## The stamina header

A dark translucent capsule at the header strip's right edge, with a cyan lightning glyph
overhanging its left end and `have/cap` in white inside it. No label, no `+`, no timer while
full. It is the only number on the hub's own chrome.

**The cap is not 50.** The capture's save carries the Familiar Pass, and the config set holds
two pairs:

| Magnitude | Table |
| --- | --- |
| Base cap **20**, initial **20** | `System.PetExploreEnergyMax`, `System.PetExploreEnergyInitial` |
| Base regeneration interval **5400** | `System.PetExploreEnergyTime` |
| Pass-boosted cap **50** | `System.PetExploreEnergyMaxBP` |
| Pass-boosted interval **3600** | `System.PetExploreEnergyTimeBP` |
| The stamina item itself | `System.PetExploreEnergy` → `Item_PetExploreEnergy` |
| One exploration costs **1** | `PetArea.cost`, constant on all 3 rows (rule 6: constant, and here it is the real value) |

So `50/50` in the screenshot is a **Pass perk**, granted by `Item_PetBP_EnergyMax` at Pass
level 1 (`System.PetBPRightShow`). Everkai has no Pass; the number it shows must be
`PetExploreEnergyMax`, and the 90-minute regeneration `app/familiar-explore-panel.tsx:14`
already prints is `PetExploreEnergyTime` — correct, and now sourced.

## The speech-bubble pickup

A parchment speech bubble with a stem, floating in open scene space over a rooftop, containing
a single item icon. **Tapping it claims an item** — the capture took 1 Ordinary Mochi
(`img/hub-egg-bubble.png`). There is no badge, no counter and no confirmation; the reward
ribbon fires immediately: an orange banner reading `Congratulations`, the item icon, and
`Tap to continue` beneath.

That ribbon is one reused component. The capture index records it at four call sites (scene
pickup, Luck Flower draw, blessing grant, contract result), where the blessing case swaps the
word for `Blessing Received` and adds a `Remaining: n` pill. **Build it once.**

Where the reward comes from, measured rather than read off the screen: the only daily Mochi
grant in the config is `System.PetPacifyDaliy` → `RewardPetPacifyDaliy`; the Mochi item is
`System.PetAssistItem` → `Item_PetPacify1` (`count: 30`), and `System.PetAssistItemUseMax` is
`3`. Take the amount from that reward bundle, not from the screenshot.

**One deliberate deviation.** The capture index files this pickup as a trap — an unmarked,
irreversible tap sitting in decorative space. Everkai should keep the pickup and give it the
red `!` badge every other claimable on this screen already has. That is a departure from the
capture, and it is the only one this spec recommends.

## The task ticker

A parchment banner pinned to the left edge above the action row: a character portrait in a
frame at its left, then two lines of task text, then `have/need` in green with a green `✓`
when complete. The portrait is the same character as the Pass button's medallion, so the
ticker is almost certainly the Pass's current periodic task surfaced on the hub — but **it was
not pressed and its destination was not established.** `img/pass-getexp.png` shows the
`Periodic Tasks` list it presumably belongs to, whose footer reads
*"When tasks are completed, Battle Pass EXP will be automatically added."*

Spec it as: a one-line task with a progress pair and a completion tick, or nothing. Do not
invent a tap target for it.

## Compared with Everkai

Everkai's Familiar Hall is reached from a village-map side button (`app/page.tsx:170`) that
shares `./assets/ui/journey.webp` with four unrelated buttons, and renders
`PanelPages labels={['Familiars','Tower','Exploring','Dispatch']}` in `systemPopup` mode — an
icon dock, a modal sheet, and a `Previous · n / 4 · Next` footer.

| Difference | Kind |
| --- | --- |
| A four-entry icon dock against a nine-destination scene. Five of the original's destinations (Explore as its own place, the Pass, the Handbook, the Shop, the bundles) have **no slot at all** in Everkai's dock; Exploring is a dock page rather than a place you walk to | **structural** |
| `Previous · n / 4 · Next` under a four-icon dock — a pager for four items, the exact control both character rebuilds deleted | **structural** |
| Everkai has no hub-level `(i)`; its explanations are scattered into six `rules-note` disclosures across four pages (audit §3.1) | **structural** |
| Everkai has no stamina in the chrome — it lives inside the Exploring page (`app/familiar-explore-panel.tsx:13–14`) as a bar plus the sentence `+1 stamina in 46m · one point every 90 minutes`. The original keeps it in the header of every screen in the system | **structural** |
| No scene, no buildings, no wandering familiars, no art of any kind: the Hall is a modal with a generic icon | **structural** |
| No action-available badges anywhere on the Familiar surface. The original badges every destination | **structural** |
| No scene pickup, and nothing that would hold one | **structural** — but it is a faucet, so it is an owner decision, not a free port |
| Everkai's entry button and module heading use the shared `journey` icon; the original's entry is a labelled hotspot on the Home room scene | cosmetic |
| Everkai calls the system `Familiars` in five places and `Companions` on the roster header (`app/familiar-panel.tsx:29`); the original says `Familiar` everywhere, and `Familiar Growth` for the roster | cosmetic |
| The Journey module's page 2 is a one-sentence redirect to the Hall (`app/page.tsx:187`, audit D8) | **structural** — delete it; the hub is the navigation |

## What Everkai should render

```
(i) Familiar                                         ⚡ 12/20

            ╭────────╮
            │ 🍡 x1  │  ⊙          ┌ Familiar Dispatch ⊙ ┐
            ╰───┬────╯
                ▼
        ┌ Familiar Growth ⊙ ┐

                           ┌ Familiar Tower ⊙ ┐
 ┌─────────────────────────┐
 │ ◙ <periodic task>  3/10 │              ( map )
 └─────────────────────────┘              Explore ⊙

  ( Pass ⊙ )   ( Handbook ⊙ )

 «                                   Handbook     Shop
```

1. **One background painting** with labelled plate buttons positioned by percentage — the
   `town-plate` pattern from `app/drakenberg-town.tsx`, reused, including its list fallback.
2. **The stamina pill in the header**, present on every screen in the system, not just
   Exploring.
3. **A red `!` on every destination that has something to do**, from one predicate per
   destination. This is the same missing predicate the Fellow roster wanted (R4) and the
   Companions roster still lacks (`badge` is never passed — audit D6).
4. **The `(i)` panel** holding the three headings, which is where four of the six
   `rules-note` disclosures go to die.
5. **No pager.** The scene is the navigation.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Scene painting + hotspot coordinates | a layout JSON like `lib/drakenberg-layout.json` | **no** — the component exists, the familiar scene's art and layout do not |
| Stamina have/cap/timer | `exploreState(game)` in `lib/familiar-explore.mjs` | **yes** — cap and interval already read `PetExploreEnergyMax` / `…Time` |
| Per-destination `!` badge | "anything claimable or affordable behind this door" | **derivable** — no predicate exists today, on any familiar surface |
| Dispatch / Growth / Tower / Explore destinations | four shipped systems (`lib/familiar-dispatch.mjs`, `lib/familiars.mjs`, `lib/familiar-tower.mjs`, `lib/familiar-explore.mjs`) | **yes** |
| Handbook | `PetBookLevel` (300 rows) | **no** — parity row E8, deferred; the hub would give it its first UI slot |
| Familiar Shop | `PetLotteryShop` (21 rows) | **no** — audit S4; Familiar Tears already accumulate with no sink |
| Familiar Pass + periodic tasks | `System.PetBPID`, `System.PetBPRightShow` | **no** — and its perks *raise the stamina cap and the tower hold*, so it is not cosmetic |
| Scene pickup | `System.PetPacifyDaliy` → `RewardPetPacifyDaliy` | **no** — Mochi exists in `lib/familiar-explore.mjs`; the daily grant does not |
| Wandering familiars on the scene | owned roster + chibi art | **partially** — `petCardIcon()` art exists; no scene sprites |

### Numbers seen on this screen, and where the real ones live

| On screen | Do not copy | Take from |
| --- | --- | --- |
| `⚡ 50/50` | the cap is Pass-boosted | `System.PetExploreEnergyMax` (20), `…MaxBP` (50) |
| stamina regeneration | — | `System.PetExploreEnergyTime` (5400), `…TimeBP` (3600) |
| `301/10 ✓` on the ticker | an end-game save's counter | the Pass task list, not yet located as a table |
| 1 Ordinary Mochi from the bubble | a single observed grant | `RewardPetPacifyDaliy`; item `Item_PetPacify1` |
| three buildings, nine doors | — | this is layout, not a magnitude: copy it |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Previous · n / 4 · Next` under the Hall's dock | the scene; the destinations are places, not pages |
| `Familiars have their own hall: your collection, the Familiar Tower, Exploring and Dispatch.` + `Open the Familiar Hall` (`app/page.tsx:187`) | delete the Journey page entirely (audit D8). The hub is the collection, the tower, exploring and dispatch — it does not need a sentence saying so |
| `Exploring rules and what is measured` (196 words, `app/familiar-explore-panel.tsx:29`) and `Tower rules and what is measured` (249 words, `app/familiar-tower-panel.tsx:51`) and `Dispatch rules and what is measured` (203 words, `app/familiar-dispatch-panel.tsx:31–33`) | the hub `(i)`'s three headings for the *rules*; the provenance halves are deleted outright, because they already exist verbatim in `docs/parity-catalog.csv` and the module headers (audit §3.1) |
| `+1 stamina in 46m · one point every 90 minutes` (`app/familiar-explore-panel.tsx:14`) | the header pill: `⚡ 12/20`, with the rate in the `(i)` under *Making Contracts with Monsters*, which is where the original states it |
| `Tower floor 175 cleared.` on the Exploring page (`app/familiar-explore-panel.tsx:30`) | nothing — it duplicates the Tower destination, and the badge on the Tower building says "look here" without a sentence |
| the shared `journey.webp` icon and heading for the Familiar module | the scene itself; the module heading is `Familiar` |

---

## Resolution (2026-09-24)

Rule 7. **The owner's ruling this spec asked for — hub or flat dock — is settled as the hub**, which
is what the original does and what every other spec in this set is downstream of.

| Difference | Outcome |
| --- | --- |
| Four-entry icon dock vs a nine-destination scene | **Fixed as adapted: five live destinations.** Growth, Dispatch, Tower, Explore and the Handbook are places on a scene. Two of the original's nine are not familiar systems at all (`Familiar Daily Offer`, `Benefits Card`), one is the game's generic shop shell, and the Familiar Pass is monetisation — Everkai has none of it, and the spec's own instruction is **do not draw dead buildings**. The Familiar Shop appears when audit S4 lands. |
| `Previous · n / 4 · Next` under four icons | **Fixed.** Deleted. The scene is the navigation. |
| No hub-level `(i)` | **Fixed.** One `(i)`, one panel, the original's three headings — Making Contracts with Monsters, Familiar Development, Familiar Tower. Four of the six `rules-note` disclosures scattered across four familiar pages came here to die. |
| Stamina lives inside Exploring | **Fixed.** `⚡ n/20` in the header, on every screen in the system. The cap is `System.PetExploreEnergyMax`; the capture's `50/50` is a Pass perk (`…MaxBP`) and copying it would import monetisation as a base rule. |
| No action-available badges anywhere | **Fixed.** A red `!` on every destination from one predicate each — the same missing predicate the Fellow roster wanted (R4) and the Companions roster lacked (audit D6). |
| No scene, no buildings, no art | **Partly fixed, and this is the one departure.** The plates, their percentage placement, the badges and the accessible list fallback are all here; the **painting is not**. Everkai has one scene painting (Drakenberg town) and no familiar-scene art — `Pet.BGPic` and `PetTower.UIBG` name six backgrounds nobody has extracted. Putting the town painting behind familiar plates would be a lie about the place, so the plates sit on a painted ground and the extraction is its own job. |
| No scene pickup | **Dropped for now.** It is a faucet (`RewardPetPacifyDaliy`), so it is an owner decision, not a free port — and it is the third instance of the capture programme's tap-target trap. |
| `Companions` on the roster header, `Familiars` in five other places | **Fixed.** `Familiar` for the system, `Familiar Growth` for the roster. One name, everywhere. |
