# The board: a design for the bigger game (v2)

*Written 27 November 2026, for agents building overnight. Decisive on purpose: one recommendation per question. Numbers marked (tune) are starting values for the balance bots in section 13. Numbers marked (data) must come from the pipeline with a source in `model/sources.yaml`, never from this page. This file governs the new board route only. v1 (`#/yfory`) is not changed by anything here.*

*Code names in this file: **the board** is the new game, at route `#/bwrdd`. A **council** is one of the 22 local authorities. A **project** is something the player builds in a council. A **link** is a real connection between two councils. A **turn** is two years.* *(revised in 16: there are no turns now. Time runs in **steps** of a quarter year on a clock the player can pause. See 16.2.)*

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

*(revised in 16: the two-year turn in this section is replaced by a running clock with pause, 96 quarter year steps. The forecast, build, pass and report beats still happen, but as things on a time line, not as phases. See 16.2.)*

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

**Coins.** 6 a turn at the start (tune). The budget grows: plus 1 coin a turn for every 4 points of Work and pay gained across the board since 2026 (tune), and standing projects that cut bills (health, flood safety) remove running costs. Some projects have a running cost of 1 coin every second turn. Unspent coins: up to 2 carry over, as in v1. No pound signs anywhere. *(revised in 16: coins arrive every step, 3 a year to start, into a purse that holds 12. See 16.2.4.)*

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

**How backing moves.** Each turn, each group in each council compares the measures it cares about with four years ago and with the Wales middle. Better pulls its mood up, worse pulls it down, with a memory so it moves slowly. *(revised in 16: the comparison with the Wales middle is dropped, because it made Backing zero sum. See 16.3.1.)* A council's Backing is the mean of its groups' moods weighted by their real shares. Events handled well, promises kept and a good place visit add to it. Being passed over (no project within reach for 8 years) takes from it. All weights are game rules and are in the rule book as such.

**What the player reads.** Click a council: "Blaenau Gwent does not back you (4 out of 10). Young adults: unhappy. Work they can reach has not improved. Older people: content. The health hub opened in 2032." Never a percentage, never a poll figure, always tagged "game estimate".

**Elections.** In 2030, 2034, 2038, 2042 and 2046 (the real Senedd calendar). A council backs you at 5 out of 10 or more. You win if the councils that back you hold more than half the people (real 2026 population shares, labelled). The election screen is the map, coloured council by council, with a count: "6 of 10 councils back you. They hold 58 in 100 of the people."

| Result | What it means for the next four years |
|---|---|
| **Strong win** (two thirds of people or more) | One extra law change. Councils that back you build one turn faster. |
| **Win** | Nothing changes. |
| **Lost** | You carry on with a weak hand: 2 fewer coins a turn, no law changes, and councils that do not back you refuse new projects that cost 4 or more. Plain words: "You scraped back in with help from others. For 4 years you have less to spend, and places that did not back you will not take big builds." |

*(revised in 16: the "Lost" row above is replaced. No coins are taken and no council refuses builds. A lost election means a deal with a council that does not back you. See 16.4.)*

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

*(revised in 16: the result is now Left for 2050 alone. Life in your years is still shown and still drives elections and the story. The fairness share is 0.4. The end screen order changes and the count goes last. See 16.3.6 and 16.5.3.)*

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
endTurn(model, state): { state: BoardState; report: TurnReport }   // (revised in 16: removed. tick and advance replace it, and timeline, scores and story are added. See 16.2.8)
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

*(revised in 16: the table in 16.6 amends this one. Marks not listed there stand as written here. Three bots are added.)*

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

*(revised in 16: packages 0 to 5 are built. Package 6 was not, and is folded into phase 2 as package 12. See 16.7.)*

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

## 16. The clock and the stakes: revision after phase 1

*Written 28 November 2026 by the designer of sections 1 to 14, after phase 1 was built and measured. This section wins wherever it disagrees with sections 1 to 15. Earlier lines it changes are marked "(revised in 16)". Every size below is a game rule and a starting value for the bots (tune), unless it says "real".*

### 16.1 What phase 1 showed

The build is sound: ten real councils, links, a ledger, bots, a full game by hand. The game on top of it does not work yet. Measured on `public/board-model.json` (hash 8fcc0e0cc8e7) with `npx tsx scripts/board-balance.ts --quick`, plus two probe runs that summed the ledger by rule:

| Finding | Figure | What it means |
|---|---|---|
| Every bot ends in one narrow band | Medians 44.8 (Autopilot) to 47.5 (Cardiff first). The 2026 board is about 47. 5 of 14 marks met | Nothing the player does shows in the result |
| Projects are a tenth of the size they need to be | A whole game of building adds 5 to 9 points, spread over 60 council measures | A project lifts one measure in one council by 0.2 to 0.6. The score is a mean of 60 such cells |
| The board slides by itself | Young adults moving (S3) takes 7 to 9 points a game. Events take 4 to 6 | The slide is bigger than everything the player builds. This is the "doomed game" Luke felt in v1, rebuilt |
| S3 has no floor | Blaenau Gwent falls from 17.7 to 0.0 young adults in 100 by 2050. Cardiff rises from 27.7 to 35.0 | A runaway, not a tipping point |
| Focus is punished | The valleys bot loses 24.5 points of Backing to "passed over" and loses three elections running | The strategy the design wants (commit to a branch) is the one that loses elections |
| A lost election is a doom spiral | After a loss: 2 fewer coins a turn and no builds of 4 coins or more where you are not backed. Income falls to about 3 a turn and stays there | Tier 2 and keystones are shut exactly when the player needs them. Branch bots finish 0.00 keystones on average |
| Backing is zero sum | Half of each mood is "against the middle council", so half the councils are always behind | Elections drift to a loss whatever is built |
| Nothing grows | Built in turn 1 or turn 7, a project gives the same in 2050: ratio 1.0 | No reason to plan |
| The lower of two scores hides the end | Life in your years is a mean over all the years, so it can move only about half as far as the 2050 board | The result is pinned near the start |

The fixes are in 16.3 to 16.5. First, the clock.

### 16.2 The clock

**In one line.** Time runs by itself in small fixed steps, the player can pause at any moment and act at any moment, and the engine records each action with the step it was taken at.

#### 16.2.1 The step and the calendar

One step is a quarter of a year. It is set in `model/board/game.yaml` as `years_per_step: 0.25`. The game is 96 steps, 2026 to 2050.

Step 0 is May 2026, the day after a Senedd election (real calendar). So elections fall exactly on steps 16, 32, 48, 64 and 80 (May 2030 to May 2046), and the game ends at step 96, May 2050. A step has a season from `step % 4`: summer, autumn, winter, spring. The screen shows "Autumn 2031", never a step number.

`model/board/game.yaml` becomes (owner: package 7):

