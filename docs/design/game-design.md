# Etifeddiaeth (Inheritance): game design for v1

*Source of truth for the overnight build. Written 26 November 2026. Where this document and `docs/PLAN.md` disagree, this document wins for v1. All numbers marked (tune) are starting values for the engine agent to calibrate against the bot tests in section 11; all numbers marked (data) must come from the pipeline with a source card, never from this page.*

## 0. Fixed frame and vocabulary

| Term | Meaning in v1 |
|---|---|
| Heddiw | The atlas of Wales in 2026: 22 local authorities (LAs), lenses, LA panel, explorer table. Real data, a source on every figure. |
| Yfory short mode | The game. Six terms: 2026, 2030, 2034, 2038, 2042, 2046. Ends 2050. About 20 minutes. |
| Strand | One of seven well-being goals, shown as 10 pips. Ids: `prosperous`, `resilient`, `healthier`, `equal`, `cohesive`, `culture`, `global`. |
| Indicator | A measured quantity per LA (real in 2026, modelled after). Normalised to 0 to 10 against a reference band. |
| Stock | Something handed on that builds or drains slowly (nature condition, debt, Welsh speakers). Also 0 to 10. |
| Flow score | The part of a strand that says how people are faring now. Feeds **Lived**. Drawn as filled pips. |
| Stock score | The part of a strand that says what is being handed on. Feeds **Left**. Drawn as a stitched tick on the same pip row. |
| Pip | The only unit the player sees: strand pips (0 to 10), cost pips, delay pips (one pip is one term). |
| Trust | 0 to 100 internally, shown as a dial with four bands. |
| Thread | Anything the player caused. Real is paper, your choices are thread. |
| Region | North (Anglesey, Gwynedd, Conwy, Denbighshire, Flintshire, Wrexham); Mid (Powys, Ceredigion); South West (Pembrokeshire, Carmarthenshire, Swansea, Neath Port Talbot); South East (the other ten). |

Engine contract: pure, deterministic, seeded, state serialisable. One engine step is one term. Each resolution runs 200 times (tune) across parameter ranges; the player sees the median, marked sharp or fuzzy.

## 1. The 20-minute experience

### 1.1 Beat sheet

| Time | Beat | What the player sees and does | Feeling aimed for |
|---|---|---|---|
| 0:00 to 0:20 | Hook | No menu. The paper Wales of 2026 fades up. One line: "This is Wales in 2026. In 2050 someone will write to you about what you did with it." A sealed envelope sits at 2050 on the timeline. | Curiosity, a debt already owed |
| 0:20 to 1:00 | Touch the real thing | A pulse on the map invites a tap. Any LA opens its panel with three real figures and a source. One lens chip glows ("Welsh speakers"). A single button: "Take the seat, 2026". The atlas stays reachable all game. | "This is real, and it is mine to look after" |
| 1:00 to 3:30 | Term 1, guided | Hand of four cards, Trust allows three. Three stitched notes appear only when relevant: on first card hover ("left side costs now, right side pays later"), on first play ("it is in the post"), at resolution ("pull any thread to see why"). The slow trend is always `wet-decade` in the first game. No shock in term 1. | Competence within two minutes |
| 3:30 to 6:30 | Term 2 | Full hand of five. First pledge offered by the voice. The Rhondda asks for you (first game): the first place visit. First shock can land. | First real dilemma |
| 6:30 to 14:00 | Terms 3 to 5 | Full loop, about two and a half minutes each. Delayed cards arrive. Trust starts to bite. Debts ask to be paid. Bethesda asks for you by term 4 at the latest. | Juggling, consequences arriving |
| 14:00 to 16:30 | Term 6 | The envelope at 2050 is close. Slow cards will not pay in your time but still count for those who come after. | "Do I plant trees I will never sit under?" |
| 16:30 to 20:00 | 2050 | The envelope opens. The letter is read line by line, each line tied by thread to the thing it mentions. Then Lived and Left, the lower one outlined. Then "Wales under a caretaker" as a ghost comparison. | Judged, fairly, by a person |

### 1.2 Where the feelings come from

| Feeling | Mechanism |
|---|---|
| Tension | Trust limits cards; prevention shows nothing for terms; eight budget pips never cover the hand; contingency held back for a shock is money not spent; the lower-of rule means a good present can still lose. |
| Surprise | One unexpected change is surfaced every term (a side effect or ripple the player did not aim at). Shocks. A delayed card landing better or worse than its fuzzy forecast. A voice from a place you ignored. |
| Delight | Pulling a thread from a strand back through a rule to your own card. The "you were ready" stamp when an earlier card softens a shock. Stitched changes accumulating on the paper map. The letter naming a specific tip, a specific school, a specific debt. |
| Play again | Six letter archetypes, shown on the opening screen as envelopes ("letters received: 2 of 6"). Different seeds change curveball order and hands. The daily Wales seed. The other place visit you never mastered. Reweighting the strands. |

### 1.3 Heddiw in brief (scope guard)

- Lenses (one at a time, drawn on the 1 km cells, values at LA level): the 15 indicators in section 3.1. Every lens has a key, a year and a source line.
- LA panel: name in both languages, six headline figures, one sentence of sourced history, "Pull the thread" to the source card, confidence marker.
- Explorer table: 22 rows, sortable by any indicator, linked to the map both ways (hover a row, the LA lifts; tap an LA, the row scrolls into view).
- During Yfory the same lenses show modelled values, with thread-coloured hatching wherever a value has moved because of the player.

## 2. Term structure

### 2.1 Resources

| Resource | Rule |
|---|---|
| Budget | 8 pips per term (tune). Minus 1 per debt token (interest). Minus 1 in a return-from-caretaker term. Curveballs can remove 1 or 2. Unspent pips do not carry over, except 1 pip of unspent contingency. |
| Hand | 5 cards dealt from the 20 deck cards (4 in term 1). The player may hold over 1 unplayed card. Played and discarded cards go to the bottom of the deck. Deal constraints: at least 4 strands represented, at least one card costing 1, at least one card tagged as a response to an active trend. |
| Standing tickets | `borrow-to-invest` and `defer-maintenance` sit in a ledger drawer every term. They use no card slot. At most one standing ticket per term. |
| Card limit | Set by the Trust band at the end of the previous term: Strong 4, Fair 3, Thin 2 (section 4). |
| Repeat plays | A card played again within two terms of its last play delivers 60 per cent (saturating rule R30). |
| Contingency | Any pips left unspent when the player ends the planning step are held as contingency for this term's shock. |
| Peek | Once per term, pay 1 pip to turn over next term's curveball early. |

### 2.2 The seven steps of a term

