"""Build design/mockups/data/wales.js for the look-and-feel mockups.

Throwaway: the real pipeline comes later. Inputs (downloaded 2026-11-26):
  - ONS Local Authority Districts Dec 2023, generalised (BGC), Welsh codes only, EPSG:4326
  - AWS Terrain Tiles (terrarium encoding), zoom 8
Usage: python3 -I build_mock_data.py <raw_dir> <out_js>
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw

RAW, OUT = sys.argv[1], sys.argv[2]

LON0, LON1, LAT0, LAT1 = -5.40, -2.60, 51.30, 53.50
KX = 111.32 * math.cos(math.radians(52.4))  # km per degree lon
KY = 111.2  # km per degree lat
W = int(round((LON1 - LON0) * KX))
H = int(round((LAT1 - LAT0) * KY))
CELL = 1.0  # km


def proj(lon, lat):
    return ((lon - LON0) * KX, (LAT1 - lat) * KY)


# ---- elevation from terrarium tiles -------------------------------------
Z = 8
N = 2 ** Z


def tile_xy(lon, lat):
    x = (lon + 180) / 360 * N
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * N
    return x, y


tiles = {}
for tx in (124, 125, 126):
    for ty in (83, 84, 85):
        a = np.asarray(Image.open(f"{RAW}/tiles/t_{tx}_{ty}.png").convert("RGB")).astype(np.float64)
        tiles[(tx, ty)] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768

elev = np.zeros((H, W))
for j in range(H):
    lat = LAT1 - (j + 0.5) / KY
    for i in range(W):
        lon = LON0 + (i + 0.5) / KX
        fx, fy = tile_xy(lon, lat)
        tx, ty = int(fx), int(fy)
        px, py = int((fx - tx) * 256), int((fy - ty) * 256)
        t = tiles.get((tx, ty))
        elev[j, i] = t[py, px] if t is not None else -9999

# ---- local authorities ----------------------------------------------------
gj = json.load(open(f"{RAW}/lad.geojson"))
SCALE = 4  # raster mask at 250 m
mask = Image.new("L", (W * SCALE, H * SCALE), 0)
draw = ImageDraw.Draw(mask)
las = []
for f in gj["features"]:
    p = f["properties"]
    geom = f["geometry"]
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    rings_out = []
    for poly in polys:
        for k, ring in enumerate(poly):
            pts = [proj(lon, lat) for lon, lat in ring]
            if k == 0:
                draw.polygon([(x * SCALE, y * SCALE) for x, y in pts], fill=255)
            else:
                draw.polygon([(x * SCALE, y * SCALE) for x, y in pts], fill=0)
            # thin: keep points at least 0.35 km apart
            kept = [pts[0]]
            for x, y in pts[1:]:
                if math.hypot(x - kept[-1][0], y - kept[-1][1]) >= 0.35:
                    kept.append((x, y))
            if len(kept) >= 4:
                rings_out.append([[round(x, 2), round(y, 2)] for x, y in kept])
    las.append({"code": p["LAD23CD"], "en": p["LAD23NM"], "cy": p["LAD23NMW"], "rings": rings_out})

m = np.asarray(mask.resize((W, H), Image.BILINEAR)) > 127
grid = np.where(m, np.maximum(elev, 0), np.where(elev > 0.5, -2, -1)).round().astype(int)

# ---- places (approximate coordinates, for mockups only) ------------------
towns = [
    ("Cardiff", "Caerdydd", 51.481, -3.179, "city"),
    ("Swansea", "Abertawe", 51.621, -3.944, "city"),
    ("Newport", "Casnewydd", 51.588, -2.998, "city"),
    ("Wrexham", "Wrecsam", 53.046, -2.993, "city"),
    ("Bangor", "Bangor", 53.228, -4.129, "city"),
    ("St Davids", "Tyddewi", 51.882, -5.269, "city"),
    ("Merthyr Tydfil", "Merthyr Tudful", 51.747, -3.378, "town"),
    ("Aberystwyth", "Aberystwyth", 52.415, -4.083, "town"),
    ("Carmarthen", "Caerfyrddin", 51.857, -4.312, "town"),
    ("Llandrindod Wells", "Llandrindod", 52.242, -3.379, "town"),
    ("Holyhead", "Caergybi", 53.309, -4.633, "town"),
    ("Pembroke Dock", "Doc Penfro", 51.693, -4.946, "town"),
    ("Rhyl", "Y Rhyl", 53.319, -3.491, "town"),
    ("Bridgend", "Pen-y-bont ar Ogwr", 51.504, -3.577, "town"),
    ("Blaenau Ffestiniog", "Blaenau Ffestiniog", 52.995, -3.938, "town"),
    ("Port Talbot", "Port Talbot", 51.592, -3.780, "town"),
    ("Tonypandy", "Tonypandy", 51.622, -3.452, "town"),
    ("Ebbw Vale", "Glynebwy", 51.778, -3.207, "town"),
    ("Newtown", "Y Drenewydd", 52.513, -3.313, "town"),
    ("Caernarfon", "Caernarfon", 53.140, -4.273, "town"),
    ("Llanelli", "Llanelli", 51.682, -4.163, "town"),
    ("Brecon", "Aberhonddu", 51.947, -3.391, "town"),
    ("Dolgellau", "Dolgellau", 52.743, -3.885, "town"),
    ("Bethesda", "Bethesda", 53.181, -4.058, "town"),
    ("Machynlleth", "Machynlleth", 52.591, -3.851, "town"),
]
sites = [
    ("Blaenavon industrial landscape", "Tirwedd ddiwydiannol Blaenafon", 51.776, -3.088, "heritage"),
    ("Penrhyn slate quarry", "Chwarel lechi'r Penrhyn", 53.160, -4.070, "slate"),
    ("Parys Mountain copper mine", "Mynydd Parys", 53.387, -4.343, "copper"),
    ("Hafod-Morfa copperworks", "Gwaith copr Hafod-Morfa", 51.635, -3.940, "copper"),
    ("Big Pit", "Pwll Mawr", 51.772, -3.105, "coal"),
    ("Port Talbot steelworks", "Gwaith dur Port Talbot", 51.580, -3.770, "steel"),
    ("Dinorwig power station", "Pwerdy Dinorwig", 53.120, -4.110, "energy"),
    ("Pontcysyllte Aqueduct", "Traphont Ddŵr Pontcysyllte", 52.970, -3.088, "heritage"),
    ("Gwynt y Môr wind farm", "Fferm wynt Gwynt y Môr", 53.450, -3.580, "energy"),
    ("Llyn Celyn (Tryweryn)", "Llyn Celyn (Tryweryn)", 52.950, -3.700, "water"),
]
peaks = [
    ("Snowdon", "Yr Wyddfa", 53.068, -4.076),
    ("Pen y Fan", "Pen y Fan", 51.884, -3.437),
    ("Cadair Idris", "Cadair Idris", 52.700, -3.909),
    ("Plynlimon", "Pumlumon", 52.467, -3.783),
]


def place(t):
    x, y = proj(t[3], t[2])
    return {"en": t[0], "cy": t[1], "x": round(x, 2), "y": round(y, 2), "kind": t[4] if len(t) > 4 else "peak"}


# Approximate 2021 Census figures from memory: population (thousands) and
# % aged 3+ able to speak Welsh. UNVERIFIED, for mockup texture only.
approx = {
    "Cardiff": (362, 11.4), "Swansea": (238, 11.2), "Rhondda Cynon Taf": (237, 11.4),
    "Carmarthenshire": (187, 39.9), "Caerphilly": (175, 10.6), "Newport": (159, 8.9),
    "Flintshire": (155, 11.1), "Bridgend": (145, 8.9), "Neath Port Talbot": (141, 12.4),
    "Wrexham": (135, 12.2), "Powys": (133, 16.4), "Vale of Glamorgan": (131, 10.9),
    "Pembrokeshire": (123, 17.2), "Gwynedd": (117, 64.4), "Conwy": (114, 25.9),
    "Denbighshire": (96, 22.5), "Monmouthshire": (93, 9.3), "Torfaen": (92, 9.9),
    "Ceredigion": (71, 45.3), "Isle of Anglesey": (69, 55.8), "Blaenau Gwent": (67, 7.7),
    "Merthyr Tydfil": (58, 8.8),
}
for la in las:
    pop, cy = approx[la["en"]]
    la["approx"] = {"population_k": pop, "welsh_speakers_pct": cy}

data = {
    "_note": "MOCKUP DATA. Boundaries: ONS LAD Dec 2023 BGC (OGL). Elevation: AWS Terrain Tiles z8 (~370 m), "
    "resampled to 1 km. Place coordinates and the 'approx' figures are approximate and unverified.",
    "width": W, "height": H, "cellKm": CELL,
    "elevation": {"legend": "metres; -1 sea; -2 land outside Wales", "rows": [r.tolist() for r in grid]},
    "las": las,
    "towns": [place(t) for t in towns],
    "sites": [place(t) for t in sites],
    "peaks": [place(t) for t in peaks],
}
with open(OUT, "w") as fh:
    fh.write("// Generated by design/scripts/build_mock_data.py. Mockup data only.\n")
    fh.write("window.WALES = ")
    json.dump(data, fh, separators=(",", ":"), ensure_ascii=False)
    fh.write(";\n")
print("grid", W, "x", H, "max elev", grid.max(), "wales cells", int((grid >= 0).sum()))