```yaml
first_year: 2026
end_year: 2050
years_per_step: 0.25
steps: 96                      # the build checks (end_year - first_year) / years_per_step
seasons: [summer, autumn, winter, spring]
election_years: [2030, 2034, 2038, 2042, 2046]   # held on the first step of that year
track_years: 2                 # futures.yaml tracks keep 12 values, one for each two years
keystone_last_start_year: 2044 # a keystone takes 6 years
visit_open_years: 1            # a visit offered by a build lapses after this
term_report_lines_max: 3
year_lines_max: 2
speeds:
  - { id: steady, ms_per_step: 3000 }   # a year in 12 seconds
  - { id: brisk, ms_per_step: 1500 }    # a year in 6 seconds
  - { id: fast, ms_per_step: 750 }      # a year in 3 seconds
default_speed: steady
stops:                         # see 16.2.5. hard stops cannot be switched off
  respond: { hard: true }
  election: { hard: true }
  ended: { hard: true }
  warning: { on: true }
  keystone: { on: true }
  tier_open: { on: true }
  visit: { on: true }
  tipping: { on: true }
  chapter: { on: true }
  deal_due: { on: true }
  purse_full: { on: true }
  finished: { on: false }
  year: { on: false }
save_key: etifeddiaeth.board.v2.
```

Removed: `turn_years`, `turns`, `visits_per_turn`, `report_lines_max`. `region` and `councils` stay as they are.

#### 16.2.2 Speeds, and what a second means

| Speed | One step lasts | One year lasts | 24 years with no pauses |
|---|---|---|---|
| Paused | until you press play | | |
| Steady (the default) | 3 seconds | 12 seconds | about 5 minutes |
| Brisk | 1.5 seconds | 6 seconds | about 2 and a half minutes |
| Fast | 0.75 seconds | 3 seconds | just over a minute |

A normal game has 25 to 35 stops (about 12 warnings and landings, 5 elections, keystones, visits, chapters), so it lasts 15 to 20 minutes. Speed is never part of the state or the run code. The same actions at the same steps give the same game at any speed.

Keys: Space pauses and plays. 1, 2 and 3 pick a speed. Full stop moves one step while paused. The game opens paused, with one line: "Nothing moves until you press play."

Three comfort rules, all in the settings sheet (`boardui.settings.*`), all saved under the board's own key `etifeddiaeth.board.v2.prefs`, set and removed singly:

- **Hold the clock while I read** (on by default). Opening the build menu, the tree, the laws sheet or a Why? holds the clock, and closing it carries on at the speed you had.
- **Step by step.** No running clock at all. A "Next season" button and a "Run to the next moment" button. This is also what reduced motion, screen reader users and the e2e test use.
- **Hidden tab.** The clock pauses when the page is hidden (`visibilitychange`). Always on.

#### 16.2.3 Running and paused: what you can do

Everything in section 5.1 can be done at any time, running or paused. An action takes effect in the step that is current when it is made, and is logged with that step. There is no "end turn".

| | Running | Paused |
|---|---|---|
| Build, upgrade, upgrade a link, pass a law | Yes | Yes |
| Answer an event | The clock is held until you answer (hard stop) | Yes |
| Visit a place | The clock is held while the place is open | Yes |
| Look: select a council, colour the map, Why?, tree | Yes (holds the clock if the comfort rule is on) | Yes |
| Coins arrive, builds progress, people move | Yes | No. Nothing changes while paused |

A build shows on the map as a ring that fills, a quarter turn of the ring for each quarter of its build time, with the year it will open beside it. Effects travel along links as pulses in the step they happen, not in a batch.

#### 16.2.4 How the two-year turn becomes steps

The rule for package 7: **no new rules, only rates.** Every number that was "per turn" becomes "per year" by dividing by 2, and the engine multiplies by `years_per_step`. Every duration that was "turns" becomes "years" by multiplying by 2, and the engine turns years into steps. Two helpers in a new `src/board/engine/time.ts` are the only places that know the step length:

```ts
export const stepsOf = (model: BoardModel, years: number): number => Math.round(years / model.game.years_per_step);
export const perStep = (model: BoardModel, ratePerYear: number): number => ratePerYear * model.game.years_per_step;
export const yearOfStep = (model: BoardModel, step: number): number => model.game.first_year + Math.floor(step * model.game.years_per_step);
export const closesYear = (model: BoardModel, step: number): boolean => step > 0 && step % stepsOf(model, 1) === 0;
```

The proof that it is a re-expression: `clock-equivalence.test.ts` (package 7) runs the fixture with `years_per_step: 2` and `steps: 12` and must match a snapshot of the phase 1 fixture game (coins, measures, backing) to 0.01, before any 16.3 rule is switched on.

| Thing | Phase 1 (per two-year turn) | Now (per year, applied each step unless said) | Where |
|---|---|---|---|
| Coins | `base: 6` a turn | `base_per_year: 3`, so 0.75 a step. Coins are held as a number with four decimal places. The screen shows whole coins and a ring that fills towards the next one | `rules/budget.yaml` B1, `budget.ts` |
| Budget growth | plus 1 a turn for each 4 Work points gained | `growth_per_year: 0.5` for each `per_work_points: 4` | B1 |
| Carry over | up to 2 unspent coins | Gone. A purse: `purse_max: 12`. Coins above it are not paid. The `purse_full` stop warns you | B1 |
| Running costs | `{ coins: 1, every_turns: 2 }` | `{ coins_per_year: 0.25 }`, charged each step | `projects.yaml`, `RunningCost` |
| Coin effects | `{ kind: coins, coins, every_turns }` | `{ kind: coins, coins_per_year }` | `Effect` |
| Care bill | 1 a turn from 2038 | `care_bill_per_year: 0.5` from 2038 | B2 |
| Build time | `build_turns` 0 to 3 | `build_years`. Start from turns times 2, then: quick projects 0.5 to 1 year, other tier 1 two years, tier 2 three years, keystones 6 years | `projects.yaml`, `ProjectDef` |
| Bedding in | `after_turns`, `ramp_turns` | `after_years`, `ramp_years` (times 2). A ramp rises a little every step | `EffectBase`, `held.ts` |
| S1, S2 | a share of the change in Work this turn | Unchanged. They read the change in the step, so eight small steps add up to the same | `spread.ts` |
| S3 people moving | `share: 0.3`, `pull: 0.1` a turn | `max_per_year: 0.3`, `pull_per_year: 0.06` (and see 16.3.4) | `rules/spread.yaml` S3 |
| S4 | `lag: 1` turn | `lag_years: 2` | `SpreadSpec` |
| Moods | `memory: 0.6` a turn | `memory_per_year: 0.775` (the square root of 0.6). Moods and Backing are worked out once a year, when the year closes | `rules/people.yaml` P1, `people-moods.ts` |
| Passed over | 0.5 a turn after 8 years | `loss_per_year: 0.1`, `max_loss: 1` (and see 16.3.1) | P3 |
| Compare windows | `over_turns: 2` | `over_years: 4` | `Condition` |
| Outside events | at most one a turn, from `first_turn: 1` | at most one in each two-year block (`track_years`), from `first_year: 2028`. The landing step inside the block is drawn from the seed. Storms land in autumn or winter | E1, `events-schedule.ts` |
| Grown events | `grown_per_turn: 1`, checked each turn | checked when a year closes, `grown_gap_years: 2` between them | E1, `events.ts` |
| Warnings | one turn ahead | `warn_years: 1.5` for outside events, `1` for grown ones. A warning names a window of two steps ("the winter of 2031"), and the event lands on a seeded step inside it | E1, `ForecastedEvent` |
| Elections | at the end of the turn that reaches the year | on the first step of the election year | `people.ts` |
| Terms | weak or strong for 2 turns | for 16 steps (4 years) | `ElectionState` |
| Visits | one a turn | one open at a time. A visit offered by a build lapses after `visit_open_years` | `game.yaml` |
| Keystone cut off | start by 2042 | start by 2044 | `game.yaml` |
| The report | after every turn | Gone as a screen. See 16.2.6 | |

