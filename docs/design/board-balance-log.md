# Board balance log

Model: public/board-model.json (hash 6c888b81398f). 200 game numbers, every start in turn, futures drawn from the game number. 5000 random search runs, 20 games for the idle and compounding measures, 60 for Skilled at random sites. Took 752 seconds.

Every size in the game is a game rule; these are measures of the bots, not of Wales.

## Section 16.6 pass marks: 24 of 29 met

| Claim | Measure | Value | Pass mark | Result |
|---|---|---|---|---|
| Nothing slides by itself | no actions, events off: largest change from 2026 | 0.46 | <= 0.5 | pass |
| The drift is mild | Autopilot median, points below 2026 | 0.0 | 2 to 5 | FAIL |
| Skill beats autopilot | Skilled beats Autopilot, same game; median gap | 1.00; 23.8 | >= 0.95; >= 15 | pass |
| Thought beats reaction | Skilled beats Reactive, same game | 0.96 | >= 0.85 | pass |
| Strategies end far apart | highest bot median less lowest (skilled v autopilot) | 23.7 | >= 18 | pass |
| Good strategies stay close | best branch median less second (branch-homes) | 0.1 | <= 6 | pass |
| Keystones can be reached | lowest share of a branch bot's runs with its own keystone; Skilled with two | 1.00; 0.91 | >= 0.80; >= 0.60 | pass |
| You cannot have it all | 5000 random runs: four keystones; three | 0; 0.000 | 0; < 0.05 | pass |
| Early choices compound | a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median) | 2.41 | >= 2 | pass |
| Together beats scattered | Skilled median less Scatter median | 22.4 | >= 6 | pass |
| Place matters | Skilled median less Skilled at random sites | 4.1 | >= 8 | FAIL |
| Paths part over time | branch bots: distance in 2050 / in 2034 | 4.45 | >= 2.0 | pass |
| Strategies build different Waleses | branch bots: distance between / within | 5.41 | >= 2.0 | pass |
| The difference is on the map | measures 2+ apart, branch-landscape v branch-homes | 0.62 | >= 0.25 | pass |
| People end up in different places | valley young adults in 2050 (in 100): highest bot median less lowest | 5.45 | >= 3 | pass |
| No runaway | young adult share against 2026, any council, any run | 0.850 to 1.500 | 0.6 to 1.5 | pass |
| Tipping points happen, and differ | momentum changes, median Skilled run; risen councils in common, branch bots | 9.0; 0.75 | >= 3; <= 0.5 | FAIL |
| A lost election is not the end | runs with a loss (84): next won; median result, no loss less loss | 0.96; 0.8 | >= 0.70; <= 6 | pass |
| A late start recovers | Sleeper median less Autopilot; share of Skilled's gain | 14.4; 0.61 | >= 8; >= 0.5 | pass |
| The lowest can come back | Rescue: lowest council's mean by 2050 (median change); share where it rose | 4.85; 1.00 | >= 1.5; >= 0.80 | pass |
| Cities first does not win | Skilled median less Cardiff first; share in Two countries or City and bedrooms | 14.9; 1.00 | >= 10; > 0.5 | pass |
| Many endings are real | endings in a tenth of some bot's runs | 9 (comeback, city-bedrooms, joined-up-valleys, workshop, green-valleys, warm-country, patchwork, gamble, long-game) | >= 8 of 12 | pass |
| No ending swallows the rest | largest ending share, branch bots and Skilled | 0.35 (warm-country) | <= 0.40 | pass |
| Stories differ | 1000 Skilled and branch runs: six-chapter sequences; largest chapter share (town-turns); chapters seen | 565; 0.23; 16 of 18 | >= 40; <= 0.50; all 18 | FAIL |
| Luck does not decide | widest 10th to 90th spread (skilled) | 8.9 | <= 12 and < 23.8 | pass |
| Each branch has its day | branches top in some start and future | 2 of 4 | all four | FAIL |
| The fairness rule holds | outside severity per game number, lowest to highest | 9 to 11 | 9 to 11 | pass |
| The clock is exact | replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts) | equal; equal | byte equal; byte equal | pass |
| The bots are fast enough | full run, seconds | 752 | < 900 | pass |

## Bots

| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |
|---|---|---|---|---|
| autopilot | 45.3 | 44.4 to 45.9 | 0.00 | comeback 96, city-bedrooms 64, patchwork 40 |
| random | 54.2 | 51.6 to 57.5 | 0.01 | patchwork 76, comeback 60, city-bedrooms 46, gamble 17, warm-country 1 |
| reactive | 60.9 | 58.5 to 63.6 | 0.00 | patchwork 118, comeback 77, holding-line 5 |
| branch-valleys | 67.0 | 65.6 to 68.3 | 1.00 | joined-up-valleys 187, comeback 13 |
| branch-made_here | 58.2 | 57.1 to 59.1 | 1.00 | workshop 177, comeback 23 |
| branch-landscape | 65.3 | 64.3 to 66.1 | 1.00 | green-valleys 192, comeback 8 |
| branch-homes | 67.1 | 64.0 to 70.1 | 1.00 | warm-country 179, comeback 21 |
| cardiff-first | 54.0 | 53.4 to 54.5 | 0.00 | city-bedrooms 200 |
| skilled | 69.0 | 65.0 to 73.9 | 1.91 | warm-country 175, comeback 21, green-valleys 2, long-game 2 |
| sleeper | 59.7 | 55.5 to 62.6 | 0.83 | comeback 195, long-game 5 |
| rescue | 63.8 | 61.0 to 67.2 | 1.63 | warm-country 124, long-game 40, comeback 36 |
| scatter | 46.5 | 45.8 to 47.6 | 0.00 | comeback 70, patchwork 66, gamble 64 |

## Balance rounds, phase 2 (28 November 2026)

The table above is round 3, the last. Every number changed below is a game rule: none has a real figure behind its size. The marks were not lowered. Runs are the full 200 game numbers unless they say quick (20).

### Round 0: as joined (quick run, model hash 2a79f506ce5b): 21 of 29

Failing: nothing slides (1.99), the drift is mild (Autopilot 3.8 above 2026), keystones (branch-valleys 0.20; Skilled with two 0.00), early choices compound (1.72), tipping overlap (0.86), a late start (3.0; 0.18), stories (14 of 18 seen), each branch has its day (2 of 4).

What the probes found:

- Two thirds of the idle slide was not a slide. The result (Left for 2050) takes off the risks left at step 3, but the 2026 start was not judged that way, so a game where nothing happened lost 0.63 at once. The top strip showed it too: Left for 2050 started below its own "from". The rest was S3: young adults drained the valleys to the floor on the 2026 gaps alone, and the Welsh and homes knock-ons were one sided.
- Autopilot built every year, not once a turn: the clock port made a "per turn" bot twice as busy.
- No branch-valleys game could start its keystone: Work comes up the line needs a faster line at its site, and the bot never built one.
- Skilled stood one keystone and then spent on its first branch's tier 2.
- The compounding probe compared two whole games that had drifted apart (ratios from -16 to +5 between games), and often gifted a homes project to a council whose Homes were near 10, where it could do nothing.

### Round 1 (full, hash 1ee3dcf244cf): 22 of 29

Code (real bugs, each with a test):

- score.ts: `start` is the 2026 board judged as Left for 2050 is (`startBoard`, its own high risks priced in).
- bots-strategies.ts: Autopilot builds once in two years (a turn, 13.2 and 16.2.4). Branch bots and Skilled build the line upgrade a waiting keystone needs (`keystoneUnlock`). Skilled drives its second branch once one keystone is under way.
- bots-probes.ts: early choices compound now measures the gift's own share of the 2050 board from the ledger (`giftEffect`), and gifts a project with room to work there (`pickGift`).

Numbers: S3 `pull_per_year` 0.06 to 0.04, `homes_per_point` 0.1 to 0.05, `welsh_gain_per_point` 0.05 to 0.1, `floor_share` 0.6 to 0.85. Outside bad events' landing sizes doubled (16.3.1 asks 2 to 5 points down with events; they took about 1). Buses that meet the trains run at 0.125 coins a year (was 0.25). R1 `max_factor` 5 to 7.

