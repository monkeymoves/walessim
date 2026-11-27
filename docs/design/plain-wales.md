# Plain Wales: a clarity pass for Etifeddiaeth

*Written 27 November 2026, after the owner's first full game. This is a design for one day of work by three build agents. It changes words, screens and guidance. It does not change the engine's model of Wales: no rule, card effect, cost, band edge or balance number moves.*

*Where this file disagrees with `GLOSSARY.md`, `docs/design/design-system.md` section 6 or `docs/design/game-design.md` on what the player reads, this file wins. Those documents still govern code names, the look and the mechanics.*

## 0. Why this pass exists

Luke played a full game and said: kind of cool, hard to follow, "what is a pip?", "not sure what you mean by stitching a thread here?", clearer instructions, more simple examples, more variance. The best bit was zooming into places. He also said: keep the sim and Civilization feel, and make people want to browse the facts and figures, "otherwise what was the point".

His two screenshots show the failure exactly:

1. **Term 1.** He clicked Cardiff and got three atlas facts (382k people, 12.2% speak Welsh, 75% in work) that had nothing to do with the four cards in his hand. The panel read "8 of 8 pips left" and, as a default he never chose, "8 pips held back for a shock". The only guidance on screen was "The left side costs now. The right side says when it pays."
2. **2050.** "Lived: about 2 pips down on what you inherited. Left: about 3 pips down. Your result is the lower: Left, Held, just." Then "about 1 pip behind" a caretaker, a letter titled The hollow years, and "I would like to know what you thought you were saving it for." He had not knowingly saved anything.

The four earlier playtests scored 8.5 out of 10 because the tester wrote the glossary. Items 3 and 12 of the old checklist ("could say what every mark means", "understood why the result was the lower of Lived and Left") were passed by someone who could not fail them. Section 8 replaces that checklist as the release gate.

**The diagnosis in one line:** the game speaks in its own metaphor (pips, threads, stitches, strands, yarn, the post, the ledger) and never says what it means in ordinary words. The fix is to say everything plainly, show one cause and effect in the first two minutes, and tie the map and the real figures to the choice in hand.

### Who builds what

| Agent | Owns | Files |
|---|---|---|
| **A, words** | Sections 1 and 2. Every English and Welsh string, card text, band and Trust labels, the copy test. | `model/i18n/{en,cy}/*.json`, text fields in `model/cards.yaml`, `model/curveballs.yaml`, `model/game.yaml` (labels only), `model/places/*.yaml`, `GLOSSARY.md` (add a "player sees" column), a new `src/ui/game/copy-rules.test.ts` |
| **B, play screens** | Sections 3, 4 and 7. Budget and saving, the score, the four-step strip, the first-term guide, the end screen. | `src/ui/game/*`, `src/ui/end/*`, `src/ui/parts/Ticket.tsx`, `TrustGauge.tsx`, `StrandRow.tsx` |
| **C, map and facts** | Sections 5 and 6. The in-play place and region panels, card facts, "Did you know", atlas and rule book links, the notebook. | `src/ui/game/MapStage.tsx`, a new in-play panel, `src/ui/atlas/PlacePanel.tsx` (reuse), `src/model/schema.ts`, `scripts/build-model.ts` |

Engine and contract work is small and listed once, in section 10. Everything else is copy and UI only. No change alters `GameState`, so saved games keep loading.

## 1. Vocabulary

### 1.1 The pip is retired

"Pip" currently means four things: a unit of budget, a unit of a strand, a unit of delay and a unit of the final result. One made-up word for four ideas is why Luke asked what it was. It becomes three ordinary things:

| Old meaning | New word | How it is shown | Welsh (review) |
|---|---|---|---|
| Budget and cost pips | **coins** | "8 coins this turn." A card says "Costs 3 coins". Drawn as eight round coins, not squares. | darn arian, darnau arian ("8 darn arian") |
| Strand pips (0 to 10) | **points out of 10** | "Health: 5 out of 10". | pwynt, pwyntiau; "5 allan o 10" |
| Delay pips | **a year** | "Works from 2034". Never "pays out in 2 terms". | "Yn gweithio o 2034" |
| Result in "net strand pips" | **a score out of 100** | "About 51 out of 100 in 2026. About 47 now." | "Tua 51 allan o 100" |

Decisions:

- **Coins, not pounds.** A coin is one eighth of what a government can newly choose to spend in a four-year term. That sentence appears once, behind the "What is a coin?" link on the budget panel. No pound sign appears on any cost, in line with `CLAUDE.md`.
- **Score out of 100.** People already read scores out of 100. The engine already holds the levels on a 0 to 10 scale (`EndResult.livedLevel`, `leftLevel`, `start`); the score is that level times ten, rounded, always with "about". One old net pip is about 1.4 points on the new scale, so nothing gains false precision. The band (worse, same, better) still comes from the engine's band, never from the rounded number.
- **Two scores during play, one result at the end.** See section 3.2.

### 1.2 The full word list

Code identifiers and i18n keys keep their old names (less risk). Only the words the player reads change. Every Welsh entry is a draft and carries `cy_review: true`.

