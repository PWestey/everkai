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

### Hiring is free, and that is a specified contract — not an oversight
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

## Process notes worth keeping

- **Measure, do not infer.** Six CSS diagnoses failed from reading source; one browser probe of the
  matched rules settled it immediately.
- **Check the built artifact.** The source scan looked clean twice while a free-character button was
  still shipping. `grep` over `dist/` found it.
- **Green gates do not mean a working screen.** tsc and the full suite passed while the list view was
  unreadable, twice. Anything visual needs eyes before it is called done.
