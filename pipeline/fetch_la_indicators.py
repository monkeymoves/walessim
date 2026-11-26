#!/usr/bin/env python3
"""Fetch open data for the 22 Welsh local authorities and build
model/data/la-indicators.json.  Run with:  python3 -I pipeline/fetch_la_indicators.py

Raw downloads are cached in pipeline/raw/la/ (gitignored).  Delete a file
there to force a fresh download.  No numbers are estimated: every value is
read from a published table or computed from published tables, as noted in
model/indicators.yaml.  An indicator with any of the 22 LAs missing is dropped
and reported.
"""
import csv, html, io, json, os, re, subprocess, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "pipeline", "raw", "la")
OUT = os.path.join(ROOT, "model", "data", "la-indicators.json")
UA = "etifeddiaeth-pipeline/0.1"
GENERATED = "2026-11-26"
WALES = "W92000004"
LAS = ["W06000001", "W06000002", "W06000003", "W06000004", "W06000005", "W06000006",
       "W06000008", "W06000009", "W06000010", "W06000011", "W06000012", "W06000013",
       "W06000014", "W06000015", "W06000016", "W06000018", "W06000019", "W06000020",
       "W06000021", "W06000022", "W06000023", "W06000024"]
GEOG = ",".join(LAS + [WALES])
os.makedirs(RAW, exist_ok=True)


# ---------------------------------------------------------------- fetching
def http(url, data=None, tries=5):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=180).read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and i < tries - 1:
                time.sleep(15 * (i + 1))
                continue
            raise
        except urllib.error.URLError:
            if i < tries - 1:
                time.sleep(5)
                continue
            raise


def cached(name, url):
    path = os.path.join(RAW, name)
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        print("  downloading", name)
        body = http(url)
        with open(path, "wb") as f:
            f.write(body)
        time.sleep(3)  # be polite to ONS
    return path


def cached_text(name, url):
    path = os.path.join(RAW, name)
    if not os.path.exists(path):
        print("  downloading", name)
        with open(path, "wb") as f:
            f.write(http(url))
    return open(path, encoding="utf-8").read()


def nomis(dataset, query, name):
    """Nomis CSV API, cached.  Returns list of dict rows."""
    url = f"https://www.nomisweb.co.uk/api/v01/dataset/{dataset}.data.csv?{query}"
    return list(csv.DictReader(io.StringIO(cached_text(name, url))))


def nomis_one(dataset, name, date, extra="", valcol="OBS_VALUE"):
    rows = nomis(dataset, f"geography={GEOG}&time={date}&measures=20100&{extra}"
                 "&select=geography_code,date,obs_value", name)
    return {r["GEOGRAPHY_CODE"]: float(r[valcol]) for r in rows if r[valcol] != ""}


# ------------------------------------------------------------ indicators
IND = {}   # id -> {"year":..., "values":{...}}
DROPPED = {}


def put(iid, year, values):
    IND[iid] = {"year": str(year), "values": {k: values[k] for k in LAS + [WALES] if k in values}}


def population():
    latest = nomis_one("NM_2002_1", "nomis_pop_2025.csv", 2025, "c_age=0&gender=0")
    old = nomis_one("NM_2002_1", "nomis_pop_2015.csv", 2015, "c_age=0&gender=0")
    a65 = nomis_one("NM_2002_1", "nomis_pop65_2025.csv", 2025, "c_age=209&gender=0")
    # ages 20-24, 25-29, 30-34 are codes 6,7,8
    ya = {}
    for c in (6, 7, 8):
        for k, v in nomis_one("NM_2002_1", f"nomis_popage{c}_2025.csv", 2025, f"c_age={c}&gender=0").items():
            ya[k] = ya.get(k, 0) + v
    put("pop", "2025", latest)
    put("pop_change", "2015 to 2025", {k: 100 * (latest[k] / old[k] - 1) for k in latest if k in old})
    put("age65", "2025", {k: 100 * a65[k] / latest[k] for k in a65})
    put("young_adults", "2025", {k: 100 * ya[k] / latest[k] for k in ya})
    return latest


