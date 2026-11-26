# Etifeddiaeth design system: Papur, v1

For the agents building v1. `game-design.md` (same folder) decides what the game does: mechanics, numbers, card data, strings for bands and results. This document decides what everything looks like and how it is worded on screen. Where game-design.md describes a visual form ("solid chips", "pips"), the form given here wins. Read this once, import `tokens.css`, and keep `specimen.html` open beside your work (`specimen.png` is the rendered reference). Where this document and `tokens.css` disagree, the tokens are what ships; fix the document.

The world in one sentence: **a cut-paper relief model of Wales on a grey millboard, lit from the north-west, with a hand of railway tickets beside it, a few pieces of slate, yarn for the seven goals, one red thread for provenance and one cobalt stitch for what the player did.**

Every rule below follows from asking "what would this be if it were really made of paper, card, slate and wool?" If a component cannot answer that question, it does not belong.

Writing rule for every string, comment and document: plain British English, and never the em dash or en dash characters. Use a comma, a colon, brackets or two sentences. Ranges are written "2025 to 2050".

---

## 1. Diagnosis: what reads as "AI made" in papur-v2, and the rule that fixes each

The map and the idea are good. The tells are all in the furniture around the map.

| # | What the mockup does | Why it reads as generated | Rule |
|---|---|---|---|
| 1 | Familjen Grotesk for interface, Newsreader for titles | The "friendly grotesk plus bookish serif" pair is the default of every generated editorial page. Neither face has anything to do with Wales, paper or print. | **Two faces with a job each: Besley (a Clarendon) and Archivo set narrow.** See section 2. No third family, no monospace. |
| 2 | Every panel is the same object: a near-white rectangle, 2px radius, the same three-part soft shadow | "One card style for everything" is the SaaS kit. Nothing tells you a ticket from a table from a tooltip. | **Five materials, each with its own edge and height** (sheet, ticket, slate, strip, slip). A thing's material says what it is. Section 4. |
| 3 | Shadows are soft and mostly straight down (`2px 4px 6px -3px`) | Blurred, centred shadows are the look of a component library. A relief model has a sun. | **Light comes from the north-west. Every shadow is hard-edged and falls south-east.** Three heights only. No glow, no shadow on all four sides. |
| 4 | Chips everywhere: strand chips on tickets, a boxed "CY", "Ripple", "Needs partners", source chip, risk chip | Pill and chip soup. Bordered little boxes are how generated UIs fake structure. | **No chips.** A strand is a snippet of yarn and a word. A language is the italic line. A source is a red docket. A warning is a hatched strip. If it has a border and a radius and holds two words, delete the border. |
| 5 | Strand meters are ten rounded pips in seven identical tiles | Pill-shaped segmented progress bars. | **Yarn wound along ten pegs**: a continuous square-ended length with a twist pattern, a knot when it rose, a frayed end when it fell. Section 4.6. |
| 6 | Small grey labels above things: "Selected place", "Your hand", "From the horizon scan", "Tip / Homes below / What else is below", "Strand", "Card", "Rule and sources" | The eyebrow label habit. Most of them say what the eye already knows. | **A label must earn its place.** Delete any label whose removal loses nothing ("Selected place" above a place name). Never set labels in tracked capitals. Capitals exist only as ticket furniture and nowhere else. |
| 7 | Cost and payout as `●●○○` dots; letter squares `S R B F D` in the table needing a legend | Abstract glyph codes that need decoding. | **Say it in words and figures.** The unit is still the pip, but it is printed as a figure: "Cost 4 of 8 pips", "Pays out in 1 term". In the ledger, name the columns ("School", "Railway", "Flood zone") and mark presence with a cut square. |
| 8 | Icons are thin outline pictograms in a generic set style | Icon-library look. | **Hand-cut silhouettes**, section 5. Solid shapes, straight cuts, detail removed with the knife. |
| 9 | Timid colour: grey board, near-white paper, greyed strands, one red | Safe and bloodless. The print mockup had more nerve. | **Coloured ticket stock** (buff, green, pink, blue, by scope), **slate** as a real dark material, **full-strength yarn dyes**. Colour always encodes something. |
| 10 | The cobalt button and the red links sit beside grey buttons with no logic | Colour by habit. | **Red means provenance only. Cobalt means the player's own stitch only.** The ordinary primary action is a slate stamp. Section 3 and 4.8. |
| 11 | Everything is level: no element is bolder than its neighbours | Even weight everywhere is the surest tell. | **Spend the boldness in one place per screen**: the year in Besley 800. One piece sits askew (the curveball slip). Everything else is square and quiet. |
| 12 | Welsh is the boxed afterthought ("CY" pill beside an italic name) | Token bilingualism. | **The pair is a typographic system**, section 2.4. Whichever language is active leads; the other sits beneath in italic at four fifths, with no badge. |
| 13 | Hover lifts and transitions on most things | Motion by default. | **Motion only answers an action**, and only four motions exist: fold, stitch, lift, stamp. Section 4.14. |
| 14 | Footnote meta strings and dotted separators | Template chrome. | Separate with space, a rule, or a new line. No middle dots, no arrows after link text. |

### The three rules that matter most

1. **Material says what it is.** No universal card. A ticket is card stock with a perforated stub; a sheet is square-cut cartridge paper; Trust, slips and stamps are slate; meters are strips glued flat. If two different kinds of thing look alike, one of them is wrong.
2. **Light from the north-west, and no decoration that does not encode something.** Hard south-east shadows at three heights. Radius only on things that are round in life. Red is provenance, cobalt is the player, ticket stock is the scope, weave trim is the strands. No chips, no eyebrow capitals, no ornament without meaning.
3. **Two typefaces doing printers' jobs.** Besley for anything a printer would have set as a title, a figure or a paragraph; Archivo, always narrowed, for anything a clerk would have filled in. The other language is the italic line beneath, in both directions.

---

## 2. Typography

### 2.1 The faces

| Role | Family | Fontsource package | Version | Axes |
|---|---|---|---|---|
| Print: display, titles, narrative, big figures, other-language line, map water | **Besley** | `@fontsource-variable/besley` | 5.3.0 | wght 400 to 900, roman and italic |
| Clerk: interface, labels, tables and tabular figures, ticket furniture, map towns | **Archivo** | `@fontsource-variable/archivo` | 5.3.0 | wght 100 to 900, wdth 62 to 125, roman and italic |

