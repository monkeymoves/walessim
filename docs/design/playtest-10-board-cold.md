# Playtest 10: cold round 3 of the board game (v2)

*28 November 2026, local build at http://localhost:4192/#/bwrdd, after fix round 2. Eight fresh personas (paradox, student, merthyr, cymraeg, economist, pupil, farmer, reviewer), two full games each, marked against sections 13.1 and 16.6 of `docs/design/v2-board.md`. Screenshots are in `design/shots-build/bcold3-<persona>/`. The judge read every end screen (`game1-end-*.png`, `game2-end-*.png`, text read by OCR and checked by eye where it mattered) and set the key from `model/board/` and `src/board/`.*

**Verdict: the round fails, but more marks pass than ever.** Comprehension, the difference test's ending rule, "is this it?", sources, Welsh, the retell and, for the first time, the losing game pass. Fun, clarity, play again, the difference test's three lines, the map, the clock and not doomed fail. The new top problems are deals judged broken after the player built what the deal asked, a law preview that says "9 of 10 now, 9 after" when six councils are about to drop, and a Why? that says "No change of this size was recorded" for the one question players ask most: why does this council not back me?

## The marks

| Mark | Bar | Result | Pass |
|---|---|---|---|
| Fun | Median 8, nobody below 7 | Game 1 median 7, low 6. Game 2 median 7, low 3 (student, careless) | Fail |
| Clarity | Median 7, nobody below 6 | Game 1 median 6, low 6. Game 2 median 6, low 5 (student, pupil, farmer) | Fail |
| Play again | Median 8, 6 of 8 name a next try | Game 1 median 7, low 6. Game 2 median 7, low 4. All 8 named a third game (the sheet asked) | Fail |
| Comprehension | 13 of 16 each (here 14 of 17), no question wrong for 3 or more | 15.5 to 17 each. No answer wrong. Q11 half for 5 of 8 | Pass |
| Difference test | 6 of 8 give three true lines. Different endings, or same ending with a different lowest council | 3 of 8 (paradox, student, pupil). All 8 got two different named endings | Fail (ending rule passes) |
| "Is this it?" | Personas 1 and 8 say yes and name it | Paradox: the unbuilt route, laws, deals, other keystones, run codes. Reviewer: other branches, deals, promises, Welsh | Pass |
| The map | 7 of 8 name the map, a council or a link. Nobody names the bars | 8 of 8 name the council panel or the map, but student ("right panel bars") and farmer ("council bars") name the bars | Fail |
| Sources | 4 of 8 open a source, real figure or rule book unprompted | 7 of 8 (all but farmer, who saw source chips and did not open one) | Pass |
| First build | 7 of 8 within 90 seconds | 8 to 11 actions (median 9.5). Seconds not recorded | Not proven |
| Welsh | No English left, every stiff phrase logged | Cymraeg played both games in Welsh. Only English: source titles, labelled "yn Saesneg". Wrong or stiff Welsh logged below | Pass |
| The clock | 6 of 8 pause and change speed untold. Nobody rushed | Untold: paradox, merthyr, reviewer (the rest were taught by the game's own tip). 7 of 8 rushed or lost time (all but farmer) | Fail |
| The retell | 6 of 8 true to chapters and turning points | 8 of 8 true | Pass |
| Not doomed | At most 1 of 8 say yes | 5 yes (student, cymraeg, economist, pupil, farmer). Now "backing sat at 4.9 whatever I built", not "nothing moves" | Fail |
| A losing game | Two careless players rate the ending 7 or more and name a change | Student 7 (lost four elections, 43.3), farmer 8 (lost two). Both named a change | Pass |
| Length | 12 to 25 minutes | Not recorded | Not proven |

Fun, clarity, play again, game 1 then game 2: paradox 6/7/7, 8/7/8; student 7/6/7, 3/5/4; merthyr 7/7/7, 4/6/5; cymraeg 7/7/7, 7/7/7; economist 7/6/7, 7/6/7; pupil 6/6/6, 7/5/7; farmer 6/6/7, 7/5/7; reviewer 7/6/7, 8/7/7. Ending worth reading: paradox 8, 9; student 8, 7; merthyr 8, 6; cymraeg 8, 8; economist 7, 6; pupil 7, 7; farmer 7, 8; reviewer 6, 6.5.

## Comprehension, marked

Key: Q1 backing out of 10 (backs at 5), six bars with a 2026 tick, "Asking for", real figures with a source, commute, rail and river links, groups, risks, your projects, Build. Q2 about 4 coins a year, more as Work and pay grows and 0.5 a year from each council on the rise, the care bill takes 0.5 a year from 2038 unless four health hubs stand, purse 20, more is lost (B1, B2, R2). Q3 a build time of half a year to 6 years, "Working from" on the card and in On its way, a ring, then "is working now"; roots grow later ("once it has bedded in"). Q4 effects spread along commute, rail and river links; young adults move along commutes towards work and homes. Q5 Pause or Space; Steady, Brisk, Fast or 1, 2, 3. Q8 three working starters of a branch open its bigger projects; its named bigger project working in two councils opens the keystone; the keystone opens the project after it (`model/board/tree.yaml`). Q10 a council backs you at 5; win with more than half the people; won: one law change; won well (two thirds of the people): two and faster builds; lost: no law, a deal (P4, P6). Q11 four years 0.6 better pulls young adults and work in, backs you more, adds 0.5 coin (R2). Q12 Left for 2050 decides.

H half. Starred halves were caused by the game.

| Persona | Not right | Score of 17 |
|---|---|---|
| paradox | none | 17 |
| student | Q17 H* (Why? said "No change of this size was recorded") | 16.5 |
| merthyr | Q11 H | 16.5 |
| cymraeg | Q2 H (did not know what happens to unspent coins), Q11 H | 16 |
| economist | Q11 H, Q17 H* (backing slid with no cause shown) | 16 |
| pupil | Q4 H, Q10 H (no people rule, no law), Q11 H | 15.5 |
| farmer | Q11 H | 16.5 |
| reviewer | Q4 H, Q10 H* ("I could not see what changed") | 16 |

Q11 is still the weak question: nobody saw "slipping", and five gave what on the rise is, not what it does. Q7 and Q17 were right only because players reasoned past the Why? panel, which was empty for six of them.

## The difference test

| Persona | Endings | Lowest in 2050 | Lines true |
|---|---|---|---|
| paradox | The joined-up valleys, The comeback | Bridgend, Vale of Glamorgan | 3 |
| student | The joined-up valleys, The city and its bedrooms | Blaenau Gwent both | 3 (board shows 9 of 10 in 2030, not 10; the promise and the losses are right) |
| merthyr | The long game, The city and its bedrooms | Vale of Glamorgan, Blaenau Gwent | 2 (the flood law is not on the board) |
| cymraeg | Y gêm hir, Y wlad gynnes | Sir Fynwy, Pen-y-bont ar Ogwr | 2 (spending coins faster is not on the board) |
| economist | The joined-up valleys, The green valleys | Blaenau Gwent, Vale of Glamorgan | 1 (laws not on the board; "won 3 of 5 in game 1" is false, the board shows 4) |
| pupil | The workshop, The gamble | Blaenau Gwent, Vale of Glamorgan | 3 |
| farmer | The workshop, The gamble | Cardiff, Blaenau Gwent | 2 (a full purse is not on the board) |
| reviewer | The joined-up valleys, The green valleys | Bridgend, not captured | 2 ("Welsh language on" is not a difference in the Wales) |

Every persona got two different named endings, so the ending rule passes for the first time. Three true lines fail because players remember laws, coins and the language, which the end board does not show.

## Must fix (contradictions, bugs, broken trust, stopped play)

1. **Deals judged broken after the player built what they asked.** 4 of 8. Student `game1-end-01.png`: "Newport: broken" with a Welsh-medium school working there; paradox `g2-15.png` (a ring in Cardiff, working from Summer 2043, deal due 2046) then `g2-20.png` "nothing that lifts Welsh and culture was working"; economist `g2-17-why-cardiff.png`, `game2-end-0.png`; cymraeg `g2-55.png` "Torrwyd eich bargen gyda Chaerffili" though a Welsh school was built there. Cause: `deals.ts` `dealKeptBy` counts only a project started after the deal, but the words say "Have a project that lifts Welsh and culture working in Cardiff by Summer 2046. For example: Welsh-medium school." Say "a new project, started after this deal", show on the deal whether each build there counts, and tell the player when a build does not. Also: the record lists "Rhondda Cynon Taf: broken." four times with no year (merthyr `game2-end-0.png`; student `game2-end-01.png` Cardiff four times; pupil `game2-end-a.png` Torfaen twice), and Why? shows the broken deal as "+0.4 points" (economist `g2-17-why-cardiff.png`; it is the anger fading). `src/board/ui/dealWords.ts`, `DealChoice.tsx`, `model/i18n/{en,cy}/boardui.json` `deal.must`, `src/board/ui/end/record.ts` `dealsOf` (add the year), `whyWords.ts`, `causes.ts`.
2. **The law preview counts the wrong thing on an election step.** Merthyr `g2-03.png`, Summer 2030: "No new homes on flood plains" lowers six councils sitting at 5.1 to 5.2 by 0.4 each, yet says "Councils that back you: 9 of 10 now, 9 after"; four councils backed her at the 2034 election (`g2-05.png`). Verified in code: `src/board/ui/lawCost.ts` calls `election()`, which returns the held record while the step is the election step, so both counts are the election just held. That is exactly when a win offers a law. Count backers from backing (`countBacking`) instead, and add a test at an election step.
3. **Why? is empty or wrong about backing.** 6 of 8 opened it on a council that does not back them and read "No change of this size was recorded here in these years" (paradox `g1-29.png`, student `g1-a98.png`, merthyr `g1r-13.png`, pupil `g1-53.png`, farmer `g1-30-newport-why.png`, reviewer `g1-27-why-newport.png`): it opens on "The last year". When it does show causes they contradict: "-0.5 points ... Backing at the start ... nudges some councils up" (paradox `g1-30.png`); "-0.1 points ... Everyone here are content. You kept the promise you made for 2034" (merthyr `g2-07.png`), where the real cause is people expecting more each term (P1 `expect_rise`). Open on the widest tab that has a cause, always list what holds the council under 5, name the expectation rule as a cause, fix the P2 note ("nudges some councils up and some down") and the grammar ("Everyone here is"). `src/board/ui/WhyPanel.tsx`, `whyWords.ts`, `causes.ts`, `model/board/rules/people.yaml` P1 and P2, `boardui.json` `cause.group`, `why.none`.
4. **Backing slides with no lever, so players feel doomed.** 5 of 8 said yes to "nothing you did could matter", all about backing stuck at or sliding under 5: student game 1 "Backing fell from 7 to 3 with no explanation" (2047 to 2049); economist "backing sat near 4.9 whatever I built" (`g2-22.png`); cymraeg `g2-47`; farmer and pupil late game. The careless student fell to 0 of 10 councils from 2038 (`game2-end-01.png`). Show on the council panel what holds it ("People here expect Homes and community a little better than four years ago"), and check P1 `expect_rise` 0.12 and the B2 care bill with the bots. `model/board/rules/people.yaml`, `src/board/ui/CouncilPanel.tsx`.
5. **An empty white bar on dark warning cards.** 4 of 8 (student `g1-a37.png`, merthyr `g1r-11.png`, economist 2032 rents card, pupil `g1-57.png`, `g2-25.png`). It is the "Carry on past all" button: `src/board/ui/clock.css` `.bw-stop.on-slate .bw-stop-all` sets light text on the white link button, so its words are invisible.
6. **Counts disagree on one screen.** Farmer `g1-47.png`: the 2034 card lists 7 councils backing, the top strip says 8 (`TopStrip.tsx` counts live backing; `Election.tsx` shows the held record). Find which state each reads. Paradox saw "6 of 10 back you" at the end beside "2046: you won, with 8 of 10" (`game1-end-1.png`): true, but the record should also give 2050.
7. **One flood, two rivers.** Reviewer game 1: chapter "The Taff flooded homes in Rhondda Cynon Taf", turning point "In 2037: The Ely burst its banks in Rhondda Cynon Taf" (`game1-end-0.png`, `game1-end-1.png`). One event must fill `{river}` once. `src/board/engine/story-terms.ts`, `events.ts`, `model/board/story.yaml`, `events.yaml`.
8. **The gamble ending contradicts itself.** "Work and pay fell where it had stood" over "Bridgend found new work after the big employer left", then a letter "Nothing else had grown up around it. We are still picking up the pieces" (pupil `game2-end-c.png`, `game2-end-d.png`); farmer `game2-end-2.png`, `game2-end-4.png` the same with Monmouthshire. `model/board/endings.yaml` `gamble`, `letters.yaml`.
9. **A placeholder shown as a source.** Economist `g1-23-source.png`: buses raise Health +0.7, sourced to "Transport access and labour market participation studies (body of literature), Various, Placeholder strength. to check"; rule book "Licence not stated" (`g1-24-rulebook.png`). For the honesty persona this broke trust. Show it as "rough guess, evidence still to find" and check the Health link is meant. `model/sources-extra.yaml` `transport-labour`, `model/board/projects.yaml` `buses-meet-trains`, `src/board/ui/WhyPanel.tsx`.
10. **Space answers a card.** Reviewer `g1-21-brisk.png`, `g1-22.png`: Space to pause picked the focused answer and a year ran. By design in `src/board/ui/clock/keys.ts` ("Space is that button"), but the tip says "Press Pause, or the Space bar". On a card with choices, start focus on nothing that answers, or make Space pause there too.
11. **Cards overlap again** (round 2 must-fix 4 came back). 3 of 8: a tier card over the reopened term report (cymraeg `g1-39.png`, `g1-48.png`); the 2038 election card over the fuel costs card (student `g2-a11.png`); build menu, visit button and cards collide, Close wraps to three lines (student `g1-a58.png`); time line labels overlap (pupil `g2-40.png`). `src/board/ui/StopCard.tsx`, `TermReport.tsx`, `clock.css` `.bw-lane`.
12. **Keystone start date contradicts the calendar.** Farmer: "You can start Heat and homes for all now ... the last season to start one is Summer 2044", shown in 2045 and 2048. Reproduce, then gate the card on `keystoneLastStep`. `src/board/ui/clock/opened.ts`, `blockers.ts`.
13. **The map shrinks or is cut off.** Economist `g2-03.png` (a small framed window after closing the build menu); student `g1-a41.png`, `g1-a01.png` (dark bands, map ends 180px short). `src/board/ui/MapStage.tsx`, `board.css`.
14. **Rule book Back offers an older game.** Economist `g1-25-back.png`: "Carry on, Game number 4759, at Summer 2027", earlier than where he was. `src/board/ui/clock/session.ts` save on leave, `StartScreen.tsx`.

## Should fix

1. **Coins pile up.** 7 of 8 hit "Purse full: new coins are lost" (paradox, student `g1-a107.png`, merthyr `g2-09.png`, economist, pupil `g1-76.png`, farmer 15 in 2038 and 17 in 2042, reviewer `g1-49.png`, `g1-59.png`); cymraeg left 13 idle. The full-purse card stops time again and again (student), and the stale line stays in the ticker for years (student `g2-a14.png`). `model/board/rules/budget.yaml` B1, `src/board/ui/clock/coins.ts`, `stops.ts`.
2. **Jargon.** 8 of 8 guessed keystone, starter, bigger or tier; most also backing, purse, deal, bedded in, fresh start. One line each where the word first appears. `boardui.json`, `BuildMenu.tsx`, `Guide.tsx`.
3. **A win never asks for its law.** "Won: one law change, and no deal to keep" and nothing more (paradox `game1-end-1.png`, merthyr `g1r-ev02.png`, reviewer `g1-33.png`). Put "Choose your law change" on the won card. `Election.tsx`, `LawsSheet.tsx`.
4. **Dates and numbers on a card disagree.** "Working from Summer 2028" beside "from Summer 2032, once it has bedded in" (merthyr `g1-09-built.png`, economist `g1-07-built.png`, farmer); "Up 0.7 since 2026" beside "0.8 of it is still on the way" (merthyr `g1-22.png`); "If you build it: 49.2 (0.0)" beside bars "+0.6" (economist `g1-48.png`); "4 left if you build it" after building (farmer `g1-08-built.png`). `BuildTicket.tsx`, `src/board/engine/preview.ts`.
5. **The clock still rushes.** Time restarts after a card answer (economist `g1-30.png`, cymraeg `g1-47.png`, `g1-79.png`, paradox); "Carry on past all 5 cards" skipped a storm warning (reviewer `g1-56.png`). `src/board/ui/clock/session.ts`, `hold.ts`.
6. **Won and won well look arbitrary.** "2030: you won, with 8 of 10" then "2034: you won well, with 8 of 10" (reviewer `game1-end-0.png`); "2034: you lost, with 7 of 10" (economist `game2-end-0.png`). Add the people share to each record line. `src/board/ui/end/Verdict.tsx`.
7. **Verdict bands jump.** +9.2 on 2026 reads "a little better" (reviewer), +10.0 "much better" (paradox). Add a middle band. G1 bands in `model/board/rules/people.yaml`, `bands.yaml`.
8. **The same deal again.** The deal goes to the least backing council every time, so merthyr was offered Rhondda Cynon Taf four times. Offer a council not already broken. `src/board/engine/deals.ts` `dealChoices`.
9. **Smaller words and bugs.** Cost "3 1" with no word "coins" (merthyr `g1-06-build.png`); "Cyrsiau byr am ddim: 1 darn arian" (cymraeg `g1-35.png`); On its way list clipped (merthyr `g1-13.png`); "A place here is asking you to visit" and the Gwent Levels never introduced (student `g1-a58.png`); Escape closes the panel and the guide together (paradox); help cards cover Pause as time starts (merthyr `g1-20-running.png`).
10. **Welsh for the fluent reviewer** (cymraeg unless named): "De Ddwyrain Cymru" (De-ddwyrain); "Chofnodwyd dim newid" needs "Ni" (`g2-48.png`); "Y cymoedd gwyrdd, na wnaethoch ei hadeiladu" (eu, `game2-end-06.png`); "yn Pill, yng Nghasnewydd" (ym Mhil, `game2-end-03.png`); "Bryste a Swydd Gaerloyw'r De" and "Y feddygfa'n cau" against "meddygfa'n cau" (`g1-24.png`); "ac mae ganddo gwmni am flynyddoedd"; "Cartrefi a chymuned a ostyngodd fwyaf"; "yn gofyn am" for needs; stray "Heddiw / Yfory" on the title time line (`t02-cy.png`); "Byddai Cefnogi cwmnïau lleol" (merthyr `game2-end-cy.png`); letter says Iechyd opened 2034, the build said 2035 (`game1-end-*`). "Yr ail lawr" is a correct mutation; the tester's doubt is about the image, not the grammar.

Housekeeping: two testers left `drv.mjs`, `drv.log` and `out.txt` in the project root. They are not the game's and can go.

## Against rounds 1 and 2

| Mark | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| Fun median (game 1, game 2) | 6, 5.5 | 6.5, 7 | 7, 7 |
| Clarity median | 6, 6 | 6, 7 | 6, 6 |
| Play again median | 6, 5.5 | 7, 6.5 | 7, 7 |
| Comprehension | 14.5 to 15.5 of 16 | 14 to 16 of 16 | 15.5 to 17 of 17 |
| Three true differences | 1 of 8 | 4 of 8 | 3 of 8, ending rule now met |
| The map | 4 of 8 | 6 of 8 | 8 of 8, but 2 name the bars |
| Sources | 6 of 8 | 5 of 8 | 7 of 8 |
| Welsh | Fail | Fail | Pass |
| Rushed | 4 | 6 | 7 |
| Retell | 4 of 8 | 7 of 8 | 8 of 8 |
| Doomed | 8 of 8 | 5 of 8 | 5 of 8 |
| Losing game | Fail | Fail | Pass |

**Really gone from round 2:** the keystone loop (every persona who reached a keystone named its gate right: "Station quarter in two councils"); laws that crash backing and silently return; "the Wales you did not build" naming an ending you built; prices that disagree; Space dead on a focused button; "COST" and "Carreg glo" in Welsh; raw codes; which build opened a tier (cymraeg `g1-39.png` names all three); towns with no council; same events in game 2 (paradox's events and letters differed). The careless games now lose, which is why the losing game passes.

**Changed shape:** "too easy late" became "backing stuck under 5 whatever I built"; the same 5 of 8 feel doomed, for the opposite reason. The deal now says where and what to build, but not that the build must be new, and that gap is the new top trust problem. Laws now show each council's cost, but the after count is wrong at the one moment laws are offered.

**Came back:** cards over cards (round 2 must-fix 4); end text that contradicts itself (round 2 must-fix 3, now the river and the gamble); "working from" against "bedded in" dates (must-fix 11); the clock restarting after a card (should-fix 4); a stale purse line in the ticker (must-fix 8); coins piling up (7 of 8, as in round 2).

## After fix round 3

Packages A to D and the Welsh pass fixed their findings; the join made them fit, closed every open NEEDS entry, and played two full games in English from the title page on the clock at the default speed (design/scripts/board-fix3-join.mjs; shots in design/shots-build/board-fix3/join/, a second careless game on the final build in join/rerun/). At the join: `npm run board:build -- --strict` clean, typecheck clean, 913 of 913 unit tests, 71 of 71 e2e (v1 and board), balance 34 of 38 as in package D's run (docs/design/board-balance-log.md).

**The two games.** Careful (26 builds, Living landscape to its keystone): won 2030, won well 2034, lost 2038 (the run-up card a year before said "Held now, you would lose ... bring Cardiff round: needs 0.1 more"), kept the Cardiff deal with a Welsh-medium school, won well 2042 and 2046; ending The green valleys, "much better". Careless (9 builds, a law at once, first answers, ignores deals): won 2030 and 2034, lost 2038 with 5 of 10, broke its Newport deal, won 2042 and 2046 with 8 and 7 of 10; ending The patchwork, "about the same". The rerun careless game lost 2042 with 3 of 10 and won again in 2046. Neither was wiped out (lowest 3 of 10). At each low point the screen showed a lever: the term report and the run-up card named the councils to bring round and how far each is from 5; the council panel opened "What holds it under 5" on "Monmouthshire is asking for Homes and community. Build a repairs team for cold, damp homes here (2 coins): backing +0.6 once it works" (`rerun/careless-80-low-2043.png`); and the full purse card now says where coins move backing (`rerun/careless-40-stop-purse_full.png`). No text faults, no console errors in any of the three games.

### Must fix

| # | Finding | Status | Where |
|---|---|---|---|
| 1 | Deal judged broken after building what it asked | Fixed | Rule: deals.ts, any project working there by the deal's last step, never offered for a measure already lifted there (D). Screen: the join made dealWords.ts call the engine (`dealKeptBy`, `dealProgress`, `buildCountsForDeal`) and dropped "Only a project started after this deal counts" in both languages; each build card says Keeps, Too slow or Does not count (C). Record: each deal line has its years (A). Why? reads a broken deal's return as the anger fading (C). Careful game: "2041: your deal with Cardiff to lift Welsh and culture, made in 2038, was kept" |
| 2 | Law preview counts the wrong thing at an election | Fixed | lawCost.ts counts live backing (C) |
| 3 | Why? empty or wrong about backing | Fixed | WhyPanel.tsx, whyWords.ts opens on "Since 2026" and lists what holds it under 5 (C; `careful-62-why.png`); the join words the P1 expectation record "People here expect more each term" and a P7 record as answered, then the thanks fading (causes.ts, `cause.expect`, `cause.answered`) |
| 4 | Backing stuck under 5 with no lever | Fixed | Rule P7 "Asked and answered", P1 `loss_eases` (D); "What holds it under 5" (C); the join put the lever line first on the council panel (`holds.lever`) and on the full purse card (purseLever.ts, tested over bot games) |
| 5 | White bar on dark warning cards | Fixed | clock.css (B) |
| 6 | Counts disagree on one screen | Fixed | One count, `backersNow` (C); the join made the top strip count with it and show the year with time.ts `shownYear`; the record ends on a 2050 line (A) |
| 7 | One flood, two rivers | Fixed | event-river.ts (D), the end (A); the join made Respond.tsx and the turns not taken read the river on the event record. Careless: chapter and turning point both name the Ebbw in Newport |
| 8 | The gamble contradicts itself | Fixed | endings.yaml, letters.yaml, `letterSayable` (A) |
| 9 | Placeholder shown as a source | Fixed | `transport-health-access`, `transport-labour` (D); "Rough guess, evidence still to find" (C). The rule book's licence line is v1 book code, left |
| 10 | Space answers a card | Fixed | clock/keys.ts (B); the join made Respond.tsx and TermReport.tsx take the focus on the card itself and removed BoardScreen's stub |
| 11 | Cards overlap again | Fixed | hold.ts one card at a time, clock/labels.ts (B); term report steps aside (C). None seen in the join's games |
| 12 | Keystone start date contradicts the calendar | Fixed | opened.ts `keystoneOffer` (B) |
| 13 | The map shrinks or is cut off | Fixed | The cause: src/map/PaperMap.ts `focusLas` now fits to the size when its ease ends; the join removed MapStage's delayed refit, and board-map-fit.spec.ts passes without it |
| 14 | Rule book Back offers an older game | Fixed | session.ts, game.ts `leftFor` (B) |

### Should fix

| # | Finding | Status | Where |
|---|---|---|---|
| 1 | Coins pile up | Partly | Purse 24, purse card once a game, ticker lines leave when untrue (B, D); the join's purse card names a build that moves backing. The careless games still sat at a full purse for years, as a careless player would |
| 2 | Jargon | Fixed | Build menu line on starter, bigger and keystone (C); tips on purse and, at the join, on the backers count (`targets.why`) |
| 3 | A win never asks for its law | Fixed | Election.tsx "Choose your law change" (C; `careless-50-term-2034.png`) |
| 4 | Dates and numbers on a card disagree | Fixed | BuildTicket.tsx, preview (C), on-the-way.ts (D); the join: "less than 0.1 more" instead of "(0.0)", and "This counts 0.8 still to come" instead of "0.8 of it is still on the way" beside a smaller rise |
| 5 | The clock still rushes | Fixed | AfterCard on every card (B); the join put it on the event card and the term report (`careful-43-respond.png`) |
| 6 | Won and won well look arbitrary | Fixed | Record lines with the people share and the rule (A) |
| 7 | Verdict bands jump | Fixed | G1 `band_some` (D), words (A) |
| 8 | The same deal again | Fixed | deals.ts `dealChoices` (D) |
| 9 | Smaller words and bugs | Fixed | B, C. The join: "Free short courses for learners" (events.yaml); a project named with an article reads "Build a repairs team" mid-sentence (english.ts `namesInSentence`, tested); then and now changes at one decimal ("+2.0" beside "+3.1", ThenNow.tsx) |
| 10 | Welsh for the fluent reviewer | Fixed | Welsh pass; the join fixed the tab title "De-ddwyrain" (shell.json). Pill stays "Pil" in board sentences through cymraeg.ts; authorities.yaml, shared with the atlas, needs a sourced Welsh name |

Housekeeping: no stray files were left in the project root this round (drv.mjs, drv.log and out.txt were already gone).

**Still open.** The four balance marks that fail every round (drift, tipping in common, stories seen, each branch's day). The careless run chapters can repeat a name ("Holding on" for 2026 to 2030 and 2046 to 2050). On the council panel the lever's build (what the council asks for) and "Builds here that would lift it most" (what its people care about) can name different builds; both are true, but a player may ask which to pick. The Welsh strings the join added (`deal.must`, `build.dealUpgrade`, `holds.lever`, `holds.leverShort`, `cause.expect`, `cause.answered`, `cause.answeredFading`, `stop.purse_full.lever`, `head.*`) are flagged for review and were not replayed in Welsh by hand beyond the e2e.
