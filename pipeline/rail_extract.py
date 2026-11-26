"""Wales rail for the national map: raw/osm_rail.json (Overpass, ODbL) -> model/data/wales-rail.json
and a preview PNG. Usage: python3 -I rail_extract.py <osm_rail.json> <wales.js> <out.json> <preview.png>
Lines are classified main / heritage, de-duplicated where double track is mapped as two ways,
merged by name, clipped to the LA polygons (0.8 km buffer) and simplified (150 m).
"""
import json
import math
import re
import sys
import time

from PIL import Image, ImageDraw
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import linemerge, unary_union
from shapely.strtree import STRtree

RAW, WALES, OUT, PNG = sys.argv[1:5]
KX = 111.32 * math.cos(math.radians(52.4))
KY = 111.2


def proj(lon, lat):
    return ((lon + 5.40) * KX, (53.50 - lat) * KY)


s = open(WALES, encoding="utf-8").read()
W = json.loads(s[s.index("window.WALES = ") + 15:s.rindex(";")])
wales = unary_union([Polygon(r).buffer(0) for la in W["las"] for r in la["rings"] if len(r) >= 3]).buffer(0.8)

el = json.load(open(RAW))["elements"]
HERITAGE_NAME = re.compile(r"Llangollen Railway|Gwili|Heritage|Miniature|Oakwood", re.I)
SKIP_USAGE = {"industrial", "military", "mine"}
cands = []
for e in el:
    t = e.get("tags", {})
    if e["type"] != "way" or not e.get("geometry"):
        continue
    rw, us, nm = t.get("railway"), t.get("usage"), t.get("name") or ""
    if us in SKIP_USAGE or re.search(r"Miniature|Oakwood|Safari", nm):
        continue
    heritage = us == "tourism" or rw in ("preserved", "narrow_gauge") or bool(HERITAGE_NAME.search(nm))
    if re.search(r"Miniature|Oakwood", nm):
        continue
    pts = [proj(g["lon"], g["lat"]) for g in e["geometry"] if g]
    if len(pts) >= 2:
        cands.append(("heritage" if heritage else "main", nm, LineString(pts)))

out_lines = []
for kind in ("main", "heritage"):
    items = [(n, g.intersection(wales)) for k, n, g in cands if k == kind]
    segs = []
    for n, g in items:
        for ln in ([g] if g.geom_type == "LineString" else [x for x in getattr(g, "geoms", []) if x.geom_type == "LineString"]):
            if ln.length > 0.02:
                segs.append((n, ln))
    # drop the second track of double-track lines: greedy, longest first
    segs.sort(key=lambda a: -a[1].length)
    kept, tree_geoms = [], []
    tree = None
    for n, ln in segs:
        dup = False
        if tree_geoms:
            n_pts = max(3, int(ln.length / 0.05))
            samples = [ln.interpolate(i / n_pts, normalized=True) for i in range(n_pts + 1)]
            near = 0
            for p in samples:
                idx = tree.query(p.buffer(0.07))
                if any(tree_geoms[i].distance(p) < 0.07 for i in idx):
                    near += 1
            dup = near / len(samples) > 0.6
        if not dup:
            kept.append((n, ln))
            tree_geoms.append(ln)
            tree = STRtree(tree_geoms)
    by = {}
    for n, ln in kept:
        by.setdefault(n, []).append(ln)
    for n, lns in by.items():
        m = linemerge(lns)
        for ln in ([m] if m.geom_type == "LineString" else list(m.geoms)):
            ln = ln.simplify(0.15, preserve_topology=False)
            if ln.length < 0.3 and kind == "main":
                continue
            c = [[round(x, 2), round(y, 2)] for x, y in ln.coords]
            if len(c) >= 2:
                out_lines.append({"kind": kind, "name": n or None, "coords": c})
    print(kind, "segments", len(segs), "kept", len(kept))

stations = []
seen = set()
for e in el:
    t = e.get("tags", {})
    if e["type"] != "node" or t.get("railway") not in ("station", "halt") or not t.get("name"):
        continue
    if t.get("station") in ("subway", "light_rail", "tram") or t.get("disused") == "yes":
        continue
    x, y = proj(e["lon"], e["lat"])
    if not wales.contains(Point(x, y)):
        continue
    key = (t["name"], round(x, 1), round(y, 1))
    if key in seen:
        continue
    seen.add(key)
    stations.append({"name": t["name"], "cy": t.get("name:cy"), "x": round(x, 2), "y": round(y, 2)})
stations.sort(key=lambda s_: s_["name"])

note = ("Railway lines and stations from OpenStreetMap via the Overpass API (https://overpass-api.de/api/interpreter), "
        "fetched " + time.strftime("%Y-%m-%d") + ". Copyright OpenStreetMap contributors, licensed ODbL 1.0 "
        "(https://www.openstreetmap.org/copyright). Active railway=rail (usage main, branch or unset) as kind 'main'; heritage "
        "and tourist lines (usage=tourism, narrow gauge, preserved) as 'heritage'. Industrial, military and mine lines, yards "
        "and sidings excluded. Double track mapped as two ways is collapsed to one line, lines simplified to 150 m, clipped to "
        "the local authority outlines of wales.js (0.8 km buffer). Same km frame as wales.js: x=(lon+5.40)*111.32*cos(52.4 deg), "
        "y=(53.50-lat)*111.2, coordinates rounded to 0.01 km. Names are OSM name tags: some lines are unnamed or named after "
        "the OSM line, not the operator. Overview data only, not for engineering or timetable use.")
json.dump({"_note": note, "lines": out_lines, "stations": stations}, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)
import os
print("lines", len(out_lines), "stations", len(stations), "size KB", os.path.getsize(OUT) // 1024)

# ---- preview ----
S = 5
img = Image.new("RGB", (int(W["width"] * S), int(W["height"] * S)), (245, 243, 236))
d = ImageDraw.Draw(img)
for la in W["las"]:
    for r in la["rings"]:
        pts = [(x * S, y * S) for x, y in r]
        if len(pts) >= 3:
            d.polygon(pts, fill=(232, 236, 226), outline=(150, 150, 150))
for ln in out_lines:
    pts = [(x * S, y * S) for x, y in ln["coords"]]
    d.line(pts, fill=(30, 60, 140) if ln["kind"] == "main" else (200, 40, 40), width=2 if ln["kind"] == "main" else 3)
for st in stations:
    d.ellipse([st["x"] * S - 2, st["y"] * S - 2, st["x"] * S + 2, st["y"] * S + 2], fill=(0, 0, 0))
img.save(PNG)
