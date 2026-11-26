# src/map: the paper relief map

A framework-free canvas renderer for the Papur v2 look (design/mockups/papur-v2.html): Wales as stacked paper contour sheets on a shelved sea, authorities that lift when hovered, a twisted red thread round the selection, the player's work as carthen cross-stitches, and authored places reached by folding the national sheet down. The Solid UI drives it through one class.

## Files

| File | What it does |
|---|---|
| `PaperMap.ts` | The class: DOM, sizing, events, pointer and wheel, the place controls, fold orchestration. |
| `national.ts` | The national sheet: cached sea, relief, lens and label layers; the live hover, selection, highlight, markers, stitches and thread. |
| `place.ts` | A place view: relief, landuse, flood, water, rivers, roads, rail, buildings, buses, stops, facilities, stations, names, selectable items, tokens and the below zone. |
| `relief.ts` | Contour geometry from elevation grids via d3-contour (national bands, sea shelves, land beyond Wales; place bands). Pure. |
| `paper.ts` | Canvas helpers: paper sheets with shadow and bevel, grain, paths, haloed labels, DPR-aware shadows. |
| `glyphs.ts` | Small drawn marks: houses, peaks, site discs, tip mounds, stitches, stations, facilities, tags, route pills. |
| `lens.ts` | Indicator value to sheet colour (sequential, diverging about a centre). Pure. |
| `palette.ts` | Reads the CSS custom properties below, colour parsing and OKLab ramps. |
| `hit.ts` | Point-in-polygon, label points, keyboard order and arrow-key neighbours. Pure. |
| `geo.ts` | Loads and decodes `public/data/wales-geo.json`, the optional national rail file and place files. |
| `fold.ts` | The fold-down and fold-up animation (Web Animations API, 1.2 s). |
| `types.ts`, `index.ts` | Public types and exports. |
| `demo.html`, `demo.ts`, `demo-shots.mjs` | Dev page and its screenshot script (see below). |

The "what sits below this tip" rule lives in `src/engine/place-analysis.ts` (`analyseBelow`, `placeItems`), DOM free and unit tested. The place data types are defined there too; they belong in `src/model/schema.ts` once that exists.

## Data

`npx tsx scripts/build-geo.ts` writes:

- `public/data/wales-geo.json`: `design/mockups/data/wales.js` with the elevation grid packed as base64 little-endian Int16 (`elevation.encoding: "int16le-base64"`), the four `regions` from `model/regions.yaml`, label offsets for towns, sites and peaks, and the upland and sea names (`labels`) placed in the mockup.
- `public/data/places/*.json`: copied from `model/data/places/`. If there is no `rhondda.json` there it converts the mockup's `rhondda.js` as a stand in.
- `public/data/wales-rail.json`: copied from `model/data/wales-rail.json` when present.

`loadGeo("/data/")` fetches the geo file and the rail file (optional, a 404 is fine). Rail may be `{ lines: [{ kind, name, coords | pts }], stations: [{ name, x, y }] }`, a bare array of lines, or GeoJSON LineStrings in lon/lat or km. `loadPlace("rhondda")` fetches a place and fills any missing optional layer with an empty list; every layer except `bbox` and `elevation` is optional. Place elevation may be `rows` or base64 `data`.

## API

```ts
import { PaperMap, loadGeo, loadPlace } from "./map";
import { analyseBelow, placeItems } from "./engine/place-analysis";

const geo = await loadGeo("/data/");
const map = new PaperMap(host, {
  geo, lang: "en",
  palette?: Partial<Palette>,      // overrides on top of the CSS custom properties
  reducedMotion?: boolean,         // default: follows prefers-reduced-motion
  padding?: { top, right, bottom, left }, // px kept clear for panels over the map
  layers?: Partial<Layers>, ariaLabel?: string, maxDpr?: number (default 2),
});
```

The map fills `host` (which it makes `position: relative` if static) and follows its size with a ResizeObserver. It is controlled: clicks emit events, the UI sets state.

**National view**

