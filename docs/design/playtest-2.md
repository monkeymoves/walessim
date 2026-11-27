# Playtest 2: Etifeddiaeth, second look

*Played 27 November 2026 against the build in the clean worktree at commit dd4c772 (served with `vite preview`), driven through Playwright. Four sessions: a careful full game at 1440x900 (seed 60116716, both places, five visits, three shocks, the peek, the ledger, every thread pulled, the letter, with term 4 played in Cymraeg); a careless full game (a standing ticket every term, three debts, three rounds of repairs never done, every shock absorbed, no visits); a term in Cymraeg from the title screen at 1280x800; and a look at the atlas and the model book. Console errors, page errors, failed requests and 4xx responses were captured for the whole life of every page this time. I read the screen after every step. I did not read the code while playing; I looked at two engine functions afterwards only to point fixes at the right place. Screenshots are in `design/shots-build/playtest-2/`.*

## Score: 7.5 out of 10

Up from 6. It is now a game I would hand to someone without apologising first, which was not true yesterday. It passes the checklist bar. It does not quite reach 8, and the gap is one specific thing plus some layout.

What changed my mind. The place visits explain themselves: "Exposure held: your tips cover about 6 in 10 of the homes below the tips, weighted by risk; this visit needed 4 in 10." A thoughtful Bethesda visit that misses two tests is ADEQUATELY, the same as staying away, and costs no Trust. Tips I made safe in 2026 were still safe in 2038 and had dropped a risk step. The letter named what I did: "Maerdy Spoil Tips is grass now. Somebody chose it, and I know it was you." The careless game now ends somewhere else entirely: Trust went Fair, Thin, Collapsed; the result was Diminished, about 9 pips down and 5 behind the caretaker; and the letter said "In 2026 you borrowed. I would like to see the receipt." My careful game finished 3 pips ahead of the caretaker with Trust at Strong from term 2. Those two games felt like two different countries, which was the main complaint last time. The five-card hand fits. The thread panel reads like English. Cymraeg works from the title screen. The peek tells you something. "Why 6?" answers the question.

What keeps it at 7.5. The "What changed" slips, which are the heart of the loop, still cannot be fully trusted. In one careful game I saw: a card "lifting" a strand three times before it had arrived from the post; a slip saying Welsh-medium childcare lifted Cohesive when the ticket says it frays Cohesive; "Storm winter lifted Resilient"; a slip blaming Warm homes for a fall where the thread behind it blamed Welsh-medium childcare; two "Pull the thread" links that opened a thread about a different card; and two cards that arrived a term later than the ticket said with no reason given. None of this crashes, and a casual player will skate over half of it, but Luke will read the slips closely and the first contradiction between a ticket face and a slip costs the model its authority. Add a Bethesda board that draws my earlier threads as stitched and then tells me "Homes came from none of your threads", a results column where the closing voice sits below the fold in most terms, and a deck that dealt me the same five cards in terms 2 and 6, and it is a strong 7.5, not an 8.

No console errors, page errors, failed requests or 4xx responses in the whole session (the listener was checked with a deliberate `console.error` at the end and caught it).

## The 15-item checklist