| Player met | Problem | Replace with | Welsh (review) | Where |
|---|---|---|---|---|
| pip (budget) | coined | coin | darn arian | all of `game.json`, `parts.json`, card side notes |
| pip (strand) | coined | point (out of 10) | pwynt | `game.json` ghost and trace keys, `parts.json` meter keys |
| strand | insider | **goal** ("the seven goals") | nod, nodau | `meter.row`, book |
| yarn, the cross, "handed on" tick | metaphor | **bar** (life now) and **2050 marker** (left for 2050) | bar; marc 2050 | `onboard.strands`, meter tips |
| Prosperous | abstract | **Work and pay** | Gwaith a chyflog | `strand_short.*`, `strand.*` |
| Resilient | abstract | **Nature and floods** | Natur a llifogydd | same |
| Healthier | fine, shorten | **Health** | Iechyd | same |
| More equal | abstract | **Fairness** | Tegwch | same |
| Cohesive | insider | **Homes and community** | Cartrefi a chymuned | same |
| Culture, language | fine, reorder | **Welsh and culture** | Y Gymraeg a diwylliant | same |
| Global | misleading | **Climate** | Hinsawdd | same |
| (official goal names) | keep as fact | shown once per goal in its tooltip and in the rule book: "Official name: A resilient Wales" | as now in `goal.*` | `goal.*` unchanged |
| thread (a trace), "Pull the thread" | metaphor | **Why?** as the button; "Why did this change?" as the title | Pam? ; Pam newidiodd hyn? | `changed.pull`, `trace.*`, `meter.pull`, `end.pull`, `place_panel.source` (this one becomes "Source") |
| thread (a choice in a place) | metaphor | **pick** ("3 picks left") | dewis ("3 dewis ar ôl") | `place.json` `common.threads_*`, `engine.none`, visit lines |
| stitch a thread here | metaphor | Rhondda: **Make this tip safe**. Bethesda: **Choose this** | Gwneud y domen hon yn ddiogel; Dewis hwn | `common.stitch` (split per place) |
| unpick this thread | metaphor | **Undo** | Dadwneud | `common.unstitch` |
| fold back, fold back up | metaphor | **Done: back to Wales**; **Leave without choosing** | Wedi gorffen: yn ôl i Gymru; Gadael heb ddewis | `common.confirm`, `common.back` |
| your threads decide how well it lands | metaphor | "Your choices there decide how well it works" | Eich dewisiadau yno sy'n penderfynu pa mor dda mae'n gweithio | `visit.why*` |
| your work: each ring | fine | "Your cards so far: each ring is a card at work" | Eich cardiau hyd yma | `map.rings` |
| Trust bands Strong, Fair, Thin, Collapsed | half-plain | **High, OK, Low, Lost**, always with the card count: "Trust: OK. You can play 3 cards." | Uchel, Iawn, Isel, Wedi'i cholli | `parts.json trust.*`, `model/game.yaml` band labels |
| Lived | coined | **Life now** in play; **Life in your years** at the end | Bywyd nawr; Bywyd yn eich blynyddoedd | `end.lived*` |
| Left | coined | **Left for 2050** | Ar ôl ar gyfer 2050 | `end.left*` |
| "the lower of Lived and Left" | rule stated as jargon | "Your result is the weaker of the two. Spending the future to look good now does not win." | Y gwannaf o'r ddau yw eich canlyniad. | `end.lower` |
| Diminished | poetic | **Much worse than you found it** | Llawer gwaeth nag y cawsoch hi | `model/game.yaml judged_change.bands` |
| Held, just | cryptic | **A little worse than you found it** | Ychydig yn waeth nag y cawsoch hi | same |
| Handed on | cryptic | **About the same as you found it** | Tua'r un fath ag y cawsoch hi | same |
| Handed on better | fine, align | **A little better than you found it** | Ychydig yn well nag y cawsoch hi | same |
| A gift | poetic | **Much better than you found it** | Llawer gwell nag y cawsoch hi | same |
| caretaker (the lost term) | insider | **a stand-in** ("You lost the election. A stand-in runs Wales for 4 years.") | dirprwy | `election.lost`, `caretaker.*`, `step.caretaker` |
| caretaker (the comparison) | insider | **Wales on autopilot** ("the same Wales, same events, with a stand-in who only plays the two cheapest cards") | Cymru ar awtobeilot | `end.ghost_*` |
| From the opposition benches | insider | **You are out of office this turn** | Rydych allan o'r swydd y tro hwn | `bar.caretaker`, `caretaker.title` |
| Take the seat, 2026 | idiom | **Start: you run Wales from 2026** | Dechrau: chi sy'n rhedeg Cymru o 2026 | `hook.take` |
| term | half-plain | **turn** in guidance and buttons ("Turn 1 of 6: 2026 to 2030"); "Senedd term" stays once on the title screen as the real-world fact | tro ("Tro 1 o 6") | `bar.term`, buttons |
| contingency, "held back for a shock" | insider | **emergency fund**; "saved for a crisis" | cronfa argyfwng; wedi'u cadw at argyfwng | `plan.contingency*`, `shock.*` |
| curveball | coined | never shown; the slow kind is a **slow change**, the sudden kind is a **crisis** | newid araf; argyfwng | `slip.*`, `book.json curveballs.*` (book title becomes "Slow changes and crises") |
| From the horizon scan | insider | **A slow change is under way** | Mae newid araf ar droed | `slip.from` |
| shock; A shock lands; Absorb it | half-plain | **Crisis: Storm winter**; **Do nothing (free)**; **Spend 1 coin: halve the damage**; **Spend 2 coins: cut it to a quarter** | Argyfwng; Gwneud dim (am ddim); Gwario 1 darn: haneru'r difrod | `shock.*` |
| Ripple | coined | cut from the slip face. In the "Why?" panel: "This can lead to: {name}" | Gall hyn arwain at: {name} | `slip.ripple` |
| Peek at next term (1 pip) | idiom | **Look ahead (1 coin)**: "See next turn's slow change now." Hidden in turn 1 | Edrych ymlaen (1 darn) | `slip.peek*` |
| standing tickets | coined | **Extra coins, with a catch**: "Borrow" and "Skip repairs" | Darnau ychwanegol, ond â phris: Benthyg; Hepgor atgyweiriadau | `ledger.standing*`, card names in `cards.yaml standing` |
| Ledger, ledger drawer | insider | **Borrowing and bills** | Benthyg a biliau | `plan.ledger*`, `ledger.title`, `end.ledger` |
| debt token | coined | **a loan** ("1 loan: costs 1 coin every turn until you pay back 3") | benthyciad | side notes |
| upkeep; mints a liability | insider | **running cost**; "comes with a bill" | cost cynnal; daw â bil | `plan.upkeep*`, `ledger.upkeep*`, flood walls note |
| in the post; arrived from the post | metaphor | **on its way**; **arrived this turn** | ar ei ffordd; wedi cyrraedd y tro hwn | `post.*`, `opening.arriv*`, `onboard.post` |
| Pays out in 2 terms | sum left to the player | **Works from 2034** (the year, always) | Yn gweithio o 2034 | `ticket.paysOut*`, `plan.pays_*` |
| Pays out this term | fine, align | **Works straight away** | Yn gweithio ar unwaith | same |
| Lands after 2050: counts in Left | jargon | "Works after 2050. Too late for your years. It still counts in Left for 2050." | Yn gweithio ar ôl 2050. Mae'n dal i gyfrif. | `plan.ghost_after`, `plan.after_2050` |
| frays; Strengthens | metaphor | **hurts**; **helps** | yn niweidio; yn helpu | `ticket.frays`, `plan.frays`, `plan.helps` |
| Needs partners | insider | **Needs local help**: "Half as strong unless regions are working together there, or your visit goes well." | Angen cymorth lleol | `ticket.partners`, `plan.partners_note` |
| Regional compact (card) | insider | **Regions work together** | Rhanbarthau'n cydweithio | `cards.yaml` name |
| heartland | insider | **Welsh-speaking areas** | ardaloedd Cymraeg eu hiaith | card and curveball notes, `event.R20` |
| sharp, fuzzy | coined | removed from faces. Sure results say "about". Unsure ones say "probably" and, in the Why panel, "This could be 1 point higher or lower." | "tua"; "mae'n debyg" | `plan.ghost_*`, `sharpkey.*`, `meter.fuzzy`, `trace.sharp*` |
| held, did not hold (place tests) | idiom | **passed**, **missed** | wedi llwyddo; wedi methu | `place.json common.*`, `engine.visit.*` |
| in 7 runs in 10 | simulation leak | "7 times out of 10" | 7 gwaith o bob 10 | `engine.visit.*`, `common.share_*` |
| grades poorly, adequately, well, very well | "adequately" is cold | **badly, OK, well, very well**; "The Rhondda: it went well." | yn wael, yn iawn, yn dda, yn dda iawn | `grade.*`, `common.result` |
| Exposure, Fairness, Lifelines | abstract | **Most homes**, **Poorest streets**, **Schools and the railway** | Y nifer fwyaf o gartrefi; Y strydoedd tlotaf; Ysgolion a'r rheilffordd | `rhondda.tests.*`, `engine.visit.*` |
| Aros, Iaith, Pwysau | Welsh used as jargon in English mode | **Young people can stay**, **Welsh on the street**, **Not too much for the valley** (Welsh mode keeps the Welsh words) | as now | `bethesda.tests.*`, `bethesda.flags.iaith` |
| lens; Change the lens | insider | **Colour the map by...** | Lliwio'r map yn ôl... | `atlas.json lens.*`, `key.label` |
| model book | half-plain | **the rule book** ("every rule, number and source") | y llyfr rheolau | `shell.json nav.llyfr`, `title.read`, `book.json title` |
| modified rule set | insider | "You changed the rules" | Rydych wedi newid y rheolau | `bar.modified`, `shell.json modified` |
| Heddiw, Yfory (as English labels) | Welsh used as labels in English mode | **Wales today (atlas)** and **Play** in English; Heddiw and Yfory stay as the Welsh labels and as small subtitles | as now | `shell.json nav.*`, `doc.*`, `phone.*` |
| the step names (The year turns, A promise is asked, Plan the term, A place asks for you, Four years pass, What changed, The election) | seven poetic names | four numbered steps: **1 Choose your cards**, **2 Visit a place**, **3 Four years pass**, **4 What happened**. The opening, the promise and the election become moments inside steps 1 and 4, not named steps | 1 Dewis eich cardiau, 2 Ymweld â lle, 3 Pedair blynedd yn mynd heibio, 4 Beth ddigwyddodd | `step.*`, bottom-left label |
| Let the term pass | vague | **End the turn: 4 years pass** | Gorffen y tro: 4 blynedd yn mynd heibio | `plan.commit`, `passing.run` |
| Baseline pressure | insider | **Things that get worse on their own** | Pethau sy'n gwaethygu ohonynt eu hunain | `cause.baseline` |
| Trust reasons ("The trend wore on people", "Cards arrived as promised") | half-plain | keep the idea, name the thing: "{trend} made life harder." "{card} arrived when you said it would." | per string | `trust.reason.*` |
| This letter: The hollow years. Letters received: 1 of 6 | insider | **Ending found: The hollow years (1 of 6)** | Diweddglo: 1 o 6 | `end.archetype`, `end.letters`, `hook.letters` |
| Seed 12345; a new seed | technical | **Game number 12345**; "A new game: different cards and events." | Rhif y gêm | `end.seed`, `end.again_note` |
| Upgraded in Ddoe by: {lesson} | refers to a mode that does not exist yet | **cut** until Ddoe ships | | `plan.upgraded_by`, hide `upgraded_by` |
| ticket furniture "No." and scope words "Standing", "Lesson" | noise | cut "No."; scope words become "All of Wales", "One region", "Two regions" | Cymru gyfan; Un rhanbarth; Dau ranbarth | `scope.*`, `ticket.no` |
| authority | official | **council area** in play; "local authority" stays in the atlas table heading | ardal cyngor | `atlas.json`, in-play panel |
| GVA per head, LSOA, t CO2e, WIMD | abbreviations | spelled out on first sight: "Value of goods and services made, per person", "small neighbourhoods", "tonnes of greenhouse gas", "the Welsh deprivation index (WIMD)" | per string | `atlas.json short.*`, `unit.*` |
| Voice label "Illustrative voice, not a real quote" | fine | "A made-up voice, to show how it might feel" | Llais dychmygol | `voice.label` |

