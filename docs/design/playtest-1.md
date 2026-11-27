# Playtest 1: Etifeddiaeth, first-time player

*Played 27 November 2026 against the production build (`npm run build`, `vite preview`), driven through Playwright at 1440x900 with a second pass at 1280x800. Three games: one careful (seed 461067058), one deliberately careless, one short one at 1280x800. Plus the Heddiw atlas and the model book. I did not read the code. Screenshots are in `design/shots-build/playtest-1/`.*

## Score: 6 out of 10

It is the best-looking thing of its kind I have seen, and it does not yet play as well as it looks. The paper map, the railway tickets, the post rail on the timeline, the Rhondda and Bethesda boards built from real tips and real streets, and "Pull the thread" are all 8 or 9 out of 10 pieces. The atlas on its own is an 8. But the game sitting on top kept telling me I had done badly without telling me why. I went to Bethesda in term 1, covered every column on the board, and was stamped POORLY; Trust dropped to Thin and I played the next two terms with two cards. I went to the Rhondda and was stamped POORLY again with a pair of threads that, as far as I can tell, could not have passed. The same voice from Abergavenny opened four terms running with the same request. The letter at the end called my years hollow and named nothing I had done, after a game where I beat the caretaker and the result band said "Held, just". Then I played a second game as a vandal (three debts, repairs skipped three times, every shock absorbed, no visits) and finished one pip behind my careful game with Trust at Fair throughout. A game about consequences has to make the careful game and the careless game feel different while you are playing them. This one mostly does not, yet.

## The 15-item checklist

