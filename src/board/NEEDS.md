# Board NEEDS

When a package needs a change in a file it does not own (docs/design/v2-board.md section 14.1, and 16.7 for phase 2), it appends an entry here and carries on with a stub. The owner or the coordinator makes the change and marks the entry done. Append only; do not edit another package's entry.

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


## [P1] Ignore the compiled board model in git  (done by P7: .gitignore already lists public/board-model.json)
File: .gitignore (owner: coordinator)
Need: add the line `public/board-model.json`, as `public/model.json` already is. It is written by `npm run board:build`, which `model:build` now runs.
Stub meanwhile: none; the file is rebuilt on every `npm run dev` and `npm run build`.

## [P1] Licence row for the Census commuting data  (done by P7: two rows in docs/data-licences.md; OS Open Rivers is marked NOT YET CHECKED there)
File: docs/data-licences.md (owner: coordinator)
Need: one row. Dataset: Census 2021 origin-destination ODWP01EW via Nomis (ONS). Licence: OGL v3.0 (Crown copyright, per https://www.nomisweb.co.uk/home/copyright.asp, checked 2026-11-27). Attribution: "Source: Office for National Statistics, licensed under the Open Government Licence v3.0." Evidence: https://www.nomisweb.co.uk/sources/census_2021_od . Also add OpenStreetMap rail (already a row) and OS Open Rivers (OGL v3.0, https://www.ordnancesurvey.co.uk/products/os-open-rivers, not yet checked).
Stub meanwhile: the source cards in model/sources.yaml (nomis_census_odwp01ew, osm_rail_wales, ons_lad_boundaries, os_open_rivers, nrw_catchments) carry the licence text.

## [P1] game.yaml must list the ten councils in display order  (done: package 3 wrote model/board/game.yaml in this order)
File: model/board/game.yaml (owner: package 3)
Need: `councils` must be the ten South East codes, in this order: W06000013, W06000014, W06000015, W06000016, W06000018, W06000019, W06000020, W06000021, W06000022, W06000024 (Bridgend, Vale of Glamorgan, Cardiff, Rhondda Cynon Taf, Caerphilly, Blaenau Gwent, Torfaen, Monmouthshire, Newport, Merthyr Tydfil). The build reads the council list from it.
Stub meanwhile: with no game.yaml the build uses the fixture's calendar with these ten councils (`SOUTH_EAST` in scripts/board/assemble.ts).

## [P1] Content ids that must exist for the real model to join up  (done by P7: the real content joins up; `npm run board:build -- --strict` now fails only on story.yaml, package 10)
File: model/board/*.yaml (owner: package 4)
Need: while any content file fails the cross checks (for example `projects[0].visit: unknown place ebbw-vale` before the places exist), `npm run board:build` warns and uses the fixture for ALL content, and lists it in `meta.to_check` as `content: ...`. Run `npm run board:build -- --strict` to see the real errors instead. Council and indicator data are real either way.
Stub meanwhile: none needed; this is the build's own fallback.

## [P1] futures.yaml fails its shape check  (done: package 3 quoted the notes; rule-defaults.test.ts checks every package 3 file against its shape)
File: model/board/futures.yaml (owner: package 3)
Need: `futures[0].note` and `futures[3].note` are written as flow maps with an unquoted comma inside the English and Welsh text, so YAML reads the text after the comma as extra keys ("and rivers rise.", "but slowly and from all sides."). Quote the strings, or use block style.
Stub meanwhile: the build leaves the file out with a warning and uses the fixture's four futures. `npm run board:build -- --strict` fails on it.

## [P4] Board rule notes over 18 words  (done: the copy test passes on rules/spread.yaml and budget.yaml)
File: model/board/rules/spread.yaml, model/board/rules/budget.yaml (owner: package 2)
Need: the copy test now reads every model/board YAML file. Six rule `note` sentences are over 18 words (spread S1 cy, S3 cy, S4 en and cy; budget rules[0] and rules[1] cy). Split each into two sentences.
Stub meanwhile: none. `src/ui/game/copy-rules.test.ts` "keeps every sentence to 18 words or fewer" fails until they are split.

## [P4] Copy evidence sources into the board model  (done: scripts/board/read-inputs.ts reads sources-extra.yaml and assemble.ts picks every cited id; content.test.ts passes)
File: scripts/build-board-model.ts (owner: package 1)
Need: projects, events and places cite evidence ids from model/sources-extra.yaml (for example transport-labour, nfm-evidence, coal-tip-safety, retrofit-eval, ukcp18) as well as model/sources.yaml. Copy every cited id from either file into `sources`. `src/board/content/content.test.ts` checks each cited id exists in one of the two files.
Stub meanwhile: none needed; the ids are real entries.

## [P4] Group ids the content uses  (done by P9: groups.yaml keeps young, older, low_income and welsh_speakers, plus everyone)
File: model/board/groups.yaml (owner: package 3)
Need: laws, events and one project name groups `young`, `older`, `low_income` and `welsh_speakers` (the fixture's ids). Keep those ids, or tell package 4 the new ones.
Stub meanwhile: the content test cross-checks against the fixture's groups.

## [P4] Say keys for the engine  (done by P7: see the P2 entry above, one convention, full keys)
File: src/board/engine/*.ts (owners: packages 2 and 3)
Need: model/i18n/{en,cy}/board.json holds every board string. A `Say.key` is the full i18n key, `board.<key>` (for example `board.report.up`, `board.spread.S1`, `board.reason.passed_over`, `board.blocker.coins`, `board.need.project.here`, `board.election.lost.means`, `board.future.hint.weather`). Plurals use `.one` and `.other` with `{n}`. If a key you need is missing, add a NEEDS entry for package 4 rather than writing English in code.
Stub meanwhile: none.

## [P2] Say keys the engine emits, for board.json  (done by P7: settled, every Say key is the full `board.<key>`; people.ts, people-moods.ts, events.ts and endings.ts now emit `board.election.*`, `board.mood.*`, `board.forecast.*`, `board.ending.*`)
File: model/i18n/{en,cy}/board.json (owner: package 4)
Need: the engine now uses keys already in board.json, as full keys: a Why? is `board.why.line_up` or `board.why.line_down` with slots `cause` (the key `board.cause.<kind>`, to be filled from the same slots), `quantity` (measure name), `council`, `n`, plus `project`, `site`, `pair`, `event`, `response`, `law`, `place`, `grade`, `start`, `group`, `year`, `rule`, `note`, and on a link `link` and `from` (for `board.why.via`). A report line is `board.report.up` or `board.report.down` with `measure`, `council`, `n`. Preview notes are `board.build.preview_pair`, `board.build.preview_apart` (slot `pair`) and `board.build.catch` (slot `catch`). Please keep these keys and slots, or tell package 2. Package 3 uses short keys (`election.count`, `forecast.warning`) without `board.`: the coordinator should settle one convention.
Stub meanwhile: none.

## [P3] Player strings the people, events and ending code says  (done by P10: the `mood.*`, `election.*` with `.projected`, `forecast.*` and `ending.*` keys are in board.json; `src/board/content/words.test.ts` checks every key the engine says)
File: model/i18n/{en,cy}/board.json (owner: package 4)
Need: these `Say` keys, English and Welsh (`cy_review`). Slots in braces.
- Moods (council panel): `mood.measure.up`, `mood.measure.down` {measure}; `mood.fell_most.down`, `mood.fell_most.none` {measure}; `mood.promises.waiting`, `mood.promises.kept`, `mood.promises.broken` {year}; `mood.crises.handled`, `mood.crises.left`, `mood.crises.none`; `mood.services.close`, `mood.services.none`; `mood.young_adults.stay`, `mood.young_adults.leave`; `mood.passed_over` {years}.
- Election: `election.count` {backers} {councils} {people} (people is "in 100"); `election.strong_win`, `election.win`, `election.lost`, and each with `.projected` for the mid term projection; `election.weak_hand` {coins} {cost}.
- Forecast: `forecast.warning` {line} {council} {councils} {river}; `forecast.future.named` {name} {note}; `forecast.future.leaning.weather`, `.economy`, `.prices`.
- End: `ending.evidence` {line} {council} {town} {year} {project} {place} {river}; `ending.not_built` {line} {ending}.
For `forecast.warning`, `ending.evidence` and `ending.not_built` the template is just "{line}": `line` is the model's own Text (an event warning, an evidence line, a `not_built` line) whose slots are filled from the same vars. See the next entry.
Stub meanwhile: none; the engine returns keys only.

## [P3] Nested slots in Say vars  (done by P11: words.ts `say()` fills slots inside a value from the same vars; src/board/ui/words.test.ts checks every sentence of a real game reads whole in both languages)
File: src/board/ui/ (owner: packages 5 and 6)
Need: when a `Say` var is a `Text` that itself has slots (`line` in `forecast.warning`, `ending.evidence`, `ending.not_built`), fill its slots from the same `vars` before filling the template. Letter slots (`Ending.letter.slots`) are council, town, project, year, place (and river when there is one).
Stub meanwhile: none.

## [P3] Package 3 rule cards and params beyond RULE_IDS  (done: the build takes every card in rules/*.yaml, rules/growth.yaml too; `ruleParam` defaults cover the fixture, checked against people.yaml and budget.yaml)
File: scripts/build-board-model.ts (owner: package 1); src/board/engine/fixture-rules.ts (owner: package 0 or coordinator)
Need: model/board/rules/people.yaml holds P1 to P5 and, because there is no other rules file for them, G1 (scores), E1 (severity) and a new card V1 (place visits). The build must take every card in it. Extra params package 3 reads: P1 promise_points, crisis_points, presence_points; G1 band_little, band_much, risk_left_points; E1 first_turn, grown_per_turn, prepared_cut, storm_step; V1 factor_* and backing_* per grade, wet_track. The fixture lacks these.
Stub meanwhile: `ruleParam` in src/board/engine/rule-defaults.ts falls back to the same starting values when a model lacks them; rule-defaults.test.ts checks they equal the YAML.

## [P3] Helpers ready for projects.ts and the visit grade  (done: package 2 already calls them)
File: src/board/engine/projects.ts, actions.ts, held.ts (owner: package 2)
Need: if not already used: `refusesBuild(model, state, council, cost)` (blocker `refused` after a lost election, rule P4 refuse_cost) and `fasterBuild(model, state, council)` (one turn off after a strong win where backed) in people.ts; `gradeFactor(model, grade)` in places.ts scales the visited project's held effects by its grade (rule V1). `respondBlockers` in events.ts gives the blockers for a `respond` action. `conditions.ts` (package 3) is shared: `holds`, `allHold`, `countProjects`, `neighbours`.
Stub meanwhile: none needed by package 3.

## [P3] Balance: the score barely moves on the real board  (done: superseded by docs/design/v2-board.md section 16.3 and the marks of 16.6, packages 8 to 10)
File: model/board/*.yaml (owners: packages 2 and 4; coordinator to decide)
Need: on public/board-model.json (quick run, 20 game numbers) every bot ends between 46 and 49 out of 100, so "Skill beats autopilot by 15" and "Place matters by 8" cannot pass by bot play alone. Project lifts of 0.2 to 1.4 points in one of ten councils move a people weighted score by a fraction of a point, and held effects do not grow with time (built in turn 1 or turn 7 gives the same 2050 effect, ratio 1.0, mark 2). The balance phase needs bigger or compounding effects (levels, pairs, payback, spread strength), or the coordinator should revisit the 15 and 8 point marks. `npx tsx scripts/board-balance.ts` prints the full table.
Stub meanwhile: none.

## [P5] A document title for the board route  (done by P7: `doc.bwrdd` in model/i18n/{en,cy}/shell.json)
File: model/i18n/{en,cy}/shell.json (owner: coordinator)
Need: add `doc.bwrdd` ("The board: South East Wales. Etifeddiaeth" / "Y bwrdd: De Ddwyrain Cymru. Etifeddiaeth"). App.tsx looks up `shell.doc.<route>` for every route and warns once in the console without it.
Stub meanwhile: the board route sets `document.title` itself from `boardui.doc.title`.

## [P5] Board screen words live in their own file  (done by P7, decided: keep both. board.json holds the engine's Say sentences (package 10), boardui.json the screens' own words (package 11))
File: model/i18n/{en,cy}/boardui.json (new, written by package 5)
Need: the screens' own copy (buttons, labels, notes, the guide) is in `boardui.json` so it does not collide with package 4's `board.json`, which holds the engine's Say sentences. Keep both, or merge `boardui.*` into `board.json` and rename the keys in `src/board/ui/`. The v1 copy test already reads every file in the folder; `src/board/ui/copy.test.ts` checks every `boardui.*` key the screens use exists in both languages.
Stub meanwhile: none needed.

## [P5] Say slots that do not match board.json  (done by P10: `election.count` is {backers} {councils} {people}; `forecast.warning`, `ending.evidence`, `ending.not_built` are "{line}"; `build.catch` is "The catch: {catch}")
File: src/board/engine/people.ts (package 3) and model/i18n/{en,cy}/board.json (package 4)
Need: `election.count` is sent with `{backers, councils, people}` but board.json writes `{backers}`, `{total}`, `{share}`. `forecast.warning` and `ending.evidence` have no key in board.json (the UI shows their `line` value filled from the other values). `board.build.catch` is a bare label with no `{catch}` slot. The UI drops any sentence left with an empty `{slot}` and logs a warning, so these show nothing or a fallback until they agree.
Stub meanwhile: src/board/ui/words.ts `say()` names ids it is given (councils, measures, projects, events) and falls back to model text.

## [P5] Running scores during play  (done by P7: `scores(model, state)` in api.ts)
File: src/board/engine/api.ts and score.ts (owner: package 3, api.ts by coordinator)
Need: the top strip should show Life in your years and Left for 2050 as they stand (section 11.4), but the API only gives scores at the end (`ending`). An additive `scores(model, state): Scores` would let the strip show them every turn.
Stub meanwhile: the strip shows the six region bars (people weighted), Fairness and how many councils back you.

## [P5] What package 6's end and place screens plug into  (done by P12; the join loads both with a plain `lazy(import())` and deleted FallbackEnd.tsx and the "not built yet" visit sheet)
File: src/board/ui/end/index.tsx and src/board/ui/place/index.tsx (owner: package 6)
Need: both are loaded lazily by package 5 when they exist (`import.meta.glob`), as default exports with no props. Read the game with `useGame()` from `src/board/ui/game.ts`: `state()`, `model`, `act(action)`, `newGame()`. A place visit is open while `game.visit()` holds a place id; send `{ kind: "visit", place, picks }` with `game.act`, then `game.setVisit(null)`.
Stub meanwhile: `FallbackEnd.tsx` (the ending's name, a 2026 and 2050 table, Play again) and a "not built yet" sheet for visits.

## [P5] Remove the practice stand-in once the engine is settled  (done: standin/ deleted by P11; the join removed `BoardNotBuiltError` and the fallbacks that caught it)
File: src/board/ui/standin/ and src/board/ui/engine.ts (owner: package 5)
Need: the stand-in plays any API function that throws `BoardNotBuiltError`. Every function is built now, so it is unused; delete the folder and the fallbacks when the coordinator is happy the engine will not regress.
Stub meanwhile: n/a.

## [P7] Phase 1 screens against the clock contract  (done by P11: the whole repo typechecks)
File: src/board/ui/ (owner: package 11)
Need: the phase 1 UI does not typecheck against the package 7 types (about 55 errors outside standin/; `npx tsc --noEmit -p . | grep -v "^src/board/ui/"` shows the rest of the repo is clean). What changed, by field:
- `endTurn`, `TurnReport`, `RunStep`, `state.steps`, `state.turn`, `game.turns`, `game.turn_years`, `game.visits_per_turn`, `game.report_lines_max`: gone. Use `tick`, `advance(model, state, { maxSteps, stopOn, light })`, `StepReport` (with `stops`, `yearLines`, `term`), `state.log` (`{ at, action }`), `state.step`, `game.steps`, `game.years_per_step`, and the calendar helpers api.ts re-exports (`yearOfStep`, `seasonOf`, `stepOfYear`, `stepsOf`, `isElectionStep`). Phase is "play", not "build"; `tick` and `advance` throw while it is "respond".
- `ProjectState.readyTurn`, `startedTurn` are `readyStep`, `startedStep` (the step at whose end it opens; the year it is felt is `yearOfStep(readyStep + 1)`). `ProjectDef.build_turns` is `build_years`; `RunningCost` is `{ coins_per_year }`; `ActionOption.buildTurns` is `buildYears` plus `readyStep`.
- `Why.turn` is `step` (and `year`); `WhyTarget` is `{ council?, measure, fromStep, toStep }`. `EventRecord.turn`, `ElectionRecord.turn` are `step`. `Forecast.turn` is `step`; warnings carry `fromStep`, `toStep`.
- `Blocker` "refused" and `CouncilView.refusesBigBuilds` are gone; `CouncilView` has `momentum`, `freshStart`, `deal`. Coins hold four decimal places: show whole coins and a ring.
- New API: `timeline`, `scores`, `story`. Run codes are `b2.`; `decodeRun` refuses a phase 1 code with a plain message. `game.save_key` is `etifeddiaeth.board.v2.`; old saves will not replay.
- Pending visits carry `since`; a `deal` pending (rule P6) offers `{ kind: "deal", council, measure }` actions.
- src/board/ui/standin/ fails its tests against the new types; 16.7 says package 11 deletes it.
Stub meanwhile: none. Package 7 added no shims in src/board/ui/engine.ts (it cannot fix the other files).

## [P7] Words the clock emits  (done by P10: every `board.stop.<kind>`, plus `stop.tipping.rising` and `.slipping`, `timeline.warning` and `election.weak_hand` {coins} are in board.json)
File: model/i18n/{en,cy}/board.json (owner: package 10)
Need: stop lines `board.stop.<kind>` for respond, election, ended, warning, keystone, tier_open, visit, tipping, chapter, deal_due, purse_full, finished, year. Slots as they apply: `council`, `project`, `event`, `place`, `year`, `result` (election), `to` (tipping: rising or slipping), `n` (purse_full). Time line: `board.timeline.warning` {event}. `board.election.weak_hand` now has only {coins}, a year, while the B3 card stands. All engine keys are full keys now (see the P2 entry).
Stub meanwhile: none; the UI's `say()` drops a sentence whose key is missing.

## [P7] Hooks and phase 1 leftovers for package 8  (done by P8: roots, momentum, the purse and the 16.3 values are in)
File: src/board/engine/roots.ts, momentum.ts, budget.ts, held.ts, model/board/rules/budget.yaml, rules/growth.yaml (owner: package 8)
Need: fill `growRoots` (called each step before held effects) and `freshStartHere` in roots.ts, and `updateMomentum(ctx, years)` in momentum.ts (called when a year closes, before moods; the clock raises `tipping` stops and facts from any change of `CouncilState.momentum`). held.ts does not yet multiply by `ProjectState.roots`. B1's carry over cap is still judged every two years (`carry_years`); at a quarter step it is a cliff, so the purse (`purse_max`, read by the `purse_full` stop through `optParam`) should replace it first. B1 `opening: 6` is the coins in May 2026. The rules YAML params were renamed to per year rates with no change of size (S3 `max_per_year` 0.15, `pull_per_year` 0.05; B1 `base_per_year` 3, `growth_per_year` 0.5; B2 `care_bill_per_year` 0.5; B3 `lost_coins_per_year` 1); the 16.3 values are yours to set.
Stub meanwhile: empty-safe bodies; the fixture has no R1 to R4 card.

## [P7] Hooks and phase 1 leftovers for package 9  (done by P9: deals, story, timeline, the result, storms in autumn and winter and yearly bots are in; E1 warn years and G1 bands wait on the P9 rule defaults entry; B3 removal is in the P9 entry for package 8)
File: src/board/engine/deals.ts, story.ts, timeline.ts, bots.ts, events.ts, score.ts, model/board/rules/people.yaml (owner: package 9)
Need: fill `offerDeals` (after an election, P6) and `judgeDeals` (each year close) in deals.ts (`dealBlockers` and `takeDeal` already work); `noteStep(ctx, facts)` and `nameChapter` in story.ts (the clock pushes the chapter into `state.story.chapters` on each election step and at the end, six in all); timeline.ts is a working default you own. Bots decide in the last step of each two year block (`DECIDE_YEARS`) so B1's cap does not starve them; move them to year closes with the purse. B3 (weak hand) still applies while the card exists; P4 `refuse_cost` is now unused. E1 params are `first_year: 2028`, `warn_years: 2`, `grown_warn_years: 2`, `grown_at_once: 1`, `grown_gap_years: 2` (phase 1 sizes; 16.2.4 asks 1.5 and 1). Storms in autumn or winter are not done. score.ts still returns the lower of the two scores; 16.3.6 makes the result Left for 2050.
Stub meanwhile: empty-safe defaults; every term is "holding-on" until story.yaml and story.ts land.


## [P8] momentum.ts API is stable  (done, for package 9)
File: src/board/engine/momentum.ts (owner: package 8)
Need: none; a notice. Rule R2 is in `model/board/rules/growth.yaml`. Stable exports: `momentumOn(model)`, `councilMean(measures)`, `momentumChange(model, state, code, arriving)`, `nextMomentum(model, current, change)`, `updateMomentum(ctx, years)`, `risingCount(model, state)`, `regionTurnCouncils(model)`, `regionTurnStep(model, state)` (the yearly frame step the region first turned, or null; read from `state.history`, no new state field), `regionTurned(model, state)`, `momentumPull(model, m)`, `momentumRootsBonus(model, m)`, `momentumCoinsPerYear(model, state)`, `slipStartStep(state, code)`. Everything returns 0, false or null without the R2 card.
Stub meanwhile: none.

## [P8] Drop B1 carry_years from the engine's fallback params  (done by the join: `RULE_DEFAULTS.B1` is `{ opening, running_share }`)
File: src/board/engine/rule-defaults.ts (owner: package 7)
Need: the purse (B1 `purse_max: 12`) replaces phase 1's carry over, so `model/board/rules/budget.yaml` no longer has `carry_max` or `carry_years`. Delete `carry_years: 2` from `RULE_DEFAULTS.B1` (keep `opening: 6`), and the comment's mention of it. Until then `rule-defaults.test.ts` fails one assertion ("B1.carry_years: expected undefined to be 2"). budget.ts no longer reads `carry_years` through `ruleParam`: a model with `carry_max` and no purse (the fixture) uses phase 1's two years, so the equivalence test is unchanged.
Stub meanwhile: none; that one assertion is red.

## [P8] Words for growth and spread  (done by P10: `build.preview_fresh_start`, `build.preview_need_more`, `build.preview_need_less` and `cause.momentum` are in board.json)
File: model/i18n/{en,cy}/board.json (owner: package 10)
Need: preview notes `board.build.preview_fresh_start` {n} ("A fresh start here: {n} coin off, and it counts as having company for eight years."), `board.build.preview_need_more` {measure, council, n} ("{measure} is low in {council}, so this does more."), `board.build.preview_need_less` {measure, council, n} ("{measure} is already good in {council}, so this does less."). Why? lines now end at R1 (roots, cause the project), R4 (need, cause the project or pair), R2 (Backing and coins, cause `board.cause.momentum`) and R3 (coins, cause the project). Rule card words are in `model/board/rules/growth.yaml`.
Stub meanwhile: none; the UI drops a sentence whose key is missing.

## [P8] The region turn as a stop and a moment  (done by the join: clock-stops raises `tipping` with `ref: "region"` and `board.stop.tipping.region` {n} once the region turns; story.ts already notes the moment)
File: src/board/engine/clock-stops.ts (owner: package 7), src/board/engine/story.ts (owner: package 9)
Need: 16.2.5 says `tipping` also fires when the region turns. `regionTurnStep(model, state)` in momentum.ts gives the step of the yearly frame where it first turned (null before). In clock-stops, raise `tipping` with `ref: "region"` when `regionTurnStep(model, after) === step + 1` and it was null before; package 9 can use the same test for the `region_turn` moment and the `region_turn` chapter condition.
Stub meanwhile: council tips already raise `tipping`; the region turn pays its coins (budget.ts) but raises no stop of its own.

## [P8] costOf is where build discounts live  (done by the join: see the P9 discount entry)
File: src/board/engine/projects.ts (owner: package 8)
Need: none yet. A build's cost is `costOf` in projects.ts; `buildBlockers` and `options` use it. R3's fresh start is taken off there. If P6's `deal_discount` should come off too, add an entry here naming the helper in deals.ts (for example `dealDiscount(model, state, def, site)`) and package 8 will call it from `costOf`.
Stub meanwhile: none.

## [P10] Specials for the keystones and the legacy projects  (done by the join: new specials `no_care_bill`, `links_up`, `colleges_up`, `storm_no_coins`, `running_halved` in types-content.ts and shapes.ts, read through src/board/engine/specials.ts; `cluster_roots` now cuts a downturn to E1 `downturn_cut` where a skills college stands; `running_halved` pays B1 `running_share`. projects.yaml: the four legacy projects carry their special in place of the stand-in lifts, Heat and homes for all carries `no_care_bill`. Tested in specials.test.ts)
File: src/board/engine/types-content.ts (owner: package 7); effects.ts, held.ts, budget.ts, spread.ts, events-land.ts (owner: package 8 or 9)
Need: 16.3.5 gives each keystone a region wide change and a legacy project whose effect has no Effect kind yet. Please add `EffectSpecial` values and switch them on: `links_up` (Trains all evening and on Sundays: every upgraded link rises one more quality step), `colleges_up` (Firms that train their own: every skills college rises one level, free), `storm_no_coins` (Farms paid to hold water: storms cost no coins), `running_halved` (Homes that pay their own bills: running costs of every project halve). The keystones' own region wide parts also need checking against their specials: `reverse_commute` (the valley end of upgraded links counts 2.0 better for S3), `cluster_roots` (a downturn takes half as much from any council with a college), `storm_step_down` (one severity step on that river), and Heat and homes for all ("the care bill never starts, or stops": today `care_bill_off` only counts health hubs, so the keystone does not switch it off). Tell package 10 the names and it adds them to projects.yaml.
Stub meanwhile: each legacy project is written with effects the engine has: `where: everywhere` lifts gated by `only_if` (upgraded link, a skills college here, a river), a flood risk step in every river council, and 0.5 coins a year for running costs. Every keystone carries `branch_joined`.

## [P10] Chapter conditions the TermCondition type cannot say yet  (done by the join: `young_adults.councils_at_least` and `event_landed.at_most` are in the type and the shape check; story.yaml uses them for The leaving years (3 councils), Coming home (2) and The quiet years (no event landed). "When the work went" stays an unprepared economy event, as P9 advised)
File: src/board/engine/types-story.ts, src/board/model/shapes.ts (owner: package 7); src/board/engine/story.ts (owner: package 9)
Need: four rows of the 16.5.1 table need more than the type allows. "The leaving years" is three or more valley councils down 1 in 100, and "Coming home" two or more up: `young_adults` has no council count (for example `councils_at_least`). "The quiet years" is "no event landed": `event_landed` cannot be negated (for example `at_most: 0`). "When the work went" also wants Work and pay to fall (for example a `measure` term condition). Say which you add and package 10 writes them in.
Stub meanwhile: story.yaml writes `young_adults` with `flag: valley` and `by` (story.ts decides how a flag is judged), "The quiet years" as `finished at_most: 2`, and "When the work went" as an unprepared economy event. Priority order does the rest: storms, elections and keystones are tried first.

## [P10] Ending conditions story and endings code should judge  (done: P9 judges all four; the join made `events_prepared` false when no outside event landed)
File: src/board/engine/end-conditions.ts (owner: package 7), endings.ts (owner: package 9)
Need: the twelve endings use `keystones at_most: 0` (The gamble, Holding the line), `projects at_most: 5` (The drift, fewer than six projects), `events_prepared share: 1` (Holding the line: every outside event prepared for; please count a game with no outside event as not prepared, so the ending is earned) and `keystone_finished_after year: 2044 at_least: 2` (The long game). The patchwork is now the fallback ending (priority 12) and The drift is priority 11, so `notBuilt` never offers The patchwork.
Stub meanwhile: none; the content test pins the conditions.

## [P10] The stop for tipping names its direction  (done by the join: the key is `board.stop.tipping.rising` or `.slipping`; a council settling back to steady raises no stop)
File: src/board/engine/clock-stops.ts (owner: package 7)
Need: a tipping stop sends `board.stop.tipping` with `to` set to the raw momentum id ("rising", "slipping"), which would show in English in Cymraeg. Please send the key `board.stop.tipping.${to}` instead (both are in board.json; `board.stop.tipping` stays as the generic line, with no `{to}` slot).
Stub meanwhile: `board.stop.tipping` reads well without `{to}`.

## [P10] Words for the screens and the end, in board.json  (done: superseded by the P11 entry below; screen words live in boardui.json and boardend.json)
File: model/i18n/{en,cy}/board.json (owner: package 10)
Need: none; a notice. board.json now holds, besides the engine's Say keys: `season.*`, `date` {season} {year}, `clock.paused`, `strip.result_rule`, `strip.income` {n}, `coins.purse` {n}, `stop.look`, `stop.carry_on`, `timeline.*` (now, promise, deal, keystone_last_start, care_bill, end), `momentum.*` (labels, notes, `momentum.label` saying they are a game estimate, fresh start, region turn), `council.young_gone` {n} {total}, `deal.*` (title, offer, discount, kept, broken, pick), `forecast.window` {season} {year}, `story.*` (label, title, term, turning_points, other_choice {chosen} {other}), `moment.*` (as story.ts sends them), `build.quick`, `build.legacy` {project}, `build.ready` {season} {year}, `build.joined`, `build.alone`, `build.deal` {council}, `build.rebuild` {event} {year}, `build.running.one/.other` {n} (coins a year), `build.running_every` {years}, `blocker.hung_term`, `blocker.legacy` {project}, `election.hung` {years}, `end.result`, `end.life_note`. Removed as untrue on the clock: `strip.turn`, `strip.lower_rule`, `turn.*`, `report.continue`, `council.refuses`, `blocker.refused`, `election.lost.refuse`, `election.lost.coins.*`, `place.one_per_turn`, `end.lower.*`, `coins.carry`. Chapter names and lines are in model/board/story.yaml.
Stub meanwhile: n/a.

## [P9] Deal discount and rebuild time in costOf and the build time  (done by the join: `buildDiscounts` in projects.ts takes R3 and P6 off, never below 1 coin, each written as its own coins record; `buildYears` multiplies by E2 `rebuildShare` (the end that gains least on a link); the preview notes a deal kept and a faster rebuild; the B3 card is gone from budget.yaml (the fixture keeps it for the equivalence test))
File: src/board/engine/projects.ts (owner: package 8); model/board/rules/budget.yaml (owner: package 8)
Need: (1) take `dealDiscount(model, state, councils, project)` from deals.ts off the cost in `costOf` (councils: the site's councils, `siteCouncils`), never below 1, as R3's fresh start is. (2) Multiply a new build's `build_years` by `rebuildShare(model, state, council)` from events.ts (rule E2; for a link, the smaller of its two ends) before turning years into steps. Both return 0 and 1 when the model has no P6 or E2 card, so the fixture is unchanged. (3) P6 replaces B3: please remove the B3 card from budget.yaml (people.ts stops saying `election.weak_hand` once it is gone; `WEAK_HAND` in budget.ts is then dead).
Stub meanwhile: the P6 and E2 cards are in model/board/rules/people.yaml; deals are offered, kept and broken, and the bots keep them, but at full price and full build time.

## [P9] Rule defaults and two spec values  (done by the join: G1 bands 3 and 10, E1 warn years 1.5 and 1, in RULE_DEFAULTS and people.yaml together)
File: src/board/engine/rule-defaults.ts (owner: package 7, finished); model/board/rules/people.yaml (owner: package 9, you may edit these four values)
Need: 16.3.6 sets G1 `band_little: 3`, `band_much: 10`, and 16.2.4 sets E1 `warn_years: 1.5`, `grown_warn_years: 1`. All four are in `RULE_DEFAULTS`, and rule-defaults.test.ts checks they equal people.yaml, so change both in one go (with the P8 B1 `carry_years` entry). I left people.yaml at 2, 6, 2 and 2 so the test does not gain failures. The equivalence test is unaffected (warnings round to one step at a two year step; bands change no state).
Stub meanwhile: the old values.

## [P9] Term and end conditions the content asks for  (done by the join: both fields typed and checked; `events_prepared` is false with no outside event)
File: src/board/engine/types-story.ts, src/board/model/shapes.ts, src/board/engine/end-conditions.ts (owner: package 7, finished)
Need: (1) add `councils_at_least?: number` to the `young_adults` TermCondition and `at_most?: number` to `event_landed` (and let the shape check accept them). story-terms.ts already judges both: `councils_at_least` counts flagged councils that each moved `by` or more (without it, the mean of the flagged councils moved `by`); `event_landed` with `at_most: 0` means none such landed. A `measure` term condition is not added: "When the work went" reads fine as an unprepared economy event. (2) `events_prepared` in end-conditions.ts returns true when no outside event landed; package 10 asks for false so Holding the line is earned.
Stub meanwhile: story-terms.ts reads the two fields through a widened type, so package 10 can write them as soon as the shape check allows.

## [P9] Chapter and moment words, and what the story sends  (done: notice read; a chapter about an event now takes {town} and {river} from that event, so "The winter the Taff rose" never floods a town on another river)
File: model/i18n/{en,cy}/board.json (owner: package 10); src/board/ui/ (packages 11 and 12)
Need: none new; the keys in board.json match. Slots sent: `moment.tier_open` {branch} {tier}; `moment.legacy_open` and `moment.keystone` {project} ({council}); `moment.tipped.*`, `moment.people.*` {council} (people also {n}); `moment.region_turn` {n}; `moment.election.*` {year}; `moment.event` {event} {council}; `moment.promise.*` {year}; `moment.deal.*` {council} {measure}. `timeline.promise` {year} {promise}; `timeline.deal` {council} {measure} {year}; `timeline.keystone_last_start`, `timeline.care_bill`, `timeline.end` {year}; `election.hung` {years}. A turning point that is an event carries `chosen` and `other` (response names) in its vars when it was answered: show `story.other_choice` with them. Chapters: priority 1 is tried first (as story.yaml says); a name is not used twice unless nothing else fits, where "name" is the id plus the slots its name uses, so "{project}" can name two terms with two keystones. Term condition meanings are at the top of src/board/engine/story-terms.ts (`level` is the score out of 100, `gap` points out of 10).
Stub meanwhile: n/a.

## [P9] A keystone can be built in every council  (done by the join, decided: one of each keystone a game, as 5.3 and 16.3.5 read. New blocker `one_keystone`, words `boardui.block.oneKeystone`)
File: src/board/engine/projects.ts (owner: package 8) or model/board/projects.yaml (owner: package 10)
Need: on the real model the branch bots stand the same keystone in up to four councils (branch-made_here: `cluster-roots` in four), so "You cannot have it all: never four keystones" is only met by the random bots. 5.3 and 16.3.5 read as one of each keystone a game. Please block a second of the same keystone (a blocker, or a `once` flag in projects.yaml), or say if several are meant.
Stub meanwhile: the balance table counts each standing keystone; story moments are one per keystone and council.

## [P12] A time line mark fails axe: its name does not hold its words  (done: axe on the board and term report passes in the full e2e run)
File: src/board/ui/Timeline.tsx (owner: package 11)
Need: axe (wcag21a, serious) flags `label-content-name-mismatch` on `.bw-tl-mark-keystone_last_start`: the button's `aria-label` does not contain the words it shows. Start the aria-label with the visible short words, or drop the aria-label and put the long words in a visually hidden span. tests/e2e/board.spec.ts checks axe on the board and the term report, so these two checks fail until it is fixed.
Stub meanwhile: none. The test is left honest; it fails on this one rule.

## [P12] Why? should end at the rule's page in the board's book  (done by P11)
File: src/board/ui/WhyPanel.tsx (owner: package 11)
Need: the board's rule pages now exist at `#/llyfr/bwrdd/<rule id>` (encode the id: `need:valleys:2` has colons). Link "Read this rule in the rule book" to the rule the Why? ends at, not to `#/llyfr`.
Stub meanwhile: the link opens the v1 contents, which now has a "The board" tab.

## [P12] The ghost map of the Wales you did not build has no board  (done by the join: `ghostFrame` in endings.ts plays the same game number with the branch bot of that ending's keystone; null for an ending with no keystone of its own, where the screen shows the line only)
File: src/board/engine/endings.ts (owner: package 9)
Need: `Ending.notBuilt.frame` is always null, so the end screen can only say the line. 16.5.3 item 6 wants a ghost map: a final frame from the same game number played towards that ending (a branch bot, light), honestly labelled. The end screen draws it as soon as `frame` is set, with the note "a game estimate of another route".
Stub meanwhile: src/board/ui/end/NotBuilt.tsx shows the line only.

## [P12] The end and place screens are in  (done: notice read. A `#/bwrdd/run/<code>` link is not added; pasting a code on the end screen works)
File: src/board/ui/end/, src/board/ui/place/ (owner: package 12)
Need: none; answers the P5 entry "What package 6's end and place screens plug into". Both are default exports with no props and read `useGame()` (`model`, `state()`, `act()`, `visit()`, `setVisit()`, `newGame()`); please keep those names. The end screen uses `TimelineStrip` with `at`, `onScrub` and `onPick` (kind "moment"). Run codes open from a paste box on the end screen; a `#/bwrdd/run/<code>` link that opens straight to the end would be a small addition in index.tsx if wanted (the coordinator decides). The rule book's board section lives in src/ui/book/board/ and reads public/board-model.json with its own loose types, because v1 may not import src/board/ (boundaries.test.ts); Book.tsx gained three added lines only.
Stub meanwhile: n/a.

## [P12] The event answer slip can sit under the top strip and the clock  (done: the slip is above both (clock.css z-index 23); the join's full game clicked every answer, and the e2e no longer falls back to Enter)
File: src/board/ui/Respond.tsx, board.css (owner: package 11)
Need: at 1440 by 900, late in a game (Summer 2036 in the e2e clock game), Playwright could not click "Wait and watch" on `bw-respond`: the year in the top strip and the clock at the foot intercept the pointer. The slip should sit above both (z-index) and inside the stage. Keyboard still works.
Stub meanwhile: tests/e2e/board.spec.ts presses Enter on a covered button after a 3 second click attempt.

## [P11] The clock screens are in  (done, a notice for packages 7, 12 and the coordinator)
File: src/board/ui/ (owner: package 11)
Need: none; closes, from the UI side, the P7 entry "Phase 1 screens against the clock contract", the P5 entries "Remove the practice stand-in" (standin/ is deleted and engine.ts only re-exports api.ts) and "Nested slots in Say vars" (words.ts `say()` fills slots inside a `line` value from the same vars), and the P12 entries on the time line's axe name (each piece's name now starts with the words it shows, then the long words in a hidden span) and Why? (each reason links to `#/llyfr/bwrdd/<encoded rule id>`). For package 12: `TimelineStrip` (Timeline.tsx) takes `model`, `state`, `view`, `at`, `lead`, `onPick` and `onScrub`; `layoutTimeline` and `TimelineItem` are exported from Timeline.tsx and timelineLayout.ts. `useGame()` keeps `model`, `state()`, `act()`, `visit()`, `setVisit()`, `newGame()`, and adds `clock` (play, pause, step, runToNext, prefs). Prefs are one key, `<save_key>prefs`: `{ stops, holdWhileReading, stepByStep, speed }`.
Stub meanwhile: n/a.

## [P11] A finished build on a rail link has no council in its stop  (done by the join: `finished` and `keystone` stops, and the keystone moment, name the link's first end in play through `siteCouncil` in conditions.ts)
File: src/board/engine/clock-stops.ts (owner: package 7)
Need: `finished` and `keystone` stops pass `council` only for a council site, but board.json's `stop.finished` and `stop.keystone` say `{council}`. For a build on a rail link the engine's line has an empty slot, so the screen falls back to its own words ("... in Wales"). Please pass the link's first council (or its name as `council`), and the same for `Stop.council` so "Look" can select it.
Stub meanwhile: StopCard.tsx shows its own line when the engine's has an empty slot.

## [P11] Screen words in board.json that the screens do not read  (done by the join, decided: board.json holds only what the engine says. 409 keys nothing read are gone from both languages; 112 remain, checked by src/board/content/words.test.ts)
File: model/i18n/{en,cy}/board.json (owner: package 10)
Need: the P10 notice lists screen words now in board.json (`season.*`, `date`, `clock.paused`, `strip.income`, `coins.purse`, `stop.look`, `stop.carry_on`, `timeline.now`, `deal.*`, `forecast.window`, `build.ready`, `build.running.*` and more). Under the P5 decision the screens' own words are in boardui.json, so the board screens read their own copies and use board.json only for the engine's Say keys (and chapter names from story.yaml). Either drop the duplicates from board.json, or tell package 11 which to switch to; the wording is kept the same where both exist ("Left for 2050", the result line).
Stub meanwhile: none needed.

## [P12] An event can land in the last season and never be answered  (done by the join: no event lands on the final step (`lastLandingStep` in time.ts, used by the outside schedule and grown warnings); the e2e reload workaround is gone)
File: src/board/engine/clock.ts or events-schedule.ts (owners: packages 7 and 9); src/board/ui/BoardScreen.tsx, Respond.tsx (owner: package 11)
Need: every e2e game, and 40 of 40 games of `playGame` in test-play.ts (game numbers 1000 to 1039), end with a grown event landing on step 95 (for example "The river runs dirty", Newport); the state reached May 2050 (phase "ended") with a `respond` still pending. The board then shows the answer slip with both answers blocked ("Answer the event first") and never shows the ended stop, so the end screen is unreachable without a reload. Engine: do not land an event that needs an answer on the last step (or hold the end until it is answered). UI: when phase is "ended", drop pending answers and show the end.
Stub meanwhile: tests/e2e/board.spec.ts reloads and resumes (which opens the end) and fails softly on it, so the rest of the end screen is still checked.

## [P11] Why? lines are sent without their cause  (done: explain.ts sends `cause` as the key `board.cause.<kind>` and say() fills its slots; a visit's grade is now the key `board.grade.<grade>` so it reads in Welsh too)
File: src/board/engine/explain.ts (owner: package 8)
Need: a `Why.say` of `board.why.line_up` or `board.why.line_down` arrives with `n`, `delta`, `quantity`, `year`, `council` but no `cause`, and board.json's sentence starts with `{cause}`. The screen drops a sentence with an empty slot, so the Why? panel shows its own "Because" row only. Please send `cause` (the key `board.cause.<kind>`, filled from the same vars), as the P2 entry agreed.
Stub meanwhile: WhyPanel.tsx shows the sentence only when every slot is filled.

## [JOIN] Phase 2 joined  (done, a notice for the coordinator)
File: src/board/ (the join may edit any board file)
Need: none. Every entry above is closed. Still open, for tuning and review, not for code: the balance marks of 16.6 (package 9's table), Welsh review of all new words (cy_review), and the chapter, ending and special sizes, which are game rules. New in the join: src/board/engine/specials.ts, specials.test.ts, src/board/ui/words.test.ts, src/board/ui/testPlay.ts (one test player for the UI tests, moved from ui/clock), design/scripts/board-join-play.mjs. Removed: growth-testkit.ts (merged into test-cards.ts), FallbackEnd.tsx, `BoardNotBuiltError`.
Stub meanwhile: n/a.

## [P9 balance] Test files changed to keep green while numbers moved  (a notice for packages 7 and 8)
File: src/board/engine/test-cards.ts (owner: package 7); roots.test.ts, momentum.test.ts, budget.test.ts, growth.test.ts, spread-young.test.ts (owner: package 8)
Need: none. The balance rounds moved R1, R2, R3, R4, B1 and S3 numbers on disk (docs/design/board-balance-log.md). Mechanism tests that read the cards from disk now pin the 16.3 starting sizes through `pinStart` and `DESIGN_START` in test-cards.ts, so they test the rule, not the tuning. growth.test.ts reads the purse and S3 floor it checks. spread-young.test.ts pins `floor_share: 0.6` for its bounds test. Please keep `DESIGN_START` when you add a mechanism test of a tuned card.
Stub meanwhile: n/a.

## [P9 balance] The made here branch cannot have its day  (for package 10 and the coordinator)
File: model/board/projects.yaml (owner: package 10)
Need: a decision. Every made here project lifts only Work and pay and Climate. With roots, those two reach 10 (the ceiling) in most councils by about 2040, so more building there does nothing, and branch-made_here ends 6 to 9 points below the other branch bots in every start and future ("Each branch has its day" fails, and the bot loses most elections). Raising its sizes does not help: the lifts are cut at 10. It needs some lift on Health, Nature or Welsh and culture (for example a college that teaches in Welsh, or firms that fund health checks), which is content, not tuning.
Stub meanwhile: sizes raised (skills college 1.5 times, community energy 1.2, the cluster keystone 1.5); the mark still fails.

## [P9 balance] Design numbers in v2-board.md 16 now differ from the model  (done at the join: section 16 now says its sizes are starting values and points at the balance log)
File: docs/design/v2-board.md (owner: the designer)
Need: section 16 quotes starting sizes the balance rounds changed: the purse (12, now 16), base coins (3 a year, now 3.75), the S3 floor (0.6, now 0.85) and pull, R1 cap (5, now 7) and alone growth (0.03, now 0.01), R2 edges (0.3, now 0.6) and coins (0.5, now 1), R3 (1 coin and 8 years, now 2 and 12), R4 (now 1.6 less 0.15 a point, between 0.25 and 1.5), chapter priorities, outside event sizes (doubled) and bus running costs (halved). All are game rules. The log has the reasons. Please update 16 or mark its numbers "starting values, see the balance log".
Stub meanwhile: the model is the truth; the rule book reads the model.

## [B] A slower default speed: 4 of 8 cold players felt rushed  (done by D: steady is 4000 ms a step)
File: model/board/game.yaml (owner: package D, or the coordinator)
Need: set `steady` to `ms_per_step: 4000` (a year in 16 seconds, about 6 and a half minutes of running time in a game), keeping brisk and fast. It is pacing, not a game rule, and no words change: the clock's status line reads the speed ("Time is running: a year every 16 seconds").
Stub meanwhile: the game now opens with time stopped behind a big "Start time" button, and the first time time runs a note pinned to the clock teaches Pause, Space and the three speeds (src/board/ui/clock/Clock.tsx).

## [B] What is still to come on the headline: bedding in and roots  (done by D: headway() in api.ts, leftBoard counts what is on the way)
File: src/board/engine/score.ts, api.ts (owner: package D)
Need: an API view, for example `headway(model, state): { comingPoints: number; comingBy: number | null }`, giving how much Left for 2050 will still rise from what is already standing if nothing else is built: the rest of each working project's and law's ramp (`after_years`, `ramp_years`, held.ts) and R1 roots growth, with the year the last of it lands. No events, no drift. The top strip would show "+{n} still to come by {year}" beside "Up {n} since 2026". Also, please check a contradiction: `leftBoard` counts a build's full lift while it is being built, but once it opens only the ramped part is in the measures, so Left for 2050 can dip on the day a slow build opens. Counting the unramped rest of working projects in `leftBoard` would fix both.
Stub meanwhile: src/board/ui/clock/headway.ts shows the headline to one decimal, "Up / Down {n} since 2026", the part still being built with the year it opens, and "If you build it: {n} (+{change})" while a project is pointed at, all through `scores`.

## [B] Coins lost to a full purse in the step report  (done by D: CoinsReport.lost)
File: src/board/engine/budget.ts, types-views.ts (owner: package D)
Need: `CoinsReport.lost`: the coins not paid this step because the purse was full. Then the strip can say how many were lost, and the purse warning can count them.
Stub meanwhile: the coin counter reads "{n} of 16 coins", warns "Purse nearly full: spend some" when a year's income would fill it, and "Purse full: new coins are lost" when full (src/board/ui/clock/coins.ts).

## [B] "Press play" words now that the button says "Start time"  (done by C)
File: model/i18n/{en,cy}/boardui.json `ticker.first` (owner: package C)
Need: the clock's button reads "Start time" until time first runs, so `ticker.first` should say "Nothing moves until you press Start time." (cy: "Does dim yn symud nes i chi bwyso Dechrau'r amser."). `guide.map`, `guide.play`, `guide.speed` and `clock.held.*` in boardui.json are no longer read; the guide and the clock read boardclock.json. They can be dropped when copy.test.ts's families list drops them.
Stub meanwhile: none; the ticker line is the only stale one.

## [B] The build menu leaves a hovered project set  (done by C)
File: src/board/ui/BuildMenu.tsx (owner: package C)
Need: the hover set by `onPointerEnter` on a ticket is only cleared by a click, a build or closing; please clear it on `onPointerLeave` of the ticket list too, so the bars' dotted "if you build it" never stays after the pointer has gone.
Stub meanwhile: the top strip shows "left if you build it" and "If you build it" only while the build menu is open on a project that can be built now; game.ts drops the hover when the build menu closes or its council is closed.

## [B] Notice: clock, guide and title changes  (a notice for the coordinator and package C)
File: src/board/ui/ (owner: package B)
Need: none. The clock is held only by what the board draws (`clock.shown()`, src/board/ui/clock/hold.ts; BoardScreen draws from the same list). Closing a council closes its build menu. After answering an event the clock stays paused until Play; "Carry on" on a card still carries on. The button says "Held" with the reason underneath. The guide is three notes (map, council, build) and shows a note only when its subject is on screen. A new key `<save_key>clocktaught` records that the pause and speed note was seen. `game.guideNext` is replaced by `game.guideTo(n)`. The title's main button is now the board ("Play: run South East Wales", data-testid way-bwrdd); the first game is one click below it (way-yfory), and leads on a narrow screen.
Stub meanwhile: n/a.

## [C] Gwent Levels option cards overlap (playtest 8 must-fix 17)  (done at the join: LightPlace options no longer carry the shared `ticket` class, whose four-column grid caused the overlap)
File: src/board/ui/place/place.css (owner: the package that owns src/board/ui/place/)
Need: each option in LightPlace.tsx is `class="bp-option ticket"`, and the shared `.ticket` rule in src/ui/parts/parts.css sets `grid-template-columns: 18px var(--ticket-stub-w) 1fr 26px`, so the name, gain and loss fall into four narrow columns and print over each other (policy `g1-42.png`). Add `grid-template-columns: 1fr;` to `.bp-option` in place.css (or drop the `ticket` class). Not a Respond.tsx problem: the event answer slip is fine.
Stub meanwhile: none; package C did not touch place/.

## [C] A refused place visit says only "not allowed now" (playtest 8 must-fix 11)  (done at the join: blockers.ts `visitBlockWords`, read by the stop card, the council panel and the place sheet, which shows the reason and a Close button instead of the options; the dead `visit_used` blocker and its words are gone)
File: src/board/ui/place/index.tsx (owner: the package that owns src/board/ui/place/)
Need: the cause was the one-visit-a-year blocker `visit_used`: policy visited the Gwent Levels in Winter 2032 and opened the Rhondda tips in Summer 2033, and the sheet showed the generic act error and "That choice cannot be made now". This round the engine no longer raises `visit_used` (projects.ts `case "visit"` only checks the offer is open), so the visit itself now goes through. What is left for the place sheet: before the choose button, read `options(model, state)` for `{ kind: "visit", place }`; when it is not allowed (an offer that lapsed while the sheet was open), show `blockerWords(model, b)` from src/board/ui/blockers.ts and disable the choose button, instead of the generic error. The stop card's "Go and visit" and the council panel's visit button already carry the engine's reason and are disabled while any blocker holds.
Stub meanwhile: none.

## [C] Engine Why? sentence reads "Your A repairs team" (playtest 8 must-fix 14)  (done by D: board.json cause.project and cause.people_young)
File: model/i18n/{en,cy}/board.json (owner: the package that owns board.json)
Need: `cause.project` is "Your {project} in {site}", which reads "Your A repairs team for cold, damp homes" and "Your Land a big employer". Suggest "{project}, which you built in {site}" (the Why? panel's own words now). `cause.people` ("People moving and changing their minds") is circular: suggest "Young adults moving towards work and homes" (rule S3) for the young group. The Why? panel no longer shows the engine's `why.line_*` sentence (the delta, cause, link and rule rows say it all), so only other readers of `Why.say` still show these.
Stub meanwhile: src/board/ui/causes.ts writes its own cause words from boardui.json.

## [C] Answers to package B's two entries for package C  (done)
File: model/i18n/{en,cy}/boardui.json, src/board/ui/BuildMenu.tsx, src/board/ui/Ticker.tsx, src/board/ui/copy.test.ts (owner: package C)
Need: none. `ticker.first` now says "Nothing moves until you press Start time." (step by step mode: `ticker.firstStep`, "... press Next season."). The unread `guide.map`, `guide.council`, `guide.build`, `guide.play`, `guide.speed`, `guide.playStep`, `guide.speedStep` and `clock.held.*` are gone from boardui.json and from copy.test.ts's families. Each ticket list of the build menu clears the hovered project on pointer leave unless a ticket is open.
Stub meanwhile: n/a.

## [A] The board e2e: the result is now at the top of the end screen, not folded in the count  (done at the join: checkEnd expects be-verdict first, be-band and be-record visible without a click)
File: tests/e2e/board.spec.ts, `checkEnd` (owner: coordinator)
Need: playtest 8 must-fix 1 moved the verdict and both scores to a new first section, `be-verdict` (above `be-lapse`), so `be-band` is visible as soon as the end opens. The lines "the count is folded shut until opened" (`be-band` toBeHidden, then visible after `be-count-open`) now fail. Please change them to: `be-verdict` first in the order list and visible; `be-band` visible without a click; then click `be-count-open` and check `be-found` as before. `be-record` (promise, place furthest behind, elections, deals) is inside `be-verdict`; `be-turns` shows only in a hard game.
Stub meanwhile: none. Not run here (the e2e builds and plays a whole game); unit tests cover the pieces (src/board/ui/end/record.test.ts).

## [A] Package 10's content tests changed for more chapters and letters  (done, a notice for the coordinator)
File: src/board/content/story.test.ts, src/board/content/content.test.ts (owner: package 10)
Need: none. They pin the counts of the files package A now owns. story.yaml has 24 chapters (three fallbacks so no game tells the same chapter twice, two more for a second and third lost election, a slow climb and a slow slide), and letters.yaml has 36 letters (a third, `lower: either`, for each ending). The two assertions were updated to match; nothing else in those files changed.
Stub meanwhile: n/a.

## [A] Welsh mutation of {council} in the new end screen sentences  (done by the Welsh pass: src/board/ui/cymraeg.ts fills every Welsh board slot)
File: model/i18n/cy/boardend.json, model/board/story.yaml, model/board/endings.yaml (owner: package A); the slot filler (owner of must-fix 19)
Need: the new Welsh lines say "yn {council}", "i {council}" and "gartrefi yn {council}" (river floods now name the council, not a town, so playtest 8 should-fix 12's "The Ely flooded Barry" cannot recur). When the {council} slot learns its soft and nasal mutations, these follow with no change here.
Stub meanwhile: unmutated names, as before.

## [D] Answers to package B's entries for package D  (done, a notice for package B)
File: model/board/game.yaml, src/board/engine/score.ts, on-the-way.ts, budget.ts, api.ts (owner: package D)
Need: none. (1) `steady` is now 4000 ms a step. (2) `headway(model, state)` in api.ts returns `{ comingPoints, comingBy, byCouncil }`: points of Left for 2050 that are built or started but not yet on the board (builds, bedding in, ramps, at full size, need and level included), the year the last of it lands, and the same per council and measure (`OnTheWay`) for the dashed part of the bars. R1 roots are not counted ahead: they grow only while a project keeps company, so they show as they happen. The contradiction is fixed at its cause: `leftBoard` now counts what is on the way (on-the-way.ts) for every standing project, building or ramping, so Left for 2050 no longer dips the day a slow build opens (on-the-way.test.ts). Your "still being built" line can read `headway().comingPoints` and `comingBy`. (3) `CoinsReport.lost`: coins not paid this step because the purse was full (always set by the engine; optional in the type so your stops.test.ts fixture still compiles).
Stub meanwhile: n/a.

## [D] Event names inside sentences: use the noun key  (done at the join: Timeline, StopCard, CouncilPanel, causes.ts and the place sheet pass `noun`; English copy puts the noun after a colon; Respond.tsx and Verdict.tsx pass `riverAt`; the duplicate river helpers in end/view.ts and story-terms.ts are gone)
File: src/board/ui/Timeline.tsx, StopCard.tsx (fallbackLine), Respond.tsx, place/index.tsx, model/i18n/{en,cy}/boardui.json, boardend.json; src/board/engine/story.ts (owners: B and C)
Need: playtest 8 must-fix 7. Each event now has a noun form for the middle of a sentence in board.json, `event.<id>` ("a dirty river", "afon fudr"; "a firm that wants to grow", "cwmni sydd eisiau tyfu"). `eventNoun(id)` in api.ts gives its key (`board.event.<id>`), and the engine already sends it in every `{event}` slot it fills (stops respond and warning, time line warning, build rebuild note, cause.response). Screen sentences that still put the title (`name`) into a slot: boardui `timeline.landed` "{name} landed on {place}", `timeline.warning`, `stop.warning.line`, boardend `place.offeredEvent`, and story.ts `moment.event` (its board.json sentence is now "In {council}: {event}.", which reads with either form). Please pass `t(eventNoun(id))` there, and keep `name` for headings and map labels. Also Respond.tsx fills `landed` with `fill(model, tx(ev.landed), councils)` and no river, which gives "The  burst its banks" when a storm lands in a river's last council: pass `riverAt(model, councils[0], councils[1])` (api.ts) as the river. The engine's forecast already does.
Stub meanwhile: the engine's own sentences are fixed; event-words.test.ts checks every {event} the engine sends is a noun key and every river event names a river.

## [D] The Ely runs through the Vale to Cardiff: river towns in story and endings  (done by A: river lines name the council; story-terms.ts and endings.ts now use events.ts `riverAt`)
File: src/board/engine/story-terms.ts, endings.ts (owner: package B)
Need: playtest 8 should-fix 12, "The Ely flooded Barry". links.yaml now has the Ely as Rhondda Cynon Taf, then the Vale of Glamorgan (Peterston-super-Ely), then Cardiff, where it reaches the sea; the old fork straight from Rhondda Cynon Taf to Cardiff is gone (rivers.test.ts checks every river's course and mouth). A chapter or ending that names a town for a river event should not take the council's first town (`towns[0]`, Barry for the Vale): Barry is on no river in play. Use the council name, or a town on that river.
Stub meanwhile: none.

## [D] Notice: pace, events and balance numbers changed  (a notice for the coordinator and all packages)
File: model/board/ (owner: package D)
Need: none. Every change is a game rule and is in docs/design/board-balance-log.md with its reason: B1 opening 6 to 8 and base 3.75 to 4 coins a year; E1 first outside trouble 2030 (was 2028), new E1 `repeat_max` 2 and `repeat_gap_years` 8 (no event more than twice a game or within 8 years); R1 new `quick_max_factor` 1.5 (quick projects help at once with shallow roots), quick projects' lifts 1.75 times, tier 2 and keystone lifts 1.3 times; R2 coins 0.5 a rising council (was 1); R3 discount 3 (was 2). A place visit on offer can always be made (the `visit_used` blocker is gone). The fixture pins its phase 1 values (fixture-rules.ts) so clock-equivalence stays green. New bot Spender (every coin on the cheapest build) and two marks: "Thought beats spending" and "Things move early".
Stub meanwhile: n/a.

## [Welsh] Notice: every Welsh board sentence is filled by src/board/ui/cymraeg.ts  (a notice for the coordinator and all packages)
File: src/board/ui/ (owner: the Welsh pass)
Need: none. Board screens now import `t` and `tn` from src/board/ui/lang.ts, not src/i18n (an import path change in each board UI file; cymraeg.test.ts fails if one goes back). In Cymraeg it fills `{slots}` through cymraeg.ts `fillCy`: the soft, nasal and aspirate mutations by the word before the slot ("yng Nghasnewydd", "i Gaerffili", "a Chaerdydd"), the article joined ("o'r haf", "i'r Barri", "Mae'r Gymraeg"), lists with "a"/"ac" and the aspirate (`listOf`, new `orOf` in words.ts), and figures ("1 flwyddyn", "8 mlynedd", "2 brosiect"). words.ts `say`, `fill`, chapters and end/view.ts `fillText` use it too. English is untouched. Names keep no English line under them in Cymraeg (`<Pair single={lang() === "cy"}>`, as v1 does since cold playtest 6). src/i18n is not changed.
Stub meanwhile: n/a.

## [Welsh] The headline's change line is hidden under the big number  (done at the join: the figure no longer shrinks, clock.css `.bw-score-n { flex: none }`)
File: src/board/ui/TopStrip.tsx, clock.css (owner: package B)
Need: the line under "Left for 2050" ("Up 0.4 since 2026", Welsh "Wedi codi 0.4 ers 2026") starts under the large figure, so its first letter is covered (design/shots-build/board-fix1/cy/10-stop-warning.png, b-15-deal.png; the old Welsh "I fyny" lost its "I" entirely). Give the text column a left margin clear of the figure.
Stub meanwhile: the Welsh now reads "Wedi codi" / "Wedi gostwng", which survives a covered first letter less badly.

## [Welsh] English sentences still put an event title in a sentence slot  (done at the join, with [D] "Event names inside sentences")
File: src/board/ui/Timeline.tsx (timeline.landed, timeline.warning), StopCard.tsx (stop.warning.line), CouncilPanel.tsx (council.mapWarn), causes.ts (cause.response), place/index.tsx (boardend.place.offeredEvent), end/Verdict.tsx (boardend.turns.eventNamed)
Need: these pass the event title (`name`), not the noun (`t(eventNoun(id))`). The Welsh is now written so a title stands after a colon or alone ("{name}: daeth i {place}", "Rhybudd i {council}: {event}", "Trafferth yn {council}: {event}"), so Welsh reads right with either. English still gives "A warning: The river runs dirty may hit Newport".
Stub meanwhile: Welsh fixed in the copy; English as before.

## [Welsh] Source titles on Why? and rule cards are English in Cymraeg  (closed at the join: kept as citations, a publication's own title; a Welsh title field is a data task for the owner, logged in playtest-8 "After fix round 1")
File: model/sources.yaml and the board sources (owner: data)
Need: a decision. Titles such as "Census 2021 ODWP01EW Location of usual residence..." and "ONS mid-year population estimates" show in English on Welsh screens (design/shots-build/board-fix1/cy/32-why.png). They are the publications' own titles, so they are left as citations; a Welsh title field, where the publisher has one, would close it. Cold playtest 6 logged the same for v1.
Stub meanwhile: English citation titles.


## [JOIN fix 1] Fix round 1 joined  (done, a notice for the coordinator)
File: src/board/ (the join may edit any board file)
Need: none. Every open entry above is closed or decided. New at the join: `visitBlockWords` (blockers.ts), the `still_building` blocker, `board.stop.finished_link`, `shownGap` (end/record.ts), `underNow` (Timeline.tsx), `up` slips (markLayout.ts), the strip's "on the way" from the engine's `headway`, and `on-the-way.ts` dating a build's opening from the step after `readyStep`. Removed: `visit_used`, `riverOf` (end/view.ts), story-terms.ts `riverAt`, `readyYearOf`, `branchIcon`, `hitCouncils`, `boardui.title.try*`. Scripts: design/scripts/board-fix1-join.mjs, board-fix1-join-visit.mjs. The marks are in docs/design/playtest-8-board-cold.md "After fix round 1".
Stub meanwhile: n/a.

## [D2] Laws: what the screen must say  (done: C's LawsSheet shows each council's lasting cost; the join said in `laws.note` that it lasts as long as the law stands)
File: src/board/ui/LawsSheet.tsx, src/board/ui/lawCost.ts, model/i18n/{en,cy}/boardui.json `laws.note` (owner: package C)
Need: a law's backing cost is now LASTING (playtest 9 must-fix 2). It falls at once and stands, unchanged, for as long as the law does; repealing gives it back; nothing fades. The old cost went into moods and held.ts took it back the next step while the moods kept it, which is why backing crashed and then "recovered with no explanation". Engine: `lawBacking(model, lawId)` in api.ts gives each council's points (the same `lawCost.ts` gets by `act`, which is now exact). Numbers now: local homes rule Cardiff -0.6, Newport -0.6, every other council +0.1 (young people and Welsh speakers like it); no homes on flood plains -0.4 in Bridgend, Rhondda Cynon Taf, Caerphilly, Blaenau Gwent, Torfaen and Merthyr Tydfil, +0.2 in the Vale, Cardiff and Newport; visitor charge -0.5 in the Vale, Cardiff, Monmouthshire and Newport (and now half a coin a year). Words, please: `laws.note` "A law costs no coins. It costs backing in the councils below, at once, for as long as it stands. Repeal it and the backing comes back." Each law lists its councils and points before Pass, and the count after ("9 of 10 back you now, 7 if you pass it"). Why? on backing names the law (cause `law`, rule P1).
Stub meanwhile: none needed; the engine is exact.

## [D2] Deals: what the screen must say  (done at the join: dealWords.ts and Election.tsx read `broken_here` and `broken_years`; `deal.note`, `deal.brokenBacking`, `election.means.lost` say that council only and the fade; `cause.dealBroken` names the fading anger; src/board/ui/rules.test.ts fails any screen that reads a rule param the model lacks)
File: src/board/ui/dealWords.ts, src/board/ui/Election.tsx, model/i18n/{en,cy}/boardui.json `deal.note`, `election.means.lost` (owner: package C)
Need: P6 `broken` (0.5 everywhere) is gone (playtest 9 must-fix 9: 8 councils to 1). It is now `broken_here` 1.5 (backing lost in that council only) and `broken_years` 4 (the loss fades evenly to nothing, a quarter each year as a year closes). `ruleParamOf(model, "P6", "broken", 0.5)` in dealWords.ts and Election.tsx now falls back to 0.5 and is wrong: read `broken_here` and `broken_years`. Words, please: `deal.note` "Kept, they back you more. Broken, {council} backs you {broken} less, and that fades over {years} years. A game rule." `election.means.lost` "... Kept, backing there rises by {kept}. Broken, it falls by {broken} there, fading over {years} years." In the term report and Why?, the fade is its own record: rule P6, cause `deal` (positive delta, deal `kept: false`); say "The anger at your broken deal with {council} is fading." Engine: `brokenShare(model, deal, step)` and `standingParts(model, state, code)` in api.ts. A broken deal has a new `brokenStep`.
Stub meanwhile: the screens say 0.5 everywhere, which is now untrue.

## [D2] The keystone gate: what the screen must say  (done by C: blockers.ts `gateWords` with Now n of 2, legacy under After the keystone)
File: src/board/ui/blockers.ts, BuildMenu.tsx, TreeSheet.tsx, BranchRoad.tsx, boardui.json (owner: package C)
Need: decided and stated (playtest 9 must-fix 1): the keystone opens when the branch's one bigger project is working in TWO councils. The tier 3 gate in tree.yaml now names it (`project: station-quarter`, `community-energy`, `valleys-park`, `health-hub`, with `branch`, `tier: 2`, `at_least: 2`). A legacy project never counts for a gate (conditions.ts), even when it stands. Every `needs` blocker on a `project` condition now carries `have` (how many match now). Words, please: for a gate with `project` and `at_least` over 1, "{project} working in {n} councils: {have} of {n}" (not "2 bigger projects"); for the tier 2 gate, "{n} starter projects of {branch} working anywhere: {have} of {n}. The same one in two councils counts twice." Show the legacy project apart, as "After the keystone". The keystone card always names its blocker from `blockers` (coins, the gate with its count, `too_late` 2044, `one_keystone`). The `need:<branch>:3` rule card note now says the same. The fresh start no longer takes coins off a keystone (R3 `max_tier` 2), so "3 off the full price of 8" cannot show.
Stub meanwhile: the old words show "2 bigger projects", which is still true but does not say the same one twice.

## [D2] People expect more each term  (a notice for packages B, C and A)
File: model/board/rules/people.yaml (owner: package D)
Need: none required. Playtest 9 should-fix 1: careless games won every election. Rule P1 now has `expect_points` (0) and `expect_rise` (0.12): each group judges what it cares about against that much better than four years ago, 0.12 more for every election held. So careless play loses elections (Random loses one in 91 of 100 runs of the full balance run) and skilled play still wins (4 of 5 or more in 98 of 100). A mood reason can now be `board.mood.measure.slow` ("Health has got better, but not by as much as people expect after four years"), in board.json both languages. `expectedGain(model, state)` in api.ts gives the bar now if the election card or rule book wants to say it ("People now expect each score 0.36 better than four years ago"). The purse is now 20 (B1 `purse_max`), and Work and pay adds 0.35 coins a year a step (was 0.5). In the quick runs more lost elections made The comeback end more games (up to 0.37 of branch and Skilled runs, the cap is 0.40); in the full run the largest is The green valleys at 0.33, but package A may want to watch The comeback.
Stub meanwhile: n/a.

## [D2] Local truth: the Ebbw Valley Line is not "to Caerphilly"  (done at the join for the words: `link.rail` "{line}: trains run on into the {other} council area"; real line ends per link stay a data task)
File: model/i18n/{en,cy}/boardui.json `link.rail` (owner: package C); scripts/board/rail-links.ts (owner: data)
Need: playtest 9 should-fix 11. The rail link `rail:blaenau-gwent-caerphilly` is the Ebbw Valley Line, which runs from Ebbw Vale through Newbridge and Risca (Caerphilly county borough, not Caerphilly town, which is on the Rhymney Line) to Newport and Cardiff. `link.rail` "{line} to {other}" reads "Ebbw Valley Line to Caerphilly". Words, please: "{line}: trains run on into {other} council. Trains: {quality}." Better still, the data owner could give each rail link the line's real ends (Ebbw Valley Line: Ebbw Vale Town to Newport and Cardiff Central), shown as "{line}, Ebbw Vale to Newport and Cardiff". Links are derived, not authored, so links.yaml cannot carry it. The other two local truth items are fixed in events.yaml: a flood raises flood risk a step where it lands (so a flooded council never reads "low"), and a surgery closing takes 0.15 off Health, not 0.3.
Stub meanwhile: the panel says "to Caerphilly".

## [D2] Tests outside package D that moved with the numbers  (a notice for packages C and A)
File: src/board/ui/panels9.test.ts (owner: package C); src/board/boundaries.test.ts (story-terms.ts, owner: package A)
Need: panels9 "charges an event answer the price its button shows" finds no state with an answer to give: grown events now come at seeded times (E1 `grown_first_years` 2), so the sampled states (testStates, `careless` 2029) hold none. Sample a state with a pending `respond` (for example run each careless game until one is waiting). boundaries.test fails on story-terms.ts importing ../../engine/welsh, not a package D file.
Stub meanwhile: n/a.

## [B fix 2] Slow the Fast speed so cards cannot pile up  (done at the join: game.yaml brisk 2500, fast 1500; board.spec.ts fast game timeout 480 s)
File: model/board/game.yaml `speeds` (owner: package D)
Need: cold playtest 9 should-fix 4: Fast is 750 ms a step (3 seconds a year) and civ and cymraeg met card after card (`g1-19`, `g1-20`). Package B now shows waiting cards one at a time with "Card 1 of 3" and "Carry on past all 3 cards", drops cards that are no longer true, and never runs time while a card is up, but the speed itself is data. Suggested: brisk 2500 (10 s a year), fast 1500 (6 s a year); steady stays 4000 (16 s a year). The clock line reads the seconds from the model, so nothing else changes.
Stub meanwhile: the speeds as they are.

## [B fix 2] Notice: event cards, stop cards and warnings sit in the lane between the columns  (a notice for the owners of Respond.tsx and board.css)
File: src/board/ui/clock.css `.bw-lane` (owner: package B)
Need: none, unless you move the columns. Cold playtest 9 must-fix 4: `.bw-stop`, the warning slip and `.bw-respond` (the event card) now sit between the build menu and the council panel, centred, scrolling inside themselves, never over the build menu or Build it. clock.css repeats the column widths as `--bw-left-col` (14 + 432, 14 + 392 at 1280) and `--bw-right-col` (14 + 372, 14 + 336); if `.bw-build` or `.bw-right` change width in board.css, change these too. tests/e2e/board-lane.spec.ts measures the real boxes at 1280 x 800 and 1440 x 900 and fails on any overlap or clip. With the build menu open the ticker also moves into the lane.
Stub meanwhile: n/a.

## [B fix 2] The term report scrolls with no sign there is more  (done at the join: TermReport.tsx shows a "More below" button at the foot until the end is reached, `boardui.term.more`)
File: src/board/ui/Election.tsx, TermReport.tsx (owner: package C)
Need: cold playtest 9 must-fix 4, casual `g1-17.png`: the election card's last slip ("Why?") is cut at the foot of `.bw-term-scroll`, which reads as clipped. A fade or "more below" at the foot of the scroll, or a shorter report, would close it. Package B did not change it.
Stub meanwhile: the report scrolls.

## [B fix 2] Notice: the clock's rules after cold playtest 9  (a notice for the coordinator)
File: src/board/ui/clock/ (owner: package B)
Need: none. After any card time does what it did before the card (Carry on, an answer, the term report closed); Look and Go and visit pause. "Paused after your answer" is gone (`boardclock.status.answered` removed). Held reads "Waiting"; paused reads "Paused by you". Space works the clock on any focused control except a form field, and on a card's own buttons it is that button once (keys.ts `keyMove`, keys.test.ts). The speed picked in a game is no longer saved: a new game starts at the starting speed in prefs (game.yaml's default unless a test writes another), so tests/e2e/board.spec.ts's fast game still runs fast. A stop whose fact has passed is dropped before it is read (stops.ts `stillTrue`). design/scripts/pw-dev-b.config.ts runs one e2e spec against a running dev server without a build.
Stub meanwhile: n/a.

## [B fix 2] A keystone started in the last allowed season cannot work by 2050  (done at the join: engine time.ts `keystoneLastStep` = the first step of 2044, used by the blocker, the time line, the tier card, the road and the build menu; the `too_late` blocker carries `lastStep`; projects.test.ts checks every keystone started then opens by the last step)
File: src/board/engine/projects.ts (`too_late`), timeline.ts (`keystone_last_start`), model/board/game.yaml (owner: package D)
Need: game.yaml says a six-year keystone "started by May 2044 opens in the last step". But `too_late` only blocks once `state.year > 2044`, so a keystone can still be started up to Spring 2045 (step 75), which opens after step 96, and the time line marks Spring 2045 as "the last season to start a keystone". The build menu says "by 2044" (BuildMenu.tsx). Pick one: the last start step should be 96 minus the keystone's build steps (May 2044), used by the blocker, the time line mark and the build menu alike. Package B's tier card and time line tip read the time line's step, so they follow whatever the engine decides.
Stub meanwhile: B's words name the season the time line marks and do not claim it works by 2050.

## [C fix2] Rule book: tier gates printed as raw ids, and no way to open one project  (done at the join: BoardLists.tsx prints the gate rule's note as the link; projects and events rows carry ids and BoardBook passes `parts[1]`, so a Why? link scrolls to and marks the row)
File: src/ui/book/board/BoardLists.tsx, BoardBook.tsx (owner: the rule book / coordinator)
Need: the projects page prints each tier gate as its rule id ("Opens when: need:valleys:2", playtest 9 must-fix 12, policy `g1-23-rulebook.png`); print the gate in words instead (src/board/ui/blockers.ts `gateWords` says it, e.g. "Opens when Station quarter is working in 2 different councils"). Also: a Why? now links to `#/llyfr/bwrdd/projects/<project id>` and `#/llyfr/bwrdd/events/<event id>` (whyWords.ts `ruleHref`); BoardBook reads only `parts[0]`, so it opens the right page but at its top. Give each project and event an id on its list page and scroll to `parts[1]`.
Stub meanwhile: the links carry the item; the page opens at the top as before.

## [C fix2] Source notes carry raw data ids  (closed at the join: the screen shows every note through `boardSource`, and panels9.test.ts fails a raw id on screen; model/sources.yaml is shared with v1 and the pipeline, so its notes stay as maintainers' notes)
File: model/sources.yaml and the board model's source `note` fields (owner: data / coordinator)
Need: notes such as "low_pay_hourly is the 20th percentile" (nomis_ashe), "the goal of the welsh_speakers band", "Same NRW attribution statement as nrw_sssi", "(self_employed)", "home_transport_emissions uses" are shown in the source card. Write them in words.
Stub meanwhile: the board shows every source through whyWords.ts `boardSource`, which replaces a snake_case id with its measure name from facts.json or atlas.json, or with spaces. panels9.test.ts scans every board source note, so a new raw id fails the test.

## [C fix2] Welsh: "carreg glo" left in board.json and boardend.json  (done by the Welsh pass; cymraeg.test.ts guards it)
File: model/i18n/cy/board.json, model/i18n/cy/boardend.json (owners: package 10 / A, the Welsh pass)
Need: the keystone is "maen clo" (masculine: "y maen clo", "Dechreuwch ef") in boardui.json now; board.json and boardend.json still say "carreg glo" (playtest 9 must-fix 10).
Stub meanwhile: none.

## [C fix2] Notice: the term report is wide, and other screen changes  (a notice for package B and the coordinator)
File: src/board/ui/TermReport.tsx, board.css (owner: package C)
Need: nothing. The term report carries `bw-term-wide` (board.css: up to 880 px, the election left, the term right, a tighter head), overriding clock.css `.bw-term` width; the deal to pick and what happened to each deal of the term sit at the top of the right column. Also: `roadWords(model, path, state, here?)` and `blockerWords(model, b, state?)` changed signature (the state adds "Now 1 of 2"); `boardui.build.takes` is now plural (`build.takes.one/.other`, `build.takesQuick`); `council.deal`, `council.momentumNote`, `tree.costNow`, `tree.shut`, `build.upgrade` are gone; `stop.tipping.rising/.slipping` now say backing moves each year (read by StopCard). If the engine's law cost now fades (M2 engine side), add how fast to `laws.note` in both languages; the laws sheet works out each council's cost by applying the law to a copy of the board (lawCost.ts), so its figures follow whatever the engine does.
Stub meanwhile: none.

## [A fix 2] A keystone's "From" date on the build card disagrees with the year it opens  (done by C: BuildTicket reads the option's `readyStep`, built from `buildYears` with every discount)
File: src/board/ui/BuildMenu.tsx, src/board/engine/preview.ts or words.ts (owner: the package with playtest 9 must-fix 11)
Need: designer `g2-09.png`: Rivers given room built in Spring 2042 showed "From Spring 2046" and "Takes 4 years to build", while the same card's preview said "+3.6 from 2045" and the game opened it in 2045 (faster builds when won well). The end now dates every keystone by the step after `readyStep` (`yearOfStep(readyStep + 1)`, as on-the-way.ts does): the letter, the evidence, the keystone moment and its chapter, checked over many bot games by endings-truth.test.ts. The card's "From" and "Takes N years" should read the same `readyStepOf` with the build's real discounts.
Stub meanwhile: none; the end is right, the card is not.

## [A fix 2] Council names that need "the" in a sentence  (done at the join: src/board/ui/english.ts, called by lang.ts `t` in English, puts "the" or "The" before a name listed in `boardui.grammar.withThe`; a fragment keeps the bare name; english.test.ts)
File: model/authorities.yaml or model/i18n (owner: data)
Need: "Heat and homes for all opened in Barry, in Vale of Glamorgan", "Health in Vale of Glamorgan". Every sentence slot that takes a council name reads without the article. A sentence form of the name ("the Vale of Glamorgan") would close it everywhere.
Stub meanwhile: none.

## [A fix 2] Notice: ending priorities, the Wales you did not build, towns and the verdict  (a notice for the coordinator and package D)
File: model/board/endings.yaml, story.yaml, letters.yaml, src/board/engine/endings.ts, story-terms.ts, story.ts, src/board/ui/end/ (owner: package A)
Need: none. Priorities now: Two countries 1, The long game 2, The joined-up valleys 3, The green valleys 4, The workshop 5, The warm country 6, The gamble 7, The comeback 8, then as before. A quick bot run (`scripts/board-balance.ts --quick --no-write`): largest share among branch bots and Skilled 0.34 (green valleys; was 0.39 warm country), Skilled now The green valleys or The workshop, 10 endings real. The balance log was not rewritten. `nearestNotBuilt` never offers an ending you built or whose keystone stands, and prefers a keystone route. {town} is now "Treorchy, in Rhondda Cynon Taf" everywhere (`townOf`), always of the same council as {council}; "{town} turns a corner" is now "{council} turns a corner". A chapter not told yet comes before a second telling of one. Grown trouble counts on the track its trigger waits for (`trackOf`), so "When the work went" can tell the big employer leaving. The verdict leads with Left for 2050 to a tenth, as the top strip shows it; `shownGap` works in tenths. Screenshots: design/shots-build/board-fix2/a/ (design/scripts/board-fix2-a-saves.ts, board-fix2-a.mjs).
Stub meanwhile: n/a.

## [Cy fix2] The top strip lets no line wrap, so a long word pushes the page off the screen  (done at the join: clock.css lets the purse and score boxes shrink, each line ends in an ellipsis)
File: src/board/ui/clock.css (`.bw-head-note`, `.bw-coins-line`, `.bw-coins-note`, `.bw-coins-why`: `white-space: nowrap`), board.css `.bw-strip` (owner: package B)
Need: playtest 9 must-fix 10 (cymraeg `g1-44.png`, `g1-45.png`). The cause is the strip: `.bw-strip` is a flex row whose items cannot shrink below their nowrap lines, so in the last year (purse full, "still on the way" line, income reason) the Welsh strip measured 1451 px on a 1440 px screen and pushed the language switch off the right edge. The Welsh pass shortened every strip line (cymraeg.test.ts "the top strip in Welsh" holds each within a quarter of the English), and the late-game shots at 1440 and 1280 now fit. The layout itself should still give: let `.bw-score-word` and `.bw-coins-word` shrink (`min-width: 0`) and let the notes wrap to two lines or ellipsis, so a long project name in "+0.4 y flwyddyn: elw {project}" cannot do it again. tests/e2e/board-cy.spec.ts now fails a Welsh screen wider than the window or with the language switch off it.
Stub meanwhile: shorter Welsh words.

## [Cy fix2] "-0" in the coin line  (done at the join: words.ts `incomeWords`, incomeWords.test.ts)
File: src/board/ui/TopStrip.tsx line ~172 (owner: package B)
Need: playtest 9 must-fix 10 ("Tua -0 y flwyddyn", cymraeg `g1-41`). `strip.income` is filled with `(perYear >= 0 ? "+" : "") + formatNum(perYear, { maximumFractionDigits: 1 })`, so an income of -0.03 a year shows "-0" (and 0.02 shows "+0"). Round to tenths first and drop the sign at zero, as `signed()` at the foot of the same file does, or say "Tua 0 y flwyddyn" / "About 0 a year". tests/e2e/board-cy.spec.ts (design/scripts/board-cy-lib.mjs) now fails any screen line with a signed zero.
Stub meanwhile: none.

## [Cy fix2] Source titles in Why? read all English in Welsh  (done at the join: `boardui.why.sources`, "Ffynonellau (yn Saesneg):" before the dockets)
File: src/board/ui/whyWords.ts `sourceLabels` and WhyPanel.tsx `.bw-why-sources` (owner: package C); model/i18n/{en,cy}/boardui.json
Need: playtest 9 must-fix 10 (cymraeg `g1-16-why.png`: "Transport access and labour market participation studies"). Keep the citation in its own language, but give the line a Welsh label. Suggested: a key `boardui.why.sources`, en "Sources:", cy "Ffynonellau (yn Saesneg):", shown before the dockets in `.bw-why-sources` when the language is Welsh (or always: en "Sources:"). A source whose `short` is a publisher name ("ONS", "SYG") needs no change.
Stub meanwhile: none. The Welsh pass did not touch the code.

## [Cy fix2] Welsh tier gate notes written in engine code  (done at the join: tree.yaml `gate_notes`, read by `gateRules`; the fixture keeps its own)
File: src/board/engine/fixture.ts `gateRules` (owner: package D)
Need: the gate rule cards carry Welsh written in the code, and it reads stiffly. Replace the tier 2 Welsh with "Mae prosiectau mwy yn agor pan fydd tri phrosiect cychwynnol o'r gangen hon yn gweithio, unrhyw le. Mae'r un prosiect mewn dau gyngor yn cyfrif ddwywaith." Better still, move both notes to model/board/tree.yaml as {en, cy} so they are data and the Welsh pass owns them.
Stub meanwhile: the old Welsh shows on the rule book's gate cards.

## [Cy fix2] English sentences over 18 words in boardui.json  (done at the join)
File: model/i18n/en/boardui.json `council.momentumWhy.rising`, `council.momentumWhy.slipping` (owner: package C)
Need: copy-rules.test.ts fails on them (29 and 20 words). The Welsh is now split into short sentences; the English can follow: "Young adults and work come in, and its projects grow faster. It backs you a little more each year. It adds about {coins} coin a year to your purse."
Stub meanwhile: none.

## [Cy fix2] Notice: Welsh words changed by the Welsh pass  (a notice for the coordinator and every package)
File: model/i18n/cy/board*.json, model/board/**/*.yaml cy fields (owner: the Welsh pass)
Need: nothing. The keystone is "maen clo" everywhere (plural "meini clo"; "conglfaen" and "carreg glo" are gone). A deal is "bargen", a law is "cyfraith" (never "deddf"). The Made here branch is "Diwydiant lleol" in Welsh (it read badly after "gyda", "â" and "y gangen"). Left for 2050 is "Gwaddol 2050"; Life in your years is "Bywyd yn eich cyfnod". The price label is "Pris" and the catch is "Yr anfantais" (it was "Y pris", which now clashed). cymraeg.test.ts fails any Welsh string that uses a replaced word, and any top strip line much longer than its English. The Welsh `deal.note` still says a broken deal costs backing "ym mhob cyngor", as the English does; if package D's rule P6 now costs that council only, change both.
Stub meanwhile: n/a.

## [JOIN 2] Fix round 2 joined  (done, a notice for the coordinator)
File: src/board/ (the join may edit any board file)
Need: none. Every entry above is closed or decided. New at the join: engine time.ts `keystoneLastStep` (the `too_late` blocker now carries `lastStep`), ui/english.ts and lang.ts `fillEn` (the article before "Vale of Glamorgan" in English sentences, names in `boardui.grammar.withThe`), words.ts `incomeWords`, TermReport "More below" (`boardui.term.more`), `boardui.why.sources`, `boardui.cause.dealBroken`, `boardclock.card.ended`, `boardclock.head.buildingAfter`, tree.yaml `gate_notes`, rule book item anchors (BoardLists.tsx `itemAnchor`). Tests: ui/rules.test.ts (every `ruleParamOf` names a real param), english.test.ts, incomeWords.test.ts, a keystone last-start check in projects.test.ts. Rules: game.yaml speeds brisk 2500, fast 1500; G1 `band_little` 1.5. Removed: unused keys `strip.from`, `strip.leftTip`, `strip.purseFull`, `path.gate.*`, `path.more`, `lapse.scrub`, `lapse.terms`. Script: design/scripts/board-fix2-join.mjs. The marks are in docs/design/playtest-9-board-cold.md "After fix round 2".
Stub meanwhile: n/a.

## [A fix3] A middle result band, "better" and "worse"  (done by D: G1 `band_some`, the same band names; the words are A's)
File: src/board/engine/score.ts `resultBand`, types-views.ts `ResultBand`, model/board/rules/people.yaml G1 (owner: package D)
Need: playtest 10 should-fix 7 (+9.2 read "a little better", +10.0 "much better"). Add "better" and "worse" between the little and much bands, with a G1 param such as `band_mid` (about 5 points, adjustable, tune, game rule): much_worse, worse, little_worse, same, little_better, better, much_better. The words are in: `boardend.band.better` and `boardend.band.worse` in both languages, and the end screen reads any band through `bandKey`; its "against 2026" line already follows a band ending in "better" or "worse". copy.test.ts already asks for both keys.
Stub meanwhile: none. Seen at the end: 45.3 to 50.3 reads "You left this part of Wales better than you found it" (design/shots-build/board-fix3/a/deals-en-be-verdict.png).

## [A fix3] One river per event, and the shown year, belong in the engine's time and events  (for package D; notice for C)  (done at the join: one `shownYear` in time.ts; story-terms.ts re-exports it, record.ts `shownYearOf` and words.ts `whenWords` call it; Respond.tsx and the end's turns not taken read the river from the event record, `eventRiver`)
File: src/board/engine/events.ts, time.ts, api.ts (owner: package D); src/board/ui/words.ts `whenWords` (owner: package C)
Need: (1) playtest 10 must-fix 7. Done by D: the river is kept on the EventRecord (event-river.ts `eventRiver`). The end's chapters and evidence now read it (story-terms.ts re-exports `eventRiver` and `isRiverEvent` from events.ts; `eventRiverAt` adds the river from where it landed for a council downstream). Still wanted: `eventRiver` exported from api.ts, so ui/end/Verdict.tsx (turns not taken) and Respond.tsx read the record rather than `riverAt(councils[0], councils[1])`, which gives the same river today only because the record was chosen that way. (2) Should-fix 10 (a letter said 2034 where the build said Spring 2035): a game year runs from May, so its spring is the next calendar year, and `whenWords` adds the 1. The end now gives every step's year that way (story-terms.ts `shownYear`; ui/end/record.ts `shownYearOf`, tested against `whenWords` for every step). Moving it to time.ts as one function, exported from api.ts, and having `whenWords` call it, would leave one rule. Notice: `Moment.year` is now this shown year (a spring moment reads the next year, a keystone the year its card gave), so the time line's moment years agree with the season words; moment weights are counted on the same game years as before.
Stub meanwhile: the rule is written twice (engine story-terms.ts and ui/end/record.ts), and record.test.ts holds both to `whenWords`.

## [A fix3] Notice: the record, The gamble and letters  (a notice for the coordinator and package C)  (read at the join)
File: src/board/ui/end/, src/board/engine/endings.ts, model/board/endings.yaml, letters.yaml (owner: package A)
Need: none. The record's election lines give the people share ("2034: you won well, with 8 of 10 councils and 71 in 100 people behind you"; a share never rounds against its result, `shareShown`), then the rule, then a 2050 line counted as the top strip counts ("2050, the end: 6 of 10 councils back you, with 52 in 100 people"). Each deal line gives the year judged, the measure and the year made. The gamble's summary no longer says work fell; a letter whose salutation, body or sign-off needs a slot the game cannot fill is not offered (`letterSayable`, mirrored by view.ts `letterChoicesOf`), and two new slots, `{work_back_in}` and `{work_fell_in}`, carry whether work came back in the letter's council. A new letter, `gamble-mended`. No schema change.
Stub meanwhile: n/a.

## [B fix3] Respond and the term report: focus on the card, and say what time does after it  (for package C, owner of Respond.tsx and TermReport.tsx)  (done at the join: both cards take the focus themselves, `tabindex="-1"`, and carry `<AfterCard />`; the BoardScreen focus stub is gone)
File: src/board/ui/Respond.tsx, src/board/ui/TermReport.tsx (owner: package C)
Need: playtest 10 must fix 10 and should fix 5. (1) Neither card should put the focus on an answer (Respond focuses the first `bw-respond-pick`; TermReport the first `bw-deal`). Focus the card itself (`tabindex="-1"`). Space can no longer answer either way: clock/keys.ts now makes Space pause or play on any card, focused button or not. (2) Put `<AfterCard />` (src/board/ui/clock/AfterCard.tsx) near each card's foot: one line saying what time does after the card, with "Pause after this card" or "Run after this card" (`boardclock.after.runs`, `card.paused`, `card.stayPaused`, `card.runAfter`, both languages). The stop card already does this.
Stub meanwhile: BoardScreen moves the focus from the answer to the card one frame after either card opens (sets `tabindex="-1"` on it). The clock's status line under Pause already says what happens after the card.

## [B fix3] The run-up words, from package C's tipping function  (for package C; notice for the coordinator)  (done: the run-up card draws C's `TargetsCard` from `electionTargets`; runup.ts keeps only the timing and the council Look opens, read from `electionTargets`)
File: src/board/ui/clock/runup.ts (owner: package B), against package C's pure function if it lands
Need: the critic's one change. B built `runUp(model, state)` in clock/runup.ts (who tips the next election: `win_one`, `win_several`, `lose_one` or `safe`, each council with its shown backing, gap to 5 and share of people), tested over whole games against the engine's own `election()` projection (runup.test.ts). The run-up card a year before each election reads it (StopCard `RunUpLines`, `boardclock.runup.*`). If package C ships its own function for the council panel or Why?, either call runup.ts from there, or tell B to read yours, so the two never disagree.
Stub meanwhile: runup.ts is the function.

## [B fix3] Notice: the clock, the lane and the keys after cold playtest 10  (a notice for the coordinator and packages A and C)  (read at the join)
File: src/board/ui/clock/, BoardScreen.tsx, StopCard.tsx, game.ts (owner: package B)
Need: none. One lane, one card: while an event to answer or a stop is up, a past term report, a warning, the branches or the laws the player had open step aside, still open, and come back after (`hold.ts` `overlays`, `LANE_READING`; TermReport.tsx already steps aside by the same rule, and BoardScreen now draws a card only when `clock.shown()` holds it). Space never answers a card (it pauses or plays everywhere but a text field or a place visit). Escape closes the top thing only (`keys.ts` `escapeTarget`). `clock.unread()` and `clock.read(event)`: warnings passed by "Carry on past all" or Look stay as slate tabs at the head of the lane until read (WarningSlip.tsx `UnreadSlips`); `game.setWarning` marks a warning read. The purse card stops time once a game (`stops.ts` `purseOnce`); ticker lines leave once untrue (`newsTrue`; news lines now carry their `stop`); a "purse nearly full" ticker line stays while true. The run is saved after every step and on leaving the board; coming back to #/bwrdd from the rule book (#/llyfr...) in the same visit resumes the game at the step left, not the start page (game.ts `leftFor`); Home still leads to the start page, whose Carry on is now at the step left. Time line labels are placed by their real width (clock/labels.ts). A `<button class="inklink">` on the board now has no button face (clock.css), and reads light on slate.
Stub meanwhile: n/a.

## [C fix3] The run-up card and the top strip: one count, and the councils that tip the next election  (for package B)  (done at the join: TopStrip counts `backersNow`, its year is `shownYear`, and the backers count has a tip with `targets.why`)
File: src/board/ui/TopStrip.tsx, src/board/ui/StopCard.tsx run-up (owner: package B)
Need: playtest 10 must-fix 6 and the critic's one change. `src/board/ui/electionTargets.ts` (pure, tested in panels10.test.ts) has `backersNow(model, state)` (who backs you now, by rule P4, the same count the election card, the laws sheet and the council panel use) and `electionTargets(model, state)` (the next election's year, the result if held now, `win`: the councils to bring round with the fewest points of backing to find, `well` for a strong win, `hold`: backers whose loss alone drops the result; each with `backing`, `gap` to the line and people `share`). Please count the strip's "N of 10 councils back you" with `backersNow(...).backers.length` (it counts `Object.values(s().councils)` today), and let the run-up card name the councils from `electionTargets`, with `gapShown(gap, keep)` from `TargetsCard.tsx` so its figures add up with `backingShown`. Keys you can reuse: `boardui.targets.need`, `.keep`, `.winHead`, `.holdHead.win|strong_win`, `.now.<result>`.
Stub meanwhile: the election card and the council panel show the targets; the strip counts as before.

