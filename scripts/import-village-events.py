#!/usr/bin/env python3
"""Build lib/village-event-data.json from the original's five City*Event tables.

Sources (read-only):
  <CONFIGS>/CityDailyEvent.json           20 rows  the daily village encounters
  <CONFIGS>/CitySpecialEvent.json         13 rows  the special-incident pool (type 1/2/3)
  <CONFIGS>/CitySpecialEvent01.json        6 rows  the multiple-choice incidents
  <CONFIGS>/CitySpecialEventManage.json   10 rows  the earnings-goal chain (+ a Gina chain)
  <CONFIGS>/CityAssignEvent.json          32 rows  the condition-gated one-off encounters
  <CONFIGS>/split_reward/*.json                    every referenced reward id

English text comes from the APK's translation TextAsset, whose SHA-256 this script asserts.
That asset is a plain, unencrypted UnityFS bundle; see docs/event-catalog.md section 1 and
scripts/read-unityfs-textasset.py, which extracts it without UnityPy and checks the same hash.

Usage:
  python3 scripts/import-village-events.py --configs <dir> --translate <translate.json>
"""
from __future__ import annotations

import argparse
import collections
import glob
import hashlib
import json
import os
import sys

TRANSLATE_SHA256 = "c884ee22dfd491ce0c700109f955465b34ef518f6e73d4132993e9d01f4d35bc"
TRANSLATE_RECORDS = 239580

TABLES = [
    "CityDailyEvent.json",
    "CitySpecialEvent.json",
    "CitySpecialEvent01.json",
    "CitySpecialEventManage.json",
    "CityAssignEvent.json",
]

# Everkai's own item ids. An original id that Everkai has no equivalent for is recorded with
# mapped:false and pays NOTHING -- never a substitute this importer invented. lib/village-events.mjs
# asserts that every mapped id is a real Everkai inventory key.
EVERKAI_ITEMS_HINT = "lib/adventure.mjs EXTRA_ITEMS + lib/catalog.mjs GIFTS"


