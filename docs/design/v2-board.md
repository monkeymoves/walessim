# The board: a design for the bigger game (v2)

*Written 27 November 2026, for agents building overnight. Decisive on purpose: one recommendation per question. Numbers marked (tune) are starting values for the balance bots in section 13. Numbers marked (data) must come from the pipeline with a source in `model/sources.yaml`, never from this page. This file governs the new board route only. v1 (`#/yfory`) is not changed by anything here.*

*Code names in this file: **the board** is the new game, at route `#/bwrdd`. A **council** is one of the 22 local authorities. A **project** is something the player builds in a council. A **link** is a real connection between two councils. A **turn** is two years.*

## 1. The pitch and the pillars

**The pitch.** You run a Wales made of real places, and you play on the map, not on seven bars. What you build in one council stays there, grows, and travels down real railways, rivers and commutes to its neighbours. In 2050 the map is your result: one of several clearly different Waleses, shown as a time-lapse and judged in a letter from someone who lives in it.

**Five pillars.**

| # | Pillar | In one line |
|---|---|---|
| P1 | **The map is the board** | Every action has a place. Every council has its own state, seeded from real figures. The player looks at the map nine tenths of the time. |
| P2 | **What you build stays and grows** | Projects are permanent, level up, pay back into the budget, and open later tiers. Early choices change what is possible later. |
| P3 | **Places are joined up** | Effects travel along three kinds of real link: commuting, rail and rivers. Where you build matters as much as what. |
| P4 | **People answer back** | Each council backs you or does not, for reasons you can read. Elections are won council by council on the map. |
| P5 | **A different Wales every game, and an honest one** | Starts, futures and events vary on purpose, events grow from the board, and every figure is labelled real, game estimate or game rule. |

## 2. Why v1 is samey, and what fixes it

The coordinator's diagnosis is right as far as it goes. Three causes sit under it, and they matter more than the list of missing features.

| Cause | What it does in v1 | Fixed by |
|---|---|---|
| **A. The average eats the difference.** 22 councils are averaged into 7 bars, then into 2 scores, then into the weaker of the two, then into 5 bands tuned to sit between about minus 4 and plus 4. | Whatever the player does, the result lands in the same narrow band. Two very different games read "a little worse than you found it". | P1, P5. The result is a picture of 10 (later 22) councils and a named ending chosen from the shape of the board, not only its level. Bots must show a wide spread (section 13). |
| **B. A hand of cards is a reaction, not a plan.** Five random cards, play three. | The player cannot hold a strategy for more than one turn, so no game has a character. | P2. A build menu that is always open, limited by coins and by what earlier builds have unlocked. |
| **C. Nothing feeds itself.** Every card is a one-off push against a slow drift, with a repeat penalty. | No snowball, no "my early choice made this possible", no regret. | P2, P3. Levels, pairs, a budget that grows with what you built, and tiers. |
| **D. Place is a label.** A card picks one of four regions and is one size stronger there. | Where never matters. The map is a backdrop. | P1, P3. Ten council targets with different needs, and links that carry effects. |
| **E. Events are a fixed list.** Twelve slow changes drawn from a seed. | By the third game the player has seen them all, and they are not about what the player did. | P5. Events are picked by the state of the board and land on a named council. |
| **F. Trust is a tax on card count.** | It is felt as a cap that wastes coins (playtest 7, item 5), not as people. | P4. Backing per council, with named groups and reasons. |

Where this design departs from the coordinator's list:

- **Agreed and central:** councils as the board (1), compounding and a tree (2), events from state and varied starts (3), many places over time (5).
- **Changed:** people groups (4) are kept small. Backing is held per council, because that is what the map can show. Groups explain the backing. They are not a second simulation.
- **Promoted:** the time-lapse and the named ending are not extras in item 6. They are the payoff that answers "is anything materially different?", so they are in the prototype.
- **Cut for now:** sound and the sandbox. Run codes are nearly free with a seeded engine and are in.
- **Added:** the action model changes from a dealt hand to a build menu, and the turn shortens to two years. Without those two, the rest is v1 with more panels.

**What makes two games materially different.** Five things, each measurable by a bot test:

1. **Which keystones stand in 2050.** There are four branches. Coins and time allow about two to be finished (tune, and tested). Six pairs, plus going broad, plus drifting.
2. **Where people live and work.** Young adults move along links towards work and homes. One game ends with busy valley towns. Another ends with the valleys as bedrooms for Cardiff.
3. **The shape of fairness.** The gap between the best and worst council can close or open while the Wales average rises either way.
4. **What the map looks like.** Projects, rail upgrades, woods and wetlands are drawn on the paper map and stay.
5. **Who backs you and who gave up on you.** The letter comes from the council that changed most, for better or worse.

## 3. The core loop at three timescales

**What the player looks at most: the map.** The seven national bars shrink to a thin strip. The largest thing on screen is the region, coloured by one measure at a time, with every project drawn on it and the links visible as lines. Every decision starts with a click on a council.

| Timescale | What happens | Feeling aimed for |
|---|---|---|
| **A minute (one decision)** | Look at the map coloured by a measure. Spot a weak council. Click it. Read its six bars, what it is linked to and what it is asking for. Open the build menu there. Hover a project: the map draws where its effect will travel (lines light up towards the neighbours it reaches) and the council's bar shows a dotted preview. Place it. It appears on the map as "being built". | "I chose that place for a reason." |
| **A turn (two years, about 70 seconds)** | 1. **Forecast:** one warned event with its place ("Heavy rain is likely over the Taff. Merthyr Tydfil and Rhondda Cynon Taf are most at risk."). 2. **Build:** spend coins on one to three projects or upgrades, or change a law. 3. **Two years pass:** projects finish, effects spread along links with a visible pulse, the warned event lands or passes. 4. **Report:** three lines at most, each tied to a council, each with Why?. Every second turn ends with an **election**: the map colours by who backs you. | Tension between the fire in front of you and the plan you are building. |
| **A game (12 turns, 2026 to 2050, about 15 minutes)** | Turns 1 to 3: read the board, pick a first branch, see the first spread. Turns 4 to 8: second tier opens, the budget starts to grow from what you built, events test the weak spots, an election is at risk. Turns 9 to 12: commit to keystones or spread thin, because a keystone started after 2042 will not be finished. 2050: the time-lapse, the named Wales, the letter. | "That was my Wales, and I can see the one I did not build." |

Two-year turns are a deliberate change from v1's four. Twelve short turns give more decisions, let builds take one, two or three turns, and make the real four-year elections a beat inside the game, not the turn itself.

## 4. The board

### 4.1 Council state

Each council holds six measures, each a score out of 10, plus a small set of quantities. The names match v1's plain goal names so the two games speak one language.

