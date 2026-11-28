# Playtest 8: cold round 1 of the board game (v2)

*28 November 2026, local build at http://localhost:4190/#/bwrdd. Eight fresh personas, two full games each, marked against sections 13.1 and 16.6 of `docs/design/v2-board.md`. Screenshots are in `design/shots-build/bcold1-<persona>/`. The judge read the end screens and the repo (`model/board/`, `src/board/`) to set the key.*

**Verdict: the round fails.** Comprehension and "is this it?" pass. Fun, clarity, play again, the difference test, the retell, not doomed, the clock, the map and Welsh all fail. Every persona hit the same top three: the hidden result, the held clock that still says "Pause", and the coin cap announced only at 16.

## The marks

| Mark | Bar | Result | Pass |
|---|---|---|---|
| Fun | Median 8, nobody below 7 | Game 1 median 6, low 5. Game 2 median 5.5, low 4 | Fail |
| Clarity | Median 7, nobody below 6 | Game 1 median 6, low 5. Game 2 median 6, low 5 | Fail |
| Play again | Median 8, 6 of 8 name a next try | Game 1 median 6, low 5. Game 2 median 5.5, low 3. All 8 named a third game, but the sheet asked them to | Fail |
| Comprehension | 13 of 16 each, no question wrong for 3 or more | 14.5 to 15.5 each. No question wrong for anyone. Q10 was only half right for 7 of 8, because the game never shows what a win changes | Pass |
| Difference test | 6 of 8 give three true lines. Different endings, or the same ending with a different lowest council | 1 of 8 (civ) has three true lines. Business and designer got The patchwork twice, and the end screen never names the lowest council, so the fallback cannot be checked | Fail |
| "Is this it?" | Civ and designer say yes and name it | Both yes: 11 unseen endings, other promises and branches, Laws, the rule book | Pass |
| The map | 7 of 8 name the map, a council or a link. Nobody names the bars | 4 named the council panel. 4 named the bars (casual, policy, pupil, designer). Nobody named the map | Fail |
| Sources | 4 of 8 open a source, real figure or rule book unprompted | 6 of 8 (civ, nurse, cymraeg, policy rule book, pupil, designer) | Pass |
| First build | 7 of 8 within 90 seconds | 8 to 14 actions. Time not recorded. Four lost actions to the title page's Start, which opens the old game | Not proven |
| Welsh | No English left, every stiff phrase logged | English subtitles under Welsh headings, template splices, missing mutations (logged below) | Fail |
| The clock | 6 of 8 pause and change speed untold. Nobody rushed | About 3 of 8 found it untold (nurse, cymraeg, pupil). Rushed: business, designer, pupil, civ. Clock froze for minutes for cymraeg and policy | Fail |
| The retell | 6 of 8 true to chapters and turning points | 4 true (civ, cymraeg, policy, designer). 4 partly (casual, nurse, pupil game 1, business) | Fail |
| Not doomed | At most 1 of 8 say yes | 8 of 8 say yes, nearly all naming 2026 to 2036, when the headline sat at 45 to 47 | Fail |
| A losing game | Two careless players rate the ending 7 or more and name a change | Casual: 8, named one. Business (lost two elections): 3. Pupil (idle game 1): 5 | Fail |
| Length | 12 to 25 minutes | Not recorded | Not proven |

## Comprehension, marked

R right, H half, W wrong. Half marks the game caused are starred.

| Persona | Halves | Score |
|---|---|---|
| civ | Q10* | 15.5 |
| casual | Q6* (Why? is circular), Q10*, Q14 | 14.5 |
| nurse | Q2* (never reached 16, so never warned), Q10*, Q14 | 14.5 |
| cymraeg | Q7* (no reason shown), Q10* | 15 |
| policy | Q10* | 15.5 |
| pupil | Q2*, Q10*, Q14 (game 1) | 14.5 |
| business | Q8* (could not tell which build), Q14 | 15 |
| designer | Q10* | 15.5 |

Key used: Q2 coins come at about 3.75 a year plus growth, the purse holds 16 and more is lost (rule B1). Q8 three working tier 1 projects of a branch open tier 2, two tier 2 open the keystone, a keystone opens its legacy project (`model/board/tree.yaml`). Q10 a council backs you at 5 or more; you win with more than half the people; a loss forces a deal (P4, P6). Q11 four years 0.6 better pulls young adults in, adds backing and a coin a year (R2). Q12 Left for 2050 decides (G1).