Tally: **13 pass, 2 partial, 0 fail.** The bar is 12 including items 1, 4, 7, 11 and 15. All five required items pass, and 4, 7 and 11 now pass without the word "narrow". **The build passes the checklist.** Three passes (3, 8, 13) are narrow; on the strictest reading of item 8 the tally is 12, which still passes.

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Touched the map, read a real figure, knew I would be judged from 2050, in 60 seconds | Pass | The title line is unchanged and still lands. Clicking the map on the title screen now works: it opened the atlas with Powys selected, 135,000 people, 16.4% speak Welsh, each with a source tag (`t-map-click.png`). In the game, "Point at a place you know" does the same before "Take the seat". |
| 2 | First card inside two minutes, no paragraph of instructions | Pass | One-line notes, a fixed tray under the hand with the region buttons, card played in well under a minute (`g1-04-ticket-open.png`). One note says "press Play this card" for a card that has no such button (choosing a region plays it). |
| 3 | Could say what every mark on a ticket means after one term | Pass (narrow) | Helps, "frays X" in italics, "Prosperous, mixed", cost "of 8 left", delay, and "Needs partners: half strength unless a regional compact is in force there, or the place visit goes well" are all on the selected ticket or in the tray (`g1-25-skills.png`, `g1-24-employer.png`). Regional compact now has a sentence. Narrow because the tray drops the plain description line when a card has three notes, and at 1280x800 it drops all the prose and shows chips only (`s1280-hand5-open.png`). |
| 4 | Stared at the hand because I wanted three and could afford two | Pass | Term 2: five cards, three slots, 8 pips after the peek, a Resilient promise with one slow Resilient card in hand, and the peek saying Skills answers the downturn. Term 3: a Culture promise and a card that frays Culture. Term 5: 6 pips, and every card but the 4-pip one lands after 2050. Three real dilemmas in six terms (`g1-22-t2-hand.png`, `g1-57-t5-hand.png`). |
| 5 | Held back contingency and regretted holding or not holding | Pass | Careful game: held 2, 2 and 3 and spent them on Buying rush, Storm winter and Recession; each time it cost me a card I wanted. Careless game: held nothing in term 5 and Buying rush landed on Culture. The shock card says what a pip buys ("One pip halves it. Two pips quarter it"). It does not say which strand is about to be hit, and the slip afterwards does not say what my pips saved. |
| 6 | A forgotten card arrived from the post and I felt paid or cheated | Partial | Arrivals are announced with the region and strands ("Homes for locals arrives in North Wales working on Cohesive and Culture, language", `g1-20-t2.png`) and rings appear on the map. But the arrival still shows no result, the same cards had already been credited in slips before they arrived, and Warm homes (ticket: 2 terms) and Community-owned energy (ticket: 1 term) each arrived a term late with no explanation. I felt confused, not paid or cheated. |
| 7 | Pulled a thread from a strand to my own card and a named source, and it made sense | Pass | More equal, 4 to 6 pips: Make coal tips safe No. 0520, "a strong push, fuzzy", The Rhondda graded well, my three tips by name, Welsh Government, drawn through Bridgend, Rhondda Cynon Taf and Caerphilly (`g1-34-thread-equal.png`). No rule codes, no ranges, no decimals. "How this is worked out" opens the rule in the model book and Back returns to the game intact. |
| 8 | Something I did not intend happened and the game showed why | Pass (narrow) | Pay farms for nature wore down Culture; Put off the repairs wore down Cohesive; each shock now has its own dark slip with a thread. Narrow because the slip tagged "Unexpected" was usually a card doing something its ticket does not show, or the opposite of what it shows, with a thread that says only "Carried directly by the card's own effect". |
| 9 | Trust stopped me, and I understood what had cost me the Trust | Pass | Careless game: Trust Thin from 2038, two cards a term, then Collapsed. Reasons with a sign: "against: Interest on the debt is showing", "against: Repairs put off are still not done", "against: The worst-off places fell further behind". Clear. "People felt things slip" is still there and still says nothing. In the careful game Trust never stopped me, which is right. |
| 10 | Went to the Rhondda or Bethesda, found it hard, could defend my choice, could not tell what the game wanted | Pass | First Rhondda visit: 17 tips, 3 threads, three tests, and I chose on homes, the railway and the poorest tenth and could say why (`g1-13-rhondda-result.png`). Bethesda: homes, work and Welsh, or the river and the visitors; I could not cover all of it and still do not know the right three (`g1-31-beth-result.png`). Loses something on repeat: by the third Rhondda visit any three tips pass everything, and the grade never rises above WELL even at "9 in 10" with all three tests held. |
| 11 | A voice or the letter named something specific I did, and it stung or pleased | Pass | Maerdy, 2030, after I stitched Maerdy Spoil Tips. Treherbert, 2042: "Someone looked at where the school is, and where the railway is, and did those first." Neath, 2046, on the pylons after Grid and big renewables in the South West. Aberystwyth, 2050: "She came home from the cylch correcting my mutations. I'll take that." And the letter. Against it: Deiniolen 2034 spoke of chapel flats and lorries, neither of which I chose; Rhyl 2038 praised a wall I never built. |
| 12 | Understood on the end screen why the result was the lower of Lived and Left | Pass | "Lived: about 2 pips up on what you inherited. Left: level with 2026. Your result is the lower: Left, Handed on." Outlined box, caretaker line, per-term bars (`g1-66-letter.png`). "Handed on" as a band name still muddles with the verb, and the letter footer calls the same result "Held steady". |
| 13 | Never saw a pound sign, a decimal or false precision, and could tell sharp from fuzzy | Pass (narrow) | In the game: none. Every slip carries a diamond "sharp" or bars "fuzzy" with a legend, and the thread says "a push, fuzzy". Visits say "4 runs in 10, against 6 needed". Narrow because the model book formula still reads `infrastructure_condition += inflow × 1 / 1` and the dials show 0.200, though that is the place for numbers. |
| 14 | Switched to Cymraeg mid-game and nothing broke, went missing or read like a translation | Partial | Much better. The title toggle works and carries into the game. "Mae'r Rhondda yn gofyn amdanoch", "Mynd i'r Rhondda", "i Fethesda", "Gadewch i Lewyrchus gwympo", "ddwy domen", "3 phip", PRIS and Rhif on tickets, the election button pinned at 900 and 800 high (`g1-51-cy-rhondda.png`, `s1280-cy-thread.png`). The slips sidestep mutation neatly ("Syrthiodd Cydnerth. Achos: ..."). Still: long Welsh titles push the cost digit off the compact ticket row; the tray loses its description line; "Various" untranslated in source tags; "Drwy Gwaith", "yn gweithio ar Cydnerth", "2 o'r 2 tomen"; "Mae'n bathu atebolrwydd" is a literal rendering; strand is still "edefyn" beside thread "edau"; last two Rhondda columns cut off. |
| 15 | Wanted to play again and knew what I would do differently | Pass | "Letters received: 1 of 6", "Held steady", and a letter that ends "Next one, want something." I want a better letter, I want to solve Bethesda, and I know I would plant slow cards in term 1. Tempered by the deck: terms 5 and 6 dealt me the same cards as terms 1 and 2. |