Tally: **9 pass, 5 partial, 1 fail.** The bar is 12 passes including items 1, 4, 7, 11 and 15. The five required items all pass, three of them narrowly (4, 11, 15). **The build does not pass yet.**

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Touched the map, read a real figure, knew I would be judged from 2050, in 60 seconds | Pass | Title line and sealed envelope land at once (`g1-00-title.png`). After "Play", "Point at a place you know" and a click gave Powys: 135k people, 16.4% speak Welsh, each with an ONS tag (`g1-02-after-play.png`). Note the map on the title screen itself is not clickable, which is where I first tried. |
| 2 | First card inside two minutes, no paragraph of instructions | Pass | Three one-line stitched notes, first card played in about a minute (`g1-12-flood-region.png`). Marred by the region picker opening below the fold of the hand (`g1-10-click-flood.png`). |
| 3 | Could say what every mark on a ticket means after one term | Partial | Helps, frays, cost and delay are clear. Not clear: a ticket that helps and frays the same strand ("Build flood walls": Resilient, frays Resilient; "Health before hospital": Healthier, frays Healthier), "Needs partners" (never explained, and Community-owned energy then arrived a term late with no reason given), "Regional compact" (no marks at all, no description), "Upgraded in Ddoe by: The school boards". |
| 4 | Stared at the hand because I wanted three and could afford two | Pass (narrow) | Term 2: Trust Thin allowed two cards and I wanted Homes for locals, Buses and Health before hospital. Term 5: six pips, four slots, three cards I wanted cost exactly six (`g1-73-t5-played.png`). In the other terms the pips were slack: with two or three card slots and cards at 1 to 3 pips I always had 2 to 5 left over. |
| 5 | Held back contingency and regretted holding or not holding | Pass (narrow) | Term 5 I spent everything, Buying rush landed, Culture fell and my promise broke (`g1-76-t5-changed.png`). Real regret. In every other term contingency was whatever happened to be left, not a decision. |
| 6 | A forgotten card arrived from the post and I felt paid or cheated | Partial | Arrivals are announced nicely ("Early years first arrives across Wales", `g1-30-t2-open.png`) but the arrival shows no payoff, so I felt neither. Worse, the same card had already "lifted Prosperous" in 2030 while still sitting in the post until 2038, so the post rail and the slips disagree. |
| 7 | Pulled a thread from a strand to my own card and a named source, and it made sense | Pass | The best thing in the game. Resilient to Build flood walls No. 0605 to rule R09 to Welsh Government, with a red thread drawn to the valleys (`g1-27-thread-resilient.png`). In term 4 the thread even listed my three Rhondda tips by name (`g1-69-cy-thread.png`). Loses marks for the debug-grade detail, see item 13. |
| 8 | Something I did not intend happened and the game showed why | Pass (narrow) | Buying rush wore down Culture and broke my promise, with a thread. But the slip marked "Unexpected" was usually the jobs ripple, or a fray printed on the ticket ("Land a big employer wore down Global" is on the ticket face). The Recession I spent two pips on got no slip at all. |
| 9 | Trust stopped me, and I understood what had cost me the Trust | Partial | It stopped me in term 2 ("Trust allows no more cards this term"). The reasons were "Your visit was judged poorly" and "People felt things slip". I did not know why the visit was poor or what slipped. Later screens say "Trust rose" above the reason "Your visit was judged poorly", and "Trust fell" above "People can see things getting better". |
| 10 | Went to the Rhondda or Bethesda, found it hard, could defend my choice, could not tell what the game wanted | Partial | Hard and defensible: yes, both boards are superb (`g1-38-rhondda.png`, `g1-23-beth-3placed.png`). But four of five visits were stamped POORLY with no explanation, staying away is "adequate", and on my second Rhondda visit choosing the three "High movement risk" tips scored WELL on all three tests. So there is an answer the game wants, and the lesson I drew was "do not go unless you have three threads". |
| 11 | A voice or the letter named something specific I did, and it stung or pleased | Pass (narrow) | "Forty years I've looked up at that tip. First time I've slept without keeping an eye on the rain." Maerdy, 2038, after I stitched Maerdy Spoil Tips (`g1-56-t3-changed.png`). That is the game working. Against it: the Tregarth voice blamed me for lorries on the High Street when I had not chosen the slate option; the Pentre voice complained about fairness in the one test I passed; the opening voice was the same Abergavenny line in terms 3, 4, 5 and 6; and the letter named nothing. |
| 12 | Understood on the end screen why the result was the lower of Lived and Left | Pass | "Lived: level with 2026 on what you inherited. Left: about 3 pips down. Your result is the lower: Left, Held, just." Outlined box, caretaker ghost, worst term marked on the timeline (`g1-88-letter-open-b.png`). Clear and fair. |
| 13 | Never saw a pound sign, a decimal or false precision, and could tell sharp from fuzzy | Fail | No pound signs in the game. But the thread panel shows "points per play: 2 (range 1.5 to 2.5)", "points per term: -0.35 (range -0.4 to -0.1)", "Trust points: -4 (range -4 to -4)", "share of the spend reaching the authorities in scope: 1 (range 1 to 1)". I only ever saw the word "Sharp"; I never saw a fuzzy result look different on the strand row. |
| 14 | Switched to Cymraeg mid-game and nothing broke, went missing or read like a translation | Partial | Nothing broke, and the coverage is impressive: tickets, map labels (Wrecsam, Lloegr, Yr Wyddfa), mutations on counts ("3 cherdyn", "2 dymor") (`g1-59-cy-plan.png`). But: "COST" and "No." untranslated on every ticket; "Mae Y Rhondda yn gofyn amdanoch", "Mynd i Y Rhondda"; "yn gorffen y tymor yn Cryf"; "Gadewch i Diwylliant, iaith gwympo"; "yn golli"; "2 tomen"; "oherwydd y belen gromlin wlyb" reads as machine translation; the "I'r etholiad" button is clipped off the bottom at 900px (`g1-69-cy-thread.png`). And the Cymraeg toggle on the title screen does nothing at all (`t-cy-title.png`). |
| 15 | Wanted to play again and knew what I would do differently | Pass (narrow) | "Letters received: 1 of 6", "Prosperous let you down most", and I knew I would hold contingency and pick the high-risk tips. But part of what I learned was "avoid the place visits", which is the wrong lesson, and the second game showed that playing badly costs almost nothing. |

## The ten most important fixes, in order of effect on the score

### Bigger changes