Other words found in the copy that must also go, with no table row needed: "what is handed on" (say "left for 2050"), "leaves more / leaves less" ("more left for 2050 / less left for 2050"), "the benches", "the pen", "the books", "delivered" for a card ("built", "started", "running"), "lands" for an effect ("starts to work"), "in play" ("active").

### 1.3 The copy test

Agent A adds `src/ui/game/copy-rules.test.ts`. It reads every value in `model/i18n/en/*.json` (except `book.json` rule-kind pages) and every `en` text field in `cards.yaml`, `curveballs.yaml` and `game.yaml`, and fails on:

- any of these words: pip, thread, stitch, unpick, strand, yarn, fray, ripple, curveball, horizon scan, contingency, ledger, standing ticket, caretaker, benches, lens, mint, liability, compact, heartland, absorb, adequately, exposure, lifelines, sharp, fuzzy, seed, archetype, "in the post", "runs in 10";
- any sentence over 18 words;
- an em dash or en dash.

Letters and voices are exempt from the word list (they are a person talking) but not from the length and dash rules.

## 2. Writing rules

The design system's voice ("a level-headed neighbour who knows the place") stays. Rule 6 of its section 6 ("use the world's own words: thread, stitch, fold, strand... do not explain the metaphor") is withdrawn for anything the player reads. The paper, tickets and stitching stay as the look. The words become ordinary.