## [C fix3] Top strip: "(0.0)" beside "+0.6", and "Up 0.7" beside "0.8 still on the way"  (for package B, or D if headway is the cause)  (done at the join: a build that moves Left for 2050 less than a tenth says "less than 0.1 more", never "(0.0)"; the on the way line reads "This counts 0.8 still to come", since the headline already holds it; D's on-the-way change removed the cause of most zeros; purse has its tip, backing now too)
File: src/board/ui/TopStrip.tsx, src/board/engine/score.ts `headway` (owners: B, D)
Need: playtest 10 should-fix 4. Economist `g1-48.png`: "If you build it: 49.2 (0.0)" while the council's bars say "+0.6": Left for 2050 moves less than a tenth for that build, so say so ("less than 0.1 more") or hide the bracket, never "(0.0)". Merthyr `g1-22.png`: "Up 0.7 since 2026" over "0.8 of it is still on the way" reads as more on the way than gained; say "0.8 more is on the way" (it is extra, not part of the 0.7), or make the two read from one figure. The build menu no longer previews a card under a still mouse straight after a build (BuildMenu.tsx `quietAt`), which was farmer's "4 left if you build it" after building. Also should-fix 2: the strip is where "purse" and "backing" are first met; one plain tip line each would close the jargon finding there.
Stub meanwhile: none.