**1. Make place visits explain themselves, and make a thoughtful visit never worse than staying away.**
- What is wrong: four of five visits were graded POORLY. The result card says only "Aros (staying): did not hold. in about 5 of 10 runs" (`g1-25-after-beth.png`, `g1-42-rhondda-result.png`). With two threads in the Rhondda I tried two sensible pairs (Tip 8 plus Lewis Merthyr Spoil Tip 1; then both Lewis Merthyr high-risk tips) and failed two of three tests each time. I suspect no pair can pass. Staying away is "adequate" and costs no Trust. Tips I made safe in 2034 were back at "High movement risk", unstitched, in 2038 (`g1-52-rhondda2.png`).
- Why it matters: this is the centrepiece and it currently teaches the player not to go. It also cost me the Trust band in term 1, which shaped the whole first game.
- What to change: (a) On the result card in the place screen, one plain line per test in terms of my threads: "Exposure did not hold: your two tips cover about a fifth of the homes below the tips; it needed two fifths. Maerdy Spoil Tips or Wattstown would have done it." (b) Grade by tests held: none poorly, one adequately, two well, three very well; or scale the Exposure threshold with the number of threads the money covers. A two-thread visit must be winnable. (c) Persist stitched threads: a tip made safe stays stitched and drops a risk step on later visits. (d) Rename the tests consistently: the board says "Young adults can stay", the result says "Aros (staying)". (e) Reword the invitation: "can make it land better, or worse" plus "if you stay away, delivery there is adequate" is an advert for staying away.
- Expected effect: item 10 to pass, item 9 to pass, and the Maerdy moment happens in most first games. Worth a full point on its own.

**2. Rewrite how the letter is assembled so it names things and matches the result.**
- What is wrong: my careful game ("Held, just", ahead of the caretaker, Lived level) got "The hollow years": "I remember cold rooms and quiet adults, and nothing you said... The promise was Culture and Welsh. It is the only thing anyone here remembers about you." I kept that promise three times out of four. It named no tip, no place, no card. The careless game got "The uneven hand", which fairly spotted that I ignored the South West, and did not mention three debts or three rounds of repairs never done.
- Why it matters: the design promises "judged, fairly, by a person" and "the letter naming a specific tip, a specific school, a specific debt". The letter is the last thing the player reads and the thing they will quote to someone else.
- What to change: every letter gets at least two lines filled from the ledger: the best place visit by name ("the tip above Maerdy"), the worst strand, debts left by year, promises kept and broken as a count, cards still in the post ("the peat you paid for lands this year; we will see"). Tie each such line to its thread as section 1.1 says. Choose the archetype from the result band first, so "Held, just" cannot draw the bleakest letter.
- Expected effect: item 11 passes on the letter and not only on a lucky voice; item 15 strengthens. Half a point or more.

**3. Make "What changed" account for every pip that moved, and make careless play hurt where the player can see it.**
- What is wrong: in 2038 the strand row showed Resilient down one and More equal up one, while the three slips were about Culture, Cohesive and More equal (`g1-56-t3-changed.png`). Nothing explained the pip I lost. Shocks get no slip. In the careless game Trust stayed Fair for six terms and the only cost of three debts was three interest pips I never noticed, because the pip row says "3 of 11 pips left" next to a link reading "Why 8?".
- Why it matters: the loop is play, wait, see why. If the why does not match the scoreboard the player stops reading it. And if borrowing is free until the end screen, the ledger is not a temptation, it is just a better button.
- What to change: slips are chosen first from strands whose pip count changed, each with its biggest cause; a shock that landed always gets a slip ("Recession: you halved it twice; Prosperous still fell"). "Unexpected" is only for effects not printed on a ticket the player played. Trust reasons carry a sign ("for: cards arrived as promised; against: your visit was judged poorly"). Debt interest and overdue repairs appear on the pip row as struck-out pips with a label, and each term with a debt or overdue repair produces one Trust reason or one voice about it. Tune so three debts and no repairs cannot hold Trust at Fair.
- Expected effect: items 8 and 9 pass cleanly; the second game feels like a different, worse Wales. Half a point.

