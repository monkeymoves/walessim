#!/usr/bin/env python3
"""Check model/data/la-indicators.json and run the 2026 strand acceptance check.

Run:  python3 -I pipeline/check_la_indicators.py

Part 1 prints every indicator with min, max, Wales value and flags missing LAs.
Part 2 normalises with model/bands.yaml and prints each strand's 2026 flow score
(game-design.md 3.2 and 3.3), using only the indicators that exist, and flags
any strand outside 3 to 6.
"""
import json, os, statistics, sys, yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAS = ["W06000001", "W06000002", "W06000003", "W06000004", "W06000005", "W06000006", "W06000008",
       "W06000009", "W06000010", "W06000011", "W06000012", "W06000013", "W06000014", "W06000015",
       "W06000016", "W06000018", "W06000019", "W06000020", "W06000021", "W06000022", "W06000023", "W06000024"]
WALES = "W92000004"
data = json.load(open(os.path.join(ROOT, "model/data/la-indicators.json")))["indicators"]
_b = yaml.safe_load(open(os.path.join(ROOT, "model/bands.yaml")))
bands = _b["bands"]
GAP = _b["gap_band"]["floor_gap"]
ok = True
print(f"{'indicator':20s} {'year':22s} {'min':>12s} {'max':>12s} {'Wales':>12s}  missing")
for iid, d in data.items():
    v = d["values"]
    miss = [k for k in LAS + [WALES] if k not in v]
    x = [v[k] for k in LAS if k in v]
    ok &= not miss
    print(f"{iid:20s} {d['year']:22s} {min(x):12.2f} {max(x):12.2f} {v.get(WALES, float('nan')):12.2f}  {','.join(miss) or '-'}")
print("ALL 22 LAs PRESENT FOR EVERY INDICATOR" if ok else "MISSING VALUES FOUND")


def score(iid, val, b=None):
    b = b or bands[iid]
    s = 10 * (val - b["floor"]) / (b["goal"] - b["floor"])
    return max(0.0, min(10.0, s))


pop = data["pop"]["values"]


def la_scores(iid, inverse_of=None):
    return {k: score(iid, data[iid]["values"][k]) for k in LAS}


def wmean(sc):
    return sum(sc[k] * pop[k] for k in LAS) / sum(pop[k] for k in LAS)


def gap_score(iid):
    """equal strand: 10 minus the gap (in score points) between the Wales median LA and the mean of the five worst LAs."""
    sc = sorted(la_scores(iid).values())
    return max(0.0, 10 - 10 * (statistics.median(sc) - sum(sc[:5]) / 5) / GAP)


S = {}   # indicator component scores (Wales level)
for iid in ["gva_head", "employment", "earnings", "affordability", "life_exp", "age65", "young_adults",
            "welsh_speakers", "deprivation", "emissions_head", "renewables", "flood_exposure"]:
    if iid in data:
        S[iid] = wmean(la_scores(iid))
strands = {
    "prosperous": ["gva_head", "employment", "earnings"],
    "resilient": ["flood_exposure"],
    "healthier": ["life_exp", "age65"],
    "cohesive": ["affordability", "young_adults"],
    "culture": ["welsh_speakers"],
    "global": ["emissions_head", "renewables"],
}
print("\nComponent scores (population-weighted Wales mean of LA scores, 0 to 10; lower-is-better already inverted by band):")
for k, v in S.items():
    print(f"  {k:16s} {v:5.2f}")
print("\n2026 strand flow scores (only indicators held; missing components listed):")
missing_note = {
    "prosperous": "none missing",
    "resilient": "nature_services missing",
    "healthier": "fuel_poverty missing (no LA values)",
    "equal": "none missing",
    "cohesive": "access is a placeholder at band middle (5.0), included",
    "culture": "heartland missing",
    "global": "none missing",
}
res = {}
for st, comps in strands.items():
    vals = [S[c] for c in comps]
    if st == "cohesive":
        vals.append(5.0)
    res[st] = sum(vals) / len(vals)
eq = [gap_score("earnings"), gap_score("employment"), gap_score("life_exp"),
      sum(la_scores("deprivation").values()) / 22]   # equal: unweighted
res["equal"] = sum(eq) / len(eq)
for st in ["prosperous", "resilient", "healthier", "equal", "cohesive", "culture", "global"]:
    flag = "" if 3 <= res[st] <= 6 else "   <-- OUTSIDE 3 to 6"
    print(f"  {st:11s} {res[st]:5.2f}  ({missing_note[st]}){flag}")
if len(sys.argv) > 1 and sys.argv[1] == "--debug-equal":
    print(eq)
