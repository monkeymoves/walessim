# v3: all Wales first, then the regions

*28 November 2026. Luke's direction: all 22 councils first, then regions, Fast as the default speed, a red outline round the thing to click whenever the game waits. Builds on `v2-board.md` (sections 13 and 16 stand unless changed here). Starts from the model after fix round 3. Every size is a game rule to tune unless it says "real".*

## 1. The shape

**One game, one rule set, several boards.** A board is a list of councils plus its regional content, as data. The engine already takes any list (`model.game.councils`), so no rule changes per board.

**Boards.** Luke named SE, SW, Mid, NW and NE. Checked against `model/authorities.yaml`, that gives 10, 4, 2, 3 and 3 councils. Proposed set:

| Board | Councils | Why |
|---|---|---|
| All Wales | 22 | The main game. First on the picker |
| South East | 10 | As now |
| North | 6 | NW and NE joined (see below) |
| South West | 4 | Pembrokeshire, Carmarthenshire, Swansea, Neath Port Talbot. The smallest board that still works |
| Mid and West | 5 | Ceredigion, Powys, plus Gwynedd, Carmarthenshire and Pembrokeshire. Shares three councils with other boards, which is fine: a board is only a list |

**Why not NW, NE and Mid alone.** Said honestly:

- **Mid (2 councils) does not work.** Powys holds 65 in 100 of the people (`authorities.yaml`), so it wins every election alone and Ceredigion never counts. The keystone gate ("working in two councils") means every council. A deal has one possible partner.
- **NW and NE (3 each) half work.** Any two councils win every election. There are three or four links in all, so "where" is barely a choice, and much north east commuting probably leaves the board for England (check on the re-cut). The divergence and tipping marks cannot be met with three councils.
- **North as six is the better game.** It has its own tension, like city and valleys: work and the border in the east, the language heartland and slate country in the west.

**Luke's five names are still used:** on All Wales they are the five map groups the player reads at a glance (section 2). The three small boards could still ship as "short boards" (neighbours as stubs, a keystone gate of one council, their own marks). Not recommended.

**The start screen.** `#/bwrdd` opens on a picker: a map of Wales, All Wales chosen, the four regions as paper tabs beside it. Picking one highlights its councils and says in two lines what the board is about. Then the promise cards and Start, as now. A saved game is offered first, with its board's name.

**Same on every board:** the clock, six measures, the three shared branches (Made here, Living landscape, Good homes), the tree's shape, laws, elections, deals, the 12 ending ids and their conditions, the 24 chapter kinds, the scores.

**Different by board, all data:** councils, stubs, the first branch (section 3), starts, some events, place visits, and the names and words of endings and letters.

**Files.** Shared content stays in `model/board/*.yaml`. Each board gets `model/board/boards/<id>/`: `board.yaml` (name, councils, stubs, map groups, `core` and `edge` groups, stop defaults, board sizes), `branch.yaml`, `starts.yaml`, `events.yaml`, `words.yaml` and `places/`. `game.yaml` keeps the calendar and loses `region` and `councils`. The build writes one compiled model per board. The run code and the save key carry the board id (keys set and removed singly).

**Groups replace hard-wired flags.** Endings, starts and bot marks now say `flag: valley` and `flag: city`. They change to `group: edge` and `group: core`, which each board defines from flags (All Wales: rural or valley, and city). One set of conditions then serves every board.

## 2. All Wales at 22 councils

The risk is attention: a season every 1.5 seconds and 22 places to watch. The answer: five things to watch, not 22, and a fixed budget of stops.

**Five groups.** On All Wales the councils sit in five map groups: North West, North East, Mid, South West, South East. A strip of five chips sits by the map. Each shows: councils backing you ("7 of 10"), the lowest measure with its icon and word, builds in progress, and a mark if something there is waiting. Click a chip to zoom the map to that group (`focusLas` already does this). Click the sea, or press Escape, to come back.

**Map density at 1280 by 800.** Wales is about 240 km tall in the km frame, so the Wales view is under 3 pixels a km and the smallest councils (Blaenau Gwent, Merthyr Tydfil, Torfaen) are under 30 pixels across. Rules:

- At Wales zoom a council shows its fill (backing, or the chosen measure) and at most one mark. Build rings, pulses and momentum marks show only from group zoom in.
- A council drawn under 28 pixels across is not a click target at Wales zoom: the click zooms to its group. Every target is 24 pixels or more.
- Links at Wales zoom: rivers and the strongest commuting link from each council only. All links at group zoom.
- A layout test at 1280 by 800 checks that no two marks overlap.