**4. Fit the whole hand on screen and give the selected ticket a fixed place for its controls.**
- What is wrong: at 1440x900 I could see three and a half of four tickets in term 1 and three of five later; at 1280x800 two (`s1280-card-selected.png`). Selecting a ticket opens its region picker inside the scrolling list, usually below the fold, under a bar that says "1 more ticket below" when there is not one. At 1280x800 the "To the election" button is clipped off the bottom of the results column (`s1280-thread.png`); in Welsh the same happens at 900px.
- Why it matters: item 4 is about staring at the hand. You cannot stare at a hand you have to scroll.
- What to change: in the hand panel, shrink ticket height (title on one line, chips on one line, cost and delay on the stub) so five fit in the column at 800px; or deal the hand as a fan along the bottom above the timeline, which would also use the dead right-hand space on the opening screen. Put region buttons, "Play this card" and "Keep for next term" in a fixed tray above the pip box. Make the results column scroll with the action button pinned.
- Expected effect: item 4 becomes a solid pass; fewer first-minute fumbles. A quarter point.

### Quick wins

**5. Protect term 1 from a Trust band drop.**
- What is wrong: in two of three games Trust fell from Fair to Thin at the end of the guided term. In one of them I had played one card and visited nowhere. Every game's first slips include "A heartland falling below half Welsh-speaking wore down Culture" with "Trust points: -4", which the player cannot have caused or prevented.
- Why it matters: the first thing the game does after teaching you the rules is take a card slot away for something that was not your doing.
- What to change: Trust cannot change band in term 1 (or floor it at Fair); move the heartland threshold event out of term 1, or make it a warning on the trend card first. Also check its plausibility: the atlas shows Gwynedd at 64.4% and Anglesey at 55.8% in 2021, and the thread says it is "drawn through Isle of Anglesey and Gwynedd" by 2030.
- Expected effect: first-game players reach term 2 with three cards and a fair first dilemma.

**6. Stop the repeats: opening voice, pledge, shock.**
- What is wrong: "Tell us the one thing, then do the one thing. We can forgive the rest." Abergavenny opened terms 3, 4, 5 and 6. The promise asked was Culture, language in every term of both full games. Buying rush hit twice in game one; Investment wave three times in game two with the same Pembroke Dock voice each time.
- Why it matters: by the third repeat it reads as broken, and it removes the reason to play again.
- What to change: the opening voice is last term's closing voice, as the design says (section 2.2); never repeat a voice in a game. The pledge strand is the one that fell furthest last term, never the same strand twice running. No shock twice in a row; if the pool is small, vary the copy the second time ("again").
- Expected effect: items 11 and 15 firm up.

**7. Clean up the ticket face.**
- What to change: never print the same strand as helped and frayed; say what is meant ("Resilient here, frays Resilient elsewhere" or "Healthier later, frays Healthier now"). Add one line of plain description on the selected ticket ("Walls for the towns most at risk in one region. Needs upkeep of 1 pip a term."), which would also announce upkeep before it appears in the budget. Explain "Needs partners" in a line. Give Regional compact its marks or a sentence. Remove "Upgraded in Ddoe by" until Ddoe exists. Fix "COST 3 of 1 pips": the denominator becomes pips remaining after you play. "NATIONAL" tickets that then ask "Where? All of Wales, North..." should say "National or one region". Translate COST and No. in Welsh.
- Expected effect: item 3 passes.

**8. Take the workings out of the thread panel.**
- What to change: in the Pull the thread panel replace "points per play: 2 (range 1.5 to 2.5)" with words and the sharp or fuzzy mark ("a firm push, sharp" or "a small push, fuzzy"); drop rule codes, "a linear rule", "a input-output rule", "range 1 to 1" and the three unlabelled "points per pip" lines; keep a "see this rule in the model book" link for those who want numbers. On the place result write "held in about 5 of 10 runs" as "a coin toss" or "5 runs in 10", and fix the punctuation ("did not hold. in about 5 of 10 runs"). Remove the red "to check" tag from player-facing history lines, or finish checking them. Call the trend by its name, not "the wet curveball".
- Expected effect: item 13 moves from fail to pass.