## The difference test

| Persona | Endings | Lines true |
|---|---|---|
| civ | The warm country, The city and its bedrooms | 3 of 3 |
| casual | The patchwork, The gamble | 2 (coin cap not on the board) |
| nurse | The long game, The patchwork | 2 (surgery not on the board) |
| cymraeg | Y cymoedd cysylltiedig, Y ddinas a'i llofftydd | 2 (events not on the board) |
| policy | The patchwork, The joined-up valleys | 2 (backing at the start not on the board) |
| pupil | The patchwork, The warm country | 2 (promise not on the board) |
| business | The patchwork twice | 1 (The hung years is true) |
| designer | The patchwork twice | 0 to 1 |

Most false lines were true to play but not shown on the end screen (promise, coin cap, events). The end screen should show the promise, the lowest council and the backing history.

## Fixes: must fix (bugs, contradictions, trust, stopped play)

1. **Result hidden in a closed "The count".** 8 of 8. civ `game1-end-06.png`, casual `game1-end-count.png`, policy `game1-end-count.png`: "End screen has no score". Open it and put both scores and the verdict at the top. `src/board/ui/end/Count.tsx`, `src/board/ui/end/index.tsx`.
2. **Clock held but button says "Pause", and stuck holds.** 6 of 8. policy `g1-27.png`, `g1-28.png` ("I waited 160s"); cymraeg `g1-17.png`, `g1-18.png` (frozen for minutes with nothing open); casual `g1-047.png`; designer `g1-p15.png`; nurse `g1-24-adv.png`. Show "Held" on the button, release the hold when nothing is open. `src/board/ui/clock/Clock.tsx`, `src/board/engine/held.ts`.
3. **Coin cap only told at 16.** 8 of 8. civ `g1r-05.png`, pupil `g1-r20-2046.png`, designer `g1-fin0.png`. Show "purse 16 at most" on the coin counter and warn at 12. `src/board/ui/TopStrip.tsx`, `model/i18n/en/boardui.json`.
4. **Ending lines name Maesteg for the wrong project and year.** Boards of 5 personas; noticed by casual, policy ("Offices opened in Maesteg in 2038" though nothing built there), business ("in 2035" against "since 2043"). `project_standing` takes the first council in list order, and `townOf` takes `towns[0]`. `src/board/engine/endings.ts` (also `story-terms.ts`).
5. **End text contradicts itself.** 6 of 8. "Gap is the smallest it has been" next to "gap is still wide" (civ `game1-end-02.png`, pupil); chapter "opened in Newport" against letter "Merthyr" (civ, nurse); "Nothing big happened here" after "much better" (policy `game1-end-2.png`, business); "Coming home" with young adults down 2.4 (designer `g1-q3b.png`); "The second floor" as the last chapter, and repeated chapters ("Yr ail lawr" three times, cymraeg `game2-end-01.png`; "Coming home" twice, designer). `model/board/endings.yaml`, `model/board/story.yaml`, `src/board/engine/story.ts`.
6. **Backing threshold contradicts.** 4 of 8. "Does not back you. Backing 5 out of 10" (nurse `g1-45.png`, pupil `g1-r11-newport.png`); RCT 4.6 backs while Newport 4.6 does not (cymraeg `g1-05.png`, designer `g1-q8.png`). Round down, or show one decimal everywhere. `src/board/ui/CouncilPanel.tsx`, `src/board/ui/words.ts`.
7. **Template splices and missing words.** 5 of 8. "A warning: The river runs dirty may hit Newport", "The burst its banks" (business `g1-25-warn.png`); "could have been The gamble" (casual `game2-end-4.png`); Welsh "gall Mae cwmni eisiau tyfu yma daro" (cymraeg `g1-28.png`), "Daeth Mae'r afon yn fudr i Casnewydd" (`g1-63.png`). Give events a noun name for slots. `model/board/events.yaml`, `model/i18n/{en,cy}/boardui.json`.
8. **Raw decimals.** 6 of 8. "Needs 3 coins. You have 1.8132" (casual `g1-021-rct.png`), "6.5002" (pupil `g1-22-merthyr-build.png`). `src/board/ui/BuildMenu.tsx`.
9. **Map labels.** 5 of 8. "Sum Sum Summer 2037", "Working: Working:", markers in the sea (casual `g1-040.png`, nurse `g1-14-closed.png`, civ `g1-19.png`). `src/board/ui/MapMarks.tsx`.
10. **Deal after a lost election hidden.** Business `g2-deal-a.png`: "Carry on" greyed, deal buttons scrolled out of sight; stopped play. `src/board/ui/DealChoice.tsx`, `Election.tsx`.
11. **"That action is not allowed now"** on "Make these 3 tips safe first". Policy `g1-51.png`. `src/board/ui/Respond.tsx`, `src/board/engine/actions.ts`.
12. **Legacy project shows "Not open yet." with no reason**, while the overview says "Tier 2. Open." Designer `g2-b2.png`. Name the keystone it needs. `src/board/ui/blockers.ts`, `TreeSheet.tsx`, `boardui.json` `need.other`.
13. **"Look" opens the wrong council.** 3 of 8 (designer `g1-q8.png`, pupil `g1-r5-look.png`, business `g1-24-look.png`). `src/board/ui/WarningSlip.tsx`, `Ticker.tsx`.
14. **Raw ids and empty sources in Why?** 3 of 8. "project:repairs-team", "Your A repairs team", "ONS ONS", "Various", wrong build year (nurse `g1-18-why.png`, designer `g1-p13.png`, `g1-r12.png`). `src/board/ui/WhyPanel.tsx`, `causes.ts`, `src/board/engine/explain.ts`.
15. **Game number differs between start and end.** 4 of 8 (civ 3,036 against 1213; nurse; business; policy). `src/board/ui/StartScreen.tsx`.
16. **Stale "0 left if you build it".** 3 of 8 (civ `g1-32.png`, nurse `g1-11-afterbuild.png`, policy `g1-07.png`). `TopStrip.tsx`.
17. **Overlapping Gwent Levels option cards.** Policy `g1-42.png`, pupil `g1-r15-modal-bottom.png`. `Respond.tsx` styles.
18. **Title "Start" opens the old game.** 4 of 8 (casual `g1-002-start.png`, nurse `g1-02-first.png`, cymraeg, pupil). `src/ui/shell/TitleScreen.tsx`.
19. **Welsh.** English subtitles under Welsh headings; "yn Casnewydd", "yn Blaenau Gwent", "i Caerffili"; "o yr haf"; "Gêm rhif 1,440"; "bod yn Y gambl". Cymraeg, policy `g2-cy-end.png`, pupil. `model/i18n/cy/*.json`, mutation of `{council}` slots, `src/board/ui/end/`.

