# Playtest 3: Etifeddiaeth, third look

*Played 27 November 2026 against the build in the clean worktree `deploy3` at commit 828a85f (served with `vite preview`), driven through Playwright. Four sessions: a careful full game at 1440x900 (two Bethesda visits, two Rhondda visits, three shocks, the peek, every thread pulled, the letter, with term 4 played in Cymraeg); a careless full game (a standing ticket every term, three debts, repairs never done, every shock absorbed, no visits); a term in Cymraeg from the title screen at 1280x800 in a fresh browser session; and the atlas, the model book and the new attributions page. Console errors, page errors, failed requests and 4xx responses were captured for the life of every page. I did not read the code. Screenshots are in `design/shots-build/playtest-3/`.*

## Score: 8 out of 10, narrowly

Up from 7.5. It reaches the bar. I am not grading up: the thing that held it at 7.5 last time, slips that contradicted the tickets, is fixed, and the results screen is now the most trustworthy screen in the game. Two new defects sit in the first two minutes and are the reason for "narrowly". Both are small to fix. If they were not there this would be a comfortable 8.

What earned the half point. In the careful game every slip I checked agreed with its ticket and with its thread. "Storm winter (2030 shock) wore down Resilient. You spent 2 pips: a quarter of the hit landed." "Cohesive held, though a tip moving in the storm pulled at it." "A side effect of Pay farms for nature, played 2042: Culture, language down." Skills and apprenticeships, played in 2030, arrived in 2038, lifted Prosperous and was named as the card that made me ready for the Recession: that is the first time a card from the post has made me feel paid. The closing voice now sits on the map and is always on screen, and every one of them matched something I had done (Holywell on waiting lists after Health before hospital; Llanwrtyd Wells on the wet hill after peat in Mid Wales; Maerdy and Tylorstown after the tips; Treherbert on the school and the railway). Bethesda remembers earlier threads ("in place since 2026") and counts them. Arrivals are staged and say so ("First effects of Community-owned energy land now; the rest in 2038"). The careful letter was a different archetype from last time and it stung fairly: "South West Wales. That is where I am writing from. It was never the headline. You made 5 promises out loud and kept 5. People here count." I had played nothing in the South West. The careless game now loses the seat: Trust collapsed in 2038, a caretaker took the term, and the letter said "They took the pen off you in 2038. By then there was little left to write." That is a consequence a player will remember.

What makes it narrow. (1) The new preview row says "If you play Restore upland peat:" and then shows Resilient down about 1 pip and Healthier down, for a card whose ticket says it helps both. For slow cards the preview is showing the term's drift as if the card caused it. (2) After the first guide note, the next two notes and the "Pull any thread" note are drawn underneath the map: invisible, and not clickable. (3) The ticket says "Played, it will take you to Bethesda" and the game twice sent me to the Rhondda instead, once with no card named at all. None of these stops play. The first one is the same kind of problem the slips had, moved to the planning screen.

Console: no errors, page errors or failed requests from the application in any session. The only entry was one 404 at the very start, while the build folder was being recreated by the lead. The listener was checked with a deliberate error at the end.

## The 15-item checklist

