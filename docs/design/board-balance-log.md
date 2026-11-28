# Board balance log

Model: public/board-model.json (hash 592cbe844cd0). 200 game numbers, every start in turn, futures drawn from the game number. 5000 random search runs, 20 games for the idle, compounding and law measures, 60 each for Skilled at random sites, for Spreader and for the lever measure. Took 825 seconds.

Every size in the game is a game rule; these are measures of the bots, not of Wales.

## Section 16.6 pass marks: 34 of 38 met

| Claim | Measure | Value | Pass mark | Result |
|---|---|---|---|---|
| Nothing slides by itself | no actions, events off: largest change from 2026 | 0.46 | <= 0.5 | pass |
| The drift is mild | Autopilot median, points below 2026 | -0.6 | 2 to 5 | FAIL |
| Skill beats autopilot | Skilled beats Autopilot, same game; median gap | 1.00; 24.6 | >= 0.95; >= 15 | pass |
| Thought beats reaction | Skilled beats Reactive, same game | 0.85 | >= 0.85 | pass |
| Thought beats spending | Skilled beats Spender (every coin on the cheapest build), same game | 0.99 | >= 0.85 | pass |
| Things move early | result at the 2030 election less 2026, median: Skilled; Autopilot | 3.2; -0.2 | >= 3; -1 to 1 | pass |
| Strategies end far apart | highest bot median less lowest (skilled v autopilot) | 24.3 | >= 18 | pass |
| Good strategies stay close | best branch median less second (branch-landscape) | 0.1 | <= 6 | pass |
| Keystones can be reached | lowest share of a branch bot's runs with its own keystone; Skilled with two | 1.00; 0.99 | >= 0.80; >= 0.60 | pass |
| You cannot have it all | 5000 random runs: four keystones; three | 0; 0.000 | 0; < 0.05 | pass |
| Early choices compound | a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median) | 2.28 | >= 2 | pass |
| Together beats scattered | Skilled median less Scatter median | 21.8 | >= 6 | pass |
| Depth beats spread | Skilled median less Spreader (always takes a fresh start when one is on offer) | 0.1 | > 0 | pass |
| Place matters | Skilled median less Skilled at random sites | 8.4 | >= 8 | pass |
| Paths part over time | branch bots: distance in 2050 / in 2034 | 2.68 | >= 2.0 | pass |
| Strategies build different Waleses | branch bots: distance between / within | 4.82 | >= 2.0 | pass |
| The difference is on the map | measures 2+ apart, branch-made_here v branch-landscape | 0.58 | >= 0.25 | pass |
| People end up in different places | valley young adults in 2050 (in 100): highest bot median less lowest | 5.70 | >= 3 | pass |
| No runaway | young adult share against 2026, any council, any run | 0.850 to 1.500 | 0.6 to 1.5 | pass |
| Tipping points happen, and differ | momentum changes, median Skilled run; risen councils in common, branch bots | 10.0; 0.67 | >= 3; <= 0.5 | FAIL |
| Careless loses | Random loses at least one election: share of runs | 0.97 | >= 0.70 | pass |
| Skill still wins | Skilled wins 4 of 5 elections or more: share of runs | 1.00 | >= 0.80 | pass |
| Coins have a use | Skilled: coins lost to a full purse, share of coins earned | 0.000 | < 0.10 | pass |
| A lever exists | Skilled: councils under 5 at an election (551) that one build there, paid from a year's coins, lifts to 5 within 4 years | 1.00 | >= 0.90 | pass |
| No wipe-out | Random keeps 2 or more councils backing at every election after 2034: share of runs | 0.96 | >= 0.80 | pass |
| Laws cost | largest change a law makes to one council's Backing 4 years on (weakest law 0.40) | 0.64 | >= 0.5 | pass |
| A lost election is not the end | runs with a loss (446): next won; median result, no loss less loss | 1.00; 2.2 | >= 0.70; <= 6 | pass |
| A late start recovers | Sleeper median less Autopilot; share of Skilled's gain | 16.3; 0.67 | >= 8; >= 0.5 | pass |
| The lowest can come back | Rescue: lowest council's mean by 2050 (median change); share where it rose | 4.57; 1.00 | >= 1.5; >= 0.80 | pass |
| Cities first does not win | Skilled median less Cardiff first; share in Two countries or City and bedrooms | 16.3; 1.00 | >= 10; > 0.5 | pass |
| Many endings are real | endings in a tenth of some bot's runs | 10 (comeback, joined-up-valleys, workshop, green-valleys, warm-country, city-bedrooms, gamble, patchwork, holding-line, long-game) | >= 8 of 12 | pass |
| No ending swallows the rest | largest ending share, branch bots and Skilled | 0.33 (green-valleys) | <= 0.40 | pass |
| Stories differ | 1000 Skilled and branch runs: six-chapter sequences; largest chapter share (keystone-opened); chapters seen | 500; 0.17; 19 of 24 | >= 40; <= 0.50; all 24 | FAIL |
| Luck does not decide | widest 10th to 90th spread (skilled) | 10.6 | <= 12 and < 24.6 | pass |
| Each branch has its day | branches top in some start and future | 2 of 4 | all four | FAIL |
| The fairness rule holds | outside severity per game number, lowest to highest | 9 to 11 | 9 to 11 | pass |
| The clock is exact | replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts) | equal; equal | byte equal; byte equal | pass |
| The bots are fast enough | full run, seconds | 825 | < 900 | pass |

