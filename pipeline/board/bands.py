"""Reference bands for the board (docs/design/v2-board.md section 4.1, "Seeding rule").

Writes model/board/bands.yaml, one band for each indicator that seeds a measure
(model/board/measures.yaml):

- If v1 has a band for the indicator (model/bands.yaml), copy it (`origin: v1`).
- Otherwise use the lowest and highest of the 22 Welsh councils, each pushed out by a tenth of
  the gap between them (`origin: board`, player label "compared with the rest of Wales").
  For an indicator where higher is better the floor is the lowest less a tenth, the goal is the
  highest plus a tenth. Where lower is better they swap.

A score is then 10 * (value - floor) / (goal - floor), clamped 0 to 10 (the board engine does
that). The data is never adjusted to make a nicer start.

    python3 -I pipeline/board/bands.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "model"
OUT = MODEL / "board" / "bands.yaml"
WALES = "W92000004"
PUSH = 0.1


def load_yaml(path: Path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def main() -> None:
    la = json.loads((MODEL / "data" / "la-indicators.json").read_text(encoding="utf-8"))
    v1_bands = load_yaml(MODEL / "bands.yaml")["bands"]
    v1_inds = {i["id"]: i for i in load_yaml(MODEL / "indicators.yaml")["indicators"]}
    board_inds = {i["id"]: i for i in load_yaml(MODEL / "board" / "indicators.yaml")["indicators"]}
    measures = load_yaml(MODEL / "board" / "measures.yaml")["measures"]

    bands: dict[str, dict] = {}
    for m in measures:
        for ind in m["indicators"]:
            if ind in bands:
                continue
            if ind not in v1_inds or ind not in board_inds:
                sys.exit(f"indicator {ind} is not in model/indicators.yaml and model/board/indicators.yaml")
            source = v1_inds[ind]["source"]
            if ind in v1_bands:
                b = v1_bands[ind]
                bands[ind] = {
                    "floor": b["floor"],
                    "goal": b["goal"],
                    "higher_is_better": bool(b["higher_is_better"]),
                    "origin": "v1",
                    "source": b.get("source", source),
                }
                continue
            hib = board_inds[ind]["higher_is_better"]
            if hib is None:
                sys.exit(f"indicator {ind} has no direction in model/board/indicators.yaml")
            values = [v for code, v in la["indicators"][ind]["values"].items() if code != WALES]
            if len(values) != 22 or any(v is None for v in values):
                sys.exit(f"indicator {ind} needs a value for all 22 councils, found {len(values)}")
            lo, hi = min(values), max(values)
            pad = PUSH * (hi - lo)
            floor, goal = (lo - pad, hi + pad) if hib else (hi + pad, lo - pad)
            bands[ind] = {
                "floor": round(floor, 4),
                "goal": round(goal, 4),
                "higher_is_better": bool(hib),
                "origin": "board",
                "source": source,
            }

    header = (
        "# Reference bands for the board, written by pipeline/board/bands.py. Do not edit by hand.\n"
        "# origin v1: copied from model/bands.yaml. origin board: the lowest and highest of the 22 Welsh\n"
        "# councils, each pushed out by a tenth of the gap (player label: compared with the rest of Wales).\n"
        "# score = 10 * (value - floor) / (goal - floor), clamped 0 to 10.\n"
    )
    body = yaml.safe_dump(
        {"generated": la["generated"], "note": "Bands for the indicators that seed the six measures.", "bands": bands},
        sort_keys=False,
        allow_unicode=True,
    )
    OUT.write_text(header + body, encoding="utf-8")
    n_v1 = sum(1 for b in bands.values() if b["origin"] == "v1")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(bands)} bands ({n_v1} from v1, {len(bands) - n_v1} from the board rule)")


if __name__ == "__main__":
    main()
