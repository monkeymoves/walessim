#!/usr/bin/env python3
"""Fetch and compute the Welsh and culture measures for the atlas.
Run from the pipeline folder:  python3 -I extra/fetch_culture.py   (python3 -I needs sys.path set below, which it does)
Raw downloads are cached under pipeline/raw/extra/culture/ (gitignored); delete a file to refetch.
Writes pipeline/extra/out/culture.json.  No figure is estimated.
"""
import csv, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.dirname(HERE)
sys.path.insert(0, PIPE)
import fetch_la_indicators as F  # noqa: E402

RAWC = os.path.join(PIPE, "raw", "extra", "culture")
OUT = os.path.join(HERE, "out", "culture.json")
os.makedirs(RAWC, exist_ok=True)
F.RAW = RAWC  # helpers cache under this folder
LAS, WALES = F.LAS, F.WALES
API = "https://api.stats.gov.wales/v2/{}/data?format=csv&page_size=10000&page_number={}"
RESULT = {}


def sw_rows(ds):
    """All rows of a StatsWales dataset via the public CSV API (cached per page)."""
    rows, p = [], 1
    while True:
        path = os.path.join(RAWC, f"{ds}_p{p}.csv")
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(F.http(API.format(ds, p)))
        page = list(csv.DictReader(open(path, encoding="utf-8")))
        rows += page
        if len(page) < 10000:
            return rows
        p += 1


def code_of(names, name):
    return WALES if name.strip().lower() == "wales" else names.get(name.strip().lower())


def ratio(num, den, scale=100.0):
    return {k: scale * num[k] / den[k] for k in num if k in den and den[k]}


def put(iid, year, values):
    missing = [k for k in LAS + [WALES] if k not in values]
    if missing:
        print("DROP", iid, "missing", missing)
        return
    RESULT[iid] = {"year": year, "values": {k: round(values[k], 3) for k in LAS + [WALES]}}


def welsh_medium_pupils(names):
    rows = [r for r in sw_rows("aedd6ec5-f557-42d4-b767-8e93e5706663")
            if r["Year"] == "2025/26" and r["Sector"] == "All schools" and r["Data description"] == "Number of pupils"]
    num, den = {}, {}
    for r in rows:
        c = code_of(names, r["Local authority"])
        if not c or r["Data values"] in ("", None):
            continue
        v = float(r["Data values"])
        lang = r["School language"]
        if lang == "All schools":
            den[c] = v
        elif lang.startswith("Welsh medium"):
            num[c] = v
    put("welsh_medium_pupils", "2025/26", ratio(num, den))


def pupils_welsh_home(names):
    num, den = {}, {}
    for r in sw_rows("5f03275f-5999-48c7-bc35-301cdfe351c1"):
        if r["Year"] != "2025/26" or r["Data values"] in ("", None):
            continue
        c = code_of(names, r["Local Authority"])
        if not c:
            continue
        if r["Category"] == "Speaks Welsh at home":
            num[c] = float(r["Data values"])
        elif r["Category"] == "Total":
            den[c] = float(r["Data values"])
    put("welsh_at_home_pupils", "2025/26", ratio(num, den))


def aps(ds, iid, pop_value, year_ending):
    """APS percentage rows for the latest year ending, filtered by the Population/Frequency value."""
    rows = sw_rows(ds)
    vals = {}
    for r in rows:
        if r["Year ending" if "Year ending" in r else "Year"] != year_ending or r["Data description"] != "Percentage":
            continue
        key = r.get("Population") or r.get("Frequency of speaking Welsh")
        if key != pop_value:
            continue
        c = code_of(NAMES, r["Local Authority"]) if not r["Local Authority"].startswith("W") else r["Local Authority"]
        if c and r["Data values"] not in ("", None):
            vals[c] = float(r["Data values"])
    return vals


def daily_welsh():
    v = {}
    for r in sw_rows("f66b78dd-e166-4e8e-9b61-d2a61d0c39e3"):
        if r["Year"] == "31/03/2026" and r["Data description"] == "Percentage" and r["Frequency of speaking Welsh"] == "Daily":
            c = code_of(NAMES, r["Local Authority"])
            if c and r["Data values"]:
                v[c] = float(r["Data values"])
    put("welsh_daily", "year ending 31 March 2026", v)


def aps_can_speak():
    num, den = {}, {}
    for r in sw_rows("d11ca4b4-2cc5-4695-924b-54152498e316"):
        if r["Year ending"] != "30/06/2026" or r["Data description"] != "Number" or r["Data values"] in ("", None):
            continue
        c = code_of(NAMES, r["Local Authority"])
        if not c:
            continue
        if r["Population"] == "Can speak Welsh":
            num[c] = float(r["Data values"])
        elif r["Population"] == "All aged 3 or older":
            den[c] = float(r["Data values"])
    put("welsh_speakers_aps", "year ending 30 June 2026", ratio(num, den))


def census_welsh_skills():
    rows = F.nomis("NM_2050_1", f"geography={F.GEOG}&measures=20100&select=geography_code,c2021_wlang_9,obs_value",
                   "extra_culture_ts032.csv")
    tot, srw = {}, {}
    for r in rows:
        if r["C2021_WLANG_9"] == "0":
            tot[r["GEOGRAPHY_CODE"]] = float(r["OBS_VALUE"])
        elif r["C2021_WLANG_9"] == "2":
            srw[r["GEOGRAPHY_CODE"]] = float(r["OBS_VALUE"])
    put("welsh_literate", "2021", ratio(srw, tot))