**Order inside one step** (the old `endTurn` order, in `clock.ts`): builds progress and finish; link quality follows; held effects move towards their targets (ramps, roots); events whose step this is land; S1, S2 and S3 run; coins. **When a year closes** (every fourth step): momentum (16.3.3), moods and Backing, grown event triggers, the year's frame, year lines, the ledger fold. **On an election step:** the promise is judged, the election is held, the term report and the chapter are written (16.5.1).

**Determinism.** Every draw is keyed by the seed, a label and the step. `BoardState` holds the game number, the start and the log. Replaying the log gives a byte equal state. `tick` 96 times and `advance` to the end must give the same state (a test).

#### 16.2.5 What pauses the clock

The engine reports stops. The UI decides whether to pause on them, from the player's settings. The engine never reads the settings, so a run does not depend on them.

| Stop | When | Default | Can be switched off |
|---|---|---|---|
| `respond` | An event lands that needs an answer | Pause, and hold until answered | No |
| `election` | An election is held | Pause, show the map and the term report | No |
| `ended` | May 2050 | Stop | No |
| `warning` | A new warning appears on the time line | Pause | Yes |
| `keystone` | A keystone finishes | Pause, with its moment card | Yes |
| `tier_open` | A tier or a legacy project opens | Pause | Yes |
| `visit` | A place asks for a visit | Pause | Yes |
| `tipping` | A council starts to rise or to slip, or the region turns (16.3.3) | Pause | Yes |
| `chapter` | The game names a chapter (16.5.1) | Shown with the election stop | Yes |
| `deal_due` | A year is left on a deal (16.4) | Pause | Yes |
| `purse_full` | Coins have reached the purse limit | Pause, once for each time it fills | Yes |
| `finished` | Any project finishes | Carry on, with a pulse and a line | Yes |
| `year` | A year closes | Carry on | Yes |

Every soft stop shows one line and two buttons: "Look" (selects the council and stays paused) and "Carry on".

#### 16.2.6 The time line

One strip along the bottom of the board, the full width, 2026 on the left and 2050 on the right. It replaces the twelve turn boxes. It is the same component on the end screen, where it scrubs the time-lapse.

| Part | What it shows | Click or Enter |
|---|---|---|
| **The past** (left of the pin) | A band for each finished term, with the chapter name the game gave it. Pips for moments: events that landed, elections with their result, keystones, councils that tipped | A band opens the term report. A pip opens its Why? |
| **Now** | A red pin that slides as the clock runs, with "Autumn 2031". The play, pause and speed buttons sit at the left end of the strip | |
| **Under way** | A bar for each build, from the step it started to the step it opens, filled as far as now. Three lanes. Keystones are thicker. More than nine bars fold into a count | A bar selects the council and the project |
| **Ahead** | Election marks with the result if one were held now. Each warned event as a hatched block two steps wide, with its icon and its council. The promise date. A deal's due date. The last year a keystone can start. The care bill from 2038 | A warning selects its council and lists the projects that would cut it |

Keyboard and screen readers get the strip as one ordered list of buttons, past to future, with "now" announced. Nothing on it relies on colour alone.

The top strip shows the date, coins with the filling ring, income a year, and the two scores as they stand (the new `scores` call, which closes the package 5 entry in `NEEDS.md`).

**The report is now three small things.** (1) A line on the map when something happens, in the step it happens. (2) When a year closes, at most `year_lines_max` lines in a quiet ticker by the time line, each with Why?. (3) At each election, the **term report**: the old report screen, at most three lines for the four years, each a council and a cause with Why?, plus the chapter name.

#### 16.2.7 Why?, frames and the time-lapse with eight times the steps

- **The ledger folds by year.** Phase 1 writes about 2,100 contributions in 12 turns. Written per step that would pass 15,000. So `ctx.change` merges on write: one record for each year, council, quantity, rule, cause and link. `Contribution` keeps `step` (the first step it happened in that year) and gains `year`. Nothing is lost that a player can ask about.
- **Why? asks about a span, not a turn.** `WhyTarget` is `{ council?, measure, fromStep, toStep }`. The UI offers three spans: this year, this term, since 2026. The explain test becomes: every change of a quarter point or more over any year has a Why? that ends at a rule and a cause.
- **Frames are yearly.** `state.history` holds 25 frames (steps 0, 4, 8 and so on to 96), each with the flows of its year. Moods, "compared with four years ago" and Life in your years all read yearly frames. The live map does not need frames: each `StepReport` carries that step's flows.
- **The time-lapse** plays the 25 frames in about 15 seconds (0.6 seconds a year, the map easing between frames), and holds for 1.5 seconds on each of the five turning points (16.5.2) with its caption. About 22 seconds. Reduced motion shows the six election year frames as stills, with the turning points as a list. The time line under it scrubs.
- **Speed for bots.** `advance` clones the state once and steps in place. Bots decide when a year closes and at stops, not every step. Look ahead uses `advance(model, state, { maxSteps, light: true })`, which skips the ledger and frames. Pass mark: the quick balance run in under 3 minutes, the full run in under 15.

#### 16.2.8 Types and API that change

All owned by package 7. Field renames are mechanical: `turn` becomes `step` everywhere it meant "when".

**`types-model.ts`**

- `BoardGame`: remove `turn_years`, `turns`, `visits_per_turn`, `report_lines_max`. Add `years_per_step: number`, `steps: number`, `seasons: [string, string, string, string]`, `track_years: number`, `visit_open_years: number`, `term_report_lines_max: number`, `year_lines_max: number`, `speeds: { id: string; ms_per_step: number }[]`, `default_speed: string`, `stops: Record<StopKind, { hard?: boolean; on?: boolean }>`.
- `SpreadSpec.lag` becomes `lag_years`. `BoardRule.lag` becomes `lag_years`.
- `RULE_IDS` gains `roots: "R1"`, `momentum: "R2"`, `freshStart: "R3"`, `need: "R4"`, `rebuild: "E2"`, `hungTerm: "P6"`. `weakHand: "B3"` is removed.
- `RuleTheme` gains `"growth"`.

**`types-content.ts`**

