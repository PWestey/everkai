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

### hero_60 has no price
Kamakura ships with art and an extraction record but is absent from the public roster snapshot, so
`summonCost` returns null and the Recruit counter refuses it. 257 of 259 are buyable. Needs either a
recorded rarity or an explicit removal.

### Faucets that cannot be deleted yet
`docs/faucet-map.md` has the full classification. Each of these is the only source of its resource,
so deleting it strands content — a source must be built first:
`refillInnStamina`, `stageSupply`, `claimStaffingMaterials`, `claimConsumable`, `stellaSupply`,
`specialBlessingSupply`, `claimOriginalSupplies`.

### Six importers cannot run: broken base path
`import-elixirs.py`, `import-fountain.py`, `import-museum.py`, `import-tonic.py` and
`import-treasure-hunt.py` resolve their source as `app.parents[1]/'outputs/...'`, which is two levels
above the repo and lands on `/Users/outputs/...`. They fail immediately with `FileNotFoundError`.
`import-businesses.py` had the same fault and was pointed at the verified absolute path when the
building costs were added.

This matters beyond convenience: the standing rule is to re-run `scripts/apply-content-overrides.py`
after any importer, and an importer nobody can run is one whose output cannot be regenerated or
checked against its source. Four importers already use absolute `/Users/westmanfamily/Documents/Codex`
paths and work.

**Fix:** point the five at their real sources, verified by the `localSha256` each already records, so
a wrong file fails loudly instead of silently.

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
