"""Quick PIL preview of a place JSON from build_place.py, for checking the data only.

Usage: python3 -I preview_place.py <place.json> <out.png> [scale]
Draws hillshade, landuse, flood zones, rivers, roads, rail, buildings, tips, quarries or collieries, places and
facilities. Red outline polygons = quarry/tip polygons; magenta = BGS tip landslide records.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

R = json.load(open(sys.argv[1], encoding="utf-8"))
OUT = sys.argv[2]
S = float(sys.argv[3]) if len(sys.argv) > 3 else 60
bb = dict(R["bbox"])
X0, Y0 = bb["x0"], bb["y0"]
PW, PH = int((bb["x1"] - X0) * S), int((bb["y1"] - Y0) * S)


def P(x, y):
    return ((x - X0) * S, (y - Y0) * S)


# hillshade + hypsometric tint
E = R["elevation"]
z = np.array(E["rows"], dtype=float)
dy, dx = np.gradient(z, E["cellKm"] * 1000)
az, alt = np.radians(315), np.radians(40)
slope = np.arctan(np.hypot(dx, dy))
aspect = np.arctan2(-dx, dy)
hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
hs = np.clip(hs, 0, 1)
t = (z - z.min()) / (z.max() - z.min())
low, high = np.array([200, 214, 170]), np.array([236, 226, 200])
rgb = (low[None, None] * (1 - t[..., None]) + high[None, None] * t[..., None]) * (0.55 + 0.45 * hs[..., None])
full = Image.fromarray(rgb.clip(0, 255).astype(np.uint8))
img = full.resize((PW, PH), Image.BILINEAR).convert("RGBA")

ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
LU = {"woodland": (60, 120, 60, 110), "grassland": (150, 190, 110, 60), "heath": (150, 110, 140, 70),
      "scrub": (120, 150, 80, 70), "residential": (200, 170, 160, 90), "industrial": (160, 140, 170, 110),
      "commercial": (190, 150, 170, 90), "quarry": (120, 110, 100, 140), "landfill": (110, 100, 60, 140),
      "brownfield": (140, 120, 90, 120), "rock": (130, 130, 130, 120)}
for f in R["landuse"]:
    c = LU.get(f["class"])
    if c:
        d.polygon([P(*p) for p in f["rings"][0]], fill=c)
for f in R["flood"]:
    d.polygon([P(*p) for p in f["rings"][0]], fill=(40, 110, 220, 90 if f["zone"] == "Flood Zone 3" else 50))
for f in R["water"]:
    d.polygon([P(*p) for p in f["rings"][0]], fill=(80, 140, 210, 255))
for f in R["rivers"]:
    w = 3 if f["kind"] == "river" else 1
    d.line([P(*p) for p in f["pts"]], fill=(40, 100, 200, 255 if not f.get("culvert") else 90), width=w)
RW = {"major": ((200, 60, 40, 255), 3), "minor": ((230, 150, 40, 255), 2), "residential": ((90, 90, 90, 200), 1),
      "service": ((120, 120, 120, 140), 1), "track": ((140, 100, 60, 140), 1), "path": ((140, 80, 60, 100), 1)}
for cls in ("path", "track", "service", "residential", "minor", "major"):
    col, w = RW[cls]
    for f in R["roads"]:
        if f["class"] == cls:
            d.line([P(*p) for p in f["pts"]], fill=col, width=w)
for f in R["rail"]:
    col = (20, 20, 20, 230) if f["status"] in ("active", "heritage") else (120, 60, 160, 230)
    d.line([P(*p) for p in f["pts"]], fill=col, width=2 if f["status"] in ("active", "heritage") else 2)
for b in R["buildings"]:
    d.polygon([P(*p) for p in b], fill=(70, 50, 45, 230))
img = Image.alpha_composite(img, ov)

d = ImageDraw.Draw(img)
font = ImageFont.load_default()
for f in R["facilities"]:
    x, y = P(f["x"], f["y"])
    col = {"school": (0, 90, 200), "hospital": (200, 0, 0), "clinic": (200, 0, 0), "doctors": (200, 0, 0),
           "institute": (230, 120, 0)}.get(f["kind"], (90, 90, 90))
    d.rectangle([x - 2, y - 2, x + 2, y + 2], fill=col)
for r in R.get("busRoutes", []):
    for ln in r["lines"]:
        d.line([P(*p) for p in ln], fill=(0, 170, 170), width=4)
for b in R.get("busStops", []):
    x, y = P(b["x"], b["y"])
    d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(0, 120, 120))
for s in R.get("stations", []):
    x, y = P(s["x"], s["y"])
    rail_ = s["kind"].startswith("rail")
    d.rectangle([x - 5, y - 5, x + 5, y + 5], outline=(255, 255, 255), fill=(0, 0, 0) if rail_ else (0, 150, 150))
for t in R["tips"]:
    if "rings" in t:
        ring = [P(*p) for p in t["rings"][0]]
        d.polygon(ring, outline=(220, 0, 0), fill=(60, 60, 60, 120) if t["kind"] != "spoil_heap_osm" else (0, 0, 0, 200))
        d.line(ring + [ring[0]], fill=(220, 0, 0), width=2)
    x, y = P(t["x"], t["y"])
    col = (0, 0, 0) if t["source"] == "OSM" else ((230, 0, 140) if t["kind"] == "tip_landslide_record" else (230, 120, 200))
    d.ellipse([x - 5, y - 5, x + 5, y + 5], outline=col, width=2)
for c in R.get("collieries", []) + R.get("quarries", []):
    x, y = P(c["x"], c["y"])
    d.polygon([(x, y - 7), (x - 6, y + 5), (x + 6, y + 5)], outline=(0, 0, 0), fill=(255, 220, 0))
for p in R["places"]:
    x, y = P(p["x"], p["y"])
    if p["kind"] in ("city", "town", "village", "hamlet", "suburb"):
        d.text((x + 3, y - 6), p["en"], fill=(0, 0, 0), font=font)
for p in R["places"]:
    pass
d.text((8, 8), R["_note"]["place"]["en"] + " preview: red outline = OSM quarry/tip polygons; magenta = BGS tip landslide records; "
               "yellow triangle = OSM colliery/quarry feature; teal = bus routes; squares = stations; purple = disused rail",
       fill=(0, 0, 0), font=font)
img.convert("RGB").save(OUT)
print(OUT, img.size)