Both are under the SIL Open Font Licence. Both ship a `latin-ext` subset that contains ŵ ŷ Ŵ Ŷ (checked in the font files, U+0174 to U+0177, and rendered in the specimen).

```js
import "@fontsource-variable/besley/wght.css";
import "@fontsource-variable/besley/wght-italic.css";
import "@fontsource-variable/archivo/standard.css";         // "standard" carries both wght and wdth
import "@fontsource-variable/archivo/standard-italic.css";
```

Family names registered by those packages: `"Besley Variable"` and `"Archivo Variable"`. Use the tokens `--font-print` and `--font-grot`, never the names directly.

**Why Besley.** Besley is a revival of Clarendon, cut in 1845 at the Fann Street Foundry in London by Robert Besley and Benjamin Fox. Clarendons and their Egyptian cousins were the jobbing printer's workhorses through exactly the decades this game's past is about: the railway, coal and chapel years. They are the letters of the Edmondson railway ticket, the timetable, the colliery notice, the chapel anniversary bill and the eisteddfod poster. Luke's kept touch from the print mockup, the ticket card, was already set in a fat slab; Besley is the refined, readable member of that family. It has a true italic (needed for the bilingual pair and for water on the map), holds up at 13.5px, and at weight 800 it gives the year real presence without looking like a tech landing page.

**Why Archivo, and why always narrow.** Tickets, ledgers and timetables were filled in with condensed grotesques, because clerks needed many characters in a small box. Archivo is an open grotesque with a width axis, real italics and tabular figures. Narrowing it does two jobs at once: it stops it looking like the default sans of every web app, and it buys back the 15 to 20 per cent extra length that Welsh strings need. **Archivo is never set at width 100.** Three widths exist: 92 (running interface text), 82 (labels, map towns), 68 (ticket furniture and tight column heads).

What we are not using: no monospace (small data labels in mono is a tell; Archivo tabular does the work), no third display face, no font from the banned list.

### 2.2 The scale

All sizes in px for a 1440 wide board. Tokens are in `tokens.css` under "Type scale"; the media queries there adjust them for 1280 and tablet.

| Style | Face and weight | Size / line height | Tracking | Used for |
|---|---|---|---|---|
| Poster | Besley 800 | 72 / 68 | -0.015em | Title screen, the heading of the generation's letter. Not in play screens. |
| Year | Besley 800 | 44 / 44 | -0.01em | The year in the top bar. The one loud thing on the board. |
| Title 1 | Besley 700 | 26 / 29 | -0.005em | Place name, drawer title, model book page title |
| Title 2 | Besley 600 | 20 / 23 | 0 | Ticket title, slip title, popover title |
| Title 3 | Besley 600 | 17 / 20 | 0 | Sub-headings, tooltip heading (14.5 in tooltips) |
| Story | Besley 400 | 15 / 22.5 | 0 | Narrative: place history, voices, the letter, model book prose. Measure 34 to 62 characters. |
| Story small | Besley 400 | 13.5 / 19.5 | 0 | Narrative inside small panels |
| Interface | Archivo 440, width 92 | 13.5 / 19 | 0 | Running interface text, buttons, tooltips, table cells |
| Interface strong | Archivo 640, width 92 | 13.5 / 19 | 0 | Emphasis, button text on paper tabs |
| Label | Archivo 640, width 82 | 12.5 / 15.5 | 0 | Field labels, meter names, map town names. Sentence case. |
| Small | Archivo 440, width 82 | 11.5 / 15 | 0 | Captions, units, attributions. **The floor: nothing smaller.** |
| Ticket furniture | Archivo 760, width 68, capitals | 10.5 / 10.5 | 0.09em | On tickets only: "COST", "PAYS OUT IN", the scope. Always beside a figure or word that carries the meaning. |
| Big figure | Besley 700 | 26 / 26 | 0 | The two or three numbers a panel is about ("237k", "11.4%") |
| Data figure | Archivo 440 to 640, width 92, `tabular-nums lining-nums` | as Interface | 0 | Every number in a table, meter, counter or axis |
| Serial | Besley 700, thread red | 12.5 | 0.06em | Ticket number ("No. 0440"), like a numbering machine |
| Map water | Besley italic 400 | 15 to 19 | 0.14em | Seas, bays |
| Map range | Besley italic 400 | 13 to 15 | 0.04em | Mountains, regions |
| Map town | Archivo 640, width 82 | 12 to 13.5 | 0 | Towns, with a 2px paper halo |

Rules:

- **Figures.** Tables, meters and anything that changes in place use Archivo with `font-variant-numeric: var(--figures-data)`. Besley numerals stay proportional (its tabular zero does not hold weight in the variable build, so do not switch `tnum` on for Besley). Right-align numeric columns; put the unit in the header when every row shares it.
- **Labels** are sentence case, weight 640, no tracking. There are no small caps in either face, and faked small caps are forbidden. Capitals with tracking appear only as ticket furniture.
- **Weights in use:** Besley 400, 600, 700, 800 (500 allowed for large italic Welsh display lines). Archivo 440, 540, 640, 760. Nothing lighter than 400 anywhere.
- **Emphasis** inside narrative is italic, never bold. Do not accent one word of a title in another colour or style.
- **Line length.** Narrative never exceeds 62 characters; tooltips 34.
- **Numbers in prose** follow the house voice: "237,000 people", "11.4%", "44 ha", "£420m". A space before units that are words or symbols of area, none before %.

### 2.3 Figures of speech for type

- Titles are left aligned, always. Nothing is centred except the stamp on a played ticket and the word under the Trust gauge when the gauge stands alone.
- Quotation marks are curly; apostrophes are curly (’), including in Welsh ("mae’r").
- Underlines mean "this is a link to where a number came from" and are red. Nothing else is underlined.

### 2.4 The bilingual pair

Wales reads its two languages together on every road sign. The interface does the same wherever a **name** is shown, and keeps to one language for running text.