1. **Reading age 11.** A bright Year 6 pupil should follow every line. Use everyday words of one or two syllables where one exists. If a hard word is the real name of a thing (deprivation, apprenticeship, Senedd), keep it and explain it once where it first appears.
2. **Short sentences.** Aim for 12 words. Never more than 18. No semicolons. No brackets inside a sentence that already has a comma.
3. **One idea per line.** A card, note or result line says one thing. Two ideas are two lines.
4. **Say who and where.** "Homes in Conwy flood less often", not "flood exposure improves". Use a real place, a real kind of person (a nurse, a bus driver, a family renting), a real year.
5. **Years, not counts.** "Works from 2034", not "in 2 terms". "Every 8 years", not "every second term".
6. **Numbers as digits**, and only real ones. Game amounts are coins, points and scores, always with "about" when they are estimates. Real figures carry their source and year.
7. **Say what happens next.** Every button names the result: "End the turn: 4 years pass". Every warning says what to do.
8. **Every card has a worked example**, in this fixed shape (section 2.1).
9. **No metaphor as a label.** If a label needs a second label to explain it, use the second one.
10. **No blame, no cheer**, as before. But a plain warning before a mistake is kind, not blame.
11. **Welsh is written fresh**, to the same reading age, not translated line for line. All new Welsh is `cy_review: true`.
12. No em dashes or en dashes anywhere.

### 2.1 The card pattern

Every card, opened, reads in this order. Lines 1, 2 and 5 are authored. Lines 3 and 4 are filled by the engine's `preview()` so no number is invented. Line 6 is filled from real data (section 6.1).

```
Build flood walls
Costs 3 coins. Works straight away.

What it is:    Strong walls where rivers and the sea reach homes.
If you play this in the North:
               Nature and floods goes up about 1 point by 2030.
The catch:     Walls need care. Pay 1 coin every 8 years, or they start to fail.
Picture it:    A family near the river sleeps through a storm.   (an example)
Real Wales:    [the sourced figure for this card: see 6.1]        Source
```

A slow card shows both halves of the wait:

```
Warm homes
Costs 3 coins. Works from 2034.

What it is:    Insulate the coldest homes first.
If you play this:
               Nothing changes by 2030.
               In 2034 you will see Health go up about 1 point.
               It also helps Climate and what is left for 2050.
The catch:     8 years of nothing to show. Trust may dip while you wait.
               It is half as strong if Wales is short of trained workers.
```

"Picture it" lines carry the tag "an example" and never contain a number. The points and years in "If you play this" come from `CardPreview` (`real`, `thisTerm`, `strands`, `stock`, `firstYear`, `landsYear`, `nothingThisTerm`, `landsAfterGame`, `needsPartner`), so they change with the state of the game, as now.

### 2.2 Before and after

Real strings, with their keys. Agent A should treat these as the model for the rest.

| Key | Before | After |
|---|---|---|
| `onboard.strands` | Yarn is how people fare now. The cross is what is handed on. | The bar shows life today. The small 2050 marker shows what is left for later. |
| `plan.commit_note` | Pips you leave unspent are held back for a shock. | Coins you do not spend become your emergency fund. A crisis can use 2. Up to 2 carry over. The rest are lost. |
| `end.summary_lived` + `end.summary_left` + `end.lower` | Lived: about 2 pips down on what you inherited. Left: about 3 pips down. Your result is the lower: Left, Held, just. | You left Wales a little worse than you found it. Wales scored about {start} out of 100 in 2026. You hand on about {end}. |
| flood walls `side_note` | Mints a liability: 1 pip of upkeep every second term, or the condition of what is built falls. Presses on rivers and coast. | The catch: walls need care. Pay 1 coin every 8 years, or they start to fail. Walls also squeeze the river. |
| `visit.why_one` | Because you played {card}. It is delivered there this term, and your threads decide how well it lands. | You played {card}. It is being built in {place} now. Go and choose how it is done. Good choices make the card work better. |
| `engine.visit.exposure.fail` | Exposure did not hold: your tips cover about {got} in 10 of the homes below the tips, weighted by risk; this visit needed {needed} in 10. {best} has the most homes below it. | Most homes: missed. Your picks protect about {got} in 10 of the homes below the tips. You needed {needed} in 10. {best} has the most homes below it. |
| `caretaker.body` | A caretaker plays the cheapest cards and holds the line. You can make one promise from the benches. | You lost the election. A stand-in runs Wales for 4 years and plays the two cheapest cards. You can still make one promise. Keep it and you come back stronger. |
| `plan.nothing_played` | You have played nothing. Standing still is losing, slowly. | You have not played a card. Wales gets a little worse on its own every turn. Play at least one. |
| `changed.stock_down` | {cause} ran down what {strand} hands on. | {cause} used up some of what {strand} leaves for 2050. |
| `trace.ending` | The national strand moves in pips and bands. Place counts are not added up. | This is a rough guide for all of Wales, not a count of homes or people. |

## 3. What to cut, hide or defer

The rule: in turn 1 a newcomer holds three things in their head: coins, cards, and the seven goal bars. Everything else arrives when it first matters, with one line of explanation, once.

### 3.1 The reveal order

| Thing | Now | After this pass |
|---|---|---|
| Coins, cards, goal bars, the map | Turn 1 | Turn 1 |
| Trust | Dial with band word, turn 1 | Turn 1, as **card slots**: four ticket-shaped slots, three filled. "Trust: OK. You can play 3 cards." The reason line appears at the end of turn 1 |
| The 2050 marker on each bar (old stock tick) | Turn 1, unexplained | Drawn faint in turns 1 and 2. Explained at the start of turn 3, or the first time a slow card arrives, with one note: "Some cards build things that last. The 2050 marker shows what will be left." |
| Life now score | Not shown | Turn 1, top bar (section 3.2) |
| Left for 2050 score | Not shown | Appears with the 2050 marker note |
| Promise | Turn 2 | Turn 2, unchanged, plain words |
| Place visit | Turn 2 | Turn 2, unchanged |
| Crisis and emergency fund | Budget panel says "held back for a shock" in turn 1 | The saving choice is explained when the player first has coins left (section 3.3). The crisis screen explains itself when the first crisis arrives |
| Look ahead (old Peek) | Turn 1 | From turn 2 |
| Borrowing and bills (old Ledger) | Button in turn 1 | Hidden until turn 3, or the first turn the player cannot afford a card they open. Then one note: "Short of coins? You can borrow or skip repairs. Both have a catch." |
| Keep a card for next turn | Turn 1 | From turn 2 |
| Regions work together (old Regional compact) | Can be dealt any time | Not dealt before turn 3 in a first game (section 10, E2) |
| "Why 8?" budget breakdown | Always | Only when the budget is not 8, as "Why {n} and not 8?" |
| Sure or unsure (old sharp and fuzzy), its key | On previews and bars | "about" and "probably" in the sentence. The key is removed. The range lives in the Why panel |
| "Ripple" tag, "Can turn into a shock" | On the slip face | One line on the slip: "This can turn into a crisis: Storm winter." The rest moves to Why |
| Rule kind, parameter, range, evidence grade in the Why panel | Open | Behind "Show the maths" at the bottom of the panel, with "Read this rule in the rule book" |
| Welsh name under each goal in English mode | Always | Removed from the seven goal tiles (replaced by "4 out of 10"). Bilingual pairs stay on place names and the title |
| "Upgraded in Ddoe by" | On every card | Cut until Ddoe exists |
| Weights, game number, copy result, modified rules | End screen top level | Inside "See the detail" on the end screen |
| Seven named steps | Bottom-left label | A four-step strip under the top bar: 1 Choose your cards, 2 Visit a place, 3 Four years pass, 4 What happened. The current one is marked |