**Stops and warnings do not scale with councils.** A game must still last 12 to 25 minutes with 30 to 40 stops.

- Outside severity (9 to 11) and the limits on grown events stay per game, not per council.
- On All Wales, warnings of one year arrive on one card ("This year", up to three lines, each with its group). Tipping, full purse, visit and deal-due lines go to the ticker by default. Keystone, tier, chapter, election and answer stops stay.
- New bot mark: stops in a median Skilled game, 40 or fewer on every board.

**Elections.** The rule holds: a council backs you at 5, and you win with more than half the people. No parties, no politicians. Two things change, both data:

- The South East holds 49 in 100 of the people (1,554,000 of 3,151,000 in `authorities.yaml`). South East plus one council wins. That is real and stays, but "won well" on All Wales needs two thirds of the people **and** most councils in at least four of the five groups (game rule, tune).
- The election card and the term report list by group ("North West: 2 of 3"), never 22 rows. Open a group to see its councils.

**Deals.** After a lost election the two councils on offer come from two different groups, and never one whose deal is already broken (playtest 10 should-fix 8).

**Laws.** The same three generic laws. The preview shows the count before and after by group, with councils one click down.

**Scores.** As now. `lowest_count` becomes a board size (about a third of councils), so All Wales cannot be won by leaving a region behind.

**The clock.** `default_speed: fast` on every board, as Luke asked (1.5 seconds a season, six seconds a year). Honest note: 7 of 8 cold players felt rushed at a slower default. So "Hold the clock while I read" stays on, the clock never restarts under a card, and Step by step stays in settings.

**The needs-you outline.** Whenever the clock is held for the player, exactly one thing on screen carries a red outline and the words "Waiting for you".

| The game is held because | The outline goes on |
|---|---|
| An event, a law, a deal or a visit needs an answer | The group of choices ("Waiting for you: choose one") |
| A card is up (election, keystone, warning, chapter) | Its Carry on button |
| A sheet or Why? is holding the clock | Its Close button |
| The game has just opened, or the player paused and touched nothing for 8 seconds | Play |
| Step by step mode | Next season |

- One pure function, `waitingOn(session)`, returns one target or none. A test walks whole games and fails if a held clock ever has no target or two.
- The clock chip in the top strip says the same words. Clicking it moves focus to the target.
- **Look:** a 3 pixel red ring with a white keyline inside it (so it reads on paper and on slate, 3 to 1 contrast or better), plus a text tab, "Waiting for you". Never colour alone.
- **Motion:** the ring pulses once a second (far under three flashes a second) between full and 40 in 100 strength, never to nothing, for 5 seconds, then stays steady. Under `prefers-reduced-motion`, or with "Flashing outline" off in settings, it is steady from the start.
- **Screen readers:** one polite announcement when it appears ("Waiting for you: choose an answer for Gwynedd"). Focus lands on the card's heading, never on a button that answers (playtest 10 must-fix 10).
- This part needs no new councils. It ships first, on the South East board.

## 3. Content and data

**Commuting (real).** Re-cut Census 2021 ODWP01EW (`nomis_census_odwp01ew`) once for all 22 councils, keeping every destination of 1 in 100 or more, English ones included. The build cuts it per board and folds off-board destinations into stubs. Stubs to expect on All Wales (confirm from the file): Bristol, the Forest of Dean and Herefordshire, Shropshire, Chester and Cheshire, Wirral and Merseyside. On a regional board, neighbouring Welsh councils are stubs too.

**Rail (real).** `wales-rail.json` (`osm_rail_wales`) covers Wales. Mid and north west rail is sparse and only rail links can be built on today. Need: a link project may also sit on a commuting link (a fast bus on the trunk road). Roads are named in words only (A55, A470, A40), checked against OS Open Roads (new source, OGL).

**Rivers (real direction, authored).** One file for Wales, `model/board/rivers.yaml`, in flow order, one hop a row. Each board takes the rows it holds. Every row keeps `to_check: true` until checked against OS Open Rivers and the NRW catchment maps (`os_open_rivers`, `nrw_catchments`). To author (from memory of the courses, so check each):

