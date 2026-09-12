# Backlog

Known-incomplete work, kept here rather than buried in commit messages.

**The rule:** 90% is enough for cosmetics and content depth — ship it, label it, move on. Save
integrity, economy rules and anything that can lose progress get 100%, because a save that loads 90%
of the time is not 90% done, and an economy that is 90% sealed still hands the roster out for free.

## Cosmetic — ship at 90%

### Town List view clips the longest notes
`app/globals.css`, `.town-list button`. The row sits at 44px whatever its children need, so 5 of 18
notes are cut (Businesses, School, Village stories, Mine Clearance, Northern Odyssey). Names and
badges are fine.

Six diagnoses were wrong before the live cascade was measured: it is **not** `h-8` winning, not the
`min-height` floor, not a specificity problem and not a `@layer` conflict — `height:auto` is
unlayered and does win. Removing the floor and stacking the note both made it worse.

**Fix:** stop reusing the shadcn `Button` for these rows; render them as plain elements so there is
no fixed-height component behaviour to fight. Do not attempt another CSS override.

**Not lost meanwhile:** every facility header shows its full status and note, and each town plate's
`aria-label` carries the complete text.

### No onboarding
There is no tutorial anywhere in the codebase — only the "START YOUR STORY" strip and the opening
quest chain, which predates Recruit, the forge and stars. Deliberately deferred: a scripted tutorial
teaches a game whose systems are still moving, so it would be rewritten repeatedly.
`docs/playtest-guide.md` is the cheap substitute. Build the real thing once systems settle, informed
by wherever play actually gets stuck.

### Offline bundle could be smaller
Precache is 107.2 MB after streaming the 509 idle clips (was 613.6 MB). Streaming
`assets/humanized` (41 MB), `assets/wardrobe` (40 MB) and `assets/family-gallery` (10 MB) as well
would bring it to roughly 16 MB, at the cost of those images needing a connection on first view.
Offered and declined 2026-09-12 as unnecessary; revisit if install problems recur.
Rule lives in `scripts/offline-manifest.mjs`, enforced by `tests/offline-manifest.test.mjs`.

## Economy — these are 100% items

### Familiars are still free
`app/familiar-panel.tsx` — "Welcome all familiars · Free" and "Welcome {pet.name} · Free" hand over
familiars at no cost, the same hole that was closed for characters in `54ced87` and `0cc109a`.
Left alone deliberately rather than swept into a fix about characters: the parity audit lists
familiar acquisition as missing entirely, so this needs a designed source, not just a removed button.

### Hiring is free — measured 2026-09-12, and smaller than twice claimed
**User-reported twice** ("hiring workers is still free", "free building upgrades is still in the game").
Confirmed live on the deployed site, which is current: all commits ship, and the building panel renders
"Hire 1 · Free".

What the measurement changed:

- **The fix is a gate, not new machinery.** `staffingAction` refuses every paid action with one line —
  `if(!originalProgression(s))return fail('Choose APK growth in Fellow Training Rules first.')` — while
  `staffPrice` is already verified correct against the original (worker #2,000 = 408,406,219, matching
  the live client's "408.4M"). `addStaff` already takes a `free` flag and `recordStaff` already journals
  paid cost.
- **One assumption of mine was wrong.** The contract test's "never grants quality income" clause reads as
  though free hiring silently raises quality. Measured: hiring 800 free workers left quality at 1 and
  bonus at 0, because `coverage(n)` is `ceil(n/1000)`. The quality jump only bites past 1,000 staff.
- **The cap must stay at 5,000 for now.** The original caps staff by `BuildingQuality.levelLimit`
  (1,000 at quality 1 → 26,000 at 26), and `staffingRule` already returns those. Coupling capacity to
  quality is the faithful design, but quality is blocked behind the blueprint shop (§6 item 5), so
  coupling now would strand play at 1,000 workers with no way to lift it — worse than today. Keeping a
  flat 5,000 while charging original prices is a deliberate mismatch, recorded rather than buried.
- **Blast radius is 20 fixtures + 2 contracts**, not 27 unknowns. Of 22 test call sites, 20 use
  `hireEmployees` to stock a business before measuring something else and need funding or direct
  seeding (the `gear-fixtures.mjs` precedent). Only `businesses.test.mjs` and `staffing.test.mjs:14`
  assert free-ness as behaviour, and those get rewritten to assert pricing.
- **The curve is why income had to come first:** 247 gold for 10 workers, 35,594 for 50, 3.37M for 200,
  then 1.23bn at 800 and 17.9tn at 5,000. A starting village earns ~2/s, so everything past ~200 staff
  is unreachable until the bonus web compounds.

### The original entry, kept for the reasoning it records
`lib/businesses.mjs` `hireEmployees` grants staff free up to 5,000 while `paidStaffHire` charges the
original's own prices for the same workers. Repricing it is a **design change, not a bug fix**:
`tests/staffing.test.mjs:14` is titled "free and Hire Card coverage never charges, reduces cap or
grants quality income" and asserts that behaviour deliberately. The blast radius is 27 references
across six test files plus three call sites in `app/` (`business-panel.tsx`, `inn-business-scene.tsx`,
`opening-panel.tsx`).

It also cannot simply be repriced in place: most of those references use `hireEmployees` as a
*fixture* to stock employees before measuring something else, and at the original's prices 5,000
workers costs trillions — `funded()`'s whole-ladder default is ~94bn, and `staffPrice` returns
`Infinity` past the safe-integer range. So the fix follows the `gear-fixtures.mjs` precedent: seed
employees directly in tests that are about what a business *does*, and let the priced path keep its
own coverage.

**Fix:** delete the free grant, make the priced ladder the default, and convert fixture call sites to
direct seeding. Verified prerequisite: the priced curve is already correct — worker #2,000 computes
to 408,406,219 against the live client UI's 408.4M.

### Quality/`yieldRise` is unreachable outside APK-growth mode
`enterpriseBreakdown`'s `qualityBonus` reads `staffingStatus(id,b)?.bonus`, which requires
`b.apkStaffing`, which requires `originalProgression(s)`. In the default save it is therefore always
0, so buildings have no quality ladder at all and the "Earnings Rate 3000%" multiplier the original
shows has no Everkai equivalent. The data is already present and correct in
`lib/staffing-data.json` (caps 1,000→26,000, `yieldRise` 0/10000/30000/…/290000, byte-identical to
the original's `BuildingQuality` rows) — only the gate is wrong. See `docs/slice-buildings.md`.

**But it is not the big lever, and that was measured rather than guessed.** Decomposing the original
Inn's live +20,638% bonus: appoint skills **51.1%**, family skills **30.4%**, quality `yieldRise`
only **14.1%**, everything else 4.4%. So the ranked building work is (1) appoint-skill coverage —
Everkai models 4 fellows of 154 against the original's 180 of 181, capping the term at +30% versus
+10,550%; (2) family skills feeding building yield; and only then quality.

**Correction (2026-09-12):** this entry previously said Everkai lacks the `country` dimension that
94% of appoint skills target. That was wrong — Everkai's `type` **is** country, mapping 1:1 across
all 15 typed buildings (1 Inspiring, 2 Diligent, 3 Brave, 4 Informed, 5 Unfettered). The model can
already express 98% of the original's appoint targeting. What is actually missing is coverage —
150 of 154 fellows have no rows — plus `type` on Building_1601 (Airship → Inspiring) and
Building_1701 (Magic Academy → Diligent). And `operation-data.json` has no producing importer while
every Everkai fellow id maps onto an original hero id that has `operationSkill`, so this is an
import job, not an authoring one.

### Potion effects are decorative — nothing reads them
`lib/apothecary.mjs` ships 10 potions whose effects exist only as prose:
`skillText: "Inspiring Fellow Power +0.5% (+0.5%)"`. There is **no structured effect field on any of
the 10**, and a repo-wide search finds **no consumer of `skillText` at all** — not in `lib/`, not in
`app/`. So selling potions advertises Fellow Power bonuses that are never applied to anything.

Found 2026-09-12 while mapping the building bonus web: the original's Apothecary contributes a
city-yield bonus per completed medicine whose skill targets all/country, and Everkai cannot wire that
strand until potions have real effects. Note the two are different effect *kinds* — Everkai's text
describes Fellow Power, the original's medicine term targets building yield — so this needs a
decision about which the potions are, not just a parser.

**Why it is here and not in the slice doc:** the buildings slice only noticed it. The defect is that
a shipped, sellable system makes a numeric promise it never keeps, which stands on its own.

### hero_60 has no price
Kamakura ships with art and an extraction record but is absent from the public roster snapshot, so
`summonCost` returns null and the Recruit counter refuses it. 257 of 259 are buyable. Needs either a
recorded rarity or an explicit removal.

### Faucets that cannot be deleted yet
`docs/faucet-map.md` has the full classification. Each of these is the only source of its resource,
so deleting it strands content — a source must be built first:
`refillInnStamina`, `stageSupply`, `claimStaffingMaterials`, `claimConsumable`, `stellaSupply`,
`specialBlessingSupply`, `claimOriginalSupplies`.

### ~50 importers cannot run outside the workspace: broken base path
Corrected 2026-09-12 — this was first logged as "six importers" from a narrow grep; a full index put the
real figure at roughly **50 of 98**, with one root cause.

They resolve their source relative to the repo (`app.parents[1]/'outputs/...'`, i.e.
`parents[1].parent.parent`), which only lands on the research tree when the repo sits *inside* the
workspace. From `/Users/westmanfamily/everkai` it resolves to `/Users/` and they fail immediately with
`FileNotFoundError`. `import-businesses.py` had the same fault and was pointed at a verified absolute
path when the building costs were added; `import-elixirs.py`, `import-fountain.py`, `import-museum.py`,
`import-tonic.py` and `import-treasure-hunt.py` are among the rest.

Related: 28 of 98 `lib/*.json` have no producing importer at all, and five are hand-maintained and merely
*verified* by the script that appears to generate them. See `docs/data-index.md` for the full
cross-reference.

This matters beyond convenience: the standing rule is to re-run `scripts/apply-content-overrides.py`
after any importer, and an importer nobody can run is one whose output cannot be regenerated or
checked against its source. Four importers already use absolute `/Users/westmanfamily/Documents/Codex`
paths and work.

**Fix:** point the five at their real sources, verified by the `localSha256` each already records, so
a wrong file fails loudly instead of silently.

### The roadmap Sheet lags the findings that produced it
The parity catalog and roadmap live at
`docs.google.com/spreadsheets/d/1KG3NpZDSLEGmRNvOGVl_Q7ewE1pERDOpMDeeFaAXz3U` (293 rows, created
2026-09-12). It was generated *before* the last three building findings and is stale on all of them:
appoint skills are 51.1% of the original's multiplier rather than quality; Everkai's `type` already
**is** the original's `country`, so the "missing country dimension" row is wrong; and Airship /
Magic Academy types are no longer unknown.

**No available Drive tool can write cells into an existing file** — `update_file` supports title and
parent only — so the Sheet cannot be patched in place. Updating it means regenerating the CSV and
creating a new Sheet, which sprawls documents. Best done once per slice rather than per finding.
The original `ISEKAI_SLOW_LIFE_SYSTEM_CATALOG.xlsx` is untouched and still accurate: it describes the
original game neutrally and by its own scope carries no status columns.

## Records that drift

### docs/parity-gaps.md is a dated snapshot
Pinned at `e9ef386` and already wrong in places — its §12 Recruit row described the free roster this
cycle replaced, and its Museum count says 32 where the data says 31. It carries a dated status note
now. Treat per-row detail as stale until re-verified against the code, and prefer the live modules.

## Resolved

### Fellows opened on a character, not a roster
Reported as "home and fellows takes you directly to a character instead of a roster screen, so you
have to side swipe to find what you need". Fixed 2026-09-12 for Fellows: the tab now lands on the
roster grid, picking someone opens their screen, and a `‹ Fellows roster` control returns to the grid.

It was promotion, not construction. `RosterPicker` was already complete — search, joined/not-joined
filter, class-icon filter row, rarity and country badges, count line, pagination — but was reachable
only through a "Browse collection" button inside a dialog. `recruit-panel.tsx` already proved it
renders inline outside a dialog, so `RosterLanding` just hosts it and reuses the
`character-collection` class so the existing tile styling applies rather than being duplicated.

**Still to do:** Family and Companions. Family routes through `FamilyPanel` rather than `page.tsx`, so
it needs the same treatment at that layer. Companions are worse off — they are page 2 of the Journey
tab behind a `NativeSelect`, not a tab of their own.

**Companion tiles need no portraits.** All 71 familiars lack `portrait`/`art` entirely and none exists
on disk, so `RosterPicker` now falls back to the original's rarity card ground, and
`lib/ui-sprites.mjs` gained `petCardIcon`/`petFrameIcon`. Career badges are deliberately absent:
`Pet.json`'s `career` is a combat role (1/2/3 with distinct HP/ATK/SPD profiles), not the wiki's
Cool/Cute/Playful, and `familiar-data.json` does not carry it yet.

### "Buildings are still free to open" was a label, not an economy hole
Reported 2026-09-12. `app/village-map.tsx` rendered every tile as `Build · Free` — a hardcoded string
in the `<small>` ternary that **never called `businessCost`** — while `openEnterprise` had been
charging the original's prices correctly since `businessCost` landed. Verified in the running app:
`businessCost('Building_101')` returns 50 and `businessCost('Building_1701')` returns 75,000,000,000.

So the report described a real, visible problem whose cause was the opposite of what it looked like.
Worth keeping for two reasons: a user-facing string can impersonate an economy bug convincingly, and
the fix is in a different layer from where the bug appears to live.

Tiles now read `Build · 50 gold` … `Build · 75,000,000,000 gold`. All 17 mapped tiles have a recorded
price (checked before the change, because `businessCost` returns `null` for unpriced ids and a
`null.toLocaleString()` in the map would have blanked the village).

## Process notes worth keeping

- **Measure, do not infer.** Six CSS diagnoses failed from reading source; one browser probe of the
  matched rules settled it immediately.
- **Check the built artifact.** The source scan looked clean twice while a free-character button was
  still shipping. `grep` over `dist/` found it.
- **Green gates do not mean a working screen.** tsc and the full suite passed while the list view was
  unreadable, twice. Anything visual needs eyes before it is called done.
