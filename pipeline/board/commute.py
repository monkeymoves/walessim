"""Census 2021 commuting links for the board (docs/design/v2-board.md section 4.2).

Fetches ODWP01EW, "Location of usual residence and place of work", from Nomis (ONS, Open
Government Licence v3.0), reads its lower tier local authority file, and writes
model/data/board-commute.json: one commute link for each pair of the ten South East councils, and
one from each council to four places off the board (stubs), where at least 1 in 100 of the
council's resident workers make that journey.

    python3 -I pipeline/board/commute.py            # fetch if needed, then write the links
    python3 -I pipeline/board/commute.py --offline  # use the zip already in pipeline/raw/board/

Share definition. `from` is the council where workers live and `to` is where they work.
share = workers living in `from` whose fixed workplace is in `to`, divided by all workers living
in `from` (the three ODWP01EW place-of-work groups: working mainly at or from home, working in
the UK at a fixed place, and other, including offshore and abroad). People who work at or from
home are therefore in the divisor, so the shares are smaller than "of those who commute".

Caution that goes with the data (ONS): Census day was 21 March 2021, during the pandemic, with
many people furloughed or at home. ONS says to be very careful using travel to work figures for
planning. Counts are protected by record swapping and small random changes.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "pipeline" / "raw" / "board"
ZIP = RAW / "odwp01ew.zip"
URL = "https://www.nomisweb.co.uk/output/census/2021/odwp01ew.zip"
OUT = ROOT / "model" / "data" / "board-commute.json"
SOURCE_ID = "nomis_census_odwp01ew"

# The ten councils in play, in display order, with the slug used in link ids.
COUNCILS = {
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

# Places off the board, as stubs at the map edge. Ids match model/board/links.yaml `stubs`.
# Swansea is left out on purpose: it is under 3 in 100 for every council in play.
STUBS = {
    "stub:npt": ["W06000012"],
    "stub:powys": ["W06000023"],
    "stub:bristol": ["E06000023", "E06000025"],
    "stub:border": ["E07000080", "E06000019"],
}

MIN_SHARE = 0.01
WORKING = {"1", "2", "3"}  # at or from home; other (offshore, abroad); fixed place in the UK
FIXED = "3"


def fetch() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    print(f"fetching {URL}")
    with urllib.request.urlopen(URL, timeout=300) as r, open(ZIP, "wb") as f:  # noqa: S310 (fixed https URL)
        while chunk := r.read(1 << 20):
            f.write(chunk)
    print(f"saved {ZIP} ({ZIP.stat().st_size} bytes)")


def read_flows() -> tuple[dict[str, int], dict[str, dict[str, int]]]:
    """Resident workers by council in play, and their fixed-place workers by workplace code."""
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
    stub_of = {code: stub for stub, codes in STUBS.items() for code in codes}
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
        "generated": "2026-11-27",
        "note": (
            "Census 2021 ODWP01EW (ONS, via Nomis, OGL v3.0), lower tier local authority file. share is workers living in "
            "`from` whose fixed workplace is in `to`, divided by all workers living in `from` (including those at or from "
            "home). Pairs under 1 in 100 are left out. Census day was in the pandemic: ONS advises caution. "
            f"Written by pipeline/board/commute.py. Resident workers: {json.dumps(totals)}."
        ),
        "links": links,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    council_links = sum(1 for link in links if not link.get("outside"))
    print(f"wrote {OUT.relative_to(ROOT)}: {council_links} council links, {len(links) - council_links} to stubs")


if __name__ == "__main__":
    main()