## Should fix

1. **Nothing moves for ten years.** 8 of 8 felt doomed, mostly 2026 to 2036 (casual `g1-040.png`: "45 to 47 over ten years"). Bring first effects forward or show them on the headline. `model/board/rules/growth.yaml`, `projects.yaml`.
2. **Elections change nothing visible.** 7 of 8. Say what a win keeps and what a loss costs. `Election.tsx`.
3. **Prices change silently** (Free to 3, 1 to 3). 5 of 8. Name the fresh start on the card. `BuildMenu.tsx`.
4. **Guide covers the Build button and talks about bars with no council open.** 5 of 8 (pupil `g1-09-detail.png`, business `g1-05-guide2.png`). `Guide.tsx`.
5. **Jargon:** keystone, tier, purse, backing, counts as joined, a level. 8 of 8. `boardui.json`.
6. **Keystone not signposted until too late.** Civ `g2-05.png`, designer `g1-s1.png`, policy `g2-10.png`. `TreeSheet.tsx`.
7. **Clock restarts on its own after a card.** Business `g1-18-closed.png`, civ. `Clock.tsx`.
8. **Circular Why:** "People moving and changing their minds". Casual `g1-013-why.png`, business, cymraeg. `causes.ts`.
9. **Repeated events** (surgery and fuel three times). Cymraeg, nurse. `events-schedule.ts`.
10. **Same letter both games.** Designer, business. `model/board/letters.yaml`.
11. **Balance:** Land a big employer dominant, low effort beat high effort (designer). Check with the bots.
12. **Local truth:** "The Ely flooded Barry" (policy `game1-end-full.png`); the Ely reaches the sea at Cardiff. `model/board/links.yaml`.
13. **The end screen lacks the promise, the lowest council and backing history**, so the difference test cannot be marked fairly. `src/board/ui/end/`.

