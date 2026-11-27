#!/usr/bin/env python3
"""Work and pay: extra atlas measures.  Run from pipeline/:  python3 -I extra/fetch_work.py
Raw downloads are cached in pipeline/raw/extra/work/ (gitignored); delete a file to refetch.
Writes pipeline/extra/out/work.json.  Every value is read from a published table."""
import csv, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import fetch_la_indicators as H
from fetch_la_indicators import LAS, WALES, GEOG

RAW = os.path.join(os.path.dirname(HERE), "raw", "extra", "work")
OUT = os.path.join(HERE, "out", "work.json")
os.makedirs(RAW, exist_ok=True)
H.RAW = RAW  # helpers cache under this folder
GENERATED = "2026-11-27"
IND = {}


def put(iid, year, values):
    IND[iid] = {"year": str(year), "values": {k: round(values[k], 4) for k in LAS + [WALES] if k in values}}


def sw_rows(dataset):
    """StatsWales public CSV API, whole dataset, cached."""
    path = os.path.join(RAW, f"sw_{dataset}.csv")
    if not os.path.exists(path):
        print("  downloading", dataset)
        rows, n = [], 1
        while True:
            t = H.http(f"https://api.stats.gov.wales/v2/{dataset}/data?format=csv&page_size=10000&page_number={n}").decode("utf-8-sig")
            page = list(csv.DictReader(io.StringIO(t)))
            rows += page
            if len(page) < 10000:
                break
            n += 1
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
    return list(csv.DictReader(open(path, encoding="utf-8")))


NAMES = None


def code_of(area):
    global NAMES
    if NAMES is None:
        NAMES = H.name_map()
    if area == "Wales":
        return WALES
    a = area.lower()
    return NAMES.get(a[4:] if a.startswith("the ") else a)


def sw_pick(dataset, area_col, year, where, valcol="Data values"):
    out = {}
    for r in sw_rows(dataset):
        if r.get("Year", r.get("Birth year")) != year or any(r[k] != v for k, v in where.items()):
            continue
        c = code_of(r[area_col])
        if c and r[valcol] not in ("", None):
            out[c] = float(r[valcol].replace(",", ""))
    return out


def aps(variable, name):
    rows = H.nomis("NM_17_5", f"geography={GEOG}&time=2026-06&variable={variable}&measures=20599"
                   "&select=geography_code,date,variable_name,obs_value", name)
    out = {r["GEOGRAPHY_CODE"]: float(r["OBS_VALUE"]) for r in rows if r["OBS_VALUE"] != ""}
    if not out:
        os.remove(os.path.join(RAW, name))
        raise RuntimeError("no APS rows for variable %s (cache removed, rerun)" % variable)
    return out


