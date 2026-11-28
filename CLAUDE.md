# Etifeddiaeth (WalesSim): working rules

A web strategy game and atlas of Wales built on real open data. Read `docs/spec.md` first, then `GLOSSARY.md`, `docs/adr/`, `docs/design/game-design.md` (game) and `docs/design/design-system.md` (look).

## Layout
- `model/`: how Wales works and what it is, as YAML and JSON. Change relationships here, never in code.
- `pipeline/`: Python that fetches open data into `model/data/`. Raw downloads go in `pipeline/raw/` (gitignored).
- `src/engine/`: pure TypeScript simulation. No DOM, no Solid, no `Math.random` (use the seeded RNG). Deterministic for a given seed and rule set.
- `src/model/`: the only code that knows the model file formats; `schema.ts` holds the shared types.
- `src/map/`: canvas paper relief renderer, framework-free, driven through a small class API.
- `src/ui/`: Solid 1.9 components. `src/i18n/`: language lookup.
- `scripts/build-model.ts`: validates `model/` and writes `public/model.json`.
- The board game (v2 and v3, route `#/bwrdd`): rules and content in `model/board/`, engine in `src/board/engine/`, screens in `src/board/ui/`, build in `scripts/board/`. Design: `docs/design/v2-board.md`, `docs/design/v3-wales.md`. Cross-package requests: `src/board/NEEDS.md`.

## Built to be edited
Luke wants every change made with future edits and maintenance in mind. Before calling work done, check:
- A new region, place, project, event or ending is added by writing data, not code. If adding one would mean touching code, fix the seam first.
- One home for each fact or rule. Regional content overrides shared content; it never copies it. No near-duplicate files or functions.
- Names say what a thing is in the game's own words (see `GLOSSARY.md`), so a future reader finds it by searching for the word on screen.
- A module has one job and fits in one read. Split a file before it passes about 300 lines.
- Tests check behaviour over many games, not one hand-picked state, so a later change that breaks a rule is caught.
- Dead code, stray scripts and unused keys are removed in the same change. A decision that a future editor would question gets a short ADR in `docs/adr/`.

## Rules
- Every user-facing string comes from `model/i18n/{en,cy}/<area>.json` or a `{en, cy}` content field. No literal copy in components. Welsh drafts carry `cy_review: true`.
- Every figure shown traces to a source in `model/sources.yaml`. No invented numbers; illustrative values are labelled "illustrative".
- No pound figures for costs: pips.
- Never use the em dash or en dash characters anywhere (code, comments, copy, docs). Use commas, colons, brackets or "to".
- Generic policy levers only; no parties, current named schemes or living politicians.
- Keep modules small and named for what they do. Tests sit next to code (`*.test.ts`).
- Before calling work done: `npm run typecheck`, `npm test`, and for UI work `npm run e2e`.
- Coordinates use the km frame: x = (lon + 5.40) * 111.32 * cos(52.4 deg), y = (53.50 - lat) * 111.2.
