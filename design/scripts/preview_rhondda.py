"""Quick PIL preview of design/mockups/data/rhondda.js, for checking the data only.

Usage: python3 -I preview_rhondda.py <rhondda.js> <wales.js> <out.png> [scale x0 y0 x1 y1]
Draws hillshade, landuse, flood zones, rivers, roads, rail, buildings, tips, collieries,
places and facilities, plus the national 1 km grid's 300 m contour as a red outline to
check the two files line up.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def load(path, var):
    s = open(path, encoding="utf-8").read()
    i = s.index(f"window.{var} = ") + len(f"window.{var} = ")
    return json.loads(s[i:s.rindex(";")])


R = load(sys.argv[1], "RHONDDA")
W = load(sys.argv[2], "WALES")
OUT = sys.argv[3]
S = 60  # px per km
bb = dict(R["bbox"])
FULL = dict(bb)
if len(sys.argv) > 4:  # optional zoom: scale x0 y0 x1 y1 (km frame)
    S = float(sys.argv[4])
    bb.update(zip(("x0", "y0", "x1", "y1"), map(float, sys.argv[5:9])))
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
k = 1 / E["cellKm"]
crop = ((bb["x0"] - FULL["x0"]) * k, (bb["y0"] - FULL["y0"]) * k, (bb["x1"] - FULL["x0"]) * k, (bb["y1"] - FULL["y0"]) * k)
crop = (max(crop[0], 0), max(crop[1], 0), min(crop[2], full.width), min(crop[3], full.height))
img = full.resize((PW, PH), Image.BILINEAR, box=crop).convert("RGBA")

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
    col = (20, 20, 20, 230) if f["status"] == "active" else (120, 60, 160, 200)
    d.line([P(*p) for p in f["pts"]], fill=col, width=2 if f["status"] == "active" else 1)
for b in R["buildings"]:
    d.polygon([P(*p) for p in b], fill=(70, 50, 45, 230))
img = Image.alpha_composite(img, ov)

# national 300 m contour (cells >= 300 m) from wales.js as alignment check
d = ImageDraw.Draw(img)
nat = W["elevation"]["rows"]
for j in range(int(Y0), int(bb["y1"]) + 1):
    for i in range(int(X0), int(bb["x1"]) + 1):
        v = nat[j][i]
        for di, dj in ((1, 0), (0, 1)):
            v2 = nat[j + dj][i + di]
            if (v >= 300) != (v2 >= 300):
                # edge between cell centres (i+0.5, j+0.5) and neighbour: draw the shared cell boundary
                if di:
                    d.line([P(i + 1, j), P(i + 1, j + 1)], fill=(220, 30, 30, 255), width=1)
                else:
                    d.line([P(i, j + 1), P(i + 1, j + 1)], fill=(220, 30, 30, 255), width=1)

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
        d.polygon([P(*p) for p in t["rings"][0]], outline=(0, 0, 0), fill=(40, 40, 40))
    x, y = P(t["x"], t["y"])
    col = (0, 0, 0) if t["source"] == "OSM" else ((230, 0, 140) if t["kind"] == "tip_landslide_record" else (230, 120, 200))
    d.ellipse([x - 5, y - 5, x + 5, y + 5], outline=col, width=2)
for c in R["collieries"]:
    x, y = P(c["x"], c["y"])
    d.polygon([(x, y - 7), (x - 6, y + 5), (x + 6, y + 5)], outline=(0, 0, 0), fill=(255, 220, 0))
for p in R["places"]:
    x, y = P(p["x"], p["y"])
    if p["kind"] in ("town", "village"):
        d.text((x + 3, y - 6), p["en"], fill=(0, 0, 0), font=font)
d.text((8, 8), "rhondda.js preview: red line = national wales.js 300 m cells; magenta = BGS tip landslide records; "
               "black = OSM spoil heap; yellow = OSM colliery; teal = bus routes; squares = stations", fill=(0, 0, 0), font=font)
img.convert("RGB").save(OUT)
print(OUT, img.size)
