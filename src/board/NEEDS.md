# Board NEEDS

When a package needs a change in a file it does not own (docs/design/v2-board.md section 14.1), it appends an entry here and carries on with a stub. The owner or the coordinator makes the change and marks the entry done. Append only; do not edit another package's entry.

Format:

```
## [P<n>] <short title>  (open | done)
File: <path> (owner: package <m>)
Need: <what, in one or two sentences>
Stub meanwhile: <what you did instead>
```

## [P0] Rhondda place board copied into the board model  (done by P1: scripts/board/assemble.ts copies the v1 PlaceBoard into places[].board)
File: scripts/build-board-model.ts (owner: package 1)
Need: for each `model/board/places/*.yaml` with `v1_place`, copy that v1 `PlaceBoard` from the compiled v1 model into `places[].board`, so `src/board/engine/places.ts` can call `gradeRhondda` without importing `src/model/`.
Stub meanwhile: the fixture's Rhondda place has no `board`; package 3's adapter should grade "adequately" when it is missing.

## [P0] Tier gates compiled to requires cards  (done by P1: assemble.ts calls gateRules() on the real tree and skips ids the rules files already carry)
File: scripts/build-board-model.ts (owner: package 1)
Need: turn each `tree.yaml` tier with `opens` into a `requires` rule card `need:<branch>:<tier>` and set `TierDef.rule`, exactly as `gateRules()` in `src/board/engine/fixture.ts` does (it is exported for reuse). `crossCheck` fails if a tier names a rule that does not exist.
Stub meanwhile: the fixture runs `gateRules()` itself.

## [P2] Turn hooks for package 3  (done)
File: src/board/engine/people.ts, events.ts, places.ts (owner: package 3)
Need: `turn.ts` calls package 3 by name with typed imports (no fallbacks): `drawFuture`, `seedPeople`, `forecastNext`, `landEvents`, `respond`, `respondBlockers`, `judgePromise`, `updatePeople`, `holdElection` (all on a `TurnCtx` from `ctx.ts` except the first and `respondBlockers`), `gradeVisit` (re-exported by people.ts), and `refusesBuild`, `fasterBuild` for projects.ts. Order in endTurn: builds finish, held effects, `landEvents`, spread S1 to S3, `judgePromise`, `updatePeople`, `holdElection`, coins, report, turn moves on, `forecastNext`. Keep these names and signatures; typecheck will say if one changes.
Stub meanwhile: none needed, package 3 already exports them.


## [P1] Ignore the compiled board model in git  (open)
File: .gitignore (owner: coordinator)
Need: add the line `public/board-model.json`, as `public/model.json` already is. It is written by `npm run board:build`, which `model:build` now runs.
Stub meanwhile: none; the file is rebuilt on every `npm run dev` and `npm run build`.