Tally: **14 pass, 1 partial, 0 fail.** The bar is 12 including items 1, 4, 7, 11 and 15. All five required items pass. Narrow passes: 3 and 10.

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Touched the map, read a real figure, knew I would be judged from 2050, in 60 seconds | Pass | Unchanged and still good. Powys, 135k people, 16.4% speak Welsh, sources on each. |
| 2 | First card inside two minutes, no paragraph of instructions | Pass | Card played in under a minute. The first note shows; notes two and three are hidden under the map (see fix 2), so I played without them, which says the layout carries it. |
| 3 | Could say what every mark on a ticket means after one term | Pass (narrow) | Helps, "frays", "mixed", cost, delay, "First effects in 1 term, the rest in 2 terms", partners and upkeep are all on the ticket or the new card sheet, which shows the full prose at 1440x900 and 1280x800 (`g1-03-sheet.png`, `s1280-cy-ticket.png`). Narrow because the preview chips above contradict the ticket for slow cards, and "hands on less" and "hands on more" are new terms the player has to work out. |
| 4 | Stared at the hand because I wanted three and could afford two | Pass | Term 2: five cards, three slots, a Healthier promise, 10 pips and a downturn peeked. Term 3: a Resilient promise, a recession coming, and three cards that each opened a place. Term 5: 6 pips, four slots, a Cohesive promise. |
| 5 | Held back contingency and regretted holding or not holding | Pass | Held 3, 3 and 3; spent 2, 1 and 2. The slip now tells me what the pips bought ("a quarter of the hit landed"), so the decision closes. In the careless game the slip says "You spent nothing: all of the hit landed." |
| 6 | A forgotten card arrived from the post and I felt paid or cheated | Pass | Skills and apprenticeships: played 2030, arrived 2038, "lifted Prosperous", and "YOU WERE READY: Skills and apprenticeships softened the hit" on the Recession. Homes for locals arrived and lifted Culture the same term. Staged arrivals are explained. Arrivals still list strands without direction, but the slip that follows does the job. |
| 7 | Pulled a thread from a strand to my own card and a named source, and it made sense | Pass | Every thread opened was the slip's own cause this time, eight for eight. The tip-moving thread goes to a named rule, marked placeholder, with BGS as the source. |
| 8 | Something I did not intend happened and the game showed why | Pass | "Cohesive held, though a tip moving in the storm pulled at it" with the rule behind it; Pay farms for nature costing Culture in the term I had promised Cohesive; the uneven-hand letter. |
| 9 | Trust stopped me, and I understood what had cost me the Trust | Pass | Careless game: Collapsed in 2038, "From the opposition benches", a term lost to the caretaker, reasons "Interest on the debt is showing" and "The worst-off places fell further behind" (`g2-opposition.png`). Unmissable. |
| 10 | Went to the Rhondda or Bethesda, found it hard, could defend my choice, could not tell what the game wanted | Pass (narrow) | Both boards are hard and my choices were defensible. Narrow for three reasons: two of three Bethesda tests held in 10 runs in 10 and the stamp was still ADEQUATELY, the same as not going; the Rhondda has never graded above WELL; and which place asks for you does not follow what the ticket says. |
| 11 | A voice or the letter named something specific I did, and it stung or pleased | Pass | Five gated voices and both letters, as above. No voice described a choice I had not made. |
| 12 | Understood on the end screen why the result was the lower of Lived and Left | Pass | "Lived: about 1 pip down... Left: about 5 pips up. Your result is the lower: Lived, Handed on." The prompt now fits: "Your years were the weak side. Which visible card would have bought the room to do slow things?" |
| 13 | Never saw a pound sign, a decimal or false precision, and could tell sharp from fuzzy | Pass | None in the game. The sharp and fuzzy key sits under the results header. |
| 14 | Switched to Cymraeg mid-game and nothing broke, went missing or read like a translation | Partial | Close now. Long titles truncate cleanly with the cost in place; the card sheet carries the prose; results and the election button fit at 1280x800; voices read naturally ("Mae'r gwyddau'n ei hoffi. Does neb arall dw i'n ei nabod yn ei hoffi."). Still: the "trosglwyddo mwy" chip is cut off inside the strand tile and "Llewyrc..." is cut in the tile header; "Fe wariwch 2 bip" should be past tense; "1 pip bob 2 tymor"; "2 o'r 2 tomen"; "Mae'n bathu atebolrwydd". It wants one read by a Welsh speaker, then it passes. |
| 15 | Wanted to play again and knew what I would do differently | Pass | "The uneven hand", letters 1 of 6. I know exactly what I would change: play something visible early and put a card in the South West. |

## Playtest 2 fixes: status now

