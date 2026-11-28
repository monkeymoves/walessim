# Board balance log

Model: public/board-model.json (hash 2a73af1a5633). 20 game numbers, every start in turn, futures drawn from the game number. 200 random search runs, 6 games for the idle and compounding measures, 20 for Skilled at random sites. Took 89 seconds.

Every size in the game is a game rule; these are measures of the bots, not of Wales.

## Section 16.6 pass marks: 26 of 31 met

| Claim | Measure | Value | Pass mark | Result |
|---|---|---|---|---|
| Nothing slides by itself | no actions, events off: largest change from 2026 | 0.46 | <= 0.5 | pass |
| The drift is mild | Autopilot median, points below 2026 | -0.4 | 2 to 5 | FAIL |
| Skill beats autopilot | Skilled beats Autopilot, same game; median gap | 1.00; 26.6 | >= 0.95; >= 15 | pass |
| Thought beats reaction | Skilled beats Reactive, same game | 1.00 | >= 0.85 | pass |
| Thought beats spending | Skilled beats Spender (every coin on the cheapest build), same game | 1.00 | >= 0.85 | pass |
| Things move early | result at the 2030 election less 2026, median: Skilled; Autopilot | 3.4; -0.2 | >= 3; -1 to 1 | pass |
| Strategies end far apart | highest bot median less lowest (skilled v autopilot) | 26.6 | >= 18 | pass |
| Good strategies stay close | best branch median less second (branch-valleys) | 3.1 | <= 6 | pass |
| Keystones can be reached | lowest share of a branch bot's runs with its own keystone; Skilled with two | 1.00; 1.00 | >= 0.80; >= 0.60 | pass |
| You cannot have it all | 200 random runs: four keystones; three | 0; 0.000 | 0; < 0.05 | pass |
| Early choices compound | a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median) | 2.41 | >= 2 | pass |
| Together beats scattered | Skilled median less Scatter median | 25.1 | >= 6 | pass |
| Place matters | Skilled median less Skilled at random sites | 6.5 | >= 8 | FAIL |
| Paths part over time | branch bots: distance in 2050 / in 2034 | 2.39 | >= 2.0 | pass |
| Strategies build different Waleses | branch bots: distance between / within | 7.24 | >= 2.0 | pass |
| The difference is on the map | measures 2+ apart, branch-made_here v branch-landscape | 0.61 | >= 0.25 | pass |
| People end up in different places | valley young adults in 2050 (in 100): highest bot median less lowest | 6.09 | >= 3 | pass |
| No runaway | young adult share against 2026, any council, any run | 0.850 to 1.500 | 0.6 to 1.5 | pass |
| Tipping points happen, and differ | momentum changes, median Skilled run; risen councils in common, branch bots | 10.0; 0.73 | >= 3; <= 0.5 | FAIL |
| A lost election is not the end | runs with a loss (4): next won; median result, no loss less loss | 0.75; -2.0 | >= 0.70; <= 6 | pass |
| A late start recovers | Sleeper median less Autopilot; share of Skilled's gain | 15.9; 0.60 | >= 8; >= 0.5 | pass |
| The lowest can come back | Rescue: lowest council's mean by 2050 (median change); share where it rose | 4.62; 1.00 | >= 1.5; >= 0.80 | pass |
| Cities first does not win | Skilled median less Cardiff first; share in Two countries or City and bedrooms | 18.3; 1.00 | >= 10; > 0.5 | pass |
| Many endings are real | endings in a tenth of some bot's runs | 10 (comeback, city-bedrooms, joined-up-valleys, workshop, green-valleys, warm-country, patchwork, gamble, long-game, holding-line) | >= 8 of 12 | pass |
| No ending swallows the rest | largest ending share, branch bots and Skilled | 0.39 (warm-country) | <= 0.40 | pass |
| Stories differ | 100 Skilled and branch runs: six-chapter sequences; largest chapter share (town-turns); chapters seen | 76; 0.29; 18 of 24 | >= 40; <= 0.50; all 24 | FAIL |
| Luck does not decide | widest 10th to 90th spread (sleeper) | 8.5 | <= 12 and < 26.6 | pass |
| Each branch has its day | branches top in some start and future | 1 of 4 | all four | FAIL |
| The fairness rule holds | outside severity per game number, lowest to highest | 9 to 11 | 9 to 11 | pass |
| The clock is exact | replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts) | equal; equal | byte equal; byte equal | pass |
| The bots are fast enough | quick run, seconds | 89 | < 180 | pass |

## Bots

| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |
|---|---|---|---|---|
| autopilot | 45.7 | 44.9 to 46.2 | 0.00 | comeback 15, city-bedrooms 3, patchwork 2 |
| random | 54.6 | 52.8 to 57.3 | 0.00 | patchwork 8, gamble 6, city-bedrooms 3, comeback 3 |
| reactive | 64.8 | 62.1 to 66.7 | 0.00 | patchwork 18, comeback 2 |
| branch-valleys | 69.2 | 68.4 to 70.1 | 1.00 | joined-up-valleys 18, comeback 2 |
| branch-made_here | 58.5 | 57.6 to 59.1 | 1.00 | workshop 19, comeback 1 |
| branch-landscape | 66.2 | 65.6 to 66.6 | 1.00 | green-valleys 20 |
| branch-homes | 64.6 | 61.5 to 66.4 | 1.00 | warm-country 20 |
| cardiff-first | 54.0 | 53.7 to 54.5 | 0.00 | city-bedrooms 20 |
| skilled | 72.3 | 70.2 to 77.9 | 2.00 | warm-country 19, comeback 1 |
| sleeper | 61.6 | 57.1 to 65.6 | 1.65 | comeback 14, long-game 6 |
| rescue | 66.8 | 64.1 to 67.6 | 1.85 | warm-country 19, comeback 1 |
| scatter | 47.2 | 46.5 to 48.4 | 0.00 | patchwork 8, comeback 7, gamble 5 |
| spender | 62.6 | 60.8 to 65.5 | 0.00 | patchwork 14, holding-line 4, comeback 2 |