## Playtest 1 fixes: status now

| # | Fix from playtest 1 | Status | What I saw |
|---|---|---|---|
| 1a | Visit result explains each test in terms of my threads | Resolved | One plain line per test with the numbers and the thread named. Bethesda's lines are long and repeat full option names three times. |
| 1b | A thoughtful visit is never worse than staying away; two-thread visit winnable | Resolved | Bethesda with one test held: ADEQUATELY. Rhondda with two threads in 2038: WELL, "this visit needed 3 in 10". |
| 1c | Stitched threads persist | Partly | Rhondda: yes, "made safe 2026", risk drops a step, and they count ("Already made safe on an earlier visit, and counted"). Bethesda: earlier threads are drawn as stitched on the map but do not count; the second visit said "Homes came from none of your threads" and Welsh held in 0 runs in 10 after I had stitched homes and Welsh-medium early years the term before. |
| 1d | Test names consistent | Resolved | Exposure, Fairness, Lifelines; Young people can stay, Welsh as the street language, What the valley can carry. One doubled label: "Young people can stay: Young adults can stay: it needs...". |
| 1e | Invitation reworded | Resolved | "Your threads decide how well it lands... If you stay, it is delivered as planned, without your threads." Grammar slip with two cards: "Welsh-medium childcare and Tourism pays its way is delivered there". |
| 2 | Letter names things and matches the band | Resolved | Careful: Maerdy Spoil Tips, the Rhondda visit, 2030. Careless: the 2026 debt, the 2030 repairs. Tone matched the band both times. It could still use more of the ledger: five promises kept out of five and three debts were not mentioned. |
| 3a | Slips account for every pip that moved | Partly | Shocks get slips. Most moved strands get one. But slips still appear for strands that did not move, omit the pip count when they do, and in term 1 the card I had just delivered WELL got no slip while a card still in the post did. |
| 3b | "Unexpected" only for effects not on a played ticket | Partly | It now marks effects the ticket does not print. That exposes the real problem: tickets do not print several things the cards do (Make coal tips safe lifts More equal by 2 pips; Warm homes moves Prosperous and Cohesive). |
| 3c | Trust reasons carry a sign | Resolved | "for:" and "against:" with up and down marks. "People felt things slip" remains vague. Kept promises are sometimes listed and sometimes not. |
| 3d | Debt and repairs visible and biting | Resolved | Trust Thin by term 3 and Collapsed by 2050 with named reasons; "Why 6?" itemises Budget, Shock last term, Contingency carried, Upkeep owed; the Ledger button shows a dot. Not struck-out pips on the row, but good enough. |
| 4 | Hand fits; fixed tray for controls; pinned action button | Resolved | Five compact rows at 900 and at 800 high, tray above the pips, "To the election" pinned in both languages. New problems: tray text clipped (see fixes), results column overflow hides the voice. |
| 5 | Term 1 protected from a Trust band drop | Resolved | Trust "fell" in term 1 of two games and the band stayed Fair. The heartland threshold slip no longer appears in term 1. |
| 6a | Opening voice not repeated | Partly | Terms 2, 3 and 4 opened with different voices tied to the promise ("Promise us the sea stays on its own side of the road"). Abergavenny's "Tell us the one thing" then opened both 2042 and 2046. |
| 6b | Pledge varies | Resolved | Resilient, Culture, Prosperous, Cohesive, Resilient. |
| 6c | Shocks vary | Resolved | Buying rush, Storm winter, Recession; then Recession, Buying rush, Office layoffs. |
| 7 | Ticket face cleaned up | Mostly | "frays X", "mixed", description, partners line, compact line, "National or region" on the edge, "Lands after 2050" note, PRIS and Rhif in Welsh, no Ddoe line. Still: "COST 4 of 1 pips" on played tickets once the term has passed; "Needs partners" said twice in two wordings; "Half strength while skills are below 4" (below 4 what, shown where?); "The walls need their upkeep" and "The buses run only on some days" printed in the tray of an unplayed card. |
| 8 | Workings out of the thread panel | Resolved | Plain words, sharp and fuzzy marks, a link to the model book. No "to check" tags seen. "Card or curveball" is still the heading for a trend. |
| 9 | Cymraeg at the door and the seams | Mostly | See item 14. |
| 10a | Peek pays | Resolved | "Next term: Downturn ahead. All of Wales. In your hand, these answer it: Skills and apprenticeships." It then recommended a card that pays out in two terms for a trend arriving next term, which is not much of an answer. |
| 10b | Arrival shows what the card did; no effects before landing | Not resolved | Arrival lists strands with no direction or size. Warm homes, played 2026 and in the post until 2038, "lifted Prosperous" in 2030, "lifted Cohesive" in 2034 and "wore down Prosperous" in 2038. Skills, played 2046 and marked "lands 2054", "lifted More equal" in 2050. |
| 10c | Mark tickets that land after 2050 | Resolved | "Lands after 2050: it will not help your years, but it counts in Left for those who come after." Good line. |

