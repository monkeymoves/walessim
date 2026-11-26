# Etifeddiaeth: v1 specification

*Agreed 26 November 2026 (grilling round 1). Game detail lives in `docs/design/game-design.md`; look and feel in `docs/design/design-system.md`; decisions that are hard to reverse in `docs/adr/`; words in `GLOSSARY.md`. Where this file and those disagree, the ADRs win, then this file.*

## 1. What v1 is

**Etifeddiaeth (Inheritance): a game of Wales.** A web strategy game and atlas built on real open data. You govern Wales term by term, and the next generation judges what you left them.

v1 ships two modes and a model book:

1. **Heddiw (Wales today)**: an atlas of the 22 local authorities on the paper relief map. Lenses (one indicator tints the map), a place panel per authority with figures and sources, and an explorer (sortable table of all authorities by all indicators, and a scatter of any two, linked to the map).
2. **Yfory (tomorrow), short mode**: play 2026 to 2050, six Senedd terms (2026, 2030, 2034, 2038, 2042, 2046). Play cards on real places, face curveballs from the horizon scan, visit one place per term (the Rhondda or Dyffryn Ogwen), and receive the letter from 2050.
3. **Model book**: every rule, indicator and source, readable by anyone, with adjustable parameters. Changing any parameter shows "you are playing a modified rule set".

Out of v1: Ddoe (the past, v1.1), more places, multiplayer, accounts.

## 2. Settled decisions

| Topic | Decision |
|---|---|
| Audience | Curious adults and policy officers, solo. Workshops and analysts layered on later. |
| Ownership | Personal, independent project. No official branding. "Not an official view." |
| Openness | Public repository. Code MIT; model rules and content CC BY 4.0; each dataset keeps its own licence. |
| Name | Etifeddiaeth, subtitle "Inheritance: a game of Wales". Repository: WalesSim. |
| Devices | Desktop and tablet landscape. Phones get a read-only notice and the atlas. |
| Scoring | Seven strands plus Trust; no single score; equal weights, adjustable. Result = the lower of Lived and Left. |
| Losing | Trust collapse loses the seat for one term (a caretaker plays defaults), then you return weakened. No game over. |
| Politics | Generic policy levers only. No parties, no named current schemes, no living politicians. Historical figures named in Ddoe where factual and sourced. |
| Welsh | Every string and content field in both languages from the start. Machine-drafted Welsh is marked `cy_review: true` and listed for a fluent reviewer; professional review before public launch. |
| Precision | Costs and delays in pips. Figures only where sourced, with the source one click away. |
| Spatial units | Model on 22 local authorities; "where" decisions across 4 regions; 1 km cells for drawing only; authored places for zoom. |

## 3. Architecture

```
model/      how Wales WORKS and what it IS, as data (YAML + JSON), edited without code
  sources.yaml, indicators.yaml, strands.yaml, rules/*.yaml, cards.yaml, curveballs.yaml,
  places/*.yaml, voices.yaml, letters.yaml, i18n/{en,cy}.json, data/*.json (built by pipeline/)
pipeline/   Python scripts that fetch open data and write model/data/ (raw downloads gitignored)
src/
  engine/   pure TypeScript simulation: no DOM, deterministic (seeded RNG), serialisable state
  model/    loads and validates model/ into typed objects; one place that knows the file formats
  map/      canvas paper relief renderer (national, lenses, places, fold animation)
  ui/       Solid components and screens
  i18n/     language switching and lookup
tests/      Vitest unit tests next to code; Playwright end-to-end with axe in tests/e2e
```

- **Stack**: Vite + TypeScript + Solid 1.9 (ADR 0001). Fonts self-hosted via Fontsource.
- **Model compile**: `npm run model:build` validates every YAML file against the types in `src/model/schema.ts` and writes `public/model.json`. The build fails on a missing source, a missing Welsh field (unless `cy_review` marks a draft), a parameter outside its range, or a dangling id.
- **Rules** use a fixed vocabulary of kinds (ADR 0002), so each rule renders as a plain-language sentence and an equation in the model book, and the engine needs no expression parser.
- **Uncertainty**: each term resolves a central run plus N sampled runs across parameter ranges; strands show the central pip and whether the spread is sharp or fuzzy.
- **State**: one serialisable `GameState`. Save and resume via localStorage (keys prefixed `etifeddiaeth.v1.`); share a finished game or a modified rule set via URL.
- **Hosting**: its own Firebase Hosting site on `d3-showcase-apps` (ADR 0003).

## 4. Quality bar

- An 8/10 play experience judged against the playtest checklist in `docs/design/game-design.md`.
- `npm test` (engine and model), `npm run e2e` (Playwright: atlas, a full game to 2050 in both languages, axe scan on each screen) and `npm run typecheck` all pass before deploy.
- No console errors. First meaningful paint under 2 s on a laptop; map interactions under 100 ms after first render.
- WCAG 2.1 AA for text contrast, keyboard play of the whole game, visible focus, reduced motion respected.
