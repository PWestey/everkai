# `auraProgress`: what it is, and why the group auras are still blocked

**Correction first.** `docs/resonance-measurement.md` and catalogue F6/F8 have said since 2026-09-25
that "`auraProgress` appears in no config table". **That claim was wrong, and wrong for an
embarrassing reason: the search was case-sensitive.** The config set carries
`System.json` → `{"_id":"AuraProgress","numberValue":1}`, and there is a whole `Aura.json` table that
had never been opened. Rule 2 says prove the search can find something you know is present; it does not
say prove it for one spelling.

## What was found

**1. `auraProgress` is real, per-hero, and server-computed.** Three occurrences in the readable client:

| where | what |
| --- | --- |
| `UnderlingManager.lua:844` | `if response.auraProgress then data.auraProgress = response.auraProgress` — set from the response to **`ReqUpgradeSkill`**, i.e. it moves when a hero's skill is upgraded |
| `UnderlingManager.lua:2165` | `if not skillData and config.unlockReq <= heroData.auraProgress` inside `CheckHeroAuraRed` — it gates **acquiring** a `HeroBondBonus` aura |

The client never displays it and never computes it. `System.AuraProgress = 1` is the only number
attached to it, and the task string `TaskName:description:HeroHalo` reads *"Upgrade Fellows' aura
skills {count} times"*.

**So the shape is now known — it counts skill upgrades on that hero — but the derivation is still the
server's.** That is a far stronger footing than the reading that failed on 2026-09-25 (`unlockReq` as a
star threshold, which moved a fixture 1.85x), but it is still an inference, not a transcription.

**2. `Aura.json` is a separate system, and it is ORPHANED in this build.** Six rows with `levelLimit`
50/50/30/30/30/10, `auraLimit`, `proportion` and a per-level `upgradeCost` — the per-Fellow aura level
`UnderlingManager:UpgradeAura` raises. It is reached through `heroConf.auraSkill`, and:

```
Hero.auraSkill present on 0 of 181 heroes
```

Nothing references it. Building it would mean inventing which Fellows get which aura, so it is not a
parity gap that can be closed from this config set — it is a system this version does not ship.

## Where that leaves the two blocked rows

| row | blocker | still blocked? |
| --- | --- | --- |
| F6 / F8 group auras | the `auraProgress` gate | **yes, but by a LOCAL choice now, not by ignorance** |
| F6 "aura skills upgrade" | `Aura.json` has no recipients | **yes, and unfixably** — no hero references it |

The group auras could now be built on a marked-local gate: *auraProgress = the number of skill upgrades
bought on that Fellow, +1 each, per `System.AuraProgress`*. Everything about that sentence except the
"+1 each" is measured. It is the owner's call, because it prices a power system on an inference, and the
last time a `HeroBondBonus` gate was inferred it cost a 1.85x fixture jump.