Playtest 1 bugs, one line each. Title toggle dead: fixed. Bethesda invitation naming a card played elsewhere: not seen again. "COST 3 of 1 pips": still there after the term passes. "Why 8?" beside 3 of 11: fixed, now a real breakdown. Hidden "3 of 3 threads placed" status: still present after a visit, now translated. "2030, Term 1 of 6": fixed ("Term 1 of 6, done"). Trend card stale after its shock: not checked. Community-owned energy a term late: still there. Rhondda last column cut off: still there. Bethesda markers overlapping: fixed by zooming when an option is opened; the first view still overlaps. Result card covering the map: fixed. Trend card covering Anglesey: still there. Post rail tickets covering year labels: still there. "No visit was judged well" to a player who never went: fixed ("You never went to a place. Next time, go..."). Share text with no link: now has a link, but it is about 5,000 characters of encoded game log. "of 1,909" against WIMD 2025: the board now says "WIMD 2019 rank 415 of 1,909", consistent. "ONS, WIMD 2025" tag in the atlas: still there. Atlas legend single values and tooltip over table rows: unchanged. Model book short titles ("R29 Land", "R24 Buses") and `× 1 / 1` formulas: unchanged.

## What stands between this and 8, in order of effect

### 1. Make the slips tell the truth the tickets tell (bigger; worth the half point on its own)

