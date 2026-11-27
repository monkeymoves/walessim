#!/usr/bin/env python3
"""Map-layer measures for the 22 Welsh local authorities (staging).

Run from the pipeline folder:  python3 -I extra/fetch_spatial.py

Fetches open map layers (DataMapWales WFS and the Forestry Commission
ArcGIS feature service), all requested in British National Grid
(EPSG:27700, metres), and intersects them exactly with the council
boundaries (DataMapWales inspire-wg:localauthorities, drawn to mean high
water).  Areas and lengths are measured in that metric grid.  No
rasterising: every share is an exact polygon or line clip with shapely.

Raw downloads are cached in pipeline/raw/extra/spatial/ (gitignored).
Delete a file there to force a fresh download.

Ancient woodland and scheduled monuments are left to the nature and
culture staging scripts, which compute the same measures.

Writes pipeline/extra/out/spatial.json.
"""
import collections, json, os, re, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
PIPELINE = os.path.dirname(HERE)
sys.path.insert(0, PIPELINE)
import fetch_la_indicators as fli  # noqa: E402  (helpers: http, nomis_one, LAS, WALES)

import numpy as np  # noqa: E402
import shapely  # noqa: E402
from shapely.geometry import shape  # noqa: E402

LAS, WALES = fli.LAS, fli.WALES
ROOT = os.path.dirname(PIPELINE)
RAW = os.path.join(PIPELINE, "raw", "extra", "spatial")
OUT = os.path.join(HERE, "out", "spatial.json")
GENERATED = "2026-11-27"
WFS = "https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
NFI = ("https://services2.arcgis.com/mHXjwgl3OARRqqD4/arcgis/rest/services/"
       "National_Forest_Inventory_GB_2024/FeatureServer/0/query")
os.makedirs(RAW, exist_ok=True)


# ---------------------------------------------------------------- fetching
def cached_json(name, url, data=None):
    path = os.path.join(RAW, name)
    if not os.path.exists(path):
        print("  downloading", name)
        body = fli.http(url, data=data)
        json.loads(body)  # fail loudly on an error page rather than caching it
        with open(path, "wb") as f:
            f.write(body)
        time.sleep(1)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def wfs_layer(layer, sort, props=None, page=10000):
    """All features of a DataMapWales WFS layer in EPSG:27700, paged and cached."""
    stem = layer.replace(":", "_")
    feats, start = [], 0
    while True:
        q = {"typeNames": layer, "outputFormat": "application/json", "srsName": "EPSG:27700",
             "count": page, "startIndex": start, "sortBy": sort}
        if props:
            q["propertyName"] = ",".join(props)
        d = cached_json(f"{stem}_{start}.json", WFS + "&" + urllib.parse.urlencode(q))
        feats += d["features"]
        if len(d["features"]) < page:
            break
        start += page
    print(f"  {layer}: {len(feats)} features")
    return feats


def wfs_count(layer):
    """numberMatched from a hits request (XML), cached as text."""
    path = os.path.join(RAW, layer.replace(":", "_") + "_hits.xml")
    if not os.path.exists(path):
        body = fli.http(WFS + "&" + urllib.parse.urlencode({"typeNames": layer, "resultType": "hits"}))
        with open(path, "wb") as f:
            f.write(body)
    return int(re.search(r'numberMatched="(\d+)"', open(path, encoding="utf-8").read()).group(1))


def geoms(feats):
    g = [shape(f["geometry"]) for f in feats if f.get("geometry")]
    return shapely.make_valid(np.array(g, dtype=object))


# ------------------------------------------------------------ boundaries
def councils():
    feats = wfs_layer("inspire-wg:localauthorities", "code")
    la = {f["properties"]["code"]: shapely.make_valid(shape(f["geometry"])) for f in feats}
    if sorted(la) != sorted(LAS):
        raise RuntimeError("council boundary codes do not match the 22 LAs: " + ",".join(sorted(la)))
    for g in la.values():
        shapely.prepare(g)
    return la


def dissolve(arr):
    """Union overlapping polygons, return the separate parts (polygons only)."""
    u = shapely.union_all(arr)
    parts = shapely.get_parts(u)
    return np.array([p for p in parts if p.geom_type == "Polygon"], dtype=object)


def measure_by_la(la, arr, how):
    """Sum area (how='area') or length (how='length') of arr inside each council."""
    tree = shapely.STRtree(arr)
    fn = shapely.area if how == "area" else shapely.length
    out = {}
    for code, g in la.items():
        idx = tree.query(g, predicate="intersects")
        if len(idx) == 0:
            out[code] = 0.0
            continue
        cand = arr[idx]
        inside = shapely.contains_properly(g, cand)
        total = float(fn(cand[inside]).sum())
        if (~inside).any():
            total += float(fn(shapely.intersection(cand[~inside], g)).sum())
        out[code] = total
    return out