- `Condition`: `over_turns` becomes `over_years`. New kinds: `{ kind: "momentum"; is: Momentum }` and `{ kind: "keystone"; project?: ProjectId }` (board: that keystone, or any, is working).
- `EffectBase`: `after_turns`, `ramp_turns` become `after_years`, `ramp_years`.
- `Effect` coins: `{ kind: "coins"; coins_per_year: number }`.
- `RunningCost`: `{ coins_per_year: number }`.
- `ProjectDef`: `build_turns` becomes `build_years`. Add `quick?: boolean` (a small win, 16.4) and `legacy_of?: ProjectId` (a legacy project, 16.3.5).
- `EffectSpecial` gains `"branch_joined"` (16.3.5).

**`types-state.ts`**

```ts
export type Momentum = "rising" | "steady" | "slipping";
export type Season = "summer" | "autumn" | "winter" | "spring";
export interface LoggedAction { at: number; action: Action }            // replaces RunStep
export type Phase = "play" | "respond" | "ended";                         // "build" becomes "play"

export interface Deal { council: CouncilCode; measure: MeasureId; madeStep: number; dueStep: number; kept: boolean | null }
export type MomentKind = "tier_open" | "keystone" | "tipped" | "region_turn" | "election" | "event" | "promise" | "deal" | "people";
export interface Moment { step: number; year: number; kind: MomentKind; council?: CouncilCode; ref?: string; say: Say; weight: number }
export interface ChapterRecord { term: number; fromYear: number; toYear: number; chapter: ChapterId; slots: Record<string, SayVar> }
export interface StoryState { chapters: ChapterRecord[]; moments: Moment[] }
```

- `BoardState`: `version: 2`. `turn` becomes `step`. `year` stays (the calendar year of the step). `steps: RunStep[]` becomes `log: LoggedAction[]`. `visitsThisTurn` becomes `openVisitSince: number | null`. Add `story: StoryState` and `deals: Deal[]`. `history` is yearly. `coins` may hold a fraction.
- `CouncilState`: add `momentum: Momentum`. `lastReachedTurn` becomes `lastReachedStep`.
- `ProjectState`: `startedTurn`, `readyTurn` become `startedStep`, `readyStep`. Add `roots: number` (starts at 1) and `joined: boolean`.
- `ForecastedEvent`: `turn` becomes `fromStep`, `toStep` (the warned window) and `step` (the seeded landing step, not shown). `EventRecord.turn`, `ElectionRecord.turn`, `Contribution.turn` become `step`. `Contribution` gains `year`.
- `ElectionState`: `weakUntil` becomes `hungUntil` (a step). `strongUntil` is a step.
- `Frame`: `turn` becomes `step`. `FrameCouncil` gains `momentum`. `Cause` gains `{ kind: "momentum" }` and `{ kind: "deal"; council: CouncilCode }`.

**`types-views.ts`**

```ts
export type StopKind = "respond" | "election" | "ended" | "warning" | "keystone" | "tier_open" | "visit"
  | "tipping" | "chapter" | "deal_due" | "purse_full" | "finished" | "year";
export interface Stop { kind: StopKind; hard: boolean; council?: CouncilCode; ref?: string; say: Say }

/** Replaces TurnReport: what one step did. */
export interface StepReport {
  step: number; year: number; season: Season;
  finished: string[]; flows: Flow[]; events: EventRecord[];
  coins: { before: number; income: number; running: number; charges: number; after: number };
  stops: Stop[];
  yearLines?: ReportLine[];     // set when the step closed a year
  term?: TermReport;            // set on an election step
  ended: boolean;
}
export interface TermReport { term: number; fromYear: number; toYear: number; lines: ReportLine[]; election: ElectionView; chapter: ChapterRecord }

export type TimelineMark =
  | { kind: "election"; step: number; year: number; projected: ElectionResult }
  | { kind: "warning"; fromStep: number; toStep: number; event: EventId; councils: CouncilCode[]; good: boolean; say: Say }
  | { kind: "promise" | "deal" | "keystone_last_start" | "care_bill" | "end"; step: number; council?: CouncilCode; say?: Say };
export interface TimelineView {
  step: number; steps: number; year: number; season: Season;
  chapters: ChapterRecord[]; moments: Moment[];
  underWay: { id: string; project: ProjectId; site: Site; startedStep: number; readyStep: number; keystone: boolean }[];
  ahead: TimelineMark[];
}
export interface Story { chapters: ChapterRecord[]; turningPoints: Moment[] }   // the five heaviest moments, in order of time
```

- `ActionOption`: `buildTurns` becomes `buildYears`. Add `readyStep`. `readyYear` stays.
- `PreviewChange.year` stays. `Why.turn` becomes `step`. `WhyTarget` is `{ council?; measure; fromStep; toStep }`.
- `ForecastWarning` gains `fromStep`, `toStep`. `Forecast.turn` becomes `step`.
- `Blocker`: `refused` is removed (16.4). `visit_used` stays.
- `Scores`: same shape. `result` is now `left` (16.3.6). `Ending` gains `story: Story`.
- `CouncilView` gains `momentum`, `freshStart: boolean` and `deal: Deal | null`. `refusesBigBuilds` is removed.

**`api.ts`**

| Function | Change |
|---|---|
| `newBoard(model, gameNumber, start)` | Same. Returns step 0, May 2026 |
| `act(model, state, action)` | Same signature. Logs `{ at: state.step, action }` |
| `endTurn` | **Removed** |
| `tick(model, state): { state; report: StepReport }` | **New.** One step. Throws while `phase` is `respond` or `ended` |
| `advance(model, state, opts: { maxSteps: number; stopOn?: StopKind[]; light?: boolean }): { state; reports: StepReport[]; stopped: Stop \| null }` | **New.** Steps until a hard stop, a stop named in `stopOn`, or `maxSteps`. Used by step by step mode, bots, tests and replay |
| `timeline(model, state): TimelineView` | **New** |
| `scores(model, state): Scores` | **New** (asked for by package 5) |
| `story(model, state): Story` | **New** |
| `forecast(model, state)` | Stays. Warnings carry their window |
| `why(model, state, target)` | Target is a span |
| `options`, `preview`, `councilView`, `election`, `ending` | Same signatures, new fields as above |
| `frames(model, state)` | One frame a year |
| `encodeRun`, `decodeRun` | New format: `b2.` then the game number, the start, the step reached, and the list of `[at, action]`. A `b1` code gets the plain message "This code is from an older version of the game." |

`turn.ts` becomes `clock.ts` (`newBoard`, `act`, `tick`, `advance`, `replay`). `hand-state.ts` and `frame.ts` follow the renames. The `Say` key convention is settled here: every key is the full `board.<key>`.

### 16.3 The stakes: why choices now matter

Six changes. The first removes the slide. The next four make things feed themselves. The last lets the result show it.

#### 16.3.1 Nothing slides by itself

The only downward push on the board is trouble from outside (rule E1, 9 to 11 severity points a game) and the things the player's own board grows. There is no drift rule, and these four leaks are closed:

| Leak | Change | Numbers |
|---|---|---|
| People moving drained the region | S3's knock-on effects run both ways: what one council loses another gains | See 16.3.4 |
| S3 had no floor | A council cannot fall below a floor or rise above a ceiling | `floor_share: 0.6`, `ceiling_share: 1.5`, both times its real 2026 share |
| "Passed over" punished focus | Smaller, capped, and only where nothing stands within one link | P3: `years: 8`, `loss_per_year: 0.1`, `max_loss: 1` |
| Moods were judged against the middle council | Dropped. A group compares what it cares about with four years ago in its own council, and nothing else | P1: the `against_middle` half goes. `pull: 0.8` stays |

Pass mark (16.6): a game with no actions and no events ends within half a point of 2026. With events it ends 2 to 5 points down: "a little worse", and the player can see which storm did it.

#### 16.3.2 Roots and clusters (things grow, and grow faster together)

**Plain sentence:** "A project is worth more every year it stands, and much more when it has company."

New rule card R1 in a new file `model/board/rules/growth.yaml`. Each working project has a `roots` factor that starts at 1 and multiplies its measure and young adult effects. Each year it grows:

| Case | Growth a year | By 2050 if working from 2028 | If working from 2040 |
|---|---|---|---|
| **Alone** | `grow_alone_per_year: 0.03` | about 1.9 times | about 1.3 times |
| **Joined:** another working project of the same branch stands here or one link away, or a "together" pair is live | `grow_joined_per_year: 0.08` | 5 times (the limit, `max_factor: 5`) | about 2.2 times |

Applied each step as `roots *= (1 + rate) ^ years_per_step`. Growth stops while a project is run down. Levels still multiply on top.

What it does to play:

- **Early beats late.** A joined project from 2028 is worth more than twice the same project from 2040. That is the 2.0 mark of 13.2, now met by a rule and not by hope.
- **Together beats scattered.** Ten projects strung along the Taff grow at 8 in 100 a year. The same ten scattered grow at 3. The patchwork is still a real ending. It is no longer as good as a plan.
- **Where matters.** A cluster follows real links, so the real map decides which clusters are possible.

Starting sizes, so the bots have somewhere to begin: multiply every measure effect in `projects.yaml` by 1.25 for tier 1, 1.5 for tier 2 and 2 for keystones.

**Need (rule R4).** "A project does most where the real 2026 figure is worst." A lift is multiplied by `1.3 - 0.08 * seed`, held between 0.5 and 1.1, where `seed` is that council's real 2026 score for that measure. A health hub in Merthyr Tydfil (Health about 2 out of 10) lands at 1.1 times. The same hub where Health is 8 lands at 0.66. The factor is fixed, comes from real figures, and is shown in the preview: "Health is low here, so this does more." Events and other losses land in full.

#### 16.3.3 Tipping points (momentum)

**Plain sentence:** "A place that has got better for four years starts to pull people and work in. A place that has got worse starts to lose them."

New rule card R2. When a year closes, each council's mean of its six measures is compared with four years before:

| State | Enters when the four-year change is | Leaves when it is back inside | While it lasts |
|---|---|---|---|
| **On the rise** | `rise_at: +0.3` or more | `settle_band: 0.1` | Counts as `pull_points: 1.0` better when young adults choose where to go (S3). Roots there grow `roots_bonus: 0.02` a year faster. Backing rises `backing_per_year: 0.15`. It pays `coins_per_year: 0.5` |
| **Steady** | | | Nothing |
| **Slipping** | `slip_at: -0.3` or worse | `settle_band: 0.1` | Counts as 1.0 worse for S3. Roots there grow 0.02 a year slower (never below 0). Backing falls 0.15 a year. A fresh start is on offer (16.4) |

Two edges, so it is a tip and not a wobble: the gap between 0.3 and 0.1 means a council stays in its state for a while once it is there. The map draws an up or down mark on the council, and the first tip each way in each council is a moment on the time line.

**The region turns.** The first time `region_turn_councils: 5` councils are on the rise at once, base income rises by `region_turn_coins_per_year: 1` for the rest of the game. It is a named moment and usually a chapter.

This is the path dependence: which councils tip first depends on where the player built, and a risen council changes where young adults go, which changes what the next project is worth.

#### 16.3.4 People move along the real commuting links

S3 is kept and made honest, bounded and two sided. Young adults move along each council's `links_per_council: 3` strongest commuting links (by the real Census share) and along rail links, from the lower to the higher of (Work and pay plus Homes and community, plus or minus momentum).

| Param (rule S3) | Value | Was |
|---|---|---|
| `pull_per_year` | 0.06 points of young adult share for each point of gap | 0.1 a turn |
| `max_per_year` | 0.3 on one link | 0.3 a turn |
| `quality_step` | 0.5 more for each step of rail quality above 1 | same |
| `floor_share`, `ceiling_share` | 0.6 and 1.5 times the real 2026 share | none |
| `work_per_point` | Work and pay moves 0.15 for each point of share, **down where they leave and up where they arrive** | 0.1, loss only |
| `welsh_per_point` | Welsh and culture falls 0.1 for each point lost, and rises 0.05 for each point gained | 0.1, loss only |
| `homes_per_point` | Homes and community falls 0.1 for each point gained, unless homes projects block it (`tag_block: 0.5` each) | new |

Two loops come out of this, and the player can see both on the map as dots moving along links:

- **The snowball.** Work up, young adults in, work up again. This is what a risen valley town or a booming Cardiff feels like.
- **The brake.** Young adults in, homes dearer, the pull weakens. Building homes releases the brake.

So the same rail upgrade empties a valley that has nothing at its end, and fills one that has a station quarter and a college. The council panel says it in people, as a game estimate: "About 1 in 5 of the young adults here in 2026 have gone."

#### 16.3.5 A finished keystone changes the rules

A keystone must feel like a before and an after. Each one now does four things: its own special rule (as section 5.3), a region wide change, a legacy project that only it unlocks, and a chapter.

| Keystone (8 coins, 6 years) | Region wide, for good | Legacy project it unlocks (5 coins, 3 years) |
|---|---|---|
| **Work comes up the line** | On upgraded links the valley end counts as 2.0 better for S3: the flow turns round | **Trains all evening and on Sundays:** every upgraded link rises one more quality step |
| **A cluster that roots** | A downturn takes half as much from any council with a college | **Firms that train their own:** every skills college rises one level, free |
| **Rivers given room** | Storms lose one severity step on that river | **Farms paid to hold water:** flood risk falls one step in every river council, and storms cost no coins |
| **Heat and homes for all** | The care bill never starts, or stops | **Homes that pay their own bills:** running costs of every project halve |

Also for every keystone: all projects of its branch count as joined wherever they stand (the new `branch_joined` special). The branch has come of age.

