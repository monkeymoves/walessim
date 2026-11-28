# Playtest 9: cold round 2 of the board game (v2)

*28 November 2026, local build at http://localhost:4191/#/bwrdd, after fix round 1. Eight fresh personas, two full games each, marked against sections 13.1 and 16.6 of `docs/design/v2-board.md`. Screenshots are in `design/shots-build/bcold2-<persona>/`. The judge read every end screen (`game1-end-*.png`, `game2-end-*.png`) and set the key from `model/board/` and `src/board/`.*

**Verdict: the round fails, but it moved.** Comprehension, "is this it?", sources and the retell pass. Fun, clarity, play again, the difference test, the map, Welsh, the clock, not doomed and the losing game fail. Round 1's top three (hidden result, "Pause" on a held clock, the coin cap) are gone. The new top three are a keystone gate that reads as a loop, laws that crash backing and then silently undo, and end screens that contradict what was built.

## The marks

| Mark | Bar | Result | Pass |
|---|---|---|---|
| Fun | Median 8, nobody below 7 | Game 1 median 6.5, low 6. Game 2 median 7, low 4 (both careless games) | Fail |
| Clarity | Median 7, nobody below 6 | Game 1 median 6, low 5. Game 2 median 7, low 3 (business, careless) | Fail |
| Play again | Median 8, 6 of 8 name a next try | Game 1 median 7, low 5. Game 2 median 6.5, low 4. All 8 named a third game, but the sheet asked | Fail |
| Comprehension | 13 of 16 each, no question wrong for 3 or more | 14 to 16 each. Only one wrong answer (cymraeg Q11). Q11 half or wrong for 7 of 8 | Pass |
| Difference test | 6 of 8 give three true lines. Different endings, or the same ending with a different lowest council | 4 of 8 (casual, pupil, designer, civ). Civ got The warm country twice with Vale of Glamorgan lowest both times | Fail |
| "Is this it?" | Civ and designer say yes and name it | Both yes: laws, the Wales you did not build, run codes, untried promises, "Endings found: 2 of 12" | Pass |
| The map | 7 of 8 name the map, a council or a link. Nobody names the bars | 6 of 8 name the council panel or list (civ also the map). Casual and designer name the bars | Fail |
| Sources | 4 of 8 open a source, real figure or rule book unprompted | 5 of 8 (civ, cymraeg, policy rule book, pupil, designer) | Pass |
| First build | 7 of 8 within 90 seconds | 7 to 12 actions (median 9.5). Time not recorded | Not proven |
| Welsh | No English left, every stiff phrase logged | "COST" in English on every card, English source titles, keystone as "Carreg glo", page wider than the screen at 2050 | Fail |
| The clock | 6 of 8 pause and change speed untold. Nobody rushed | All 8 paused, taught by the game's own tip, not the sheet. About 6 changed speed. Rushed or lost time: civ, nurse, cymraeg, policy, business, designer | Fail |
| The retell | 6 of 8 true to chapters and turning points | 7 true. Pupil partly (left out The gamble, the big employer leaving) | Pass |
| Not doomed | At most 1 of 8 say yes | 5 say yes or sometimes (civ, casual game 2, nurse, cymraeg, business). Now mostly "too easy, coins piling up", not "nothing moves" | Fail |
| A losing game | Two careless players rate the ending 7 or more and name a change | Casual 5, business 6. Both named a change. Neither game was lost: both won every election, "won well" | Fail |
| Length | 12 to 25 minutes | Not recorded | Not proven |

Ending worth reading, game 1 then game 2: civ 6, 6; casual 6, 5; nurse 8, 7; cymraeg 7, 6; policy 7, 6; pupil 7, 7; business 7, 6; designer 6, 6.

## Comprehension, marked

Key: Q2 about 4 coins a year, more as Work and pay grows and from councils on the rise, purse 16 at most, more is lost (B1, R2). Q3 a build time of 0 to 6 years, "working from" on the card, a ring, then "is working now". Q8 three working starters of a branch open its bigger projects, two working bigger projects open the keystone, a keystone opens its legacy project (`model/board/tree.yaml`, `projects.yaml` `legacy_of`). Q10 a council backs you at 5, win with more than half the people, one law change, two and faster builds when won well, a deal after a loss (P4, P6). Q11 four years 0.6 better (or worse) on the mean pulls young adults and work in (or out), adds backing and coins (R2). Q12 Left for 2050 decides (G1).

H half, W wrong. Starred halves were caused by the game.