| Step | Player sees | Player decides | Engine does |
|---|---|---|---|
| 1. Opening | Year turns. Cards arriving from the post rail land on the map as thread. Last term's voice fades; this term's trend card drops top left ("From the horizon scan"). Budget pips and card limit shown. | Nothing yet. | Applies arrivals. Draws the term's slow trend or schedules a shock (section 7). Deals the hand. |
| 2. Pledge (from term 2) | The opening voice asks for one thing, mapped to a strand ("Promise us the buses"). | Pledge that strand or decline. One tap. | Records the pledge. |
| 3. Plan | The hand as railway tickets. Each ticket face shows strands helped (solid chips), strands frayed (outline chips), cost pips, delay pips, "needs partners" if so. Hovering a ticket shows a ghost preview on the strand row, sharp or fuzzy. | Which cards to play, up to the card limit and budget. For regional cards, which region (map highlights the four). Whether to use a standing ticket. How much to hold back. | Validates. Computes previews from a 50-run quick pass. |
| 4. Place visit (optional, once per term) | If a played card can trigger a visit, the place pulses on the map: "The Rhondda is asking for you." | Go, or stay. If go: the place decision (section 8). | Records choices. Unvisited triggers resolve at adequate. |
| 5. The term passes | The timeline pin slides four years. Mid-slide, a shock may land: the map dims, the shock card flips. | Absorb (free), or respond by spending 1 or 2 contingency pips. If a prepared card is in play, the stamp "You were ready" appears and the hit is softened automatically. | Resolves the shock, then the whole term: cards, rules, stocks, SoNaRR nature step, jobs ripple, trends. 200 runs. |
| 6. What changed | Strand pips tick up or down one at a time; sharp changes snap, fuzzy ones settle with a soft edge. A stack of three "what changed" slips, the biggest two plus one marked "Unexpected". Each has "Pull the thread". The Trust dial moves, with its two biggest reasons listed. A voice from a real place. | Pull threads, or continue. | Picks the slips: largest absolute strand changes by cause, plus the largest change caused by a side effect or ripple. Picks the voice (section 9). |
| 7. Election | The Trust band stamps next term's card limit on the hand area. If Trust is below 20: "You have lost the seat." | Continue. | Sets card limit, or starts a caretaker term (section 4.4). |

### 2.3 Pull the thread (unchanged from the mockup, made exact)

A trace is a chain of four kinds of stop, each a clickable row: **Strand** (what moved, by how much, sharp or fuzzy), **Card or curveball** (what caused it, when it was played), **Place choices** (if a visit shaped delivery), **Rule and sources** (rule kind, parameter and range, confidence, source list). A red thread is drawn on the map from the strand chip through each stop. Every trace ends in the line: "The national strand moves in pips and bands. Place counts are not added up." Every strand change of a quarter pip or more must be traceable to at least one card, curveball or baseline pressure rule; a test fails otherwise.

## 3. Strands

### 3.1 The indicators (per LA, real 2026 values)

| Id | Indicator | Likely source (data agent to confirm) |
|---|---|---|
| `pop` | Population | ONS mid-year estimates |
| `age65` | Share aged 65 and over | ONS mid-year estimates |
| `young_adults` | Share aged 20 to 34 | ONS mid-year estimates |
| `welsh_speakers` | Share aged 3 and over able to speak Welsh | Census 2021 |
| `deprivation` | Share of small areas in the most deprived fifth | WIMD (latest open release) |
| `gva_head` | GVA per head | ONS regional accounts |
| `employment` | Employment rate, 16 to 64 | Annual Population Survey |
| `earnings` | Median weekly earnings, residents | ASHE |
| `affordability` | House price to earnings ratio | ONS affordability series |
| `life_exp` | Life expectancy at birth | ONS |
| `fuel_poverty` | Share of households in fuel poverty | Welsh Government modelled estimates; include only if LA values exist |
| `emissions_head` | Territorial emissions per person | DESNZ local authority emissions |
| `renewables` | Installed renewable capacity per person | Energy Generation in Wales |
| `woodland` | Woodland cover | National Forest Inventory |
| `flood_exposure` | Share of properties at flood risk | NRW flood risk data |

### 3.2 Normalising to 0 to 10

- Each indicator gets a **reference band**: a floor (0) and a goal (10). Score = 10 x (value minus floor) / (goal minus floor), clamped, inverted where lower is better.
- Goal: the Welsh national milestone or legal target where one exists (a million Welsh speakers by 2050; net zero by 2050), otherwise the best UK nation or region today.
- Floor: the worst UK nation or region today or the worst Welsh LA, whichever is worse, pushed out a further tenth of the band.
- Bands are stored in `model/bands.yaml` with a source each. They are fixed for the whole game.
- Acceptance check: with real data every 2026 strand flow score lands between 3 and 6. If one does not, change the band and record why. Never touch the data.
- Wales value of an indicator is the population-weighted mean of LA scores, except in `equal`, which is unweighted on purpose (every place counts once).

### 3.3 Strand composition

Flow score and stock score are each the plain mean of their components.

| Strand | Flow components (Lived) | Stock components (Left) | Expected 2026 flow pips |
|---|---|---|---|
| `prosperous` | `gva_head`, `employment`, `earnings` | `skills_stock`, `infrastructure_condition` | 4 |
| `resilient` | `flood_exposure` (inverted), `nature_services` (SoNaRR service nodes) | `nature_condition` (mean of the 11 SoNaRR ecosystem states), `woodland_stock`, `peat_condition` | 4 |
| `healthier` | `life_exp`, `fuel_poverty` (inverted), `care_pressure` (from `age65`, inverted) | `health_stock` (prevention built up) | 5 |
| `equal` | Gap between the five worst-off LAs and the Wales median on `earnings`, `employment`, `life_exp` (inverted); `deprivation` (inverted) | `early_years_stock`, `housing_stock` | 4 |
| `cohesive` | `affordability` (inverted), `young_adults`, `access` (services and transport reach, starts at band middle, placeholder) | `community_assets`, `tip_liability` (inverted) | 5 |
| `culture` | `welsh_speakers`, `heartland` (share of LAs above their 2021 speaker share) | `speakers_stock` (number of speakers and child transmission, against the 2050 milestone path) | 5 |
| `global` | `emissions_head` (inverted), `renewables` | `carbon_budget` (cumulative emissions 2026 to 2050 against a straight path to net zero), `peat_condition` | 4 |

### 3.4 Making a pip mean something

- Effect sizes on cards are in indicator points: **S = 0.5, M = 1.0, L = 2.0** on the 0 to 10 scale, in the LAs in scope (tune).
- Because a flow score averages about three indicators, a national M moves a strand about a third of a pip. **A pip is two well-aimed cards, or one large card with its partner.** That is the intended price.
- Displayed pips are whole numbers with hysteresis: a pip changes only when the underlying score crosses a half-point boundary by 0.1. No flicker.
- Baseline pressures (rules R01 to R05) pull against the player. With no cards played, by 2050: `resilient`, `healthier`, `cohesive`, `culture` each lose about 1 pip; `equal` loses half; `prosperous` is flat; `global` gains half (the grid decarbonises anyway). Standing still is losing.
- Regional cards act one size larger in their region than a national card of the same cost. The South East holds about half the people, so `equal` (unweighted) and the Trust fairness test are what stop "always play South East".

## 4. Trust

### 4.1 Bands

| Band | Range | Card limit next term | Dial label |
|---|---|---|---|
| Strong | 70 to 100 | 4 | "Trust: Strong" |
| Fair | 45 to 69 | 3 | "Trust: Fair" |
| Thin | 20 to 44 | 2 | "Trust: Thin" |
| Collapsed | below 20 | Caretaker term | "You have lost the seat" |

