# Glossary

Use the **Term** column in code, docs and talk between builders. Use the **Player sees** column in anything the player reads: copy in `model/i18n/`, card and curveball text, labels. Where the two differ, `docs/design/plain-wales.md` section 1 is the source, and `src/ui/game/copy-rules.test.ts` fails on the retired words. Welsh player words are drafts for review.

| Term | Meaning | Player sees (English / Welsh) |
|---|---|---|
| **Etifeddiaeth** | The game. "Inheritance: a game of Wales." | Etifeddiaeth |
| **Ddoe / Heddiw / Yfory** | The past (v1.1), the present atlas, the playable future. | Wales today (atlas), Play / Heddiw, Yfory |
| **Term** (Tymor) | One four-year turn, the engine's step. v1 has six: 2026 to 2046. | turn, "Turn 1 of 6"; years, not counts ("Works from 2034") / tro |
| **Generation** (Cenhedlaeth) | 25 years; the short mode is one generation, ending 2050. | 2026 to 2050 |
| **Strand** (Edefyn) | One of the seven well-being goals, scored 0 to 10: prosperous, resilient, healthier, equal, cohesive, culture, global. | goal; Work and pay, Nature and floods, Health, Fairness, Homes and community, Welsh and culture, Climate / nod; Gwaith a chyflog, Natur a llifogydd, Iechyd, Tegwch, Cartrefi a chymuned, Y Gymraeg a diwylliant, Hinsawdd |
| **Pip** | The engine's unit of budget, of a strand, of delay and of the result. Never shown. | coin (budget), point out of 10 (a goal), a year (delay), score out of 100 (result) / darn arian, pwynt |
| **Flow / stock** | A strand's level now, and what it builds up for 2050. | the bar (life today) and the 2050 marker / bar; marc 2050 |
| **Trust** (Ymddiriedaeth) | The ruler's licence to act; sets how many cards you may play. Not a strand. Bands strong, fair, thin, collapsed. | Trust: High, OK, Low, Lost, always with the card count / Uchel, Iawn, Isel, Wedi'i cholli |
| **Caretaker** (Gofalwr) | Plays one term on defaults if Trust collapses; also the comparison run. | a stand-in (the lost turn); Wales on autopilot (the comparison) / dirprwy; Cymru ar awtobeilot |
| **Lived** (Wedi'i fyw) | How people fared during your terms. | Life now (in play); Life in your years (at the end) / Bywyd nawr; Bywyd yn eich blynyddoedd |
| **Left** (Wedi'i adael) | What the 2050 generation inherits. | Left for 2050 / Ar ôl ar gyfer 2050 |
| **Result** | The lower of Lived and Left, in bands. | "Your result is the weaker of the two"; Much worse, A little worse, About the same, A little better, Much better than you found it |
| **Contingency** | Pips left unspent, held for a shock. | emergency fund; "saved for a crisis" / cronfa argyfwng |
| **Card** (Cerdyn) | A policy lever you play, drawn as a railway ticket. Has cost, delay, scope, effects, side effects. | card; "Costs 3 coins. Works from 2034." Opened: What it is, The catch, Picture it, Real Wales / cerdyn |
| **Standing ticket** | Borrow to invest, put off the repairs. | Extra coins, with a catch: Borrow, Skip repairs / Darnau ychwanegol, ond â phris |
| **Ledger** | Debts, upkeep, deferred repairs. | Borrowing and bills; a loan; running cost / Benthyg a biliau; benthyciad; cost cynnal |
| **Curveball** (Pelen gromlin) | An event from the horizon-scan trends; drawn as a slip, not a ticket. | slow change (the trend); crisis (the shock) / newid araf; argyfwng |
| **Ripple** | A curveball that can lead to another. | "This can lead to: {name}" / Gall hyn arwain at |
| **Scope** | Where a card applies: national, region, authority (LA) or place. | All of Wales, One region, Two regions |
| **Region** (Rhanbarth) | North, Mid, South West, South East. | the same |
| **Authority** (Awdurdod) | One of the 22 local authorities; the model's spatial unit. | council area ("local authority" in the atlas table heading) / ardal cyngor |
| **Regional compact** | Card: two regions act as one; needs-partners cards work at full strength there. | Regions work together / Rhanbarthau'n cydweithio |
| **Needs partners** | Half strength without a compact or a good visit. | Needs local help / Angen cymorth lleol |
| **Heartland** | The Welsh-speaking authorities flagged in `authorities.yaml`. | Welsh-speaking areas / ardaloedd Cymraeg |
| **Place** (Lle) | An authored zoom view (the Rhondda, Dyffryn Ogwen) with its own real data and decision. | place |
| **Visit** (Ymweliad) | Spending the term's attention on a place; one per term. | visit |
| **Thread** (in a place) | One choice on a place board. | pick ("3 picks left"); Make this tip safe, Choose this, Undo / dewis |
| **Place test** | One of three checks on a visit, judged over many runs. | a plain question with Yes or Not yet: "Can young people stay?", "Did you protect enough homes?"; "about 6 times in 10", never "runs" |
| **Grade** | Poorly, adequately, well or very well: the result of a place decision, scaling a card's effect. | badly, OK, well, very well / yn wael, yn iawn, yn dda, yn dda iawn |
| **Sharp / fuzzy** | Whether most runs agree on the move. | "about" and "probably"; "This could be 1 point higher or lower" |
| **Indicator** (Dangosydd) | A real measured quantity per authority (e.g. employment rate), with a source. | measure, with its source |
| **Stock** (Stoc) | A quantity that carries over time with delays (e.g. coal tip liability, woodland maturity). | what is built up for 2050 |
| **Rule** (Rheol) | One relationship in the model, written as data with a kind, parameters, sources and confidence. | rule |
| **Rule kind** | linear, saturating, stock, threshold, fcm, io. | straight line, levels off, builds up, tipping point, web of causes, spending into jobs |
| **Confidence** | High, medium or low, how sure the evidence is. | How sure: high, medium, low |
| **Evidence grade** | assessed (in SoNaRR or official statistics), published, expert, placeholder. | official figures, published research, expert judgement, a rough guess |
| **Lens** (Lens) | An indicator shown as a tint on the atlas map. | Colour the map by... / Lliwio'r map yn ôl... |
| **Pull the thread** (Tynnu'r edau) | Tracing a change back through the cards and rules to the sources. | Why? (button); "Why did this change?" (title) / Pam?; Pam newidiodd hyn? |
| **Model book** (Llyfr y model) | The public, readable list of every rule, indicator and source. | the rule book / y llyfr rheolau |
| **Modified rule set** | Any parameter changed from default; always shown with a badge. | You changed the rules / Rydych wedi newid y rheolau |
| **Seed** | The number that fixes a game's draws. | Game number / Rhif y gêm |
| **Voice** (Llais) | A one-line, illustrative quote from a real place each term. | A made-up voice, to show how it might feel |
| **Letter** (Llythyr) | The 2050 generation's verdict at the end. | the letter; its archetype title shows as "Ending found: The hollow years (1 of 6)" |