- What is wrong, with examples from one game. (a) Cards act before they arrive: Warm homes, in the post until 2038, was the named cause of slips in 2030, 2034 and 2038. (b) Slips contradict ticket faces: Welsh-medium childcare "lifted Cohesive" (ticket: frays Cohesive); Build social homes caused More equal to fall (ticket: helps More equal); Make coal tips safe lifted More equal by 2 pips (ticket: Prosperous, Healthier, Cohesive). (c) Shocks "lift": "Storm winter (2034 shock) lifted Resilient", "Recession lifted More equal", "Buying rush lifted Culture". (d) Slip and thread disagree: the 2038 slip said "Warm homes, played 2026 wore down Prosperous"; its thread said Welsh-medium childcare did it. (e) The third and fourth "Pull the thread" links in 2034 both opened a thread about Make coal tips safe, not the slip's own cause. (f) Slips for strands that "stayed at 6 pips", and slips with an arrow and no pip count. (g) Spending two pips on a shock is never acknowledged.
- Why it matters: this is the loop. A player who catches one of these stops believing the rest, and this particular player built the model.
- What to change. In the slip chooser in `src/engine/game.ts` (the block around the "one unexpected slip" comment): pick strands whose pip count changed first, and say "held at 6" in a quieter style if a no-change strand is shown at all. Name the side effect when the cause is one: "the building work for Warm homes lifted Prosperous for a while", not "Warm homes lifted Prosperous"; reserve "X lifted Y" for the card's printed, landed effects. Word recovery after a shock as recovery ("Resilient is recovering from Storm winter"). Pass the slip's own cause to the thread panel so each link opens its own thread, and build the slip sentence and the thread from the same record so they cannot disagree. On the shock slip add the response: "You spent 2 pips: a quarter of the hit landed." Then either print every strand a card moves on its ticket, or cut the unprinted effects from `model/cards.yaml`; the "Unexpected" tag should be rare.
- Size: a day. It touches slip choice, wording and two card files, not the model.

### 2. Bethesda: count earlier threads, and keep the way out on screen (quick win)

- What is wrong: second visit, 2034. The map showed my three 2030 threads as stitched. I added the river, park and ride and the levy trust to complete the set. Result: "Young people can stay did not hold: 0 runs in 10... Homes came from none of your threads." The Rhondda counts earlier work and says so; Bethesda does not. Separately, on both Bethesda visits the "Back to Wales" button was 38 pixels below the bottom of the screen inside a card that scrolls with no visible scrollbar (`g1-31-beth-result.png`).
- What to change: in `src/engine/places.ts`, carry Bethesda threads forward the way Rhondda's "made safe" tips are, and add the same closing line ("Already in place from an earlier visit, and counted: ..."). Mark already-stitched options in the table rows as the Rhondda does. In the result card, pin "Back to Wales" outside the scrolling part, and shorten the test lines by referring to options by number and short name. While there: let three held tests with wide margins read VERY WELL, so a third visit has something to aim at.

### 3. Fit the results column so the voice is always seen (quick win)

- What is wrong: with four slips, the Trust panel is cut mid-line and the closing voice is below the fold of a scroll area with no visible scrollbar, at 1440x900 and at 1280x800 (`g1-43-t3-changed.png`). The voices are the best writing in the game and I only read most of them because my script dumped the text.
- What to change: put the voice directly under the "What changed" header, above the slips; or cap at three slips and fold the "Unexpected" one into them; keep the Trust panel whole. Same treatment for the "A promise is asked" voice, which is already well placed.

### 4. Say when a card will really land (quick win)

- What is wrong: the ticket shows the card's headline delay; the post uses the longest delay of any effect. So Warm homes ("PAYS OUT IN 2") sat at 2034 on the rail while I planned, jumped to 2038 when the term passed, and arrived in 2038. Community-owned energy ("PAYS OUT IN 1") arrived two terms later.
- What to change: one rule for both. Either the ticket shows the arrival the post will use, or the ticket says "first effects in 1, in full in 2" and the rail marks both. If "needs partners" or low skills is what delays it, say so on arrival: "Community-owned energy arrives a term late: no compact in the South West."

### 5. Stop the deck and the voice pool repeating inside one game (quick win)

- What is wrong: term 5 dealt four of term 1's cards; term 6 dealt term 2's five cards exactly, most of them now marked "lands after 2050". Abergavenny opened 2042 and 2046 with the same line. A third identical Rhondda board in 2042 was a formality.
- What to change: in `src/engine/deck.ts`, when the deck is exhausted reshuffle with the seed rather than replaying the order, and in term 6 prefer cards that pay this term or next so the last hand is a real choice between a quick win and a gift to 2054. Never reuse a voice in a game (track used ids in `voices.ts` for opening voices as well as closing ones). On a third visit to the same place, raise the stakes: fewer threads, or a new test.

### 6. Tray and ticket text that survives a laptop screen (quick win)