| River | Hops |
|---|---|
| Dee | Gwynedd, Denbighshire, Wrexham, Flintshire (part of the lower river is in England) |
| Elwy and Clwyd | Conwy, Denbighshire |
| Severn | Powys, the Shropshire stub |
| Wye | Powys, the Herefordshire stub, Monmouthshire |
| Usk | Powys, Monmouthshire, Newport |
| Taff | Powys (head streams), then as now |
| Tawe | Powys, Neath Port Talbot, Swansea |
| Neath | Powys, Neath Port Talbot |
| Taf (west) | Pembrokeshire, Carmarthenshire |
| Dyfi | Gwynedd, Powys, the Gwynedd and Ceredigion border |
| Teifi, Loughor | Border rivers: weak cases, check first |

Rivers inside one council (Conwy, Tywi, Cleddau, Afan) make no link. Anglesey has none: its floods come from the coast.

**Features (real).** Coal tips stay on the `coal_valley` flag as now. The Welsh Government tip register and tip count table are excluded until Welsh Government and the Mining Remediation Authority give permission (their licence is not open), so no tip counts. Ports from DfT port freight statistics (new source, OGL). The 2026 seeds come from `la-indicators.json` as now.

**The first branch, by board.** Same shape everywhere (two starters, a quick project, one bigger project, a keystone, a legacy project), so the tree and the bots do not change.

| Board | Branch | About |
|---|---|---|
| South East | Joined-up valleys | As now |
| North | The coast road and the line | The coast line and the A55 towns, the port at Holyhead, work that stays this side of the border. Keystone: work moves west along the line |
| South West | The bay and the ports | Swansea Bay buses and trains, the port towns (Port Talbot, Milford Haven, Fishguard), new work on old industrial land. Keystone: the ports find their next trade |
| Mid and West | Market towns | Long distances, few trains. Buses that come when called, a college and public jobs in market towns, fast internet. Keystone: towns that keep their young |
| All Wales | Joined-up Wales | The shared starters, plus the keystone "Work moves out": public bodies and firms take offices in towns on good lines, anywhere outside the cities |

The other three branches are shared. The valleys park becomes a "regional park" named per board, with an upland version for rural councils.

**Starts.** All Wales: Work close to home, Warm safe homes, Ready for the weather, and a new one, A living language (Welsh and culture up in the heartland councils). Each region adds one of its own.

**Events.** About 8 of the 24 are valley shaped. Retarget them to groups, then add about 8 for All Wales, sourced for direction only: second homes rise, the ferry trade falls, farm incomes squeeze, the last bank leaves a market town, the bridge to the island closes, a seaside town's season overloads it. Each region adds two or three.

**Endings, letters, story.** Ids and conditions stay. Names and words vary by board in `words.yaml` ("The joined-up valleys" becomes "The joined-up north"). Letters take `{town}` from the council's towns in `authorities.yaml`.

**Places.** One or more per region. South East has three. North West: Bethesda, adapted from v1 as Rhondda was. New, each one hard choice: Rhyl (North East: sea, flood and a seaside town; `statswales_flood`, `wimd_2025`), Port Talbot (South West: what the works land is for), Machynlleth (Mid: a market town on the line and the Dyfi).

**Honesty.** Every new figure traces to `model/sources.yaml`, with a row in `docs/data-licences.md` (OS Open Rivers is still marked not checked there). All Welsh is a draft with `cy_review: true`.

## 4. Balance

`npx tsx scripts/board-balance.ts --board <id>` prints one table per board to `board-balance-log.md`. No persona plays a board that fails its table.

**Holds on every board (the 16.6 table, reworded for groups).** Above all: choices diverge (distance 2.0 or more, and on the map); careless loses an election in 70 of 100 runs but is not wiped out (a lost election is not the end, a late start recovers); a lever exists (the lowest council can come back, nothing slides by itself); core first does not win.

**New for All Wales:**

| Claim | Measure | Pass mark |
|---|---|---|
| South East first does not win | A bot that builds only in the South East, against Skilled | 10 or more lower, never wins well, ends in Two countries or The city and its bedrooms in most runs |
| Every group has a lever | Five rescue bots, each spending in one group until 2038 | That group's lowest council up 1.5 or more, in 80 of 100 |
| Trouble is shared | The group of the lowest council in 2050, across branch bots | At least four of five groups appear |
| The player can keep up | Stops in a median Skilled game | 40 or fewer |
| The bots are fast enough | Quick run of 50 game numbers. Full run | Under 5 minutes. Under 30 minutes |

