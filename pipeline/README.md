# Pipeline: real data for the 22 local authorities

Reproducible, standard library plus openpyxl and PyYAML. Run everything with `python3 -I`
from the repo root. Raw downloads are cached in `pipeline/raw/la/` (gitignored); delete a file there to refetch.
Needs `pdftotext` (poppler) for the coal tip table. Sends the User-Agent `etifeddiaeth-pipeline/0.1` only.

| Script | What it does |
|---|---|
| `fetch_la_indicators.py` | Downloads from Nomis, ONS, DESNZ, DataMapWales WFS, StatsWales and a Welsh Government PDF; builds `model/data/la-indicators.json`. An indicator missing any of the 22 LAs is dropped and printed as `DROPPED`. |
| `build_bands.py` | Builds `model/bands.yaml` (floor and goal per indicator, game-design 3.2) from the LA data plus UK nation and region comparators. |
| `check_la_indicators.py` | Prints every indicator with min, max, Wales value and missing LAs, then the 2026 strand flow scores (game-design 3.3) and flags any outside 3 to 6. |

Rerun:

```
python3 -I pipeline/fetch_la_indicators.py
python3 -I pipeline/build_bands.py
python3 -I pipeline/check_la_indicators.py
```

`model/indicators.yaml` and `model/sources.yaml` are written by hand (Welsh names carry `cy_review: true`).
Each indicator's derivation is in its `notes`. Wales values are the published Wales figure where the
source gives one, otherwise the sum or ratio of the 22 LAs (stated in the notes).

Notes: ONS rate-limits (HTTP 429); the script waits and retries. The Nomis APS query must filter by `variable`
or it is truncated at 25,000 rows. StatsWales is a beta service; its dataset pages may change layout.
The DataMapWales coal tip map is personal-use only and is never downloaded.