| Claim | Measure | Value | Pass mark | Result |
|---|---|---|---|---|
| Nothing slides by itself | no actions, events off: largest change from 2026 | 0.40 | <= 0.5 | pass |
| The drift is mild | Autopilot median, points below 2026 | -1.7 | 2 to 5 | FAIL |
| Skill beats autopilot | Skilled beats Autopilot, same game; median gap | 1.00; 17.8 | >= 0.95; >= 15 | pass |
| Thought beats reaction | Skilled beats Reactive, same game | 0.94 | >= 0.85 | pass |
| Strategies end far apart | highest bot median less lowest (branch-valleys v scatter) | 23.2 | >= 18 | pass |
| Good strategies stay close | best branch median less second (branch-valleys) | 4.3 | <= 6 | pass |
| Keystones can be reached | lowest share of a branch bot's runs with its own keystone; Skilled with two | 0.99; 0.65 | >= 0.80; >= 0.60 | pass |
| You cannot have it all | 5000 random runs: four keystones; three | 0; 0.000 | 0; < 0.05 | pass |
| Early choices compound | a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median) | 2.36 | >= 2 | pass |
| Together beats scattered | Skilled median less Scatter median | 17.8 | >= 6 | pass |
| Place matters | Skilled median less Skilled at random sites | 4.2 | >= 8 | FAIL |
| Paths part over time | branch bots: distance in 2050 / in 2034 | 6.37 | >= 2.0 | pass |
| Strategies build different Waleses | branch bots: distance between / within | 4.80 | >= 2.0 | pass |
| The difference is on the map | measures 2+ apart, branch-made_here v branch-landscape | 0.52 | >= 0.25 | pass |
| People end up in different places | valley young adults in 2050 (in 100): highest bot median less lowest | 5.05 | >= 3 | pass |
| No runaway | young adult share against 2026, any council, any run | 0.850 to 1.500 | 0.6 to 1.5 | pass |
| Tipping points happen, and differ | momentum changes, median Skilled run; risen councils in common, branch bots | 10.0; 0.86 | >= 3; <= 0.5 | FAIL |
| A lost election is not the end | runs with a loss (193): next won; median result, no loss less loss | 0.98; 6.9 | >= 0.70; <= 6 | FAIL |
| A late start recovers | Sleeper median less Autopilot; share of Skilled's gain | 7.2; 0.41 | >= 8; >= 0.5 | FAIL |
| The lowest can come back | Rescue: lowest council's mean by 2050 (median change); share where it rose | 3.94; 1.00 | >= 1.5; >= 0.80 | pass |
| Cities first does not win | Skilled median less Cardiff first; share in Two countries or City and bedrooms | 11.6; 0.90 | >= 10; > 0.5 | pass |
| Many endings are real | endings in a tenth of some bot's runs | 9 (comeback, joined-up-valleys, green-valleys, warm-country, city-bedrooms, patchwork, gamble, workshop, long-game) | >= 8 of 12 | pass |
| No ending swallows the rest | largest ending share, branch bots and Skilled | 0.32 (joined-up-valleys) | <= 0.40 | pass |
| Stories differ | 1000 Skilled and branch runs: six-chapter sequences; largest chapter share (town-turns); chapters seen | 471; 0.41; 15 of 18 | >= 40; <= 0.50; all 18 | FAIL |
| Luck does not decide | widest 10th to 90th spread (skilled) | 9.0 | <= 12 and < 17.8 | pass |
| Each branch has its day | branches top in some start and future | 1 of 4 | all four | FAIL |
| The fairness rule holds | outside severity per game number, lowest to highest | 9 to 11 | 9 to 11 | pass |
| The clock is exact | replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts) | equal; equal | byte equal; byte equal | pass |
| The bots are fast enough | full run, seconds | 738 | < 900 | pass |


| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |
|---|---|---|---|---|
| autopilot | 47.0 | 46.3 to 47.7 | 0.00 | comeback 103, patchwork 95, holding-line 2 |
| random | 53.3 | 51.4 to 55.8 | 0.01 | comeback 63, patchwork 63, city-bedrooms 62, gamble 11, workshop 1 |
| reactive | 58.6 | 56.5 to 60.0 | 0.00 | comeback 105, patchwork 92, holding-line 3 |
| branch-valleys | 70.0 | 67.7 to 71.1 | 1.00 | joined-up-valleys 196, comeback 3, city-bedrooms 1 |
| branch-made_here | 57.3 | 56.4 to 58.0 | 1.00 | comeback 104, workshop 96 |
| branch-landscape | 62.2 | 61.1 to 63.1 | 0.99 | green-valleys 176, comeback 24 |
| branch-homes | 65.6 | 63.5 to 68.1 | 1.00 | warm-country 177, comeback 23 |
| cardiff-first | 53.0 | 52.4 to 53.5 | 0.00 | city-bedrooms 179, gamble 20, patchwork 1 |
| skilled | 64.6 | 59.7 to 68.7 | 1.62 | joined-up-valleys 120, comeback 39, warm-country 36, patchwork 4, workshop 1 |
| sleeper | 54.2 | 51.7 to 57.3 | 0.26 | comeback 200 |
| rescue | 59.4 | 57.1 to 62.1 | 1.51 | joined-up-valleys 86, comeback 55, warm-country 35, long-game 24 |
| scatter | 46.8 | 45.2 to 49.5 | 0.00 | patchwork 88, comeback 73, gamble 39 |

