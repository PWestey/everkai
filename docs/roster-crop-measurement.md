# The original ships its own roster crops. Everkai has been guessing them.

**Measurement only.** Nothing was imported or rewired from this. It exists because the art review on
2026-09-27 found ~15 costume tiles that read badly, and the cause turned out not to be the tiles.

## What the review found

`scripts/audit-character-art.mjs` says every one of Everkai's 303 character views has art, and 213 of
them also have a measured bound feeding `rosterArtPlacement()`. On a contact sheet the Fellow and
Family tiles read well and about fifteen costume tiles do not — the character sits small inside a wide
painted scene.

The bounds for those tiles are not wrong. They are measuring the wrong thing, which is rule 6 in a new
costume:

| roster | plates with measured bounds | median ink area | bounds covering ≥80% of **both** axes |
| --- | --- | --- | --- |
| family | 106 | 0.478 | 3 (3%) |
| fellow | 37 | 0.681 | 15 (41%) |
| costume | 70 | 0.729 | **27 (39%)** |

Family plates are cut-out figures on a flat surround, so "where the ink is" and "where the character
is" are the same box and the tiles look right. Costume plates are full painted scenes — background
included — so the ink extent *is* the plate, `rosterArtPlacement` scales the whole painting to fit the
card, and the character ends up small. The measurement is accurate and useless; the near-constant
full-plate answer across 39% of costumes is the tell.

## What the original does instead: it does not frame anything

The original never computes a crop. It ships five of them per character, and the config names each one.

`Hero.json`, 181 rows:

| column | value pattern | present |
| --- | --- | --- |
| `head` | `ListItem_Half_Hero_N` | 180 |
| `smallHead` | `Circle_Head_Hero_N` | 181 |
| `squareHead` | `Head_Hero_N` | 180 |
| `wideHead` | `Half_Hero_N` | 180 |
| `btnHead` | `Btn_Head_Hero_N` | 180 |
| `image` | `Hero_N` | 180 |

`Wife.json` (151 rows) carries `head` = `Circle_Head_Wife_N`, `avatarHalf` = `ListItem_Half_Wife_N`,
`avatarHalf2` = `Half_Wife_N`, all 151/151. **Costumes carry the same five columns**, keyed on exactly
the ids Everkai already uses: `HeroClothes` 178/178 (`_id` `H101C1` → `Half_Hero_101C1`) and
`WifeClothes` 111/111 (`W51C1` → `Half_Wife_51C1`).

Everkai imported only the last of these — `image` / the cutscene plate — and then built
`lib/art-framing.mjs`, `scripts/measure-art-bounds.*` and a 440-row bounds table to recover by
measurement what the original hands over by name.

## Where the pixels are

Parsing all 185 FairyGUI descriptors in `UnityDataAssetPack.apk` (`fgui.py` in the session scratchpad;
the v6 header is **not** fixed-length — `id` and `name` are length-prefixed, so the index table sits at
44, 45 or 57 depending on the package, and the byte after the segment count says whether block offsets
are shorts. `scripts/import-familiar-portraits.py` hardcodes 44 and 4-byte offsets, which is right for
`Pet_fui` and wrong for `Hero_fui`).

**1,200 character crops** across ten packages:

| sprite | size | count | packages |
| --- | --- | --- | --- |
| `Half_Hero_*` | 500×400 (all 265 in `Hero`) | 353 | Hero, Hero_EN, DemonSlayer_EN, Konosuba_EN, LycoReco_EN |
| `Half_Wife_*` | 500×400 (all 211 in `AvataStaticMid`) | 242 | AvataStaticMid, AvataStaticMid_EN, Base, + crossovers |
| `Head_Hero_*` | 128×128 | 359 | AvatorStaticHead, AvatorStaticHead_EN, + crossovers |
| `Head_Wife_*` | 128×128 | 246 | AvatorStaticHead, AvatorStaticHead_EN, + crossovers |

`ListItem_Half_*`, `Circle_Head_*` and `Square_Head_*` are **type-3 components, not images** — 265, 265
and 264 of them with zero sprite rects. They compose the raw `Half_*` / `Head_*` image with a frame or
a circular mask, so the pixels to extract are `Half_*` and `Head_*`, and the frame is CSS.

## Coverage against Everkai's own roster

| | half-body | square head |
| --- | --- | --- |
| fellow | 106 / 111 | 106 / 111 |
| family | 101 / 107 | 101 / 107 |
| costume | 78 / 85 | 78 / 85 |
| **total** | **285 / 303 (94%)** | **285 / 303** |

The eighteen misses are the same set in both, and they are the starter characters — `hero_1/3/4`,
`wife_1..5`, their costumes, plus `hero_180`, `hero_183`, `wife_168` and `H251C1`. Everything the game
needs at first launch is a fair candidate for `UnityStreamingAssetsPack.apk`, the second APK, which
this scan did not read. **That is a hypothesis, not a finding** — it has not been checked, and until it
is, any import has to keep the measured-bounds path alive as the fallback for those eighteen.

## Correction: the original's list row is NOT a wide row

This document first read "`Half_*` is 500x400 landscape, so the original's list row must be wide, and
our 206:280 portrait card is an Everkai invention." **That was an inference from the image size and it
is wrong.** A FairyGUI package item carries its own `width`/`height` right after its `file` field, and
the components measure:

| component | size | count |
| --- | --- | --- |
| `ListItem_Half_Hero_*` | **206 x 291** | 265 |
| `LabelShop_Half_Hero_*` | 206 x 291 | 261 |
| `ListItem_Half_Wife_*` | **224 x 319** | 212 |

The original's list item is a **portrait card at essentially the aspect Everkai already draws**
(206:291 vs 206:280). It shows the 500x400 half-body cropped to that card. So "follow the game" does
not mean rebuilding the roster as wide rows; it means **keeping the card and changing what is in it**,
which is what shipped.

## Correction: the eighteen misses were not in the second APK

The first pass hypothesised the missing starter crops were in `UnityStreamingAssetsPack.apk`. Checked:
that APK holds **zero** FairyGUI descriptor bundles. The hypothesis is dead.

The real cause was rule 4 -- a sprite name built from a pattern instead of read from the config.
`Hero.json` row 1's `wideHead` is **`Half_Hero_01`**, zero-padded, not `Half_Hero_1`, which is exactly
why the misses were the single-digit ids: the starter characters and their costumes. Offering both
spellings took coverage from 285 to **299 of 303**.

The four that remain are genuinely in neither APK: `H251C1`, `hero_180`, `hero_183`, `wife_168`. They
keep the measured-bounds path, which is why `lib/art-framing.mjs` and `lib/art-bounds-data.json` are
not deleted.

## What shipped

`scripts/import-roster-crops.py` cuts the 299 crops to `public/assets/roster/` (9.83 MB, inside the
120 MB precache budget at ~97 MB total), `lib/roster-crop.mjs` places them, and `app/roster-picker.tsx`
prefers them over the plate.

Placement needs no heuristic, and this is the part that actually fixes the costume tiles: the
half-body renders **carry a real alpha channel**, so the importer records each figure's exact bounding
box (297 of 299; two are fully opaque). The card covers on height and the horizontal slice is centred
on that box. Compare with what it replaced -- a plate-difference estimate against a flat surround,
which on a full-scene costume plate returned the whole plate.

**Still not measured:** the original's component holds its own display list, which this project does
not parse, so how *it* places the 500x400 inside 206x291 is unknown. Cover-on-height is this project's
choice, not a transcription.