def census_identity():
    rows = F.nomis("NM_2046_1", f"geography={F.GEOG}&measures=20100&select=geography_code,c2021_natiduk_17,obs_value",
                   "extra_culture_ts027.csv")
    tot, w = {}, {}
    for r in rows:
        k = [x for x in r if x.startswith("C2021_")][0]
        c = r["GEOGRAPHY_CODE"]
        if r[k] == "0":
            tot[c] = float(r["OBS_VALUE"])
        elif r[k] in ("4", "5"):
            w[c] = w.get(c, 0) + float(r["OBS_VALUE"])
    put("welsh_identity", "2021", ratio(w, tot))


def library_time():
    desc = "Average return travel time to a public library by public transport, minutes"
    v = {}
    for r in sw_rows("c28ab0ec-5893-46c2-a372-98d4058ba415"):
        if r["Data description"] == desc:
            c = code_of(NAMES, r["Area name"])
            if c:
                v[c] = float(r["Data values"])
    put("library_travel", "WIMD 2025", v)


def teachers_welsh_medium(names):
    num, den = {}, {}
    for r in sw_rows("eae9e3f2-c335-454f-a963-f31828591af5"):
        if (r["Year"] != "2025/26" or r["Sector"] != "All schools" or r["Staff Category"] != "Total teachers"
                or r["Welsh Medium Type"] != "All schools" or r["School Language Category"] != "All schools"
                or r["Data values"] in ("", None)):
            continue
        c = code_of(names, r["Local Authority"])
        if not c:
            continue
        if r["Teach Welsh"] == "Total":
            den[c] = float(r["Data values"])
        elif r["Teach Welsh"].startswith("Teaching/Working through the medium of Welsh"):
            num[c] = float(r["Data values"])
    put("welsh_medium_teachers", "2025/26", ratio(num, den))


WFS = "https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json"


def wfs_cached(name, query):
    path = os.path.join(RAWC, name)
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(F.http(f"{WFS}&{query}"))
    return json.load(open(path, encoding="utf-8"))


def la_polygons():
    from shapely.geometry import shape
    d = wfs_cached("la_boundaries.json", "typeNames=inspire-wg:localauthorities")
    polys = {f["properties"]["code"]: shape(f["geometry"]) for f in d["features"]}
    assert sorted(polys) == sorted(LAS), "LA boundary codes differ from the 22 expected"
    return polys


def heritage_density():
    import shapely
    polys = la_polygons()
    area = {k: g.area / 1e6 for k, g in polys.items()}  # km2, British National Grid metres
    area[WALES] = sum(area.values())
    # scheduled monuments: Cadw records carry their unitary authority, so count by name
    alias = {"rhondda cynon taff": "rhondda cynon taf"}
    sam = {}
    seen = set()
    for start in range(0, 5000, 1000):
        d = wfs_cached(f"sam_{start}.json", "typeNames=inspire-wg:Cadw_SAM&propertyName=RecordNumber,UnitaryAuthority"
                       f"&sortBy=RecordNumber&count=1000&startIndex={start}")
        for f in d["features"]:
            rn = f["properties"]["RecordNumber"]
            if rn in seen:
                continue
            seen.add(rn)
            nm = f["properties"]["UnitaryAuthority"].strip().lower()
            c = NAMES.get(alias.get(nm, nm))
            sam[c] = sam.get(c, 0) + 1
    print("scheduled monuments", len(seen), "counted in the 22 LAs:", sum(v for k, v in sam.items() if k in LAS))
    if sum(v for k, v in sam.items() if k in LAS) != len(seen):
        raise RuntimeError("scheduled monuments with an unmatched authority name")
    sam[WALES] = len(seen)
    put("scheduled_monuments", "July 2026",
        {k: 100 * sam[k] / area[k] for k in sam if k in area})
    # recorded historic place names: points, assigned to LAs by point in polygon
    pts_x, pts_y = [], []
    start = 0
    while True:
        d = wfs_cached(f"pn_{start}.json", "typeNames=geonode:rcahmw_historicplacenames_wales_recordednames"
                       f"&propertyName=dwy_east,gog_nrth&count=50000&startIndex={start}")
        for f in d["features"]:
            p = f["properties"]
            if p["dwy_east"] and p["gog_nrth"]:
                pts_x.append(p["dwy_east"])
                pts_y.append(p["gog_nrth"])
        start += 50000
        if start >= d["numberMatched"]:
            break
    pts = shapely.points(pts_x, pts_y)
    cnt = {}
    for k, g in polys.items():
        shapely.prepare(g)
        cnt[k] = int(shapely.contains(g, pts).sum())
    cnt[WALES] = sum(cnt.values())
    print("place names with a location", len(pts_x), "inside the 22 LAs", cnt[WALES])
    put("historic_place_names", "January 2026",
        {k: cnt[k] / area[k] for k in cnt})


if __name__ == "__main__":
    NAMES = F.name_map()
    welsh_medium_pupils(NAMES)
    pupils_welsh_home(NAMES)
    daily_welsh()
    aps_can_speak()
    census_welsh_skills()
    census_identity()
    library_time()
    teachers_welsh_medium(NAMES)
    heritage_density()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({'generated': '2026-11-27', 'indicators': RESULT}, open(OUT, 'w'), indent=1)
    for k, v in RESULT.items():
        x = [v['values'][a] for a in LAS]
        print(k, v['year'], 'min', min(x), 'max', max(x), 'wales', v['values'][WALES])