Start at 55. Net change per term is clamped to plus or minus 25.

### 4.2 What moves Trust (per term, tune)

| Cause | Change |
|---|---|
| Each flow pip gained on `prosperous`, `healthier`, `equal`, `cohesive`, `culture` | +4 (cap +12) |
| Each flow pip lost on any strand | -5 |
| A delayed card arrives as forecast ("promise kept") | +3 each (cap +6) |
| Pledge kept (pledged strand did not fall) | +5 |
| Pledge broken | -8 |
| Gap between the five worst-off LAs and the median narrowed | +5 |
| That gap widened | -6 |
| Shock: prepared ("you were ready") | +5 |
| Shock: responded with contingency | +3 |
| Shock: absorbed with a visible hit | -6 |
| Place visit graded well, adequately, poorly | +6, +2, -6 |
| A region received no card for two terms running | -4 per such region |
| Debt interest taken this term | -2 per token |
| Nothing visible happened (no pip up, no arrival) | -4 |
| Drift | Moves one tenth of the way back to 50 |

Design intent: visible short-term gains buy the room to do slow things. Prevention costs Trust now and repays it as "promise kept" later. Neglect of a region is noticed.

### 4.3 What the player sees

The dial, the band, the limit ("3 cards next term"), and after each term the two largest causes in words ("Pledge kept. The North went without again."). The points are never shown; the trace shows the causes.

### 4.4 The caretaker term

- Trigger: Trust below 20 at step 7. Cannot trigger in term 1 or straight after a caretaker term (Trust is floored at 20 in a return term).
- The term plays in about 30 seconds, with the header "From the opposition benches".
- The caretaker plays the two cheapest non-borrowing cards in the dealt hand, at national scope or in the most populous eligible region, makes no visit, holds 2 pips of contingency and always responds to a shock.
- The player makes one choice: a **shadow pledge** (a strand). If that strand does not fall, they return with +5.
- Return: Trust set to 40 (Thin, 2 cards), budget minus 1 for that term. The letter mentions the lost term.
- A caretaker term counts in Lived like any other. No game over.

## 5. Lived and Left

### 5.1 Computation

> **Superseded in part by `balance-decision.md` (decision 14).** The result is now judged as the change since 2026 in net strand pips, Lived counts terms 2 to 6, the worst-term rule is restated as a dip below the 2026 start, and the bands are -4, -1, +1, +4. The text below is the original and is kept for the record.

Let `w_s` be the strand weights (default one seventh each, player-adjustable before the game and on the end screen, always displayed). All values from the median run.

- **Term wellbeing** `W_t` = sum over strands of `w_s` x flow score at the end of term t.
- **Lived** = 0.75 x mean(`W_1` to `W_6`) + 0.25 x min(`W_1` to `W_6`). The worst term counts extra, so no single term's people can be sacrificed.
- **Left** = sum over strands of `w_s` x stock score in 2050, minus the debt penalty.
  - Cards still in the post in 2050 count in full if they arrive by 2058. Planting for strangers is rewarded.
  - Debt penalty: 0.5 per debt token outstanding, cap 1.5.
  - Unpaid liabilities (flood wall upkeep, deferred maintenance) already sit inside `infrastructure_condition`; they are not counted twice.
- **Result** = the lower of Lived and Left. Fuzzy edge = the 10th to 90th percentile range across runs.

| Result band | Range | EN name |
|---|---|---|
| 1 | below 3.0 | Diminished |
| 2 | 3.0 to 4.4 | Held, just |
| 3 | 4.5 to 5.9 | Handed on |
| 4 | 6.0 to 7.4 | Handed on better |
| 5 | 7.5 and over | A gift |

### 5.2 During play

Each strand row shows flow as filled pips and stock as a stitched tick on the same row. When the tick sits left of the filled pips the strand is living beyond its inheritance, and the tick turns rust. There is no running total anywhere on screen.

### 5.3 The end screen, in order

1. The letter (section 9), read with threads to the map.
2. Two woven bands side by side, **Lived** and **Left**, each ten squares long, built from seven strand colours. The shorter band is outlined and named: "Your result is the lower: Left, Held, just."
3. Beneath each band, the 2026 starting mark and a ghost mark for "Wales under a caretaker" (the caretaker bot on the same seed).
4. Six term columns showing `W_t`, so the worst term is visible.
5. The ledger: debts by name, liabilities minted, cards still in the post, place grades as stamps (poorly, adequately, well).
6. Buttons: Pull any thread, Change the weights (recomputes live, badge "your weights"), Play again, Today's Wales, Copy result (seven coloured squares for each band, no numbers).

## 6. The card deck

Twenty deck cards and two standing tickets. Effects use indicator and stock ids from section 3 and sizes S, M, L. "Delay" is terms before the main effect; lag on side effects is zero unless stated. Jobs ripple means rule R25 applies to the spend. Welsh titles are written by the content agent and reviewed by a fluent speaker. "Upgraded by" names the Ddoe lesson that will strengthen the card in v1.1; in v1 it is stored and shown greyed.

