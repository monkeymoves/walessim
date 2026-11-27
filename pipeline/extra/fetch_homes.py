#!/usr/bin/env python3
"""Homes and community measures for the atlas.  Run from the pipeline folder:
    python3 extra/fetch_homes.py
Raw downloads are cached in pipeline/raw/extra/homes/ (delete a file to refetch).
Writes pipeline/extra/out/homes.json.  No value is estimated: each is read from a
published table, or is a ratio of two published tables as noted per measure."""
import csv, io, json, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, "/Users/lukemaggs/Desktop/Claude/WalesSim/pipeline")
sys.path.insert(0, HERE)
import fetch_la_indicators as F
from swapi import sw_rows

RAW = os.path.join(os.path.dirname(HERE), "raw", "extra", "homes")
OUT = os.path.join(HERE, "out", "homes.json")
os.makedirs(RAW, exist_ok=True)
F.RAW = RAW          # route the shared helpers' cache into our own folder
LAS, WALES = F.LAS, F.WALES
IND = {}


def put(iid, year, values):
    missing = [k for k in LAS if k not in values]
    if missing:
        raise RuntimeError(f"{iid}: missing {missing}")
    IND[iid] = {"year": year, "values": {k: round(values[k], 4) for k in LAS + [WALES] if k in values}}


def codes():
    m = dict(F.name_map())
    m["wales"] = WALES
    m["total unitary authorities"] = WALES
    return m


def dl(name, url):
    path = os.path.join(RAW, name)
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        print("  downloading", name)
        with open(path, "wb") as f:
            f.write(F.http(url))
    return path


def by_code(rows, area_col, val_col="Data values", cond=lambda r: True, agg="sum"):
    names = codes()
    out = {}
    for r in rows:
        if not cond(r):
            continue
        c = names.get(r[area_col].strip().lower())
        if c:
            v = float(r[val_col])
            out[c] = out.get(c, 0) + v
    return out


# ------------------------------------------------------------------ data
def la_tables():
    pop = F.nomis_one("NM_2002_1", "nomis_pop_2025.csv", 2025, "c_age=0&gender=0")
    ct = sw_rows(RAW, "ct1", "062488e2-3fd6-4755-9b0b-a64547fc570f")
    def ctv(row, desc="Number of dwellings"):
        return by_code(ct, "Authority", cond=lambda r: r["Year"] == "2026-27" and r["Band"] == "Total"
                       and r["Data description"] == desc and r["Row"].startswith(row + " "))
    a1, h8, h7 = ctv("A1", "Taxbase"), ctv("H8"), ctv("H7")   # A1 is published only as "Taxbase" (chargeable dwellings)
    put("second_homes", "2026-27", {k: 100 * h8[k] / a1[k] for k in a1})
    put("empty_homes", "2026-27", {k: 100 * h7[k] / a1[k] for k in a1})

    st = sw_rows(RAW, "stock", "6476cc20-ddeb-46a5-be64-10a23c8a159f")
    def stv(tenure, kind):
        return by_code(st, "Area", cond=lambda r: r["Period"] == "31/03/2025" and r["Tenure"].strip() == tenure
                       and r["Data description"] == f"Dwelling stock estimates ({kind})")
    allt, soc = stv("All tenures", "number"), stv("Total social Housing", "number")
    put("social_housing", "31 March 2025", {k: 100 * soc[k] / allt[k] for k in allt})

    # homeless people in temporary accommodation: mean of the 12 month-ends Oct 2025 to Sep 2026
    ta = sw_rows(RAW, "ta", "35713e0f-e755-4444-ab14-915d8d9432e1")
    months = ["31/10/2025", "30/11/2025", "31/12/2025", "31/01/2026", "28/02/2026", "31/03/2026",
              "30/04/2026", "31/05/2026", "30/06/2026", "31/07/2026", "31/08/2026", "30/09/2026"]
    tot = by_code(ta, "Area", cond=lambda r: r["Period"] in months and r["Accommodation type"] == "Total"
                  and r["Data description"] == "Total number of homeless people temporarily accommodated")
    pw = dict(pop)
    put("temp_accommodation", "October 2025 to September 2026",
        {k: (tot[k] / 12) * 10000 / pw[k] for k in tot if k in pw})

    # new homes completed per 1,000 dwellings, 3 year mean
    nb = sw_rows(RAW, "newbuild", "60138097-1bda-4bde-8631-28b5f6a97764")
    yrs = ["2023-24", "2024-25", "2025-26"]
    comp = by_code(nb, "Area", cond=lambda r: r["Period"] in yrs and r["Dwelling type"] == "Total"
                   and r["Number of bedrooms"] == "Total" and r["Data description"] == "Total new dwellings completed")
    put("new_homes", "2023-24 to 2025-26", {k: (comp[k] / 3) * 1000 / allt[k] for k in comp if k in allt})

    # rough sleepers per 100,000, 12 month mean of the monthly snapshot
    rs = sw_rows(RAW, "rough", "116be6b0-97bb-4abc-8cfb-13ff4b5d5d7e")
    rtot = by_code(rs, "Area", cond=lambda r: r["Period"] in months)
    put("rough_sleepers", "October 2025 to September 2026", {k: (rtot[k] / 12) * 100000 / pw[k] for k in rtot if k in pw})

    # WIMD 2025 indicators
    w = sw_rows(RAW, "wimd", "c28ab0ec-5893-46c2-a372-98d4058ba415")
    def wv(desc):
        return by_code(w, "Area name", cond=lambda r: r["Data description"] == desc)
    put("overcrowding", "WIMD 2025", wv("Overcrowded households (percentage)"))
    put("slow_broadband", "WIMD 2025", wv("Residential premises unable to receive superfast broadband (percentage)"))
    put("burglary", "WIMD 2025", wv("Police recorded burglary (rate per 100 residential dwellings)"))
    # Not used (checked 2026-11-27): the WIMD crime table db7a291a has no LA rows (all 'Not available' at W06 level),
    # and the Home Office CSP table merges Merthyr Tydfil and Rhondda Cynon Taf into 'Cwm Taf', so no 22-LA crime rate.
    return pop


def road_ksi(pop):
    import pandas as pd
    base = "https://data.dft.gov.uk/road-accidents-safety-data/dft-road-casualty-statistics-"
    tot = {}
    for y in (2023, 2024, 2025):
        col = pd.read_csv(dl(f"dft_collision_{y}.csv", f"{base}collision-{y}.csv"), usecols=["collision_index", "local_authority_ons_district"], dtype=str)
        cas = pd.read_csv(dl(f"dft_casualty_{y}.csv", f"{base}casualty-{y}.csv"), usecols=["collision_index", "casualty_severity"], dtype=str)
        cas = cas[cas["casualty_severity"].isin(["1", "2"])].merge(col, on="collision_index")
        for k, n in cas.groupby("local_authority_ons_district").size().items():
            if k in LAS:
                tot[k] = tot.get(k, 0) + int(n)
    vals = {k: (tot[k] / 3) * 100000 / pop[k] for k in LAS}
    vals[WALES] = (sum(tot.values()) / 3) * 100000 / pop[WALES]
    put("road_ksi", "2023 to 2025", vals)


if __name__ == "__main__":
    pop = la_tables()
    road_ksi(pop)
    import datetime
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"generated": datetime.date.today().isoformat(), "indicators": IND}, f, indent=1)
    for k, v in IND.items():
        xs = sorted((v["values"][c], c) for c in LAS)
        print(f"{k:20} {v['year']:32} wales={v['values'].get(WALES)}  min={xs[0][0]:.2f} max={xs[-1][0]:.2f}")