- What is wrong: at 1280x800 the tray shows the title, region buttons and chips and none of the prose (`s1280-hand5-open.png`), and the selected ticket does not expand. At 1440x900 with five cards the description line is dropped when a card has three notes. Descenders are clipped on two-line descriptions. In Welsh, "Ynni dan berchnogaeth gymunedol" pushes its cost off the row.
- What to change: let the tray grow upward into the empty space under the hand (there are 80 to 200 pixels free in every screenshot); drop the duplicate "Needs partners" line and the failure captions for unplayed cards to make room; truncate long ticket titles with the cost in a fixed-width column.

### 7. Label or move the preview chips (quick win)

- What is wrong: dashed chips ("about 1 pip", "under a pip") appear under the strand row when a ticket is hovered or selected. They are useful once understood, but they are unlabelled, the right-most one sits on top of "Your hand" and "You promised Resilient", and one floats above the ledger drawer (`g1-03-term1.png`, `g1-09-ledger.png`, `g2-t5-plan.png`).
- What to change: prefix the row with "If played:"; keep the chips inside the strand tiles or directly beneath them within the map column; hide them when the drawer is open. Skills and apprenticeships shows no chips at all, which reads as "does nothing".

### 8. Smaller things that each cost a little trust

- Voices that describe a choice I did not make (Deiniolen chapel flats and lorries; Rhyl sea wall). Gate each on the thread or card it names.
- A careful game with five promises kept, no debt and Trust at Strong for five terms drew "Fair enough. Not a bad hand to have played." and "The 2050 generation paid for your years" in the prompts, with Left level with 2026 and four slow cards in the post. Count promises kept and cards in the post in the letter and soften that prompt when Left is not down.
- "Worst term: 2030" and "2030 was the one with the long faces" for a term in which nothing fell and Trust rose. If no term fell below 2026, say "weakest" or say nothing.
- "Handed on" (band) and "Held steady" (letter) are two names for one result on the same screen.
- "Keep for next term" is offered in term 6.
- The blue rings that gather on the map are never explained and by 2050 cover Wales. A one-line legend, or fade those older than two terms.
- The thread panel covers the left end of its own thread on the map; the "Next thread" button is cut off at the bottom when a thread lists place choices.
- "Because you played Buses and rail that connect" still leads to a board about coal tips with no linking sentence.
- "What the place will judge" is below the scroll on both boards; the Rhondda's "Poorest tenth" column, one of the three things judged, is still off the edge of the panel.
- "Budget 8" as the whole answer to "Why 8?" in a term with nothing to itemise; and "In play this term: The wet decade and The price of a home" on the Bethesda board in a term whose trend card says Downturn ahead.
- The letter's "Pull the thread" opens a general thread headed "Why what Culture, language hands on moved" and is not tied to the line about Maerdy.

## Bugs

Engine and content
- Cards credited in slips before they arrive from the post (Warm homes 2030, 2034, 2038; Skills 2050).
- Arrival later than the ticket states, unexplained (Warm homes, Community-owned energy).
- Slip cause and thread cause disagree (2038, Prosperous).
- "Pull the thread" on the third and fourth slips opens another card's thread (2034).
- Bethesda ignores threads from earlier visits while drawing them as stitched.
- Deck replays earlier hands in terms 5 and 6.
- Opening voice repeated (Abergavenny, 2042 and 2046).
- Voices not gated on the player's choice (Deiniolen 2034, Rhyl 2038).
- Peek recommends a two-term card for a next-term trend.
- Kept promise missing from Trust reasons in some terms (2038, 2046 careful game).

Layout
- "Back to Wales" off screen on the Bethesda result card.
- Results column overflow: Trust panel cut, voice below the fold.
- Tray prose clipped at 1280x800 and with three-note cards at 1440x900.
- Preview chips overlap "Your hand", the promise line and the ledger drawer.
- Played tickets list scrolled so the first ticket's title is cut off during the visit invitation and the shock (`g1-27-t2-pass.png`, `g1-53-cy-shock.png`).
- Welsh: cost digit off the row on long titles; "CHWARAEWYD 2038" stamp over the region line; Rhondda columns cut.
- Trend card over Anglesey; post tickets over year labels; arrival banner over Swansea and Cardiff.
- Guide notes still land on what they describe (tray description, two strand tiles).