def load_table(configs: str, name: str):
    path = os.path.join(configs, name)
    with open(path, "rb") as f:
        raw = f.read()
    doc = json.loads(raw.decode("utf-8"))
    # Rule 3: check the top level before counting. These five all wrap one list under a key
    # matching the filename; split_reward files are bare lists.
    if isinstance(doc, dict):
        keys = list(doc)
        if len(keys) != 1 or not isinstance(doc[keys[0]], list):
            sys.exit(f"{name}: unexpected wrapper shape {keys}")
        rows = doc[keys[0]]
    elif isinstance(doc, list):
        rows = doc
    else:
        sys.exit(f"{name}: unexpected top level {type(doc).__name__}")
    return rows, hashlib.sha256(raw).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--configs", required=True)
    ap.add_argument("--translate", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "lib",
                                                  "village-event-data.json"))
    args = ap.parse_args()

    with open(args.translate, "rb") as f:
        traw = f.read()
    tsha = hashlib.sha256(traw).hexdigest()
    if tsha != TRANSLATE_SHA256:
        sys.exit(f"translate SHA-256 {tsha} != expected {TRANSLATE_SHA256}; stopping")
    trecs = json.loads(traw.decode("utf-8"))["translate"]
    if len(trecs) != TRANSLATE_RECORDS:
        sys.exit(f"translate record count {len(trecs)} != expected {TRANSLATE_RECORDS}")
    text = {r["id"]: r.get("en") for r in trecs}
    # Positive control (CLAUDE.md rule 2): prove the lookup finds things known to be present
    # before any "missing" is reported below.
    for probe in ("Dialog:context:CityDailyEvent02_1", "CitySpecialEvent01:desc:CSE01_1",
                  "Dialog:context:earningsGoal1-1"):
        if not text.get(probe):
            sys.exit(f"positive control failed: {probe} not found in the translation")

    tables, shas = {}, {}
    for name in TABLES:
        rows, sha = load_table(args.configs, name)
        tables[name[:-5]] = rows
        shas[name] = {"sha256": sha, "rows": len(rows)}

    # ---- rewards -------------------------------------------------------------------
    want = set()
    for rows in tables.values():
        for r in rows:
            for k in ("reward", "reward1", "reward2", "beforereward", "afterreward"):
                if r.get(k):
                    want.add(r[k])
    index, reward_files = {}, {}
    for path in sorted(glob.glob(os.path.join(args.configs, "split_reward", "*.json"))):
        with open(path, "rb") as f:
            raw = f.read()
        doc = json.loads(raw.decode("utf-8"))
        rows = doc if isinstance(doc, list) else doc[list(doc)[0]]
        for row in rows:
            if isinstance(row, dict) and "_id" in row and row["_id"] not in index:
                index[row["_id"]] = (os.path.basename(path), raw, row)
    if "Reward_CityDailyEvent_1" not in index:
        sys.exit("positive control failed: the split_reward index is broken, not empty")
    missing = sorted(i for i in want if i not in index)
    if missing:
        sys.exit(f"unresolved reward ids: {missing}")

    rewards = {}
    for rid in sorted(want):
        fname, raw, row = index[rid]
        reward_files[f"split_reward/{fname}"] = hashlib.sha256(raw).hexdigest()
        if row.get("randomType") != "Fix":
            sys.exit(f"{rid}: randomType {row.get('randomType')!r} is not the Fix shape this "
                     f"importer measured")
        rewards[rid] = [{"id": c["id"], "count": c["count"]} for c in row.get("content", [])
                        if c.get("type") == "Item"]
        dropped = [c for c in row.get("content", []) if c.get("type") != "Item"]
        if dropped:
            sys.exit(f"{rid}: non-Item reward content {dropped}")

    # ---- dialog --------------------------------------------------------------------
    dialog_ids = []
    for rows in tables.values():
        for r in rows:
            for k in ("dialog", "beforeDialog", "afterDialog"):
                dialog_ids.extend(r.get(k) or [])
    dialog, speakers, missing_dialog = {}, {}, []
    for did in dialog_ids:
        line = text.get(f"Dialog:context:{did}")
        if line is None:
            missing_dialog.append(did)
            continue
        dialog[did] = line
        who = text.get(f"Dialog:overrideName:{did}")
        if who:
            speakers[did] = who

    def ev_text(ns, field, _id):
        return text.get(f"{ns}:{field}:{_id}")

    # ---- daily -----------------------------------------------------------------------
    daily = [{
        "id": r["_id"],
        "weight": r["weight"],
        "npc": r["eventNPC"],
        "building": r["building"],
        "dialog": list(r["dialog"]),
        "reward": r["reward"],
    } for r in tables["CityDailyEvent"]]

    # ---- multiple-choice incidents ----------------------------------------------------
    pool = {r["_id"]: r for r in tables["CitySpecialEvent"]}
    choices = []
    for r in tables["CitySpecialEvent01"]:
        sid = r["_id"]
        head = pool.get(sid)
        if head is None or head.get("type") != 1:
            sys.exit(f"{sid}: no type-1 CitySpecialEvent row heads this incident")
        choices.append({
            "id": sid,
            "weight": head["weight"],
            "npc": head["eventNPC"],
            "building": head["building"],
            "correctOption": r["correctOption"],
            "prompt": ev_text("CitySpecialEvent01", "desc", sid),
            "option1": ev_text("CitySpecialEvent01", "optionTxt1", sid),
            "option2": ev_text("CitySpecialEvent01", "optionTxt2", sid),
            "goodText": ev_text("CitySpecialEvent01", "correctOptiontxt", sid),
            "badText": ev_text("CitySpecialEvent01", "wrongOptionTxt", sid),
            "dialog": list(r["dialog"]),
            "reward1": r["reward1"],
            "reward2": r["reward2"],
        })

    # ---- the earnings-goal chain -------------------------------------------------------
    manage = []
    for r in tables["CitySpecialEventManage"]:
        manage.append({
            "id": r["_id"],
            "npc": r["eventNPC"],
            "building": r["building"],
            "object": r.get("object"),
            "unLock": r.get("unLock"),
            "role": r.get("role"),
            "delayTime": r.get("delayTime"),
            "desc": ev_text("CitySpecialEventManage", "desc", r["_id"]),
            "beforeDialog": list(r.get("beforeDialog") or []),
            "beforeReward": r.get("beforereward"),
            "afterDialog": list(r.get("afterDialog") or []),
            "afterReward": r.get("afterreward"),
            "beforeEventId": r.get("beforeEventId"),
            "afterEventId": r.get("afterEventId"),
        })

    # ---- CityAssignEvent -----------------------------------------------------------------
    # Six of these 32 rows already ship as OPENING.cityEncounters (lib/opening-data.json), which
    # lib/opening.mjs pays through openingRecruit / openingFamily. They are recorded here by id so
    # nothing double-pays, and their rows are NOT duplicated into this file.
    opening_owned = ["B2", "B4", "A2", "B5", "B3", "C1"]
    assign = [{
        "id": r["_id"],
        "condition": r.get("condition"),
        "npc": r["eventNPC"],
        "dialog": list(r.get("dialog") or []),
        "reward": r.get("reward"),
    } for r in tables["CityAssignEvent"] if r["_id"] not in opening_owned]

    out = {
        "version": 1,
        "daily": daily,
        "choices": choices,
        "manage": manage,
        "assign": assign,
        "openingOwnedAssign": opening_owned,
        "rewards": rewards,
        "dialog": dialog,
        "speakers": speakers,
        "system": {
            "CityDailyEventTime": [10, 14, 20],
            "CityDailyEventLimit": 3,
            "CitySpecialEventRefreshTime": 43200,
            "CitySpecialEventLowWeight": 4,
            "CitySpecialEventNewPlayerRefreshOder": [
                "CSE01_1", "CSE02_2", "CSE01_2", "CSE01_3",
                "CSE02_1", "CSE01_4", "CSE01_5", "CSE01_6"],
        },
        "provenance": {
            "tables": shas,
            "rewardFiles": reward_files,
            "translateSha256": TRANSLATE_SHA256,
            "translateRecords": TRANSLATE_RECORDS,
            "translateEntry": ("UnityDataAssetPack.apk!assets/Android/config/logic/en/"
                               "translate_v1_c9fd6a1e92f261ca0fa68d0f79049483.mmc"),
            "dialogIdsReferenced": len(set(dialog_ids)),
            "dialogIdsResolved": len(dialog),
            "dialogIdsMissing": sorted(set(missing_dialog)),
            "itemNamespace": EVERKAI_ITEMS_HINT,
            "note": ("Text is the original's; every number is the original's. "
                     "CitySpecialEvent type 2 (CSE02, monster raid) and type 3 (CSE03, weight 0 "
                     "in this build) are measured but not imported here."),
        },
    }
    path = os.path.abspath(args.out)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
        f.write("\n")
    print(f"wrote {path}")
    print(f"  daily={len(daily)} choices={len(choices)} manage={len(manage)} assign={len(assign)}")
    print(f"  rewards={len(rewards)} dialog resolved={len(dialog)}/{len(set(dialog_ids))} "
          f"missing={sorted(set(missing_dialog))}")
    items = collections.Counter(c["id"] for r in rewards.values() for c in r)
    print(f"  distinct reward items={len(items)}")


if __name__ == "__main__":
    main()