| Persona | Not right | Score |
|---|---|---|
| civ | Q11 H*, Q12 H* (end headline leads with "better than doing nothing") | 15 |
| casual | Q11 H* | 15.5 |
| nurse | Q8 H (no branch named), Q11 H* | 15 |
| cymraeg | Q7 H, Q8 H (mixed branches), Q11 W | 14 |
| policy | Q11 H*, Q12 H* | 15 |
| pupil | Q14 H (left out The gamble) | 15.5 |
| business | Q11 H* | 15.5 |
| designer | Q8 H* (banner never names which build), Q11 H* | 15 |

Q11 is now the weak question: nobody ever saw "slipping", and the arrow's tip says what it measures but not what it does. Q10 went from half for 7 of 8 to right for all.

## The difference test

| Persona | Endings | Lowest in 2050 | Lines true |
|---|---|---|---|
| civ | The warm country, The warm country | Vale of Glamorgan both | 3 (but fails the ending rule) |
| casual | The patchwork, The city and its bedrooms | Bridgend, Blaenau Gwent | 3 |
| nurse | The comeback, The warm country | Newport, Newport | 2 (Merthyr and Treorchy turned a corner in game 1 too) |
| cymraeg | Y clytwaith twice | Rhondda Cynon Taf, Merthyr Tydfil | 2 (the 2030 laws are not on the board, which shows 9 then 7) |
| policy | The warm country twice | Newport, Vale of Glamorgan | 2 (the law on day one is not on the board) |
| pupil | The gamble, The warm country | Bridgend, Newport | 3 |
| business | The patchwork, The city and its bedrooms | Caerphilly, Merthyr Tydfil | 2 (board shows 9 of 10 in 2030, not 10) |
| designer | The joined-up valleys, The green valleys | Bridgend, Newport | 3 |

The end record now makes the test markable. False lines are mostly laws, which the end screen does not list. The warm country ended 6 of 16 games: it wins on priority whenever Heat and homes for all stands.

## Must fix (contradictions, bugs, broken trust, stopped play)