New failure: a lost election (no loss less loss 6.9, the made here bot loses most). Place matters fell to 4.2 (Skilled now drives a second branch).

### Round 2 (full, hash 013a3488b173): 23 of 29

Code: bots value a lift only by the room the measure has left below 10 (bots-common.ts `optionValue`); before, a lift on a measure at 10 still counted half.

Numbers: S3 `pull_per_year` back to 0.06 (the floor now holds the slide). R4 need 1.5 less 0.12 a point, held 0.4 to 1.4. R2 edges 0.3 to 0.6 (both ways), `coins_per_year` 0.5 to 1. R1 `grow_alone_per_year` 0.03 to 0.02. B1 `base_per_year` 3 to 3.75, `purse_max` 12 to 16. R3 `discount` 1 to 2, `joined_years` 8 to 12. Made here: skills college 1.5 times, community energy 1.2, the cluster keystone 1.5. Landscape: coal tips, coast wetlands, valleys park and rivers given room 1.25 times. Station quarter 0.9 times. Chapters: priorities renumbered (the deal kept 2, the turn 3, closing the gap 6), quiet years allows up to four finished.

| Claim | Measure | Value | Pass mark | Result |
|---|---|---|---|---|
| Nothing slides by itself | no actions, events off: largest change from 2026 | 0.46 | <= 0.5 | pass |
| The drift is mild | Autopilot median, points below 2026 | -0.2 | 2 to 5 | FAIL |
| Skill beats autopilot | Skilled beats Autopilot, same game; median gap | 1.00; 23.6 | >= 0.95; >= 15 | pass |
| Thought beats reaction | Skilled beats Reactive, same game | 1.00 | >= 0.85 | pass |
| Strategies end far apart | highest bot median less lowest (skilled v autopilot) | 23.7 | >= 18 | pass |
| Good strategies stay close | best branch median less second (branch-homes) | 1.3 | <= 6 | pass |
| Keystones can be reached | lowest share of a branch bot's runs with its own keystone; Skilled with two | 1.00; 0.98 | >= 0.80; >= 0.60 | pass |
| You cannot have it all | 5000 random runs: four keystones; three | 0; 0.000 | 0; < 0.05 | pass |
| Early choices compound | a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median) | 2.35 | >= 2 | pass |
| Together beats scattered | Skilled median less Scatter median | 21.5 | >= 6 | pass |
| Place matters | Skilled median less Skilled at random sites | 7.0 | >= 8 | FAIL |
| Paths part over time | branch bots: distance in 2050 / in 2034 | 4.77 | >= 2.0 | pass |
| Strategies build different Waleses | branch bots: distance between / within | 5.81 | >= 2.0 | pass |
| The difference is on the map | measures 2+ apart, branch-made_here v branch-landscape | 0.63 | >= 0.25 | pass |
| People end up in different places | valley young adults in 2050 (in 100): highest bot median less lowest | 5.80 | >= 3 | pass |
| No runaway | young adult share against 2026, any council, any run | 0.850 to 1.500 | 0.6 to 1.5 | pass |
| Tipping points happen, and differ | momentum changes, median Skilled run; risen councils in common, branch bots | 9.0; 0.77 | >= 3; <= 0.5 | FAIL |
| A lost election is not the end | runs with a loss (65): next won; median result, no loss less loss | 1.00; 0.9 | >= 0.70; <= 6 | pass |
| A late start recovers | Sleeper median less Autopilot; share of Skilled's gain | 11.9; 0.50 | >= 8; >= 0.5 | pass |
| The lowest can come back | Rescue: lowest council's mean by 2050 (median change); share where it rose | 4.14; 1.00 | >= 1.5; >= 0.80 | pass |
| Cities first does not win | Skilled median less Cardiff first; share in Two countries or City and bedrooms | 15.0; 0.99 | >= 10; > 0.5 | pass |
| Many endings are real | endings in a tenth of some bot's runs | 9 (comeback, city-bedrooms, joined-up-valleys, workshop, green-valleys, warm-country, patchwork, gamble, long-game) | >= 8 of 12 | pass |
| No ending swallows the rest | largest ending share, branch bots and Skilled | 0.37 (warm-country) | <= 0.40 | pass |
| Stories differ | 1000 Skilled and branch runs: six-chapter sequences; largest chapter share (town-turns); chapters seen | 552; 0.26; 17 of 18 | >= 40; <= 0.50; all 18 | FAIL |
| Luck does not decide | widest 10th to 90th spread (random) | 5.4 | <= 12 and < 23.6 | pass |
| Each branch has its day | branches top in some start and future | 2 of 4 | all four | FAIL |
| The fairness rule holds | outside severity per game number, lowest to highest | 9 to 11 | 9 to 11 | pass |
| The clock is exact | replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts) | equal; equal | byte equal; byte equal | pass |
| The bots are fast enough | full run, seconds | 927 | < 900 | FAIL |