## [C fix3] The map's zoom fits to a stale size  (for the map owner)  (done at the join: PaperMap.ts `focusLas` fits to `this.size` when the ease ends; the MapStage settle workaround is removed and board-map-fit.spec.ts passes without it)
File: src/map/PaperMap.ts `focusLas` (owner: the map renderer)
Need: playtest 10 must-fix 13. `focusLas` captures `const { W, H, dpr } = this.size` and its `finish` fits the national sheet to those after the 420 ms ease; if the host resized during the ease (the board's stage when a sheet closes or the window changes), the map is drawn small, framed in sea fill. `finish` should read `this.size` when it runs. The board works around it: MapStage.tsx forces `resize(true)` 560 ms after the last view change (`settle`), and tests/e2e/board-map-fit.spec.ts fails without that (checked by switching it off).
Stub meanwhile: the MapStage workaround.

## [C fix3] The deal record has no year  (for package A)  (done by A)
File: src/board/ui/end/record.ts `dealsOf` (owner: package A)
Need: playtest 10 must-fix 1: "Rhondda Cynon Taf: broken." four times with no year (merthyr `game2-end-0.png`). Add the year each deal was made or judged. The panels now say a deal needs a new project started after it (`boardui.deal.mustNew`), list your projects there and whether each counts (`dealProjectLines`), and say on each build card whether it would keep the deal (`dealBuildWords`, checked against the engine's judgement in panels10.test.ts).
Stub meanwhile: none.

## [C fix3] A placeholder evidence link: buses and Health  (for data / package D)  (done by D: `transport-health-access`; the rule book's licence line is in v1's book, left)
File: model/sources-extra.yaml `transport-labour`, model/board/projects.yaml `buses-meet-trains` (owner: data)
Need: playtest 10 must-fix 9. The board now shows any source noted "Placeholder" as "Rough guess, evidence still to find" (whyWords.ts `plainNote`, a "Rough guess:" docket label in Why?), and "to check" as "Evidence still to check against this source"; no raw note reaches the screen (panels10.test.ts). Still to do in data: check the Health effect of Buses that meet the trains is meant (its only source is a labour market literature), and the rule book's "Licence not stated" for such sources (src/ui/book, not a board panel).
Stub meanwhile: the words above.

## [C fix3] Notice: package C's fix round 3  (for the coordinator and every package)  (read at the join)
File: src/board/ui/ (package C files)
Need: none. New: `electionTargets.ts`, `backingHolds.ts` (what holds a council under the line, from P1 expectations, standing parts, slipping and group reasons, and the two builds whose preview lifts what people there care about most), `TargetsCard.tsx`, `whyWords.ts` `whySpans`, `shownReasons`, `openWhy` (backing opens since 2026), `plainNote`, `isRoughSource`, `dealWords.ts` `dealProjectLines`, `dealBuildWords`, `causes.ts` `reasonWay` (a cause is never worded against its change: "expects more", "settles back", "the anger fading"). TermReport steps aside while an answer waits, and a reopened past term while a stop card waits. `Election` takes `latest` and `onLeave` (law change button, the count now, the next election). `lawCost` counts live backing and adds `lost`, `won`, `resultNow`, `resultAfter`. Keys changed: `deal.must` (+ `deal.mustNew`), `preview.felt`/`feltVia` (no "bedded in"), `stop.tier_open.title`/`.line` (no "tier"), `council.visit` (+ `council.visitNote`), `respond.pick`/`pickFree` (no "Costs free"), `why.none` ("Ni newidiodd"), `cause.*` group forms. Tests: panels10.test.ts, tests/e2e/board-map-fit.spec.ts. Shots: design/shots-build/board-fix3/C/ (design/scripts/board-fix3-c-saves.ts, board-fix3-c.mjs).
Stub meanwhile: n/a.

## [A fix3] content.test.ts counts exactly 36 letters; The gamble now has four  (for the content owner or the join)  (done at the join: at least 36)
File: src/board/content/content.test.ts line 63 (owner: package 10, finished; the join)
Need: playtest 10 must-fix 8. The gamble's letters branch on whether work came back: `gamble-life` now needs `{work_fell_in}`, and a new `gamble-mended` needs `{work_back_in}`. With three letters a branching letter leaves some games one choice only (each of life or left, crossed with work back or not, needs two for a second game to read a new voice; endings-truth.test.ts "every ending offers at least two letters whichever way work went"). Change `expect(m.letters.length).toBe(36)` to `toBeGreaterThanOrEqual(36)`, or to 37.
Stub meanwhile: that one assertion fails (expected 37 to be 36); everything else in content.test.ts passes.

## [D fix3] The deal rule is "any project working there by the date": call the engine, drop "started after"  (for package C)  (done at the join: dealWords.ts calls `dealKeptBy`, `dealProgress` and `buildCountsForDeal`; `deal.mustNew` and `deal.yourOld` gone in both languages; `deal.must` says any project working there by the date keeps it, whenever started)
File: src/board/ui/dealWords.ts, DealChoice.tsx, boardui.json `deal.must`, `deal.mustNew`, `deal.yourOld` (owner: package C)
Need: playtest 10 must-fix 1, rule side, decided by D. A deal is kept by ANY project that lifts its measure and works in its council by its last step, whenever it was started; and a deal is never offered for a measure that anything standing there (working or being built) already lifts, so it is never met on the day it is offered (deals.ts `dealMeasure`). So the words "Have a project that lifts {measure} working in {council} by {when}" are now exactly the rule. Please: (1) drop `deal.mustNew` ("Only a project started after this deal counts"): it is false for a build started while the offer waits; say instead, if a line is wanted, "Nothing there lifts {measure} yet. Any project that does, working by {when}, keeps it." (2) Replace `keptBy` with api `dealKeptBy(model, state, d)`, `inTime` with api `dealLastStep(model, d)` (a project counts if its `readyStep` <= that), and `dealBuildWords` with api `buildCountsForDeal(model, d, project, councils, readyStep)`, which returns `counts`, `other_council`, `other_measure`, `too_late` or `closed`; `dealProgress(model, state, d)` lists projects there that lift it with `inTime`. `deal.yourOld` can no longer happen. (3) The deal discount now applies only to a build that opens in time (`dealServed` takes the build's readyStep).
Stub meanwhile: the UI's own copy of the old rule agrees with the engine in every case but a build started between the offer and taking it.

## [D fix3] The lever on a council: what it asks for gives backing (rule P7), and the expectation is its own Why? cause  (for package C; notice for B)  (done at the join: council panel "What holds it under 5" opens on the lever line from `lever.builds[0]` (`holds.lever`, `holds.leverShort`); Why? words the P1 expectation record as "People here expect more each term" (`cause.expect`) and a P7 record as answered, then the thanks fading; and the full purse card names the nearest council under 5 with a build it asks for that you can make now, purseLever.ts, tested)
File: src/board/ui/CouncilPanel.tsx, backingHolds.ts, whyWords.ts, causes.ts (owner: package C)
Need: playtest 10 must-fix 4. New rule P7 "Asked and answered" (people.yaml): in a council that does not back you (P7 `only_below`), a new project that lifts one of the two measures it asks for (the panel's "Asking for", now engine `askingFor`) gives +0.6 Backing there once it works, fading evenly over 4 years (a standing part, recorded under rule P7 with the project as cause). Engine gives: `councilView(...).lever` = { expects (points better than four years ago people expect now, P1), points (0.6), years (4), builds: up to three cheapest builds there that answer, each { project, measure, cost, readyYear, allowed, short } }. The build preview already carries a `backing` change under rule P7 and a note `board.build.answers` (board.json, both languages): the build card shows "Backing +0.6, from ..., when it opens" (seen in design/shots-build/board-fix3/D/04-build-answers.png). Please: (1) on a council under 5, say the lever in one line from `lever.builds[0]`: "{council} is asking for {measure}. Build {project} here ({cost} coins): backing +{points} once it works." and mark the answering builds in "Builds here that would lift it most" (backingHolds.ts could read `lever.builds`); (2) Why?: the part of a mood move that is people expecting more is now its own P1 record with cause `{ kind: "people", group, expect: true }`; word it "People here expect more each term you win" (never as the group being content); a P7 record reads "People here asked for {measure}, and {project} answered" fading as "The thanks for {project} fading". (3) Notice for B: a full purse can now be spent where it moves backing; the purse card could name `lever.builds[0]` of the council furthest under 5.
Stub meanwhile: the preview line and the build note show the lever; the panel's "Asking for" line is P7's list.

## [D fix3] Notice: package D's fix round 3  (for the coordinator and every package)  (read at the join)
File: src/board/engine/, model/board/, model/i18n/{en,cy}/board.json, model/sources-extra.yaml (owner: package D)
Need: none. New: `asked.ts` (P7), `levers.ts`, `event-river.ts` (one river on each flood record: `EventRecord.river`, `eventRiver`), `bots-levers.ts` and the marks "A lever exists" and "No wipe-out" (scripts/board-balance.ts). Changed: P1 `expect_rise` 0.12 to 0.16 and new `loss_eases` 1 (a lost election takes back one election's worth of expectation; careless games now lose and recover instead of sitting at 0 of 10); P2 note says "some up and some down"; B1 purse 20 to 24; G1 `band_some` 5 with `ResultBand` "better" and "worse" (package A already has the words); deals rule above; on-the-way.ts reads what the board has applied, so a build that works at once (after a strong win) or an upgrade moves Left for 2050 the moment it is made (was "If you build it: 49.2 (0.0)"); `time.ts` `shownYear` (the spring-is-next-year rule, exported from api.ts as package A asked); api.ts exports `eventRiver`, `isRiverEvent`, deal helpers, `askingFor`, `answersOf`, `councilLever`. Buses that meet the trains now cites `transport-health-access` (Making the Connections, Social Exclusion Unit, 2003, flagged as a rough guess to check) for its Health lift, and `transport-labour` says plainly it is a rough guess with evidence still to find, with a licence line instead of nothing.
Stub meanwhile: n/a.

## [cy fix3] The board's tab title still says "De Ddwyrain"  (for the shell owner)  (done at the join)
File: model/i18n/cy/shell.json `doc.bwrdd`. Need: "Y bwrdd: De-ddwyrain Cymru. Etifeddiaeth" (playtest 10, should-fix 10; every board file now writes De-ddwyrain). "Heddiw" and "Yfory" on the title time line are the shell's names for the atlas and the first game (`nav.heddiw`, `nav.yfory`), not board copy, so the Welsh pass left them.

## [cy fix3] Pill's Welsh name  (for the owner of model/authorities.yaml)  (closed at the join: kept in cymraeg.ts `WELSH_FORM`; authorities.yaml is shared with the v1 atlas, and a Welsh place name there needs a source, so it is a data task)
Need: Newport's town `{ en: Pill, cy: Pill }` to read `cy: Pil`, so a Welsh line can say "ym Mhil" (playtest 10, should-fix 10). Until then src/board/ui/cymraeg.ts writes Pill as Pil in every Welsh board sentence (`WELSH_FORM`); after the change that map can go.

## [cy fix3] "Free short courses" costs a coin  (for the content owner, English)  (done at the join: "Free short courses for learners")
model/board/events.yaml, the `short-courses` answer: the name says free and the card says 1 coin (cymraeg `g1-35.png`). The Welsh now reads "Cyrsiau byr am ddim i ddysgwyr" (free to learners). The English could say "Free short courses for learners".

## [cy fix3] Notice: the Welsh pass, fix round 3  (for the coordinator and every package)  (read at the join; the deal keys changed with the English)
- cymraeg.ts: a project name that opens with a verb-noun ("Cefnogi cwmnïau lleol") is lower case mid-sentence; a name that opens with a noun keeps its capital. A new project's first word must be added to `VERB_FIRST` or to the test's `NOUN_FIRST`, or cymraeg.test.ts fails. A {group} is lower case mid-sentence; "yma'n {mood}" softens as "yn" does; "i godi {measure}" joins the article.
- The deal Welsh follows package C's English as it stands ("Dechreuwch brosiect newydd", "Dim ond prosiect a ddechreuwyd ar ôl y fargen hon"). If C drops "started after" (D fix3 entry above), the Welsh keys `deal.must`, `deal.mustNew`, `deal.yourOld`, `build.dealUpgrade` need the same change.
- design/scripts/board-cy-lib.mjs (used by tests/e2e/board-cy.spec.ts) also flags "yn Pill", "De Ddwyrain", a verb-noun name with a capital after a verb, and "Swydd Gaerloyw'r De".

## [14] Shared content still names the valleys branch's projects  (for package 17, content)  (done at the A1 join for pairs, event sizes and preparations and places: scripts/board/other-boards.ts leaves out a line naming another board's project, tested in assemble.test.ts; what is left is the two [A1 join] entries below)
File: model/board/pairs.yaml, model/board/events.yaml (owner: package 17)
Need: the valleys branch and its projects now live in model/board/boards/southeast/branch.yaml (ADR 0009). Shared files still name them: pairs.yaml (`station-quarter`, `buses-meet-trains`) and events.yaml (`buses-meet-trains` in `prepared_by` and `size`). A board without that branch (All Wales) fails the cross check until those lines move to the South East's folder (a board `events.yaml` replaces a shared event by id) or name shared projects. A test build of the 22 councils with the South East's branch and starts passes strict; without them it fails on exactly these.
Stub meanwhile: none needed; the South East builds.

## [14] boards/wales/ not created  (for package 15, data; notice for 17)  (carried: packages 15 and 17 own it in the next step of Stage A; nothing in A1 builds it. The two [A1 join] entries below are the content blockers; steps to add a board are in ADR 0009 "Adding a board")
File: model/board/boards/wales/board.yaml, model/board/game.yaml `boards:` (owner: package 15 for board.yaml, 14 for game.yaml)
Need: a 22 council board.yaml (`areas: { core: [city], edge: [rural, valley] }`, five `map_groups` with explicit councils: authorities.yaml has no north west and north east split, and `stubs` for England). It does not build cleanly yet: it needs a first branch and starts (package 17) and the entry above. The data half builds for 22 councils today, but board-commute.json covers the South East only (48 commute links in a test build). Add `wales` first in game.yaml `boards:` when it builds strict; it then becomes the default (`public/board-model.json`).
Stub meanwhile: none.

## [14] Notice: boards, areas, saves and run codes  (for the coordinator and every package)  (read at the A1 join; the e2e specs now take the board's prefix from tests/e2e/board-key.ts, and board.spec expects `b3.` codes)
- A board is a folder, model/board/boards/<id>/ (ADR 0009): board.yaml (name, councils, areas, map_groups, stubs, optional stops), branch.yaml (the first branch and its projects), starts.yaml and events.yaml (add to or replace shared entries by id), words.yaml (rename text fields by section and id). game.yaml lost `region` and `councils` and gained `boards: [southeast]`; links.yaml lost `stubs`; model/board/starts.yaml moved to the South East's folder (a shared starts.yaml is still read if written). Places stay shared: a board takes every place whose council it holds.
- Shared conditions name areas: `area: edge` and `area: core` replace `flag: valley` and `flag: city` in endings, starts, chapters and the bot marks (`inArea` in engine/areas.ts; `flagged` is gone). `area` was chosen over the design's `group`, which already means a group of people. There is no `kind: area` project or event condition yet (it needs a line in src/board/ui/blockers.ts and boardui words); ask package 14 or 16 when events are retargeted. Laws and projects still use flags, which mean real features.
- Compiled `game` adds `board`, `areas`, `map_groups`; `region` is the board's name. Build output: public/board-model.<id>.json per board, public/board-model.json for the default board, public/boards.json for the picker (`loadBoardIndex`, `loadBoardModel(boardId?)`, `boardModelUrl`).
- Saves: `game.save_key` is now "etifeddiaeth.board.v2.southeast." (prefix plus board id). src/board/ui/saves.ts moves keys saved before boards under it when createGame runs (one line added to game.ts), and drops the old run code. Run codes are `b3.` with the board id; `BoardState.board`; `api.runBoard(code)` says which board to load. The e2e specs and design scripts that set `etifeddiaeth.board.v2.<name>` keep working through the move, but should use the board's prefix (package 19).
- Tests that read public/board-model.json mean the South East: when All Wales becomes the default they should read public/board-model.southeast.json.
- Two fixture boards: `boardFixture()` (id `fixture`) and `boardFixtureTwo()` (engine/fixture-two.ts, id `fixture-two`, two councils and two map groups). engine/boards.test.ts plays both; scripts/board/assemble.test.ts builds and plays a four council board from a folder over the real shared content.

## [P13] Notice: the needs-you outline and Fast by default  (for the coordinator and packages 14, 18 and 19)  (read at the A1 join; (3) done: the five older specs import `BOARD_KEY` from tests/e2e/board-key.ts and no longer set the dead `speed` pref; (1) stands for packages 18 and 19)
File: src/board/ui/clock/ (waiting.ts, pulse.ts, needsDom.ts, NeedsYou.tsx, needs.css), model/board/game.yaml `default_speed`
Need: none to build; three things to keep. (1) Each screen marks its own needs-you target with a data attribute, read by clock/needsDom.ts: `data-needs="answers|deals|visit|carry-on|play|next"`, `data-needs-close="<reading>"` on a sheet whose first `.btn-close` is its Close, and `data-needs-card` on a card whose `aria-labelledby` heading takes the focus. P13 added them (attributes only) to Respond, DealChoice, StopCard, TermReport, WarningSlip, WhyPanel, TreeSheet, LawsSheet, BuildMenu, clock/Settings, clock/Clock and place/ (index, LightPlace, Rhondda). A new card, sheet or place visit (package 18: group strip, election by group; package 19: new places) must carry the same marks, or clock/waiting.test.ts still passes but tests/e2e/board-needs.spec.ts finds no outline. (2) The speed is no longer a saved setting: `Prefs.speed` is gone, prefs.ts `startSpeed(model)` reads `default_speed`, and an old save's `speed` is ignored, so Fast reaches returning players too. (3) Package 14's save key now carries the board id (`etifeddiaeth.board.v2.southeast.`); the older e2e specs hard-code `etifeddiaeth.board.v2.` (board.spec, board-fix3, board-lane, board-cy, board-map-fit), so their prefs and guide settings no longer apply. board-needs.spec.ts reads the key from board-model.json; package 19 could do the same in the others.
Stub meanwhile: n/a. The two screen timings (8 seconds idle, `IDLE_MS` in clock/waiting.ts; the pulse in clock/pulse.ts `NEEDS_PULSE`) are UI constants with one home each; they could move to game.yaml if Luke wants to tune them as data.

## [A1 join] The ending The joined-up valleys names the South East's keystone  (for package 16, engine; then 17, content)  (open)
File: model/board/endings.yaml `joined-up-valleys` (`{ kind: keystone, project: work-up-the-line }`), src/board/engine/end-conditions.ts and endings.ts (owner: 16 for the condition, 17 for the file)
Need: the 12 endings and their conditions are the same on every board (v3-wales.md section 1), but this one names a project only the South East's branch has. A board with its own branch fails strict on `endings[1].when[0]: unknown project work-up-the-line` (seen at the join with a throwaway Gwent board). Suggest a keystone condition by branch, `{ kind: keystone, branch: first }` read through `model.branches[0]` (the board's branch is always first, ADR 0009), in the end condition, the ending's route and evidence (endings.ts lines 77, 113, 297, 326) and the cross check; then endings.yaml uses it and each board's words.yaml names the ending ("The joined-up north").
Stub meanwhile: none; the South East builds.

## [A1 join] Four outside events keep one preparer on a board without the valleys branch  (for package 17, content; notice for 16)  (open)
File: model/board/events.yaml (owner: package 17)
Need: fairness rule 3 wants two tier 1 projects that cut each outside event. `hot-summer`, `work-changes`, `rents-rise` and `fuel-jump` count `buses-meet-trains` as one of their two (`fuel-jump` also `frequent-trains`), so on a board without them the build leaves those names out (other-boards.ts) and strict fails on fairness. Either add a shared tier 1 preparer to each (a balance change: run the bot table), or give each board's branch the job (a board-side way for a board project to prepare for a shared event, so the South East's lines move to its folder without copying the events; ask package 14's successor, the build is in scripts/board/).
Stub meanwhile: none; the South East builds.

## [A1 join] Notice: what the join changed  (for the coordinator and packages 15 to 19)  (read)
- A card offering a place visit is a choice: the outline goes round Go and visit with Carry on (`data-needs="visit-offer"` on StopCard's `.bw-stop-choose`, `{ kind: "answers", of: "visit" }` in clock/waiting.ts). Before, it went round Carry on alone and its tab covered Go and visit.
- The outline's tab never covers a card's words: it sits above its target in room the card leaves (`.bw-stop-row` margin, `ul[data-needs="answers"|"deals"]` margin in clock/needs.css), or inside a wide bar at its right (the term report's Carry on). A new card or group of choices (packages 18, 19) leaves about 24 pixels above its target.
- Shared content that names another board's project is left out on boards without it (scripts/board/other-boards.ts); see the two [A1 join] entries above for what that does not cover.
- E2e specs take the board's save prefix from tests/e2e/board-key.ts (`BOARD_KEY`), never a written key.
- design/scripts/board-needs-play.mjs plays a game as a first-time player at the default speed, following the outline, and checks every held moment (one outline, its tab, its one target, not covered); board-needs-shots.mjs shoots each kind of moment at two sizes. The round-named scripts of packages 13 and 14 are folded into these two.
- Council flags have one home, `COUNCIL_FLAGS` in engine/types-model.ts, read by the shape check and the build.
- model/i18n/{en,cy}/boardui.json were found rewritten at 17:09 with text from before fix rounds 2 and 3 ("carreg glo", "{event} is warned for {council}", old guide keys), by no package of this run. The join restored both from the last commit; the stale copies are kept outside the project for the coordinator.