def welsh():
    rows = nomis("NM_2051_1", f"geography={GEOG}&measures=20100&select=geography_code,c2021_wlangs_3,obs_value",
                 "nomis_ts033.csv")
    tot, can = {}, {}
    for r in rows:
        if r["C2021_WLANGS_3"] == "0":
            tot[r["GEOGRAPHY_CODE"]] = float(r["OBS_VALUE"])
        elif r["C2021_WLANGS_3"] == "2":
            can[r["GEOGRAPHY_CODE"]] = float(r["OBS_VALUE"])
    put("welsh_speakers", "2021", {k: 100 * can[k] / tot[k] for k in tot if k in can})


def deprivation():
    """WIMD 2025 overall rank (DataMapWales WFS) aggregated to LA via Nomis LSOA2021 -> LA lookup."""
    url = ("https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
           "&typeNames=geonode:wimd2025_overall&outputFormat=application/json"
           "&propertyName=lsoa,rank,decile,quintile")
    wimd = {}
    for f in json.loads(cached_text("wimd2025_overall.json", url))["features"]:
        p = f["properties"]
        wimd[p["lsoa"]] = (p["quintile"], p["decile"])
    n5, n10, n = {}, {}, {}
    seen = set()
    for la in LAS:
        rows = nomis("NM_2028_1", f"geography={la}TYPE151&measures=20100&c_sex=0&select=geography_code",
                     f"nomis_lsoa21_in_{la}.csv")
        for r in rows:
            l = r["GEOGRAPHY_CODE"]
            if l not in wimd:
                continue
            seen.add(l)
            q, d = wimd[l]
            n[la] = n.get(la, 0) + 1
            n5[la] = n5.get(la, 0) + (q == 1)
            n10[la] = n10.get(la, 0) + (d == 1)
    if len(seen) != len(wimd):
        raise RuntimeError(f"LSOA mapping covers {len(seen)} of {len(wimd)} WIMD LSOAs")
    vals5 = {k: 100 * n5[k] / n[k] for k in n}
    vals10 = {k: 100 * n10[k] / n[k] for k in n}
    vals5[WALES] = 100 * sum(n5.values()) / sum(n.values())
    vals10[WALES] = 100 * sum(n10.values()) / sum(n.values())
    put("deprivation", "WIMD 2025", vals5)
    put("deprivation_10", "WIMD 2025", vals10)


def gva(pop_latest):
    import openpyxl
    p = cached("ons_gdp_la_1998to2024.xlsx",
               "https://www.ons.gov.uk/file?uri=/economy/grossdomesticproductgdp/datasets/"
               "regionalgrossdomesticproductlocalauthorities/1998to2024/"
               "regionalgrossdomesticproductgdplocalauthorities.xlsx")
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)

    def table(sheet):
        rows = list(wb[sheet].iter_rows(values_only=True))
        hdr = rows[1]
        col = hdr.index("2024") if "2024" in hdr else hdr.index(2024)
        return {r[1]: r[col] for r in rows if r[1] and str(r[1]).startswith("W06")}
    gva_m = table("Table 1")   # GVA(B) current prices, GBP million
    popn = table("Table 6")    # ONS regional accounts resident population
    vals = {k: gva_m[k] * 1e6 / popn[k] for k in gva_m if gva_m[k] is not None and popn.get(k)}
    if len(vals) == 22:
        vals[WALES] = sum(gva_m[k] for k in LAS) * 1e6 / sum(popn[k] for k in LAS)
    put("gva_head", "2024", vals)


def employment_earnings():
    rows = nomis("NM_17_5", f"geography={GEOG}&time=2026-06&variable=45&measures=20599&select=geography_code,date,variable_name,obs_value",
                 "nomis_aps_2026-06_v45.csv")
    emp = {r["GEOGRAPHY_CODE"]: float(r["OBS_VALUE"]) for r in rows
           if r["VARIABLE_NAME"] == "Employment rate - aged 16-64" and r["OBS_VALUE"] != ""}
    put("employment", "Jul 2025 to Jun 2026", emp)
    put("earnings", "2025", nomis_one("NM_30_1", "nomis_ashe_resid_2025.csv", 2025, "sex=8&pay=1&item=2"))