Money and time allow two keystones and one legacy, or three keystones with thin cover. Costs: keystones rise from 7 to 8. Income is about 72 coins from the base over 24 years, plus about 20 to 30 from growth, risen councils and projects that pay. A branch to its keystone costs 25 at the least and about 40 done well.

#### 16.3.6 The result is the Wales you leave

Section 8 took "the lower of the two scores" from v1. On the board that rule only hides the end: Life in your years is a mean over all the years, so it moves about half as far as the 2050 board, and the result sticks to the start. v1 needed the rule because its cards could borrow from the future. The board has no borrowing, and what a player can leave undone (risks at step 3, run down projects, a big employer with no roots) is already taken off Left for 2050.

So: **the result is Left for 2050.** Life in your years stays on the strip and the end screen as "how the years felt on the way". It picks the letter variant, it is what elections answer to (moods compare with four years ago), and it shapes the chapters. It is not the result. The line from the first minute is now: "Your result is the Wales you leave in 2050. People judge you on the years in between."

Two more changes to rule G1: `fairness_share` rises from 0.25 to 0.4, so lifting the three lowest councils is worth as much per coin as lifting Cardiff. The bands widen: `band_little: 3`, `band_much: 10`.

**Where strategies should now land** (targets for the bots, not promises):

| Play | Result out of 100 (2026 is about 47) | The story |
|---|---|---|
| Nothing, or autopilot | 43 to 46 | The drift |
| Only reacting | 46 to 50 | Holding the line |
| Broad and scattered | 50 to 55 | The patchwork |
| Cities first | 50 to 55, with the lowest three lower than in 2026 | Two countries |
| One branch to its keystone, clustered | 58 to 64 | One of the four named Waleses |
| Two keystones and a legacy, the low councils brought along | 62 to 70 | The same, with the gap closed |

Two strategies end 15 or more points apart because one lets roots, clusters, risen councils and a keystone feed each other for twenty years, and the other does not. Two good strategies end within about 6 points of each other and look nothing alike, because they tip different councils, move young adults in different directions and stand different keystones.

### 16.4 A weak start is not the end

Each rule here is a way back, and each is tested in 16.6.

| Way back | Rule | Numbers |
|---|---|---|
| **A lost election is a deal, not a punishment** | Rule P6 replaces B3. No coins are taken and no council refuses builds. Instead you "govern with others": pick one of two deals, each from a council that backs you least. A deal is that council's weakest measure and a date: build a project there that lifts it, working within `deal_years: 4`. That project costs `deal_discount: 1` less. Kept: Backing rises `kept_here: 1.5` there and `kept_near: 0.5` one link away. Broken: Backing falls `broken: 0.5` everywhere. No law changes in a hung term | `rules/people.yaml` P6 |
| **A fresh start** | Rule R3. The first project placed in a slipping council, or in one of the three lowest, costs `discount: 1` less (never below 1) and counts as joined for `joined_years: 8`. "People rally round the first new thing." | `rules/growth.yaml` R3 |
| **Small wins** | Every branch has one tier 1 project marked `quick: true`: 2 coins, a year or less. Buses that meet the trains (half a year), Back local firms (1 year), Slow the water upstream (1 year), and a new one for branch 4, **A repairs team for cold, damp homes** (1 year). A quick project shows its first effect in the season it opens | `projects.yaml` |
| **Trouble opens a door** | Rule E2. After an event of severity 2 or more lands on a council, builds there take half the time for `years: 2`. "Rebuild better." | `rules/people.yaml` E2 |
| **Need** | Rule R4 (16.3.2). The further behind a place is, the more a coin does there | |
| **Slipping is not for ever** | The small settle band (0.1) means two decent years end a slip | R2 |
| **Late is not too late** | Tier gates do not depend on the year. A player who starts in 2034 can still stand one keystone (start by 2044) | |

What is deliberately not here: no catch up coins for the player who is behind, no hidden rubber band on scores, no softening of events. The ways back are things the player does on the map, and each makes a line in the story.

### 16.5 A good story, win or lose

#### 16.5.1 Chapters the game writes

A game has six terms (2026 to 2030, and so on to 2046 to 2050). When a term closes, the game names it. Chapters are data in a new `model/board/story.yaml`: each has an id, a name with slots, one line, a priority and a `when` list of term conditions. The first by priority whose conditions all hold names the term. A name is not used twice in one game unless nothing else fits.

```ts
export type ChapterId = string;
export type TermCondition =
  | { kind: "event_landed"; track?: TrackId; severity_at_least?: number; prepared?: boolean }
  | { kind: "election"; result: ElectionResult }
  | { kind: "keystone"; phase: "started" | "finished" }
  | { kind: "tier_opened"; tier: Tier }
  | { kind: "tipped"; to: Momentum; at_least: number }
  | { kind: "region_turn" }
  | { kind: "young_adults"; flag?: CouncilFlag; change: "up" | "down"; by: number }
  | { kind: "gap"; change: "closed" | "wider"; by: number }
  | { kind: "finished"; at_least?: number; at_most?: number }
  | { kind: "deal"; kept: boolean }
  | { kind: "promise"; kept: boolean }
  | { kind: "level"; change: "up" | "down"; by: number };
export interface ChapterDef { id: ChapterId; name: Text; line: Text; priority: number; when: TermCondition[] }
```

Eighteen chapters to start (package 10 writes the words, with slots `{river}`, `{council}`, `{town}`, `{project}`):

| Chapter | Named when, in the term |
|---|---|
| The winter the {river} rose | A storm of severity 2 or more landed unprepared |
| Hard rain, held | A storm landed and was prepared for |
| When the work went | A downturn landed and Work and pay fell |
| The leaving years | Young adults fell by 1 in 100 or more in three or more valley councils |
| Coming home | Young adults rose in two or more valley councils |
| Laying the ground | Four or more tier 1 projects finished and nothing bigger |
| The second floor | A tier 2 opened |
| The big build | A keystone was started and not finished |
| {project} | A keystone finished. The chapter takes the keystone's name |
| {town} turns a corner | A council tipped to on the rise for the first time |
| The turn | The region turned |
| Two speeds | The gap widened by 0.3 or more |
| Closing the gap | The gap closed by 0.3 or more |
| The hung years | An election was lost |
| The deal with {council} | A deal was kept |
| A promise kept | The starting promise was kept |
| The quiet years | No event landed and fewer than three things finished |
| Holding on | Nothing else fits |

The chapter appears with the term report at each election, and as a band on the time line. By 2050 the player has six lines that read as the story of their game, for example: "Laying the ground. The winter the Taff rose. The hung years. The deal with Blaenau Gwent. Ebbw Vale turns a corner. Work comes up the line." A losing game reads as well as a winning one: "The big build. When the work went. The leaving years."

Chapters are labelled once, in the rule book and on the end screen: "The game's own telling of your run, from what happened on the board."

#### 16.5.2 Turning points

The engine keeps a list of moments (type `Moment`, 16.2.8): a tier opening, a keystone, a council tipping, the region turning, an election, an event of severity 2 or more, the promise, a deal, and a council's young adults moving 2 in 100 from 2026. Each has a weight: the sum of the sizes of the ledger records over the next eight years that share its cause. `story()` returns the five heaviest, in order of time.

