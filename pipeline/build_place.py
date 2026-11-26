"""Build a place data file for Etifeddiaeth: model/data/places/<id>.json (zoomed real-data view of one place).

Generalised from design/scripts/build_rhondda_data.py. Same km frame as the national map
(design/scripts/build_mock_data.py):
  x_km = (lon + 5.40) * 111.32 * cos(radians(52.4))
  y_km = (53.50 - lat) * 111.2        (y grows southward)

Usage:
  python3 -I build_place.py <place_id> <lat_s> <lon_w> <lat_n> <lon_e> [--fetch] [--raw DIR] [--out FILE]

Raw inputs live in pipeline/raw/<place_id>/ (gitignored). With --fetch, missing files are downloaded
(generic User-Agent, backoff on Overpass); otherwise they must already exist:
  tiles13/t_<x>_<y>.png          AWS Terrain Tiles, terrarium encoding, zoom 13
  osm.json osm2.json osm3.json   Overpass extracts (OpenStreetMap, ODbL): osm3 = stations, bus stops, routes
  bgs_landslides.json            BGS National Landslide Database index (OGL)
  wfs_NRW_FLOODZONE_RIVERS.json  NRW Flood Map for Planning river zones (DataMapWales WFS)
  wfs_wimd2019_overall.json      WIMD 2019 overall rank by LSOA (DataMapWales WFS)
  wfs_NRW_MINING_WASTE_CLOSED_SITES.json  NRW closed mining waste inventory (may be empty)
The PROFILE (coal for rhondda, slate otherwise) sets the industrial-heritage focus and the notes.
"""
import argparse
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import linemerge, polygonize, unary_union

ap = argparse.ArgumentParser()
ap.add_argument("place_id")
ap.add_argument("lat_s", type=float)
ap.add_argument("lon_w", type=float)
ap.add_argument("lat_n", type=float)
ap.add_argument("lon_e", type=float)
ap.add_argument("--fetch", action="store_true")
ap.add_argument("--raw")
ap.add_argument("--out")
ARGS = ap.parse_args()
PID = ARGS.place_id
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = ARGS.raw or os.path.join(HERE, "raw", PID)
OUT = ARGS.out or os.path.join(HERE, "..", "model", "data", "places", PID + ".json")
FETCHED = time.strftime("%Y-%m-%d")
UA = "etifeddiaeth-pipeline/0.1"
PROFILE = "coal" if PID == "rhondda" else "slate"

# ---- frame ------------------------------------------------------------------
KX = 111.32 * math.cos(math.radians(52.4))
KY = 111.2
LON_W, LON_E, LAT_S, LAT_N = ARGS.lon_w, ARGS.lon_e, ARGS.lat_s, ARGS.lat_n


def proj(lon, lat):
    return ((lon + 5.40) * KX, (53.50 - lat) * KY)


X0, Y0 = proj(LON_W, LAT_N)  # top-left (north-west)
X1, Y1 = proj(LON_E, LAT_S)  # bottom-right (south-east)
CLIP = box(X0, Y0, X1, Y1)
R3 = lambda v: round(v, 3)  # noqa: E731
Z = 13
N = 2 ** Z


def tile_xy(lon, lat):
    return (int((lon + 180) / 360 * N),
            int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * N))


TX0, TY0 = tile_xy(LON_W, LAT_N)
TX1, TY1 = tile_xy(LON_E, LAT_S)


# ---- fetch ---------------------------------------------------------------------
def http(url, data=None, tries=6, timeout=300):
    wait = 20
    for i in range(tries):
        req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as ex:  # noqa: BLE001
            print("  retry", i + 1, str(ex)[:100], flush=True)
            time.sleep(wait)
            wait = min(wait * 2, 240)
    raise RuntimeError("failed: " + url[:100])


def overpass_queries():
    bb = f"{LAT_S},{LON_W},{LAT_N},{LON_E}"
    q1 = f"""[out:json][timeout:240][bbox:{bb}];
(
  way["building"];
  way["highway"];
  way["railway"]; way["disused:railway"]; way["abandoned:railway"];
  way["waterway"];
  way["natural"="water"]; relation["natural"="water"];
  way["landuse"]; relation["landuse"];
  way["natural"~"^(wood|grassland|heath|scrub|scree|bare_rock|wetland)$"]; relation["natural"~"^(wood|grassland|heath|scrub|wetland)$"];
  nwr["man_made"="spoil_heap"];
  nwr["historic"~"^(mine|mine_shaft|colliery|mine_adit|quarry)$"];
  nwr["man_made"~"^(mineshaft|adit|winding_wheel|headframe)$"];
  nwr["landuse"="industrial"]["industrial"="mine"];
  node["place"~"^(town|village|suburb|hamlet|neighbourhood|locality)$"];
  nwr["amenity"~"^(school|hospital|clinic|doctors|place_of_worship|community_centre|library|social_centre)$"];
  nwr["building"~"^(school|hospital|church|chapel)$"]["name"];
  nwr["name"~"(Institute|Workmen|Miners|Welfare)"];
);
out geom qt;
"""
    q2 = f"""[out:json][timeout:120][bbox:{bb}];
(
  nwr["name"~"Colliery|Glofa|Pit$|Tip$|Tips$|Heritage Park|Level$|Quarry|Chwarel|Slate|Llechi"];
  nwr["historic"];
  nwr["tourism"="museum"];
  nwr["disused:man_made"]; nwr["abandoned:man_made"];
  nwr["disused:landuse"]; nwr["abandoned:landuse"];
  nwr["landuse"="landfill"];
  nwr["natural"="bare_rock"];
  node["place"="city"];
);
out geom qt;
"""
    q3 = f"""[out:json][timeout:180][bbox:{bb}];
(
  nwr["railway"~"^(station|halt)$"];
  nwr["public_transport"="station"];
  node["highway"="bus_stop"];
  nwr["public_transport"="platform"]["bus"="yes"];
  relation["route"="bus"];
  relation["route"~"^(train|railway|tracks)$"];
);
out geom({bb}) qt;
"""
    return {"osm.json": q1, "osm2.json": q2, "osm3.json": q3}


