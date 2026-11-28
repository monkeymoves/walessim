# Board balance log

Model: public/board-model.json (hash f20659cd0624). 200 game numbers, every start in turn, futures drawn from the game number. 5000 random search runs, 20 games for the idle, compounding and law measures, 60 each for Skilled at random sites and for Spreader. Took 1002 seconds.

Every size in the game is a game rule; these are measures of the bots, not of Wales.

## Section 16.6 pass marks: 31 of 36 met

| Claim | Measure | Value | Pass mark | Result |
|---|---|---|---|---|
| Nothing slides by itself | no actions, events off: largest change from 2026 | 0.46 | <= 0.5 | pass |
| The drift is mild | Autopilot median, points below 2026 | -0.6 | 2 to 5 | FAIL |
| Skill beats autopilot | Skilled beats Autopilot, same game; median gap | 1.00; 25.9 | >= 0.95; >= 15 | pass |
| Thought beats reaction | Skilled beats Reactive, same game | 0.92 | >= 0.85 | pass |
| Thought beats spending | Skilled beats Spender (every coin on the cheapest build), same game | 0.98 | >= 0.85 | pass |
| Things move early | result at the 2030 election less 2026, median: Skilled; Autopilot | 3.1; -0.2 | >= 3; -1 to 1 | pass |
| Strategies end far apart | highest bot median less lowest (skilled v autopilot) | 26.2 | >= 18 | pass |
| Good strategies stay close | best branch median less second (branch-valleys) | 0.0 | <= 6 | pass |
| Keystones can be reached | lowest share of a branch bot's runs with its own keystone; Skilled with two | 1.00; 0.99 | >= 0.80; >= 0.60 | pass |
| You cannot have it all | 5000 random runs: four keystones; three | 0; 0.000 | 0; < 0.05 | pass |
| Early choices compound | a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median) | 2.28 | >= 2 | pass |
| Together beats scattered | Skilled median less Scatter median | 23.5 | >= 6 | pass |
| Depth beats spread | Skilled median less Spreader (always takes a fresh start when one is on offer) | 2.0 | > 0 | pass |
| Place matters | Skilled median less Skilled at random sites | 10.5 | >= 8 | pass |
| Paths part over time | branch bots: distance in 2050 / in 2034 | 2.72 | >= 2.0 | pass |
| Strategies build different Waleses | branch bots: distance between / within | 4.87 | >= 2.0 | pass |
| The difference is on the map | measures 2+ apart, branch-made_here v branch-landscape | 0.58 | >= 0.25 | pass |
| People end up in different places | valley young adults in 2050 (in 100): highest bot median less lowest | 5.69 | >= 3 | pass |
| No runaway | young adult share against 2026, any council, any run | 0.850 to 1.500 | 0.6 to 1.5 | pass |
| Tipping points happen, and differ | momentum changes, median Skilled run; risen councils in common, branch bots | 10.0; 0.68 | >= 3; <= 0.5 | FAIL |
| Careless loses | Random loses at least one election: share of runs | 0.91 | >= 0.70 | pass |
| Skill still wins | Skilled wins 4 of 5 elections or more: share of runs | 0.98 | >= 0.80 | pass |
| Coins have a use | Skilled: coins lost to a full purse, share of coins earned | 0.000 | < 0.10 | pass |
| Laws cost | largest change a law makes to one council's Backing 4 years on (weakest law 0.42) | 0.64 | >= 0.5 | pass |
| A lost election is not the end | runs with a loss (308): next won; median result, no loss less loss | 0.98; 2.1 | >= 0.70; <= 6 | pass |
| A late start recovers | Sleeper median less Autopilot; share of Skilled's gain | 15.0; 0.57 | >= 8; >= 0.5 | pass |
| The lowest can come back | Rescue: lowest council's mean by 2050 (median change); share where it rose | 4.45; 1.00 | >= 1.5; >= 0.80 | pass |
| Cities first does not win | Skilled median less Cardiff first; share in Two countries or City and bedrooms | 18.1; 1.00 | >= 10; > 0.5 | pass |
| Many endings are real | endings in a tenth of some bot's runs | 10 (comeback, joined-up-valleys, workshop, green-valleys, warm-country, city-bedrooms, gamble, patchwork, holding-line, long-game) | >= 8 of 12 | pass |
| No ending swallows the rest | largest ending share, branch bots and Skilled | 0.33 (green-valleys) | <= 0.40 | pass |
| Stories differ | 1000 Skilled and branch runs: six-chapter sequences; largest chapter share (keystone-opened); chapters seen | 511; 0.17; 18 of 24 | >= 40; <= 0.50; all 24 | FAIL |
| Luck does not decide | widest 10th to 90th spread (skilled) | 11.0 | <= 12 and < 25.9 | pass |
| Each branch has its day | branches top in some start and future | 2 of 4 | all four | FAIL |
| The fairness rule holds | outside severity per game number, lowest to highest | 9 to 11 | 9 to 11 | pass |
| The clock is exact | replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts) | equal; equal | byte equal; byte equal | pass |
| The bots are fast enough | full run, seconds | 1002 | < 900 | FAIL |

## Bots

| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |
|---|---|---|---|---|
| autopilot | 45.9 | 45.1 to 46.5 | 0.00 | comeback 170, city-bedrooms 20, patchwork 10 |
| random | 54.7 | 52.6 to 58.9 | 0.01 | comeback 133, gamble 30, patchwork 21, city-bedrooms 15, green-valleys 1 |
| reactive | 64.0 | 62.3 to 66.2 | 0.00 | comeback 106, patchwork 93, holding-line 1 |
| branch-valleys | 65.9 | 62.6 to 68.0 | 1.00 | joined-up-valleys 200 |
| branch-made_here | 59.0 | 58.0 to 59.7 | 1.00 | workshop 200 |
| branch-landscape | 65.9 | 65.1 to 66.6 | 1.00 | green-valleys 200 |
| branch-homes | 63.3 | 60.1 to 65.7 | 1.00 | warm-country 200 |
| cardiff-first | 54.0 | 53.3 to 54.6 | 0.00 | city-bedrooms 200 |
| skilled | 72.1 | 64.4 to 75.4 | 1.99 | green-valleys 134, workshop 64, warm-country 2 |
| sleeper | 60.8 | 55.3 to 63.4 | 0.93 | green-valleys 115, workshop 35, comeback 25, joined-up-valleys 17, warm-country 7, long-game 1 |
| rescue | 62.7 | 60.6 to 64.3 | 1.29 | warm-country 136, long-game 47, workshop 11, green-valleys 5, comeback 1 |
| scatter | 48.6 | 47.8 to 49.3 | 0.00 | comeback 170, gamble 30 |
| spender | 62.1 | 58.4 to 63.6 | 0.00 | comeback 86, patchwork 80, holding-line 33, city-bedrooms 1 |

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