1. **The active language leads**, in the roman of whatever style applies. The language toggle (Cymraeg / English, written out in full, never "CY / EN" flags or codes) swaps which leads.
2. **The other language sits directly beneath** in Besley italic 400, at 0.8 of the lead line's size (`--other-lang-scale`), in `--ink-2`, with 0.22em of space above. Class `.other` in the specimen. No badge, no box, no brackets.
3. **This is symmetric.** In Welsh mode the Welsh line is roman and the English is the italic beneath. Italic means "the other language", never "Welsh". Neither language is ever greyed below 4.5:1 contrast or dropped at smaller breakpoints.
4. **What gets a pair:** place names, ticket titles, strand names, the curveball title, era names (Ddoe, Heddiw, Yfory keep their Welsh names in both modes, with "the past / the present / the future" as the pair in English mode). **What does not:** running narrative, buttons, tooltips, table cells, errors. Those are in the active language only.
5. **Where the names are the same** in both languages (Rhondda Cynon Taf), show one line. Do not print it twice.
6. **Where both must be equal** (title screen, first-run language choice, the share card), set them side by side at the same size and weight, Welsh first.
7. **Markup:** every other-language span carries `lang="cy"` or `lang="en"` so screen readers switch voice. The document `lang` follows the toggle.
8. **Welsh digraphs** (ch, dd, ff, ng, ll, ph, rh, th) are single letters. Never letterspace Welsh text so far that a digraph visually splits (tracking above 0.05em is for English ticket furniture and map water only; for Welsh map water, cap at 0.08em), and never break a line inside one.
9. **Fitting.** Welsh runs longer. Design every fixed-width slot for the Welsh string first. If a label will not fit at width 82, drop to width 68 before you abbreviate, and never truncate with an ellipsis in one language only.

---

## 3. Colour