The end screen replays them inside the time-lapse: the map holds, the council is ringed, one caption, and a Why?. For the heaviest event or deal it adds one honest line about the choice not made: "You paid to move the families. The other choice was to shore up the tip." No second simulation is run and no claim is made about what would have happened.

#### 16.5.3 Endings that are not a grade

The end screen order of section 8 changes. The count goes last and small.

1. **The time-lapse**, with the five turning points.
2. **The name:** "You built: The city and its bedrooms." Three evidence lines.
3. **Your Wales in six chapters.**
4. **Then and now**, two maps.
5. **The letter.**
6. **The Wales you did not build.**
7. **The count** (folded shut until opened): the plain band sentence, Left for 2050, Life in your years, the same game on autopilot.
8. Run code and Play again, with one prompt taken from the game: "Next time: what if the homes came before the trains?"

Four endings are added to the eight in 5.4, so that a hard game has a name worth having. Twelve in all, in `model/board/endings.yaml`:

| New ending | The board in 2050 | Why it is worth reading |
|---|---|---|
| **The comeback** | At least one election lost, at least one deal kept, the three lowest councils higher than in 2026 | The story is the recovery |
| **The long game** | Two keystones, both finished after 2044. Life in your years low, Left for 2050 high | Hard years, and a country that is about to be better |
| **Holding the line** | No keystone, every outside event prepared for, no council lower than in 2026 | Nothing grand, and nothing lost, in a hard future |
| **The gamble** | A big employer came and left. Work and pay fell where it stood | A warning with a real place in it |

New `EndCondition` kinds for these: `{ kind: "elections_lost"; at_least }`, `{ kind: "deals_kept"; at_least }`, `{ kind: "keystone_finished_after"; year; at_least }`, `{ kind: "events_prepared"; share }`, `{ kind: "no_council_lower" }`, `{ kind: "event_landed"; event }`. Each new ending has two letters (16 letters become 24). "The drift" is kept for a game with fewer than six projects.

#### 16.5.4 Honesty, unchanged

- Every new size (R1 to R4, E2, P6, the S3 limits, the purse, chapter thresholds) is a rule card with `game_rule: true`, `evidence: placeholder` and a plain note, and appears in the rule book as a game rule. None has a real figure behind its size and none claims one.
- The need factor (R4) and the S3 floor read real 2026 figures, and say which.
- Momentum, roots, people moving and chapters are game estimates. The words "on the rise" and "slipping" are about the game's board, and the panel says so.
- Coins only. No pound figures. No parties, no living politicians: a lost election is "you govern with others", and a deal is with a council, not a party.
- All new text at reading age about 11, sentences of 18 words at most, Welsh written fresh with `cy_review: true`. No em dash or en dash characters anywhere.

### 16.6 Proof marks for the revised game

Section 13.1 and 13.3 stand, with five additions to 13.1. Section 13.2 is amended as below. Marks that are not listed here stay exactly as written.

**Bots.** The nine of 13.2, plus three: **Sleeper** (does nothing until 2034, then plays as Skilled), **Rescue** (spends only in the three lowest councils until 2038, then as Skilled), **Scatter** (as Skilled, but never builds within one link of its own projects of the same branch). Bots act when a year closes and at stops.

| Claim | Measure | Pass mark | Status |
|---|---|---|---|
| Nothing slides by itself | A game with no actions, events off | Ends within 0.5 of 2026 | New |
| The drift is mild | Autopilot median against 2026 | 2 to 5 points lower | New |
| Skill beats autopilot | Skilled against Autopilot, same game number, on the result | In 95 of 100 or more, median gap 15 or more | Same mark. The result is now Left for 2050 |
| Strategies end far apart | Highest bot median less lowest, across the twelve | 18 or more | New |
| Good strategies stay close | Best branch bot median less second best | 6 or less | Same |
| Keystones can be reached | Each branch bot finishes its keystone. Skilled finishes two | In 80 of 100 or more. In 60 of 100 or more | New |
| You cannot have it all | Best of 5,000 random runs | Never four keystones. Three in under 5 in 100 | Same |
| Early choices compound | The same joined tier 1 project given free in 2027 against 2039, in Skilled's game, effect on the 2050 board | Twice or more | Same mark, in years |
| Together beats scattered | Skilled median less Scatter median | 6 or more | New |
| Place matters | Skilled's projects moved to random legal councils | Median falls by 8 or more | Same |
| Paths part over time | Mean distance between branch bots' boards in 2050, divided by the same in 2034 | 2.0 or more | New |
| Strategies build different Waleses | Between branch bots, divided by within one bot | 2.0 or more | Same |
| The difference is on the map | Council measures 2 points or more apart, two most different branch bots | A quarter or more | Same |
| People end up in different places | Mean young adult share of the valley councils in 2050, highest bot less lowest | 3 in 100 or more | New |
| No runaway | Any council's young adult share, any run | Never below 0.6 or above 1.5 of its 2026 share | New |
| Tipping points happen, and differ | Councils that change momentum in a median Skilled run. Overlap of the risen councils between two branch bots | 3 or more. Half or less in common | New |
| A lost election is not the end | Runs of Skilled and branch bots with a lost election: the next one won. Their median result against runs with no loss | In 70 of 100 or more. Within 6 points | New |
| A late start recovers | Sleeper against Autopilot, and against Skilled | At least 8 above Autopilot. At least half of Skilled's gain | New |
| The lowest can come back | Rescue: the lowest council's mean by 2050, and whether it tipped to on the rise | Up 1.5 or more. In 80 of 100 or more | New |
| Cities first does not win | Cardiff first against Skilled, and its endings | At least 10 lower. Two countries or The city and its bedrooms in most runs | Same |
| Many endings are real | Endings reached in a tenth of some bot's runs | 8 of 12 or more | Amended (was 6 of 8) |
| No ending swallows the rest | Largest share of one ending, branch bots and Skilled | 40 in 100 or less | Same |
| Stories differ | Different six-chapter sequences in 200 Skilled and branch runs. Largest share of one chapter over all terms. Chapters that appear at all | 40 or more. Half or less. All 18 | New |
| Luck does not decide | 10th to 90th percentile spread for each bot | 12 or less, and less than the Skilled to Autopilot gap | Same |
| Each branch has its day | A start and future where its bot is top | All four | Same |
| The fairness rule holds | Outside severity for each game number | 9 to 11 | Same |
| The clock is exact | Replay of a log. `tick` 96 times against `advance`. Fixture at `years_per_step: 2` against the phase 1 snapshot | Byte equal. Byte equal. Within 0.01 | New |
| The bots are fast enough | Quick run. Full run of 200 game numbers | Under 3 minutes. Under 15 minutes | New |

`bots.test.ts` runs the marks on fewer game numbers. `scripts/board-balance.ts` prints the table to `docs/design/board-balance-log.md`. No persona plays a build that fails this table.

