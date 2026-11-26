# WalesSim: vision and build plan

*Working name. Draft 1, 26 November 2026. For discussion, nothing here is settled until it moves to `docs/adr/`.*

---

## 1. The idea in one paragraph

Karpathy's "USA Civ" (26 Nov 2026) poured 31 public datasets onto a 25 km hex map of the US and translated them into game language: Gold is GDP, districts are real industry specialisms, citizens are the real workforce. It is great to browse but, in his words, not yet a game. We want the Welsh version, and we want it to be a game: real open data for the present, the industrial past as the story of how we got here, and the future as something you play with, scored against the Well-being of Future Generations Act rather than conquest. It doubles as a policy tool: try an idea, watch the system respond, and always be able to see (and argue with) the relationships underneath.

---

## 2. Why not just "Civ for Wales"

Borrow Civ's legibility (one map, readable yields, lenses, advisors, "one more turn"), not its game.

- **Civ cannot say "enough".** It is a 4X game: every yield is good and more is better. The Well-being of Future Generations Act is about balance across seven goals and not robbing the future.
- **Civ has no liabilities.** Nothing you build leaves a debt. Wales's story is the opposite: wealth extracted, costs left behind (coal tips, mine water, contaminated land, depopulation). A Civ skin would show Copperopolis as a triumph and stop there.
- **Civ has one all-powerful ruler.** Welsh policy is devolved, partial and collaborative, and the five ways of working are about *how* you decide.
- **Scale.** At Karpathy's 25 km hexes Wales is about 38 tiles. We need roughly 5 km cells, or real places.
- **We already have what his build lacks: causal models.** His is a data atlas in costume. Ours can actually respond when you act.

So the core metaphor is **inheritance, not empire. You do not rule Wales, you hold it for a while and hand it on.**

---

## 2a. Current direction (26 Nov 2026, after Luke's answers and Fable's second review)

This wins where it disagrees with section 3, which is kept as the first draft.

- **Ruler plus steward.** You rule term by term; every 25 years the next generation judges what you left (the letter). A **Trust** measure pushes back and limits what you can do next term. A short voice from a real place every term, so feedback is not only every 25 years. "Term" stays neutral: Senedd terms are four years from 2026.
- **Roles change with the era.** In Ddoe you play whoever held the power then (estates, ironmasters and coal owners, lodge and chapel, Westminster); from 1999 the Senedd. Same few verbs in every era (place, fund, bargain, defer); only the seat and whose interests you are scored on change. Some chapters put you in two opposed seats.
- **Long span, variable turns.** Ddoe chapters of 20 to 40 years, selectable on their own; Yfory in terms to 2100, three generations with their own character (repair, adaptation, living with what was chosen). The 15-minute run (2025 to 2050) is the default first game.
- **Past on rails:** decide then reveal (every option defensible at the time; reward is seeing the legacy, not matching history), play in the margins, watch the inheritance build up on the map. Lessons upgrade cards everyone has; they never lock essential cards. Aberfan, Senghenydd and Tryweryn are memorialised, never played.
- **Real places, zoom as gameplay.** Wales decides what and how much; regions decide where; places decide how. Attention is scarce (one or two place visits per term; elsewhere resolves at an adequate default). Zooming reveals what averages hide. Place results go up as delivery grades and pips, never summed into national numbers. Plan for four to six authored places standing for types of Wales (coal valley, slate town, port city, seaside resort, market town, upland farming), the second one in the north.
- **Look:** one paper world (Papur, a layered cut-paper relief), with railway-ticket cards and carthen weave trim. Time shows in the material: Ddoe on aged, sooty paper with engraved ink; Heddiw clean paper; Yfory's player-made changes stitched on in carthen thread. Real is paper, your choices are thread.
- **No false precision:** costs and delays in pips, not pounds, unless sourced.
- **Solo first;** deterministic engine and serialisable state so multiplayer rooms can come later.
- **Data licence lesson:** the official disused coal tips register is personal-use only. Permission is needed before the game can use it; until then open proxies (BGS landslide records, OSM) are labelled as such.

## 3. First-draft concept: Etifeddiaeth (Inheritance)

*Developed with Fable as design consultant. Two alternatives are at the end of this section.*

### 3.1 The pitch

You play a relay of generations looking after Wales. Each turn is one generation (25 years). You open what you were left (assets, debts, promises), play a few policy cards, face a curveball from the real horizon scan, watch the consequences run, and hand on. The next turn opens with **a letter from the generation you left things to**, written from the state of the world: grateful, resigned or furious.