### 3.2 One score, with the reason behind a fold

- **In play.** The top bar gains a small scoreboard on the left of the Trust slots: "Life now: about 52 out of 100" and, from turn 3, "Left for 2050: about 49 out of 100". Each is the weighted average of the seven bars (or the seven 2050 markers) times ten, the same sum the end screen uses. A small "was {n} in 2026" sits under each. This overturns "there is no running total anywhere on screen" in game-design 5.2. A player who cannot see the score cannot learn what moves it.
- **At the end.** One result (section 7). Life in your years and Left for 2050 sit behind "Why this result?".
- **The rule in one line**, used wherever the two scores meet: "Your result is the weaker of the two. Spending the future to look good now does not win."

### 3.3 Unspent coins are never a silent default

Today any coin not spent becomes contingency without a word, and the budget panel announces "8 pips held back for a shock" before the player has done anything. Luke was then told off by the letter for saving. The engine rule is fine and stays: unspent coins are the emergency fund, a crisis can take up to 2 of them, up to `game.contingency_carry` (2) unused coins carry to the next turn, and the rest are lost. The screen changes:

1. **The budget panel shows three piles**, always: "On cards: 3", "Emergency fund: 0", "Not used yet: 5". Nothing is in the emergency fund until the player puts it there. The line "8 pips held back for a shock" is deleted.
2. **Saving is a button.** "Save coins for a crisis" moves coins from "Not used yet" into the fund, one at a time, with a live line underneath: "A crisis can use 2 coins. Up to 2 more carry over to next turn. You have saved {n}." Saving a fifth coin shows: "This coin would be lost. Spend it instead."
3. **Ending the turn with coins not used asks once, every time.** The "End the turn" button becomes a choice sheet:
   - "You have {n} coins not used."
   - **Go back and spend them** (default, the stamp button).
   - **Save {m} for a crisis** (m is the most that can be useful) and, if n is more than m, "The other {n minus m} will be lost."
   - There is no way to end a turn with unexplained coins.
4. **Turn 1 of a first game** says the true thing for that turn: "No crisis can come in your first turn. Spend what you can. Up to 2 saved coins carry over." (E2 confirms the first-game schedule guarantees this.)
5. **The results screen says what happened to them**: "Emergency fund: 2 saved. No crisis came. 2 carried over." or "3 coins were not used and are gone."
6. **The letter line** "I would like to know what you thought you were saving it for" stays. After this change it can only be earned by a choice the player made on purpose.

All of this is UI. `Plays` still carries no saving field; the UI simply refuses to dispatch `commit` until the player has answered. Coins the player chose to save and coins the player chose to lose are the same thing to the engine.

## 4. The first turn: a script that teaches by doing

Goal: inside two minutes the player has spent coins, chosen a region for a reason, watched the map zoom there, seen one bar move because of their card, and opened "Why?" once. The first game always deals the same four cards in turn 1 (E2): Build flood walls, Warm homes, Welsh-medium childcare, Everyone online. They cost 3, 3, 2 and 1: nine coins of cards for eight coins of budget, so there is a real choice.

Notes are short paper slips pinned beside the thing they describe. One at a time. Each has "Got it" and "Skip the guide". Where a note below shows a figure in braces it is filled from `model/data/la-indicators.json` at build time.

| # | Screen | What the player sees and does | Exact words |
|---|---|---|---|
| 0 | Title | The map, one button. | "You run Wales from 2026 to 2050." / "Leave it better than you found it. In 2050 a young person writes to tell you how you did." / Button: **Start: you run Wales from 2026** / Under it: "About 20 minutes. 6 turns of 4 years. Every figure on the map is real." |
| 1 | How it works | One paper sheet, three lines, three small drawings (coins, a ticket, an envelope). | "Each turn you get 8 coins." / "Spend coins on cards. Cards change Wales. Some work now. Some take years." / "The 7 bars at the top show how Wales is doing." / Button: **Show me my cards** |
| 2 | Turn 1, the slow change | The slip drops top left. The map zooms gently to the North coast, then the South East valleys, then back out. | Slip: "A slow change is under way: **The wet decade**. More rain. Rivers rise faster. It hits the South East valleys and the North coast hardest." / Did you know: "{Conwy} has the most homes at flood risk in Wales: {54} for every 100 homes. Wales: {22}." Source tag. / Note: "This will slowly push **Nature and floods** down. You can push back." |
| 3 | The hand | Note pinned to Build flood walls. | "Start with this one. It works straight away." |
| 4 | Card open | The card in the pattern of section 2.1. The map lights the four regions. Each region carries a small label with its highest council area for flood risk. | Note: "This card needs a place. The map shows where floods threaten the most homes. Click a region." |
| 5 | Region chosen | The map zooms to that region. A cobalt ring is drawn. Three coins move from "Not used yet" to "On cards". The Nature and floods bar shows a dotted preview. | Under the bar: "If you play this: about {n} out of 10 by 2030 (now {m})." / Button: **Play this card (3 coins)** |
| 6 | Second card | Note pinned to Warm homes. | "This one is slow. You pay now. It works from 2034. Slow cards often do the most good." (The player may play it or not. The guide continues either way.) |
| 7 | Coins left | Note pinned to the budget panel, shown when the player has played at least one card and has coins not used. | "You have {n} coins left. Play another card, or save some. No crisis can come in your first turn, so spending is the better move. Up to 2 saved coins carry over." |
| 8 | End the turn | The choice sheet from section 3.3 if any coins are not used. | Button: **End the turn: 4 years pass** |
| 9 | Four years pass | The timeline pin slides to 2030. The map zooms back to the chosen region. The ring fills in. | Caption over the map: "2030. The flood walls are built in {region}." |
| 10 | What happened | The Nature and floods bar ticks up one square while the caption stays. One result slip, with "Why?" pulsing. | Slip: "**Nature and floods: {m} to {n} out of 10.** Because of Build flood walls. You played it in 2026." / Second slip if Warm homes was played: "Warm homes is on its way. It works from 2034. Nothing to see yet." / Note: "Press **Why?** on anything that changed." |
| 11 | Why? | A three-row chain, top to bottom, with the red line on the map from the bar to the region. | "**You** played Build flood walls in {region}, 2026." / "**The rule:** flood walls cut the number of homes at flood risk." / "**The source:** {source title}. Read the rule in the rule book." / Footer: "This is a rough guide for all of Wales, not a count of homes." |
| 12 | Trust | The card slots, with one reason. | "People saw things get better. **Trust: OK. You can play 3 cards next turn.**" / "Trust goes up when people see results and you keep promises. It goes down when things slip." |
| 13 | Hand off | One closing note, then the guide is quiet until something new appears. | "That is the whole game: spend coins, wait, see what changed, ask why. Next turn someone asks you for a promise, and a place asks you to visit." |