## Best moments

Why? with a named rule and "how sure"; dashed "if you build it" previews; warnings that name their fix, then the event lands; the Rhondda tips choice; the Merthyr pensioner letter; "The Wales you did not build"; the honest autopilot line.

## After fix round 1

*Marked at the join, 28 November 2026, after packages A to D and the Welsh pass. The join played one full game in English from the title page, on the clock at the default speed (a year every 16 seconds, about 7 and a half minutes of play), as a careless first-time player who builds every second year and keeps no deal. Script: `design/scripts/board-fix1-join.mjs`; the Gwent Levels visit: `design/scripts/board-fix1-join-visit.mjs`. Shots: `design/shots-build/board-fix1/join/`. A text scan of every screen found no raw decimal, raw key, empty slot, doubled word or dash, and the page logged no errors.*

### Must fix

| # | Finding | Status | Where, and what the join saw |
|---|---|---|---|
| 1 | Result hidden in "The count" | Fixed | `src/board/ui/end/Verdict.tsx` (A). The join also made the gap words come from the whole numbers shown (`record.ts` `shownGap`, tested): its game showed "45 → 52" beside "about 6 points better". `70-end-open.png` |
| 2 | Clock held but says "Pause" | Fixed | `src/board/ui/clock/hold.ts` (B). "Held" with the reason under it in every held shot (`21-build-held.png`, `50-term-2030.png`) |
| 3 | Coin cap told only at 16 | Fixed | `src/board/ui/clock/coins.ts` (B). "13 of 16 coins, Purse nearly full: spend some" (`60-board-2044.png`) |
| 4 | Ending names the wrong project and year | Fixed | `src/board/engine/endings.ts` (A). The letter names the keystone built in the Vale and its year (`71-end-07-be-letter.png`) |
| 5 | End text contradicts itself | Fixed | `src/board/engine/endings-truth.test.ts` (A). Six different chapters, each true to the game (`71-end-05-be-chapters.png`) |
| 6 | Backing threshold contradicts | Fixed | `src/board/ui/words.ts` `backingShown` (C). "Backing 4.8 out of 10. A council backs you at 5 or more." |
| 7 | Template splices | Fixed | Engine nouns (D); the join passed the noun in the screen sentences left (`Timeline.tsx`, `StopCard.tsx`, `CouncilPanel.tsx`, `causes.ts`, the place sheet), the river in `Respond.tsx` and `Verdict.tsx`, and moved ending titles after a colon in `endings.yaml` ("you might have had: The gamble") |
| 8 | Raw decimals | Fixed | `src/board/ui/words.ts` (C). None in the whole game's text scan |
| 9 | Map labels | Partly | `src/board/ui/markLayout.ts` (C); the join made words above a council's name move up, not down onto it (tested). Still open: a working mark or slip can sit on a base-map town name (Newport in `61-council-2031.png`), and a slip can slide under the colour key (`60-board-2044.png`) |
| 10 | Deal hidden after a lost election | Fixed | `TermReport.tsx` (C). Deals in sight, Carry on waits for one (`52-deal.png`) |
| 11 | "Not allowed now" on a visit | Fixed | Blocker removed (D); the join added `visitBlockWords` in `blockers.ts`, read by the stop card, the council panel and the place sheet, which now shows the reason instead of options. Dead `visit_used` removed |
| 12 | Legacy project with no reason | Fixed | `src/board/ui/blockers.ts` (C). "Opens when Work comes up the line is working. It is the keystone..." (`64-tree.png`) |
| 13 | "Look" opens the wrong council | Fixed | `StopCard.tsx`, `Ticker.tsx` (C). "Look at Torfaen" opened Torfaen (`41-warning-look.png`) |
| 14 | Raw ids in Why? | Fixed | `causes.ts`, `whyWords.ts` (C), `board.json` (D). Checked on C's `en-a-22-why.png` |
| 15 | Game number differs | Fixed | `src/board/ui/startOffer.ts` (B) |
| 16 | Stale "left if you build it" | Fixed | `TopStrip.tsx` (B). Shows only in the build menu (`05-build-preview.png`) |
| 17 | Overlapping Gwent Levels cards | Fixed | At the join: `place/LightPlace.tsx` options no longer carry the shared `ticket` grid (`81-visit-gwent-picked.png`) |
| 18 | Title "Start" opens the old game | Fixed | `src/ui/shell/TitleScreen.tsx` (B). `00-title.png` |
| 19 | Welsh | Fixed | `src/board/ui/cymraeg.ts`, `tests/e2e/board-cy.spec.ts` (Welsh pass). Not replayed in Welsh by the join beyond the e2e |