## [P1] Licence row for the Census commuting data  (open)
File: docs/data-licences.md (owner: coordinator)
Need: one row. Dataset: Census 2021 origin-destination ODWP01EW via Nomis (ONS). Licence: OGL v3.0 (Crown copyright, per https://www.nomisweb.co.uk/home/copyright.asp, checked 2026-11-27). Attribution: "Source: Office for National Statistics, licensed under the Open Government Licence v3.0." Evidence: https://www.nomisweb.co.uk/sources/census_2021_od . Also add OpenStreetMap rail (already a row) and OS Open Rivers (OGL v3.0, https://www.ordnancesurvey.co.uk/products/os-open-rivers, not yet checked).
Stub meanwhile: the source cards in model/sources.yaml (nomis_census_odwp01ew, osm_rail_wales, ons_lad_boundaries, os_open_rivers, nrw_catchments) carry the licence text.

## [P1] game.yaml must list the ten councils in display order  (done: package 3 wrote model/board/game.yaml in this order)
File: model/board/game.yaml (owner: package 3)
Need: `councils` must be the ten South East codes, in this order: W06000013, W06000014, W06000015, W06000016, W06000018, W06000019, W06000020, W06000021, W06000022, W06000024 (Bridgend, Vale of Glamorgan, Cardiff, Rhondda Cynon Taf, Caerphilly, Blaenau Gwent, Torfaen, Monmouthshire, Newport, Merthyr Tydfil). The build reads the council list from it.
Stub meanwhile: with no game.yaml the build uses the fixture's calendar with these ten councils (`SOUTH_EAST` in scripts/board/assemble.ts).

## [P1] Content ids that must exist for the real model to join up  (open)
File: model/board/*.yaml (owner: package 4)
Need: while any content file fails the cross checks (for example `projects[0].visit: unknown place ebbw-vale` before the places exist), `npm run board:build` warns and uses the fixture for ALL content, and lists it in `meta.to_check` as `content: ...`. Run `npm run board:build -- --strict` to see the real errors instead. Council and indicator data are real either way.
Stub meanwhile: none needed; this is the build's own fallback.

## [P1] futures.yaml fails its shape check  (done: package 3 quoted the notes; rule-defaults.test.ts checks every package 3 file against its shape)
File: model/board/futures.yaml (owner: package 3)
Need: `futures[0].note` and `futures[3].note` are written as flow maps with an unquoted comma inside the English and Welsh text, so YAML reads the text after the comma as extra keys ("and rivers rise.", "but slowly and from all sides."). Quote the strings, or use block style.
Stub meanwhile: the build leaves the file out with a warning and uses the fixture's four futures. `npm run board:build -- --strict` fails on it.

## [P4] Board rule notes over 18 words  (open)
File: model/board/rules/spread.yaml, model/board/rules/budget.yaml (owner: package 2)
Need: the copy test now reads every model/board YAML file. Six rule `note` sentences are over 18 words (spread S1 cy, S3 cy, S4 en and cy; budget rules[0] and rules[1] cy). Split each into two sentences.
Stub meanwhile: none. `src/ui/game/copy-rules.test.ts` "keeps every sentence to 18 words or fewer" fails until they are split.

## [P4] Copy evidence sources into the board model  (open)
File: scripts/build-board-model.ts (owner: package 1)
Need: projects, events and places cite evidence ids from model/sources-extra.yaml (for example transport-labour, nfm-evidence, coal-tip-safety, retrofit-eval, ukcp18) as well as model/sources.yaml. Copy every cited id from either file into `sources`. `src/board/content/content.test.ts` checks each cited id exists in one of the two files.
Stub meanwhile: none needed; the ids are real entries.

## [P4] Group ids the content uses  (open)
File: model/board/groups.yaml (owner: package 3)
Need: laws, events and one project name groups `young`, `older`, `low_income` and `welsh_speakers` (the fixture's ids). Keep those ids, or tell package 4 the new ones.
Stub meanwhile: the content test cross-checks against the fixture's groups.

## [P4] Say keys for the engine  (open)
File: src/board/engine/*.ts (owners: packages 2 and 3)
Need: model/i18n/{en,cy}/board.json holds every board string. A `Say.key` is the full i18n key, `board.<key>` (for example `board.report.up`, `board.spread.S1`, `board.reason.passed_over`, `board.blocker.coins`, `board.need.project.here`, `board.election.lost.means`, `board.future.hint.weather`). Plurals use `.one` and `.other` with `{n}`. If a key you need is missing, add a NEEDS entry for package 4 rather than writing English in code.
Stub meanwhile: none.

## [P2] Say keys the engine emits, for board.json  (open, check only)
File: model/i18n/{en,cy}/board.json (owner: package 4)
Need: the engine now uses keys already in board.json, as full keys: a Why? is `board.why.line_up` or `board.why.line_down` with slots `cause` (the key `board.cause.<kind>`, to be filled from the same slots), `quantity` (measure name), `council`, `n`, plus `project`, `site`, `pair`, `event`, `response`, `law`, `place`, `grade`, `start`, `group`, `year`, `rule`, `note`, and on a link `link` and `from` (for `board.why.via`). A report line is `board.report.up` or `board.report.down` with `measure`, `council`, `n`. Preview notes are `board.build.preview_pair`, `board.build.preview_apart` (slot `pair`) and `board.build.catch` (slot `catch`). Please keep these keys and slots, or tell package 2. Package 3 uses short keys (`election.count`, `forecast.warning`) without `board.`: the coordinator should settle one convention.
Stub meanwhile: none.

## [P3] Player strings the people, events and ending code says  (open)
File: model/i18n/{en,cy}/board.json (owner: package 4)
Need: these `Say` keys, English and Welsh (`cy_review`). Slots in braces.
- Moods (council panel): `mood.measure.up`, `mood.measure.down` {measure}; `mood.fell_most.down`, `mood.fell_most.none` {measure}; `mood.promises.waiting`, `mood.promises.kept`, `mood.promises.broken` {year}; `mood.crises.handled`, `mood.crises.left`, `mood.crises.none`; `mood.services.close`, `mood.services.none`; `mood.young_adults.stay`, `mood.young_adults.leave`; `mood.passed_over` {years}.
- Election: `election.count` {backers} {councils} {people} (people is "in 100"); `election.strong_win`, `election.win`, `election.lost`, and each with `.projected` for the mid term projection; `election.weak_hand` {coins} {cost}.
- Forecast: `forecast.warning` {line} {council} {councils} {river}; `forecast.future.named` {name} {note}; `forecast.future.leaning.weather`, `.economy`, `.prices`.
- End: `ending.evidence` {line} {council} {town} {year} {project} {place} {river}; `ending.not_built` {line} {ending}.
For `forecast.warning`, `ending.evidence` and `ending.not_built` the template is just "{line}": `line` is the model's own Text (an event warning, an evidence line, a `not_built` line) whose slots are filled from the same vars. See the next entry.
Stub meanwhile: none; the engine returns keys only.

## [P3] Nested slots in Say vars  (open)
File: src/board/ui/ (owner: packages 5 and 6)
Need: when a `Say` var is a `Text` that itself has slots (`line` in `forecast.warning`, `ending.evidence`, `ending.not_built`), fill its slots from the same `vars` before filling the template. Letter slots (`Ending.letter.slots`) are council, town, project, year, place (and river when there is one).
Stub meanwhile: none.

## [P3] Package 3 rule cards and params beyond RULE_IDS  (open)
File: scripts/build-board-model.ts (owner: package 1); src/board/engine/fixture-rules.ts (owner: package 0 or coordinator)
Need: model/board/rules/people.yaml holds P1 to P5 and, because there is no other rules file for them, G1 (scores), E1 (severity) and a new card V1 (place visits). The build must take every card in it. Extra params package 3 reads: P1 promise_points, crisis_points, presence_points; G1 band_little, band_much, risk_left_points; E1 first_turn, grown_per_turn, prepared_cut, storm_step; V1 factor_* and backing_* per grade, wet_track. The fixture lacks these.
Stub meanwhile: `ruleParam` in src/board/engine/rule-defaults.ts falls back to the same starting values when a model lacks them; rule-defaults.test.ts checks they equal the YAML.

## [P3] Helpers ready for projects.ts and the visit grade  (done: package 2 already calls them)
File: src/board/engine/projects.ts, actions.ts, held.ts (owner: package 2)
Need: if not already used: `refusesBuild(model, state, council, cost)` (blocker `refused` after a lost election, rule P4 refuse_cost) and `fasterBuild(model, state, council)` (one turn off after a strong win where backed) in people.ts; `gradeFactor(model, grade)` in places.ts scales the visited project's held effects by its grade (rule V1). `respondBlockers` in events.ts gives the blockers for a `respond` action. `conditions.ts` (package 3) is shared: `holds`, `allHold`, `countProjects`, `neighbours`.
Stub meanwhile: none needed by package 3.

## [P3] Balance: the score barely moves on the real board  (open)
File: model/board/*.yaml (owners: packages 2 and 4; coordinator to decide)
Need: on public/board-model.json (quick run, 20 game numbers) every bot ends between 46 and 49 out of 100, so "Skill beats autopilot by 15" and "Place matters by 8" cannot pass by bot play alone. Project lifts of 0.2 to 1.4 points in one of ten councils move a people weighted score by a fraction of a point, and held effects do not grow with time (built in turn 1 or turn 7 gives the same 2050 effect, ratio 1.0, mark 2). The balance phase needs bigger or compounding effects (levels, pairs, payback, spread strength), or the coordinator should revisit the 15 and 8 point marks. `npx tsx scripts/board-balance.ts` prints the full table.
Stub meanwhile: none.

## [P5] A document title for the board route  (open)
File: model/i18n/{en,cy}/shell.json (owner: coordinator)
Need: add `doc.bwrdd` ("The board: South East Wales. Etifeddiaeth" / "Y bwrdd: De Ddwyrain Cymru. Etifeddiaeth"). App.tsx looks up `shell.doc.<route>` for every route and warns once in the console without it.
Stub meanwhile: the board route sets `document.title` itself from `boardui.doc.title`.

## [P5] Board screen words live in their own file  (open, coordinator to decide)
File: model/i18n/{en,cy}/boardui.json (new, written by package 5)
Need: the screens' own copy (buttons, labels, notes, the guide) is in `boardui.json` so it does not collide with package 4's `board.json`, which holds the engine's Say sentences. Keep both, or merge `boardui.*` into `board.json` and rename the keys in `src/board/ui/`. The v1 copy test already reads every file in the folder; `src/board/ui/copy.test.ts` checks every `boardui.*` key the screens use exists in both languages.
Stub meanwhile: none needed.

## [P5] Say slots that do not match board.json  (open)
File: src/board/engine/people.ts (package 3) and model/i18n/{en,cy}/board.json (package 4)
Need: `election.count` is sent with `{backers, councils, people}` but board.json writes `{backers}`, `{total}`, `{share}`. `forecast.warning` and `ending.evidence` have no key in board.json (the UI shows their `line` value filled from the other values). `board.build.catch` is a bare label with no `{catch}` slot. The UI drops any sentence left with an empty `{slot}` and logs a warning, so these show nothing or a fallback until they agree.
Stub meanwhile: src/board/ui/words.ts `say()` names ids it is given (councils, measures, projects, events) and falls back to model text.

## [P5] Running scores during play  (open)
File: src/board/engine/api.ts and score.ts (owner: package 3, api.ts by coordinator)
Need: the top strip should show Life in your years and Left for 2050 as they stand (section 11.4), but the API only gives scores at the end (`ending`). An additive `scores(model, state): Scores` would let the strip show them every turn.
Stub meanwhile: the strip shows the six region bars (people weighted), Fairness and how many councils back you.

## [P5] What package 6's end and place screens plug into  (open, for package 6)
File: src/board/ui/end/index.tsx and src/board/ui/place/index.tsx (owner: package 6)
Need: both are loaded lazily by package 5 when they exist (`import.meta.glob`), as default exports with no props. Read the game with `useGame()` from `src/board/ui/game.ts`: `state()`, `model`, `act(action)`, `newGame()`. A place visit is open while `game.visit()` holds a place id; send `{ kind: "visit", place, picks }` with `game.act`, then `game.setVisit(null)`.
Stub meanwhile: `FallbackEnd.tsx` (the ending's name, a 2026 and 2050 table, Play again) and a "not built yet" sheet for visits.

## [P5] Remove the practice stand-in once the engine is settled  (open)
File: src/board/ui/standin/ and src/board/ui/engine.ts (owner: package 5)
Need: the stand-in plays any API function that throws `BoardNotBuiltError`. Every function is built now, so it is unused; delete the folder and the fallbacks when the coordinator is happy the engine will not regress.
Stub meanwhile: n/a.