| Id | Title | Description | Scope | Cost | Delay | Effects | Side effects | Visit | Upgraded by (v1.1) |
|---|---|---|---|---|---|---|---|---|---|
| `restore-upland-peat` | Restore upland peat | Block the drains and re-wet the bog. | Region | 2 | 2 | `peat_condition` +M, `emissions_head` -S, `flood_exposure` -S downstream | `earnings` -S in region for one term (upland farm income) | None | Lesson of the drained uplands |
| `make-coal-tips-safe` | Make coal tips safe | Drain, regrade and monitor the tips above the valleys. | Region (SE or SW) | 4 | 1 | `tip_liability` -L, `access` +S, `life_exp` +S | The heaviest ticket: crowds out a whole hand. Jobs ripple is brief. | Rhondda | Coal: the tips stayed |
| `community-owned-energy` | Community-owned energy | Local turbines, hydro and solar, with the income staying put. | Region | 1 | 1 | `community_assets` +M, `renewables` +S, `earnings` +S | Needs partners: half strength without `regional-compact` or a well-graded visit. Slower than commercial build. | Bethesda | The miners' institutes |
| `welsh-medium-childcare` | Welsh-medium childcare | Free Welsh-medium places from age two. | National or region | 2 | 3 | `speakers_stock` +M, `welsh_speakers` +S, `early_years_stock` +S | `employment` -S for one term where staff are short; weaker without `skills-and-apprenticeships` | Bethesda | The Sunday schools |
| `warm-homes` | Warm homes | Insulate and re-heat the coldest homes first. | National | 3 | 2 | `fuel_poverty` -M, `emissions_head` -M, `health_stock` +S, jobs ripple (construction) | Half strength while `skills_stock` is below 4. Nothing visible for two terms. | None | The terraces: built fast, built cold |
| `build-social-homes` | Build social homes | Homes for rent that stay affordable. | Region | 3 | 1 | `housing_stock` +M, `affordability` +S, `young_adults` +S, jobs ripple | `nature_condition` -S (land take), `carbon_budget` -S (building) | None | Garden villages |
| `homes-for-locals` | Homes for locals | Limits on second homes and holiday lets where they crowd people out. | Region (North, Mid, SW) | 1 | 1 | `affordability` +S, `young_adults` +S, `heartland` +S | `gva_head` -S in region (visitor spend); Trust -3 that term in the region | Bethesda | Slate: the lockout and the terraces |
| `connect-buses-rail` | Buses and rail that connect | Frequent services that link valleys and villages to work. | Region | 3 | 1 | `access` +M, `employment` +S, `emissions_head` -S | Upkeep: 1 pip in each of the next two terms, or the effect lapses and a pledge counts as broken | Rhondda | The lines that closed |
| `skills-and-apprenticeships` | Skills and apprenticeships | Training tied to the work that is coming. | National | 2 | 2 | `skills_stock` +M, `earnings` +S | Without jobs to go to, `young_adults` -S in regions where `employment` is below band middle (they qualify and leave) | None | The tinplate and steel apprenticeships |
| `land-a-big-employer` | Land a big employer | Incentives to bring one large plant or office. | Region | 2 | 0 | `gva_head` +M, `employment` +M at once | `emissions_head` +S. Fragile: leaves if a trade or recession shock lands (rule R28). `earnings` rises only S. | None | The branch plants |
| `grid-and-big-renewables` | Grid and big renewables | New lines and large wind, on land and at sea. | Region (North, Mid, SW) | 3 | 2 | `renewables` +L, `emissions_head` -M, `gva_head` +S, jobs ripple | `nature_condition` -S; `community_assets` -S unless `community-owned-energy` has been played in that region | None | Water and power for elsewhere: consent first |
| `slow-the-flow` | Slow the flow | Leaky dams, wet woodland and room for rivers upstream. | Region | 2 | 2 | `flood_exposure` -M, `nature_condition` +S | Needs partners (land managers): half strength without them. Fuzzy by design. | Rhondda | The canalised rivers |
| `build-flood-walls` | Build flood walls | Hard defences where the homes are. | Region | 3 | 0 | `flood_exposure` -L at once | Mints a liability: 1 pip upkeep every second term, or `infrastructure_condition` -M. `nature_condition` -S. | None | The sea walls and the tidal harbours |
| `pay-farms-for-nature` | Pay farms for nature | Public money for clean rivers, hedges and habitat. | National | 2 | 1 | SoNaRR pressures: agricultural pollution -M, land use change -S, so `nature_condition` up | `earnings` -S in Mid and SW for one term; `heartland` -S if played with no `regional-compact` in force (family farms squeezed) | None | The enclosures |
| `plant-woodland` | Plant woodland | New mixed woodland for carbon, timber and shade. | Region | 1 | 3 | `woodland_stock` +M, `carbon_budget` +S | `heartland` -S in North, Mid and SW unless partners are in place (farms bought for trees) | None | The conifer plantations |
| `health-before-hospital` | Health before hospital | Shift money into prevention and care close to home. | National | 2 | 3 | `health_stock` +L, later `life_exp` +M, `care_pressure` -S | `life_exp` flow -S for one term (waiting lists) and the "nothing visible" Trust hit | None | The medical aid societies |
| `early-years` | Early years first | Family support and childcare in the hardest-pressed places. | National (lands in the five worst-off LAs) | 2 | 3 | `early_years_stock` +L, later `equal` gap -M, `earnings` +S | Slow. No effect at all on the median place, so no national cheer. | None | The school boards |
| `regional-compact` | Regional compact | Councils, health boards and landowners agree to act as one. | Two regions | 1 | 0 | For two terms every "needs partners" card works at full strength there, and one regional card may be played across both regions for one extra pip | Delivers nothing by itself. Uses a card slot. | None | The lodge and the chapel |
| `tourism-pays-its-way` | Tourism pays its way | A visitor levy and limits at the busiest places, spent locally. | Region | 1 | 1 | `community_assets` +S, `access` +S, `nature_condition` +S | `gva_head` -S for one term; fuzzy (visitor response is contested) | Bethesda | The railway resorts |
| `everyone-online` | Everyone online | Connection, kit and help for those left offline. | National | 1 | 1 | `equal` gap -S, `employment` +S in Mid and North | `access` -S in rural LAs unless `connect-buses-rail` is in force (counters close once services go online) | None | The penny post |
| `borrow-to-invest` (standing) | Borrow to invest | Spend now, repay later. | National | 0 | 0 | +3 budget pips this term | One debt token: 1 pip interest every term until cleared for 3 pips. Each token left in 2050 takes 0.5 from Left. Maximum three tokens. | None | The company shop |
| `defer-maintenance` (standing) | Put off the repairs | Skip a round of upkeep on roads, pipes and defences. | National | 0 | 0 | +2 budget pips this term | `infrastructure_condition` -M. While it is below 4, every shock hits 25 per cent harder. Repair costs 3 pips. | None | The tips nobody owned |

Coverage check: every strand has at least four cards that help it and at least three that fray it. Every region is a legal target for at least eleven cards. Prevention cards: `warm-homes`, `health-before-hospital`, `early-years`, `welsh-medium-childcare`, `plant-woodland`, `restore-upland-peat`. Cooperation cards: `regional-compact`, `community-owned-energy`, `slow-the-flow`.

## 7. Curveballs

### 7.1 How they arrive

- Twelve curveballs in the pool. Each is a **slow trend** with an optional **shock form**.
- Term 1: always `wet-decade` in the first game and in guided mode; otherwise drawn. No shock in term 1.
- Terms 2 to 6: at step 1 either a new slow trend is revealed (60 per cent, tune) or no new trend. Independently, each active trend with a shock form has a 30 per cent chance (tune) of firing its shock at step 5. At most one shock per term; ties go to the trend active longest. A typical game: four or five trends, two or three shocks.
- Slow trends stay active to 2050 and apply their effect every term.
- Ripples: an active trend doubles the draw weight of the trends it links to and adds 10 points to their shock chance. Links are taken from `links_out` in the horizon-scan files.
- Curveball draws come from the game seed, once. All 200 runs share the same world; only rule parameters vary between runs. Luck is never rerolled behind the player's back.
- A shock offers: **Absorb** (full hit), **Respond 1 pip** (hit halved), **Respond 2 pips** (hit quartered). A listed response card already in play or in the post halves the hit before any spending and earns the stamp.

### 7.2 The pool