### Should fix

| # | Finding | Status | Where, and what the join saw |
|---|---|---|---|
| 1 | Nothing moves for ten years | Partly | `on-the-way.ts`, `score.ts`, rules (D); headline to one decimal with what is on the way (B; the join wired it to the engine's `headway`). The bots meet "Things move early" (Skilled +3.4 by 2030), but the join's careless game was "Up 0.3 since 2026" in 2030 and its first chapter "Holding on". A casual player can still feel stuck for four years |
| 2 | Elections change nothing visible | Fixed | `Election.tsx` (C). Each result and yours marked (`51-election-2030.png`) |
| 3 | Prices change silently | Fixed | `BuildMenu.tsx` (C). "2 off the full price of 3. A fresh start here" |
| 4 | Guide covers Build | Fixed | `Guide.tsx` (B). Three notes, each beside its subject (`02`, `03`, `05`) |
| 5 | Jargon | Mostly | `boardui.json` (C). "Starter, bigger, keystone" explained where shown; "purse" stays, explained on the counter |
| 6 | Keystone not signposted | Fixed | `branchPath.ts`, `BranchRoad.tsx` (C). "Top of this branch" on every branch (`64-tree.png`) |
| 7 | Clock restarts after a card | Fixed | `Clock.tsx` (B). "Paused after your answer. Press Play when you are ready." (`44-after-respond.png`) |
| 8 | Circular Why | Fixed | `causes.ts` (C), `board.json` (D) |
| 9 | Repeated events | Fixed | E1 `repeat_max`, `repeat_gap_years` (D) |
| 10 | Same letter both games | Fixed | `letters.yaml`, `found.ts` (A) |
| 11 | Balance | Partly | Skilled beats Spender and Reactive in every game (D). Quick run meets 26 of 31 marks: drift mild, place matters, tipping points differ, stories differ (18 of 24 chapters seen) and each branch has its day (Made here) still fail |
| 12 | "The Ely flooded Barry" | Fixed | `links.yaml` (D), river lines name the council (A); the duplicate river helpers in `story-terms.ts` and `end/view.ts` now use the engine's `riverAt` |
| 13 | End screen lacks promise, lowest council, backing | Fixed | `be-record` (A). `71-end-01-be-record.png` |

### Found and fixed at the join

- The strip said "open by 2027" beside a ring marked "Summer 2028": `on-the-way.ts` counted a build's opening one step early. The strip now reads the engine's `headway` ("0.1 of it is still on the way, all in by 2028"); `headway.test.ts` checks the year is never before the opening season.
- A line project built from Merthyr Tydfil was "working now in Rhondda Cynon Taf": it now names both ends (`clock-stops.ts`, `board.stop.finished_link`).
- "Make it bigger" on a project still being built said only "Not on offer now": a new blocker says it can be made bigger once it works, and when (`projects.ts`, `blockers.ts`).
- The axis year under the time line's "now" tag printed "20 Summer 2028": hidden while covered (`Timeline.tsx`).
- The headline figure could shrink under its change line (`clock.css`).

### Still open, for the designer

- A careless game falls from 8 councils backing in 2030 to 0 in 2042 and 2046 after three broken deals (backing falls 0.5 everywhere for each). The player cannot win again. Worth a look against "A lost election is not the end", which the bots pass because they keep deals.
- Map marks over base-map town names (must-fix 9, above).
- The made here branch still cannot have its day (balance log; content, not tuning).
- Source titles stay English on Welsh screens: they are the publications' own titles. A Welsh title field is a data task.