### 3.2 Ddoe, Heddiw, Yfory (past, present, future)

| Mode | What it is | Why it matters |
|---|---|---|
| **Ddoe** (yesterday) 1780 to 2025 | A guided rewind on rails, four quick turns. You do not change history; you watch the stocks pile up: coal and copper out, wealth out, tips and mine water in, chapels and Welsh speakers up then down, pride, skill and community built. | It is the tutorial, and it explains *why* the present looks as it does. It always lands on the real assessed baseline. |
| **Heddiw** (today) 2025 | The real open-data Wales, explorable. This is the Karpathy layer: lenses, place views, an explorer table linked to the map. | Useful on its own as an atlas, and it is the honest starting state for play. |
| **Yfory** (tomorrow) 2025 to 2100 | The game: three generations of play. | Where policy ideas get tested. |

### 3.3 Scoring: no single number

- Seven strands, one per well-being goal, shown for each generation.
- **Your result is the worst-off generation, not the average.** You cannot win by front-loading or by asking the present to carry everything. This is intergenerational fairness turned into a rule.
- Default weighting is equal; players can reweight, and the weights are always shown.

### 3.4 Look: the carthen

Wales drawn as a **woven Welsh blanket (carthen)** laid over the real geography. Each cell of the map is a woven square whose pattern is generated from its data: thread colours for the seven goals, weave density for population, frayed or missing threads for degraded nature, dark slub threads for legacy liabilities. Palette from the land: slate grey, bracken rust, moss, heather, sea teal. It is all geometry, so it is pure code art (no 3D pipeline, no artists needed for v1), it looks like nothing else, and a woven grid suits square data cells better than hexes do.

My addition to Fable's idea: keep the real map underneath at about 5 km cells (roughly 850 squares) so the Heddiw atlas works, then group cells into 8 to 12 regions for play in the first version.

### 3.5 Systems ideas as mechanics

| Systems idea | In the game |
|---|---|
| Legacy stocks | Liabilities are tokens on the cloth with a clock. A coal tip costs upkeep every turn, its failure risk rises with rainfall, it takes two generations to remediate. Your own choices can mint new ones (a sea wall you must maintain forever). |
| Delays | An "in the post" rail under the map. Plant woodland now and the card slides two turns along before it pays out. |
| Feedback loops | When a loop is active it is named and drawn as a ring on the cloth ("young people leave, school closes, more leave"). Breaking a vicious loop is the big satisfying moment. |
| Trade-offs | Every card shows on its face which strands it tightens and which it frays. No card is free. |
| Fairness | Borrowing cards help now and put a debt in the next generation's opening hand. The letter mentions it by name. |
| Uncertainty | Each turn runs many times across the evidence range of each link. The weave shows sharp (robust) or blurred ("depends what you believe"). |
| Curveballs | One trend card per turn from Gorwel's 29 trends, with ripples to linked trends, as in the futures card game. Foresight cards let you peek, at a price. |
| Five ways of working | Collaborating across regions or investing in prevention costs more now and unlocks cheaper, stronger options later. |
| Contested rules | Every link has an evidence badge: assessed in SoNaRR, published evidence, expert judgement, or placeholder. A "what if this is wrong?" button flips or weakens one link and replays, showing whether your strategy survives. |

**Pull the thread:** tap any change on the cloth and trace the causal chain back to the card that caused it, with the source on each link. That is the transparency feature, and it is also the fun.

### 3.6 Accessible and deep

- **Ten-minute player:** three future turns on cards alone, drawer shut. If the fun only starts when you open the parameters, we have failed.
- **Workshop:** an optional challenge layer (from the alternative "Dadl" concept): spend a token to dispute a link, set it to its contested range, rerun. If the outcome flips, the challenger has found a decisive uncertainty.
- **Analyst:** open the loom (model view), edit link strengths, save a rule set, compare runs. A visible badge says "you are playing a modified rule set".

### 3.7 Minimum playable slice

- Wales as 8 to 12 woven regions over the real map. Future mode only, three turns.
- About 20 policy cards and 12 curveballs; hand of five, three plays a turn.
- Engine: the existing SoNaRR FCM for direction and strength of pushes, plus five explicit stocks with real delays (peat carbon, coal tip liability, housing, Welsh speakers, woodland maturity).
- Seven strands, pull the thread, the generated letter, the worst-generation result.
- Rules drawer with sources; bilingual from the first commit.