**9. Fix Cymraeg at the door and at the seams.**
- What to change: the Cymraeg toggle on the title screen is dead; clicking it changes nothing and the choice does not carry into the game (tested in a fresh browser session). Fix the article and mutation templates ("Mae'r Rhondda yn gofyn amdanoch", "Mynd i'r Rhondda", "yn Gryf", "i Ddiwylliant", "yn colli", "2 domen", "a Chaerffili"). Replace "pelen gromlin". Strand is "edefyn" and thread is "edau", which a Welsh reader will take as the same word; pick a different word for strand ("nod" or "llinyn"). Give the results column a pinned button so longer Welsh lines do not push it off screen.
- Expected effect: item 14 passes.

**10. Make the peek and the post pay.**
- What to change: the peek costs a pip and returns six words ("Next term: The price of a home"). Show the trend card's place and effect line, and which cards in hand answer it. When a card arrives from the post, show what it did in one line with a strand chip ("Early years first, played 2026: More equal up, sharp") and do not report its effects in slips before it lands. In term 6, mark tickets that will land after 2050 ("for those who come after; counts in Left").
- Expected effect: item 6 passes; the contingency and peek decisions in item 5 become real choices.

If fixes 1, 2, 3, 5 and 6 land I would expect a 7.5. With the rest, an 8 is in reach: the materials are already there.

## Broken, odd or untrustworthy

Bugs
- Title screen language toggle does nothing (`t-cy-title.png`).
- "Bethesda and Dyffryn Ogwen is asking for you. Tourism pays its way is played there this term" appeared when I had played Tourism in South West Wales (term 5, game one).
- Place visits do not remember earlier threads (see fix 1).
- "COST 3 of 1 pips" after other cards are played; "COST 4 of 2 pips"; "of 0 pips".
- "Why 8?" label beside "3 of 11 pips left" after borrowing.
- Opening voice stuck on one line for four terms (see fix 6).
- "Early years first lifted Prosperous" in 2030 while the ticket sat in the post rail until 2038.
- A hidden status line reads "3 of 3 threads placed" for the rest of the game after a visit, in English in both languages. Screen-reader users will hear it.
- Results header reads "2030, Term 1 of 6": the year has moved and the term has not.
- The trend card still says "The signs of a recession. Nothing yet, but it is on the table" two terms after the Recession landed.
- Community-owned energy ("pays out in 1 term", played 2038) arrived in 2046 with no explanation.
- No console errors or failed requests were captured. My listeners were attached only while actions ran, so treat that as "none seen", not "none".

Layout
- Hand does not fit; controls open below the fold; false "1 more ticket below" (see fix 4).
- "To the election" clipped at 1280x800, and at 1440x900 in Welsh.
- Rhondda board: the last column ("Poorest tenth") is cut off at the panel edge, and it is one of the three things the place judges (`g1-38-rhondda.png`).
- Bethesda board: ten markers overlap each other and the place name; six of ten options visible without scrolling; "What the place will judge" is collapsed by default, below the scroll.
- The place result card covers the map and my threads.
- Opening screen: the trend card covers Anglesey; the right half of the screen is empty while the place panel overlaps the map.
- Guide notes sit on top of the thing they describe ("Choose a card, then press Play this card" covers the top ticket) or point at nothing (the "in the post" note points at mid-timeline).
- Atlas with explorer open: the hover tooltip covers three table rows; lens card, legend, place panel and explorer leave a sliver of map (`a-05-explorer.png`).
- Post rail tickets cover the year labels on the timeline.