Copy
- "COST 4 of 1 pips" on played tickets after the term passes.
- "is delivered" with two cards; "Young people can stay: Young adults can stay:"; "Why what Culture, language hands on moved"; "Card or curveball" for a trend.
- "press Play this card" for regional cards that play on choosing a region.
- Welsh: "Various", "Drwy Gwaith", "ar Cydnerth", "2 o'r 2 tomen", "bathu atebolrwydd", edefyn beside edau.
- Ticket `aria-label` says "Cost 3 of 8 pips" while the face says "of 4 left".
- Copied result link is about 5,000 characters.

Not bugs, still true
- 15 of 35 rules are placeholders and say so. Bethesda no longer charges Trust for a thoughtful miss, which answers last time's credibility point.
- Atlas unchanged and still an 8 on its own.

## What works now and should not be touched

- The Rhondda result card, sentence for sentence, and "made safe 2026" on later visits.
- The Bethesda option card with "The catch" and its cross-reference to a card I had passed up ("Half strength unless Skills and apprenticeships has been played"), and the zoom when an option is opened.
- "YOU WERE READY. Make coal tips safe softened the hit before you spent anything."
- The promise voices: "Promise us our children will be able to live their lives in Welsh if they want to."
- The thread panel when it lists my own threads.
- Both letters. "I am sorry to be blunt. I have been saving the bluntness."
- "Lands after 2050: it will not help your years, but it counts in Left for those who come after."
- "Why 6?": Budget 8, Shock last term -2, Contingency carried +1, Upkeep owed -1.
- Trust reasons with a sign, and the careless game's slide from Fair to Collapsed.
- Welsh at the title, and the mutation work throughout.

## Screenshot index

All in `design/shots-build/playtest-2/`.

| File | Shows |
|---|---|
| `g1-00-title.png`, `t-cy-title.png`, `t-map-click.png` | Title; title in Cymraeg; title map click landing on Powys in the atlas |
| `g1-03-term1.png`, `g1-04-ticket-open.png`, `g1-09-ledger.png` | First hand with preview chips; open ticket and tray; ledger with a chip floating over it |
| `g1-11-rhondda.png`, `g1-13-rhondda-result.png` | Rhondda board (last column cut); WELL with three explained tests |
| `g1-14-after.png`, `g1-15-thread-prosp.png` | Term 1 results with sharp and fuzzy marks, Maerdy voice; plain-words thread |
| `g1-20-t2.png`, `g1-22-t2-hand.png`, `g1-23-peek.png` | Arrival from the post; five-card hand; the peek |
| `g1-24-employer.png`, `g1-25-skills.png` | "frays" in the tray; expanded ticket with "1 more ticket below" |
| `g1-29-beth-opt.png`, `g1-31-beth-result.png` | Bethesda option with The catch; ADEQUATELY with the button off screen |
| `g1-33-t2-changed.png`, `g1-34-thread-equal.png` | Shock slip, Unexpected slip; thread listing my three tips |
| `g1-37-why8.png` | "Budget 8"; tray descender clipped |
| `g1-40-beth2.png`, `g1-41-beth2-result.png` | Second Bethesda visit with earlier threads drawn; result that ignores them |
| `g1-42-t3-shock.png`, `g1-43-t3-changed.png` | You were ready; results column with Trust panel cut and voice hidden |
| `g1-47-cy-ticket.png`, `g1-51-cy-rhondda.png`, `g1-53-cy-shock.png`, `g1-55-cy-thread.png` | Cymraeg mid-game: hand, Rhondda with "yn ddiogel 2026", shock, thread with pinned election button |
| `g1-57-t5-hand.png` | "Why 6?" breakdown; term 1 cards dealt again |
| `g1-66-letter.png`, `g1-68-letter-thread.png` | Careful letter and result; ledger, visits and promises |
| `g2-t4-ledger.png`, `g2-t5-plan.png`, `g2-t6-changed.png`, `g2-letter.png` | Careless game: ledger, Trust Thin with two cards, final results, The hollow years |
| `s1280-cy-term1.png`, `s1280-cy-thread.png`, `s1280-hand5-open.png` | 1280x800: Welsh first hand; Welsh thread; English five-card hand with the tray prose missing |
| `a-03-explorer.png`, `m-00-contents.png`, `m-01-rule.png` | Atlas explorer; model book contents; a rule page |
