"""Merge the extra measures staged in pipeline/extra/out/ into the model.

Run from the repo root, after pipeline/fetch_la_indicators.py (which rewrites
model/data/la-indicators.json from scratch and so drops the extras):

    python3 -I pipeline/extra/merge.py            # merge
    python3 -I pipeline/extra/merge.py --check    # say what would change, write nothing

What it does, for each key in KEYS:
- reads out/<key>.json (values) and out/<key>.indicators.yaml (definitions);
- skips the ids in DROPPED (each with the reason it was left out at merge);
- checks every kept measure has a finite value for all 22 authorities and Wales;
- adds each kept measure to model/data/la-indicators.json. An id already there is left alone
  when its year and values are identical. If they differ the merge refuses, unless the id was
  added by an earlier run of this script and --update is given. The 19 measures from
  fetch_la_indicators.py are never overwritten (the one exception is --refresh-earnings);
- appends each kept indicator definition to model/indicators.yaml, and each source a kept
  indicator cites to model/sources.yaml, when its id is not there yet. Entries already in
  those files are never touched, so hand edits survive a rerun. A new source whose url
  matches an existing source under another id is refused.

--refresh-earnings replaces the existing `earnings` values with ASHE 2026 from work.json.
It is off by default: `earnings` feeds the game engine (a goal component with a band), so
refreshing it moves starting scores and needs the balance check rerun, plus the year in the
indicator notes and the nomis_ashe source notes updated by hand.

Standard library plus PyYAML. Nothing is fetched.
"""
import argparse
import json
import math
import os
import sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "out")
LA_JSON = os.path.join(ROOT, "model", "data", "la-indicators.json")
IND_YAML = os.path.join(ROOT, "model", "indicators.yaml")
SRC_YAML = os.path.join(ROOT, "model", "sources.yaml")

KEYS = ["work", "nature", "health", "fairness", "homes", "culture", "climate", "spatial"]
WALES = "W92000004"
LAS = [
    "W06000001", "W06000002", "W06000003", "W06000004", "W06000005", "W06000006",
    "W06000008", "W06000009", "W06000010", "W06000011", "W06000012", "W06000013",
    "W06000014", "W06000015", "W06000016", "W06000018", "W06000019", "W06000020",
    "W06000021", "W06000022", "W06000023", "W06000024",
]

# Staged measures left out at merge, and why. Their fetch code stays so they can come back.
DROPPED = {
    "flytipping_rate": "the rate mostly shows how hard each council records tipping (Gwynedd 459 incidents, "
                       "Anglesey 4,452), so a map of it would mislead; the fetch agent could give it no direction",
    "rough_sleepers": "monthly counts depend on how each council counts: Rhondda Cynon Taf reports none in any "
                      "of the 12 months and Ceredigion ranks above Cardiff; temp_accommodation covers homelessness",
    "road_ksi": "police forces record 'serious' injuries in different ways and the figures are not severity "
                "adjusted: every South Wales Police area is 10 to 17 per 100,000 while Gwent is 29 to 41 "
                "(Cardiff 10.7, Newport 29.1). Use the DfT severity-adjusted casualties to bring it back",
    "welsh_speakers_aps": "repeats welsh_speakers from a sample survey that reads far higher than the Census "
                          "(Wales 27.4 against 17.8 per cent), so two different answers to one question",
    "listed_buildings_km2": "the same Cadw count as listed_buildings, divided by area instead of people",
}

# Shorter period labels for the atlas, in the style the first pass uses ("Jul 2025 to Jun 2026").
# Each measure's notes keep the full period.
YEAR_LABEL = {
    "business_survival": "2022 to 2025",
    "temp_accommodation": "Oct 2025 to Sep 2026",
    "welsh_daily": "Apr 2025 to Mar 2026",
    "daf_payments": "Apr 2025 to Mar 2026",
    "plug_in_cars": "Jun 2026",
    "ev_chargers": "Oct 2026",
    "ev_chargers_rapid": "Oct 2026",
    "ancient_woodland": "2021",
    "social_housing": "Mar 2025",
    "historic_place_names": "Jan 2026",
    "scheduled_monuments": "Jul 2026",
}


def die(msg):
    print("REFUSED:", msg, file=sys.stderr)
    sys.exit(1)


def load_yaml_list(path, key):
    with open(path) as f:
        data = yaml.safe_load(f)
    return data[key] if isinstance(data, dict) else data


