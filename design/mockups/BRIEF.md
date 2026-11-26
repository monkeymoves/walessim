# Mockup brief: three looks for the Wales game

*26 November 2026. Throwaway look-and-feel mockups so Luke can react to visual directions. Not production code.*

## The game, in one breath

A strategy game about Wales built on real open data, real places and real history. Past (1780 on, told on rails), present (real data), future (played to 2100). You govern Wales term by term (5-year turns) but are judged as a steward: at each generation boundary (every 25 years) the next generation judges what you left them. Scoring is seven strands, one per well-being goal of the Well-being of Future Generations (Wales) Act 2015. Every relationship in the model can be traced to its source ("pull the thread").

## What every mockup must show (same content, different look)

One static game screen, 1440 x 900 primary (must not break at 1280 x 800):

1. **The map of Wales**, drawn from `data/wales.js` (load with `<script src="data/wales.js"></script>`, it sets `window.WALES`; read its `_note`). Real terrain (`elevation.rows`, 1 km cells, metres; -1 sea, -2 land outside Wales which you may show faintly or not), the 22 local authority boundaries (`las[].rings`, km coordinates, same frame as the grid: x right, y down), towns (`towns`), heritage/industry sites (`sites`, with `kind`: coal, slate, copper, steel, energy, heritage, water), peaks (`peaks`). Names have `en` and `cy`. The map is the hero and should fill most of the screen.
2. **Legacy markers**: coal tips in the south Wales valleys (place a few around Tonypandy, Merthyr Tydfil and Ebbw Vale) shown as a lasting liability, visibly different from assets.
3. **A selected place** (Rhondda Cynon Taf) highlighted on the map, with a place panel: name in both languages, two or three figures from `las[].approx` (label them "approx., unverified"), one sentence of history (coal boom to closure), a source chip, and a confidence badge (High / Medium / Low).
4. **Top bar**: year 2031, "Term 2 of 5, Generation 2025 to 2050", and the **seven strands** as compact meters (current level plus a small change arrow). Goals, EN / CY:
   - A prosperous Wales / Cymru lewyrchus
   - A resilient Wales / Cymru gydnerth
   - A healthier Wales / Cymru iachach
   - A more equal Wales / Cymru sy'n fwy cyfartal
   - A Wales of cohesive communities / Cymru o gymunedau cydlynus
   - A Wales of vibrant culture and thriving Welsh language / Cymru â diwylliant bywiog lle mae'r Gymraeg yn ffynnu
   - A globally responsible Wales / Cymru sy'n gyfrifol ar lefel fyd-eang
   Use short labels in the meters (e.g. Prosperous / Llewyrchus) with full names on hover or in a tooltip.
5. **A hand of four policy cards**. Each shows: title, which strands it strengthens and which it strains (no card is free), cost, and a delay ("pays out in 2 terms"). Use:
   - Restore upland peat / Adfer mawndiroedd yr ucheldir (strengthens resilient, globally responsible; strains prosperous short-term; delay 2 terms)
   - Make coal tips safe / Gwneud tomenni glo yn ddiogel (resilient, healthier, cohesive; costly; delay 1 term)
   - Community-owned energy / Ynni dan berchnogaeth gymunedol (prosperous, cohesive, globally responsible; strains nothing much but needs partners)
   - Welsh-medium childcare / Gofal plant cyfrwng Cymraeg (culture and language, more equal; delay 3 terms)
6. **A curveball** from the horizon scan, visibly different from policy cards: "Climate instability: a wet, stormy decade" / "Ansefydlogrwydd hinsawdd: degawd gwlyb a stormus", with its ripple ("raises coal tip risk").
7. **A timeline strip** 1780 to 2100 with three eras, Ddoe (past), Heddiw (present), Yfory (future), the current position marked at 2031, and generation boundaries every 25 years from 2025.
8. **EN / CY toggle that works**: every visible string comes from one dictionary per language; switching re-renders. `?lang=cy` in the URL opens in Welsh. Place names switch too.
9. A small honest footer: "Mockup. Illustrative values. A thinking tool, not a forecast." (and the Welsh: "Ffug-gynllun. Gwerthoedd enghreifftiol. Offeryn meddwl, nid rhagolwg.")

You may write Welsh for any extra strings, but keep extra text minimal; Luke will have a fluent reviewer later.

## Design standard: bespoke, not generic

Luke explicitly wants bespoke design, "not slop or copied". Invoke the `frontend-design:frontend-design` skill before writing anything. Then:

- It must not look like a default web dashboard, a Tailwind template, a Civilization clone, or Karpathy's painterly hex map. No purple gradients, no glassmorphism, no emoji used as icons, no generic card shadows on white.
- Fonts with character from Google Fonts, never Inter, Roboto, Arial or the system default. **Welsh needs ŵ and ŷ** (Latin Extended-A): load the `latin-ext` subset and check that "Tŷ Gŵyr, Ŵyl" renders in your faces in a screenshot.
- Palette drawn from Wales and from your medium, defined once as CSS custom properties.
- Draw the map yourself in canvas or SVG from the data. Make the terrain read as real Wales: Eryri, the Cambrian Mountains, Bannau Brycheiniog, the valleys, Pembrokeshire, Anglesey.
- Icons for sites and cards drawn in SVG in your style (a few simple marks are fine).
- Text contrast WCAG AA for body text.
- Writing style: **never use the em dash or en dash characters** in any text or comment. Use commas, colons or "to".

## Files and rules

- Write exactly one file: `design/mockups/<your-name>.html` (inline CSS and JS; external scripts only from cdnjs.cloudflare.com or cdn.jsdelivr.net with exact versions, e.g. d3@7.9.0; fonts from Google Fonts).
- Do not edit `data/wales.js`, this brief, or other mockups.
- Do not use the built-in browser pane (other agents share it). Check your work headlessly:
  `node design/scripts/shot.mjs design/mockups/<name>.html design/mockups/shots/<name>-en.png 1440 900`
  and the same with `cy` as the fifth argument for Welsh. It prints console errors. Read the PNG to look at it. Iterate at least three times on what you see: composition, legibility of the map, hierarchy, the Welsh layout (longer strings). Also check 1280 x 800.
- Run commands from `.`.

## Report back (short)

The file path, the final screenshot paths, two or three sentences on the design idea and what makes it distinctive, and anything you could not do.