| Bot | Median result | 10th to 90th | Keystones (mean) | Endings |
|---|---|---|---|---|
| autopilot | 45.5 | 44.6 to 46.1 | 0.00 | comeback 108, city-bedrooms 53, patchwork 39 |
| random | 54.5 | 52.1 to 57.5 | 0.01 | patchwork 76, comeback 52, city-bedrooms 49, gamble 21, workshop 1, warm-country 1 |
| reactive | 60.4 | 58.0 to 62.9 | 0.00 | patchwork 106, comeback 89, holding-line 5 |
| branch-valleys | 67.4 | 65.8 to 69.1 | 1.00 | joined-up-valleys 189, comeback 11 |
| branch-made_here | 58.5 | 57.5 to 59.6 | 1.00 | workshop 186, comeback 14 |
| branch-landscape | 64.5 | 63.6 to 65.5 | 1.00 | green-valleys 189, comeback 11 |
| branch-homes | 68.7 | 66.7 to 70.9 | 1.00 | warm-country 185, comeback 15 |
| cardiff-first | 54.2 | 53.6 to 54.7 | 0.00 | city-bedrooms 199, gamble 1 |
| skilled | 69.2 | 66.2 to 71.2 | 1.99 | warm-country 186, comeback 13, long-game 1 |
| sleeper | 57.4 | 54.9 to 60.1 | 1.02 | comeback 188, long-game 12 |
| rescue | 62.8 | 60.1 to 64.9 | 1.73 | warm-country 110, long-game 46, comeback 44 |
| scatter | 47.7 | 46.7 to 49.7 | 0.00 | gamble 88, comeback 71, patchwork 41 |

The full run took 927 seconds (over 15 minutes). bots-common.ts `runAhead` now steps in place on a state the bot owns, the same steps as `advance` (a test checks they are byte equal), which took a Skilled game from about 5 to 3.6 seconds.

### Round 3 (full, hash 6c888b81398f): 24 of 29

Numbers: R4 need 1.6 less 0.15 a point, held 0.25 to 1.5. R1 `grow_alone_per_year` 0.01. Station quarter back to its round 1 size. Homes: warm terraces, social homes and the health hub 0.85 times, Heat and homes 0.9. Slow the water and the four landscape projects of round 2 a further 1.25 times. The table at the top is this round.

### Marks that still fail after three rounds, and why

- **The drift is mild** (Autopilot 0.0 against 2026, wants 2 to 5 below). Doing nothing at all now ends 1.2 to 3.6 below 2026 (median 2.3), as 16.3.1 asks. But Autopilot's twelve cheapest builds are buses and quick projects strung along neighbouring councils, so they count as joined and grow to 7 times by 2050. Shrinking quick projects or roots enough to sink Autopilot also cut Skilled below the 15 point gap and broke "early choices compound". The marks pull against each other: an early, cheap, joined build is exactly what 16.3.2 rewards.
- **Place matters** (4.1, wants 8). It swings between games: 7.0 in round 2, 8.2 on games 1 to 24 in round 3, 4.1 here. Skilled's two year look ahead picks sites for the near term, and with two keystones to drive, much of its spending is on projects whose worth hardly depends on where they stand.
- **Tipping points differ** (risen councils in common 0.75, wants 0.5 or less). Every branch bot builds in most councils, roots lift every council, and spillover (S1, S2, S3) carries it next door, so 7 to 9 of 10 councils rise in every bot's game. Raising the edges to 0.6 moved it from 0.86 only to 0.75 and cost income, which R2 coins and B1 had to make up.
- **Stories differ** (16 of 18 chapters seen; sequences and the largest share pass). The rarest in smaller counts are Quiet years, The hung years and The leaving years: careful bots finish many projects every term, rarely lose an election, and the S3 floor now stops the valleys emptying. A careless or human game reaches them more often; the bots in this pool almost never do.
- **Each branch has its day** (2 of 4). Made here is 9 points behind: its projects lift only Work and pay and Climate, which reach 10 in most councils by about 2040, so more spending there does nothing. That needs content (src/board/NEEDS.md), not sizes. Landscape is within 2 points of the top and topped one setup on a smaller run.

Passing now that did not at the join: nothing slides, keystones can be reached (Skilled two in most runs), early choices compound, a late start recovers, and the bots are fast enough.