def area_share(la, arr, label, published_ha=None):
    """Percent of each council's area (to mean high water) covered by the dissolved polygons."""
    parts = dissolve(arr)
    inside = measure_by_la(la, parts, "area")
    land = {k: g.area for k, g in la.items()}
    vals = {k: 100 * inside[k] / land[k] for k in LAS}
    vals[WALES] = 100 * sum(inside.values()) / sum(land.values())
    tot_ha = sum(inside.values()) / 1e4
    print(f"  {label}: {tot_ha:,.0f} ha inside Wales of {shapely.area(parts).sum() / 1e4:,.0f} ha fetched, "
          f"{vals[WALES]:.2f}% of Wales" + (f" (published reference {published_ha})" if published_ha else ""))
    return vals, inside


def count_points(la, pts, label=""):
    """Count points per council by point in polygon.  Points just outside every
    council (piers, lighthouses, foreshore) go to the nearest council within 2 km."""
    pts = np.array(pts, dtype=object)
    codes = list(la)
    arr = np.array([la[c] for c in codes], dtype=object)
    tree = shapely.STRtree(arr)
    pi, gi = tree.query(pts, predicate="within")
    assign = {}
    for p, g in zip(pi, gi):
        assign.setdefault(int(p), codes[int(g)])
    missing = [i for i in range(len(pts)) if i not in assign]
    far = 0
    if missing:
        mi, gi2 = tree.query_nearest(pts[missing], max_distance=2000, all_matches=False)
        for m, g in zip(mi, gi2):
            assign[missing[int(m)]] = codes[int(g)]
        far = len(missing) - len(set(int(m) for m in mi))
    counts = collections.Counter(assign.values())
    print(f"  {label}: {len(pts)} points, {len(missing)} outside the high water line "
          f"({len(missing) - far} assigned to the nearest council within 2 km, {far} dropped)")
    return {k: float(counts.get(k, 0)) for k in LAS}, assign


# ------------------------------------------------------------ indicators
IND = {}


def put(iid, year, values):
    IND[iid] = {"year": str(year), "values": {k: values[k] for k in LAS + [WALES] if k in values}}


def woodland(la):
    """NFI GB 2024: woodland category polygons touching Wales (any country tag), clipped exactly."""
    wales = shapely.union_all(list(la.values()))
    zone = shapely.buffer(shapely.simplify(wales, 100), 1000)
    zone = shapely.geometry.polygon.orient(zone, -1.0) if zone.geom_type == "Polygon" else \
        shapely.MultiPolygon([shapely.geometry.polygon.orient(p, -1.0) for p in zone.geoms])
    rings = []
    for p in shapely.get_parts(zone):
        rings.append([list(c) for c in p.exterior.coords])
        rings += [[list(c) for c in r.coords] for r in p.interiors]
    geom = json.dumps({"rings": [[[round(x, 1), round(y, 1)] for x, y in r] for r in rings],
                       "spatialReference": {"wkid": 27700}})
    feats, off, page = [], 0, 2000
    while True:
        body = urllib.parse.urlencode({
            "where": "CATEGORY='Woodland'", "geometry": geom, "geometryType": "esriGeometryPolygon",
            "inSR": 27700, "spatialRel": "esriSpatialRelIntersects", "outFields": "FID,IFT_IOA,COUNTRY,Area_Ha",
            "outSR": 27700, "orderByFields": "FID", "resultOffset": off, "resultRecordCount": page,
            "f": "geojson"}).encode()
        d = cached_json(f"nfi2024_woodland_{off}.json", NFI, data=body)
        feats += d["features"]
        if len(d["features"]) < page and not d.get("properties", {}).get("exceededTransferLimit"):
            break
        if not d["features"]:
            break
        off += len(d["features"])
    ids = [f["properties"]["FID"] for f in feats]
    if len(ids) != len(set(ids)):
        raise RuntimeError("NFI paging returned duplicate features")
    by_country = collections.Counter(f["properties"]["COUNTRY"] for f in feats)
    wales_ha = sum(f["properties"]["Area_Ha"] for f in feats if f["properties"]["COUNTRY"] == "Wales")
    print(f"  NFI 2024 woodland: {len(feats)} polygons {dict(by_country)}; "
          f"tagged Wales {wales_ha:,.0f} ha")
    vals, inside = area_share(la, geoms(feats), "woodland", "Forestry Statistics 2025: 313,000 ha, 15%")
    put("woodland_cover", "2024", vals)


def sssi(la):
    feats = wfs_layer("inspire-nrw:NRW_SSSI", "id", ["id", "sssi_name", "cartesian_area_ha", "geom"])
    if len(feats) != wfs_count("inspire-nrw:NRW_SSSI"):
        raise RuntimeError("SSSI: incomplete download")
    listed_ha = sum(f["properties"]["cartesian_area_ha"] or 0 for f in feats)
    vals, _ = area_share(la, geoms(feats), "SSSI", f"layer's own areas sum to {listed_ha:,.0f} ha incl. intertidal")
    put("sssi_land", "2026", vals)