| Call | Effect |
|---|---|
| `setLang("en" \| "cy")` | Names on the map. |
| `setLens({ values, domain: [min, max], ramp, higherIsBetter, centre? } \| null)` | Tints each authority as a paper sheet within the relief (terrain shading kept). `ramp: "sequential"` or `"diverging"`; a diverging lens centres on `centre` (pass the Wales value; default the domain middle), runs worst to best when `higherIsBetter` is true, is flipped when false, and uses neutral hues when null. Missing values are hatched. |
| `setSelected(code \| null)` | Lifts the authority and outlines it in twisted red thread. |
| `setHighlight(codes)` | A region: other authorities wash pale, these are outlined in ink. `[]` clears. |
| `setStitches([{ id, at: { la } \| { x, y }, kind, label? }])` | Rings of cross-stitches; `kind` is `made-safe`, `planted`, `built` or `generic` (a small sign in the ring). Several at one place spiral apart. |
| `setMarkers([{ id, x, y, kind, label?, size?, glyph? }])` | `tip` (a coal tip mound), `warning` (dashed amber circle, `size` x 6 km radius), `site` (a disc with `glyph`: coal, slate, copper, steel, energy, heritage, water), `town`, `pin`. Drawn under the names. |
| `setLayers({ rail, towns, sites, peaks, labels, markers, stitches })` | Booleans, merged. |
| `setThread({ la, to: [px, py] } \| null)` | A red thread from an authority to a point in host px (a panel's edge), as in the mockup. |
| `setPadding(p)`, `setAriaLabel(national, place?)`, `refreshPalette()` | Layout, accessible names, re-read CSS variables after a theme change. |
| `focusLa(code \| null)` | Keyboard focus: lifts as hover and emits `hover` with `source: "keyboard"`. |
| `laOrder` | Authority codes in reading order (north to south in 30 km bands, west to east). |
| `neighbour(code, "up" \| "down" \| "left" \| "right")` | Nearest authority that way, for arrow keys. |
| `anchorOf(code)`, `project(x, y)`, `unproject(px, py)` | km frame and host px conversions for popovers. |

**Events**: `map.on(name, fn)` returns an unsubscribe function.

- `hover (code | null, info)`: `info = { code, name, en, cy, value?, px, py, x, y, source }`.
- `select (code | null)`: a click on an authority, or on the sea (null).
- `placeItem (id | null)`: a click on a place item, or on empty ground (null). A drag never clicks.
- `placeHover (id | null, { px, py } | null)`.
- `view ("national" | "folding" | "place")`.

**Place view**

```ts
const place = await loadPlace("rhondda");
map.warmPlace(place);                 // optional: build its relief and sheet ahead (about 100 ms)
map.place.setSelectable(placeItems(place).map((i) => ({ id: i.id, x: i.x, y: i.y, rings: i.rings, tag: String(i.n), name })));
await map.enterPlace(place, { focusLa: "W06000016", ariaLabel });
map.on("placeItem", (id) => {
  map.place.setSelected(id ? [id] : []);
  const below = id ? analyseBelow(place, id, { distanceM: 1000, minDropM: 10 }) : null;
  map.place.setBelowZone(below?.belowMask ?? null);
});
map.place.setTokens(ids);             // the player's stitched items
await map.exitPlace();
```

`map.place` also has `zoomIn()`, `zoomOut()`, `resetZoom()`, `zoomTo(x, y, zoom)`, `focusItem(id)`, `anchorOf(id)` (an item's tag in host px) and `zoom`. Wheel zooms about the pointer, drag pans when zoomed in, two-finger pinch zooms. `map.zoomIn()` and `map.zoomOut()` forward to the place. `setBelowZone` also accepts polygon rings in km. Place state set before `enterPlace` is kept.

`resize()` re-measures (the ResizeObserver calls it), `destroy()` removes everything. `map.stats` holds timings: `prepareMs`, `firstRenderMs`, `lastLensMs`, `lastFrameMs`, `placePrepareMs`, `placeSheetMs`.

## CSS custom properties

Read from the host element with `getComputedStyle` at construction and on `refreshPalette()`. Any CSS colour works. Fallbacks are the mockup's colours (`DEFAULT_PALETTE` in `palette.ts`).

| Variable | Used for | Fallback |
|---|---|---|
| `--paper` | Glyph discs, stitch backing, the region wash | `#FAFAF6` |
| `--paper-edge` | Paper edges | `#D2D2CA` |
| `--paper-beyond` | Land beyond Wales (England) | `#E9E9E3` |
| `--board` | The card around a place's surveyed block | `#DDDCD4` |
| `--ink`, `--ink-2`, `--ink-3` | Labels, outlines, glyphs | `#1F2A30`, `#4E5B63`, `#6B767C` |
| `--map-halo` | Halo behind labels | `rgba(246,246,240,.88)` |
| `--sea-0` to `--sea-5` | Deep sea, then five shelves from 30 km out to 1.6 km out | `#7D96A0` ... `#CEDCD8` |
| `--relief-0` to `--relief-11` | National relief sheets, lowland to summit (levels 45, 110, 180, 250, 320, 390, 460, 530, 610, 700, 800 m) | mockup `LAND` |
| `--relief-place-0` to `--relief-place-8` | Place relief stops, interpolated to the place's levels | mockup `RCOL` |
| `--relief-lens-0`, `--relief-lens-1` | The neutral relief under a lens, low and high | `#F8F6EF`, `#D6D2C4` |
| `--thread-red`, `--thread-red-dark`, `--thread-red-hi` | Selection thread, its twist, its light; pins; selected tags | `#B0262C`, `#6E1418`, `#FF9696` |
| `--thread-stitch`, `--thread-stitch-dark`, `--thread-stitch-hi` | Stitches and stitched tags | `#2C4E95`, `#14244A`, `#4A6FBF` |
| `--map-warning` | Warning circles | `#C98A2B` |
| `--lens-seq-1` to `--lens-seq-5` | Sequential lens ramp, low to high | oat to umber |
| `--lens-div-1` to `--lens-div-5` | Diverging ramp, worst to best (3 is the centre) | rust, paper, teal |
| `--lens-div-neutral-1` to `--lens-div-neutral-5` | Diverging ramp with no better direction | slate blue, paper, ochre |
| `--lens-missing` | Authorities with no value (also hatched) | `#D9D8D0` |
| `--map-rail` | National rail ink | `#1F2A30` |
| `--place-water`, `--place-river`, `--place-stream` | Water bodies, rivers, streams | `#9DB9C4`, `#4D7F96`, `rgba(60,105,130,.42)` |
| `--place-wood`, `--place-residential`, `--place-flood` | Woodland tint (multiplied), residential card, flood zone wash | see `palette.ts` |
| `--place-building`, `--place-road` | Buildings, major road fill | `#FBFAF5`, `#F2EBD8` |
| `--place-below`, `--place-below-zone` | Buildings below a tip, the below cells | `#8E3B12`, `rgba(201,138,43,.30)` |
| `--map-bus-1` to `--map-bus-6` | Bus route threads, longest route first | carthen madder, mustard, navy, plum, bottle, teal |
| `--font-sans` (or `--sans`), `--font-serif` (or `--serif`) | Label fonts; the map waits for these faces to load | Familjen Grotesk, Newsreader |

## Performance

Caches: the sea and beyond-Wales sheet, the natural relief, the neutral relief (built when idle after the first frame), the lens tint (22 fills and one multiply over the neutral relief), and the labels are each an offscreen canvas per size. Hover, selection, highlight, markers, stitches and the thread are drawn per frame over blits. The place sheet is drawn once per scale over the viewport plus a 35% margin (buildings in batches on a layer that casts one shadow), slid while panning, scaled while zooming, and redrawn crisp 140 ms after the gesture rests.

Measured in headless Chromium at 1440 x 900 (`node src/map/demo-shots.mjs`; `CHANNEL=chromium` for the GPU canvas path):

| | Software canvas | GPU canvas |
|---|---|---|
| National relief geometry (d3-contour) | about 100 ms | about 105 ms |
| National first render, including the above | about 225 ms | about 120 ms |
| Lens change, recolour and frame, raster flushed (DPR 1 / DPR 2) | about 35 / 55 ms | about 10 / 15 to 26 ms |
| Place relief and data prep | about 50 ms | about 50 ms |
| Place sheet (13,868 buildings) | about 55 ms | about 30 to 50 ms |
| Click to fold start, place warmed | under 25 ms | under 10 ms |

## Dev page and screenshots

`npx vite --port 5179`, then open `/src/map/demo.html`: lens toggles, click to select, a region highlight, stitches, Welsh names, and the Rhondda with its tips (click a tip to see what sits below it). `node src/map/demo-shots.mjs` saves `design/shots-build/map-*.png` and prints timings and console errors.