def fetch_all():
    os.makedirs(f"{RAW}/tiles13", exist_ok=True)
    for tx in range(TX0, TX1 + 1):
        for ty in range(TY0, TY1 + 1):
            f = f"{RAW}/tiles13/t_{tx}_{ty}.png"
            if not os.path.exists(f):
                open(f, "wb").write(http(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png"))
    for fn, q in overpass_queries().items():
        f = f"{RAW}/{fn}"
        if not os.path.exists(f):
            print("overpass", fn, flush=True)
            body = http("https://overpass-api.de/api/interpreter", urllib.parse.urlencode({"data": q}).encode())
            json.loads(body)
            open(f, "wb").write(body)
            time.sleep(10)
    bbox_wfs = f"{LON_W - 0.01},{LAT_S - 0.01},{LON_E + 0.01},{LAT_N + 0.01},EPSG:4326"
    for layer, fn in (("inspire-nrw:NRW_FLOODZONE_RIVERS", "wfs_NRW_FLOODZONE_RIVERS.json"),
                      ("inspire-wg:wimd2019_overall", "wfs_wimd2019_overall.json"),
                      ("inspire-nrw:NRW_MINING_WASTE_CLOSED_SITES", "wfs_NRW_MINING_WASTE_CLOSED_SITES.json")):
        f = f"{RAW}/{fn}"
        if not os.path.exists(f):
            qs = urllib.parse.urlencode({"service": "WFS", "version": "1.0.0", "request": "GetFeature", "typeName": layer,
                                         "outputFormat": "application/json", "srsName": "EPSG:4326", "bbox": bbox_wfs})
            open(f, "wb").write(http("https://datamap.gov.wales/geoserver/ows?" + qs))
    f = f"{RAW}/bgs_landslides.json"
    if not os.path.exists(f):
        qs = urllib.parse.urlencode({"f": "json", "limit": 5000, "bbox": f"{LON_W},{LAT_S},{LON_E},{LAT_N}"})
        open(f, "wb").write(http("https://ogcapi.bgs.ac.uk/collections/landslideindex/items?" + qs))


if ARGS.fetch:
    fetch_all()


def ring_out(coords):
    """List of [x, y] rounded to 3 dp, closing point dropped, consecutive duplicates removed."""
    pts = []
    for x, y in coords:
        p = [R3(x), R3(y)]
        if not pts or p != pts[-1]:
            pts.append(p)
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    return pts


def line_out(coords):
    pts = []
    for x, y in coords:
        p = [R3(x), R3(y)]
        if not pts or p != pts[-1]:
            pts.append(p)
    return pts


def polys_of(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    if isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]


def lines_of(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == "LineString":
        return [geom]
    return [g for g in getattr(geom, "geoms", []) if g.geom_type == "LineString"]


def poly_rings(p, min_hole=0.0):
    rings = [ring_out(p.exterior.coords)]
    for h in p.interiors:
        if Polygon(h).area >= min_hole:
            r = ring_out(h.coords)
            if len(r) >= 3:
                rings.append(r)
    return rings


# ---- elevation ----------------------------------------------------------------
mosaic = np.zeros(((TY1 - TY0 + 1) * 256, (TX1 - TX0 + 1) * 256))
for tx in range(TX0, TX1 + 1):
    for ty in range(TY0, TY1 + 1):
        a = np.asarray(Image.open(f"{RAW}/tiles13/t_{tx}_{ty}.png").convert("RGB")).astype(np.float64)
        e = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
        mosaic[(ty - TY0) * 256:(ty - TY0 + 1) * 256, (tx - TX0) * 256:(tx - TX0 + 1) * 256] = e

CELL = 0.05  # km
GW = int(round((X1 - X0) / CELL))
GH = int(round((Y1 - Y0) / CELL))
xs = X0 + (np.arange(GW) + 0.5) * CELL
ys = Y0 + (np.arange(GH) + 0.5) * CELL
lon = xs / KX - 5.40
lat = 53.50 - ys / KY
px = (lon + 180) / 360 * N * 256 - TX0 * 256 - 0.5
py = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * N * 256 - TY0 * 256 - 0.5
PX, PY = np.meshgrid(px, py)
ix, iy = np.floor(PX).astype(int), np.floor(PY).astype(int)
ix, iy = np.clip(ix, 0, mosaic.shape[1] - 2), np.clip(iy, 0, mosaic.shape[0] - 2)  # edge pixels clamp to the mosaic
fx, fy = PX - ix, PY - iy
m = mosaic
elev = (m[iy, ix] * (1 - fx) * (1 - fy) + m[iy, ix + 1] * fx * (1 - fy)
        + m[iy + 1, ix] * (1 - fx) * fy + m[iy + 1, ix + 1] * fx * fy)
grid = np.round(elev).astype(int)

# ---- OSM --------------------------------------------------------------------------
elements = {}
for fn in ("osm.json", "osm2.json", "osm3.json"):
    for e in json.load(open(f"{RAW}/{fn}"))["elements"]:
        elements[(e["type"], e["id"])] = e
elements = list(elements.values())


def way_xy(e):
    return [proj(g["lon"], g["lat"]) for g in e.get("geometry", []) if g]


def area_geom(e):
    """Polygon (km frame) for a closed way or a multipolygon relation, else None."""
    if e["type"] == "way":
        pts = way_xy(e)
        if len(pts) >= 4 and pts[0] == pts[-1]:
            p = Polygon(pts)
            return p if p.is_valid else p.buffer(0)
        return None
    if e["type"] == "relation":
        outer, inner = [], []
        for mbr in e.get("members", []):
            if mbr.get("type") != "way" or not mbr.get("geometry"):
                continue
            pts = [proj(g["lon"], g["lat"]) for g in mbr["geometry"] if g]
            if len(pts) >= 2:
                (inner if mbr.get("role") == "inner" else outer).append(LineString(pts))
        if not outer:
            return None
        o = unary_union(list(polygonize(unary_union(outer))))
        if inner:
            i = unary_union(list(polygonize(unary_union(inner))))
            o = o.difference(i)
        return o if not o.is_empty else None
    return None


def point_of(e):
    if e["type"] == "node":
        return Point(proj(e["lon"], e["lat"]))
    g = area_geom(e)
    if g is not None and not g.is_empty:
        return g.representative_point()
    pts = way_xy(e)
    if pts:
        return LineString(pts).interpolate(0.5, normalized=True) if len(pts) > 1 else Point(pts[0])
    b = e.get("bounds")
    if b:
        return Point(proj((b["minlon"] + b["maxlon"]) / 2, (b["minlat"] + b["maxlat"]) / 2))
    return None


def tags(e):
    return e.get("tags", {})


buildings, roads, rail, rivers, water, landuse = [], [], [], [], [], []
places, facilities, collieries, tips = [], [], [], []

ROAD_CLASS = {}
for k in ("motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link", "secondary_link"):
    ROAD_CLASS[k] = "major"
for k in ("tertiary", "tertiary_link", "unclassified", "road"):
    ROAD_CLASS[k] = "minor"
for k in ("residential", "living_street", "pedestrian"):
    ROAD_CLASS[k] = "residential"
ROAD_CLASS["service"] = "service"
ROAD_CLASS["track"] = "track"
for k in ("footway", "path", "cycleway", "bridleway", "steps"):
    ROAD_CLASS[k] = "path"

LANDUSE_CLASS = {
    ("landuse", "forest"): "woodland", ("natural", "wood"): "woodland",
    ("natural", "grassland"): "grassland", ("landuse", "grass"): "grassland", ("landuse", "meadow"): "grassland",
    ("natural", "heath"): "heath", ("natural", "scrub"): "scrub",
    ("natural", "wetland"): "wetland", ("natural", "scree"): "rock", ("natural", "bare_rock"): "rock",
    ("landuse", "residential"): "residential",
    ("landuse", "industrial"): "industrial", ("landuse", "commercial"): "commercial", ("landuse", "retail"): "commercial",
    ("landuse", "quarry"): "quarry", ("landuse", "landfill"): "landfill", ("landuse", "brownfield"): "brownfield",
    ("landuse", "farmland"): "farmland", ("landuse", "farmyard"): "farmland",
    ("landuse", "cemetery"): "cemetery", ("landuse", "allotments"): "allotments",
    ("landuse", "recreation_ground"): "recreation",
}
RAIL_STATUS = {"rail": "active", "preserved": "heritage", "disused": "disused", "abandoned": "abandoned", "dismantled": "dismantled",
               "razed": "dismantled", "construction": "construction", "light_rail": "active", "narrow_gauge": "active"}
WATERWAYS = {"river", "stream", "canal", "derelict_canal", "drain", "ditch"}
PLACE_KINDS = {"city", "town", "village", "suburb", "hamlet", "neighbourhood"}
FAC_AMENITY = {"school": "school", "hospital": "hospital", "clinic": "clinic", "doctors": "doctors",
               "place_of_worship": "place_of_worship", "community_centre": "community_centre",
               "social_centre": "community_centre", "library": "library"}
INSTITUTE_RE = re.compile(r"Institute|Workmen|Workmens|Miners|Welfare", re.I)
COLLIERY_RE = re.compile(r"Colliery|Glofa", re.I)
QUARRY_RE = re.compile(r"Quarry|Quarries|Chwarel|\bSlate\b|\bLlechi\b|\bMine\b|\bLevel$", re.I)
TIPNAME_RE = re.compile(r"\btips?\b|\bwaste\b|tomen|spoil|rubbish", re.I)

seen_fac = []
counts_dropped = {"small_buildings": 0}

for e in elements:
    t = tags(e)
    # buildings ---------------------------------------------------------------
    if "building" in t and e["type"] == "way":
        g = area_geom(e)
        if g is not None and g.intersects(CLIP):
            if g.area < 0.000012:  # under 12 m2: sheds, outhouses
                counts_dropped["small_buildings"] += 1
            else:
                for p in polys_of(g.simplify(0.0012, preserve_topology=True)):
                    r = ring_out(p.exterior.coords)
                    if len(r) >= 3:
                        buildings.append(r)
    # roads ---------------------------------------------------------------------
    hw = t.get("highway")
    if hw in ROAD_CLASS and e["type"] == "way":
        if hw == "service" and t.get("service") in ("driveway", "parking_aisle", "drive-through"):
            pass
        elif hw == "footway" and t.get("footway") in ("sidewalk", "crossing"):
            pass
        else:
            pts = way_xy(e)
            if len(pts) >= 2:
                gl = LineString(pts).intersection(CLIP)
                for ln in lines_of(gl):
                    cls_ = ROAD_CLASS[hw]
                    if cls_ in ("path", "service") and ln.length < 0.04:  # short stubs under 40 m
                        continue
                    c = line_out(ln.simplify(0.01 if cls_ in ("path", "track") else 0.003).coords)
                    if len(c) >= 2:
                        o = {"class": cls_, "pts": c}
                        if t.get("ref"):
                            o["ref"] = t["ref"]
                        if t.get("name") and (cls_ in ("major", "minor") or hw == "cycleway" or t.get("ncn_ref")):
                            o["name"] = t["name"]
                        if hw == "cycleway" or t.get("ncn_ref") or t.get("route") == "bicycle":
                            o["cycle"] = True
                            if t.get("ncn_ref"):
                                o["ncn"] = t["ncn_ref"]
                        roads.append(o)
    # rail ------------------------------------------------------------------------
    rw = t.get("railway")
    lifecycle = None
    if rw is None and e["type"] == "way":  # lifecycle-prefixed tags: disused:railway=rail etc.
        for pre, st in (("disused:railway", "disused"), ("abandoned:railway", "abandoned")):
            if t.get(pre):
                rw, lifecycle = st, st
    if rw in RAIL_STATUS and e["type"] == "way":
        pts = way_xy(e)
        if len(pts) >= 2:
            for ln in lines_of(LineString(pts).intersection(CLIP)):
                c = line_out(ln.simplify(0.003).coords)
                if len(c) >= 2:
                    o = {"status": RAIL_STATUS[rw], "railway": rw, "pts": c}
                    if t.get("disused:railway") or t.get("abandoned:railway"):
                        o["was"] = t.get("disused:railway") or t.get("abandoned:railway")
                    if t.get("gauge"):
                        o["gauge"] = t["gauge"]
                    if t.get("service"):
                        o["service"] = t["service"]
                    if t.get("usage"):
                        o["usage"] = t["usage"]
                    if t.get("name"):
                        o["name"] = t["name"]
                    rail.append(o)
    # waterways -------------------------------------------------------------------
    ww = t.get("waterway")
    if ww in WATERWAYS and e["type"] == "way":
        pts = way_xy(e)
        if len(pts) >= 2:
            for ln in lines_of(LineString(pts).intersection(CLIP)):
                c = line_out(ln.simplify(0.004 if ww == "river" else 0.008).coords)
                if len(c) >= 2:
                    o = {"kind": ww, "pts": c}
                    if t.get("name"):
                        o["name"] = t["name"]
                    if t.get("name:cy"):
                        o["cy"] = t["name:cy"]
                    if t.get("tunnel") in ("culvert", "yes"):
                        o["culvert"] = True
                    rivers.append(o)
    # water bodies -----------------------------------------------------------------
    if t.get("natural") == "water" or t.get("landuse") == "reservoir":
        g = area_geom(e)
        if g is not None:
            for p in polys_of(g.intersection(CLIP).simplify(0.004, preserve_topology=True)):
                if p.area > 0.00005:
                    o = {"kind": t.get("water", "water"), "rings": poly_rings(p)}
                    if t.get("name"):
                        o["name"] = t["name"]
                    water.append(o)
    # landuse / natural cover ------------------------------------------------------
    cls = None
    for k in ("landuse", "natural"):
        if (k, t.get(k)) in LANDUSE_CLASS:
            cls = LANDUSE_CLASS[(k, t[k])]
            raw = f"{k}={t[k]}"
            break
    if cls:
        g = area_geom(e)
        if g is not None:
            for p in polys_of(g.intersection(CLIP).simplify(0.01, preserve_topology=True)):
                if p.area > 0.001:  # 1000 m2
                    o = {"class": cls, "osm": raw, "rings": poly_rings(p, min_hole=0.001)}
                    if t.get("name"):
                        o["name"] = t["name"]
                    landuse.append(o)
    # places ------------------------------------------------------------------------
    if e["type"] == "node" and t.get("place") in PLACE_KINDS and t.get("name"):
        x, y = proj(e["lon"], e["lat"])
        if CLIP.contains(Point(x, y)):
            places.append({"en": t["name"], "cy": t.get("name:cy"), "kind": t["place"], "x": R3(x), "y": R3(y)})
    # facilities ---------------------------------------------------------------------
    kind = None
    am = t.get("amenity")
    name = t.get("name") or ""
    if "highway" not in t and "man_made" not in t and name and INSTITUTE_RE.search(name) and (
            "building" in t or am in ("pub", "community_centre", "social_centre", "bar") or "club" in t):
        kind = "institute"
    elif am in FAC_AMENITY:
        kind = FAC_AMENITY[am]
    elif t.get("building") in ("school", "hospital") and name:
        kind = t["building"]
    if kind:
        pt = point_of(e)
        if pt is not None and CLIP.contains(pt):
            dup = any(f["name"] == (name or None) and abs(f["x"] - pt.x) < 0.15 and abs(f["y"] - pt.y) < 0.15
                      for f in seen_fac if name)
            if not dup:
                o = {"name": name or None, "cy": t.get("name:cy"), "kind": kind, "x": R3(pt.x), "y": R3(pt.y)}
                if kind == "place_of_worship":
                    o["religion"] = t.get("religion")
                    if t.get("denomination"):
                        o["denomination"] = t["denomination"]
                if am and kind == "institute":
                    o["amenity"] = am
                if t.get("description"):
                    o["description"] = t["description"]
                facilities.append(o)
                seen_fac.append(o)
    # collieries (OSM only; thin) -------------------------------------------------------
    if PROFILE == "coal":
        is_coll = (t.get("historic") in ("mine", "colliery", "mine_shaft") and "heap" not in (t.get("man_made") or "")) \
            or (t.get("man_made") in ("mineshaft", "adit") and COLLIERY_RE.search(name)) \
            or (COLLIERY_RE.search(name) and "building" in t) \
            or COLLIERY_RE.search(t.get("addr:housename", ""))
    else:  # slate: quarries, mines, adits (points and polygons; polygons reduced to a representative point)
        is_coll = (t.get("historic") in ("quarry", "mine", "mine_shaft", "mine_adit") or t.get("man_made") in ("adit", "mineshaft")
                   or (QUARRY_RE.search(name) and ("building" in t or t.get("landuse") == "quarry" or t.get("historic"))))
    if is_coll and "highway" not in t and t.get("man_made") != "street_cabinet":
        pt = point_of(e)
        if pt is not None and CLIP.contains(pt):
            o = {"name": name or None, "x": R3(pt.x), "y": R3(pt.y), "source": "OSM", "osm": f"{e['type']}/{e['id']}"}
            if t.get("man_made"):
                o["feature"] = t["man_made"]
            elif "building" in t:
                o["feature"] = "building"
            if t.get("addr:housename"):
                o["note"] = f"OSM addr:housename '{t['addr:housename']}' (site of the colliery)"
            if t.get("historic"):
                o["historic"] = t["historic"]
            collieries.append(o)
    # slate profile: quarry polygons and named tips -> tips ----
    if PROFILE == "slate" and e["type"] != "node" and "highway" not in t and "building" not in t and (
            t.get("landuse") == "quarry" or t.get("disused:landuse") == "quarry" or t.get("abandoned:landuse") == "quarry"
            or (t.get("name") and TIPNAME_RE.search(t["name"]) and (t.get("natural") or t.get("landuse") or t.get("historic")))):
        g = area_geom(e)
        if g is not None:
            gp = polys_of(g.intersection(CLIP).simplify(0.006, preserve_topology=True))
            if gp:
                big = max(gp, key=lambda p: p.area)
                if big.area >= 0.002:
                    c = big.representative_point()
                    live = t.get("landuse") == "quarry"
                    o = {"source": "OSM", "kind": "quarry_osm" if live else "disused_quarry_osm",
                         "osm": f"{e['type']}/{e['id']}", "name": t.get("name"), "rings": poly_rings(big, min_hole=0.002),
                         "x": R3(c.x), "y": R3(c.y), "areaHa": round(big.area * 100, 1),
                         "attrs": {k: v for k, v in t.items() if k in ("landuse", "disused:landuse", "abandoned:landuse", "natural", "name",
                                                                       "name:cy", "resource", "operator", "historic", "description", "note")}}
                    tips.append(o)
    # OSM spoil heaps -> tips ---------------------------------------------------------------
    if t.get("man_made") == "spoil_heap" or t.get("man_made:material") == "spoil_heap" or (
            t.get("man_made") == "heap" and t.get("historic") == "mine"):
        g = area_geom(e)
        o = {"source": "OSM", "kind": "spoil_heap_osm", "osm": f"{e['type']}/{e['id']}",
             "attrs": {k: v for k, v in t.items()}}
        if g is not None:
            gp = polys_of(g.intersection(CLIP).simplify(0.004, preserve_topology=True))
            if gp:
                big = max(gp, key=lambda p: p.area)
                o["rings"] = poly_rings(big)
                c = big.representative_point()
                o["x"], o["y"] = R3(c.x), R3(c.y)
                o["areaHa"] = round(big.area * 100, 1)
        else:
            pt = point_of(e)
            if pt is not None:
                o["x"], o["y"] = R3(pt.x), R3(pt.y)
        if "x" in o:
            tips.append(o)

# ---- public transport: stations, bus stops, bus routes (OSM) ----------------------------
stations, bus_stops, bus_routes = [], [], []
for e in elements:
    t = tags(e)
    if t.get("railway") in ("station", "halt") or t.get("public_transport") == "station":
        pt = point_of(e)
        if pt is None or not CLIP.contains(pt):
            continue
        if t.get("railway") in ("station", "halt") or t.get("train") == "yes":
            kind = "rail_" + t.get("railway", "station")
        elif t.get("bus") == "yes" or t.get("amenity") == "bus_station" or "Bus" in (t.get("name") or ""):
            kind = "bus_station"
        else:
            kind = "station"
        if any(s_["name"] == t.get("name") and s_["kind"] == kind and abs(s_["x"] - pt.x) < 0.2
               and abs(s_["y"] - pt.y) < 0.2 for s_ in stations if t.get("name")):
            continue
        o = {"name": t.get("name"), "cy": t.get("name:cy"), "kind": kind, "x": R3(pt.x), "y": R3(pt.y)}
        if t.get("operator"):
            o["operator"] = t["operator"]
        stations.append(o)
    elif (t.get("highway") == "bus_stop") or (t.get("public_transport") == "platform" and t.get("bus") == "yes"):
        pt = point_of(e)
        if pt is None or not CLIP.contains(pt):
            continue
        nm = t.get("name")
        if any(b_["name"] == nm and abs(b_["x"] - pt.x) < 0.03 and abs(b_["y"] - pt.y) < 0.03 for b_ in bus_stops):
            continue
        o = {"name": nm, "x": R3(pt.x), "y": R3(pt.y)}
        if t.get("name:cy"):
            o["cy"] = t["name:cy"]
        bus_stops.append(o)
    elif e["type"] == "relation" and t.get("route") == "bus":
        segs = []
        for mbr in e.get("members", []):
            if mbr.get("type") == "way" and mbr.get("role", "") in ("", "forward", "backward") and mbr.get("geometry"):
                pts = [proj(g["lon"], g["lat"]) for g in mbr["geometry"] if g]
                if len(pts) >= 2:
                    segs.append(LineString(pts))
        if not segs:
            continue
        merged = linemerge(unary_union(segs)).intersection(CLIP)
        lines = [line_out(ln.simplify(0.008).coords) for ln in lines_of(merged) if ln.length > 0.05]
        lines = [c for c in lines if len(c) >= 2]
        if lines:
            bus_routes.append({"ref": t.get("ref"), "name": t.get("name"), "operator": t.get("operator"),
                               "from": t.get("from"), "to": t.get("to"), "osm": f"relation/{e['id']}",
                               "lengthKmInBbox": round(sum(ln.length for ln in lines_of(merged)), 1), "lines": lines})

# ---- BGS landslide records that name or describe a tip --------------------------------
TIP_RE = re.compile(r"\btips?\b|spoil|colliery waste", re.I)
seen = set()
bgs = json.load(open(f"{RAW}/bgs_landslides.json"))["features"]
tip_slides = []
for f in bgs:
    p = f["properties"]
    if p["ls_id"] in seen:
        continue
    seen.add(p["ls_id"])
    text = f"{p.get('landslide_name') or ''} {p.get('locality_details') or ''}"
    if not TIP_RE.search(text):
        continue
    lon_, lat_ = f["geometry"]["coordinates"][:2]
    x, y = proj(lon_, lat_)
    if not CLIP.contains(Point(x, y)):
        continue
    nm = p.get("landslide_name") or ""
    on_tip = bool(re.search(r"\btips?\b|spoil|colliery waste", nm, re.I))
    tips.append({
        "source": "BGS National Landslide Database",
        "kind": "tip_landslide_record" if on_tip else "landslide_near_tip",
        "x": R3(x), "y": R3(y),
        "attrs": {"name": nm, "locality": p.get("locality_details"), "bgs_ls_id": int(p["ls_id"]),
                  "first_known_year": None if p.get("first_known_date_year") in (None, "UNKNOWN") else p["first_known_date_year"],
                  "precision_m": p.get("plus_or_minus_metres")},
    })

# ---- NRW closed mining waste inventory (may be empty for a place) ------------------------------
mw_path = f"{RAW}/wfs_NRW_MINING_WASTE_CLOSED_SITES.json"
mw_n = 0
if os.path.exists(mw_path):
    try:
        mw = json.load(open(mw_path)).get("features", [])
    except ValueError:
        mw = []
    for f in mw:
        g = f.get("geometry")
        if not g:
            continue
        if g["type"] == "Point":
            x, y = proj(*g["coordinates"][:2])
            o = {"x": R3(x), "y": R3(y)}
        else:
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            u = unary_union([Polygon([proj(lo, la) for lo, la, *_ in pl[0]]).buffer(0) for pl in polys])
            u = u.intersection(CLIP).simplify(0.004, preserve_topology=True)
            gp = polys_of(u)
            if not gp:
                continue
            big = max(gp, key=lambda p: p.area)
            c = big.representative_point()
            o = {"rings": poly_rings(big), "x": R3(c.x), "y": R3(c.y), "areaHa": round(big.area * 100, 1)}
        if not CLIP.contains(Point(o["x"], o["y"])):
            continue
        o.update({"source": "NRW Inventory of Closed Mining Waste Facilities", "kind": "mining_waste_closed_site",
                  "attrs": {k: v for k, v in f.get("properties", {}).items() if v not in (None, "")}})
        tips.append(o)
        mw_n += 1

# ---- NRW flood zones (rivers) -------------------------------------------------------------
fz = json.load(open(f"{RAW}/wfs_NRW_FLOODZONE_RIVERS.json"))["features"]
by_zone = {}
for f in fz:
    z = f["properties"]["risk"]
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in polys:
        shell = [proj(lo, la) for lo, la, *_ in poly[0]]
        holes = [[proj(lo, la) for lo, la, *_ in r] for r in poly[1:]]
        if len(shell) >= 4:
            pg = Polygon(shell, holes)
            by_zone.setdefault(z, []).append(pg if pg.is_valid else pg.buffer(0))
flood = []
cy_zone = {"Flood Zone 2": "Parth Llifogydd 2", "Flood Zone 3": "Parth Llifogydd 3"}
for z, ps in sorted(by_zone.items()):
    u = unary_union([p.buffer(0.001) for p in ps]).buffer(-0.001).intersection(CLIP)
    u = u.simplify(0.01, preserve_topology=True)
    for p in polys_of(u):
        if p.area > 0.0005:
            flood.append({"zone": z, "cy": cy_zone.get(z), "rings": poly_rings(p, min_hole=0.0005)})

# ---- WIMD 2019 overall by LSOA ---------------------------------------------------------------
lsoas = []
for f in json.load(open(f"{RAW}/wfs_wimd2019_overall.json"))["features"]:
    p = f["properties"]
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    shp = unary_union([Polygon([proj(lo, la) for lo, la, *_ in poly[0]],
                               [[proj(lo, la) for lo, la, *_ in r] for r in poly[1:]]).buffer(0) for poly in polys])
    shp = shp.intersection(CLIP).simplify(0.02, preserve_topology=True)
    parts = [poly_rings(q) for q in polys_of(shp) if q.area > 0.001]
    if parts:
        c = shp.representative_point()
        lsoas.append({"code": p["lsoa_code"], "en": p["lsoa_name_en"], "cy": p["lsoa_name_cy"],
                      "wimdRank": p["rank"], "decile": p["decile"], "x": R3(c.x), "y": R3(c.y), "polys": parts})

# ---- write --------------------------------------------------------------------------------------
PLACE_NAMES = {"rhondda": ("Rhondda", "Y Rhondda"), "bethesda": ("Bethesda and Dyffryn Ogwen", "Bethesda a Dyffryn Ogwen")}
PNAME = PLACE_NAMES.get(PID, (PID, PID))
note = {
    "status": "Prototype data from real sources, simplified. Not for any decision about real tips, quarries or flood risk.",
    "place": {"id": PID, "en": PNAME[0], "cy": PNAME[1], "profile": PROFILE},
    "fetched": FETCHED,
    "builtBy": "pipeline/build_place.py",
    "frame": "Same km frame as the national map: x=(lon+5.40)*111.32*cos(52.4 deg), y=(53.50-lat)*111.2. "
             "y grows southward. Polygon rings are implicitly closed (last point not repeated). "
             "Coordinates rounded to 0.001 km.",
    "sources": [
        {"layers": "elevation", "what": "AWS Terrain Tiles (Mapzen terrarium), zoom 13, bilinear to 50 m",
         "url": "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
         "licence": "Open; attribution per https://github.com/tilezen/joerd/blob/master/docs/attribution.md "
                    "(GB coverage includes Copernicus EU-DEM / SRTM derived data)"},
        {"layers": "buildings, roads, rail, rivers, water, landuse, places, facilities, "
                   + ("collieries" if PROFILE == "coal" else "quarries")
                   + ", tips[source=OSM], stations, busStops, busRoutes",
         "what": "OpenStreetMap via Overpass API (three queries)", "url": "https://overpass-api.de/api/interpreter",
         "licence": "ODbL 1.0", "attribution": "© OpenStreetMap contributors, ODbL"},
        {"layers": "tips[source=BGS National Landslide Database]",
         "what": "BGS National Landslide Database index, records whose name or locality mentions a tip or spoil. "
                 "These are landslide records on or near tips, NOT tip outlines.",
         "url": "https://ogcapi.bgs.ac.uk/collections/landslideindex",
         "licence": "Open Government Licence v3.0 (per BGS)",
         "attribution": "Contains British Geological Survey materials © UKRI 2026"},
        {"layers": "flood", "what": "NRW Flood Map for Planning: River Flood Zones 2 and 3, dissolved and simplified",
         "url": "https://datamap.gov.wales/geoserver/ows (layer inspire-nrw:NRW_FLOODZONE_RIVERS)",
         "licence": "DataMapWales licence field blank; NRW attribution statement applies (believed OGL, verify)",
         "attribution": "Contains Natural Resources Wales information © Natural Resources Wales and database right. "
                        "All rights reserved. Contains OS data © Crown copyright and database right."},
        {"layers": "lsoas", "what": "Welsh Index of Multiple Deprivation 2019, overall rank (1 = most deprived of 1909)",
         "url": "https://datamap.gov.wales/geoserver/ows (layer inspire-wg:wimd2019_overall)",
         "licence": "Welsh Government statistics, Open Government Licence (licence field blank on DataMapWales)",
         "attribution": "Welsh Government, WIMD 2019. Contains OS data © Crown copyright and database right."},
    ],
    "busRoutes": "Only the bus route relations mapped in OSM. Coverage is incomplete. Each direction or variant is "
                 "its own entry. busStops are whatever OSM has. rail[].status keeps OSM railway=razed as 'dismantled'; "
                 "disused:railway and abandoned:railway ways are kept with status disused/abandoned and a 'was' field.",
}
if PROFILE == "coal":
    note["coalTips"] = (
        "The official Welsh Government / Mining Remediation Authority 'Disused Coal Tips in Wales' dataset "
        "(DataMapWales map 7548) is marked PERSONAL USE ONLY, not an open dataset, viewing only. It was NOT "
        "downloaded or used. tips[] holds only OSM spoil heaps and BGS tip-related landslide records, each labelled "
        "by source.")
else:
    note["slateTips"] = (
        "No open polygon dataset of slate waste tips was used. tips[] holds, each labelled by source: OSM "
        "landuse=quarry polygons (kind quarry_osm, live or mapped as quarry) and disused/abandoned quarry polygons or "
        "named tip features (disused_quarry_osm), OSM man_made=spoil_heap (spoil_heap_osm), BGS landslide records that "
        "mention a tip or spoil, and NRW closed mining waste inventory sites if any fall in the area "
        "(" + str(mw_n) + " found). Quarry outlines are NOT tip outlines: a quarry polygon often includes the working "
        "pit and its waste. Treat counts and areas as indicative only.")
data = {
    "_note": note,
    "bbox": {"x0": R3(X0), "y0": R3(Y0), "x1": R3(X1), "y1": R3(Y1),
             "lon": [LON_W, LON_E], "lat": [LAT_S, LAT_N]},
    "elevation": {"x0": R3(X0), "y0": R3(Y0), "cellKm": CELL, "width": GW, "height": GH,
                  "legend": "metres above sea level at cell centre; rows north to south",
                  "rows": [r.tolist() for r in grid]},
    "buildings": buildings,
    "roads": roads,
    "rail": rail,
    "rivers": rivers,
    "water": water,
    "landuse": landuse,
    "tips": tips,
    ("collieries" if PROFILE == "coal" else "quarries"): collieries,
    "places": places,
    "stations": stations,
    "busStops": bus_stops,
    "busRoutes": bus_routes,
    "facilities": facilities,
    "flood": flood,
    "lsoas": lsoas,
}
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(data, fh, separators=(",", ":"), ensure_ascii=False)
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
print("grid", GW, "x", GH, "elev", grid.min(), grid.max(), "dropped", counts_dropped)
for k in ("buildings", "roads", "rail", "rivers", "water", "landuse", "tips", "collieries" if PROFILE == "coal" else "quarries",
          "places", "facilities", "flood", "lsoas", "stations", "busStops", "busRoutes"):
    print(k, len(data[k]), len(json.dumps(data[k], separators=(",", ":"))) // 1024, "KB")