| Id | Trend id | Slow effect, each term | Where | Shock form | Ripples to | Good responses |
|---|---|---|---|---|---|---|
| `wet-decade` | `climate-instability` | `flood_exposure` +S, tip movement risk up one step | All; strongest SE valleys and North coast | Storm winter: `flood_exposure` +L for a term, `access` -M, one unmade tip may move | `nature-depletion`, `health-profiles-and-need`, `housing-demand` | `slow-the-flow`, `build-flood-walls`, `make-coal-tips-safe`, `restore-upland-peat` |
| `hot-summers` | `health-profiles-and-need` | `life_exp` -S, `care_pressure` +S | All; strongest Cardiff, Newport, Wrexham | Heatwave: `life_exp` -M for a term, `nature_services` -S | `unemployment-levels`, `infrastructure-investment` | `health-before-hospital`, `warm-homes`, `plant-woodland` |
| `older-wales` | `ageing-population` | `care_pressure` +S; budget -1 from 2038 if `health_stock` is below 5 | Strongest Mid, North, SW | None | `health-profiles-and-need`, `housing-demand` | `health-before-hospital`, `connect-buses-rail`, `build-social-homes` |
| `price-of-a-home` | `housing-demand` | `affordability` -S, `young_adults` -S | Strongest North, SW, Cardiff | Buying rush: `heartland` -M in North and SW for a term | `welsh-language-growth`, `slow-poverty-reduction`, `competing-demands` | `homes-for-locals`, `build-social-homes`, `tourism-pays-its-way` |
| `language-at-the-edge` | `welsh-language-growth` | `speakers_stock` -S | North, Mid, SW | A heartland LA drops below half Welsh-speaking: `culture` flow -M, Trust -4 | None in the scan | `welsh-medium-childcare`, `homes-for-locals`, `community-owned-energy` |
| `rivers-in-trouble` | `nature-depletion` | SoNaRR pressures +S, so `nature_condition` down | Strongest Mid and SW | A river collapses: `nature_services` -M, `gva_head` -S in region (fishing, visitors) | `climate-instability`, `health-profiles-and-need`, `resilience-economy` | `pay-farms-for-nature`, `slow-the-flow`, `restore-upland-peat` |
| `work-rewritten` | `ai-and-machine-learning`, `changing-nature-of-work` | `gva_head` +S, `employment` -S, `equal` gap +S | Strongest SE cities | Office layoffs: `employment` -M in SE for a term | `unemployment-levels`, `protected-characteristics-gaps` | `skills-and-apprenticeships`, `everyone-online`, `early-years` |
| `downturn` | `recession-threat` | None (shock only; enters the pool as a warning card) | All | Recession: budget -2 this term, `employment` -M, fragile employers leave | `unemployment-levels`, `slow-poverty-reduction` | Contingency, `skills-and-apprenticeships`, no debt tokens (each token adds -1 budget) |
| `energy-squeeze` | `geopolitical-conflicts` | `fuel_poverty` +S | All; strongest off-gas Mid and North | Price spike: `fuel_poverty` +L for a term, Trust -4 | `energy-independence`, `supply-chain-vulnerability`, `recession-threat` | `warm-homes`, `community-owned-energy`, `grid-and-big-renewables` |
| `broken-chains` | `supply-chain-vulnerability`, `international-trade-relations` | `gva_head` -S in port and manufacturing LAs | Anglesey, Flintshire, Wrexham, Pembrokeshire, Neath Port Talbot, Newport | A trade route closes: `employment` -M in those LAs, fragile employers leave | `recession-threat`, `competing-demands` | `skills-and-apprenticeships`, `regional-compact`, `community-owned-energy` |
| `left-offline` | `digital-divide`, `digitalisation-of-society` | `equal` gap +S, `access` -S in rural and valley LAs | Mid, North, SE valleys | None | `protected-characteristics-gaps`, `widening-inequality-gap` | `everyone-online`, `connect-buses-rail` |
| `power-rush` (opportunity) | `energy-policies`, `energy-independence` | Energy cards cost 1 pip less while active | All; strongest North, Mid, SW | Investment wave: if grid or community energy is in play, `gva_head` +M and `renewables` +M in that region; if not, `community_assets` -S (built over local heads) | `resilience-economy`, `electric-and-autonomous-vehicles` | `grid-and-big-renewables`, `community-owned-energy`, `skills-and-apprenticeships` |

## 8. The two place visits

Common rules. One visit per term. A visit is offered when a trigger card is played that term (or by a curveball that names the place). The grade (poorly, adequately, well) is a delivery multiplier on the trigger card across that **type of place**: 0.6, 1.0, 1.3. The Rhondda grade applies to the coal valley LAs (Rhondda Cynon Taf, Merthyr Tydfil, Blaenau Gwent, Caerphilly, Torfaen, Neath Port Talbot, Bridgend). The Bethesda grade applies to the slate and heartland LAs (Gwynedd, Anglesey, Conwy, Ceredigion, Carmarthenshire). Results go up as a grade stamp and as pips through the multiplier, never as counts. A place can be visited again; threads already placed stay; the latest grade stands. Grades are judged on the decision, across the 200 runs, never on one roll of bad luck.

### 8.1 The Rhondda: which tips first

| Item | Specification |
|---|---|
| Trigger cards | `make-coal-tips-safe` (main), `slow-the-flow`, `connect-buses-rail` (same board, one thread fewer) |
| The choice | "The money covers three tips this term. There are more tips than thread." Place three threads among the 17 mapped tips. Fold back without playing is allowed (resolves adequate). |
| What informs it | Per tip, as in the prototype: hectares of homes below, mapped buildings below, and flags for school, railway or station, bus route, flood zone, most deprived tenth. Movement risk shown as a three-step marker that the `wet-decade` trend raises. |
| Real data | BGS landslide records that mention a tip and OpenStreetMap spoil heaps (open proxies, labelled as such; the official disused tips register is not open), terrain at 50 m, OSM buildings and services, NRW flood zones, WIMD. "Below" means within 1,000 m and at least 10 m lower. Confidence: low, stated on the board. |
| Three tests | **Exposure**: the threads cover at least 40 per cent (tune) of the risk-weighted homes below all tips. **Fairness**: at least one thread protects a most-deprived-tenth neighbourhood. **Lifelines**: no tip left at the top risk step sits above a school or the railway. |
| Grade | Well: all three tests. Adequately: two. Poorly: one or none. |
| Why no obvious answer | The biggest tips by homes are not the riskiest, the riskiest are not above the poorest streets, and the school and railway sit under others again. The tests cannot all be met by sorting one column. Second visits change the sums, because risk steps move with the weather. |
| After | If a tip left unmade moves in a storm shock, a voice says so and Trust takes the shock hit, but the grade does not change. |

### 8.2 Bethesda and Dyffryn Ogwen: who is the quarry for now

The single dilemma: **the visitors have come to the quarry; does the valley's next generation get a home, work and a Welsh-speaking street out of it, or does it pass through?** Chosen because it is what the slate valley is deciding in life, it puts the language, housing, work and the river on one board, and it differs in kind from the Rhondda. The Rhondda is triage under risk. Bethesda is about who benefits.