| # | Fix from playtest 2 | Status | What I saw |
|---|---|---|---|
| 1 | Slips agree with tickets, threads and the post | Resolved, with two leftovers | No card credited before arrival; side effects named as side effects; shock slips carry the response; each thread link opens its own cause; tickets now print every strand they move. Leftovers: the same filler slip ("Culture, language held, though The price of a home, since 2030 pulled at it") appeared in seven of the eleven terms I played, once beside a slip saying Culture was down 1 pip; and in the careless game the 2034 Recession was "You spent nothing: all of the hit landed" in 2038 and "You spent 2 pips: a quarter of the hit landed" in 2042. |
| 2a | Bethesda counts earlier threads | Resolved | "in place since 2026" on the rows, and "Already in place from an earlier visit, and counted". |
| 2b | "Back to Wales" on screen | Resolved | In view on both visits (`g1-07-beth-result.png`). The ADEQUATELY stamp box is oversized and sits on the first line. |
| 2c | A higher grade to aim at | Not resolved | Rhondda still tops out at WELL with all three tests held; Bethesda with two of three held is ADEQUATELY. |
| 3 | Results column fits; voice always seen | Resolved | Voice on the map, Trust panel whole, at 1440x900 and 1280x800, both languages. |
| 4 | Ticket delay and post arrival agree | Resolved | "First effects in 1 term, the rest in 2 terms" on the ticket; "in full now; its first effects came in 2034" on arrival. |
| 5a | No repeated hands | Mostly | No hand was dealt twice. Cards still come round again (four of term 5's five had been in my hand before), and the term 6 hand was five cards that all land after 2050. |
| 5b | No repeated voices | Resolved | No voice repeated in either game. |
| 6 | Tray prose survives a laptop screen | Resolved | The card sheet over the map shows description, catch and place line at both sizes. |
| 7 | Preview chips labelled and placed | Partly | They now sit inside the strand tiles under "If you play X:", and nothing overlaps. But the content is wrong for slow cards (fix 1 below), the label stays up after the card is played, and the chip text is cut off in Welsh. |
| 8a | Voices gated on what the player did | Resolved | Every voice fitted. |
| 8b | Letter and prompts fit a clean game | Resolved | Promises counted in the letter; prompt matches the weak side. |
| 8c | "Worst term" wording | Resolved in effect | This time the worst term really was below 2026 and the screen said so. |
| 8d | "Keep for next term" in term 6 | Resolved | Gone. |
| 8e | Map rings explained | Resolved | "Your work: each ring marks where a card landed", with a hide link. A ring appears at Bangor in term 1 of every game whatever was played. |
| 8f | Rhondda "Poorest tenth" column on screen | Resolved | Rotated headers; all five columns fit (`g1-t2-rhondda.png`). |
| 8g | "COST 4 of 1 pips" | Resolved | Now "COST 1 pips": right number, wrong plural. |
| 8h | "Why 8?" and stale "In play this term" | Not rechecked | |
| Polish | Atlas legend ranges, explorer layout, full rule names, attributions page | Resolved | Legend reads "52.7% to 64.4%"; the tooltip no longer covers the table (`a-01-explorer.png`); rule titles are whole; the attributions page lists every dataset with licence, required wording and "Where this was checked", and is honest that one coal tips table has no confirmed licence. The footer link says "Sources and licences" and the page is titled "Attributions and licences". |

## Remaining fixes, in order of effect

### 1. The preview must show what the card does, not what the term does (quick; do this first)

- What is wrong: "If you play Restore upland peat: Prosperous down, hands on less; Resilient down, about 1 pip; Healthier down, under a pip; Culture, language down, under a pip; Global up, hands on more." The ticket beside it says Resilient and Healthier are helped. Welsh-medium childcare, Warm homes, Plant woodland, Early years first and Health before hospital all show the same pattern, and in term 6 every card in the hand showed "Prosperous down, about 1 pip; Cohesive down, about 1 pip". Fast cards preview correctly (Land a big employer: Prosperous up about 2, Global down about 1; Homes for locals: Culture up about 1). So for cards with little effect this term, the row is showing baseline drift, or the noise between two sets of runs, under a label that blames the card.
- Why it matters: it is on screen from the first click, and it tells a careful reader that peat makes floods worse. It undoes, at the planning step, the trust the slips have just earned.
- What to change: compute the preview as the difference between "with this card" and "without it" on the same random draws, and show only strands where that difference is real. For a card that does nothing this term, say so: "Nothing this term. Lands 2034: Resilient, Healthier." Rename "hands on less" and "hands on more" to "leaves less" and "leaves more", or mark them with the cross the bar already uses. Clear the label once the card is played.

### 2. Guide notes two, three and "Pull any thread" are under the map (quick; regression)

- What is wrong: in three separate sessions, "This card needs a region. The map lights the four.", "Open a ticket, then play it, or choose where it goes." and "Pull any thread to see why it moved." were positioned over the map but drawn beneath it. They cannot be seen or clicked. Notes one, four, five, six and the Trust note show normally.
- What to change: the notes anchored to the tray and to the slips need to sit above the map stage, as the first note does. Check all eight in both languages at both sizes.

### 3. Make the place invitation do what the ticket says (quick)

- What is wrong: term 2, I played Community-owned energy in the North ("Played, it will take you to Bethesda") and nothing in the South East. The invitation read "The Rhondda is asking for you." with no card named, and the board had no "Because you played" line (`g1-t2-invite-no-card.png`). Term 3, I played two Bethesda cards and one Rhondda card and was sent to the Rhondda; declining it did not offer Bethesda.
- What to change: if a ticket promises a place, either honour it or say on the ticket "may take you to". When two places qualify, let the player choose. Never show an invitation without its reason.

### 4. Give a good visit a better stamp than staying away (quick)

- What is wrong: Bethesda, first visit: "Young people can stay: it held in 10 runs in 10", "Welsh as the street language held in 10 runs in 10", one test missed, stamp ADEQUATELY, and Trust fell that term. That is the same stamp as folding back without playing. On the second visit, with six threads in place, "Young people can stay" dropped to 4 runs in 10 because "one Homes thread is not enough", which the board had not said beforehand.
- What to change: none held, poorly or adequately; one, adequately; two, well; three, very well. Show term conditions like "one Homes thread is not enough" on the board before the player chooses.

### 5. Say what happened to the promise, every term (quick)

- What is wrong: I kept five promises in the careful game. The Trust panel mentioned a promise in none of the five terms; it shows two reasons and the promise was never one of them. The ledger and the letter had them right.
- What to change: the promise result is always the first Trust line in a term with a promise ("for: You kept your promise on Resilient").

### 6. Retire the filler slip and fix the two slip contradictions (quick)

- Drop "X held, though Y pulled at it" when the same pair was shown last term, and never show it beside a slip saying X moved. Its arrow points down while its text says "held".
- The caretaker term re-reported the 2034 Recession with "You spent 2 pips" after the previous term had said "You spent nothing". Report a shock's response once, in the term it landed.
- "More equal is recovering from Buses and rail that connect" reads as if the buses were the injury.

### 7. A last hand with one thing that lands in time (quick)

- Term 6 offered five cards that all land after 2050. Thematically right, but there is no choice between a quick win and a gift, which is the choice the final term should be about. Guarantee at least one card that pays this term or next.

### 8. Small copy and layout

- "COST 1 pips"; "1 pip, every 2 term"; "though A tip moving"; "Welsh-medium childcare and Community-owned energy is delivered there"; "The loans from 2026 are still on the books: 3 of them" (they were 2026, 2034 and 2042).
- "Trust: Collapsed, 0 cards next term" then "2 cards this term" on the opposition benches. One term on the benches took Trust from Collapsed straight to Fair, which is generous.
- "Needs partners" is still said twice in two wordings on the same sheet.
- Arrived tickets pile up on the timeline at the current year (`g1-t4-cy-hand.png`).
- Welsh items listed under 14.
- Footer link and page title for the attributions page differ.

## Bugs

- Preview row attributes the term's drift to slow cards (fix 1).
- Three guide notes drawn under the map, invisible and unclickable (fix 2).
- Rhondda invitation with no card and no reason; ticket place promise not honoured (fix 3).
- Shock response reported two ways across terms in the careless game.
- "Held" slip with a down arrow; "held" and "down 1 pip" for the same strand in one term.
- Promise result missing from Trust reasons.
- Ring at Bangor in term 1 regardless of cards played.
- Welsh: preview chip and one strand name cut off inside the tiles.
- One 404 in the console log belongs to the moment the build folder was being rebuilt, not to the application.

## What works now and should not be touched

- The results screen as a whole: slips, key, Trust panel, voice on the map, pinned button.
- The shock slip with its response line, and "A card had made you ready."
- Staged arrivals, on the ticket and on arrival.
- The card sheet.
- "From the opposition benches", and "They took the pen off you in 2038."
- "You made 5 promises out loud and kept 5. People here count."
- Bethesda's "in place since 2026" and the Rhondda's rotated column headers.
- The attributions page, including its admission about the coal tips table.
- The atlas legend ranges and explorer layout.

## Screenshot index

All in `design/shots-build/playtest-3/`.

| File | Shows |
|---|---|
| `g1-00-title.png` | Title |
| `g1-03-sheet.png`, `g1-04-played.png` | Card sheet; preview row blaming peat for Resilient falling; two notes hidden under the map |
| `g1-07-beth-result.png`, `g1-08-t1-changed.png` | Bethesda, two tests held, ADEQUATELY; fitted results with voice and ring key |
| `g1-t2-invite-no-card.png`, `g1-t2-rhondda.png`, `g1-t2-rhondda-result.png` | Rhondda invitation with no card; board with all columns; WELL |
| `g1-t2-shock.png`, `g1-t2-changed.png` | Storm winter; slip with "You spent 2 pips: a quarter of the hit landed" |
| `g1-t3-hand.png` | Term 3 hand |
| `g1-t4-cy-hand.png`, `g1-t4-cy-rhondda-result.png`, `g1-t4-cy-changed.png`, `g1-t4-cy-thread.png` | Cymraeg mid-game: hand with truncated titles, Rhondda result, results, thread |
| `g1-t5-beth2.png`, `g1-t5-beth2-result.png`, `g1-t5-changed.png` | Bethesda remembers; second result; "held" beside "down" |
| `g1-t6-hand.png`, `g1-letter.png` | Last hand, all after 2050; The uneven hand |
| `g2-opposition.png`, `g2-t4-after.png`, `g2-t6-changed.png`, `g2-letter.png` | Careless game: opposition benches, caretaker term, final results, The hollow years |
| `s1280-cy-title.png`, `s1280-cy-ticket.png`, `s1280-cy-changed.png`, `s1280-cy-thread.png` | 1280x800 in Cymraeg from the title |
| `src-00.png`, `m-00-contents.png`, `a-01-explorer.png` | Attributions page; model book contents; atlas explorer with legend ranges |