## Bots

| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |
|---|---|---|---|---|
| autopilot | 45.9 | 45.1 to 46.5 | 0.00 | comeback 187, city-bedrooms 11, patchwork 2 |
| random | 54.7 | 52.5 to 58.6 | 0.00 | comeback 147, gamble 34, patchwork 11, city-bedrooms 8 |
| reactive | 64.6 | 62.7 to 66.7 | 0.00 | comeback 106, patchwork 91, gamble 2, holding-line 1 |
| branch-valleys | 65.9 | 62.4 to 68.1 | 1.00 | joined-up-valleys 200 |
| branch-made_here | 59.0 | 58.1 to 59.8 | 1.00 | workshop 200 |
| branch-landscape | 66.0 | 65.4 to 66.7 | 1.00 | green-valleys 200 |
| branch-homes | 62.9 | 60.2 to 65.2 | 1.00 | warm-country 200 |
| cardiff-first | 54.0 | 53.3 to 54.6 | 0.00 | city-bedrooms 200 |
| skilled | 70.2 | 65.0 to 75.6 | 1.99 | green-valleys 134, workshop 66 |
| sleeper | 62.2 | 56.0 to 64.6 | 1.02 | green-valleys 118, workshop 40, joined-up-valleys 19, comeback 16, warm-country 4, long-game 3 |
| rescue | 62.7 | 60.7 to 64.3 | 1.28 | warm-country 138, long-game 43, workshop 15, green-valleys 4 |
| scatter | 48.5 | 47.6 to 49.2 | 0.00 | comeback 170, gamble 30 |
| spender | 62.5 | 58.3 to 64.1 | 0.00 | patchwork 94, comeback 76, holding-line 30 |

## Fix round 2 (playtest 9), package D: what changed and why

Every size below is a game rule, set against the bots; none is a figure about Wales. Package D's own full run after these changes (hash 0279159f848b) met 32 of 36 marks (the 26 that passed before all still pass, Place matters now passes too, and the five new marks pass).

- **Laws cost, and the cost lasts** (must-fix 2). A law's backing points now stand for as long as the law does and come back on repeal (src/board/engine/standing.ts); held.ts no longer takes a law's backing back the step after it passed, which was the "crash then silent recovery". laws.yaml: local homes rule city -0.5 to -0.7; flood plains valley -0.3 to -0.4; visitor charge coast -0.4 to -0.5, rural -0.3 to -0.5, coins 0.25 to 0.5 a year. New mark "Laws cost".
- **A broken deal costs its own council, and fades with a cause** (must-fix 9). P6 `broken` (0.5 everywhere) became `broken_here` 1.5 and `broken_years` 4: that council only, fading a quarter a year as its own P6 record.
- **The keystone gate is stated** (must-fix 1). tree.yaml names the bigger project that must work in two councils; a legacy project never counts for a gate (conditions.ts). Blockers carry `have`.
- **People expect more each term** (should-fix 1). P1 `expect_points` 0 and `expect_rise` 0.12: each group judges what it cares about against that much better than four years ago, more for every election held. New marks "Careless loses" (Random loses an election in 0.91 of runs) and "Skill still wins" (Skilled wins 4 of 5 or more in 0.98).
- **Coins** (should-fix 1). B1 `purse_max` 16 to 20, `growth_per_year` 0.5 to 0.35, so a good player's late income (about 14 a year in 2045 before) fills the purse more slowly. Skilled loses no coins to the purse (new mark "Coins have a use"). After the 2044 keystone start, Skilled's board still offers about 100 builds and upgrades worth something in 2045 to 2049 (bigger levels, legacy projects, projects in new councils), so the 2044 cut-off stays.
- **Fresh starts** (should-fix 10). R3 discount 3 to 2, `joined_years` 12 to 8 (the 16.3 starting sizes), new `max_tier` 2 (never a keystone). New bot Spreader (Skilled that takes a fresh start whenever one is on offer), and the mark "Depth beats spread": it was -0.5 at 3 and 12 (spreading won), now 2.0.
- **Events differ between games** (should-fix 12). E1 `grown_first_years` 2 (the first trouble the board grows comes in a seeded year from 2026 to 2028) and `grown_jitter_years` 0. Tested in events-variety.test.ts.
- **Local truth** (should-fix 11). A river flood raises flood risk a step where it lands; a surgery closing takes 0.15 off Health, not 0.3. The Ebbw Valley Line words are in src/board/NEEDS.md (package C and the data owner).

