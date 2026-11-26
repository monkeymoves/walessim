# Mockup brief v2: Papur with zoom, one decision at two scales

*26 November 2026. Builds on `BRIEF.md` (read it too: its design standard, Welsh, file and screenshot rules all still apply) and on `papur.html` (v1, which Luke chose). Still a throwaway prototype, but now interactive.*

## What changed since v1

Luke picked Papur, "plus touches", and wants to zoom into real places like Karpathy's City View. Fable (design consultant) reviewed the direction. Decisions:

- **Ruler plus steward.** You rule term by term; the next generation judges every 25 years. Add a **Trust** measure (Ymddiriedaeth) next to the seven strands: it limits what you can do next term. Show it as a distinct meter, not an eighth strand.
- **Neutral "term".** Senedd terms are four years from 2026, so do not say "5-year term". Show "Term 2" and the years it covers loosely (e.g. "2030s"), not a duration claim.
- **No false precision.** No pound figures on cards. Cost is shown as pips (1 to 4). Delays as pips. Figures only where sourced, and labelled.
- **Touches from the other mockups:** policy cards become **railway tickets** in the Print style (punched corners, a stub with the icon, serial number, perforation), but printed on Papur's paper stock and palette. **Carthen** weave patterns as trim: card stub bands, the seven strands drawn as short woven yarns, and borders. One paper world; no mixing of three renderers.
- **The future is stitched.** Anything the player does to the map in Yfory is shown as carthen thread stitched onto the paper (e.g. a made-safe tip gets a neat cross-stitch ring). Real is paper; your choices are thread.
- **A voice from a real place each term**: a one-line quote card from a named place (e.g. "Treorchy, 2031"), clearly marked as an illustrative voice, in both languages.

## The one thing this mockup must show

**One decision at two scales.** If the Rhondda view is only a prettier labelled map, the mockup has failed. If someone hesitates over which tip to do first, we have the game.

### Flow

1. **Wales view** (as v1, with the changes above). The curveball "a wet, stormy decade" has raised tip risk. The hand has four ticket cards. The player clicks **Make coal tips safe**.
2. **Fold down.** The map animates from the national relief into the **Rhondda** (Rhondda Fawr and Fach) built from `data/rhondda.js` (`window.RHONDDA`; read its `_note` and structure; same km frame as `wales.js`). The animation should feel like paper: the national sheet lifts or folds away and the valley relief settles in, not a generic CSS zoom. Keep it under about 1.5 s and respect `prefers-reduced-motion`.
3. **Rhondda view: the dilemma.** Paper relief from the 50 m terrain (more sheets than national), real terraces (building footprints) climbing the valley sides, rivers, railways (disused ones as faint dashed), real place names, real facilities (schools, chapels, institutes, surgeries), and the **real disused coal tips** from the official data with their category. The money covers only **three tips this term** (show three thread tokens to place). More tips than tokens.
   - **Trains and buses matter (Luke asked for them).** Draw the railway with its stations (the active Treherbert line as a confident line with station markers; disused colliery branches faint), bus routes as fine coloured lines with their route numbers, and bus stops as tiny markers. They should read as part of the paper model, e.g. rail as an inked line on a raised paper strip, buses as thin coloured thread. At Wales level, a hint of the rail network is welcome if it stays calm.
   - Hover or select a tip: a small card shows what sits **below** it: number of buildings downslope within a set distance, schools and other facilities downslope, **any railway line, station or bus route below it**, distance to the river, official category, and "risk raised this decade by the wet curveball".
   - "Below" is a **model rule**, so show it as one: a small "How is this worked out?" link opens the rule card: plain-words rule ("buildings within 500 m and lower than the tip's base"), parameters (distance, height), source of each input, and a confidence badge (Low: a crude proxy, not an engineering assessment). The distance parameter can be changed with a slider and the counts update live. This is the transparency feature in miniature.
   - Placing a token stitches a carthen-thread ring on the tip. Tokens can be moved until confirmed.
   - Also show, as a quiet layer, the legacy context: one line of history for the valley (on rails: coal boom to closure), and the 1913 peak. Facts from memory must be marked "to check".
4. **Fold back up.** Confirm returns to Wales. The **Resilient** strand moves up **one pip** (and Healthier perhaps a pip), Trust moves slightly, and the played card is spent.
5. **Pull the thread.** Clicking the moved strand opens a trace: strand, then card, then the three tips chosen (named, with what sat below them), then the rule and its sources. Draw it as a red thread through the UI as in v1.

The national result moves in pips and bands; never show a summed national number from the place view.

### What the Rhondda data actually holds (read before designing the tip choice)

- **Tips are a fallback, not the official register.** The Welsh Government "Disused Coal Tips in Wales" data is licensed for personal use only, so it was not used. `tips` has 17 entries: 1 OSM spoil heap polygon and 16 BGS National Landslide Database points whose names or descriptions mention tips (e.g. Maerdy Spoil Tips, Wattstown Tip). They have no official category. So: drop "official category" from the tip card; show each tip's source honestly ("BGS landslide record near a tip"), and say in the rule card that the official register exists but is not open. Draw point-only tips as a small mound at that spot, sized modestly, never implying an outline we do not have.
- **Extra layers to use:** `flood` (NRW river flood zones 2 and 3; licence to verify) and `lsoas` (WIMD 2019 deprivation rank by neighbourhood, 1 = most deprived of 1,909). Add both to the "below" card: whether the land below is in a flood zone, and the deprivation rank of the neighbourhood below. Deprivation makes the dilemma sharper (it links to the More equal strand).
- `facilities` includes schools, chapels, surgeries and 13 miners' institutes and workmen's halls: show institutes as heritage assets.
- Stations, bus stops and bus routes are being added to the same file (`stations`, `busStops`, `busRoutes`); if they are missing when you start, check again before finishing.

## Content

- Keep everything bilingual with one dictionary per language and `?lang=cy`. Welsh place names from the data (`name:cy`) where present; mark any Welsh you write yourself for the fluent reviewer.
- All figures that are not from the data files: label "illustrative".
- No em or en dashes anywhere.

## Files

- Write `design/mockups/papur-v2.html` (inline CSS/JS; d3@7.9.0 from jsdelivr if needed). Do not modify `papur.html`, the data files or other mockups.
- Screenshots to `design/mockups/shots/papur-v2-*.png`: at least (1) Wales view, (2) Rhondda view with one tip selected and its "below" card, (3) the rule card open, (4) back in Wales with the trace open; plus one Welsh screenshot of the Rhondda view. The screenshot helper `design/scripts/shot.mjs` only captures the first state, so write your own small Playwright script (copy its pattern) that clicks through the flow. Iterate on what you see at least three times. Check 1440 x 900 and 1280 x 800.

## Report back (short)

Paths, how the flow works, what the tip choice looks like with real data (how many tips, how different they are below), and what you could not do.