Copy and meaning
- "Lived: level with 2026. Handed on" uses "Handed on" as the name of a Lived band, on a screen whose other measure is what was handed on.
- "Trust rose" followed by "Your visit was judged poorly"; "Trust fell" followed by "People can see things getting better".
- "People felt things slip" says nothing. Name the strand.
- "No visit was judged well. Go to The Rhondda again" shown to a player who never went.
- "1 pips". "R25, a input-output rule".
- "Because you played Buses and rail that connect" as the reason the Rhondda asks about coal tips. The link from card to visit needs a sentence.
- Unexplained marks: the red dot at the corner of each strand tile after a term, the blue stitched rings that gather on the map, the cross on each strand bar until the fourth note explains it at the end of term 1.
- Standing tickets show "No. 0000" and "COST 0 of 7 pips".
- The share text ("Lived 🟨🟦🟪🟧⬜ / Left 🟩🟪🟧⬛") means nothing to someone who has not played, and carries no link.
- Model book: rule titles cut short ("R29 Land", "R24 Buses", "R12 In a storm"); formula shown as "flood_exposure += size × 2 / 2 (after 0 terms)".

Credibility
- 15 of 35 rules are marked placeholder in the model book. Honest, and good that it says so. But the Bethesda board says "Confidence: low... Option strengths are illustrative" and then grades the player POORLY on them and takes Trust away. Either soften the grade where confidence is low or do not charge Trust for it.
- Source tags: "ONS, WIMD 2025" on a Welsh Government index. The Rhondda board gives ranks "of 1,909" (the 2019 index had 1,909 small areas); the atlas source card says 1917 for WIMD 2025. One of them is wrong.
- Atlas legend labels each colour with a single odd value (64.4%, 49.8%, 35.3%) rather than a range.
- "A heartland falling below half" by 2030, see fix 5.

What already works and should not be touched
- The map at every scale, the ticket design, the PLAYED stamp, the post rail.
- The two place boards as objects: real tips, real schools, bus numbers, WIMD ranks, "the catch" on each Bethesda option.
- "You were ready" (`g1-55-shock.png`).
- Pull the thread as a mechanic, especially when it lists the player's own place choices.
- The end screen's headline sentence, caretaker ghost and "What would you do differently?".
- Voices when they fit: Maerdy; "Dad did his tax return himself. He's eighty-one. He wants everyone to know."
- The atlas: lenses, place panel with ranks and sources, explorer table and scatter (`a-07-scatter.png`).
- The modified-rules badge that follows you into the game and survives a reload (`m-03-game-badge.png`).

## Screenshot index

All in `design/shots-build/playtest-1/`.

| File | Shows |
|---|---|
| `g1-00-title.png`, `t-cy-title.png` | Title; title after clicking Cymraeg (unchanged) |
| `g1-02-after-play.png`, `g1-06-term1-plan.png` | Opening and first hand |
| `g1-10-click-flood.png`, `g1-12-flood-region.png`, `g1-15-three-played.png` | Selecting, playing, three played with post rail |
| `g1-17-ledger.png` | Ledger drawer |
| `g1-20-bethesda.png`, `g1-23-beth-3placed.png`, `g1-25-after-beth.png` | Bethesda board, option detail, POORLY |
| `g1-26-pass-5.png`, `g1-27-thread-resilient.png` | First results; first thread |
| `g1-30-t2-open.png` | Arrival from the post |
| `g1-38-rhondda.png`, `g1-42-rhondda-result.png`, `g1-52-rhondda2.png` | Rhondda board, POORLY, second visit with tips reset |
| `g1-55-shock.png`, `g1-56-t3-changed.png` | You were ready; Maerdy voice; slips not matching tiles |
| `g1-59-cy-plan.png`, `g1-63-cy-rhondda.png`, `g1-69-cy-thread.png` | Cymraeg: hand, Rhondda, thread with clipped button |
| `g1-73-t5-played.png`, `g1-76-t5-changed.png` | The one tight budget term; broken promise |
| `g1-88-letter-open-b.png`, `g1-89-end-scrolled.png` | Letter, Lived and Left, ledger |
| `g2-t1-ledger.png`, `g2-t5-changed.png`, `g2-end.png` | Careless game: borrowing, mid-game, end |
| `s1280-card-selected.png`, `s1280-thread.png` | 1280x800: two tickets visible; clipped election button |
| `a-00-atlas.png`, `a-05-explorer.png`, `a-07-scatter.png` | Atlas, explorer table, scatter |
| `m-01-rule.png`, `m-02-param-changed.png`, `m-03-game-badge.png` | Model book rule, changed parameter, badge in game |