## Fix round 2, the join: what changed and the run above

The table above is the join's full run on the joined model (hash f20659cd0624), with 8 workers while two browser games and the unit tests ran beside it. It matches package D's run mark for mark except "The bots are fast enough": 1002 seconds here against 769 for D's run on 11 idle workers, so that FAIL is the machine, not the code. The other four FAILs (drift, tipping, stories, branch day) are as before.

- **One last season for a keystone.** The build blocker let a keystone start up to Spring 2045 when won-well discounts shortened it, while game.yaml, the time line and the build menu said May 2044. Engine time.ts `keystoneLastStep` (the first step of 2044) is now the one answer for all of them. Sleeper reaches a keystone in 0.93 of runs (0.98 before), median 60.8 (60.9): a late keystone is now refused in Summer 2044 as the screens always said.
- **The verdict's "about the same" band.** G1 `band_little` 3 to 1.5 points, after the join's careless game lost two elections, read "Down 1.7 since 2026" in play and was told "about the same as you found it" at the end. A game rule; no bot mark reads it. Not in the run above.
- **Clock speeds.** game.yaml brisk 1500 to 2500 ms a step, fast 750 to 1500. The bots do not use the clock.

## Fix round 3 (playtest 10), package D: what changed and why

The table at the top is package D's full run after these changes (hash 592cbe844cd0, 825 seconds): 34 of 38 marks. Every mark that passed before still passes; Place matters (8.4) and The bots are fast enough pass again; the two new marks pass. Four still fail, as in every round: drift, tipping in common, stories seen, each branch's day. Every size below is a game rule, set against the bots; none is a figure about Wales.

- **A lever on every council under 5** (must-fix 4: "backing sat at 4.9 whatever I built"). Backing is the groups' moods, which hover near 5, and a build moved it by about 0.15, so nothing a player built showed. New rule P7 "Asked and answered" (people.yaml): in a council that does not back you, a new project that lifts one of the two measures it asks for (the panel's "Asking for") adds 0.6 Backing there once it works, fading evenly over four years (a standing part, standing.ts). The build preview shows it. Limited to councils under the line: open to every council it lifted Reactive and Spreader more than Skilled (Thought beats reaction 0.82, Depth beats spread 0.0 in the run before). New mark "A lever exists": in Skilled games, each council under 5 at an election, tried with every single build there a year's coins would pay for, reaches 5 within four years in 551 of 551 cases.
- **No wipe-out, and careless still loses** (must-fix 4: the careless student at 0 of 10 from 2038). P1 `expect_rise` 0.12 to 0.16 for each election won, and new `loss_eases` 1: a lost election takes back one election's worth of what people expect. A careless game now loses and recovers rather than sitting at 0 of 10. New mark "No wipe-out": Random keeps 2 or more councils at every election after 2034 in 0.96 of runs; Careless loses 0.97, Skill still wins 1.00. The expectation part of each mood move is now its own P1 record (cause `expect`), so Why? can name it. The B2 care bill was checked with the bots: it is not what holds backing down; coins pile up rather than run short.
- **Deals** (must-fix 1, should-fix 8). Kept by any project that lifts the measure and works there by the deal's last step, as the words say; never offered for a measure that anything standing there already lifts; councils never in a deal are offered first and a broken one last. deals-truth.test.ts checks this over whole bot games.
- **Coins** (should-fix 1). B1 `purse_max` 20 to 24, and P7 gives late coins a use that shows. Coins have a use still 0.000.
- **The middle verdict band** (should-fix 7). G1 `band_some` 5: +1.5 a little better, +5 better, +10 much better.
- **Left for 2050 moves when a build works at once** (should-fix 4). on-the-way.ts counts what the board has not yet applied, so an upgrade or a build after a strong win no longer reads "(0.0)".
- **Each branch's day, tried again.** Raising Made here and Homes lifts by 15 to 30 percent moved Made here's median by 0.2 (it lifts mostly Work, one measure of six), so it was not kept. Stories seen (19 of 24) depends on story.yaml (package A). Drift and tipping in common are as before.

## Fix round 3, the join: the run checked

The join ran the full gate again on the joined model (hash 48f55d24b5ac: only an event answer's English name and screen copy changed since package D's run, no rule). It matched package D's table above mark for mark, 33 of 38, except "The bots are fast enough": 992 seconds while two browser games and the e2e run shared the machine, against D's 825 on idle workers. So the table above, D's, is kept as the fuller record: 34 of 38. The four marks that fail in every round still fail (drift, tipping in common, stories seen, each branch's day). The join changed no rule; its changes are on screen (the deal words now call the engine's deal helpers, the council panel and the full purse card name the P7 lever, Why? names the P1 expectation and the P7 answer).