def affordability():
    import openpyxl
    p = cached("ons_affordability_residence.xlsx",
               "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/datasets/"
               "ratioofhousepricetoresidencebasedearningslowerquartileandmedian/current/"
               "aff2ratioofhousepricetoresidencebasedearnings.xlsx")
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    vals = {}
    rows = list(wb["5c"].iter_rows(values_only=True))
    hdr = rows[1]
    c = hdr.index("2025")
    for r in rows:
        if r[2] and str(r[2]).startswith("W06"):
            vals[r[2]] = float(r[c])
    rows1 = list(wb["1c"].iter_rows(values_only=True))
    c1 = rows1[1].index("2025")
    for r in rows1:
        if r[0] == WALES:
            vals[WALES] = float(r[c1])
    put("affordability", "2025", vals)


def life_exp():
    import openpyxl
    p = cached("ons_life_expectancy_local_areas.xlsx",
               "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/"
               "healthandlifeexpectancies/datasets/lifeexpectancyforlocalareasoftheuk/"
               "between2001to2003and2022to2024/lifeexpectancylocalareas.xlsx")
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    ms, fs = {}, {}
    for r in wb["1"].iter_rows(min_row=7, values_only=True):
        if r[0] == "2022 to 2024" and r[7] == "<1" and r[3] and (str(r[3]).startswith("W06") or r[3] == WALES):
            (ms if r[5] == "Male" else fs)[r[3]] = float(r[9])
    put("life_exp", "2022 to 2024", {k: (ms[k] + fs[k]) / 2 for k in ms if k in fs})


def emissions():
    p = cached("desnz_la_ghg_2005_2024.csv",
               "https://assets.publishing.service.gov.uk/media/6a3bacc9d52550a19950f2f5/"
               "2005-24-local-authority-ghg-emissions-csv-dataset.csv")
    kt, pop = {}, {}
    with open(p, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if r["Calendar Year"] == "2024" and r["Country"] == "Wales":
                k = r["Local Authority Code"]
                kt[k] = kt.get(k, 0) + float(r["Territorial emissions (kt CO2e)"])
                pop[k] = float(r["Mid-year Population (thousands)"]) * 1000
    vals = {k: kt[k] * 1000 / pop[k] for k in kt if k in LAS}   # tonnes CO2e per person
    if len(vals) == 22:
        vals[WALES] = sum(kt[k] for k in LAS) * 1000 / sum(pop[k] for k in LAS)
    put("emissions_head", "2024", vals)


def renewables(pop_latest):
    import openpyxl
    p = cached("desnz_renewables_la_2014_2025.xlsx",
               "https://assets.publishing.service.gov.uk/media/6aba6ebafe72ed1e2b02f151/"
               "Renewable_electricity_by_local_authority_2014_2025.xlsx")
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    rows = list(wb["LA - Capacity, 2025"].iter_rows(values_only=True))
    hdr = next(r for r in rows if r[0] and "Local Authority Code" in str(r[0]))
    c = hdr.index("Total")
    mw = {r[0]: float(r[c]) for r in rows if r[0] and str(r[0]).startswith("W06")}
    if len(mw) == 22:
        mw[WALES] = sum(mw.values())
    put("renewables_mw", "2025", mw)
    put("renewables", "2025", {k: mw[k] * 1000 / pop_latest[k] for k in mw if k in pop_latest})  # kW per person


def stats_wales_rows(dataset, pages):
    out = []
    for p in range(1, pages + 1):
        t = cached_text(f"statswales_{dataset[:8]}_p{p}.html",
                        f"https://stats.gov.wales/en-GB/{dataset}?page_number={p}&page_size=500")
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S):
            out.append([html.unescape(re.sub(r"<[^>]+>", "", c)).strip()
                        for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)])
    return out


def name_map():
    rows = nomis("NM_2002_1", f"geography={GEOG}&time=2025&c_age=0&gender=0&measures=20100&select=geography_code,geography_name",
                 "nomis_names.csv")
    return {r["GEOGRAPHY_NAME"].lower(): r["GEOGRAPHY_CODE"] for r in rows}


def num(s):
    return float(re.sub(r"\s*\[.*?\]|,", "", s))