def staged():
    """Kept measures in KEYS order: id -> (key, values entry, indicator definition)."""
    out, sources = {}, {}
    for key in KEYS:
        with open(os.path.join(OUT, f"{key}.json")) as f:
            vals = json.load(f)["indicators"]
        defs = {d["id"]: d for d in load_yaml_list(os.path.join(OUT, f"{key}.indicators.yaml"), None)}
        if set(vals) != set(defs):
            die(f"{key}: ids in {key}.json and {key}.indicators.yaml differ: {sorted(set(vals) ^ set(defs))}")
        for s in load_yaml_list(os.path.join(OUT, f"{key}.sources.yaml"), None) or []:
            if s["id"] in sources and sources[s["id"]] != s:
                die(f"source {s['id']} is staged twice with different content")
            sources[s["id"]] = s
        for iid, entry in vals.items():
            if iid in DROPPED:
                continue
            if iid in out:
                die(f"{iid} is staged by both {out[iid][0]} and {key}")
            missing = [c for c in LAS + [WALES] if not isinstance(entry["values"].get(c), (int, float))
                       or not math.isfinite(entry["values"][c])]
            if missing:
                die(f"{iid} ({key}) has no value for {', '.join(missing)}")
            extra = [c for c in entry["values"] if c not in LAS and c != WALES]
            if extra:
                die(f"{iid} ({key}) has values for unknown areas {extra}")
            out[iid] = (key, {"year": YEAR_LABEL.get(iid, str(entry["year"])), "values": {c: entry["values"][c] for c in LAS + [WALES]}}, defs[iid])
    return out, sources


def append_yaml(path, entries):
    text = yaml.safe_dump(entries, allow_unicode=True, sort_keys=False, width=120)
    with open(path) as f:
        cur = f.read()
    with open(path, "a") as f:
        if cur and not cur.endswith("\n"):
            f.write("\n")
        f.write(text)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true", help="report only, write nothing")
    ap.add_argument("--update", action="store_true", help="replace measures an earlier merge added when their staged values changed")
    ap.add_argument("--refresh-earnings", action="store_true", help="replace earnings with ASHE 2026 (moves game starting scores)")
    args = ap.parse_args()

    kept, staged_sources = staged()
    with open(LA_JSON) as f:
        la = json.load(f)
    inds = la["indicators"]
    merged_before = set(la.get("merged_extra", {}).get("ids", []))

    added, same, replaced = [], [], []
    for iid, (key, entry, _) in kept.items():
        cur = inds.get(iid)
        if cur is None:
            added.append(iid)
        elif cur == entry:
            same.append(iid)
        elif iid in merged_before and args.update:
            replaced.append(iid)
        elif iid in merged_before:
            die(f"{iid} ({key}) differs from the merged copy; rerun with --update to take the new values")
        else:
            die(f"{iid} ({key}) clashes with an existing measure of the same id; rename it in the staged files")

    refresh = None
    if args.refresh_earnings:
        with open(os.path.join(OUT, "work.json")) as f:
            r = json.load(f).get("refresh_earnings")
        if not r:
            die("work.json has no refresh_earnings block")
        refresh = {"year": str(r["year"]), "values": {c: r["values"][c] for c in LAS + [WALES]}}

    # definitions and sources
    have_inds = {d["id"] for d in load_yaml_list(IND_YAML, "indicators")}
    have_srcs = load_yaml_list(SRC_YAML, "sources")
    have_src_ids = {s["id"] for s in have_srcs}
    have_src_url = {s.get("url"): s["id"] for s in have_srcs}
    new_defs = [d for iid, (_, _, d) in kept.items() if iid not in have_inds]
    cited = []
    for iid, (_, _, d) in kept.items():
        for s in d.get("sources") or [d.get("source")]:
            if s and s not in cited:
                cited.append(s)
    new_srcs = []
    for sid in cited:
        if sid in have_src_ids:
            continue
        if sid not in staged_sources:
            die(f"source {sid} is cited but neither model/sources.yaml nor the staged sources hold it")
        s = staged_sources[sid]
        if s.get("url") in have_src_url:
            die(f"source {sid} has the same url as existing source {have_src_url[s['url']]}")
        new_srcs.append(s)

    print(f"kept {len(kept)} staged measures; dropped {len(DROPPED)}: {', '.join(DROPPED)}")
    print(f"la-indicators.json: add {len(added)}, unchanged {len(same)}, replace {len(replaced)}"
          + (", refresh earnings to " + refresh["year"] if refresh else ""))
    print(f"indicators.yaml: append {len(new_defs)}; sources.yaml: append {len(new_srcs)}")
    for k in KEYS:
        ids = [i for i, v in kept.items() if v[0] == k]
        print(f"  {k:9} {len(ids):2}  {' '.join(ids)}")
    if args.check:
        print("check only: nothing written")
        return

    for iid in added + replaced:
        inds[iid] = kept[iid][1]
    if refresh:
        inds["earnings"] = refresh
    la["merged_extra"] = {
        "note": "Measures added by pipeline/extra/merge.py from pipeline/extra/out/.",
        "ids": sorted(merged_before | set(kept)),
    }
    with open(LA_JSON, "w") as f:
        json.dump(la, f, indent=1)
        f.write("\n")
    if new_defs:
        append_yaml(IND_YAML, new_defs)
    if new_srcs:
        append_yaml(SRC_YAML, new_srcs)
    print("written")


if __name__ == "__main__":
    main()
