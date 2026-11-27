#!/usr/bin/env python3
"""Nature and floods extra measures for the atlas.  Run from pipeline/:
    python3 -I extra/fetch_nature.py     (or python3 extra/fetch_nature.py)
Raw downloads are cached in pipeline/raw/extra/nature/ (gitignored).  Writes
pipeline/extra/out/nature.json.  Every value is read from a published table or
computed from published tables or layers, as stated in nature.indicators.yaml.
"""
import csv, io, json, os, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.dirname(HERE)
sys.path.insert(0, PIPE)
import fetch_la_indicators as F  # has a __main__ guard
from shapely.geometry import shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

RAW = os.path.join(PIPE, "raw", "extra", "nature")
OUT = os.path.join(HERE, "out", "nature.json")
os.makedirs(RAW, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
LAS, WALES = F.LAS, F.WALES
SW = "https://api.stats.gov.wales/v2/%s/data?format=csv&page_size=10000&page_number=%d"
WFS = ("https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
       "&typeNames=%s&outputFormat=application/json&count=%d&startIndex=%d&sortBy=%s")
IND = {}


def raw(name, url):
    path = os.path.join(RAW, name)
    if not os.path.exists(path) or os.path.getsize(path) < 200:
        print("  downloading", name)
        with open(path, "wb") as f:
            f.write(F.http(url))
        time.sleep(2)
    return path


def sw_rows(ds):
    """All rows of a StatsWales dataset via the public CSV API."""
    out, p = [], 1
    while True:
        t = open(raw(f"sw_{ds[:8]}_p{p}.csv", SW % (ds, p)), encoding="utf-8").read()
        r = list(csv.DictReader(io.StringIO(t)))
        out += r
        if len(r) < 10000:
            return out
        p += 1


def put(iid, year, values, ndp=3):
    assert all(la in values for la in LAS), (iid, [la for la in LAS if la not in values])
    IND[iid] = {"year": year, "values": {k: round(values[k], ndp) for k in LAS + [WALES] if k in values}}


def codes():
    return F.name_map()


# ---------------------------------------------------------------- air quality
def air(names):
    rows = sw_rows("36f88bfb-36a3-4b54-9c24-51dcab107a62")
    for pol, iid in (("NO2", "no2_pop"), ("PM2.5", "pm25_pop")):
        v = {}
        for r in rows:
            if r["Pollutant"] == pol and r["Year"] == "2024":
                c = WALES if r["Area"] == "Wales" else names.get(r["Area"].lower())
                if c:
                    v[c] = float(r["Data values"])
        put(iid, "2024", v)


# ------------------------------------------------- WIMD LSOA values -> LA
def wimd_lsoa():
    """The StatsWales WIMD LSOA dataset has only 'Not available' on its LA rows for
    these indicators, so each LA value is the mean of its LSOA values weighted by
    Census 2021 usual residents (Nomis NM_2028_1, LSOA 2021 within each LA)."""
    rows = sw_rows("2f8dfe38-bfa8-4f61-bc34-1d84d470a940")
    want = {"ndvi_green": "Ambient green space (Normalised Difference Vegetation Index)",
            "noise_exposed": "Population exposed to noise pollution"}
    members = {}
    for la in LAS:
        for r in F.nomis("NM_2028_1", f"geography={la}TYPE151&measures=20100&c_sex=0&select=geography_code,obs_value",
                         f"nomis_lsoa21_pop_in_{la}.csv"):
            members[r["GEOGRAPHY_CODE"]] = (la, float(r["OBS_VALUE"]))
    for iid, ind in want.items():
        num, den, n = {}, {}, {}
        for r in rows:
            c = r["Area code"]
            if c.startswith("W01") and r["Indicator"] == ind and r["Data values"] != "" and c in members:
                la, w = members[c]
                num[la] = num.get(la, 0) + w * float(r["Data values"])
                den[la] = den.get(la, 0) + w
                n[la] = n.get(la, 0) + 1
        print("  ", iid, "LSOAs used", sum(n.values()))
        v = {la: num[la] / den[la] for la in num}
        v[WALES] = sum(num.values()) / sum(den.values())
        put(iid, "WIMD 2025", v)


# ------------------------------------------------------------------- fly-tipping
def flytip(names):
    rows = sw_rows("1d891896-2866-4fe8-a6fd-90f7caea2a24")
    pop = F.nomis_one("NM_2002_1", "nomis_pop_2024.csv", 2024, "c_age=0&gender=0")
    v = {}
    for r in rows:
        if r["Year"] == "2024-25" and r["Variable"] == "Total recorded incidents":
            c = WALES if r["Area"] == "Wales" else names.get(r["Area"].lower())
            if c:
                v[c] = 1000 * float(r["Data values"]) / pop[c]
    put("flytipping_rate", "2024-25", v)


# ------------------------------------------------------ ancient woodland (GIS)
def wfs_all(layer, name, page, sort):
    feats, start = [], 0
    while True:
        p = raw(f"{name}_{start}.json", WFS % (layer, page, start, sort))
        d = json.load(open(p))
        feats += d["features"]
        if len(d["features"]) < page:
            return feats
        start += page


def ancient_woodland():
    la = json.load(open(raw("la_bound.json",
        "https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
        "&typeNames=inspire-wg:localauthorities&outputFormat=application/json")))
    lag = {f["properties"]["code"]: shape(f["geometry"]).buffer(0) for f in la["features"]}
    assert set(lag) == set(LAS)
    feats = wfs_all("inspire-nrw:NRW_ANCIENT_WOODLAND_INVENTORY_2021", "aw", 5000, "unique_id")
    assert len({f["id"] for f in feats}) == len(feats) == 48839, len(feats)
    print("  ancient woodland features", len(feats))
    geoms = [shape(f["geometry"]).buffer(0) for f in feats]
    tree = STRtree(geoms)
    area, tot = {}, {}
    for c, g in lag.items():
        idx = tree.query(g)
        pieces = [geoms[i].intersection(g) for i in idx]
        a = unary_union(pieces).area if pieces else 0.0
        area[c] = 100 * a / g.area
        tot[c] = (a, g.area)
    area[WALES] = 100 * sum(a for a, _ in tot.values()) / sum(b for _, b in tot.values())
    put("ancient_woodland", "2021 inventory", area)


def main():
    names = codes()
    air(names)
    wimd_lsoa()
    flytip(names)
    ancient_woodland()
    for k, v in IND.items():
        vals = [v["values"][a] for a in LAS]
        print(f"{k:18s} {v['year']:14s} min {min(vals):8.2f} max {max(vals):8.2f} Wales {v['values'].get(WALES)}")
    with open(OUT, "w") as f:
        json.dump({"generated": datetime.date.today().isoformat(), "indicators": IND}, f, indent=1)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