def flood():
    names = name_map()
    rows = [r for r in stats_wales_rows("44557520-6234-4a77-9263-cabfc00f4d72", 12) if len(r) == 8]
    tot = {}
    for r in rows:
        v, _, typ, risk, prop, dfn, area, yr = r
        if yr == "2025" and risk == "Total" and prop == "Residential" and dfn == "Defended":
            code = names.get(area.lower())
            if code:
                tot[code] = tot.get(code, 0) + num(v)
    hh = nomis_one("NM_2059_1", "nomis_ts041_households.csv", 2021)
    put("flood_exposure", "2025", {k: 100 * tot[k] / hh[k] for k in tot if k in hh})


def wimd_indicators():
    names = name_map()
    rows = [r for r in stats_wales_rows("c28ab0ec-5893-46c2-a372-98d4058ba415", 3) if len(r) == 3]
    want = {
        "greenspace_access": "Residential properties within 300m of accessible natural green space (percentage)",
        "gp_travel_public": "Average return travel time to a GP surgery by public transport, minutes",
        "poor_housing": "Poor quality housing (percentage of residential properties)",
    }
    for iid, desc in want.items():
        vals = {}
        for v, d, area in rows:
            if d == desc:
                code = WALES if area == "Wales" else names.get(area.lower())
                if code:
                    vals[code] = num(v)
        put(iid, "WIMD 2025", vals)


def coal_tips():
    p = cached("coaltips_annex1_2026-03.pdf", "https://www.gov.wales/sites/default/files/inline-documents/2026-03/Annex%201.pdf")
    text = subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True).stdout
    text = text[text.index("Table 2"):]
    names = name_map()
    rows = {}
    for line in text.splitlines():
        m = re.match(r"^(\D+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", line.strip())
        if m:
            rows[m.group(1).strip()] = [int(m.group(i)) for i in range(2, 8)]
    grand = rows.pop("Grand Total")
    tot_c = tot_all = 0
    cd, allv = {}, {}
    for nm, v in rows.items():
        code = next((c for n, c in names.items() if n == nm.lower() or n.startswith(nm.lower())), None)
        if not code:
            raise RuntimeError("coal tip table name not matched: " + nm)
        cd[code] = v[0] + v[1]
        allv[code] = v[5]
    if sum(allv.values()) != grand[5] or sum(v[0] + v[1] for v in rows.values()) != grand[0] + grand[1]:
        raise RuntimeError("coal tip table does not sum to Grand Total")
    # LAs absent from the published table have no disused coal tips: the 16 listed sum exactly to the Grand Total
    for la in LAS:
        cd.setdefault(la, 0)
        allv.setdefault(la, 0)
    cd[WALES] = grand[0] + grand[1]
    allv[WALES] = grand[5]
    put("coal_tips", "Spring 2026", allv)
    put("coal_tips_cd", "Spring 2026", cd)


def main():
    steps = [("population", lambda: population()), ("welsh", welsh), ("deprivation", deprivation),
             ("employment/earnings", employment_earnings), ("affordability", affordability),
             ("life_exp", life_exp), ("emissions", emissions), ("flood", flood),
             ("wimd indicators", wimd_indicators), ("coal tips", coal_tips)]
    pop_latest = None
    for name, fn in steps:
        print("==", name)
        try:
            r = fn()
            if name == "population":
                pop_latest = r
        except Exception as e:  # keep going, report at the end
            DROPPED[name] = repr(e)
            print("  FAILED:", repr(e))
    for name, fn in [("gva", lambda: gva(pop_latest)), ("renewables", lambda: renewables(pop_latest))]:
        print("==", name)
        try:
            fn()
        except Exception as e:
            DROPPED[name] = repr(e)
            print("  FAILED:", repr(e))
    final = {}
    for iid, d in IND.items():
        missing = [k for k in LAS if k not in d["values"]]
        if missing:
            DROPPED[iid] = "missing LAs: " + ",".join(missing)
            continue
        d["values"] = {k: round(v, 4) for k, v in d["values"].items()}
        final[iid] = d
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"generated": GENERATED, "indicators": final}, f, indent=1, sort_keys=False)
    print("wrote", OUT, len(final), "indicators")
    for k, v in DROPPED.items():
        print("DROPPED", k, v)


if __name__ == "__main__":
    main()
