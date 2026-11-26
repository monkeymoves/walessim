# The engine

Pure TypeScript simulation of Yfory short mode (docs/design/game-design.md). No DOM, no framework,
no `Math.random`: every draw comes from the game seed (`rng.ts`). Same model, seed and decisions give
the same game. The UI imports only `api.ts`, which documents every type and function.

## Modules

| File | What it does |
|---|---|
| `api.ts` | The public contract: types, the step machine's actions, `newGame`, `dispatch`, `preview`, `resolve`, `pullThread`, save and load. Thin wrappers over `game.ts`. |
| `game.ts` | State and the seven steps of a term, budget, hand, plays and validation, visits, shocks, building each term's input, resolving across the ensemble, Trust and the caretaker, slips, voices, the end result and letter, save and load, the model book equations. |
| `sim.ts` | One uncertainty run through one term: deliveries (card, trend and shock effects), baseline rules, threshold events, chained rules, stocks, the FCM nature step, the jobs ripple. Run 0 records contributions for traces. |
| `scores.ts` | Model context (indexes built once per model), reference bands, starting scores, Wales aggregates (population weighted, unweighted, heartland, gap), strand scores, pips with hysteresis. |
| `fcm.ts` | The SoNaRR Fuzzy Cognitive Map, ported from `WALES/prototype/fcm.js` (sparse, with per-run edge noise). |
| `schedule.ts` | Curveball schedule from the seed: which trend is revealed and which shock lands each term, with ripples. |
| `deck.ts` | Shuffling and dealing with the three deal constraints. |
| `places.ts` | Grading the Rhondda (exposure, fairness, lifelines) and Bethesda (Aros, Iaith, Pwysau across runs). |
| `trust.ts` | Everything that moves Trust, bands, card limit. |
| `voices.ts` | Choosing and filling voice templates; the letter from 2050. |
| `caretaker.ts` | The caretaker's plays (also the caretaker bot and the end-screen ghost). |
| `bots.ts` | Bot players for balance; `scripts/balance.ts` runs them over many seeds. |
| `place-analysis.ts` | Owned by the map agent: what lies below a tip. The build uses it to compute tip facts. |

## How a term resolves

1. `open`: the term's trend is revealed, the hand dealt, upkeep and budget worked out (8 pips, minus
   interest, return penalty, curveball hits, upkeep; plus 1 carried pip).
2. `pledge` (terms 2 to 6): the strand with the lowest pips is offered.
3. `commit`: plays are validated (hand, card limit from Trust, regions, cost), recorded, and the hand
   goes to the bottom of the deck. A trigger card offers a place visit.
4. `visit`: the board is graded; the grade multiplies the trigger card's effects in that type of place
   (0.6, 1.0, 1.3) and a well-graded visit counts as partners.
5. `respond`: the shock (if any) lands with the chosen response. Then the term input is built once
   (cards in the post, this term's plays, slow trends, the shock, upkeep lapses, standing tickets, the
   jobs ripple) and every run steps through it with its own sampled parameters (`sim.ts`, order in the
   file header). Strand medians, sharp or fuzzy, pips with hysteresis, Trust, slips and the voice follow.
6. `continue`, `next`: the election sets next term's card limit or starts a caretaker term.

After six terms `finish` computes Lived (0.75 mean plus 0.25 worst term of weighted flow), Left
(weighted stocks in 2050 with cards in the post by 2058, minus debt), the result (the lower), the letter
archetype and named thing, and the caretaker ghost on the same seed.

## Traces

Run 0 (default parameters) records a `Contribution` for every change: component, cause (card,
curveball, shock, baseline rule, upkeep, threshold event, standing ticket, caretaker), rule, and the
change per authority. Chained rules split their output by the causes of their input, so a pay rise
from skills traces back to the skills card. `pullThread` sums contributions into a strand and returns
stops strand, component, cause, place, rule. A test fails if any strand change of a quarter pip or
more has no thread, or if threads explain too little of it.

## How to add a rule

1. Write it in a `model/rules/*.yaml` file using a fixed kind (ADR 0002): `id`, `name`, `note`,
   `kind`, `inputs`, `outputs`, `lag`, `params` (default, min, max, unit, adjustable), `sources`
   (ids in `model/sources.yaml` or `model/sources-extra.yaml`), `confidence`, `evidence`, `placeholder`.
2. Pick the behaviour by fields, not code:
   - `linear` with `drive: clock` (every term), `drive: card` (cards name the rule in an effect's
     `rule`, and the sampled `coef` scales them) or `drive: change` with `input` (outputs move by `coef`,
     or `coef_<output>`, times the input's change, after `change_lag` or `lag` terms);
   - `saturating` with `saturate: plays | ceiling | band_goal | repeat`;
   - `stock` with `stock: decay | clock | approach_fcm | accumulate | card | upkeep | debt`; any rule
     with an `ageing` parameter also wears its first output each term;
   - `threshold` with `event: tip_movement | heartland_drop | employer_leaves`;
   - `fcm` (effects with `fcm:<node>` targets) and `io` (the jobs ripple).
3. Name it from card or curveball effects (`rule: R36`) if it parameterises them.
4. `npm run model:build` validates it (unknown sources, components, out-of-range defaults fail).
   A genuinely new behaviour needs a new kind, which needs an ADR and a handler in `sim.ts`.

## Numbers

All tuning lives in `model/game.yaml` and rule parameters; changes are logged in
`docs/design/balance-log.md`. `npm test` runs a small balance-structure test; the full check is
`npx tsx scripts/balance.ts --seeds 200 --runs 30 --ceiling 5000`. Resolving one term with 200 runs
takes about 30 ms in Node; preview with 50 runs about 60 ms.