| Item | Specification |
|---|---|
| Trigger cards | `homes-for-locals` (main), `community-owned-energy`, `tourism-pays-its-way`, `welsh-medium-childcare` |
| The choice | "Three threads to tie the quarry to the valley." Place three threads among ten options on the place map (below). |
| What informs it | Per option, five flags (Homes, Work, Iaith, Visitors, River) and a delay. Around the board: share of Welsh speakers by neighbourhood, share of homes that are second homes or holiday lets, house price to earnings, flood zone along the Afon Ogwen, the World Heritage boundary, the A5 through the High Street. |
| Real data | Census 2021 Welsh language by small area; council tax second homes and holiday let counts (Gwynedd, the finest open grain available, labelled); ONS affordability; NRW flood zones; the Slate Landscape of Northwest Wales World Heritage boundary (inscribed 2021); OSM buildings, chapels, bus routes. All facts on the board carry "to check" until sourced. |
| Three tests | **Aros (staying)**: young adults can stay; needs at least one Homes thread and one Work thread to pay off. **Iaith**: Welsh remains the street language; modelled share of speakers does not fall. **Pwysau (pressure)**: visitor traffic and the river stay within what the valley can carry. |
| Grade | Each test must hold in at least 60 per cent of runs. Well: all three. Adequately: two. Poorly: one or none. |
| Why no obvious answer | Ten options, three threads, three tests, and the strongest options each fail a test. Several different trios pass; which is safest depends on the active trends (`price-of-a-home` punishes trios without two Homes threads; `wet-decade` punishes ignoring the river). |

| No. | Option | Flags helped | Catch |
|---|---|---|---|
| 1 | Empty chapel and shops on the High Street turned into homes for local rent | Homes, Iaith | Slow (2 terms), few homes |
| 2 | New homes at the quarry edge with a local-occupancy rule | Homes | Inside the heritage landscape: Pwysau harder |
| 3 | Cap on new holiday lets in the upper villages | Homes, Iaith | Visitor income falls: Work harder |
| 4 | Park and ride from the A55 with a bus up the valley | Visitors | Helps nothing else |
| 5 | The valley's share of the visitor levy held by a community trust | Work, Visitors | Fuzzy; only works if `tourism-pays-its-way` is in play |
| 6 | A second community hydro scheme on a tributary | Work, Iaith | Small; River flag turns against it in dry summers |
| 7 | Rework the slate tips for aggregate | Work (strong) | Lorries through the High Street and inside the heritage landscape: Pwysau fails unless paired with option 4 |
| 8 | Year-round workshops and apprenticeships at the old quarry buildings | Work, Iaith | Needs `skills-and-apprenticeships` nationally to reach full strength |
| 9 | Welsh-medium early years and youth centre | Iaith (strong) | No effect on Aros alone |
| 10 | Room for the river: flood works on the lower High Street | River | Uses a thread on something nobody will thank you for unless it rains |

## 9. Voices and the letter

### 9.1 Voices (one per term, at step 6; also the opening voice next term)

- Selection: take the term's largest event in this order of priority: place visit result, shock, largest strand change by region, pledge kept or broken, neglected region. Find voice templates tagged with that event, strand and direction; choose the place within the affected region whose LA moved most; fill the slots.
- Template slots: `{place}`, `{year}`, `{thing}` (card or liability noun), `{direction}`, `{season}`, `{who}` (a role, never a name: "a bus driver", "a mother of two").
- Always labelled "Illustrative voice, not a real quote". Never a named person, never a politician.
- Tone: spoken, concrete, one or two sentences, dry rather than grateful. People talk about buses, rain, rent and children, not strands. No exclamation marks. Praise is grudging; anger is specific. The Welsh versions are written afresh, not translated word for word.
- The content agent writes at least 60 templates: every strand in both directions, every curveball shock, every place grade, neglect for each region.

Twelve examples:

| Place | Trigger | Voice |
|---|---|---|
| Treorchy | `wet-decade` active, tips not yet played | "The tip over the school moved again in the February rain. We just want to know which one they'll do first." |
| Bethesda | `price-of-a-home` shock | "Three houses on our street went in a fortnight. None of them to anyone who'll be here in January." |
| Aberystwyth | `welsh-medium-childcare` arrives | "She came home from the cylch correcting my mutations. I'll take that." |
| Wrexham | `land-a-big-employer` played | "Six hundred jobs, they say. My dad heard that about the last place, mind." |
| Holyhead | `broken-chains` shock absorbed | "The port's quiet in a way I've not heard since I was a boy. Nobody's told us what's next." |
| Llanelli | `warm-homes` arrives | "First winter I've not had the coat on indoors. Took them long enough." |
| Newtown | Mid neglected two terms | "We read about all the plans. They seem to stop at the Brecon side of the mountain." |
| Merthyr Tydfil | `connect-buses-rail` upkeep unpaid | "They gave us the bus and we built our shifts round it. Now it's Tuesdays and Fridays." |
| Rhyl | Storm winter, "you were ready" | "The water came up to the new wall and stopped. I stood and watched it stop." |
| Blaenau Ffestiniog | `tourism-pays-its-way` arrives | "The visitors still come for the wires and the trains. Difference is some of it stays now." |
| Pembroke Dock | `power-rush` with no community energy | "You can see the turbines from the kitchen. The bills came from somewhere else, same as ever." |
| Cardiff (Grangetown) | `hot-summers` heatwave | "My nan's flat was thirty-three degrees at midnight. The trees they planted are still sticks." |

### 9.2 The letter from 2050

- Structure, five slots in fixed order: **Salutation and place** (the writer lives in the LA that changed most, for better or worse); **Lived line** (what your years were like, from the Lived band and the worst term); **Left line** (what they opened, from the Left band and the two extreme stocks); **The named thing** (one specific: a debt token by its year, a tip, a card that arrived after you left, a broken pledge, a lost term); **Sign-off** (set by which of the two is lower and by how much).
- Archetype = Lived band (low, middle, high) by Left band (low, middle, high), collapsed to six letters as below. The opening screen tracks which the player has received.
- Tone: a private letter from someone about thirty, born in your first or second term. Plain, direct, fair. They know what you were up against and say so once. No lecture, no statistics, no pips. At most 110 words. Gratitude and anger are both earned by specifics.

| Letter | When | Example |
|---|---|---|
| The feast | Lived high, Left low | "Dolgellau, 2050. My parents talk about your years as the good ones, and I believe them. Wages up, the town busy. I was born into the bill. We are still paying the loan you took in 2038, the walls at Barmouth need work nobody budgeted for, and the river my father fished is a ditch. You were kind to them. I wish you had been curious about me." |
| The long winter | Lived low, Left high | "Treorchy, 2050. Mam says she nearly gave up on you. Ten years of nothing to show, she says, and the buses worse. But the tips above the school are grass now, the house is warm, and I have work in the valley. I think you knew we would thank you and she would not. For what it is worth, she has come round. Mostly." |
| The gift | Both high | "Bethesda, 2050. I am writing this in Welsh first and English second, which tells you most of it. There is a home I can afford on the street I grew up on. The hills behind hold water again. You left one debt and I can see what it bought. Whoever told you it could not all be done at once was nearly right. Diolch." |
| The hollow years | Both low | "Newport, 2050. I have tried to write this fairly. The storms were not your doing, nor the downturn. But the repairs you put off in 2034 are ours now, twice the size, and I cannot find the thing you built instead. The term you lost the seat was not the worst of them. I would like to know what you thought you were saving it for." |
| Held steady | Both middle | "Carmarthen, 2050. You handed on roughly what you were handed, and having seen the weather you had, I know that was work. The childcare came good after you had gone. The farms are thinner than they were. Nobody here curses your name or blesses it. I would have liked you to want one thing badly." |
| The uneven hand | Either high, with `equal` low or a region neglected | "Holyhead, 2050. I have seen Cardiff and it is as fine as they say. I am glad for them. Up here the port went quiet in 2042 and we waited for a card that never came north. The country you left is richer and greener than the one you found. It is also two countries. I thought you should hear it from the other one." |