Later one-time notes, each shown the first time the thing appears: the promise (turn 2), the visit (turn 2: "The Rhondda wants you to come. You will choose which coal tips to make safe first. There is not enough money for all of them."), the 2050 marker and the second score (turn 3), the first crisis ("A crisis. You saved {n} coins. Spend them to cut the damage, or do nothing."), the first running cost ("Your flood walls need care this turn: 1 coin. Skip it and they start to fail."), borrowing (first shortfall), losing the election.

The cause and effect the player sees happen is deliberately one card, one bar, one place: flood walls, Nature and floods, the region they chose. In turn 3 they see the second kind: Warm homes arrives from 2026 and moves Health, with a slip that says "You played this 8 years ago."

## 5. The map in play

Today a click on the map during play opens the atlas panel for that council area: three general figures that do not connect to the hand. A click should always answer "what does this place have to do with my decision?".

### 5.1 Clicking a council area (the in-play place panel)

Three blocks, in this order, in one paper panel on the left. The map zooms to the area when it opens (the zoom is the part Luke liked).

1. **Your cards here.** Every card of yours that reaches this area, from `state.post`, the history and this turn's plan: "Build flood walls (2026): working." "Warm homes (2026): on its way, works from 2034." "Nothing of yours reaches Cardiff yet." If the area's region has had nothing for a turn: "The {region} has had no card for 4 years. One more turn and Trust falls." Slow changes that bear down here are listed the same way: "The wet decade: hits here harder than most."
2. **The figures that matter for your hand.** If a card is open, its figure for this area comes first: for Build flood walls, "Homes at flood risk: {26} for every 100 homes. Wales: {22}. {n}th highest of 22." Then one figure for each other card in the hand. Each has a source tag. If no card is open, the three figures with the widest gap from the Wales value are shown, so the panel always says something particular about the place.
3. **Since 2026 (game estimate).** For the same measures, what the model says has changed here and how much of that is the player's doing, from `componentView().raw` and `playerDelta`: "Game estimate for 2034: lower than 2026. Your cards did most of that." Shown as a direction and a plain size (a little, a lot), never as a new precise figure, and always tagged "game estimate, not a forecast".

Footer: **Open {name} in the atlas** (all its figures, without leaving the game) and **Close**.

### 5.2 Clicking a region when a card asks "Where?"

The four regions light, as now. Hovering or focusing a region shows a comparison slip: the region name, its council areas, the card's measure for the highest and lowest area in that region against the Wales value (no regional average is invented: only published area and Wales figures are shown), which of the player's cards are already at work there, and whether the card has special reach there ("Make coal tips safe works in the coal valleys: {list}"). Clicking picks the region and zooms.

A button on the open card, **Compare the regions on the map**, colours the map by the card's measure using the atlas ramp for that indicator, with its key and source line. This is the atlas lens, used inside play, for a reason.

### 5.3 Clicking "All of Wales"

A new **All of Wales** button sits at the top left of the map (and clicking the sea does the same). It zooms out and opens the Wales panel:

- "Your cards so far": every card played, where, and whether it is working, on its way or lapsed. The rings on the map pulse in the same order.
- "Slow changes": each active one, where it hits hardest.
- "Regions": four lines, each with the turn a card last reached it.
- The Wales figure for each card in hand, with its source.

### 5.4 Selection is always stated

A line under the map says what is selected and what a click will do: "Showing: all of Wales. Click a council area to see your cards and its figures." or "Choosing a region for Build flood walls. Click one of the four." This answers Luke's "when you select a region vs all country" directly.

Reach (which council areas a card touches) comes from the card's scope, the chosen region and its `where` flags against `model/authorities.yaml`. That is a helper in `src/model/`, not engine work.

## 6. Keeping the sim feel, and making people browse the facts

The game is worth making because the figures are real. Plain words must not turn it into a quiz with a map behind it. Four ways the real Wales gets louder, not quieter:

### 6.1 A real figure on every card

Each card gains one authored field in `model/cards.yaml`:

```yaml
fact: { indicator: flood_exposure, pick: highest }
```

At build time `scripts/build-model.ts` reads `model/data/la-indicators.json`, takes the named council area (highest, lowest, or a fixed code) and the Wales value, and checks the indicator's `source` exists in `model/sources.yaml`. The build fails otherwise. The card then shows the "Real Wales" line and a source tag that opens the same source card as the atlas. No figure is typed by hand, so none can be invented.

| Card | Indicator | Source id |
|---|---|---|
| Build flood walls, Slow the flow, Restore upland peat | `flood_exposure` | `statswales_flood` |
| Warm homes | `poor_housing` | `statswales_wimd2025_la` |
| Welsh-medium childcare | `welsh_speakers` | `nomis_census_ts033` |
| Build social homes, Homes for locals | `affordability` | `ons_affordability` |
| Buses and rail that connect, Everyone online | `gp_travel_public` | `statswales_wimd2025_la` |
| Skills and apprenticeships, Land a big employer | `employment` | `nomis_aps` |
| Community-owned energy | `renewables` | `desnz_renewables_la` |
| Grid and big renewables | `renewables_mw` | `desnz_renewables_la` |
| Health before hospital | `life_exp` | `ons_life_expectancy_local` |
| Early years first | `deprivation_10` | `wimd_2025` |
| Plant woodland | `emissions_head` | `desnz_la_ghg` |
| Pay farms for nature, Tourism pays its way, Regions work together | none fits honestly | no figure. The line reads "How this works: see the rule" and links to the card's rule in the rule book |