**Added to 13.1 (cold personas):**

| Pass mark | Bar |
|---|---|
| The clock | At least 6 of 8 pause and change speed without being told how. Nobody says they felt rushed or that things happened while they were reading |
| Length | Each game takes 12 to 25 minutes |
| The retell | After each game, with the end screen closed, each persona tells the story of their game in three sentences. A judge marks it against the six chapters and the turning points. At least 6 of 8 are true to them |
| Not doomed | "Was there a time when you felt nothing you did could matter?" At most 1 of 8 say yes |
| A losing game | Two personas are asked to play their second game carelessly. Both rate "was the ending worth reading?" at 7 or more, and both name something they would do differently |

The human gate of 13.4 gains one question for Luke: "Did the clock make it feel like things were in motion?"

### 16.7 Phase 2 build plan

Six packages, numbered on from phase 1. Package 12 is the old package 6, folded in. A file has one owner. A need in someone else's file goes in `src/board/NEEDS.md`, as before.

| # | Package | Owns | Depends on | Done when |
|---|---|---|---|---|
| **7** | **Contract and clock** (one agent, first, alone) | `src/board/engine/types-*.ts`, `types.ts`, `api.ts`, new `time.ts`, `clock.ts` (replaces `turn.ts`, with `clock.test.ts` and `clock-equivalence.test.ts`), `ctx.ts`, `frame.ts`, `hand-state.ts`, `runcode.ts`, `conditions.ts`, `end-conditions.ts`, `rules.ts`, `rule-defaults.ts`, `errors.ts`, `fixture*.ts`, `determinism.test.ts`, `view.ts`, `test-play.ts`, `src/board/model/`, `src/board/boundaries.test.ts`, `model/board/game.yaml`, `scripts/build-board-model.ts`, `scripts/board/`, `docs/adr/0007-*.md` (the clock: steps, the log, yearly frames and ledger), `docs/adr/0008-*.md` (growth and momentum rules), `GLOSSARY.md`. For this stage only, it also makes the mechanical renames and the per year rates of 16.2.4 in every other engine file and in the `*_turns` fields of `model/board/*.yaml`, with no change of behaviour | This section | Typecheck and all engine tests pass at a quarter year step. The equivalence test passes at a two year step. The open `NEEDS.md` entries for packages 0, 1 and the coordinator are closed |
| **8** | **Engine: growth and spread** | `held.ts`, `effects.ts`, `projects.ts`, `actions.ts`, `preview.ts`, `budget.ts`, `spread.ts`, `explain.ts`, new `roots.ts` (R1, R3, R4) and `momentum.ts` (R2), their tests, `model/board/rules/spread.yaml`, `rules/budget.yaml`, new `rules/growth.yaml` | 7 | Roots, need, momentum, the bounded two sided S3, the purse and the yearly ledger fold work on the fixture and the real model. Every change still has a Why? |
| **9** | **Engine: people, events, story, score, bots** | `people.ts`, `people-moods.ts`, `events.ts`, `events-land.ts`, `events-schedule.ts`, `score.ts`, `endings.ts`, `places.ts`, new `deals.ts` (P6), `story.ts` (chapters, moments, turning points) and `timeline.ts`, `bots*.ts`, their tests, `scripts/board-balance.ts`, `model/board/rules/people.yaml` (P1, P3, P6, G1, E1, E2), `groups.yaml`, `futures.yaml`, `docs/design/board-balance-log.md` | 7, then 8's `momentum.ts` | The balance script runs twelve bots and prints the 16.6 table inside the time limits |
| **10** | **Content and words** | `model/board/projects.yaml` (years, sizes, `quick`, the repairs team, four legacy projects, keystones at 8), `tree.yaml`, `pairs.yaml`, `laws.yaml`, `events.yaml`, `starts.yaml`, `endings.yaml` (twelve), `letters.yaml` (24), `places/*.yaml`, new `story.yaml` (18 chapters), `model/i18n/{en,cy}/board.json`, `src/board/content/` | 7 | The model builds strict. The copy test and the content test are green in both languages |
| **11** | **UI: the clock and the board** | Everything now in `src/board/ui/` except `end/` and `place/`: `game.ts` (the runner, the stops, the settings), new `clock/Clock.tsx`, `clock/runner.ts`, `clock/Settings.tsx`, `Timeline.tsx` (rewritten), `TopStrip.tsx`, `MapStage.tsx` (build rings, live pulses, momentum marks), new `TermReport.tsx` and `Ticker.tsx`, `Election.tsx`, `Respond.tsx`, `CouncilPanel.tsx`, `BuildMenu.tsx`, `WhyPanel.tsx`, `Guide.tsx`, `board.css`, `copy.test.ts`, `model/i18n/{en,cy}/boardui.json`. Deletes `Passing.tsx`, `Report.tsx`, `ForecastSlip.tsx` (its content moves to the time line) and `standin/` | 7. Plays against the fixture until 8 and 9 land | A full game runs by clock and by step at `#/bwrdd`, keyboard only, with every stop working |
| **12** | **UI: end, places, rule book, e2e** (the old package 6) | `src/board/ui/end/` (time-lapse with turning points, the name, six chapters, then and now, letter, the Wales you did not build, the count, run code), `src/board/ui/place/` (the Rhondda adapter and `LightPlace.tsx`), the board section under `src/ui/book/`, new `model/i18n/{en,cy}/boardend.json`, `tests/e2e/board.spec.ts` | 7, then 9's `story.ts` and 11's `Timeline.tsx` (imported, not edited) | End screen from a bot run. E2e green: a full game in step by step mode in English and Cymraeg, one game run on the clock at fast speed, pause and resume, a hard stop, the run code round trip, axe on each screen, and `#/yfory` still plays a v1 turn |

**Order.**

1. **Package 7 alone.** It is the only one that touches every engine file, and only mechanically. Nothing else starts until its two clock tests pass.
2. **Packages 8, 9, 10, 11 and 12 together.** 8 and 9 switch the new rules on one card at a time, each behind its rule card: a model without the card behaves as before, so the fixture tests keep passing.
3. **First join:** real model, typecheck, tests, one bot game, one hand game by step.
4. **Balance:** package 9 runs the bots. Packages 8, 9 and 10 change numbers in `model/board/` only. Order of blame when a mark fails: "nothing slides" and "no runaway" point at S3 and P3. "Strategies end far apart" and "early choices compound" point at R1 and the size multipliers. "Keystones can be reached" points at income, the purse and build years. "A lost election is not the end" points at P6 and P1. "Stories differ" points at chapter priorities in `story.yaml`.
5. **Second join:** e2e in both languages, v1 regression, a preview channel. Then the loop of 14.3, with 16.6 as the bot gate.

**What phase 2 does not do:** new councils, new branches, sound, an ensemble, phones. The four legacy projects and the repairs team are the only new projects. If a mark in 16.6 fails after three balance rounds, the coordinator writes down which and why and leaves it for Luke. The marks are not lowered.