## 10. Rule list for v1

Rule kinds: **LIN** linear effect with lag; **SAT** saturating effect; **STK** stock with inflow and outflow; **THR** threshold trigger. Lag in terms. Parameter values are in indicator points per unit of input unless stated. P marks a placeholder awaiting evidence: it ships, labelled low confidence, and shows the "placeholder" badge in every trace.

| Id | Kind | Inputs | Output | Lag | Parameter (range) | Confidence | Source needed | P |
|---|---|---|---|---|---|---|---|---|
| R01 | LIN | Term clock, `age65` projection | `care_pressure` | 0 | +0.3 per term (0.2 to 0.5) | High | ONS and Welsh Government population projections by LA | |
| R02 | LIN | Term clock, climate path | `flood_exposure` | 0 | +0.2 per term (0.1 to 0.4) | Medium | UKCP18, NRW flood risk assessment | |
| R03 | STK | SoNaRR pressures | `nature_condition` moves toward the FCM equilibrium | 0 | closes 25 per cent of the gap per term (15 to 40) | Medium | SoNaRR 2025; the rate is judgement | P (rate) |
| R04 | STK | Births, migration, transmission | `speakers_stock` | 0 | net -0.15 per term at baseline (-0.3 to 0) | Medium | Census 2011 and 2021, Welsh Government language projections | |
| R05 | LIN | UK grid decarbonisation | `emissions_head` | 0 | -0.25 per term (-0.4 to -0.1) | Medium | Climate Change Committee Wales pathway | |
| R06 | SAT | Peat card plays | `peat_condition` | 2 | +1.0 per play, halving after 3 plays (0.5 to 1.5) | Medium | National Peatland Action Programme evidence | |
| R07 | LIN | `peat_condition` | `emissions_head`, `carbon_budget` | 0 | 0.15 per point (0.05 to 0.3) | Medium | Peatland emissions inventory | |
| R08 | SAT | `peat_condition`, `slow-the-flow`, `woodland_stock` | `flood_exposure` | 2 | up to -1.5 in total (-2.5 to -0.5) | Low | Natural flood management evidence reviews | P |
| R09 | LIN | `build-flood-walls` | `flood_exposure` | 0 | -2.0 in region (-2.5 to -1.5) | High | Flood defence appraisal guidance | |
| R10 | STK | Wall upkeep paid or unpaid, `defer-maintenance` | `infrastructure_condition` | 0 | -1.0 per unpaid upkeep (-1.5 to -0.5) | Medium | Asset condition reports | P |
| R11 | STK | Tips made safe (card and Rhondda grade) | `tip_liability` | 1 | -2.0 x grade multiplier (-2.5 to -1.5) | Low | Coal tip safety programme; open proxies only | P |
| R12 | THR | `tip_liability`, storm shock, risk step | Tip movement event: `access` -M, Trust hit | 0 | chance 10, 25, 45 per cent by risk step (plus or minus 10) | Low | BGS landslide records; judgement | P |
| R13 | LIN | `warm-homes` | `fuel_poverty` | 2 | -1.0 (-1.5 to -0.5), halved if `skills_stock` below 4 | Medium | Retrofit programme evaluations | |
| R14 | LIN | `fuel_poverty`, `health_stock` | `life_exp` | 1 | 0.2 per point (0.05 to 0.4) | Medium | Cold homes and health literature | |
| R15 | STK | `health-before-hospital`, `warm-homes` | `health_stock`; outflow 10 per cent per term | 3 | +2.0 per play (1.0 to 3.0) | Low | Prevention return studies | P |
| R16 | SAT | `housing_stock`, `homes-for-locals` | `affordability` | 1 | up to +2.0 (1.0 to 3.0) | Medium | Housing supply elasticity studies | |
| R17 | LIN | `affordability`, `employment` | `young_adults` (retention) | 1 | 0.3 and 0.3 per point (0.1 to 0.5) | Low | Internal migration by age, ONS | P |
| R18 | LIN | `young_adults`, `affordability` in heartland LAs | `heartland`, `speakers_stock` | 1 | 0.25 per point (0.1 to 0.5) | Low | Language and housing research | P |
| R19 | STK | `welsh-medium-childcare` | `speakers_stock`, `welsh_speakers` | 3 | +1.0 per play (0.5 to 1.5) | Medium | Welsh-medium education transmission data | |
| R20 | THR | `welsh_speakers` in a heartland LA below half | `culture` flow -M, Trust -4, voice | 0 | threshold 50 per cent (45 to 55) | Low | Sociolinguistic threshold literature (contested) | P |
| R21 | STK | `skills-and-apprenticeships` | `skills_stock`; outflow 15 per cent per term | 2 | +1.0 per play (0.5 to 1.5) | Medium | Apprenticeship outcome data | |
| R22 | LIN | `skills_stock` | `earnings` | 1 | 0.25 per point (0.1 to 0.4) | Medium | Returns to qualifications | |
| R23 | LIN | `access` | `employment` | 1 | 0.2 per point (0.05 to 0.4) | Low | Transport and labour market studies | P |
| R24 | LIN | `connect-buses-rail`, `everyone-online`, upkeep | `access` | 1 | +1.0 and +0.5 (0.5 to 1.5) | Low | No LA baseline: starts at band middle | P |
| R25 | LIN | Cost pips of a card, its sector tag | `employment` (jobs ripple), this term and next only | 0 | sector employment multiplier in three bands: 0.2, 0.4, 0.6 per pip | Medium to 2034, low after | Wales input-output tables 2022, Table 5 (`model/data/io-multipliers.json`) | |
| R26 | LIN | `land-a-big-employer` | `gva_head` +1.0, `employment` +1.0, `earnings` +0.5 | 0 | (0.5 to 1.5) | Medium | Inward investment evaluations | |
| R27 | SAT | `grid-and-big-renewables`, `community-owned-energy` | `renewables`, then `emissions_head` | 2 | +2.0 and +0.5 per play, ceiling at band goal | High | Energy Generation in Wales | |
| R28 | THR | Fragile employer in region, trade or recession shock | Employer leaves: reverses R26 plus `employment` -0.5 | 0 | chance 60 per cent (40 to 80) | Low | Plant closure case studies | P |
| R29 | LIN | SoNaRR pressure nodes changed by `pay-farms-for-nature`, `build-social-homes`, `grid-and-big-renewables`, `rivers-in-trouble` | FCM pressure clamps (23 pressures) | 1 | plus or minus 0.1 to 0.3 on the FCM scale | As SoNaRR link confidence | SoNaRR 2025 DPSIR model | |
| R30 | SAT | Repeat play of any card within two terms | That card's effects | 0 | x0.6 (0.5 to 0.8) | Low | Design rule, not evidence: labelled "game rule" | |
| R31 | LIN | `nature_condition` | `nature_services`, then `life_exp` +S link | 1 | 0.5 per point; 0.1 to health (0 to 0.2) | Medium; health link low | SoNaRR service nodes; green space and health reviews | P (health link) |
| R32 | STK | `early-years` | `early_years_stock`, then gap in `earnings` and `life_exp` for the five worst-off LAs | 3 | +2.0 per play; 0.3 per point to the gap (0.1 to 0.5) | Low | Early intervention longitudinal studies | P |
| R33 | STK | `community-owned-energy`, `tourism-pays-its-way`, Bethesda grade | `community_assets`; outflow 5 per cent per term | 1 | +1.0 x grade multiplier (0.5 to 1.5) | Low | Community energy and asset transfer evidence | P |
| R34 | STK | Emissions each term | `carbon_budget` | 0 | exact accumulation, no parameter | High | DESNZ emissions; straight-line path to net zero is a stated assumption | |
| R35 | STK | `borrow-to-invest`, repayments | Debt tokens, interest of 1 pip per token | 0 | fixed | Game rule | Labelled "game rule": no pound figures implied | |