1. **The keystone gate reads as a loop.** 6 of 8. Each branch lists two "bigger" projects, but one is the legacy project, which needs the keystone: "Opens when A cluster that roots is working. It is the keystone" (nurse `g1-045.png`, casual `g1-55.png`, business `g1-55.png`). The keystone needs "2 bigger projects ... working" (designer `g2-07.png`, `g2-09.png`), so the only way is to build the one real bigger project twice, which nothing says (policy `g1-49.png`: "Only works with multiple builds of one bigger"). Casual and business saw "The keystone is open" with no Build button and no reason. Show the legacy project apart ("After the keystone"), name the gate exactly ("Valleys regional park working in 2 councils: 1 of 2"), and always give the keystone's blocker (coins, the gate, 2044). `src/board/ui/blockers.ts`, `BuildMenu.tsx`, `TreeSheet.tsx`, `BranchRoad.tsx`, `model/i18n/en/boardui.json`, `model/board/tree.yaml`.
2. **Laws crash backing, then it silently comes back.** 5 of 8. Civ passed three laws: "3 of 10 councils back you" and "would lose" (`g1-65-laws2.png`), a year later 9 of 10 (`g1-71.png`). Casual 8 to 6 "at once, unnamed" (`g1-31-law.png`); policy 9 to 6 "then it recovered to 9 with no explanation" (`g1-53-law.png`); designer "some people will mind gives no numbers; 3 councils turned" (`g1-33.png`); cymraeg 10 to 6 (`g2-07-laws`). The cost goes into moods that drift back, so it is both scary and free. Show each council's cost before passing, name the law in the backing cause, and decide whether the cost fades (and say so). `src/board/ui/LawsSheet.tsx`, `src/board/engine/actions.ts`, `people-moods.ts`, `model/board/laws.yaml`.
3. **End screens contradict what was built.** 6 of 8. "The Wales you did not build ... With room for the rivers, you might have had: The green valleys" after building Rivers given room (nurse `game2-end-5.png`, policy `game2-end-05.png`, pupil `game2-end-full.png`). "The gap between places has grown a little" under the chapter "Closing the gap" (business `game1-end-s2.png`; policy game 2 the same). "Young adults started to leave" against "Young people came back" (business). The gamble: "opened in Merthyr Tydfil", "jobs were lost in Maesteg", "Blaenau Gwent found new work" (pupil `game1-end-full.png`). Letter "It started to turn with Station quarter in 2045" (nurse `game1-end-4.png`); keystone "From Spring 2046" against letter 2045 (designer `g2-09.png`). `notBuilt` must skip endings whose keystone stands; the gap line and the gap chapter must read one measure. `src/board/engine/endings.ts` (line 284), `model/board/endings.yaml` `not_built`, `src/board/engine/story-terms.ts`, `model/board/letters.yaml`.
4. **Cards cover the build menu and its Build button; dialogs clip.** 6 of 8. Casual `g1-20.png` (warning over the menu), `g1-17.png` (election card cut, "Why?" clipped); business `g1-43.png`; designer ("Build it hid behind an event card"); civ `g1-13-chosen.png`, `g1-83.png` (keystone card cut off); cymraeg `g1-06` (tip over the list). `src/board/ui/StopCard.tsx`, `WarningSlip.tsx`, `Election.tsx`, `BuildMenu.tsx`, their CSS.
5. **Space does not pause when a button has focus.** 4 of 8 (casual, nurse `g1-016.png`, pupil, business). The tip promises "Press Pause, or the Space bar". `src/board/ui/clock/keys.ts`.
6. **Clicking a card expands it; Build is far below.** 5 of 8. Business made an upgrade he did not mean ("Make Warm the terraces bigger: level 2 of 3", `g1-18-y2028.png`); policy `g1-08.png`, pupil `g1-06`, designer, casual. `src/board/ui/BuildMenu.tsx`.
7. **Prices disagree.** 4 of 8. "COSTS 1" beside "Build it: 2 coins" (casual `g1-05-built.png`); Frequent trains 1 then 3 (nurse `g1-010.png`, business `g1-06-build.png`, pupil `g1-27`). `BuildMenu.tsx`, `src/board/ui/words.ts`.
8. **Stale "Your purse is full".** 2 of 8. With 3 coins (pupil); after spending (business `g1-43.png`). `src/board/ui/clock/coins.ts`, `StopCard.tsx`.
9. **A deal never says you must build there.** Nurse: "You broke your deal with Cardiff", 8 councils became 1 (`g1-048.png`), then 1 to 10 in a term, unexplained (`g1-051.png`). Round 1's open item, now met by a player. `src/board/ui/DealChoice.tsx`, `TermReport.tsx`, `src/board/engine/deals.ts`, `boardui.json`.
10. **Welsh: English and wrong words left.** "COST" on every card (cymraeg `g1-05-build.png`); keystone "Carreg glo" (coal stone), should be "maen clo" (nurse `g2-005`, policy `g2-02-cy.png`, cymraeg `g1-05-build.png` timeline "Carreg glo olaf"); at 2050 the page is wider than the screen and hides the language switch (cymraeg `g1-44.png`, `g1-45.png`); "Tua -0 y flwyddyn" (`g1-41`); Why? source titles in English (`g1-16`). `model/i18n/cy/boardui.json`, `BuildMenu.tsx`, `TopStrip.tsx`, `clock.css`, `words.ts`.
11. **Dates disagree on a card.** "From Summer 2028" beside "+1.1 from 2032", "Takes 1 years", "Takes 0 years to build" beside "works within a year" (nurse `g1-006.png`, `g1-019.png`, policy). `BuildMenu.tsx`, `src/board/engine/preview.ts`, `words.ts`.
12. **Raw codes.** "need:valleys:2" in the rule book, "low_pay_hourly is the 20th percentile" in a source popup, rule book link opens the projects page (policy `g1-05-source.png`). `src/board/ui/WhyPanel.tsx`, `rules.ts`.

## Should fix