| Measure (player sees) | Seeded from these real indicators (ids in `model/indicators.yaml`) | Notes |
|---|---|---|
| **Work and pay** | `employment`, `earnings`, `jobs_density`, `level4` | `jobs_density` is what separates a jobs centre from a commuter town. |
| **Homes and community** | `affordability`, `poor_housing`, `social_housing`, `temp_accommodation` | |
| **Health** | `healthy_life_exp`, `premature_deaths` | |
| **Nature and floods** | `flood_exposure`, `river_good_status`, `woodland_cover` | |
| **Welsh and culture** | `welsh_speakers`, `welsh_medium_pupils` | In the South East the story is growth through schools, and the data shows it. |
| **Climate** | `emissions_head`, `home_energy_efficiency`, `drive_to_work` | |

All of these have 2026 era values for all ten South East councils in `model/data/la-indicators.json` (checked on the writing date).

**Seeding rule.** Each indicator is turned into 0 to 10 with a reference band, as v1 does (`model/bands.yaml`). Where v1 has no band for an indicator, the board uses the lowest and highest of the 22 Welsh councils pushed out by a tenth, stored in `model/board/bands.yaml` and labelled "compared with the rest of Wales". A measure's 2026 score is the plain mean of its indicators' scores. The data is never adjusted to make a nicer start.

**Fairness** is not a council measure. It is a Wales level reading: the gap between the mean of the three lowest councils and the middle council, across all six measures. It is shown on the strip and drawn on the map as a "who is behind" colouring.

**Other council quantities.**

| Quantity | Real or modelled | Seed |
|---|---|---|
| People, and the share who are young adults and aged 65 and over | Real in 2026, **game estimate** after | `pop`, `young_adults`, `age65` |
| Backing (0 to 10) | **Game estimate** from the start. There is no real figure for this and none is implied | A game rule sets every council to 5 in 2026, then the chosen start nudges it |
| Projects standing here, each with a level 1 to 3 and a state (being built, working, run down) | Game state | None in 2026. Real existing things are in the measures already |
| Risks: flood risk step, coal tip risk step, one-employer risk step (each 1 to 3) | **Game estimate**, seeded from real flags | `flood_exposure`, the `coal_valley` flag and tip proxies, `jobs_density` with `enterprises_10k` |

After 2026 every score is a game estimate. The 2026 real figures stay one click away for the whole game, unchanged, and the panel always shows both: "Real figure, 2025: 74 in 100 in work. Game estimate for 2038: Work and pay 6 out of 10."

### 4.2 Links

Three kinds, all real. Housing markets are not a fourth kind: house price pressure rides the commuting links in reverse, which is how it works in life.

| Link | What it is | Data | Honesty note |
|---|---|---|---|
| **Commuting** | For each pair of councils, the share of workers living in A who work in B | Census 2021 origin and destination workplace table at local authority level, via Nomis (data, pipeline agent to confirm the table id and the Open Government Licence). | Census 2021 fell in a lockdown. ONS advises caution on travel to work. The source card says so. |
| **Rail** | Which councils each passenger line joins, in order | Derived at build time from `model/data/wales-rail.json` (OpenStreetMap, ODbL) crossed with the council outlines in `public/data/wales-geo.json` | A link means "a line with stations runs between them", not a timetable. |
| **River** | Which council is upstream of which, per named river | Authored in `model/board/links.yaml` from OS Open Rivers and the Natural Resources Wales catchment maps: Taff (Merthyr Tydfil to Rhondda Cynon Taf to Cardiff), Rhymney (Caerphilly to Cardiff), Ebbw (Blaenau Gwent to Caerphilly to Newport), Afon Lwyd (Torfaen to Newport), Usk (Monmouthshire to Newport), Ely (Rhondda Cynon Taf to Vale of Glamorgan and Cardiff), Ogmore (Bridgend). Each row carries `to_check: true` until the data agent confirms it against the source. | Rivers cross council lines untidily. The link is a direction, not a flow figure. |

If the commuting table cannot be confirmed as open in the time available, the fallback is fixed and labelled: commuting links exist only where a rail link or a shared border exists, with three strength steps set from `jobs_density` (a game estimate, said plainly). The engine reads the same file shape either way.

Links to councils outside the prototype (Neath Port Talbot, Powys, Bristol and the English border) are shown as stubs at the edge of the map. They carry a fixed outside flow and cannot be built on.

### 4.3 How effects spread

Four rules, each a rule card in `model/board/rules/spread.yaml`, each shown in Why? as one sentence.

| Rule | Plain sentence | Mechanism |
|---|---|---|
| **S1 Jobs travel home** | "New work in Cardiff also lifts Work and pay in the places its workers come from." | A rise in Work and pay in B that comes from new jobs raises A by that rise times the real commuting share from A to B, times the link quality (tune). |
| **S2 Prices travel up the line** | "When a place booms, homes get dearer along the lines into it." | A rise in Work and pay in B lowers Homes and community in A by a smaller factor times the same share, unless A has built homes. |
| **S3 Young people follow work and homes** | "Young adults move towards places with work they can reach and homes they can afford." | Each turn a small share of young adults moves along commuting and rail links from lower to higher (Work and pay plus Homes and community). A council that loses them loses Work and pay and Welsh and culture over time. |
| **S4 Water runs downhill** | "What is done upstream is felt downstream." | Nature and floods projects upstream cut the flood risk step downstream one turn later. Storm events start upstream and pass down the river, weakened or not by what is in the way. |

Rail is not a fifth rule. A rail upgrade raises the **quality** of a link (1 as now, 2 frequent, 3 fast and frequent), which multiplies S1 and S3 on that link and lifts Climate at both ends. That is why the same upgrade can save a valley (with jobs and homes there) or empty it (without).

Kept small on purpose: one hop only. An effect reaches direct neighbours on a link and stops. The player can always trace a change to "your project in X, along link Y". Two hop chains happen across turns, not inside one.

## 5. Player actions

### 5.1 What you place, where, at what cost

| Action | What it is | Limits |
|---|---|---|
| **Build a project** | Place a project in a council. Costs coins now, takes 1 to 3 turns to build, then works for the rest of the game. | One of each project per council. Some need a feature (a rail line, a river, coal tips, a coast). |
| **Upgrade a project** | Raise it from level 1 to 2 to 3. | Level 2 needs tier 2 of its branch. Level 3 needs tier 3. |
| **Upgrade a link** | Raise a rail link's quality. Placed on the line between two councils. | Belongs to the Joined-up valleys branch. |
| **Pass or change a law** | A Wales wide rule (for example a visitor levy, a local homes rule, a planning rule for flood plains). | One law change per election term. Laws cost backing somewhere, never coins. |
| **Answer an event** | Choose one of two or three responses when an event lands. | Section 7. |
| **Visit a place** | Zoom into a council's place and settle a local dilemma. | One per turn. Section 9. |

**Coins.** 6 a turn at the start (tune). The budget grows: plus 1 coin a turn for every 4 points of Work and pay gained across the board since 2026 (tune), and standing projects that cut bills (health, flood safety) remove running costs. Some projects have a running cost of 1 coin every second turn. Unspent coins: up to 2 carry over, as in v1. No pound signs anywhere.

**There is no card cap.** Backing no longer limits how many things you do. It decides elections and whether a council says yes to big builds (section 6).

### 5.2 Three ways things compound

