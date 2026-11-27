#!/usr/bin/env python3
"""Health measures for the atlas (staging).  Run from the pipeline folder:

    cd pipeline && python3 -I extra/fetch_health.py     (or without -I)

Raw downloads are cached in pipeline/raw/extra/health/ (gitignored); delete a
file there to force a fresh download.  Writes pipeline/extra/out/health.json.
Every value is read from a published table or computed from published tables,
as described in health.indicators.yaml.  A measure with any of the 22 LAs
missing is dropped and reported.
"""
import csv, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.dirname(HERE)
sys.path.insert(0, PIPE)
import fetch_la_indicators as base  # noqa: E402  (has a __main__ guard)

LAS, WALES = base.LAS, base.WALES
RAWD = os.path.join(PIPE, "raw", "extra", "health")
OUT = os.path.join(HERE, "out", "health.json")
os.makedirs(RAWD, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
GENERATED = "2026-11-27"

IND, DROPPED = {}, {}


def put(iid, year, values):
    IND[iid] = {"year": year, "values": {k: values[k] for k in LAS + [WALES] if k in values}}


def raw(name):
    return os.path.join(RAWD, name)


def cached_file(name, url):
    p = raw(name)
    if not os.path.exists(p) or os.path.getsize(p) < 1000:
        print("  downloading", name)
        with open(p, "wb") as f:
            f.write(base.http(url))
    return p


# ---------------------------------------------------------- StatsWales API
def sw(dataset):
    """Whole StatsWales dataset as list of dict rows (public CSV API, paged, cached)."""
    p = raw(f"sw_{dataset[:8]}.csv")
    if not os.path.exists(p):
        rows, n = [], 1
        while True:
            url = (f"https://api.stats.gov.wales/v2/{dataset}/data?format=csv"
                   f"&page_size=10000&page_number={n}")
            page = list(csv.DictReader(io.StringIO(base.http(url).decode("utf-8-sig"))))
            rows += page
            if len(page) < 10000:
                break
            n += 1
        print("  downloaded", dataset, len(rows), "rows")
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    with open(p, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def la_code(name, names):
    if name == "Wales":
        return WALES
    return names.get(name.lower())


def wimd():
    names = base.name_map()
    rows = sw("c28ab0ec-5893-46c2-a372-98d4058ba415")
    want = {
        "premature_deaths": "Premature deaths (people aged under 75, rate per 100,000)",
        "gp_mental_health": "People with GP recorded mental health conditions (percentage)",
        "gp_chronic": "People with GP recorded chronic conditions (percentage)",
        "low_birth_weight": "Single live births with low birth weight (percentage)",
        "cancer_incidence": "Cancer incidence in the population (rate per 100,000)",
    }
    for iid, desc in want.items():
        vals = {}
        for r in rows:
            if r["Data description"] == desc:
                c = la_code(r["Area name"], names)
                if c:
                    vals[c] = float(r["Data values"])
        put(iid, "WIMD 2025", vals)


def immunisation():
    names = base.name_map()
    rows = sw("f5060a7c-8b2c-41c4-985f-f0a75a5dac5f")
    years = sorted({r["Year"] for r in rows})
    yr = years[-1]
    vals = {}
    for r in rows:
        if (r["Year"] == yr and r["Data description"] == "Percentage"
                and r["Immunisation status"] == "Fully immunised by age 4"
                and r["Flying start status"] == "All areas"):
            c = la_code(r["Local Authority"], names)
            if c:
                vals[c] = float(r["Data values"])
    put("immunised_age4", yr, vals)


# ------------------------------------------------------------------ Census
def census():
    def get(ds, tag):
        rows = base.nomis(ds, f"geography={base.GEOG}&measures=20100&select=geography_code,obs_value,"
                          + {"ts037": "c2021_health_6", "ts038": "c2021_disability_5",
                             "ts039": "c2021_carer_7"}[tag],
                          raw(f"nomis_{tag}.csv"))
        col = [k for k in rows[0] if k.startswith("C2021_")][0]
        out = {}
        for r in rows:
            out.setdefault(r["GEOGRAPHY_CODE"], {})[r[col]] = float(r["OBS_VALUE"])
        return out
    h = get("NM_2055_1", "ts037")     # 0 total, 4 bad, 5 very bad
    put("bad_health", "2021", {k: 100 * (v["4"] + v["5"]) / v["0"] for k, v in h.items()})
    d = get("NM_2056_1", "ts038")     # 0 total, 1 limited a lot
    put("disabled_limited_lot", "2021", {k: 100 * v["1"] / v["0"] for k, v in d.items()})
    c = get("NM_2057_1", "ts039")     # 0 total 5+, 102 = 20 to 49 h, 6 = 50+ h
    put("unpaid_care_20h", "2021", {k: 100 * (v["102"] + v["6"]) / v["0"] for k, v in c.items()})


# --------------------------------------------------------------------- ONS
def hle():
    import openpyxl
    p = cached_file("hle.xlsx",
                    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/"
                    "healthandlifeexpectancies/datasets/healthstatelifeexpectancyallagesuk/current/"
                    "healthylifeexpectancyuk.xlsx")
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    ms, fs = {}, {}
    for r in wb["1"].iter_rows(min_row=8, values_only=True):
        if (r[0] == "2022 to 2024" and r[7] == "<1" and r[1] == "Wales" and r[3]
                and (str(r[3]).startswith("W06") or r[3] == WALES)):
            (ms if r[5] == "Male" else fs)[r[3]] = float(r[9])
    put("healthy_life_exp", "2022 to 2024", {k: (ms[k] + fs[k]) / 2 for k in ms if k in fs})


def _ons_table(fn, sheet, url, test, codecol, valcol, year):
    import openpyxl
    p = cached_file(fn, url)
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    vals = {}
    for r in wb[sheet].iter_rows(values_only=True):
        if test(r) and r[codecol] and (str(r[codecol]).startswith("W06") or r[codecol] == WALES):
            if isinstance(r[valcol], (int, float)):
                vals[r[codecol]] = float(r[valcol])
    return vals


def suicide():
    base_url = ("https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/"
                "deaths/datasets/suicidesbylocalauthority/current/suicidebylocalauthority2025.xlsx")
    v = _ons_table("suicide.xlsx", "Table_2", base_url,
                   lambda r: r[0] == "2023 to 2025" and r[4] == "Persons", 2, 6, "2023 to 2025")
    put("suicide_rate", "2023 to 2025", v)


def drugs():
    url = ("https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/"
           "deaths/datasets/drugmisusedeathsbylocalauthority/current/2025localauthorities.xlsx")
    # Table 3: all drug poisoning deaths, persons, 2023 to 2025 ASMR (column 5).
    # (Drug misuse, Table 6, is suppressed for Anglesey, so it is not used.)
    v = _ons_table("drugs.xlsx", "Table 3", url, lambda r: True, 0, 5, "2023 to 2025")
    put("drug_deaths", "2023 to 2025", v)


# -------------------------------------------------------------------- main
CHECKS = {  # id: (min, max) plausible for the 22 LAs
    "healthy_life_exp": (48, 68), "premature_deaths": (250, 550), "bad_health": (3, 12),
    "gp_mental_health": (15, 35), "low_birth_weight": (2, 9), "immunised_age4": (65, 100),
    "disabled_limited_lot": (5, 16), "gp_chronic": (10, 25), "unpaid_care_20h": (3, 9),
    "cancer_incidence": (500, 750), "suicide_rate": (5, 30), "drug_deaths": (3, 40),
}


def main():
    for name, fn in [("wimd", wimd), ("immunisation", immunisation), ("census", census),
                     ("hle", hle), ("suicide", suicide), ("drugs", drugs)]:
        print("==", name)
        try:
            fn()
        except Exception as e:
            DROPPED[name] = repr(e)
            print("  FAILED:", repr(e))
    final = {}
    for iid, d in IND.items():
        miss = [k for k in LAS if k not in d["values"]]
        if miss:
            DROPPED[iid] = "missing LAs: " + ",".join(miss)
            continue
        lo, hi = CHECKS[iid]
        bad = [k for k in LAS if not lo <= d["values"][k] <= hi]
        if bad:
            DROPPED[iid] = f"outside plausible range {lo}-{hi}: {bad}"
            continue
        if WALES not in d["values"]:
            DROPPED[iid] = "no Wales value"
            continue
        d["values"] = {k: round(v, 4) for k, v in d["values"].items()}
        final[iid] = d
    with open(OUT, "w") as f:
        json.dump({"generated": GENERATED, "indicators": final}, f, indent=1)
    print("wrote", OUT, len(final), "indicators")
    for iid, d in final.items():
        v = d["values"]
        ls = [v[k] for k in LAS]
        print(f"{iid:22s} {d['year']:14s} n={len(ls)} min={min(ls):.1f} max={max(ls):.1f} wales={v[WALES]:.2f}")
    for k, v in DROPPED.items():
        print("DROPPED", k, v)


if __name__ == "__main__":
    main()