1. **Too easy late, nothing at stake.** 5 said nothing mattered, now because it was easy: careless games won every election "won well" (casual `game2-end-0.png`: "You said what you would do, and you did it"; business `game2-end-01.png`). 7 of 8 lost coins at 16 (civ `g1-78.png`, cymraeg `g1-41`, pupil `game1-end-1.png`, business `g1-60.png`), with nothing to buy after the 2044 keystone cut-off. `model/board/rules/people.yaml` (P4, P1), `budget.yaml` (B1).
2. **Chapters name towns never shown:** Treorchy, Grangetown, Bargoed, Maesteg. 4 of 8 (casual `game1-end-full.png`: "no Grangetown ever shown", business `game1-end-s2.png`, civ "Treorchy while the letter says Rhondda Cynon Taf"). Write "Treorchy, in Rhondda Cynon Taf". `src/board/engine/story-terms.ts`, `model/board/story.yaml`.
3. **Which score decides.** The end headline leads with "better than doing nothing" while play says Left for 2050 decides (civ, policy, cymraeg, casual `g1-02-play.png`); "about 12 points" beside "About 13 points" (designer `game2-end-1.png`). `src/board/ui/end/Verdict.tsx`.
4. **The clock still rushes.** Carry on after a warning runs time, after an answer it stays paused (policy, nurse, civ `g1-31.png`); Fast is 3 seconds a year and cards pile up (civ, cymraeg `g1-19`, `g1-20`); a warning's window passed while thinking (policy). The speed carries over to the next game (pupil). `src/board/ui/clock/Clock.tsx`, `hold.ts`, `prefs.ts`.
5. **Which build opened a tier is never named:** "Bigger projects are open to you now" (casual `g1-25.png`, designer `g1-22.png`, civ `g1-71.png`). `src/board/engine/clock-stops.ts`, `StopCard.tsx`.
6. **"Last keystone" on the time line is unexplained** until too late (business `g1-02-start.png`, pupil `g1-39`). `src/board/ui/Timeline.tsx`.
7. **On the rise says what, not why it matters;** slipping never seen. `boardui.json`.
8. **Income swings** "About +4", "+1.1", "About +0 a year" with no reason (business `g1-43.png`, pupil `g1-37`, policy). `coins.ts`.
9. **Wording:** "Nothing is being built yet" with builds working (civ `g1-71.png`); Held and Paused too alike (pupil, nurse); "Won: you govern alone"; "you might have had: Two countries" and "Holding the line" read broken (civ `game1-end-4.png`, casual `game1-end-3.png`). `boardui.json`, `endings.yaml`.
10. **Balance:** The warm country 6 of 16 (priority 5 beats The green valleys); a fresh start rewards spreading over depth (designer); the keystone gets the fresh start discount too ("3 off the full price of 8", casual `g1-05-built.png`). `model/board/endings.yaml`, `rules/growth.yaml` R3. Check with the bots.
11. **Local truth:** Ebbw Valley Line "to Caerphilly" (nurse `g1-036.png`); Rhondda "Flood risk low" just after the Taff floods (nurse `g1-039.png`); Merthyr Health 0.2 of 10 after surgeries closed (casual `g1-55.png`). `model/board/links.yaml`, `events.yaml`.
12. **Same events in the same order in game 2** (civ `g2-19.png`). `src/board/engine/events-schedule.ts`, `src/board/ui/startOffer.ts`.
13. **Welsh phrases for the fluent reviewer** (cymraeg end screens): "Ar ôl ar gyfer 2050", "Bywyd yn eich blynyddoedd", "punnoedd yr wythnos", "Beth bynnag y canlyniad", "Y cymoedd cysylltiedig fyddai hon", "Dal y llinell fyddai hon", "gyda Wedi'i wneud yma", "yn y gangen Wedi'i wneud yma yn gweithio" (`g1-07`), "2 oddi ar y pris llawn o 3. Dechrau newydd yma: i'r prosiect cyntaf yma yn unig" (`g1-05`), "Yn gofyn am: Y Gymraeg a diwylliant a Gwaith a chyflog" (`g1-04`), "Eich canlyniad" floating beside its text (`g2-06`).

## Against round 1

**Marks that moved.** Fun game 1 median 6 to 6.5 (low 5 to 6), game 2 5.5 to 7. Clarity game 2 6 to 7. Play again game 1 6 to 7, game 2 5.5 to 6.5. The map 4 of 8 to 6 of 8. Difference test 1 of 8 to 4 of 8. Retell 4 to 7 (now a pass). Not doomed 8 of 8 to 5 of 8. Comprehension held (14 to 16). Sources 6 to 5, still a pass. Nothing moved backwards past a bar.

**Really gone:** the hidden result (everyone read the verdict); "Pause" on a held clock; the game number changing; title Start opening the old game; "Look" opening the wrong council; "Not allowed now"; raw decimals and template splices in English; the backing threshold clash; the same letter twice; circular Why?; "nothing moves for ten years" (nobody named 2026 to 2036). Q10 is now right for all 8.

**Changed shape:** the coin cap is announced at 12 now, but 7 of 8 still lost coins, because there is little to buy late. Wrong place names in endings became town names the player never saw. The legacy project now gives its reason, and that reason is what makes the keystone gate look like a loop.

**Came back:** end text that contradicts itself (round 1 must-fix 5); prices changing with little warning (should-fix 3); the clock restarting after some cards but not others (should-fix 7); raw codes, now in the rule book (must-fix 14); the broken deal collapse, which the join left open, now hit by a real player; Welsh English left over ("COST", source titles).
