"""Census 2021 commuting links for the All Wales board (docs/design/v3-wales.md section 3).

The same source and method as pipeline/board/commute.py, re-cut for all 22 Welsh councils. Reads
ODWP01EW, "Location of usual residence and place of work", from Nomis (ONS, Open Government
Licence v3.0), lower tier local authority file, and writes model/data/board-commute-wales.json:
one commute link for every destination that at least 1 in 100 of a council's resident workers
travel to, whether another Welsh council or a candidate stub in England.

    python3 -I pipeline/board/commute_wales.py            # fetch if needed, then write the links
    python3 -I pipeline/board/commute_wales.py --offline  # use the zip already in pipeline/raw/board/

Share definition (as commute.py). `from` is the council where workers live and `to` is where they
work. share = workers living in `from` whose fixed workplace is in `to`, divided by all workers
living in `from` (working mainly at or from home, working in the UK at a fixed place, and other,
including offshore and abroad).

English destinations are folded into candidate stubs (STUBS below), and the 1 in 100 test is
applied after folding, as in commute.py. Each stub is named by the local authorities it folds and
has a centre in the km frame of CLAUDE.md, worked out from the latitude and longitude of the town
named. Liverpool is not a stub: under 1 in 100 of every council's workers go there (0.59 in 100
from Flintshire, the most).

Caution that goes with the data (ONS): Census day was 21 March 2021, during the pandemic, with
many people furloughed or at home. ONS says to be very careful using travel to work figures for
planning. Counts are protected by record swapping and small random changes.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "pipeline" / "raw" / "board"
ZIP = RAW / "odwp01ew.zip"
URL = "https://www.nomisweb.co.uk/output/census/2021/odwp01ew.zip"
OUT = ROOT / "model" / "data" / "board-commute-wales.json"
SOURCE_ID = "nomis_census_odwp01ew"

# The 22 councils, in the order of model/authorities.yaml, with the slug used in link ids.
COUNCILS = {
    "W06000001": "isle-of-anglesey",
    "W06000002": "gwynedd",
    "W06000003": "conwy",
    "W06000004": "denbighshire",
    "W06000005": "flintshire",
    "W06000006": "wrexham",
    "W06000008": "ceredigion",
    "W06000023": "powys",
    "W06000009": "pembrokeshire",
    "W06000010": "carmarthenshire",
    "W06000011": "swansea",
    "W06000012": "neath-port-talbot",
    "W06000013": "bridgend",
    "W06000014": "vale-of-glamorgan",
    "W06000015": "cardiff",
    "W06000016": "rhondda-cynon-taf",
    "W06000018": "caerphilly",
    "W06000019": "blaenau-gwent",
    "W06000020": "torfaen",
    "W06000021": "monmouthshire",
    "W06000022": "newport",
    "W06000024": "merthyr-tydfil",
}

# Candidate stubs in England. `folds` are the local authority codes (2021) whose workplaces count
# as the stub. The centre is the named town (latitude, longitude, WGS84), turned into the km frame.
# stub:bristol keeps the id and fold of model/board/links.yaml. The South East board's stub:border
# folds stub:herefordshire and stub:forest-of-dean together; here they are kept apart because
# Powys reaches Herefordshire only.
STUBS = {
    "stub:bristol": {
        "name": {"en": "Bristol and South Gloucestershire", "cy": "Bryste a De Swydd Gaerloyw", "cy_review": True},
        "folds": ["E06000023", "E06000025"],
        "town": "Bristol city centre",
        "latlon": (51.4545, -2.5879),
    },
    "stub:herefordshire": {
        "name": {"en": "Herefordshire", "cy": "Swydd Henffordd", "cy_review": True},
        "folds": ["E06000019"],
        "town": "Hereford",
        "latlon": (52.0565, -2.7160),
    },
    "stub:forest-of-dean": {
        "name": {"en": "Forest of Dean", "cy": "Fforest y Ddena", "cy_review": True},
        "folds": ["E07000080"],
        "town": "Lydney",
        "latlon": (51.7286, -2.5302),
    },
    "stub:shropshire": {
        "name": {"en": "Shropshire", "cy": "Swydd Amwythig", "cy_review": True},
        "folds": ["E06000051"],
        "town": "Shrewsbury",
        "latlon": (52.7077, -2.7540),
    },
    "stub:cheshire-west": {
        "name": {"en": "Cheshire West and Chester", "cy": "Gorllewin Swydd Gaer a Chaer", "cy_review": True},
        "folds": ["E06000050"],
        "town": "Chester",
        "latlon": (53.1905, -2.8910),
    },
    "stub:wirral": {
        "name": {"en": "Wirral", "cy": "Cilgwri", "cy_review": True},
        "folds": ["E08000015"],
        "town": "Birkenhead",
        "latlon": (53.3934, -3.0148),
    },
}

MIN_SHARE = 0.01
WORKING = {"1", "2", "3"}  # at or from home; other (offshore, abroad); fixed place in the UK
FIXED = "3"


def km(lat: float, lon: float) -> list[float]:
    """The km frame of CLAUDE.md."""
    x = (lon + 5.40) * 111.32 * math.cos(math.radians(52.4))
    y = (53.50 - lat) * 111.2
    return [round(x, 1), round(y, 1)]


def fetch() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    print(f"fetching {URL}")
    with urllib.request.urlopen(URL, timeout=300) as r, open(ZIP, "wb") as f:  # noqa: S310 (fixed https URL)
        while chunk := r.read(1 << 20):
            f.write(chunk)
    print(f"saved {ZIP} ({ZIP.stat().st_size} bytes)")


def read_flows() -> tuple[dict[str, int], dict[str, dict[str, int]]]:
    """Resident workers by council, and their fixed-place workers by workplace code."""
    totals: dict[str, int] = {c: 0 for c in COUNCILS}
    flows: dict[str, dict[str, int]] = {c: {} for c in COUNCILS}
    with zipfile.ZipFile(ZIP) as z:
        rows = csv.reader(io.TextIOWrapper(z.open("ODWP01EW_LTLA.csv"), "utf-8-sig"))
        header = next(rows)
        if header[0] != "Lower tier local authorities code" or header[-1] != "Count":
            sys.exit(f"unexpected columns in ODWP01EW_LTLA.csv: {header}")
        for origin, _, dest, _, group, _, count in rows:
            if origin not in COUNCILS or group not in WORKING:
                continue
            n = int(count)
            totals[origin] += n
            if group == FIXED:
                flows[origin][dest] = flows[origin].get(dest, 0) + n
    return totals, flows


def build(totals: dict[str, int], flows: dict[str, dict[str, int]]) -> list[dict]:
    stub_of = {code: stub for stub, s in STUBS.items() for code in s["folds"]}
    links: list[dict] = []
    for origin, slug in COUNCILS.items():
        shares: dict[str, float] = {}
        for dest, n in flows[origin].items():
            if dest == origin:
                continue
            if dest in COUNCILS:
                key = dest
            elif dest in stub_of:
                key = stub_of[dest]
            else:
                continue
            shares[key] = shares.get(key, 0) + n / totals[origin]
        for key, share in sorted(shares.items(), key=lambda kv: -kv[1]):
            if share < MIN_SHARE:
                continue
            to_slug = COUNCILS.get(key) or key.removeprefix("stub:")
            link = {
                "id": f"commute:{slug}-{to_slug}",
                "kind": "commute",
                "from": origin,
                "to": key,
                "share": round(share, 4),
                "honesty": "real",
                "sources": [SOURCE_ID],
            }
            if key.startswith("stub:"):
                link["outside"] = True
            links.append(link)
    return links


def stubs_out(links: list[dict]) -> list[dict]:
    used = {link["to"] for link in links if link.get("outside")}
    out = []
    for sid, s in STUBS.items():
        if sid not in used:
            continue
        lat, lon = s["latlon"]
        out.append({
            "id": sid,
            "name": s["name"],
            "folds": s["folds"],
            "centre": km(lat, lon),
            "centre_town": f"{s['town']} ({lat}, {lon})",
        })
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--offline", action="store_true", help="use the zip already downloaded")
    args = ap.parse_args()
    if not args.offline and not ZIP.exists():
        fetch()
    if not ZIP.exists():
        sys.exit(f"{ZIP} is missing; run without --offline to fetch it")
    totals, flows = read_flows()
    links = build(totals, flows)
    out = {
        "generated": "2026-11-28",
        "note": (
            "Census 2021 ODWP01EW (ONS, via Nomis, OGL v3.0), lower tier local authority file, all 22 Welsh councils. "
            "share is workers living in `from` whose fixed workplace is in `to`, divided by all workers living in `from` "
            "(including those at or from home). Destinations under 1 in 100 are left out. English destinations are folded "
            "into the candidate stubs listed in `stubs` (the 1 in 100 test is applied after folding); stub centres are the "
            "named town in the km frame. Census day was in the pandemic: ONS advises caution. "
            f"Written by pipeline/board/commute_wales.py. Resident workers: {json.dumps(totals)}."
        ),
        "links": links,
        "stubs": stubs_out(links),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    council_links = sum(1 for link in links if not link.get("outside"))
    print(f"wrote {OUT.relative_to(ROOT)}: {council_links} council links, {len(links) - council_links} to stubs")


if __name__ == "__main__":
    main()
