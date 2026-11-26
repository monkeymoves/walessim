# src/ui/parts: shared pieces

Import from `src/ui/parts` (the index also loads `parts.css`). Every string comes from `model/i18n/{en,cy}/parts.json` through `t()`. Material and measures follow `docs/design/design-system.md` section 4.

| Part | Props | Notes |
|---|---|---|
| `Ticket` | `card: TicketCard` (`id, name, cost, delay, scope?, tags?, needs_partners?, helps?, frays?`; a model `Card` fits), `serial?`, `budget?` (default 8), `scope?` (override: `national`, `region`, `two_regions`, `standing`, `lesson`), `where?: Text`, `icon?`, `played?: year`, `blocked?: { on: "cost" \| "trust", reason }`, `selected?`, `lifted?`, `stub?`, `action?: JSX` (shown top right when selected), `onSelect?`, `tabIndex?`, `id?` | Stock colour by scope, weave trim from `helps[0]` and `helps[1]`, perforated stub with serial, "Cost n of 8 pips", "Pays out in n terms". With `onSelect` it is a `role="button"` with `aria-pressed`; Enter and Space select. `serialOf(id)` gives a stable four-figure serial. |
| `StrandRow` | `views: { strand, flowPips, stockPips?, flowSharp? }[]` (engine `StrandView` fits), `changes?`, `ghosts?`, `notes?` (per strand), `pullable?: StrandId[]`, `onPull?(strand)` | The seven yarn meters in the fixed order. |
| `StrandMeter` | `strand, flowPips, stockPips?, sharp?, change?, ghost?, pullable?, onPull?, note?` | Yarn on ten pegs, knot (sharp) or fringe (fuzzy), ink cross-stitch at the stock value, cut triangle for the move, tooltip with the full goal name. |
| `TrustGauge` | `band: TrustBand, cards: number, now?, compact?` | Slate half-dial; never shows points. `compact` for the top bar. Collapsed adds the severe notice. |
| `CurveballSlip` | `title: Text, ripple?, from?, arriving?, children?` | Pinned, torn, minus 1.3 degrees; slides in once when `arriving`. |
| `SourceTag` | `source: id \| Source, year?, label?, onPull?(source)` | Red docket. Opens the source card, or calls `onPull` if given. |
| `SourceCard` | `source, onClose?` | The full citation sheet. |
| `ConfidenceMark` | `level: Confidence, bare?` | Words plus one to three offcuts. |
| `PaperSheet` | `as?, height?: flat \| sheet \| lifted \| held, stock?: paper \| paper-2 \| yfory`, any HTML attributes | A sheet of cartridge paper. |
| `StampButton`, `TabButton`, `StitchButton` | button attributes, `why?` (disables it and says why in Small beside it) | Stamp: the one commit on a surface. Tab: reversible. Stitch: placing the player's thread. |
| `ThreadButton` | button attributes, `href?` | Provenance only ("How is this worked out?"). |
| `CloseButton` | `label, onClick` | The cut "x". |
| `Tooltip` | `heading?, content, children, placement?: below \| above, open?` | Slate slip after 400 ms hover, at once on keyboard focus, Escape closes. |
| `TipSlip` | `heading?, children, style?, class?` | The slip alone, for tooltips you position (the map). |
| `LangToggle` | `class?` | "Cymraeg" "English", two tabs in a well. |
| `WarnStrip`, `SevereNotice` | `children` | Hatched warning; black-edged worst news. |
| `Snip` | `strand, frays?` | The 20 by 7 px yarn snippet. |
| `Icon` | `name: IconName, size?, label?` | Hand-cut silhouettes; `cardIcon(card)` picks one from a card's id and tags. |
| `Pair`, `OtherLine` | `text: Text, as?, class?` | The bilingual pair (from `src/i18n`). |
| `strandVars(id)`, `weaveUrl(a, b)`, `YARN_HEX` | | Strand colours for your own CSS. |

## Shared from the shell (src/ui/shell)

- `model()`, `geo()`, `modelStatus()` in `shell/model.ts`: the loaded `CompiledModel` and decoded `WalesGeo`, ready before any route renders.
- `TopBar` in `shell/TopBar.tsx`: `year`, `yearNote`, `middle` (strand row and Trust), `hideNav`. It carries the modified rule set badge and the language toggle.
- `navigate(hash)` and `route()` in `shell/router.ts`.
- `SAVE_KEY` in `shell/saves.ts` (`etifeddiaeth.v1.save`): store the `saveGame()` string here so the title screen offers "Carry on".
- `paramOverrides()` and `isModified()` in `book/overrides.ts`: pass `paramOverrides()` to `newGame(model, seed, { paramOverrides })`.
- `useNarrow()` in `shell/viewport.ts`.

The Yfory route mounts the default export of `src/ui/game/index.tsx` (no props) lazily, full screen (no shell top bar: the game draws its own `TopBar`). Under 900 px wide the route shows the phone notice instead.
