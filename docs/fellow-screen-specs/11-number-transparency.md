# 11 · Number transparency — Power Details, Bond Detail, Aptitude breakdown

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/power-details-1.png`, `img/power-details-2.png`, `img/bond-detail.png`,
`img/aptitude-breakdown.png`

**This spec deletes more Everkai prose than any other, and needs almost no new game
data.** Everkai already computes most of these terms; it just scatters them into
footnotes and parentheses instead of collecting them into one dialog.

## The pattern

Every aggregate number in the original has an `(i)` beside it. Tapping it opens a
**centred dialog** listing the number's sources in a **two-column, label+value** layout
with **banded section headers**. No sentences. No units spelled out. No "this is
calculated by…".

## Power Details

Opened from the `(i)` beside Power on the Cultivate stat block. Two bottom tabs:
`Bond Detail` | `Power Details`.

```
 ┌               Shinobu Kocho                ✕ ┐
 │ A member of the Demon Slayer Corps' highest- │  character blurb, 3 lines
 │ ranking swordsmen, the Hashira. …            │
 │ ┌──────── Power 2,665,126,452 ────────────┐  │  banded header, value green
 │ │ Base +130.6M (Determined by Aptitude)   │  │  green, the one explanatory phrase
 │ │ ┌ Power Percentage Bonus ┐               │  │  band
 │ │ Stars+30%          Family+261.5%         │  │  two columns
 │ │ Artifacts+170%     Skill+0%              │
 │ │ Apothecary+0%      Fish+0%               │
 │ │ Expo+0%            Museum+0%             │
 │ │ Familiar+0%        Compendium+0%         │
 │ │ Figure+0%          Building Appearance+0%│
 │ │ Origin Boost+40%                         │
 │ │ ┌ Fixed Power Bonus ┐                    │  band
 │ │ Stars+0            Family+3.051M         │
 │ │ Item+0             Roaming Encounter+0   │
 │ │ Negotiation+0      Stella+223.5M         │
 │ │ Apothecary+0       Fish+0                │
 │ │ Familiar+0         Expo+0                │
 │ │ Museum+0           Building Appearance+0 │
 │ │ Skill+0            Building Service Lv.+0│
 │ │ ┌ Final Power Bonus (%) ┐                │  band
 │ │ Familiar+0%                              │
 │ └──────────────────────────────────────────┘ │
 │ ┌──────── Aptitude 12,565 ────────────────┐  │  second aggregate, same treatment
 │ │ Base+240           Skill+7155            │
 │ │ Limit Break+50     Artifacts+781         │
 │ │ Family+365         Costume+0             │
 │ │ Stella+2050        Apothecary+0          │
 │ │ Fish+0             Expo+0                │
 │ │ Museum+0           Familiar+0            │
 │ │ Compendium+0       Resonance Aptitude+56 │
 │ └──────────────────────────────────────────┘ │
 │              [Bond Detail] [Power Details]   │
 └──────────────────────────────────────────────┘
```

Three things to copy exactly:

1. **The three bonus *stages* are named and separated**: `Power Percentage Bonus`,
   `Fixed Power Bonus`, `Final Power Bonus (%)`. That is the multiplication order made
   visible. A player who wants to know whether artifacts multiply before or after Stella
   can read it off the section order — no formula, no documentation.
2. **Zero sources are still listed.** `Fish+0`, `Museum+0`, `Expo+0` all render. The list
   doubles as a *catalogue of what could contribute*, which is how a player learns the
   game's shape. Do not filter zeros out.
3. **`Base +130.6M (Determined by Aptitude)`** is the only explanatory phrase in the whole
   dialog, and it exists because the relationship between two different aggregates is the
   one thing a list cannot show.

Both `Power` and `Aptitude` get the full treatment in the same dialog, so the fellow's two
headline numbers are auditable in one place.

## The Aptitude breakdown (from the Aptitude section)

The same content, reachable independently from the `(i)` beside `Total Aptitude` in the
Aptitude section (`img/aptitude-breakdown.png`), titled `Detail`:

```
 ┌  ◇  Detail  ◇  ┐
 │ Total Aptitude 12565     │  green
 │ Skill+7445    Artifacts+781
 │ Family+365    Costume+0
 │ Stella+2050   Fish+0
 │ Expo+0        Museum+0
 │ Compendium+0  Resonance Aptitude+56
 │ Resonance Skill Aptitude+0   Rarity Advance+1000
 │ Origin Boost+1220
 │ ─────────────────────────   ← rule separating flat from percent
 │ Familiar+0%   Skill+5%
 │ Origin Boost+5%
 └──────────────────────────┘