Wording rules for the figure: use the unit words already in `atlas.json` (`headUnit.*`), round as the atlas does, give the year, and never turn "per 100 homes" into "per cent of homes" (the flood measure counts a home once per kind of flood). The copy agent reads the value from the data when writing; the examples in this document in braces are there to show shape.

### 6.2 "Did you know", tied to the decision

One sourced line appears at three moments, always about the thing in front of the player:

- **With each new slow change** (walkthrough screen 2).
- **On the open card**, as a question before the answer: "Before you choose: which region has the most homes at flood risk? **Compare the regions on the map**." Opening the comparison is the reward: the player now knows where the card bites.
- **On each result slip**, as an anchor: "For scale: Wales has about {22} homes at flood risk for every 100 homes ({year})." This keeps the points honest by standing them next to the real measure they summarise.

All three are generated from the same `fact` data and templates in i18n. Templates: "{area} has the highest {measure} in Wales: {value}. Wales: {wales}." and its lowest and Wales-only forms.

### 6.3 The atlas and the rule book, one click from play

- A **Look it up** button in the top bar opens the atlas over the game, at the selected area, with the measure of the open card already colouring the map. "Back to your game" returns to exactly the same state. Today the only route is a small footer link.
- Every Why panel ends with **Read this rule in the rule book**, opening the rule's page over the game the same way.
- Every source tag in play opens the same source card as the atlas (title, publisher, year, licence, link).
- On a result slip, **See the 22 council areas** opens the explorer table sorted by that measure.

### 6.4 The notebook: a reason to look around

A small **Notebook** tab on the timeline: "Council areas looked at: 6 of 22. Sources opened: 4. Rules read: 2." Each council area opened in the in-play panel or the atlas gets a small stamp on the map for the rest of that game. The end screen adds one line under the detail fold: "You looked at 6 of 22 council areas. You never looked at Powys, where your Warm homes card did the most." (The second sentence is built from `playerDelta`.) No score reward: the reward is the stamps, the line in the summary, and better choices. It is stored with the save under the existing `etifeddiaeth.v1.` prefix, with one new key and no clearing of anything else.

### 6.5 What keeps the Civilization feel

- The map stays the largest thing on screen, and now every card leaves a visible, clickable mark on it.
- The seven bars, Trust, the timeline with cards on their way, crises and the letter all stay. Nothing mechanical is removed.
- Depth is deferred, not deleted: by turn 3 the player has all of it.
- Plain labels sit on top of the real names: the official goal names, rule ids, parameters and sources are all one click down.

## 7. The end screen

One column, in this order. The current two-panel screen (letter beside bars and a chart) becomes the detail fold.

1. **One result.** Large, alone: "**You left Wales a little worse than you found it.**" (one of the five plain bands). Under it, the score: "Wales scored about {start} out of 100 in 2026. You hand on about {end}." The numbers are the weaker side's `start` and level times ten.
2. **One sentence on why.** Built from which side was weaker and the largest cause the engine recorded:
   - Left weaker: "Life in your years held up, but less was left for 2050: {biggest cause}."
   - Lived weaker: "You left a lot for 2050, but people had hard years on the way: {worst year} was the worst."
   - Both down: "Things slipped in your years and less was left behind. The biggest reason: {biggest cause}."
   - Coins lost in three or more turns always wins the "biggest reason" slot: "You left {n} coins unused over {t} turns. Wales gets worse on its own when nothing is done."
3. **What you did that mattered.** Three lines at most, each a card, crisis or choice with its year, its place and a Why? button: "Build flood walls, the North, 2026: Nature and floods up." "The 2038 recession hit in full: you had saved nothing." "You went to the Rhondda in 2030 and made Tip 8 safe." Then one comparison line: "On autopilot, the same Wales would have ended at about {n}. You finished {ahead or behind} by about {d}."
4. **The letter.** As now, read line by line, each named thing tied to the map. Its poetic title moves to the foot: "Ending found: The hollow years (1 of 6)."
5. **See the detail** (closed by default): Life in your years and Left for 2050 as two bars with the 2026 mark and the autopilot mark; the six-turn chart; per-goal table (start, end, which side was weaker); Borrowing and bills; promises; visits; cards still on their way; the notebook line; weights; game number; copy result; copy link.
6. **Play again**, with one suggestion taken from the existing `end.prompt.*` set, rewritten plainly: "Next time: play one slow card in your first turn."

Luke's own ending, in the new words: "You left Wales a little worse than you found it" in place of "Held, just"; "about 4 points lower" in place of "about 3 pips down" (3 net pips times ten sevenths); "On autopilot, the same Wales would have ended about 1 point higher."

## 8. The cold playtest

This replaces game-design section 12 as the gate. The earlier playtests were not cold. These are.

### 8.1 Who and how

- **Five testers**: Luke, plus four first-time players. If agents stand in for people, each is a fresh agent given only the live URL and this section's task sheet, with no file access, no repository, no design documents and no prior conversation. A tester who has seen the glossary is void.
- **One sitting each**, a full game from the title screen, English, then turn 1 again in Cymraeg for at least one tester who reads Welsh.
- **Think aloud.** The tester says (or writes, for an agent) what they think each thing is before clicking it, what they expect to happen, and what they think happened. The observer does not help. If a tester asks "what does this mean?", the observer writes the word down and says "what do you think?".
- **Record**: time to first card played; every word the tester asked about or guessed wrongly; every moment of more than 20 seconds with no action; whether they opened Why?, a source, the atlas or the rule book without being told to.

### 8.2 Comprehension questions

Asked at three points. Answers are marked right or wrong against the key by someone other than the tester.

After turn 1:

1. What is a coin, and how many do you get? (A share of the budget; 8 a turn.)
2. You played a card. What did it change, and how do you know? (Names the bar and the place, and points to the slip or Why?.)
3. One of your cards has not done anything yet. When will it? (Gives the year.)
4. What happens to coins you do not spend? (Emergency fund; a crisis can use 2; up to 2 carry over; the rest are lost. Two of the four parts is a pass.)
5. What does clicking a place on the map show you? (Your cards there and its real figures.)
6. What does Trust do? (Sets how many cards you can play.)

After turn 3:

7. Why did {a bar that fell} go down? (Names the cause the game showed.)
8. What is the small 2050 marker on each bar? (What is left for later.)
9. What is the difference between choosing a region and choosing all of Wales for a card? (Stronger in one place versus thinner everywhere, or equivalent.)
10. Name one real fact about Wales you learned, and where the game says it comes from. (Any sourced figure and its publisher.)

