#!/usr/bin/env python3
"""Fairness goal: fetch extra open measures for the 22 Welsh local authorities.
Run from the pipeline directory:  python3 extra/fetch_fairness.py
(needs pandas and odfpy for the DWP .ods file, so do not use python -I).
Raw downloads are cached in pipeline/raw/extra/fairness/ (delete a file to refresh).
Writes pipeline/extra/out/fairness.json.  Every value is read from a published
table or computed from published tables, as described in fairness.indicators.yaml.
"""
import csv, io, json, os, sys

sys.path.insert(0, "/Users/lukemaggs/Desktop/Claude/WalesSim/pipeline")
import fetch_la_indicators as base
from fetch_la_indicators import LAS, WALES, GEOG, http, nomis_one, name_map

HERE = os.path.dirname(os.path.abspath(__file__))
RAWX = os.path.join(os.path.dirname(HERE), "raw", "extra", "fairness")
OUT = os.path.join(HERE, "out", "fairness.json")
os.makedirs(RAWX, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
base.RAW = RAWX          # route the shared cached/nomis helpers into our cache folder
IND = {}


def cached_bytes(name, url):
    path = os.path.join(RAWX, name)
    if not os.path.exists(path) or os.path.getsize(path) < 200:
        print("  downloading", name)
        with open(path, "wb") as f:
            f.write(http(url))
    return path


def sw_rows(dataset):
    """Whole StatsWales dataset as list of dicts, via the public CSV API."""
    rows, page = [], 1
    while True:
        path = cached_bytes(f"sw_{dataset[:8]}_p{page}.csv",
                            f"https://api.stats.gov.wales/v2/{dataset}/data?format=csv&page_size=10000&page_number={page}")
        part = list(csv.DictReader(io.StringIO(open(path, encoding="utf-8-sig").read())))
        rows += part
        if len(part) < 10000:
            return rows
        page += 1


def put(iid, year, vals):
    missing = [k for k in LAS if k not in vals]
    assert not missing, (iid, missing)
    assert WALES in vals, (iid, "no Wales value")
    IND[iid] = {"year": year, "values": {k: round(vals[k], 4) for k in LAS + [WALES]}}


def codes():
    n = dict(name_map())
    n["wales"] = WALES
    return n


def wimd(desc):
    names, vals = codes(), {}
    for r in sw_rows("c28ab0ec-5893-46c2-a372-98d4058ba415"):
        if r["Data description"] == desc and r["Area name"].lower() in names:
            vals[names[r["Area name"].lower()]] = float(r["Data values"])
    return vals


def dwp_children():
    import pandas as pd
    p = cached_bytes("dwp_children_low_income_2022_2025.ods",
                     "https://assets.publishing.service.gov.uk/media/69b809619d8b52961a62b49a/"
                     "children-in-low-income-families-local-area-statistics-2022-2025.ods")
    vals = {}
    for sheet in ("7_BHC_Relative_LA", "5_BHC_Relative_Region"):
        df = pd.read_excel(p, engine="odf", sheet_name=sheet, header=None)
        hdr = next(i for i in range(len(df)) if str(df.iloc[i, 0]).startswith(("Local Authority", "Government Office")))
        col = next(j for j, h in enumerate(df.iloc[hdr]) if str(h).startswith("Percentage of children FYE 2025"))
        for i in range(hdr + 1, len(df)):
            c = df.iloc[i, 1]
            if c in LAS or c == WALES:
                vals[c] = 100 * float(df.iloc[i, col])
    put("child_low_income", "2024 to 2025", vals)


def free_school_meals():
    names, vals = codes(), {}
    for r in sw_rows("7be88416-50db-4a08-917d-ca6e4a17db39"):
        if (r["Data description"] == "Percentage of pupils" and r["Year"] == "2025/26"
                and r["Category"] == "Eligible for free school meals"):
            a = r["Local authority"].lower()
            if a in names:
                vals[names[a]] = float(r["Data values"])
            elif a == "wales":
                vals[WALES] = float(r["Data values"])
    put("free_school_meals", "2025/26", vals)


def daf():
    names = codes()
    pay, wal = {}, 0
    months = set()
    for r in sw_rows("4cb5e809-d794-44ef-9f98-0f4e44ad0647"):
        if r["Data description"] != "Number of payments" or not r["Month"].endswith(("2025", "2026")):
            continue
        # financial year April 2025 to March 2026
        m, y = r["Month"].split()
        if not ((y == "2025" and m not in ("January", "February", "March")) or (y == "2026" and m in ("January", "February", "March"))):
            continue
        months.add(r["Month"])
        a = r["Area"].lower().replace("rhondda, cynon, taff", "rhondda cynon taf")
        v = float(r["Data values"])
        if a in names and a != "wales":
            pay[names[a]] = pay.get(names[a], 0) + v
        elif a == "wales":
            wal += v
    assert len(months) == 12, months
    pop = nomis_one("NM_2002_1", "nomis_pop_2025.csv", 2025, "c_age=0&gender=0")
    vals = {k: 1000 * pay[k] / pop[k] for k in LAS}
    # Wales: sum of the 22 authorities (the published Wales rows can include payments with no area)
    vals[WALES] = 1000 * sum(pay[k] for k in LAS) / sum(pop[k] for k in LAS)
    print("  DAF Wales published sum", wal, "LA sum", sum(pay.values()))
    put("daf_payments", "April 2025 to March 2026", vals)


def ashe():
    rows = base.nomis("NM_30_1", f"geography={GEOG}&time=2026&sex=1,3,8&pay=5&item=2,7&measures=20100"
                      "&select=geography_code,sex,item,obs_value", "nomis_ashe_hourly_2026.csv")
    d = {}
    for r in rows:
        if r["OBS_VALUE"] != "":
            d[(r["GEOGRAPHY_CODE"], r["SEX"], r["ITEM"])] = float(r["OBS_VALUE"])
    p20 = {k: d[(k, "8", "7")] for k in LAS + [WALES] if (k, "8", "7") in d}
    gap = {k: 100 * (d[(k, "1", "2")] - d[(k, "3", "2")]) / d[(k, "1", "2")]
           for k in LAS + [WALES] if (k, "1", "2") in d and (k, "3", "2") in d}
    put("low_pay_hourly", "2026", p20)
    # gender pay gap computed (gap) but not published: ranges -17 to +18 across LAs, i.e. sampling noise


def households_deprived():
    rows = base.nomis("NM_2031_1", f"geography={GEOG}&measures=20100&select=geography_code,c2021_dep_6,obs_value",
                      "nomis_ts011.csv")
    d = {}
    for r in rows:
        d[(r["GEOGRAPHY_CODE"], r["C2021_DEP_6"])] = float(r["OBS_VALUE"])
    vals = {k: 100 * (d[(k, "3")] + d[(k, "4")] + d[(k, "5")]) / d[(k, "0")] for k in LAS + [WALES]}
    put("hh_deprived_2plus", "2021", vals)


def main():
    steps = [("DWP children in low income families", dwp_children), ("free school meals", free_school_meals),
             ("WIMD older people", lambda: put("older_income_deprivation", "WIMD 2025", wimd("Older people in income deprivation (percentage)"))),
             ("WIMD all people income", lambda: put("income_deprivation", "WIMD 2025", wimd("People in income deprivation (percentage)"))),
             ("ASHE", ashe), ("households deprived", households_deprived), ("DAF", daf)]
    failed = []
    for name, fn in steps:
        print("==", name)
        try:
            fn()
        except Exception as e:
            failed.append((name, repr(e)))
            print("  FAILED", repr(e))
    json.dump({"generated": "2026-11-27", "indicators": IND}, open(OUT, "w"), indent=1)
    print("wrote", OUT, list(IND))
    for f in failed:
        print("FAILED", f)


if __name__ == "__main__":
    main()
