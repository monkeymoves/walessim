# Glossary

Use the **Term** column in code, docs and talk between builders. Use the **Player sees** column in anything the player reads: copy in `model/i18n/`, card and curveball text, labels. Where the two differ, `docs/design/plain-wales.md` section 1 is the source, and `src/ui/game/copy-rules.test.ts` fails on the retired words. Welsh player words are drafts for review.

| Term | Meaning | Player sees (English / Welsh) |
|---|---|---|
| **Etifeddiaeth** | The game. "Inheritance: a game of Wales." | Etifeddiaeth |
| **Ddoe / Heddiw / Yfory** | The past (v1.1), the present atlas, the playable future. | Wales today (atlas), Play / Heddiw, Yfory |
| **Term** (Tymor) | One four-year turn, the engine's step. v1 has six: 2026 to 2046. | turn, "Turn 1 of 6"; years, not counts ("Works from 2034") / tro |
| **Generation** (Cenhedlaeth) | 25 years; the short mode is one generation, ending 2050. | 2026 to 2050 |
| **Strand** (Edefyn) | One of the seven well-being goals, scored 0 to 10: prosperous, resilient, healthier, equal, cohesive, culture, global. | goal; Work and pay, Nature and floods, Health, Fairness, Homes and community, Welsh and culture, Climate / nod; Gwaith a chyflog, Natur a llifogydd, Iechyd, Tegwch, Cartrefi a chymuned, Y Gymraeg a diwylliant, Hinsawdd |
| **Pip** | The engine's unit of budget, of a strand, of delay and of the result. Never shown. | coin (budget), point out of 10 (a goal), a year (delay), score out of 100 (result) / darn arian, pwynt |
| **Flow / stock** | A strand's level now, and what it builds up for 2050. | the bar (life today) and the 2050 marker / bar; marc 2050 |
| **Trust** (Ymddiriedaeth) | The ruler's licence to act; sets how many cards you may play. Not a strand. Bands strong, fair, thin, collapsed. | Trust: High, OK, Low, Lost, always with the card count / Uchel, Iawn, Isel, Wedi'i cholli |
| **Caretaker** (Gofalwr) | Plays one term on defaults if Trust collapses; also the comparison run. | a stand-in (the lost turn); Wales on autopilot (the comparison) / dirprwy; Cymru ar awtobeilot |
| **Lived** (Wedi'i fyw) | How people fared during your terms. | Life now (in play); Life in your years (at the end) / Bywyd nawr; Bywyd yn eich blynyddoedd |
| **Left** (Wedi'i adael) | What the 2050 generation inherits. | Left for 2050 / Ar ôl ar gyfer 2050 |
| **Result** | The lower of Lived and Left, in bands. | "Your result is the weaker of the two"; Much worse, A little worse, About the same, A little better, Much better than you found it |
| **Contingency** | Pips left unspent, held for a shock. | emergency fund; "saved for a crisis" / cronfa argyfwng |
| **Card** (Cerdyn) | A policy lever you play, drawn as a railway ticket. Has cost, delay, scope, effects, side effects. | card; "Costs 3 coins. Works from 2034." Opened: What it is, The catch, Picture it, Real Wales / cerdyn |
| **Standing ticket** | Borrow to invest, put off the repairs. | Extra coins, with a catch: Borrow, Skip repairs / Darnau ychwanegol, ond â phris |
| **Ledger** | Debts, upkeep, deferred repairs. | Borrowing and bills; a loan; running cost / Benthyg a biliau; benthyciad; cost cynnal |
| **Curveball** (Pelen gromlin) | An event from the horizon-scan trends; drawn as a slip, not a ticket. | slow change (the trend); crisis (the shock) / newid araf; argyfwng |
| **Ripple** | A curveball that can lead to another. | "This can lead to: {name}" / Gall hyn arwain at |
| **Scope** | Where a card applies: national, region, authority (LA) or place. | All of Wales, One region, Two regions |
| **Region** (Rhanbarth) | North, Mid, South West, South East. | the same |
| **Authority** (Awdurdod) | One of the 22 local authorities; the model's spatial unit. | council area ("local authority" in the atlas table heading) / ardal cyngor |
| **Regional compact** | Card: two regions act as one; needs-partners cards work at full strength there. | Regions work together / Rhanbarthau'n cydweithio |
| **Needs partners** | Half strength without a compact or a good visit. | Needs local help / Angen cymorth lleol |
| **Heartland** | The Welsh-speaking authorities flagged in `authorities.yaml`. | Welsh-speaking areas / ardaloedd Cymraeg |
| **Place** (Lle) | An authored zoom view (the Rhondda, Dyffryn Ogwen) with its own real data and decision. | place |
| **Visit** (Ymweliad) | Spending the term's attention on a place; one per term. | visit |
| **Thread** (in a place) | One choice on a place board. | pick ("3 picks left"); Make this tip safe, Choose this, Undo / dewis |
| **Place test** | One of three checks on a visit, judged over many runs. | a plain question with Yes or Not yet: "Can young people stay?", "Did you protect enough homes?"; "about 6 times in 10", never "runs" |
| **Grade** | Poorly, adequately, well or very well: the result of a place decision, scaling a card's effect. | badly, OK, well, very well / yn wael, yn iawn, yn dda, yn dda iawn |
| **Sharp / fuzzy** | Whether most runs agree on the move. | "about" and "probably"; "This could be 1 point higher or lower" |
| **Indicator** (Dangosydd) | A real measured quantity per authority (e.g. employment rate), with a source. | measure, with its source |
| **Stock** (Stoc) | A quantity that carries over time with delays (e.g. coal tip liability, woodland maturity). | what is built up for 2050 |
| **Rule** (Rheol) | One relationship in the model, written as data with a kind, parameters, sources and confidence. | rule |
| **Rule kind** | linear, saturating, stock, threshold, fcm, io. | straight line, levels off, builds up, tipping point, web of causes, spending into jobs |
| **Confidence** | High, medium or low, how sure the evidence is. | How sure: high, medium, low |
| **Evidence grade** | assessed (in SoNaRR or official statistics), published, expert, placeholder. | official figures, published research, expert judgement, a rough guess |
| **Lens** (Lens) | An indicator shown as a tint on the atlas map. | Colour the map by... / Lliwio'r map yn ôl... |
| **Pull the thread** (Tynnu'r edau) | Tracing a change back through the cards and rules to the sources. | Why? (button); "Why did this change?" (title) / Pam?; Pam newidiodd hyn? |
| **Model book** (Llyfr y model) | The public, readable list of every rule, indicator and source. | the rule book / y llyfr rheolau |
| **Modified rule set** | Any parameter changed from default; always shown with a badge. | You changed the rules / Rydych wedi newid y rheolau |
| **Seed** | The number that fixes a game's draws. | Game number / Rhif y gêm |
| **Voice** (Llais) | A one-line, illustrative quote from a real place each term. | A made-up voice, to show how it might feel |
| **Letter** (Llythyr) | The 2050 generation's verdict at the end. | the letter; its archetype title shows as "Ending found: The hollow years (1 of 6)" |

## The board (v2, route `#/bwrdd`)

Terms for the bigger game in `docs/design/v2-board.md`. Code names are in `src/board/engine/types.ts`. v1 terms above keep their meaning on the v1 route. Welsh player words are drafts for review.

| Term | Meaning | Player sees (English / Welsh) |
|---|---|---|
| **Board** (`BoardModel`, `BoardState`) | The new game, played on the map of real councils; also its compiled model and its state. | the board (code name only); the game is still Etifeddiaeth / y bwrdd |
| **A board** (`BoardId`, `game.board`) | One list of councils with its regional content, played by the one rule set: All Wales, South East and the regions (v3). A folder, `model/board/boards/<id>/`, compiled to `public/board-model.<id>.json`. ADR 0009. | the board's name: "South East Wales", "All Wales" / "De-ddwyrain Cymru", "Cymru gyfan" |
| **Area** (`AreaId`, `game.areas`) | A named set of a board's councils that shared content names (`area: edge`), so one condition serves every board. Each board defines `core` and `edge` from the councils' flags; each map group is an area too. Not a group of people. | not shown by that name |
| **Core** (area) | A board's cities: the places that draw work and young people. The South East: Cardiff and Newport. | the city, the cities / y ddinas, y dinasoedd |
| **Edge** (area) | The councils a board's cities can leave behind. The South East: the valleys. All Wales: valley and rural councils. | the valleys (South East) / y cymoedd |
| **Map group** (`game.map_groups`) | One of the groups of councils a big board shows at a glance and zooms to. All Wales has five: North West, North East, Mid, South West, South East. A small board has none. | "North West: 2 of 3" / "Gogledd-orllewin: 2 o 3" |
| **Step** (board) | The clock's tick: a quarter of a year (`game.years_per_step`). Step 0 is May 2026, step 96 is May 2050. Never shown as a number. Replaces phase 1's two-year turn (ADR 0007). | the season and year: "Autumn 2031" / "Hydref 2031" |
| **Season** | Summer, autumn, winter or spring: the step within its year, from May. | Summer 2026, Autumn 2026 / Haf, Hydref, Gaeaf, Gwanwyn |
| **Clock** | Time running by itself in steps, at a speed the player picks, paused at any moment. `tick` runs one step, `advance` runs to a stop. Speed is never in the state: every game starts at `default_speed` (Fast, v3) and a speed picked is not kept. | play, pause, Steady, Brisk, Fast; "Nothing moves until you press play." / chwarae, oedi |
| **Needs-you outline** (`waitingOn`, `NeedsTarget`, `clock/NeedsYou.tsx`) | While the clock is held for the player, the red ring round the one thing to act on (answers, Carry on, a Close, Start time or Play, Next season), and the chip in the top strip that says the same. Each screen marks its target with `data-needs`. v3-wales.md section 2. | "Waiting for you: choose one"; setting "Flashing outline" / "Yn aros amdanoch chi: dewiswch un" |
| **Year close** | Arriving at the first step of a year. Moods, Backing, momentum and grown events are judged; a yearly frame is taken and the ledger folds. | the ticker's year lines / llinellau'r flwyddyn |
| **Stop** (`Stop`, `StopKind`) | Something a step reports that may pause the clock. Hard stops (`respond`, `election`, `ended`) always do; the rest follow the player's settings. | one line with Look and Carry on / Edrych, Ymlaen |
| **Log** (`LoggedAction`) | Every action with the step it was taken at, `{ at, action }`. Replaying it gives the same game. Replaces phase 1's steps. | not shown; the run code carries it |
| **Time line** (`TimelineView`) | The strip from 2026 to 2050: the past (chapters, moments), now, builds under way and what is ahead. Replaces the twelve turn boxes. | the time line / y llinell amser |
| **Term** (board) | Four years between elections: six from 2026 to 2050. Each ends with a term report and a chapter. | 2030 to 2034 / tymor |
| **Council** (`CouncilCode`) | One of the 22 local authorities, the board's unit of state. Ten in the South East prototype. | council / cyngor |
| **Measure** (`MeasureId`) | One of six council scores out of 10: `work`, `homes`, `health`, `nature`, `welsh`, `climate`. Seeded from real indicators in 2026, game estimates after. | Work and pay, Homes and community, Health, Nature and floods, Welsh and culture, Climate; "6 out of 10" / Gwaith a chyflog, Cartrefi a chymuned, Iechyd, Natur a llifogydd, Y Gymraeg a diwylliant, Hinsawdd |
| **Fairness** (board) | The Wales level gap between the three lowest councils and the middle council, across all six measures. Not a council measure. | Fairness; "who is behind" / Tegwch; "pwy sydd ar ei hôl hi" |
| **Seed** (board) | A measure's 2026 score: the plain mean of its indicators' scores through their bands. Never adjusted. | Real figure, 2025 / Ffigur go iawn |
| **Board band** | A band for an indicator v1 has none for: lowest and highest of the 22 councils pushed out by a tenth. | compared with the rest of Wales / o'i gymharu â gweddill Cymru |
| **Project** (`ProjectDef`, `ProjectState`) | Something built at a site (a council or a rail link). Costs coins, takes years to build (`build_years`), then works for the rest of the game. One of each per site. | project; "Being built", "Working", "Run down" / prosiect; Yn cael ei adeiladu, Yn gweithio, Wedi dirywio |
| **Site** | Where a project stands: a council, or a rail link between two. | here; "on the line between X and Y" / yma |
| **Level** | A project's size, 1 to 3. Upgrading needs the next tier of its branch. | Level 2 / Lefel 2 |
| **Branch** | One of four lines of projects: Joined-up valleys, Made here, Living landscape, Good homes and strong communities. | the same names, on the Tree sheet / Cymoedd cysylltiedig, Wedi'i wneud yma, Tirwedd fyw, Cartrefi da a chymunedau cryf |
| **Tier** | A branch's step, 1 to 3. Tier 2 opens with three tier 1 projects of the branch working anywhere; tier 3 with two tier 2. | "Opens when 3 of these are working" / haen |
| **Keystone** | A branch's tier 3 project. Takes six years, so it must start by `keystone_last_start_year`. Decides most endings; once working it changes rules region wide (16.3.5). | keystone / maen clo |
| **Quick project** | A tier 1 project marked `quick`: cheap, built in a year or less, felt in the season it opens. | a small win / buddugoliaeth fach |
| **Legacy project** | A project only a working keystone opens (`legacy_of`). | opens when {keystone} is working / yn agor pan fydd {keystone} yn gweithio |
| **Roots** (rule R1) | A working project's growth factor: starts at 1, grows each year, faster when joined. Package 8. | "A project is worth more every year it stands, and much more when it has company." |
| **Joined** | A project with another of its branch working here or one link away, or a live pair. Its roots grow faster. | works with its neighbours / yn cydweithio |
| **Momentum** (rule R2) | A council rising, steady or slipping against four years before, with two edges so it tips rather than wobbles. A game estimate. Package 8. | On the rise, Slipping / Ar i fyny, Yn llithro |
| **Region turn** | The first time enough councils are on the rise at once; income rises for good. | The turn / Y tro |
| **Fresh start** (rule R3) | The first project placed in a slipping or one of the lowest councils costs less and counts as joined. | People rally round the first new thing / Mae pobl yn dod at ei gilydd |
| **Need** (rule R4) | A lift does more where the real 2026 figure is worst. | "Health is low here, so this does more." |
| **Link** (`LinkDef`) | A real connection between two councils: commuting (who works where), rail (a line with stations) or river (upstream to downstream). | link; commuting, rail line, river / cyswllt; cymudo, rheilffordd, afon |
| **Link quality** | A rail link's service: 1 as now, 2 frequent, 3 fast and frequent. Raised by a link project. | Trains: as now, frequent, fast and frequent / Trenau: fel nawr, aml, cyflym ac aml |
| **Stub** | A link end off the board (another council, Bristol, England), drawn at the map edge. Cannot be built on. | the place name, faded / enw'r lle |
| **Spread** (rule kind) | An effect that travels one hop along a link (rules S1 to S4). See ADR 0005. | "travelled along the line from X" in Why? / "teithiodd ar hyd y lein o X" |
| **Requires** (rule kind) | A condition that must hold before a project, tier or level opens. See ADR 0005. | "Needs: ..." on a locked project / "Angen: ..." |
| **Pair** | Two things worth more together, or a thing that goes wrong without its partner. | "Works better with", "Goes wrong without" / "Yn gweithio'n well gyda", "Yn mynd o chwith heb" |
| **Law** (board) | A Wales wide rule. Costs Backing somewhere, never coins. One change per election term. | law / deddf |
| **Group** | One of five kinds of people with a real share in each council (Everyone has a fixed weight, a game rule). Groups overlap. | Young adults, Older people, Families on low incomes, Welsh speakers, Everyone; "People can be in more than one group." / Oedolion ifanc, Pobl hŷn, Teuluoedd ar incwm isel, Siaradwyr Cymraeg, Pawb |
| **Mood** | One group's feeling in one council, 0 to 10, moving slowly. Shown only in words. | unhappy, uneasy, content, pleased / anhapus, anesmwyth, bodlon, hapus |
| **Backing** (Cefnogaeth) | A council's support for you, 0 to 10: the groups' moods weighted by real shares. Replaces Trust on the board. Always a game estimate. | "Blaenau Gwent does not back you (4 out of 10)"; never a percentage / "Nid yw Blaenau Gwent yn eich cefnogi" |
| **Election** (board) | In 2030, 2034, 2038, 2042 and 2046. A council backs you at 5 or more; you win with councils holding more than half the people. | Strong win, Win, Lost; "6 of 10 councils back you" / Buddugoliaeth gref, Ennill, Colli |
| **Weak hand** | Phase 1's B3: fewer coins for the term after a lost election. Applied while a model carries B3; rule P6's deal replaces it. Councils no longer refuse builds. | "You scraped back in with help from others" / "Fe ddaethoch yn ôl gyda help eraill" |
| **Hung term, deal** (rule P6, `Deal`) | After a lost election you govern with others: take one of two deals, each a council's weakest measure and a date. Kept or broken, it moves Backing. Package 9. | "You govern with others"; "The deal with {council}" / "Rydych chi'n llywodraethu gydag eraill" |
| **Purse** | The most coins held at once (B1 `purse_max`, package 8). Replaces phase 1's carry over cap, which is still judged every two years until then. | the purse is full / mae'r pwrs yn llawn |
| **Risk step** | A council's flood, coal tip or one-employer risk, 0 to 3. A game estimate seeded from real flags. | Flood risk: high / Perygl llifogydd: uchel |
| **Event** (board) | Data in `events.yaml`. Outside events come from the future's tracks, at most one in each two years, landing on a seeded step; grown events are triggered by the board when a year closes. Always warned ahead (E1 `warn_years`), with a place. An event that needs an answer holds the clock. | the same as v1's slips: a warning, then what happened / digwyddiad |
| **Forecast** | Every warned event not yet landed, each with its window of two steps and the councils most at risk. | "Heavy rain is likely over the Taff in the winter of 2031" / rhagolwg |
| **Future** | One of four hidden pressure patterns (weather, economy, prices) drawn from the game number, one value each two years. | revealed as the game goes: "The wet decades" / dyfodol |
| **Start** | What you were elected on: a promise, a free tier 1 project and who backs you first. | "What you were elected on" / "Beth y cawsoch eich ethol arno" |
| **Severity budget** | Every game number draws the same outside trouble (rule E1); only kind and timing differ. | not shown; the rule book says "every game carries the same weight of trouble" |
| **Ending** (`EndingDef`) | One of eight named Waleses picked from the shape of the 2050 board, with evidence lines. | "You built: The city and its bedrooms" / "Fe wnaethoch adeiladu: ..." |
| **The Wales not built** | The nearest ending the player's branches could have reached, shown as a ghost map. | "This could have been The joined-up valleys" / "Gallai hyn fod wedi bod yn ..." |
| **Frame** | The board at one moment; one each time a year closes (25 in a game), for moods, "four years ago", the time-lapse and then and now. | the time-lapse / treigl amser |
| **Run code** | `b2.`: the game number, the start, the step reached and the log, short enough to paste. Replays the same game. | Run code / Cod y gêm |
| **Contribution** | One recorded part of a change: step, year, council, quantity, size, rule, first cause and the link it travelled. When a year closes, its records fold into one per council, quantity, rule, cause and link. Every Why? is built from them, over a span of steps. | Why? / Pam? |
| **Chapter** (`ChapterDef`, `ChapterRecord`) | The name the game gives an election term, from `story.yaml`: the first by priority whose conditions held. "Holding on" when none fits. Package 9 and 10. | "Laying the ground", "The hung years" / pennod |
| **Moment, turning point** (`Moment`) | Something that happened that the story may weigh; the five heaviest are the turning points on the end screen. | the time line's pips; the turning points / eiliadau; troeon |
| **Honesty label** | Real, game estimate, game rule (and illustrative for placeholders). On every figure. | Real, Game estimate, Game rule / Go iawn, Amcangyfrif y gêm, Rheol y gêm |
| **Fixture** | The three council test model (Merthyr Tydfil, Rhondda Cynon Taf, Cardiff), board id `fixture`. Real seeds, illustrative links and numbers. Never shown as the real board. The second fixture board, `fixture-two` (Rhondda Cynon Taf and Cardiff, two map groups), proves the engine assumes no one board. | not shown |