def main():
    # 1 GDHI per head
    put("gdhi_head", "2024", sw_pick("90841eef-d28b-4971-9660-472e0bf0940a", "Area", "2024",
        {"Component": "Gross disposable household income", "Data description": "£ per head"}))
    # 2 claimant count rate, mean of the 12 months Nov 2025 to Oct 2026
    months = ["2025-11", "2025-12"] + [f"2026-{m:02d}" for m in range(1, 11)]
    rows = H.nomis("NM_162_1", f"geography={GEOG}&time={','.join(months)}&gender=0&age=0&measure=2&measures=20100"
                   "&select=geography_code,date,obs_value", "nomis_claimant_12m.csv")
    acc = {}
    for r in rows:
        acc.setdefault(r["GEOGRAPHY_CODE"], {})[r["DATE"]] = float(r["OBS_VALUE"])
    short = [k for k, v in acc.items() if len(v) != 12]
    if short:
        raise RuntimeError("claimant months missing for " + ",".join(short))
    put("claimant_rate", "Nov 2025 to Oct 2026", {k: sum(v.values()) / 12 for k, v in acc.items()})
    # 3 inactivity, 11 self-employed
    put("inactivity", "Jul 2025 to Jun 2026", aps(111, "nomis_aps_2026-06_v111.csv"))
    put("self_employed", "Jul 2025 to Jun 2026", aps(74, "nomis_aps_2026-06_v74.csv"))
    # 4 active enterprises per 10,000, 7 birth rate
    be = "f2dc5994-cf29-4cb7-b692-360b87a85c71"
    put("enterprises_10k", "2025", sw_pick(be, "Area", "2025",
        {"Data description": "Active enterprises per 10,000 of the population aged 16 to 64"}))
    put("business_births", "2025", sw_pick(be, "Area", "2025", {"Data description": "Birth Rate"}))
    # 5 level 4+
    put("level4", "2025", sw_pick("b021de56-f634-4a90-abb9-622b8ae812bb", "Geography", "2025",
        {"Data description": "Qualified to level 4 or above", "Sex": "Persons", "Age group": "18-64 (Working age)"}))
    # 6 jobs density
    rows = H.nomis("NM_57_1", f"geography={GEOG}&time=2024&item=3&measures=20100&select=geography_code,obs_value",
                   "nomis_jobs_density_2024.csv")
    put("jobs_density", "2024", {r["GEOGRAPHY_CODE"]: float(r["OBS_VALUE"]) for r in rows if r["OBS_VALUE"] != ""})
    # 8 workplace pay, ASHE 2026
    rows = H.nomis("NM_99_1", f"geography={GEOG}&time=2026&sex=8&pay=1&item=2&measures=20100&select=geography_code,obs_value",
                   "nomis_ashe_work_2026.csv")
    put("earnings_workplace", "2026", {r["GEOGRAPHY_CODE"]: float(r["OBS_VALUE"]) for r in rows if r["OBS_VALUE"] != ""})
    # 9 employment deprivation (WIMD 2025)
    put("employment_deprivation", "WIMD 2025", sw_pick("c28ab0ec-5893-46c2-a372-98d4058ba415", "Area name", "",
        {"Data description": "Working age people in employment deprivation (percentage)"}) if False else
        {code_of(r["Area name"]): float(r["Data values"]) for r in sw_rows("c28ab0ec-5893-46c2-a372-98d4058ba415")
         if r["Data description"] == "Working age people in employment deprivation (percentage)" and code_of(r["Area name"])})
    # 10 three year business survival, births of 2022
    put("business_survival", "Businesses born 2022, alive in 2025", sw_pick("1ecdcedf-efe5-412a-bd46-75a3e051ebf3", "Area", "2022",
        {"Survival year": "3 year survival", "Data description": "Percent"}))
    # refresh for existing `earnings` (residence based): ASHE 2026
    rows = H.nomis("NM_30_1", f"geography={GEOG}&time=2026&sex=8&pay=1&item=2&measures=20100&select=geography_code,obs_value",
                   "nomis_ashe_resid_2026.csv")
    refresh = {"year": "2026", "values": {r["GEOGRAPHY_CODE"]: float(r["OBS_VALUE"]) for r in rows if r["OBS_VALUE"] != ""}}

    final, dropped = {}, {}
    for iid, d in IND.items():
        miss = [k for k in LAS + [WALES] if k not in d["values"]]
        if miss:
            dropped[iid] = miss
        else:
            final[iid] = d
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"generated": GENERATED, "indicators": final, "refresh_earnings": refresh}, open(OUT, "w"), indent=1)
    print("wrote", OUT, len(final), "indicators; dropped:", dropped)
    for iid, d in final.items():
        v = [d["values"][k] for k in LAS]
        print(f"{iid:24s} {d['year']:34s} min {min(v):9.2f} max {max(v):9.2f} Wales {d['values'][WALES]:9.2f}")
    v = [refresh["values"].get(k) for k in LAS]
    print("earnings refresh", sum(x is None for x in v), "missing", refresh["values"].get(WALES))


if __name__ == "__main__":
    main()