```

Note the **hairline rule** dividing the flat `+N` sources from the `+N%` ones. Same idea
as the named stages in Power Details, done with a rule because there are only two groups.

Also note `Rarity Advance+1000` appears here but not in the Power Details copy of the
aptitude list, and `Skill` differs (7445 vs 7155). Two views of the same aggregate that
disagree — this is a replacement-server artefact, not a design intent. **Do not port the
discrepancy**; compute one number and show it in both places.

## Bond Detail

The other tab, also reachable from the left rail's `Group` pill.

```
 ┌               Shinobu Kocho                ✕ ┐
 │ The Demon-Slayer swordsmen slay demons and   │  group flavour, 2 lines
 │ stand firm to safeguard the lives of humanity.│
 │ ┌──────── Total Bonus ─────────────────────┐ │
 │ │            POW  606.5M                   │ │  on a dark inset bar
 │ └──────────────────────────────────────────┘ │
 │ ┌──────── Demon Slayer Corps ──────────────┐ │  band = the group's name
 │ │              ( portrait )                │ │  member portraits, centred, ringed
 │ │              POW 606.5M                  │ │  each member's own contribution
 │ └──────────────────────────────────────────┘ │
 │ ┌──────── Set Skill ───────────────────────┐ │
 │ │ ◉ Demon Slayer Corps  Level 10/10        │ │  level green
 │ │   Aptitude +2050 (Increased through      │ │  green
 │ │   Fellow Stella)                         │ │
 │ └──────────────────────────────────────────┘ │
 │              [Bond Detail] [Power Details]   │
 └──────────────────────────────────────────────┘
```

- Members render as **circular portraits with their individual contribution on a pill
  beneath**, so a partially-filled group visibly shows the empty seats.
- `Set Skill` uses the same row shape as every other levelled effect on the surface:
  icon, `Name Level n/max`, effect, and here a green parenthetical naming *where the level
  comes from* (`Increased through Fellow Stella`) — a cross-system pointer, which is the
  correct use of a parenthesis.

## Comparison with Everkai

Everkai's equivalents are footnotes and parentheses scattered across pages:

- `From level & Aptitude 3,785 · Fixed 0` (Overview and Stella)
- `Talent skills · +3 Aptitude (skills 3 · intimacy 0 · Stella 0 · Rarity Advance 0)` (Skills)
- `Power 3,785 / Aptitude 13 / Level limit 100` tiles with no sources (Overview)
- `+{member.skill}% village earnings at the starter buildings · {familyBonus}% from all family skills` (family panel)

| # | Difference | Kind |
| --- | --- | --- |
| N1 | Everkai has **no breakdown dialog at all**. Every source list is compressed into a parenthesis on whichever page happened to compute it. | **structural** |
| N2 | Everkai's parenthetical lists are partial — `(skills 3 · intimacy 0 · Stella 0 · Rarity Advance 0)` is 4 sources where the original names 16. Sources Everkai computes but never shows include artifacts, familiars, costumes. | **structural** |
| N3 | Everkai never names the **multiplication stages**, so the stacking order is invisible and has repeatedly been the thing agents guess at (see `docs/data-provenance.md`). The original prints it as three section headers. | **structural** |
| N4 | Everkai filters zero terms out of its parentheses; the original lists them, turning the dialog into a catalogue. | cosmetic but valuable |
| N5 | Everkai splits `Power` and `Aptitude` across different pages; the original audits both in one dialog. | cosmetic |

## What Everkai should render

One reusable **breakdown dialog** component, used by every `(i)` beside an aggregate.

```
<BreakdownDialog title={fellow.name} blurb={fellow.bio}>
  <Aggregate name="Power" value={power}>
    <Note>Base +130.6M (Determined by Aptitude)</Note>
    <Band name="Power Percentage Bonus">  …two-column list of every % source…  </Band>
    <Band name="Fixed Power Bonus">       …two-column list of every flat source… </Band>
    <Band name="Final Power Bonus (%)">   …                                    </Band>
  </Aggregate>
  <Aggregate name="Aptitude" value={aptitude}>
    …two-column list, flat sources, rule, percent sources…
  </Aggregate>
</BreakdownDialog>
```

Rules:
- two columns, label immediately followed by `+value` with **no space and no colon**
- zeros are rendered, never filtered
- values abbreviated (`+3.051M`, `+223.5M`), percentages as `+261.5%`
- band headers are a lighter inset strip, left-aligned
- the aggregate's own value is green in its banded header
- tabs at the foot when a second view exists (`Bond Detail`)

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Power total | `bondedPower(game,id)` | yes |
| Percent sources | stars, family, artifacts, skill, familiar, origin boost, … | **mostly** — Everkai computes these internally; they need surfacing as a named list rather than a sum |
| Fixed sources | family, stella, item/elixir, … | **mostly** — `elixirPower` is already a named term |
| Stage ordering | which stage each source belongs to | **this is the real work.** Everkai's power computation must be refactored to emit `(name, stage, value)` triples instead of a scalar. That refactor is worth doing on its own merits: CLAUDE.md rule 1 exists because ratios were built from mismatched sources, and a named-term breakdown makes that class of error visible. |
| Aptitude sources | 13 flat + 3 percent | **mostly** — 4 are already named in the Skills parenthesis |
| Group members + contributions | bond group | yes (`bond-panel.tsx`) |
| Set Skill level + origin | level, and which system raises it | **partially** |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `From level & Aptitude 3,785 · Fixed 0` (every occurrence) | the `(i)` beside Power |
| `Talent skills · +3 Aptitude (skills 3 · intimacy 0 · Stella 0 · Rarity Advance 0)` | the `(i)` beside Total Aptitude |
| `Power / Aptitude / Level limit` tiles with no provenance | the persistent stat block + `(i)` |
| `Own flat Power +0 · own Power +0% · every Fellow's appointment yield +0% · talent cap +0` | the Stella `Attributes` dialog (spec 04) and this breakdown |
| `Pairings come from The Ascended community wiki snapshot…` and similar provenance notes | keep provenance in `docs/`, not in the UI; the UI shows sources and values |
| Any sentence containing the word "calculated" | a band header naming the stage |
