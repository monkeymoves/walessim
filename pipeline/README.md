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

## Extra measures

`pipeline/extra/` holds the second data pass that grew the atlas from 19 to 87 measures. Each goal has a
fetch script that writes its values to `pipeline/extra/out/<key>.json`, next to hand-written staging files
for its indicator definitions (`<key>.indicators.yaml`), sources (`<key>.sources.yaml`) and licence rows
(`<key>.licences.md`). Raw downloads cache in `pipeline/raw/extra/<key>/`; delete a file there to refetch.

| Key | Script | Needs |
|---|---|---|
| work, nature, health, climate | `fetch_<key>.py` | standard library, openpyxl (climate uses `odsread.py` for .ods files) |
| homes | `fetch_homes.py` (with `swapi.py`, the StatsWales API helper) | standard library |
| fairness | `fetch_fairness.py` | pandas and odfpy (the DWP .ods file), so run it without `-I` |
| culture, spatial | `fetch_culture.py`, `fetch_spatial.py` | shapely (point in polygon and clipping in EPSG:27700) |

`merge.py` then adds them to the model. It refuses on any id clash with an existing measure, checks every
kept measure has all 22 authorities and Wales, skips the measures listed in its `DROPPED` table (with the
reason each was left out), and appends any missing definitions and sources to `model/indicators.yaml` and
`model/sources.yaml`. Entries already in those files are left alone, so hand edits survive. It never
touches `earnings` unless asked with `--refresh-earnings`, because that measure feeds the game.

Rerun, from the repo root, after the main pipeline (which rewrites `la-indicators.json` without the extras):

```
python3 -I pipeline/fetch_la_indicators.py
cd pipeline && for k in work nature health homes culture climate spatial; do python3 -I extra/fetch_$k.py; done
python3 extra/fetch_fairness.py && cd ..
python3 -I pipeline/extra/merge.py --check   # say what would change
python3 -I pipeline/extra/merge.py           # add --update to take new values for measures merged before
npm run model:build
```

Each new measure also needs its atlas strings (`short.`, `headUnit.`, `unit.` in `model/i18n/*/atlas.json`)
and its words for play (`measure.`, `unit.` in `model/i18n/*/facts.json`), in English and Welsh, and a row in
`docs/data-licences.md` and `src/ui/book/licences.ts` for any new dataset. Several download addresses change
each release (DWP each March, the DfT vehicle and charger tables each quarter); the Cadw attribution carries
the fetch date and must be updated when the culture or spatial script is rerun.

Install the Python packages first: `pip install -r pipeline/requirements.txt`.