**Later:** playable Ddoe, the Heddiw atlas in full, 22 authorities and finer grid, regional input-output, a valley zoom, multiplayer workshop rooms, shared rule sets.

### 3.8 Honesty points designed in

- **FCM iterations are not years.** The fuzzy map says which way and how hard things push each turn; explicit stocks carry time. The clock never comes from the FCM.
- **2022 input-output tables say nothing reliable about 2075.** Use them for near-term ripples (jobs and supply chain of a spend) and label them so.
- No decimals, pounds or tonnes in the headline view unless properly sourced. Bands and directions.
- Cards are generic policy levers, never party positions or named current schemes.
- Industrial legacy includes pride, skill, community and culture as inherited *assets*, not only scars.
- North, rural west and borders need their own stories and cards, not just the south Wales valleys.
- Clear about whose model it is: a personal prototype, not an NRW or Welsh Government view, unless that changes.

### 3.9 Alternatives considered

- **Cwm (The Valley):** one composite valley in cross-section, upland peat to estuary port, linocut / railway-poster style; what you do upstream arrives downstream two turns later. Lovely for schools, but sidesteps national questions and leaves the rural north and west out. **Best kept as a later zoom level** inside Etifeddiaeth.
- **Dadl (The Debate):** the causal map is the board; players challenge each other's links. Superb for facilitated workshops, poor for a lone player, weak on past and present. **Folded in as the optional challenge layer.**
- **Closer to Karpathy (Civ-style atlas):** fastest to impressive screenshots, but it is the thing he said is not yet a game, and its grammar fights the Act. **Its best part survives as Heddiw.**

---

## 4. What we already have (reuse, do not rebuild)

| Asset | Where | What it gives the game |
|---|---|---|
| SoNaRR 2025 DPSIR causal model | `../WALES/prototype` (FCM engine, 42 nodes, 162 links, tested) | The nature layer: pressures, ecosystem condition, services. Already anchored to SoNaRR's baseline, already has per-link confidence and editable priors. |
| Wales input-output tables 2022 | `../Wales-Systems/data` + recon note | The economy layer: 58 industries, multipliers, jobs per sector, tourism spend. Lets a policy ripple through supply chains honestly. |
| Gorwel horizon scan | `../Hwb-Dyfodol-Scanner` (29 trends, causal links, well-being goal tags, sourced headline stats) | The futures layer: trends become slow-moving pressures and curveball events. |
| FTR trend cards, futures card game | `../FTR`, `../FutureCardsHwb` | Event card content and the pathway / curveball / ripple vocabulary. |
| No Surprises, Futureproof | `../foresight-games`, `../futureproof` | Proven patterns: content in a Google Sheet round-tripped to JSON, single design token file, Playwright + axe tests, own Firebase site. |

---

## 5. Technical approach

### 5.1 Web is the right platform

Yes. The whole simulation is small: Wales at a 5 km hex is about 1,000 cells, at 3 km about 2,700. That is trivial for a browser, even on a school Chromebook. Karpathy's is web for the same reason. A static site means no server to run, a link anyone can open in a workshop, and nothing to install. We compile (Vite + TypeScript build), we do not need a native app.

### 5.2 Stack (recommended)

- **TypeScript + Vite**, a light UI layer (Svelte or Preact; decided by ADR in the skeleton phase).
- **Map**: Canvas/WebGL via PixiJS for the hex map with code-generated stylised textures; d3-geo for projection. No 3D pipeline.
- **Engine**: pure TypeScript, no DOM, deterministic with a seeded random number generator, runs in a Web Worker. Unit-tested headless with Vitest.
- **Data pipeline**: Python scripts, one per source, run offline. Output is committed, compact files the browser loads. The browser never calls a government API at play time.
- **Hosting**: Firebase Hosting, its own site on `d3-showcase-apps` (for example `walessim.web.app`). Its own site means its own browser storage origin, so it cannot collide with any other app. Firestore only later, for shared scenarios and workshop rooms.
- **Tests**: Vitest (engine and rules), Playwright with an axe accessibility scan on every screen.

### 5.3 Three layers, kept apart

```
data/      what Wales IS (facts, with a source card each)      -> changed by re-running the pipeline
model/     how Wales WORKS (rules, parameters, as YAML)          -> changed by editing a file or a sheet, never code
src/       the machinery (engine that runs any rules, the UI)    -> changed by developers
```

This split is the answer to "make it easy to find where to change the logic". Nobody should need to read TypeScript to change a relationship.

### 5.4 Rules as data: every relationship is a card

Each relationship lives in one YAML file, one rule per entry, like this:

```yaml
id: peat-restoration-carbon
name: { en: "Restored peat stores carbon", cy: "Mae mawn wedi'i adfer yn storio carbon" }
layer: nature
equation: carbon_flux = -restored_peat_ha * sequestration_rate
parameters:
  sequestration_rate:
    default: 3.5
    range: [1.0, 6.0]
    unit: tCO2e/ha/yr
    user_adjustable: true
sources: [nrw-peat-2023, ipcc-wetlands-2014]
confidence: medium          # high / medium / low, SoNaRR-style
contested: true            # shows the "argued about" marker in the game
notes: { en: "...", cy: "..." }
reviewed: { by: "", on: "" }
```

From these files we generate three things automatically: the engine's compiled model, the in-game **Model Inspector** (click any number, see the rule, the equation, the source and the confidence, move the sliders), and a public **Model Book** web page. One source of truth, three views, so documentation can never drift from behaviour. A test fails if a rule has no source, no Welsh name, or a parameter outside its range.

For people who do not use git, the rules round-trip through a Google Sheet (the pattern already working in No Surprises): export to tabs, edit, import, the importer refuses a broken model.

### 5.5 Bilingual from day one

- Every user-facing string is a key: `i18n/en.json` and `i18n/cy.json`. No literal text in components.
- Every piece of content carries `{ en, cy }` fields (rules, events, place names, advisors).
- A test fails if a key exists in one language and not the other. Missing Welsh shows the English with a quiet marker, so gaps are visible rather than hidden.
- Place names come from the Welsh Language Commissioner's list of standardised Welsh place-names, not machine translation.
- Machine translation is acceptable for drafts only; a fluent reviewer signs off before anything public. Plan a budget line or a partner for this.
- Language switch is instant and remembered; the URL carries it so a shared scenario opens in the sender's language.

### 5.6 Transparency as a feature, not an appendix

- Every number on screen is clickable down to its rule and source.
- Every relationship shows a confidence marker (from SoNaRR's own confidence where it exists).
- An "uncertainty" view: run the same scenario across the parameter ranges and show a band, never a single line.
- Every scenario exports as a link and as JSON listing exactly which parameters were changed from default, so two people arguing can see precisely where they differ.
- The front page says plainly: a thinking tool, not a forecast.

---

## 6. How we build it

### 6.1 Yes, spec it first, but briefly and by talking

The risk on this project is not code, it is building 45,000 lines of the wrong game. So the order is: agree the concept, spec it by interview, test the fun with a throwaway, then build with many agents in parallel.

The Matt Pocock style skills installed here fit that order well:

| Step | Skill | Output |
|---|---|---|
| 1. Stress-test the concept | `grilling` | Decisions on scope, audience, time span, scoring |
| 2. Fix the language | `domain-modeling` | `GLOSSARY.md` (EN and CY terms) and first ADRs |
| 3. Is it fun? | `prototype` | A throwaway one-page core loop, played by real people |
| 4. What data exists | `research` (parallel agents, one per theme) | `docs/data/*.md` source cards: licence, resolution, year, URL |
| 5. Engine first | `tdd` | Engine and rule loader with face-validity tests |
| 6. Module design | `codebase-design` | Clean seams between data, model, engine, UI |
| 7. Review | `code-review` | Standards and spec checks per phase |

### 6.2 Phases

| Phase | What | Done when |
|---|---|---|
| 0. Concept | This document, the concept choice | You pick a concept |
| 1. Spec | Grilling session, glossary, ADRs, `docs/spec.md` | Spec agreed |
| 2. Recon and prototype (parallel) | Data recon agents by theme; throwaway core-loop prototype | We know the data exists at the grain we need, and the loop is fun on paper or screen |
| 3. Walking skeleton | Repo, hex grid of Wales, i18n, rule loader, inspector, one rule end to end, deployed | A live URL where one real relationship works in both languages |
| 4. Orchestrated build | Parallel agent workflow: data pipelines per source, engine modules (nature, economy, people, history), map renderer, UI panels, content and events, each with tests and a review pass | The minimum playable slice, live |
| 5. Truth and play | Playtests, a small model review panel, Welsh language review | Changes logged as ADRs and rule edits |

Phase 4 is where we "orchestrate as many agents as we need". It goes better once the skeleton fixes the seams, because parallel agents then build against agreed interfaces instead of guessing.

---

## 7. Decisions needed from you now

See the questions at the end of the chat. Everything else can be decided in the Phase 1 grilling session.