After the end:

11. In one sentence, how did you do, and why? (Matches the result line and its reason.)
12. Why does the game show two scores, and which one decided your result? (Now versus later; names the weaker.)
13. What would you do differently next time? (Any specific change.)
14. What is the letter? (A person in 2050 judging what you left.)

### 8.3 Pass marks

The pass ships only if all of these hold:

- **Per tester**: at least 11 of 14 right. Questions 1, 2, 4, 5 and 11 are right for every tester.
- **Across testers**: no single question is wrong for more than one tester.
- **First card played within 2 minutes** of pressing Start, for at least four of five.
- **No tester ends any turn with coins they did not mean to leave.** (Ask after each turn: "did you mean to leave those?")
- **No word is asked about by two or more testers.** Any such word goes back to agent A.
- **At least three of five open a source, the atlas or the rule book unprompted** at least once. This is the "what was the point" test.
- **At least four of five say they would play again** and can say what they would change.
- Luke's own verdict on "kinda hard to follow" is "no longer".

A fail on any line is fixed and retested with a new cold tester. Testers are never reused.

### 8.4 Findings from the parallel cold playtest

A first-time player (no docs, one full game in English, screenshots in `design/shots-build/cold-1/`, not committed) scored it fun 7, clarity 5, play again 6. Answers: knew a pip only as "the black squares I spend"; thought clicking the map did nothing; read a thread as a place marker but also "show me the cause"; understood Lived, Left and Trust only after a full game.

Biggest confusions, in order: place visit tests in insider words ("0 runs in 10, against 6 needed", "Exposure", "Lifelines"); a Bethesda result that said a river pick was both counted and missing; "You were ready" stamped over "You spent nothing"; a promise asked on a goal no card in hand could help; "8 pips held back for a shock" read as money taken away; map clicks ignored then shown four turns later; thread meaning two things; Regional compact lost silently when its second region was not chosen; budget falling 10 to 9 to 6 without a word; a stray "judged this term" line on the end screen.

Good moments: the first guide note, the zoomed Rhondda with real facts, a very well visit raising Trust, the letter naming Maerdy, the illustrative voices, an old card softening a shock.

## 9. Later, not this pass: better play and more variance

Luke asked for better gameplay and more variance, and said the zoom into places was the best part. These are phase 2. None is in scope for the three agents.

1. **A place every turn.** Six visits in a game, one per turn, each a different kind of decision. Today there are two places and most turns have none.
2. **More places.** In order of readiness of open data: Port Talbot (steel and what comes after), Fairbourne or the Conwy coast (defend or move back), Blaenau Ffestiniog (slate, rain and work), Ceredigion (farms, language and young people leaving), Cardiff (heat, housing and growth), Newtown or the Severn headwaters (floods upstream and down).
3. **Varied starts.** Choose or be dealt one of four starting briefs ("the valleys first", "the language first", "the coast first", "balance the books"), each with a different first hand, first slow change and first place.
4. **Crises that hit named places.** A storm that floods a named town on the map, with the zoom, the real figure for homes at risk there and a visit offered in the aftermath. Bigger swings, clearly caused.
5. **Events with a choice.** Some slow changes arrive as a two-way decision in a place rather than a slip to read.
6. **A looking-up bonus.** Checking a figure before a regional play gives a small, real edge (a "well briefed" play). Needs engine work and balance, so it waits.
7. **Rivals and advisers.** A named, fictional adviser per goal who argues for their card, to give the hand a voice.
8. **A longer game.** Twelve turns from 2026 to 2074, two generations and two letters.
9. **Ddoe.** The past mode, which also brings back "lessons" on cards.
10. **Region as a player choice of difficulty.** Start as the voice of one region and be judged by both it and Wales.

## 10. Engine, contract and model-format work

Everything not listed here is copy or UI only. None of these changes a rule, an effect, a cost or a balance number, and none changes the shape of `GameState`.

| Id | What | Where | Size | Needed for |
|---|---|---|---|---|
| E1 | Additive helper `headline(model, state)` returning Life now, Left for 2050 and their 2026 starts as scores out of 100, using the same weights and sums as `EndResult`. Add a test that at the end it equals `livedLevel`, `leftLevel` and `start` times ten, and that `livedLevel` minus `start.lived` equals `lived.value` divided by 7 (if the dip share breaks that, expose the display values explicitly rather than have the UI guess). | `src/engine/api.ts`, `scores.ts` | Small | 3.2, 7 |
| E2 | First-game deal: a `first_game_hand` list in `model/game.yaml` (Build flood walls, Warm homes, Welsh-medium childcare, Everyone online) and no Regional compact before turn 3. Tests: no crisis can occur in turn 1 of a first game; Build flood walls played in any region shows at least one whole point on its bar at the end of turn 1. If the second test fails, change which card the guide points at. Do not retune the model. | `src/engine/deck.ts`, `schedule.ts`, `model/game.yaml` | Small | 4 |
| E3 | Additive helper `whatMattered(model, state)` returning the three largest causes across the whole game (card, crisis, visit, promise, lost turn, coins unused), each with year, place and goal, drawn from the per-turn outcomes already in `state.history`. Fallback if time is short: the UI takes the largest slip from each turn and keeps the top three. | `src/engine/api.ts`, `result` code | Small to medium | 7 |
| E4 | Card fields `fact` and the authored lines `what`, `catch`, `picture` (as `{en, cy}`) in the card type, with build checks: the fact's indicator exists, has data, and its source is in `model/sources.yaml`. Not engine: model format only. | `src/model/schema.ts`, `scripts/build-model.ts`, `model/cards.yaml` | Small | 2.1, 6.1 |
| E5 | Helper `cardReach(model, play)`: the council areas a play touches, from scope, region and `where` flags. Not engine. | `src/model/` | Small | 5 |
| E6 | Label text only: Trust band labels and result band names in `model/game.yaml`; strand names stay as ids, with new short labels in i18n. | `model/game.yaml`, i18n | Trivial | 1 |

Copy-only but touching engine-emitted strings: every key in `model/i18n/*/engine.json` is rewritten under section 1 (visit tests, letter lines, Trust reasons). The engine code that fills them does not change.

Checks before calling the pass done, per `CLAUDE.md`: `npm run typecheck`, `npm test` (including the new copy test and the E1 and E2 tests), `npm run e2e` in both languages, then the cold playtest in section 8.