def protected_landscape(la):
    np_f = wfs_layer("inspire-nrw:NRW_NATIONAL_PARK", "objectid")
    ao_f = wfs_layer("inspire-nrw:NRW_AONB", "AONB_NAME")
    print("  National Parks:", [(f["properties"]["np_name"], round(f["properties"]["area_ha"])) for f in np_f])
    print("  AONBs:", [(f["properties"]["AONB_NAME"], round(f["properties"]["AREA_HA"])) for f in ao_f])
    a, _ = area_share(la, geoms(np_f), "National Parks")
    b, _ = area_share(la, geoms(ao_f), "National Landscapes (AONB)")
    vals, _ = area_share(la, geoms(np_f + ao_f), "National Park or National Landscape")
    put("protected_landscape", "2025", vals)


def rivers(la):
    feats = wfs_layer("geonode:nrw_wfd_river_waterbodies_c3_baseline_classification", "objectid",
                      ["objectid", "wbid", "overallwb", "geom"])
    status = np.array([f["properties"]["overallwb"] for f in feats])
    print("  WFD status counts:", dict(collections.Counter(status)))
    arr = geoms(feats)
    good = np.isin(status, ["High", "Good"])
    tot = measure_by_la(la, arr, "length")
    gd = measure_by_la(la, arr[good], "length")
    vals = {k: 100 * gd[k] / tot[k] for k in LAS}
    vals[WALES] = 100 * sum(gd.values()) / sum(tot.values())
    print(f"  river length inside Wales {sum(tot.values()) / 1000:,.0f} km of "
          f"{shapely.length(arr).sum() / 1000:,.0f} km; good or better {vals[WALES]:.1f}% by length; "
          f"{100 * good.mean():.1f}% of water bodies by count")
    print("  river km per council:", {k: round(tot[k] / 1000) for k in LAS})
    put("river_good_status", "2021", vals)


def heritage(la, pop):
    names = name_lookup()
    land_km2 = {k: g.area / 1e6 for k, g in la.items()}

    lb = wfs_layer("inspire-wg:Cadw_ListedBuildings", "RecordNumber",
                   ["RecordNumber", "Grade", "UnitaryAuthority", "geom"])
    if len(lb) != wfs_count("inspire-wg:Cadw_ListedBuildings"):
        raise RuntimeError("listed buildings: incomplete download")
    pts = [shapely.get_parts(shape(f["geometry"]))[0] for f in lb]
    cnt, assign = count_points(la, pts, label="listed buildings")
    attr = collections.Counter(f["properties"]["UnitaryAuthority"] for f in lb)
    print("  Cadw UnitaryAuthority field:", dict(attr))
    # compare on the first 12 letters: Cadw spells "Rhondda Cynon Taff", ONS "Rhondda Cynon Taf"
    agree = sum(1 for i, f in enumerate(lb) if names.get(assign.get(i), "")[:12] ==
                (f["properties"]["UnitaryAuthority"] or "").lower()[:12])
    print(f"  point in polygon agrees with Cadw's own authority field for {agree} of {len(lb)}")
    tot = sum(cnt.values())
    per_head = {k: 1000 * cnt[k] / pop[k] for k in LAS}
    per_head[WALES] = 1000 * tot / sum(pop[k] for k in LAS)
    per_km = {k: cnt[k] / land_km2[k] for k in LAS}
    per_km[WALES] = tot / sum(land_km2.values())
    print("  listed buildings per council:", {k: int(cnt[k]) for k in LAS}, "total", int(tot))
    put("listed_buildings", "2026", per_head)
    put("listed_buildings_km2", "2026", per_km)


def name_lookup():
    """code -> lower-case English name, from the Nomis names file the main pipeline caches."""
    return {v: k for k, v in fli.name_map().items()}


def main():
    print("== council boundaries")
    la = councils()
    print(f"  22 councils, {sum(g.area for g in la.values()) / 1e6:,.0f} km2 to mean high water")
    pop = fli.nomis_one("NM_2002_1", "nomis_pop_2025.csv", 2025, "c_age=0&gender=0")
    failed = {}
    for name, fn in [("woodland", lambda: woodland(la)), ("sssi", lambda: sssi(la)),
                     ("protected landscape", lambda: protected_landscape(la)), ("rivers", lambda: rivers(la)), ("heritage", lambda: heritage(la, pop))]:
        print("==", name)
        try:
            fn()
        except Exception as e:  # keep going, report at the end
            failed[name] = repr(e)
            print("  FAILED:", repr(e))
    final = {}
    for iid, d in IND.items():
        missing = [k for k in LAS + [WALES] if k not in d["values"]]
        if missing:
            failed[iid] = "missing: " + ",".join(missing)
            continue
        d["values"] = {k: round(v, 4) for k, v in d["values"].items()}
        final[iid] = d
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"generated": GENERATED, "indicators": final}, f, indent=1)
    print("wrote", OUT, len(final), "indicators")
    for iid, d in final.items():
        v = [d["values"][k] for k in LAS]
        print(f"  {iid:22s} {d['year']:6s} min {min(v):8.3f} max {max(v):8.3f} Wales {d['values'][WALES]:8.3f}")
    for k, v in failed.items():
        print("FAILED", k, v)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