Honesty rules for the engine: FCM iterations are never time (R03 carries the clock). R25 never runs beyond the term after a spend. Game rules (R30, R35) are badged as such and are not presented as evidence. Seventeen of 35 rules carry a placeholder mark (three of them on one parameter or link only); the Model Book lists them first.

## 11. Balance and anti-dominance

### 11.1 What stops one strategy winning

| Tempting strategy | What defeats it |
|---|---|
| Growth only (`land-a-big-employer` every term) | Repeat penalty R30, fragility R28, emissions, earnings lag behind GVA, Left stocks drain |
| Green only | Trust falls with nothing visible, card limit drops to two, a caretaker term follows |
| Borrow early and often | Interest eats one pip per token per term, the recession shock is worse with tokens, the debt penalty caps Left |
| Prevention only | The Trust "nothing visible" hit for three terms; Lived counts the worst term extra |
| Everything in the South East | `equal` is unweighted by population; neglect penalty in three regions; the uneven hand letter |
| Ignore places | Default adequate is safe but forgoes the 1.3 multiplier and +6 Trust, which a thoughtful run needs |
| Never hold contingency | Two or three shocks a game, each -6 Trust when absorbed |
| End-game dumping (term 6 short-term cards only) | The lower-of rule; in-the-post cards count in Left |

### 11.2 Targets, enforced by bot tests

> **Superseded by `balance-decision.md` (decision 14):** the targets are restated in net strand pips since 2026. The table below is the original.

The engine agent writes six bots and runs each over 200 seeds. These are acceptance tests.

| Bot | Behaviour | Target result (median) |
|---|---|---|
| Caretaker | Two cheapest cards, always responds | 3.3 to 3.9 |
| Careless | Random legal plays, no visits, no contingency | 2.5 to 3.5 |
| Average | Plays to the weakest strand, visits when asked, one borrow | 4.2 to 5.0 |
| Thoughtful | Balances visible and slow cards, holds 1 to 2 contingency, repays debt, earns one "well" | 5.8 to 6.8 |
| Any single-strategy bot from 11.1 | As named | At least 0.7 below Thoughtful, never above Average's top |
| Ceiling | Best of 5,000 random-search runs | No higher than 8.0 |

Also: no card appears in more than 70 per cent of the top decile of runs; every card appears in at least 10 per cent of them; Lived is the lower value in 35 to 65 per cent of Thoughtful runs (both ways of losing are live).

### 11.3 Fair use of chance

- All chance comes from one seed, shown on the end screen. Same seed and same choices give the same game.
- Curveballs are drawn once per game; rule parameters vary only across the 200 runs. The player's result is the median, so a single unlucky parameter draw never decides a game.
- **Sharp**: at least 80 per cent of runs agree on the pip. **Fuzzy**: otherwise. Shown before commitment on the card preview and after at step 6. Fuzzy is information, not a penalty: low-confidence rules make fuzzy cards.
- Shocks are always foreshadowed: a shock can only come from a trend already visible on the table, and the peek exists.
- Grades at places are judged across runs, on the decision.
- First game: a fixed seed and a curated order (`wet-decade`, then `price-of-a-home`, `downturn` shock in term 4) so that both places are asked for and the tutorial beats land.

### 11.4 Daily Wales

Include it; it is nearly free with a seeded engine. Seed is the date. Same curveballs and hands for everyone that day. One attempt is recorded as "today's", further attempts are marked practice. The copyable result is two rows of coloured squares (Lived and Left) and the band name, with no spoilers. Stored only in this app's own keys on its own origin.

## 12. The 8 out of 10 bar: playtest checklist

A build passes when a new tester, unaided, ticks at least 12 of these 15, and items 1, 4, 7, 11 and 15 are among them.

1. Within 60 seconds I had touched the map, read a real figure about a place I know, and understood I was about to be judged from 2050.
2. I played my first card inside two minutes without reading a paragraph of instructions.
3. I could say what every mark on a ticket means (helps, frays, cost, delay, partners) after one term.
4. At least once I stared at my hand for more than ten seconds because I wanted three things and could afford two.
5. I held back contingency at least once, and I regretted either holding it or not holding it.
6. A card I had forgotten arrived from the post and I felt paid, or cheated.
7. I pulled a thread from a strand back to my own card and to a named source, and the explanation made sense to me.
8. Something happened that I did not intend, and the game showed me why.
9. Trust stopped me doing something I wanted, and I understood what had cost me the Trust.
10. I went to the Rhondda or Bethesda, found the choice hard, and could defend what I chose. I could not tell which choice the game "wanted".
11. A voice or the letter mentioned something specific I did, by name, and it stung or pleased me.
12. I understood on the end screen why my result was the lower of Lived and Left, and which one let me down.
13. I never saw a pound sign, a decimal or a claim to precision the game could not back, and I could tell sharp from fuzzy.
14. I switched to Cymraeg mid-game and nothing broke, went missing or read like a translation.
15. I wanted to play again, and I knew what I would do differently.

## 13. Notes for the build agents

- **Engine**: implement sections 2, 4, 5, 7, 10 and the bot tests in 11.2 first. Expose `preview(state, plays)` and `resolve(state, plays, visit, response)` returning median state, fuzzy flags and a full causal trace per changed quantity.
- **Content**: cards (section 6), curveballs (7), place boards (8), at least 60 voice templates and 6 letter archetypes with three variants of each slot (9), all in `{ en, cy }`.
- **UI**: the seven steps of 2.2 as states of one screen, per the Papur v2 mockup. The strand row carries flow pips and the stock tick. Trust dial top right. Post rail under the map. No modal walls of text anywhere.
- **Data**: the 15 indicators with source cards, `model/bands.yaml`, the 2026 acceptance check in 3.2, and the two place datasets. The tips register stays out until permission is given.
- Open questions that must not block the build: whether `fuel_poverty` exists at LA level (if not, use the Wales value everywhere and mark it); the exact reference bands; the Welsh for result band names.