**Sized to the board, stated now:** tipping points in a quarter of councils or more; endings reached, 8 of 12 on All Wales and North, 6 of 12 on the two smaller boards. The four marks failing today (drift, tipping overlap, stories, each branch has its day) must pass on the South East before All Wales is balanced.

## 5. Build plan

One owner per file. Needs go in `src/board/NEEDS.md`. Every package ends with typecheck and its tests green.

**Stage A: all Wales.**

| # | Package | Owns | Done when |
|---|---|---|---|
| **13** | **Needs-you and the clock** (starts today) | New `clock/waiting.ts`, `NeedsYou.tsx`, its CSS and settings line, `boardui.json` `needs.*`, `default_speed` | Whole-game test: one target whenever held. Reduced motion and axe tests green. Live on the South East |
| **14** | **Contract and boards** (alone) | `model/board/boards/` layout, `src/board/model/`, engine types, the build scripts, run code and save key, a second fixture board, an ADR, `GLOSSARY.md` | The South East compiles to the same model as before. Both fixture boards play |
| **15** | **Data and links** | `pipeline/board/`, `board-commute.json`, `rivers.yaml`, stubs, features, `sources.yaml`, licences, `honesty.test.ts` | The 22 council model builds, every figure sourced |
| **16** | **Engine and bots** | Groups, won well, deal choice, stop budget, link sites on commuting links, bots and marks, `rules/*.yaml` | The All Wales table prints in time |
| **17** | **Content and words** | Shared content files, `boards/wales/`, `boards/southeast/`, four new places, `board.json` | Strict build and copy tests green, both languages |
| **18** | **UI: picker and map** | `StartScreen.tsx`, `MapStage.tsx`, the group strip, council panel, election, term report, laws sheet, `board.css` | A full All Wales game by hand at 1280 by 800, keyboard only |
| **19** | **End, rule book, e2e** | `ui/end/`, `ui/place/`, the rule book, `tests/e2e/` | E2e green on both boards and languages. v1 still plays |

Order: 13 at once. 14 alone. Then 15 to 19 together, a join, balance in `model/board/` only, a second join.

**Stage B: regions,** after All Wales passes its bot table. One package each, in parallel: **20 North, 21 South West, 22 Mid and West.** Each owns only `model/board/boards/<id>/` and its section of the balance log, and ends with its bot table passing and an e2e smoke game in both languages. No engine or UI changes: a need for one goes in `NEEDS.md`.

**The proof.**

1. Bot gate per board (section 4).
2. All Wales cold round: eight fresh personas, two games each, the marks of 13.1 and 16.6 unchanged. Three are local to new ground (Powys, Bangor, Wrexham). New marks: nobody leaves a held clock untouched for more than 10 seconds; 0 of 8 say "I did not know what it wanted"; every wrong local fact is fixed before the next round.
3. One cold round per region board: four fresh personas, two of them local, same marks.
4. The human gate of 13.4, on All Wales.

## 6. Open questions for Luke

1. **Regions.** North as one board of six, and Mid widened to Mid and West (five, sharing councils with its neighbours)? Or do you want NW, NE and Mid as short boards anyway, knowing what they lose?
2. **Elections on All Wales.** The South East is 49 in 100 of the people, so South East plus one council wins. Keep that as real, with "won well" needing four of the five groups?
3. **Fast as default.** Seven of eight cold players felt rushed at a slower default. Ship Fast for everyone, or Fast from a player's second game?
4. **The outline** pulses for 5 seconds, then stays steady. Is steady enough, or should it pulse again after a long wait?
5. **Places.** Rhyl, Port Talbot and Machynlleth for the new visits?
6. **v1.** Does it stay live as "the short game" once All Wales passes?
7. **Welsh.** Who is the fluent reviewer for the new place names and words?

## 7. Luke's answers (28 November 2026)

Luke accepted the recommended answers:

1. Boards: All Wales (22), South East (10), North (6), South West (4), Mid and West (5). His five names are the map groups on All Wales.
2. The South East's 49 in 100 stays as real. "Won well" on All Wales needs two thirds of the people and most councils in four of the five groups.
3. Fast is the default for everyone. The slower speeds stay in settings.
4. The outline pulses for 5 seconds, then stays steady.
5. The new visits are Rhyl, Port Talbot and Machynlleth.
6. v1 stays live as "the short game".
7. The fluent Welsh reviewer is still to find. All new Welsh keeps `cy_review: true`.