1. **Levels.** A level 2 project gives more than twice level 1, once it has had time to bed in.
2. **Pairs.** Data in `model/board/pairs.yaml` names combinations that are worth more together, and combinations that go wrong apart. A skills college with a frequent rail link to a jobs centre: "people here can reach the work". A skills college with neither jobs nor a link: young adults qualify and leave (v1's rule R21 side effect, now visible on the map).
3. **Payback.** Work and pay grows the budget. Flood works cut what a storm costs. Health projects cut the care bill that otherwise takes a coin from 2038. A player who invests early has more coins late.

### 5.3 The tree: four branches for the prototype

Each branch has three tiers. Tier 2 opens when three tier 1 projects of that branch are working anywhere on the board. Tier 3 (the **keystone**) opens when two tier 2 projects are working, and takes 3 turns to build, so it must be started by 2042. Costs are in coins (tune).

**Branch 1: Joined-up valleys** (rail, towns and reach)

| Tier | Project | Welsh example | What it does |
|---|---|---|---|
| 1 | Frequent trains on a valley line (link upgrade, 3 coins) | The Treherbert, Aberdare and Merthyr lines into Pontypridd and Cardiff. The Ebbw Vale line through Newbridge to Newport. | Link quality 1 to 2. S1 and S3 run stronger both ways. |
| 1 | Buses that meet the trains (2) | Maerdy to Porth. Blaenavon to Pontypool. | Lifts Health and Work and pay in the council. Has a running cost. |
| 2 | Station quarter (4) | Homes, a health centre and workspace by the station in Pontypridd, Bargoed or Ebbw Vale. | Lifts Homes and community and Work and pay. Blocks most of S2 in that council. |
| 3 | **Keystone: Work comes up the line** (7) | Public bodies and firms take offices in valley towns, on fast lines. | Reverses the commute on upgraded links: jobs_density rises in the valley councils, and S1 now pays Cardiff's neighbours first. |

Without tier 2 and 3, tier 1 alone makes the valleys better bedrooms for Cardiff: Work and pay up, young adults gone, Welsh and culture and Homes and community flat. That is a real ending, not a failure state.

**Branch 2: Made here** (skills and firms that stay)

| Tier | Project | Welsh example | What it does |
|---|---|---|---|
| 1 | Skills college and apprenticeships (3) | Merthyr Tydfil, Nantgarw, Ebbw Vale, Newport. | Lifts `level4` side of Work and pay after 2 turns. Needs jobs within reach, or S3 turns against it. |
| 1 | Back local firms (2) | Public bodies in Caerphilly and Torfaen buy from firms nearby. | Small, steady Work and pay. Lowers the one-employer risk step. |
| 2 | Community-owned energy (3) | Hill wind and hydro above the Cynon and Rhymney valleys, income kept locally. | Climate and Homes and community. Adds 1 coin every second turn at level 2. |
| 3 | **Keystone: A cluster that roots** (7) | Semiconductor and advanced manufacturing work around Newport and Caerphilly. Steel and its supply firms around Newport. | Large Work and pay where placed, spread by S1. Will not leave in a downturn if two colleges feed it. |

The shortcut "Land a big employer" stays as a tier 1 project that works at once and raises the one-employer risk step. It is the tempting quick win, and events find it.

**Branch 3: Living landscape** (tips, water and woods)

| Tier | Project | Welsh example | What it does |
|---|---|---|---|
| 1 | Make coal tips safe (4) | Tylorstown, Maerdy, Bedwas, the tips above Aberfan's neighbours. | Tip risk step down. Opens the Rhondda place visit. |
| 1 | Slow the water upstream (2) | Wet woodland and leaky dams in the Taff, Cynon and Ebbw headwaters. | Flood risk step down downstream (S4), a turn later. |
| 1 | Wetlands on the coast (3) | The Gwent Levels between Newport and Cardiff. | Nature and floods in Newport and Monmouthshire. Blocks some building land. |
| 2 | Valleys regional park (4) | Linked uplands from Blaenavon to Maesteg, with paths from the towns. | Health and Nature and floods in every coal valley council that has a tier 1 project. |
| 3 | **Keystone: Rivers given room** (7) | The Taff from Merthyr to Cardiff, the Usk at Newport. | Storm events lose one severity step on that river for good. Frees coins that storms would have taken. |

**Branch 4: Good homes, strong communities** (homes, health and Welsh)

| Tier | Project | Welsh example | What it does |
|---|---|---|---|
| 1 | Warm the terraces (3) | The stone terraces of the Rhondda, Abertillery and Bargoed. | Health and Climate after 2 turns. Jobs while it builds. |
| 1 | Social homes (3) | Homes for rent in Cardiff, Newport, Barry, Cwmbran. | Homes and community. Counters S2. |
| 1 | Welsh-medium school (2) | A new primary in Merthyr Tydfil, Torfaen or Newport, where few are offered now. | Welsh and culture, slowly (3 turns). Families stay. |
| 2 | Health close to home (4) | Health and care hubs in Tredegar and the valley towns. | Health. Removes the care bill from 2038 if four councils have one. |
| 3 | **Keystone: Heat and homes for all** (7) | Heat networks in Cardiff and Newport. Every cold home treated in the valleys. | Large Health, Climate and Fairness. The gap between councils closes fastest on this route. |

The full game adds two branches that need the rest of Wales: **Y Fro Gymraeg** (language, housing and work in the West and North, reusing Bethesda) and **Coast and power** (ports, offshore wind, grid, and retreat from the sea).

### 5.4 How strategies diverge by 2050

About 90 coins arrive over 12 turns for an average player (tune). One branch taken to its keystone at good coverage costs about 40. So two keystones are reachable, three is the ceiling for excellent play, and four must be impossible (a bot test). The named endings, held as data in `model/board/endings.yaml` and picked from the state of the board:

| Ending | The board in 2050 | Typical route |
|---|---|---|
| **The joined-up valleys** | Work comes up the line stands. Young adult share held or up in the valley councils. Gap closed. | Branches 1 and 4, or 1 and 2 |
| **The city and its bedrooms** | Lines upgraded, no keystone. Cardiff and Newport high, valleys emptied of young adults. Wales average up, gap wider. | Tier 1 of branch 1, employers in the cities |
| **The workshop** | A cluster that roots stands. Work and pay high in the east. Nature and floods and Climate behind. | Branches 2 and 1 |
| **The green valleys** | Rivers given room stands. Storms pass. Health up. Work and pay modest. | Branches 3 and 4 |
| **The warm country** | Heat and homes for all stands. Smallest gap of any ending. Budget stayed small. | Branch 4 deep, a little of 3 |
| **Two countries** | Any keystone, but the three lowest councils are lower than in 2026. | Any route that ignores Blaenau Gwent, Merthyr Tydfil and Torfaen |
| **The patchwork** | No keystone. Many tier 1 projects. A little better everywhere. | Going broad |
| **The drift** | Little built. Risks landed. Worse than 2026. | Autopilot, or only reacting to events |

Each ending has its own letter set, its own picture (the map itself), and three evidence lines generated from the board ("Ebbw Vale has more young adults than in 2026. Cardiff's homes are dearer. The Taff has not flooded Pontypridd since 2038.").

## 6. People, backing and elections

**Trust is replaced by Backing.** Trust in v1 was one national number that capped cards. Backing is held per council, shown on the map, and explained by groups.

**Groups.** Five, each with a real share in every council, two things they care about, and plain names. Groups overlap, and the screen says so: "People can be in more than one group."

| Group | Real share from | Cares most about |
|---|---|---|
| Young adults | `young_adults` | Work and pay they can reach. Homes and community. |
| Older people | `age65` | Health. Buses and services close by. |
| Families on low incomes | `income_deprivation` | Homes and community (warmth and rent). Work and pay. |
| Welsh speakers | `welsh_speakers` | Welsh and culture. Young people being able to stay. |
| Everyone | a fixed base weight (a **game rule**, labelled) | Whatever fell most in the last four years. Promises kept. Crises handled. |

**How backing moves.** Each turn, each group in each council compares the measures it cares about with four years ago and with the Wales middle. Better pulls its mood up, worse pulls it down, with a memory so it moves slowly. A council's Backing is the mean of its groups' moods weighted by their real shares. Events handled well, promises kept and a good place visit add to it. Being passed over (no project within reach for 8 years) takes from it. All weights are game rules and are in the rule book as such.

**What the player reads.** Click a council: "Blaenau Gwent does not back you (4 out of 10). Young adults: unhappy. Work they can reach has not improved. Older people: content. The health hub opened in 2032." Never a percentage, never a poll figure, always tagged "game estimate".

**Elections.** In 2030, 2034, 2038, 2042 and 2046 (the real Senedd calendar). A council backs you at 5 out of 10 or more. You win if the councils that back you hold more than half the people (real 2026 population shares, labelled). The election screen is the map, coloured council by council, with a count: "6 of 10 councils back you. They hold 58 in 100 of the people."

| Result | What it means for the next four years |
|---|---|
| **Strong win** (two thirds of people or more) | One extra law change. Councils that back you build one turn faster. |
| **Win** | Nothing changes. |
| **Lost** | You carry on with a weak hand: 2 fewer coins a turn, no law changes, and councils that do not back you refuse new projects that cost 4 or more. Plain words: "You scraped back in with help from others. For 4 years you have less to spend, and places that did not back you will not take big builds." |

No game over and no stand-in turn. A lost election is felt on the map: the places you neglected now shut you out, which makes neglect a spatial problem the player has to repair, not a number.

No parties, no named politicians, no real poll figures (project rule).

## 7. Events, scenarios and starts

### 7.1 Events that grow from the board

Events are data in `model/board/events.yaml`. Each has a **trigger** (a condition on board state), a **target rule** (which council), a **warning** (always one turn ahead, on the forecast), a **size** that depends on what stands there, and two or three **responses**.

| Kind | Example | Trigger | Target |
|---|---|---|---|
| Pressure from outside | Storm winter on a named river | The future's weather track (seeded) | The upstream council with the highest flood risk step, then downstream by S4 |
| Pressure from outside | Downturn | The future's economy track | Councils with the highest one-employer risk step |
| Grown from your board | A tip moves | Tip risk step 3, wet turn, tip not made safe | That council. Opens the Rhondda visit if it is Rhondda Cynon Taf |
| Grown from your board | The big employer leaves | "Land a big employer" standing, downturn, no college within one link | That council, and S1 in reverse to its commuters |
| Grown from your board | Buying rush up the line | Link quality raised, no homes built at the valley end | The valley end: Homes and community down, young adults out |
| Grown from your board | The school is full | Welsh-medium school working, Welsh and culture rising | A good event: offers a cheap second school or a Welsh-medium secondary |
| Grown from your board | A firm wants to grow here | College working, frequent link, Work and pay rising | A good event: a discount on a branch 2 project there |
| Grown from your board | The surgery closes | Health low, older share high, no bus project | That council: Backing of older people falls |

About 24 events in the prototype (tune): 8 from outside, 16 grown, of which 5 are good news. A player who builds one way meets different events from a player who builds another, because the triggers read the board.

### 7.2 Starts and futures

**The start is always the real Wales of 2026.** The data is never shuffled. What varies:

| Thing | Options in the prototype | Effect |
|---|---|---|
| **What you were elected on** (the player picks 1 of 3 at the start) | "Work in the valleys", "Warm, safe homes", "Ready for the weather" | A promise to keep by 2034, a head start (one free tier 1 project of that kind), and which councils back you first |
| **The future** (drawn from the game number, not shown at the start) | "The wet decades", "Work rewritten", "The squeeze" (energy and money tight), "Quiet years" | Sets the weather, economy and price tracks that outside events are drawn from. The forecast reveals it a turn at a time |

Three starts times four futures gives twelve set-ups before the player has done anything, and the grown events multiply that by what the player builds.

### 7.3 The fairness rule

Luck is allowed to change the story. It is not allowed to decide the result alone. Five rules, each with a test:

1. **Everything is warned.** No event lands without appearing on the forecast one turn ahead with its place named.
2. **Every future carries the same weight of trouble.** Each outside event has a severity in points. Every game number draws between 9 and 11 severity points in all (tune). Only the kind and the timing differ.
3. **Preparation always bites.** Every outside event has at least two tier 1 projects that cut it by half or more.
4. **Same game number, same choices, same game.** All chance comes from the game number through the seeded generator.
5. **The test that matters:** for any one strategy, the spread of results across game numbers (10th to 90th percentile) must be smaller than the gap between a skilled player and autopilot. Section 13 sets the numbers.

## 8. Scoring and the end

**Kept from v1:** two scores, Life in your years and Left for 2050, and the rule that the result is the weaker of the two, said in one line from turn 1: "Your result is the lower of these two. Spending the future to look good now does not win."

**Changed:**

- Both scores are built from council measures, weighted by people, on the 0 to 100 scale already used. **Life in your years** is the mean over the 12 turns. **Left for 2050** is the 2050 board plus what standing projects will still deliver by 2058, less debts, run-down projects and risk steps left at 3.
- **Fairness counts in both.** A quarter of each score (tune) comes from the three lowest councils alone, so a Wales that leaves places behind cannot score as well as one that does not.
- **The band is wide.** v1 tuned outcomes into about 8 points. The board must spread autopilot and skilled play by at least 15 points (section 13).

**The end screen, in order:**

1. **The time-lapse.** The map from 2026 to 2050 in about 15 seconds: projects appearing, lines thickening, young adults flowing as dots along links, storms passing down rivers, councils changing colour. Reduced motion shows six still frames. This is the picture of the Wales the player built.
2. **The name.** "You built: The city and its bedrooms." Three evidence lines from the board, each with Why?.
3. **Then and now.** Two small maps side by side, 2026 real and 2050 estimate, with a measure picker. The three most changed councils are called out.
4. **The result.** One sentence in the five plain bands ("You left this part of Wales a little better than you found it"), the two scores, which was the lower, and the same Wales on autopilot.
5. **The letter**, from the council that changed most, naming a project, a year and a place. One letter set per ending, variants by which score was lower.
6. **The Wales you did not build.** One line and a ghost map from a different ending, chosen as the nearest one the player's branches could have reached: "With homes at the valley end of your lines, this could have been The joined-up valleys." This is the play again hook.
7. **Run code** and Play again. The code is the game number plus the list of actions, short enough to paste. Opening a code replays the time-lapse for anyone.

## 9. Places

**The rule:** every council can zoom into one place with one local dilemma. A visit is offered when the player builds a project there that names the place, or when an event lands there. One visit a turn. The result is a grade (badly, OK, well, very well) that scales that project in that council and moves Backing there. Place counts are never added into Wales figures (ADR 0004 stands).

**Three board templates**, so new places are content, not code:

| Template | The decision | First used by | Reuse |
|---|---|---|---|
| **T1 Which first** | Too many things, three picks, three tests | The Rhondda: which coal tips to make safe | `src/ui/place/Rhondda.tsx`, `gradeRhondda` in `src/engine/places.ts`, `src/engine/place-analysis.ts`, `model/places/rhondda.yaml`, `model/data/places/rhondda.json`, all as they are |
| **T2 Who is it for** | Ten options with flags, three picks, three tests | Bethesda: who the quarry is for | `src/ui/place/Bethesda.tsx`, `gradeBethesda`. Returns with the North in the full game |
| **T3 One hard choice** | Two or three options on the zoomed council map, each with a named gain and a named loss. No bespoke map data | New. A light place | New small component, `src/board/ui/place/LightPlace.tsx` |

**Prototype places (three):**

1. **The Rhondda** (Rhondda Cynon Taf), T1, reused whole. Triggered by Make coal tips safe or by a tip event. The wet turn flag comes from the future's weather track.
2. **Ebbw Vale** (Blaenau Gwent), T3. "The trains are frequent now. What is the station for?" Homes by the station for local rent, or workspace for firms, or a park and ride for commuters to Newport. Each feeds a different branch and a different S3 outcome.
3. **The Gwent Levels** (Newport), T3. "Room is short between the city and the sea." Wetland and flood room, or homes and a works on the levels behind a wall, or a split that does each less well.

**Later places, in order:** Port Talbot (steel and after), Bethesda (reused), Fairbourne or the Conwy coast, Blaenau Ffestiniog, Cardiff (heat and growth), Ceredigion, Newtown and the Severn headwaters. The aim for the full game is one place in each of the 22 councils, most of them T3.

## 10. Real data and honesty

Three labels, used everywhere, with the same words each time:

| Label | Means | Examples |
|---|---|---|
| **Real** | A published figure with a source and a year in `model/sources.yaml` | Every 2026 indicator, council populations, commuting shares, which councils a rail line joins |
| **Game estimate** | Worked out by the game's rules from real starting points. "Not a forecast." | Every measure after 2026, moves of young adults, risk steps, Backing, both scores |
| **Game rule** | A design choice with no evidence behind its size | Coins, costs, tier gates, the base weight for Everyone, the election line, event severities |

Rules:

- The start is real and is never altered. The build fails if any seeded indicator lacks a source or a value for a council in play.
- Every rule is a card under `model/board/rules/` with kind, parameters with ranges, sources, confidence and evidence grade, as ADR 0002 requires. Spread strengths are mostly "a rough guess" and say so.
- Two new rule kinds are needed: `spread` (an effect travels along a link) and `requires` (a project or tier needs something standing). ADR 0002 says a new kind needs an ADR, so the contract agent writes ADR 0005 for them and ADR 0006 for two-year turns and per-council state on the board route.
- The rule book gains a "The board" section listing measures and what seeds them, links and their sources, every rule, every project, every event trigger and every ending rule. Each Why? ends at a rule page.
- Projects and examples name real places and real kinds of thing. They do not name current schemes, parties or living politicians, and no project claims a real body has agreed to anything.
- Example lines ("Picture it") and voices keep the tag "an example" or "a made-up voice".
- No ensemble of runs in the prototype. The board runs once per turn at default parameters and says "about". Uncertainty returns when the rules have settled.
- All player text follows `plain-wales.md`: reading age 11, sentences of 18 words at most, years not counts, no retired words, no em or en dashes. Welsh is written fresh and carries `cy_review: true`.

## 11. The one-region prototype

**South East Wales, 2026 to 2050, at `#/bwrdd`.** Ten councils: Bridgend, Vale of Glamorgan, Cardiff, Rhondda Cynon Taf, Caerphilly, Blaenau Gwent, Torfaen, Monmouthshire, Newport, Merthyr Tydfil. Twelve two-year turns, five elections, about 15 minutes. Buildable by six agents in about a day. v1 stays live and untouched at `#/yfory`.

### 11.1 In and out

| In | Out (later) |
|---|---|
| Ten councils with six measures, people, Backing, risks | The other 12 councils (shown as paper with stub links) |
| Commuting, rail and river links, rules S1 to S4 | Two hop spread, roads, energy grid |
| 16 projects in four branches with three tiers and four keystones | Branches 5 and 6, laws beyond 3 simple ones |
| Levels 1 to 3, about 8 pairs, the growing budget | Borrowing and deferred repairs (v1's standing tickets) |
| 5 groups, Backing, five elections, the weak hand after a loss | Promises beyond the starting one |
| About 24 events, 4 futures, 3 starts, the fairness rule | Events with place visits beyond the Rhondda |
| Three places: the Rhondda (reused), Ebbw Vale and the Gwent Levels (light) | Bethesda, bespoke maps for new places |
| 8 endings, time-lapse, then and now, the letter, the Wales you did not build, run code | Daily game, sharing images, sound, sandbox |
| Why? on every change, the rule book section, English and draft Welsh | The 200 run ensemble, parameter sliders for board rules |
| A four note first turn guide | A full tutorial |
| Desktop and tablet landscape | Phones |

### 11.2 Data it uses

| Data | File | Status |
|---|---|---|
| 22 real indicators for the six measures and people (section 4.1) | `model/data/la-indicators.json` | Exists, all ten councils covered |
| Reference bands | `model/bands.yaml`, plus new `model/board/bands.yaml` | Part exists |
| Council outlines, relief, towns | `public/data/wales-geo.json` | Exists |
| Rail lines and stations | `model/data/wales-rail.json` | Exists. Link table derived by a new build step |
| Commuting shares | new `model/data/board-commute.json` from a new `pipeline/board/commute.py` | To fetch. Fallback in 4.2 |
| River order | new `model/board/links.yaml` | To author and check |
| The Rhondda place | `model/places/rhondda.yaml`, `model/data/places/rhondda.json` | Exists |
| Council flags (coal valley, coast, city, port) | `model/authorities.yaml` | Exists |

### 11.3 Engine modules

All under `src/board/engine/`. Pure TypeScript, no DOM, no Solid, no `Math.random`. Seeded through `src/engine/rng.ts` (imported, not copied, not edited). Deterministic for a game number and a list of actions.

| File | Does |
|---|---|
| `types.ts` | Every shared type: `BoardModel`, `BoardState`, `CouncilState`, `Action`, `TurnReport`, `Why`, `Ending` |
| `api.ts` | The only file the UI imports (section 12) |
| `seed.ts` | 2026 council state from indicators and bands |
| `turn.ts` | The order of a turn: builds finish, project effects, spread, people move, events, backing, budget, report |
| `projects.ts` | Legal actions, costs, build time, levels, pairs, tier gates |
| `spread.ts` | S1 to S4 along links |
| `people.ts` | Groups, moods, Backing, elections |
| `events.ts` | Futures, forecast, triggers, targets, responses, the severity budget |
| `budget.ts` | Coins, running costs, payback, carry over |
| `score.ts` | The two scores, fairness share, autopilot comparison |
| `endings.ts` | Picks the ending and its evidence lines from `endings.yaml` |
| `explain.ts` | Records a contribution for every change and builds the Why? chain |
| `runcode.ts` | Encode and decode game number plus actions |
| `places.ts` | Thin adapter that calls v1's pure `gradeRhondda` and grades T3 places |
| `bots.ts` | The strategy bots of section 13 |

Rules as data, all under `model/board/`: `measures.yaml`, `bands.yaml`, `links.yaml`, `rules/spread.yaml`, `rules/people.yaml`, `rules/budget.yaml`, `projects.yaml`, `tree.yaml`, `pairs.yaml`, `laws.yaml`, `groups.yaml`, `events.yaml`, `futures.yaml`, `starts.yaml`, `endings.yaml`, `letters.yaml`, `places/ebbw-vale.yaml`, `places/gwent-levels.yaml`, `game.yaml`. Text in `model/i18n/{en,cy}/board.json`. Compiled by `scripts/build-board-model.ts` to `public/board-model.json`.

### 11.4 Screens

| Screen | What is on it |
|---|---|
| **Start** | The South East map. One line of pitch. Pick what you were elected on (three paper cards). Start. |
| **The board** (the main screen) | Map, large, centre. Top strip: year, coins, the two scores, six small Wales bars plus Fairness, councils backing you. Left: the forecast slip. Right: the council panel when one is selected (six bars, real figures, links in and out, groups and backing, projects here, Build here). Bottom: the timeline of 12 turns with election marks and builds in progress. A "Colour the map by" picker including Backing and "who is behind". A Tree button opens the four branches as one sheet. |
| **Build menu** | Opens from a council. Projects grouped by branch, locked ones shown with what they need. Hover or focus: preview on the map (lines light to the councils the effect reaches) and on the bars. |
| **Two years pass** | The map plays the turn: builds finish, pulses travel along links, the event lands. About 5 seconds. Skippable. |
| **Report** | Three lines at most, each a council and a cause, each with Why?. An event response sheet when one lands. |
| **Election** | The map by backing, the count, the result, what it means. |
| **Place** | The Rhondda board (reused) or a light place sheet. |
| **End** | Section 8. |

### 11.5 Reused from v1, without editing it

| Thing | How |
|---|---|
| Map renderer `src/map/` | `PaperMap` as is: `setLens` for colouring, `focusLas` to frame the South East, `setHighlight`, `setSelected`, `setStitches` for projects, `setMarkers` for events, `setLayers({ rail })`. One additive method is needed, `setLinks(links)`, to draw and pulse link lines. Additive only, owned by one agent, no change to existing calls. |
| Place visits | The Rhondda component, grading and data, through an adapter |
| i18n | `src/i18n/` lookup, new `board.json` files, the copy test extended to read them |
| Look | `docs/design/design-system.md`, `tokens.css`, `src/ui/parts/` (PaperSheet, Buttons, SourceTag, Tooltip, Notice, LangToggle, Icon) |
| Atlas pieces | `src/ui/atlas/PlacePanel.tsx` formatters and `ramps.ts` for real figures and colour ramps |
| Rule book | New section fed by the board model, using `src/ui/book/` page parts |
| Seeded generator | `src/engine/rng.ts` |
| Save | Its own key, `etifeddiaeth.board.v1.`, set and removed singly. Never `localStorage.clear()` |

## 12. Architecture

**The boundary that matters:** v1 is frozen. No agent edits `src/engine/`, `src/ui/game/`, `src/ui/end/`, `model/cards.yaml`, `model/curveballs.yaml`, `model/rules/` or `model/game.yaml`. The board lives beside it.

```
model/board/            rules, projects, events, endings as data
pipeline/board/         commute fetch
scripts/build-board-model.ts
src/board/
  engine/               pure simulation (11.3)
  model/                loads and checks board-model.json. The only code that knows its format
  ui/                   Solid screens and parts for the board
  ui/place/             light place component and the Rhondda adapter
tests/e2e/board.spec.ts
```

The only v1 files touched, each by one named agent and only by adding lines: `src/ui/shell/router.ts` (route name `bwrdd`), `src/ui/shell/App.tsx` (one `Match`), `src/ui/shell/TitleScreen.tsx` (one link, "Try the new board: South East Wales"), `src/map/PaperMap.ts` and `national.ts` (`setLinks`), `package.json` (`board:build` joined into `model:build`), `src/ui/game/copy-rules.test.ts` (read `board.json` too), `src/ui/book/` (one new section).

**Dependency rule, checked by a test** (`src/board/boundaries.test.ts` reads imports): `src/board/engine` imports only itself, `src/engine/rng.ts` and `src/engine/places.ts` (pure). `src/board/ui` imports the board engine only through `api.ts`. Nothing in v1 imports from `src/board/`.

**The API between engine and UI.** Small, typed, all pure functions of model and state:

```ts
newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState
options(model, state, council?: CouncilCode): ActionOption[]   // what can be done, and why not
preview(model, state, action: Action): Preview                 // changes by council, and the links they travel
act(model, state, action: Action): BoardState                  // build, upgrade, law, respond, visit result
endTurn(model, state): { state: BoardState; report: TurnReport }
forecast(model, state): Forecast
why(model, state, target: { council?: CouncilCode; measure: MeasureId | "backing" | "coins"; turn: number }): Why[]
councilView(model, state, council): CouncilView                // real figures, estimates, groups, links
election(model, state): ElectionView
ending(model, state): Ending                                   // name, evidence, scores, letter, the Wales not built
frames(model, state): Frame[]                                  // one board per turn, for the time-lapse
encodeRun(state): string
decodeRun(model, code: string): BoardState
```

`BoardState` is plain data and holds the game number, the start, the list of actions and the current board. Replaying the actions from the game number must give the same state: that is the save format, the run code and the determinism test in one.

**Tests, next to the code:**

- Unit tests per engine module, including: seeding matches the indicator file, each spread rule on a three council fixture, tier gates, pairs, the election line, the severity budget, every ending reachable on a fixture.
- `determinism.test.ts`: same game number and actions give byte equal state. Encode then decode is the identity.
- `explain.test.ts`: every change of a quarter point or more in any council measure has a Why? that ends at a rule and a cause.
- `honesty.test.ts`: every seeded figure has a source, every rule has a kind, confidence and evidence grade, every game rule is flagged.
- `bots.test.ts`: the pass marks of section 13 (b), on fewer game numbers for speed. The full run is `scripts/board-balance.ts`.
- The copy test covers `board.json`. An i18n test checks every key exists in both languages.
- `tests/e2e/board.spec.ts`: a full game to 2050 in English and in Cymraeg, the run code round trip, an axe scan of each screen, and a check that `#/yfory` still plays a v1 turn.
- Before calling any package done: `npm run typecheck`, `npm test`, and for UI `npm run e2e` (project rule).

Module size: no engine file over about 300 lines. `turn.ts` only orders calls. If a file grows, split it by what it does.

## 13. How we will prove it is good

Three kinds of proof, with pass marks set before the build. A fail is fixed and retested. Marks are not lowered after the fact.

### 13.1 (a) Cold persona playtests

Fresh agents, given only the URL and a task sheet. No repository, no design files, no earlier conversation. Never reused. Each plays **two full games** and is told before the second: "Play differently this time."

**Eight personas:**

| # | Persona | Stands for |
|---|---|---|
| 1 | Civilization and city builder player, wants depth | The "is this it?" player |
| 2 | Casual phone gamer, impatient | Clarity and pace |
| 3 | Non-gamer, a nurse from Merthyr Tydfil | Plain words, local truth |
| 4 | First language Welsh speaker, plays in Cymraeg | Welsh quality |
| 5 | Policy officer who knows the Well-being of Future Generations Act | Honesty of the model |
| 6 | 15 year old geography pupil | Young player |
| 7 | Sceptical small business owner, not a gamer | "Why should I care" |
| 8 | Board game designer | Systems, balance, exploits |

**Scores and questions.** Fun, clarity and play again out of 10 after each game. Comprehension questions after turn 2, after the first election and at the end (16 in all), marked by a different agent against a key. They include: what does clicking a council show, why did this council change, what travelled along this line, why does this council not back you, which of your builds opened this project, what is real and what is a game estimate, what are the two scores and which decides.

**The difference test.** After game two, each persona writes three ways their second Wales differed from their first, without looking at the end screens. A judge agent is given the two real end boards and the persona's three lines, and marks each line true or false against the boards.

| Pass mark | Bar |
|---|---|
| Fun | Median 8 or more. Nobody below 7. (v1 cold: 6 to 8, median 7.) |
| Clarity | Median 7 or more. Nobody below 6. (v1 cold: stuck at 5 to 6.) |
| Play again | Median 8 or more. At least 6 of 8 say what they would try next without being asked. |
| Comprehension | 13 of 16 or more each. No question wrong for more than two personas. |
| The difference test | At least 6 of 8 give three true differences. Every persona's two games end in different named endings, or in the same ending with a different lowest council. |
| "Is this it?" | Personas 1 and 8 are asked after game two: "Is there more here to find?" Both must say yes and name it. |
| The map | At least 7 of 8 name the map, a council or a link when asked "what did you look at most?". Nobody names the bars. |
| Sources | At least 4 of 8 open a source, a real figure or the rule book unprompted. (v1: 1 in 9 opened the atlas.) |
| First build | Placed within 90 seconds by at least 7 of 8. |
| Welsh | Persona 4 finishes in Cymraeg with no English left on screen. Every stiff or wrong phrase is logged for the fluent reviewer. |

### 13.2 (b) Bots across many game numbers

Nine bots in `src/board/engine/bots.ts`: **Autopilot** (cheapest legal build each turn), **Random**, **Reactive** (only answers events and the lowest bar), four **branch bots** (each drives one branch to its keystone, then a second), **Cardiff first** (everything in Cardiff and Newport), and **Skilled** (a greedy look ahead of two turns on the lower score, with fairness). Each plays 200 game numbers across all starts and futures. `scripts/board-balance.ts` writes the table to `docs/design/board-balance-log.md`.

The **end board** of a run is a vector: 10 councils times 6 measures, plus each council's young adult share and Backing, each scaled 0 to 1. Distance is the mean absolute difference.

| Claim | Measure | Pass mark |
|---|---|---|
| Strategies build different Waleses | Mean distance between end boards of different branch bots, divided by mean distance between runs of the same bot | 2.0 or more |
| The difference is on the map, not only in totals | Share of council measures that differ by 2 points or more between the two most different branch bots | A quarter or more |
| Many endings are real | Endings reached in at least a tenth of some bot's runs | 6 of 8 or more |
| No ending swallows the rest | Largest share of any one ending across the four branch bots and Skilled | 40 in 100 or less |
| No dominant strategy | Median result of the best branch bot minus the second best | 6 points or less of 100 |
| Each branch has its day | For each branch, at least one start and future pair where its bot has the highest median | All four |
| Skill beats autopilot | Skilled beats Autopilot on the same game number | In 95 of 100 or more, median gap 15 points or more |
| Thought beats reaction | Skilled beats Reactive | In 85 of 100 or more |
| Luck does not decide | For each bot, the 10th to 90th percentile spread across game numbers | 12 points or less, and less than the Skilled to Autopilot gap |
| Place matters | Skilled's own projects moved to random legal councils | Median falls by 8 points or more |
| Early choices compound | The same tier 1 project built in turn 1 against turn 7, effect by 2050 | Twice or more |
| You cannot have it all | Best of 5,000 random search runs | Never four keystones. Three in under 5 in 100 |
| Cardiff first does not win | Cardiff first median against Skilled | At least 10 points lower, and ends in Two countries or The city and its bedrooms in most runs |
| The fairness rule holds | Severity drawn per game number | Always 9 to 11 |

### 13.3 (c) The comparison prompt

After their second game, each persona who says they know the genre (and all of personas 1, 5 and 8) gets this prompt:

> "Here are six games: Democracy 4, Frostpunk, Terra Nil, Reigns, Civilization, SimCity. For each of these five things, rank the game you just played among the seven, 1 best to 7 worst, and say why in one sentence: (1) choices that matter, (2) how different one game is from the next, (3) how clear it is what happened and why, (4) sense of a real place, (5) honesty about what is real and what is made up. Then: if a friend had 15 minutes, which of the seven would you hand them, and why? Say which of the six you know well and which you know only by name."

Rankings from a persona for a game it knows only by name are dropped.

| Pass mark | Bar |
|---|---|
| Sense of a real place | Median rank 1 or 2 |
| Honesty | Median rank 1 or 2 |
| Clear what happened and why | Median rank 3 or better |
| Choices that matter | Median rank 4 or better. Never ranked last |
| Different one game to the next | Median rank 4 or better. Never ranked last |
| The 15 minute pick | At least a third choose this game |

### 13.4 What "top 10" can and cannot mean

Said plainly, so nobody fools themselves.

**Agents can show:** that the systems diverge, that skill matters more than luck, that no strategy dominates, that a cold reader understands the screens and words, that the contradictions that held v1's clarity at 5 to 6 are gone, and how the design compares on paper with what is written about other games.

**Agents cannot show:** that it is fun in the hands for an hour, that it feels good to click, that people come back next week, or how it stands against games the agents know only from text. An agent's "I would play again" is a guess about people. Persona scores are also generous: v1 scored 8.5 with a tester who had read the glossary and 5 to 7 cold.

**So the claim we hold ourselves to is narrower and checkable.** Not "a top 10 game of all games". This: *among short, browser played strategy games about governing a real place, it is in the top handful, and it is the best one about Wales by a distance.* The bar:

1. Every pass mark in 13.1, 13.2 and 13.3 met in the same build, with personas who have never seen it before.
2. Then a human gate that agents cannot stand in for: Luke plays twice and answers three questions. Was the second game materially different? Did you want a third? Is this still "is this it?". All three must be yes, yes, no.
3. Then five people who are not Luke, each playing twice, with the same sheet as 13.1. At least four choose to play a third game without being asked.

Until step 2 is passed, every report says "passes the agent bar", never "is a top 10 game".

## 14. Build plan

### 14.1 Work packages

Six agents. Files are owned by one package only. Shared types are frozen after package 0.

| # | Package | Owns | Depends on | Done when |
|---|---|---|---|---|
| **0** | **Contract** (one agent, first, about an hour) | `src/board/engine/types.ts`, `src/board/engine/api.ts` (signatures that throw "not built"), `src/board/model/` (loader, schema checks), a tiny three council fixture model, `src/board/boundaries.test.ts`, `docs/adr/0005-*.md` and `0006-*.md`, additions to `GLOSSARY.md` | This file | Typecheck passes. Other agents can import every type |
| **1** | **Data and links** | `pipeline/board/`, `model/data/board-commute.json`, `model/board/measures.yaml`, `bands.yaml`, `links.yaml`, new entries in `model/sources.yaml`, `scripts/build-board-model.ts`, `honesty.test.ts`, the `package.json` script | 0 | `public/board-model.json` builds with real seeds and links for ten councils, every figure sourced |
| **2** | **Engine: board and time** | `seed.ts`, `turn.ts`, `projects.ts`, `spread.ts`, `budget.ts`, `explain.ts`, `runcode.ts`, their tests, `determinism.test.ts`, `model/board/rules/spread.yaml`, `rules/budget.yaml` | 0, fixture first, then 1 | A bot can play 12 turns on the fixture and on real data. Every change has a Why? |
| **3** | **Engine: people, events, endings, bots** | `people.ts`, `events.ts`, `score.ts`, `endings.ts`, `places.ts`, `bots.ts`, their tests, `scripts/board-balance.ts`, `model/board/rules/people.yaml`, `groups.yaml`, `futures.yaml`, `game.yaml` | 0, then 2's `turn.ts` hooks | The balance script runs nine bots over 200 game numbers and prints the 13.2 table |
| **4** | **Content and words** | `model/board/projects.yaml`, `tree.yaml`, `pairs.yaml`, `laws.yaml`, `events.yaml`, `starts.yaml`, `endings.yaml`, `letters.yaml`, `places/*.yaml`, `model/i18n/{en,cy}/board.json`, the copy test addition | 0 | Model builds with 16 projects, about 24 events, 8 endings and letters, both languages, copy test green |
| **5** | **UI: the board** | `src/board/ui/` (board screen, council panel, build menu, tree, report, election, start, guide notes), `src/map` `setLinks`, the router, App and title lines | 0, plays against the fixture until 2 lands | A full game is playable by hand at `#/bwrdd` |
| **6** | **UI: end, places, proof** | `src/board/ui/end/` (time-lapse, then and now, ending, letter, run code), `src/board/ui/place/`, the rule book section, `tests/e2e/board.spec.ts` | 0, then 3 and 5 | End screen from a bot run. E2e green in both languages. v1 e2e still green |

### 14.2 Order of work

1. **Hour 0 to 1:** package 0 alone. Nothing else starts until types and the fixture exist.
2. **Hours 1 to 6, in parallel:** 1, 2, 3, 4, 5. Packages 2, 3 and 5 work against the fixture. Package 4 writes content against the schema.
3. **Hour 6, first join:** real data and content replace the fixture. The coordinator runs typecheck, tests and one bot game. Package 6 starts on real output.
4. **Hours 6 to 10:** balance. Package 3 runs the bots, package 4 and 2 tune numbers in `model/board/` only (no code changes for balance). Packages 5 and 6 finish screens.
5. **Hour 10, second join:** e2e in both languages, v1 regression, deploy to a preview channel, not to the live site.

Rule for conflicts: if an agent needs a change in a file it does not own, it writes the need in `src/board/NEEDS.md` and carries on with a stub. The owner or the coordinator makes the change.

### 14.3 The test and iteration loop

```
A. Bot gate      run scripts/board-balance.ts. Any 13.2 mark failed: tune model/board/, rerun.
                 No persona plays a build that fails the bot gate.
B. Persona round eight fresh agents, two games each, sheets from 13.1 and 13.3.
C. Triage        one agent sorts findings: contradictions (fix first), blockers, unclear, wishes.
                 Written up as docs/design/board-playtest-N.md in the style of playtest-5-cold.md.
D. Fix           at most three agents, file ownership as in 14.1.
E. Back to A     with eight new personas. Personas are never reused.
```

- **Stop when** every mark in 13.1 to 13.3 is met in one round with no contradiction on any tester's list. Then the human gate in 13.4.
- **Stop and rethink when** three rounds pass with fun or play again not rising. That means the design is wrong, not the polish. The coordinator writes what failed and wakes nobody: the report waits for Luke.
- **Order of blame when a mark fails:** divergence marks point at sections 5 and 7 (tree costs, pairs, triggers). Skill and luck marks point at 7.3 and the budget. Clarity points at words and the report, never at adding a tutorial. "Is this it?" points at the number of projects, events and places: add content before adding systems.

### 14.4 After the prototype passes

In order: the other three regions on the same engine (the rest of the 22 councils, the two further branches, Bethesda back in), a place for every council, the ensemble and "probably" wording, laws in full, the daily game, sound, and the sandbox for testing a policy against many futures. v1 stays live until the full board passes the same bar on all of Wales, then becomes "the short game".

## 15. Owner's direction after the first build started (27 November 2026)

Two notes from Luke, to fold into the design before phase 2:

1. **Time flows.** "What about a more time game, where things are set in motion and the clock plays in
   real time but accelerated... a timer game, or some time line." Not a card game. Direction: real time
   with pause, in the family of Frostpunk, Mini Metro and Plague Inc. The clock runs (speeds, pause at
   any moment, automatic pause for an event, an election or a place asking); the player acts while it
   runs or while paused; builds take months and years and visibly progress on the map; effects travel
   along links as you watch. The engine keeps a fixed small step (for example a quarter year) and a log
   of actions with the step they were taken at, so a game is still deterministic and replayable.
2. **Good stories whether you win or lose, and never doomed.** He played v1 to 2042 and felt it was a
   doomed game with one shape. A losing game must still be a story worth having, with its own ending
   and letter, and the baseline must not feel like a slow slide no choice can stop. Different paths
   must produce materially different Waleses, which section 5.4 and the endings promise.