All values are in `tokens.css`. Contrast figures are WCAG 2 ratios against `--paper` (#F5F3EA) unless stated.

### 3.1 Paper stocks

| Token | Hex | What it is |
|---|---|---|
| `--board` | #C9CBC2 | The grey millboard the model sits on. The page background. |
| `--board-deep` | #B4B7AD | Wells cut into the board: the bed of the stage, the language toggle recess |
| `--paper` | #F5F3EA | Cartridge. Heddiw, and every ordinary sheet. Warm white, not cream. |
| `--paper-2` | #E9E6DA | Second sheet: selected rows, undersides, the past half of a folded sheet |
| `--paper-edge` | #CFCBBB | The cut edge that shows on the south-east side of a sheet |
| `--paper-ddoe` | #D8CDB4 | Aged stock for the past |
| `--paper-ddoe-soot` | #B9AD95 | The same stock, smoked. Ddoe panels where the era is under strain, and the far end of the Ddoe timeline. |
| `--paper-yfory` | #E1E8E7 | Tracing paper for the future: cool, slightly translucent in feel |
| `--slate` | #353B45 | Heather-blue slate. Trust, the curveball slip, tooltips, the stamp button. |
| `--ticket-buff` / `-green` / `-pink` / `-blue` | #E6D3A3 / #C9D8B6 / #EBC4B8 / #C5D3DC | Ticket card stock. One per scope: national, region, between regions, standing ticket. |

Ddoe is done by swapping tokens, not by restyling components: set `data-era="ddoe"` on the era container and the stock, edge, rule and ink change together (ink becomes the engraver's sepia black `--ink-ddoe` #2B2622, 9.5:1 on aged stock). In Ddoe, shadows drop one height (sheets lie flatter, like plates in a bound book) and fills on the map become engraved hatching in `--soot` rather than flat tint. Yfory keeps Heddiw's paper and adds tracing-paper overlays plus the player's stitches.

Paper grain: one shared SVG `feTurbulence` noise tile (see `--grain` in the specimen), multiplied at about 11 per cent. Same tile on every stock. Never a photographic texture.

### 3.2 Inks

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--ink` | #1B2226 | 14.5 | Text, icons, rules that matter |
| `--ink-2` | #48535A | 7.1 (4.9 or better on every ticket stock) | Secondary text, the other-language line |
| `--ink-3` | #646E6C | 4.7 | Captions on `--paper` only. Not on tickets, board, `--paper-2` or Ddoe stock. |
| `--rule` | #C4C3B6 | decorative | Hairlines. Never the only edge of a control. |
| `--rule-strong` | #80857D | 3.4 | Input borders, every fifth ledger rule |
| `--on-slate` / `--on-slate-2` | #EEF0EA / #BFC6C8 | 9.8 / 6.5 on slate | Text on slate |
| `--brass` | #D9A21B | 4.9 on slate | Pins and pivots on slate. Not text on paper. |

Text straight on the board (`--board`) uses `--ink` or `--ink-2` only.

### 3.3 The two reserved threads

| Token | Hex | Means | Form |
|---|---|---|---|
| `--thread` (deep: `--thread-deep`, ground: `--thread-tint`) | #A81E2B | **Where a number came from.** Pull the thread, source dockets, "How is this worked out?", the trace lines across the map, the selected-row marker in the explorer (it links row to map). | A solid 2px line with a round pin head at its origin. Curves are single smooth sags, like thread under its own weight. |
| `--stitch` (text and focus: `--stitch-deep`, ground: `--stitch-tint`) | #2B6CD9 | **Something the player did.** Threads placed on tips, Yfory changes on the map, the stitch button, keyboard focus (the player's own position). | Always a dashed running stitch: dash 11, gap 6 at 3px weight; scale both with stroke. Never solid. |

Nothing else in the interface is red or cobalt. Errors are not red (section 3.5). The "now" marker on the timeline is a red pin because it is the origin of every thread.

### 3.4 The seven strand yarns

| Strand | Dye | Yarn (fill) | Deep (text, keyline) | Deep contrast | Twist pattern |
|---|---|---|---|---|---|
| Prosperous / Llewyrchus | Gorse gold | #D9A21B | #7A5A00 | 5.7 | Fine dark, leaning right |
| Resilient / Cydnerth | Bracken green | #2F6B3F | #2F6B3F | 5.7 | Fine light, leaning left |
| Healthier / Iachach | Lichen teal | #55B0A6 | #1F6B64 | 5.7 | Fine dark, upright |
| More equal / Mwy cyfartal | Heather | #A56BB0 | #7A3F86 | 6.6 | Broad dark, leaning right |
| Cohesive / Cydlynus | Brick rose | #C7725E | #8E3F2E | 6.5 | Fine dark, leaning left |
| Culture and language / Diwylliant ac iaith | Woad indigo | #232C63 | #232C63 | 11.7 | Fine light, leaning right |
| Global / Byd-eang | Sky | #8FC0E0 | #2B6288 | 5.9 | Broad dark, leaning left |

How this was checked: all nine reserved colours (seven yarns, thread, stitch) were run pairwise through Machado deuteranopia, protanopia and tritanopia simulations and compared in CIELAB. Normal vision: the closest pair is healthier and global at delta E 29. Deuteranopia: closest is resilient against the red thread at 18. Tritanopia: healthier and global at 16. Protanopia: resilient and cohesive at 12, which is the weakest pair in the set. Because of that pair:

- **Colour is never the only signal.** Every yarn carries its twist pattern (`--twist-*`), strands always appear in the same fixed order, and every yarn sits beside its name.
- Yarn fills are never used for text. Text in a strand's colour uses the deep value.
- Every yarn fill gets a 1px `--yarn-keyline` so pale dyes (gold, teal, sky) reach 3:1 against paper as graphical objects.
- The seven yarns are for strands only. Do not borrow them for charts, statuses or decoration. Map lenses have their own ramps.

### 3.5 Trust and warnings

- **Trust** is slate with paper-white bands and needle and a brass pivot. It reads by needle position and by its word ("Trust: Fair"). It has no traffic-light colours.
- **Warning:** `--warn` #8A5600 text or icon on `--warn-paper` #F4E6C4 (5.0:1), always with a hatched tab (`--warn-hatch`) at its left end and plain words.
- **Severe:** black ground (`--ink`) with paper text in Besley. The worst news is a black-edged notice, never red.
- **Success** has no colour. It is shown by the thing happening: the stamp lands, the stitch is sewn, the yarn gains a knot.

### 3.6 Map lens ramps

Lenses are stacked paper tints: classed, five steps, each class a cut layer with a lit north-west lip and a 1 to 2px south-east shadow, so higher values are literally higher. Never a continuous gradient, never rainbow, never the strand dyes.

| Ramp | Steps, low to high | Use |
|---|---|---|
| Peat | #F1EBD8 #E0CFA3 #C9A968 #A67C3C #6E4A1E | Default sequential: counts, density, cost |
| Woad | #E8EEF0 #C3D5DF #93B4C9 #5C8AA9 #2C5778 | Water, flood, rain, anything wet or cold |
| Moss | #EDF0DE #CFDCB4 #A3BF87 #6E9A5E #3B6B3F | Land cover, habitat, tree cover |
| Diverging | #2C5778 #7FA3BC #CBD9DE, mid #F1EEE2, #E3CC9B #BF8E45 #7A4E1C | Change over time, above and below the Wales average. Woad is below, peat is above. Safe for red-green deficiency. |
| No data | `--paper-2` with pencil hatch (`--lens-nodata`) | Always shown in the key, always named "No data" / "Dim data" |

Rules: use quantile or natural breaks and print the break values in the key in tabular figures; at most seven classes; the key is a little stack of offcuts in the same order as the map's layers; one lens at a time; the relief's own hypsometric tints fade to 35 per cent under a lens so two colour systems never fight.

---

## 4. Materials and components

### 4.1 Materials

| Material | Looks like | Edge | Resting height | Used for |
|---|---|---|---|---|
| **Sheet** | `--paper` with grain | Square cut, `--lit-edge` on the north-west, `--paper-edge` 1px on the south-east | `--shadow-sheet` | Place panel, drawer, model book page, popovers, key |
| **Strip** | `--paper`, small | Square | `--shadow-flat` (glued down) | Strand meters, table header, timeline |
| **Ticket** | Coloured card stock | 1.5px worn corners, perforated stub line | `--shadow-sheet`; `--shadow-lifted` in the hand on hover | Cards |
| **Slate** | `--slate`, grain overlaid | Square, hard `--shadow-slate` edge | fixed | Trust gauge, tooltips, stamp button, severe notices use ink instead |
| **Slip** | Slate-coloured paper | Square on three sides, torn along the bottom | drop shadow following the tear | Curveball |
| **Well** | `--board-deep` | `--shadow-well`, inset | below the board | The stage bed, toggles, inputs |

### 4.2 Edges, radii, shadows

- **Radius.** `--radius-cut` (0) for every sheet, strip, button, input, tooltip and table. `--radius-worn` (1.5px) for ticket corners. `--radius-round` only for things that are round in life: punch holes, pin heads, the gauge pivot, a knot. There is no 4, 6, 8 or 12px radius anywhere.
- **Light.** North-west. Every `box-shadow` and `drop-shadow` has positive x and positive y. The lit lip is a 1px inset highlight on top and left.
- **Three heights.** `--shadow-sheet` (resting), `--shadow-lifted` (under the pointer, or selected in the hand), `--shadow-held` (being dragged, or an open drawer). Strips use `--shadow-flat`. Shadows are stacked hard offsets with at most one small blur at the two upper heights. Use them sparingly: a screen should have no more than three things above resting height at once.
- **Borders** are not used to make boxes. A sheet is defined by its colour against the board and its cut edge. Inside a sheet, structure comes from space first, then a 1px `--rule`, then a 1.5 to 3px `--ink` rule for the one division that matters (under a table header, under the poster line).
- **Folds.** A sheet that folds shows a `--crease` line. Only the map sheet and the drawer fold.
- **Torn edges** are for slips only, cut with `clip-path`. Do not tear sheets or tickets.
- **Rotation.** Only the curveball slip (minus 1.3 degrees) and the stamp mark (minus 5 degrees) are off square.

### 4.3 The railway-ticket card

Based on the Edmondson ticket. Fixed proportions at each breakpoint (`--ticket-h`, `--ticket-stub-w`); full width of the rail.

```
+--+--------+---------------------------------------------+---+
|w |        |  Make coal tips safe                        | R |
|e |  icon  |  Gwneud tomenni glo yn ddiogel              | E |
|a |        |  [yarn] Resilient  [yarn] Healthier  ...    | G |
|v |        |  [open] frays Prosperous                    | I |
|e |No. 0440|  -----------------------------------------  | O |
|  |        |  COST 4 of 8 pips         PAYS OUT IN 1 term| N |
+--+--------+---------------------------------------------+---+
 18   stub :  body                                         26
           : perforation (2px dotted)
```

1. **Weave trim** (18px, left edge): the carthen pattern, a stepped diamond on an 18px tile, pixel-sharp. Ground colour is the first strand the card strengthens, centre square is the second, diamond is paper. It is the at-a-glance strand signal for the hand.
2. **Stub** (`--ticket-stub-w`): one hand-cut icon at 38px in `--ink`, and the serial ("No. 0440") in Besley 700 thread red. Red here is honest: the serial is the card's provenance and is what Pull the thread cites.
3. **Perforation:** `--perforation` between stub and body.
4. **Body:** title in Title 2 with its other-language line; then the pulls, each a 20 by 7px yarn snippet (dye, twist, keyline) and the strand name in Label. A strain is an open, dotted-ended snippet in the strand's deep colour and the words "frays Prosperous" in italic. "Needs partners" is a line of italic Small after the pulls, with no box. No chips or borders round any of this.
5. **Fare line:** a 1px ink rule, then "COST" in ticket furniture with the figure in Besley 700 16px and "of 8 pips" in Small (8 being this term's budget, so the weight of the card is plain); right aligned, "PAYS OUT IN 1 term", or "PAYS OUT this term" when the delay is nothing. Words and figures, not dots.
6. **Scope edge** (26px, right): the card's scope in ticket furniture, set vertically, in the active language only (it is too narrow for a pair): REGION, NATIONAL, TWO REGIONS, STANDING. Welsh: RHANBARTH, CENEDLAETHOL, DAU RANBARTH, SEFYDLOG.
7. **Stock** follows scope, like the class of a ticket: buff for national, green for region, pink for between regions (the compact), blue for the two standing tickets in the ledger drawer, white for lessons. Ink and `--ink-2` are the only text colours on stock.

States:

- **In hand, resting:** `--shadow-sheet`.
- **Hover or focus:** lift (`--lift-x`, `--lift-y`, `--shadow-lifted`). The "Play this card" stamp button appears at the top right of the body on the selected ticket only, not on every ticket.
- **Cannot play** (Trust or cost): the fare figure that blocks it is set on a `--warn-paper` ground with the hatch tab, and a line of Small says why ("Trust allows no more cards this term"). The ticket is not greyed out.
- **Played:** a nip is clipped from the top edge near the right (the inspector's clippers), body content drops to 50 per cent, and "PLAYED 2031" is stamped in Besley 800 capitals, 2.5px ink box, minus 5 degrees, multiplied on. The stamp must not cover the title.
- **In the post** (played, not yet paid out): the ticket slides to the timeline as a stub only (trim, icon, serial), sitting at its payout year.
- **Tablet:** the hand is a stack of five stubs with titles; the selected ticket opens to full anatomy.

### 4.4 The curveball slip

Slate-coloured paper, pinned at the top centre with a brass pin, torn along the bottom, rotated minus 1.3 degrees. Top left of the stage, over the sea.

- Line 1: where it came from, in Label on `--on-slate-2` ("From the horizon scan"). This one label earns its place: it tells the player the event is real.
- Title in Title 2 on `--on-slate`, with its other-language line.
- A 1px `--slate-2` rule, then the ripple: a `--warn-paper` tab with hatch and the word "Ripple", then what it does in Interface 540 ("Raises coal tip risk").
- It arrives once per term by sliding down from the top edge 24px (`--dur-slide`) and settling at its angle. It never pulses or bounces. With reduced motion it is simply there.
- Dismissed slips go to the drawer. The slip is the only torn, angled thing on the board. Do not reuse the treatment.

### 4.5 The place panel

A sheet, bottom left of the stage, 272px wide at 1440 (248 at 1280).

- Place name in Title 1; other-language line if the names differ. No "Selected place" label.
- Up to three big figures in a row (Besley 700, 26px) each with a Label beneath. Unverified figures carry a pencil underline (1px dotted `--ink-2`) and the words "approx., not yet checked" in Small italic.
- One paragraph of Story small, at most 60 words.
- At the foot: a source docket (a `--thread-tint` luggage-label shape with a punched hole, text in `--thread-deep`: "Census 2021, ONS") which starts Pull the thread; and confidence as words plus a stack of one to three offcut sheets ("Confidence: medium").
- A red pin on the panel's right edge with a thread to the place on the map.
- The panel closes by a cut "x" at top right (two straight strokes, butt ends) and by Escape.

### 4.6 Strand meters as yarn

Seven strips in the top bar, fixed order. Each strip:

- Strand name in Label (13.5px in the bar) on the left; on the right the move this term: a cut triangle (pointing up or down, flat edges) and a tabular figure, or the words "no change". Other-language name beneath in the pair style.
- **The yarn (flow score, how people are faring now):** a 9px track. A dotted guide thread runs the full length; the wound yarn covers `value x 10%` from the left, square-ended, in the strand's dye with its twist pattern and keyline.
- **The pegs:** a row of ten tick marks beneath, so the value can be counted. The numeric value ("5 of 10") is in the tooltip and in the accessible name.
- **The cross-stitch (stock score, what is being handed on):** a 10px ink cross-stitch sewn on the peg row at the stock value. When it sits left of the yarn's end, the present is being paid for out of the inheritance, and the player can see the gap.
- **Sharp result:** the yarn ends in a knot (a small diamond in the deep colour).
- **Fuzzy result:** the yarn ends in a loose fringe (three or four unspun ends in the deep colour) and the keyline is open at that end. The tooltip says "fuzzy: could be one pip either way".
- **Direction** is carried by the cut triangle and figure in the strip's head, never by the end of the yarn.
- **Ghost preview** (hovering a ticket): the pips the card would add or remove are drawn as an outline in the deep colour, dashed, with no fill.
- **Just changed:** the new length is sewn on with the stitch motion, one pip at a time, once.
- **Pullable** (a thread can be pulled from it): a red pin at the strip's bottom right corner. No red outline round the strip.
- At 1280 the other-language line stays; names may drop to width 68.

Mini form (on tickets, in tables): the 20 by 7px snippet.

### 4.7 The Trust gauge

Trust is not an eighth strand, so it is not paper and not yarn. It is slate.

- A slate block at the right of the top bar: a half-dial of four cut segments with small gaps, sized to the bands in game-design.md (Collapsed below 20, Thin 20 to 44, Fair 45 to 69, Strong 70 to 100). Segments up to and including the current band are lit in `--on-slate`; the rest are `--trust-band-off`. A tapered paper-white needle; a brass pivot. The points are never shown.
- Beside or beneath: the dial label in Besley 600 ("Trust: Fair") and what it allows in Label ("3 cards next term"). Welsh band names: Cryf, Gweddol, Tenau; collapsed is "Rydych wedi colli'r sedd" (to be checked by a Welsh speaker).
- Collapsed is a severe notice (black ground, Besley, paper text): "You have lost the seat."
- At the election step the card limit is stamped on the hand area in the stamp style ("3 CARDS THIS TERM").
- The needle moves only at the end of a term, in `--dur-slide`, with no overshoot.
- Accessible name states band, position and consequence: "Trust: Fair, third of four bands. 3 cards next term."

### 4.8 Buttons

Four kinds, each with one meaning. All are square-cornered, minimum height 34px (44 on tablet), sentence case, a verb first.

| Kind | Looks like | For | Example |
|---|---|---|---|
| **Stamp** (primary) | Slate block, Besley 600 14.5px in `--on-slate`, `--shadow-slate` | The one action that commits something on this surface | "Play this card", "Confirm and fold back up", "Hand on to 2050" |
| **Tab** (secondary) | Paper, 1.5px ink keyline inside, Archivo 640 | Stepping back, opening, anything reversible | "Fold back without playing", "Key", "Open the rules drawer" |
| **Stitch** | `--stitch-deep` block, white Archivo 640, a dashed white stitch line inset 5px | Placing the player's thread on the model. Nowhere else. | "Stitch a thread here" |
| **Thread link** | `--thread-deep` text, 1.5px red underline | Asking where a number came from | "How is this worked out?", "Pull the thread" |

- One stamp per surface. If two actions seem primary, one of them is a tab.
- **Pressed:** the button moves 2px right and 3px down onto its own shadow in `--dur-punch` (it is pushed into the board, towards the south-east).
- **Hover:** stamp and stitch lighten by 6 per cent; tab fills with `--paper-2`. No lift on buttons.
- **Disabled:** keep full-contrast text, replace the fill with pencil hatch over `--paper-2`, and say why in a line of Small beside it. Never a pale ghost of the button.
- No icons inside buttons unless the icon is the whole label (zoom plus and minus, close). No arrows after text.
- The language toggle is two tabs in a well, the active one raised: "Cymraeg" "English".

### 4.9 Rules drawer and model book pages

**Rules drawer** (in-game): a card-index drawer that slides in from the right over the rail at `--shadow-held`, 480px wide.

- Divider tabs across the top, cut as real tabs (a 28px high tab with one 45 degree cut corner), one per strand in strand order plus "Trust" and "Curveballs". The tab carries a yarn snippet and the strand name.
- Each rule is an index card (a sheet at `--shadow-flat`, stacked with 8px gaps): title in Title 3; the rule in one plain sentence of Story; then, behind a "Show the working" tab, the equation in Besley italic with variables defined in a two-column list, the confidence in words, and the source docket.
- Sliders are a slate knob on a ruled paper scale with tick marks and tabular figures. Anything the player has changed from the default is marked with a cobalt stitch beneath it and a "Put back" tab.

**Model book** (public web page): a bound book, one rule or source per page.

- Page is a `--paper` sheet 720px wide on the board, with a 62 character Story column and a 180px outer margin for notes in Small (sources, licences, dates), each note tied to its place in the text by a short red thread.
- Title 1 at the head, a 3px ink rule beneath. Section headings in Title 3. No numbered section markers unless the content is a real sequence.
- Tables use the ledger style. Charts use ink for the data, `--rule` for the grid, at most one lens ramp; a strand's deep colour only when the chart is about that strand.
- Folio (page number) and the book's short title at the foot in Small. Previous and next are tabs.
- Links in running text are ink with a 1px ink underline. Red underline stays reserved for provenance.

### 4.10 Explorer table

A ledger, linked to the map.

- A sheet. Header row in Label at width 68, sentence case, `--ink-2`, with a 1.5px ink rule beneath. Sorted column: header in `--ink` with a cut triangle.
- Rows 28px (36 on tablet). Horizontal 1px `--rule` between rows, and every fifth rule in `--rule-strong`, as in a ledger. No zebra striping, no vertical rules.
- First column is the name, Archivo 540 at width 82. Numbers are tabular, right aligned, units in the header.
- Inline magnitude is a 3px ink strip under the figure, on a shared scale per column. No coloured bars.
- Presence columns ("School below", "Railway below") use a 9px cut ink square for yes and nothing for no; the column header says what it is. No letter codes.
- **Hover:** row ground `--paper-2`, and the place lifts on the map. **Selected:** row ground `--paper-2`, a 3px red thread at the row's left edge, and a red thread drawn to the place on the map.
- Unverified figures carry the pencil underline. Missing values say "no data" in Small italic, never a blank or a zero.
- Column headers are buttons (sortable, `aria-sort`). The table is a real `<table>`.

### 4.11 Tooltips

Small slate slips: square, `--shadow-slate`, a 7px cut notch pointing at their subject, 8 by 12px padding, at most 34 characters a line and three lines. Optional heading in Besley 600 14.5px in `--on-slate`; body in Interface on `--on-slate-2`.

- Appear after 400ms of hover, at once on keyboard focus, and stay while hovered. Escape closes.
- Never the only place a fact lives; anything in a tooltip is also in the accessible name or reachable by click.
- On touch there are no tooltips: the same content opens as a slate slip on tap, with a close control.

### 4.12 Focus states

Focus is the player's own position, so it is drawn as their stitch: `outline: 2px dashed var(--stitch-deep); outline-offset: 3px` (`--focus-ring`). On slate, the dashes are `--on-slate`. Set globally in `tokens.css` with `:focus-visible`.

- Never remove the outline; never replace it with a colour change alone.
- On the map, a focused place gets the dashed ring round its boundary and the place name is announced.
- Tab order follows the board: language toggle, year, strands left to right, Trust, map, place panel, hand top to bottom, timeline. The hand is one tab stop with arrow keys between tickets; Enter selects, P plays.

### 4.12a Other pieces named in game-design.md

| Piece | Material and form |
|---|---|
| "What changed" slips (three after each term) | Paper slips at `--shadow-sheet`, stacked with a 6px offset to the south-east, square, not torn and not angled. Title 3 plus one sentence of Story small and a "Pull the thread" link. The one marked Unexpected carries the warn hatch tab and the word "Unexpected". |
| Shock card | The same slate slip as the curveball (pinned, torn, angled), arriving mid-term over a dimmed map (map to 55 per cent, 220ms). Its two choices are a tab ("Absorb it") and a stamp ("Spend 1 pip of contingency"). |
| Stamps | "PLAYED 2031", "YOU WERE READY", the card limit at the election. All use the stamp mark: Besley 800 capitals, 2.5px ink box, minus 5 degrees, multiplied on. Ink only. |
| Budget and contingency | A row of eight cut ink squares in a well in the rail head; spent ones are punched out (the board shows through). Contingency is the unspent ones, labelled in words. A debt token is a blue standing-ticket stub clipped to the row. |
| Voice from a place | A sheet at the head of the rail: the quotation in Besley italic 15px with curly quotes, the place and year in Label, and "Illustrative voice, not a real quote" in Small. |
| The letter | A full sheet on `--paper`, Poster heading, Story at 62 characters, signed with the place name. One stamp button at its foot. |
| Timeline | A strip: Ddoe on `--paper-ddoe` shading to `--paper-ddoe-soot` at its oldest end, Heddiw on `--paper`, Yfory on `--paper-yfory`. Era names in Besley italic with their pair. Year ticks in tabular Small. The red pin marks now. Tickets in the post sit on it as stubs. |

### 4.13 Layout grid

The board is a fixed-height app shell (no page scroll in play). One margin, one gutter, three bands.

```
1440 x 900        margin 20, gutter 16
+----------------------------------------------------------------------+
| top bar 56: year 44 + term | 7 strand strips (flex) | Trust | lang   |
+---------------------------------------------------+------------------+
| stage (well)                                      | rail 416         |
|  968 x 716                                        |  voice (sheet)   |
|  slip top left, place panel bottom left,          |  hand: 4 tickets |
|  key top right                                    |  at 138 + 12 gap |
+---------------------------------------------------+------------------+
| timeline 60                                                          |
| foot 20: status left, attributions right                             |
+----------------------------------------------------------------------+
```

| | 1440 x 900 | 1280 x 800 | Tablet landscape 1180 x 820 |
|---|---|---|---|
| Margin / gutter | 20 / 16 | 16 / 12 | 14 / 12 |
| Top bar | 56 | 52 | 60 |
| Rail width | 416 | 372 | 344 |
| Stage (w x h, about) | 968 x 716 | 864 x 642 | 796 x 648 |
| Timeline / foot | 60 / 20 | 54 / 18 | 64 / 0 (attributions move into the key) |
| Ticket height / stub | 138 / 72 | 118 / 60 | 124 / 56, hand as stub stack |
| Place panel width | 272 | 248 | 248, opens as a bottom sheet over the stage's lower left |
| Minimum target | 28 | 28 | 44 |
| Year size | 44 | 38 | 36 |

- The stage always gets what is left; it never drops below 780 wide. Below 1180 wide, show a plain sheet asking for a wider window or landscape. v1 does not do phones.
- Inside sheets use the 4px spacing tokens: 8 inside groups, 12 to 16 between groups, 24 between sections. Sheet padding is 16 (12 at 1280).
- Everything is left aligned to its container's padding edge. Floating pieces on the stage sit 14px in from the stage edge and never cover the selected place.
- At most three floating pieces on the stage at once (slip, place panel, key). Opening a fourth closes the oldest that is not pinned.
- On tablet, hover states do nothing; lift happens on press, tooltips become tap slips, and the strand strips show names at width 68.

### 4.14 Motion

Motion only answers something the player did or marks the single event of a term. There is no idle motion, no entrance animation on load, no hover transition except lift.

| Motion | What moves | Duration | Easing | Reduced motion |
|---|---|---|---|---|
| **Fold** | The map sheet folds along a crease to change scale (Wales to valley and back); the drawer folds out. `rotateX` or `rotateY` about the crease, the far half darkening by 12 per cent at mid-fold. | 520ms (`--dur-fold`) | `--ease-paper` | A 150ms cross-fade, no rotation |
| **Stitch** | A thread is sewn: stitches appear in order along the path. Used for the player's thread, new yarn on a meter, and the red thread being pulled (drawn solid, same timing). | 60ms a stitch, capped at 900ms for the whole path | linear | Appears complete at once |
| **Lift** | A ticket or sheet under the pointer moves 1px left and 2px up (towards the light) and its shadow goes from sheet to lifted. | 120ms (`--dur-lift`) | `--ease-paper` | Shadow changes, nothing moves |
| **Stamp** | A stamp mark or stamp button lands: scale 1.15 to 1 with opacity 0 to 1, no bounce. The ticket nip is the same motion at 90ms. | 140ms (`--dur-stamp`) | `--ease-press` | Appears at once |
| **Slide** | Slip arriving, drawer opening, tooltip settling, Trust needle. Travel 24px at most (drawer excepted). | 220ms (`--dur-slide`) | `--ease-paper` | Appears at once |

- One orchestrated moment a term: the end-of-term run, in order: stamps land on played tickets, threads stitch to the map, yarns gain or fray left to right, the Trust needle moves, the voice sheet turns. Each step starts when the last ends; the whole run is under 4 seconds and can be skipped with any key.
- Nothing loops. Nothing eases with overshoot or spring.
- All durations are tokens, and the `prefers-reduced-motion` block in `tokens.css` zeroes them. Build with the tokens and reduced motion comes free; also guard any `transform` keyframes with the media query.

---

## 5. Iconography

About twenty icons, drawn for this game, in one hand: **cut from black paper with a scalpel.**

Drawing rules:

1. **Grid:** 40 by 40 units, 2 units of clear margin. Designed to be shown at 20, 34 to 38 (ticket stub) and 48px.
2. **Solid silhouettes, not outlines.** An icon is one filled shape (or two or three that touch the same ground line). No stroked line icons.
3. **Straight cuts.** Edges are straight lines meeting at sharp corners. A curve is allowed only where the object is nothing without it (river, wheel), and then as at most two arcs a knife could follow in one pass. No rounded corners, no round line caps or joins anywhere.
4. **Detail is removed, not added.** Windows, doors, bands and letters are cut out of the silhouette so the ground shows through. Cut-outs are at least 3 units wide so they survive at 20px.
5. **If a line is unavoidable** (a wire, a turbine blade), it is a tapered sliver at least 2.5 units at its thick end, with ends cut square or at an angle, never rounded.
6. **A ground line** (a 3 unit bar across the full width) sits under anything that stands on the land. Things in the air or water have none.
7. **One colour:** `--ink` (or `--on-slate` on slate). The cut-outs show the stock beneath. Never tinted with strand colours, never two-tone, never with a shadow.
8. **Slight asymmetry is right.** A hand-cut chapel is not mirror-perfect. Offset a ridge or a chimney by a unit. Do not add wobble or roughness filters.
9. Delivered as inline SVG `<path>` with `fill="currentColor"`, `aria-hidden="true"` when beside a word; a text label is always present for anything interactive.

The set (seven are drawn in `specimen.html` as the reference hand):

| Land and industry | Places and people | Systems | Interface |
|---|---|---|---|
| Coal tip (banded spoil heap) | Chapel (gable, pointed door) | Railway (station canopy and signal arm) | Thread (needle with eye) |
| Pit (headframe) | Terrace (three roofs, two chimneys) | Bus | Source docket (luggage label) |
| Slate quarry (stepped galleries) | School (bell gable) | River and flood (two cut waves) | Lens (folded map) |
| Upland peat (cut bank with cotton grass) | Surgery or hospital (plain cross cut from a block) | Wind (three tapered blades) | Key (stack of offcuts) |
| Farm (sheep, side on) | Language (speech tile with "Ll" cut out) | Sea and harbour (quay wall, bollard) | Time (semaphore signal) |

Not icons: the cut triangles for sort and change, the close "x", plus and minus. Those are type-weight marks drawn with square ends.

---

## 6. Voice of the interface text

The voice is a level-headed neighbour who knows the place: **short, warm, plain, never chirpy.** It respects the player and does not sell, joke or scold.

Rules, both languages:

1. **Plain words, short sentences.** One idea a sentence. Aim for under 15 words. Year 9 reading level.
2. **Say what happens.** Buttons start with a verb and name the thing: "Play this card", not "Confirm" or "OK". The same action keeps the same name everywhere: the button says "Play this card", the stamp says "Played 2031".
3. **Honest about uncertainty.** "About", "approx.", "not yet checked", "illustrative". Never false precision, never "exactly".
4. **No blame, no cheer.** No exclamation marks, no "Oops", "Great job", "Let's", "Awesome", "Sorry". Errors say what happened and what to do next.
5. **People and places before systems.** "The tips above Wattstown" not "asset ID 9". The player is "you"; the game does not call itself "we".
6. **Use the world's own words:** card, ticket, thread, stitch, fold, strand, term, generation, hand on. Do not explain the metaphor; use it consistently.
7. **Welsh is written in Welsh, not translated from English.** Write the Welsh line fresh for the same purpose; natural, everyday Cymraeg Clir; "chi" forms; Cysgliad or a fluent reviewer before release. Keep both languages the same length of thought, not the same word count.
8. **Never party political.** Cards are levers, not parties or named current schemes.
9. No em dashes or en dashes. Sentence case everywhere except ticket furniture.

Examples (Welsh to be reviewed by a fluent speaker before release; several are taken from the papur-v2 Welsh mockup):

| Where | English | Cymraeg | Not this |
|---|---|---|---|
| Primary action | Play this card | Chwarae’r cerdyn hwn | Submit, Confirm selection |
| Step back | Fold back without playing | Plygu’n ôl heb chwarae | Cancel |
| Stitch | Stitch a thread here | Pwytho edau yma | Apply intervention |
| Provenance | How is this worked out? | Sut mae hyn yn cael ei gyfrifo? | Learn more |
| Provenance | Pull the thread | Tynnu’r edau | View data lineage |
| Trust | Trust: Fair. 3 cards next term. | Ymddiriedaeth: Gweddol. 3 cherdyn y tymor nesaf. | Your trust score is 55/100! |
| Limit reached | Trust allows no more cards this term. | Nid yw ymddiriedaeth yn caniatáu rhagor o gardiau y tymor hwn. | You can't do that. |
| Trade-off | The money covers three tips this term. There are more tips than thread. | Mae’r arian yn talu am dair tomen y tymor hwn. Mae mwy o domenni nag o edau. | Insufficient resources |
| Empty state | No tips chosen yet. Pick up to three on the model. | Dim tomenni wedi’u dewis eto. Dewiswch hyd at dair ar y model. | Nothing to see here |
| Uncertainty | About 237,000 people. Not yet checked. | Tua 237,000 o bobl. Heb ei wirio eto. | 237,651 (unverified data!) |
| Error | The map data did not load. Check your connection, then try again. | Ni lwythodd data’r map. Gwiriwch eich cysylltiad, yna rhowch gynnig arall arni. | Oops! Something went wrong. |
| End of term | Hand on to 2050 | Trosglwyddo i 2050 | Next turn |
| Curveball | From the horizon scan | O’r sgan gorwelion | Random event! |
| Honesty line | A thinking tool, not a forecast. | Offeryn meddwl, nid rhagolwg. | Powered by real data |
| Tooltip | Resilient, 5 of 10. Up one place since 2026. | Cydnerth, 5 o 10. I fyny un lle ers 2026. | Resilience +1 |

Ticket scopes: national / cenedlaethol, region / rhanbarth, two regions / dau ranbarth, standing / sefydlog.

---

## 7. Before you call a screen done

- [ ] Only `--font-print` and `--font-grot`; Archivo never at width 100; nothing under 11.5px except ticket furniture.
- [ ] No radius except tickets (1.5px) and truly round things. No blurred, centred or four-sided shadows. All shadows fall south-east.
- [ ] No chips, no pills, no eyebrow capitals, no dot codes, no letter codes, no middle dots, no em or en dashes.
- [ ] Red appears only on provenance. Cobalt appears only on the player's stitches and focus.
- [ ] Every strand shows dye, twist and name together, in the fixed order.
- [ ] One stamp button per surface. One loud thing per screen.
- [ ] Welsh mode checked at every breakpoint: nothing truncated, ŵ and ŷ render, the pair swaps correctly, `lang` attributes set.
- [ ] Keyboard path works; the stitch focus ring is visible on paper, tickets and slate.
- [ ] With reduced motion on, nothing travels.
- [ ] Contrast: text 4.5:1 or better on its own stock (use `--ink` and `--ink-2` on anything that is not `--paper`).

## 8. Files

- `docs/design/tokens.css`: the custom properties. Import first.
- `docs/design/specimen.html` and `specimen.png`: the rendered reference for type, ticket, strand row, Trust gauge, slip, buttons, notices, icons and palette. Copy its CSS for those components as a starting point.
- `design/mockups/papur-v2.html`: the map drawing approach (canvas relief, SVG overlay, fold) is kept as is. Its panel, chip, button and type styles are replaced by this document.
