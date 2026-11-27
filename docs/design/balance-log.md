# Balance log

*Engine lead, 26 November 2026. Every (tune) value lives in `model/game.yaml` or a rule parameter; this
file records what was changed, why, and where the targets of game-design 11.2 stand.*

Full check: `npx tsx scripts/balance.ts --seeds 200 --runs 30 --ceiling 5000`.
Quick structural check in `npm test`: `src/engine/bots.test.ts`.

## Bots

| Bot | Behaviour |
|---|---|
| caretaker | Two cheapest non-borrowing cards, national or most populous region, holds 2 pips, always responds. |
| careless | Random number of random cards in random regions, borrows a quarter of the time, no visits, never responds. |
| average | Fills the hand from the weakest strand upward, one borrow in 2034, visits with an obvious but unconsidered choice, responds with 1 pip. |
| thoughtful | Picks the best affordable set by a need-weighted estimate of flow and stock gains, rotates regions that went without, keeps 1 to 2 pips back, repays debt, searches the board for a well grade, responds with 2. |
| single-strategy | growth-only, green-only, borrower, prevention-only, south-east-only, ignore-places, no-contingency, end-game-dumper (section 11.1), each a thoughtful bot with one habit. |
| flow-greedy | Diagnostic: thoughtful with Lived weighted heavily. |
| random (ceiling) | Random subsets and regions with smart visits, 5,000 games. |

## Changes, in order

| # | Change | From | To | Why |
|---|---|---|---|---|
| 1 | Effect sizes S, M, L | 0.5, 1, 2 | 1.5, 2.5, 4 | At design sizes a whole game of good play moved Lived by about 0.2 over the caretaker: each national M moves Wales wellbeing by about 0.05, regional cards less. Larger sizes make a card visible on the strand row. |
| 2 | Regional step | one size up, unbounded | one size up, never beyond L | With bigger sizes an L card in a region reached 1.5 L. |
| 3 | `curveballs.slow_scale` (new) | (1) | 0.4 | Slow trends apply every term; at the new sizes a full S each term overwhelmed everything. |
| 4 | `curveballs.shock_scale` (new) | (1) | 0.5 | Same reason for shocks. |
| 5 | `gap_scale` | 2.0 | 2.5 (later replaced by 10b) | Brings the 2026 `equal` flow from 4.7 towards the design's 4. |
| 6 | Stock `floor_share` on R15, R21, R33 (new parameter) | (only gains erode) | 0.4 | The design gives these stocks an outflow; with only gains eroding, standing still never lost anything on Left. Existing provision now keeps up 40 per cent of the 2026 stock. |
| 7 | `ageing` on R10 (assets) and R06 (drained peat) (new parameters) | none | -0.25, -0.1 per term | Infrastructure and peat had no baseline decline; "standing still is losing". |
| 8 | Baseline pressures within their ranges: R01, R02, R04, R03 drift, R05 | -0.3, -0.2, -0.15, 0.03, 0.25 | -0.45, -0.35, -0.3, 0.05, 0.15 | The design's no-card decline (four strands about a pip down by 2050) was not reached. |
| 9 | Chains within their ranges: R14, R17, R22, R23, R31, R32 | 0.2, 0.3, 0.25, 0.2, 0.5, 0.3 | 0.35, 0.4, 0.4, 0.3, 0.7, 0.5 | Prevention should pay back in flows (Lived), not only in stocks. |
| 10 | R25 jobs ripple `scale` | 0.5 | 1.0 | The IO bands are already per pip; halving them made spending invisible. |
| 10b | Gap components rescored (`gap_scale` 1.5, start at `initial` 4) | 10 - 2.5 x gap | 4 + 1.5 x (2026 gap - gap) | With real data the employment gap scored near 0 and clamped, so the equal strand could not show a gap widening and traces could not add up. Equal now starts at 4.3 (design 4) and moves both ways. |
| 11 | Bethesda board values and thresholds | first draft | see `model/places/bethesda.yaml` | Six trios grade well with no trends, about twenty with skills and the levy, one in the wet decade, none under the price of a home without skills: several answers, none obvious, trends change the sums. |
| 12 | Rhondda risk rule | every landslide record steep | `risk_rule` in `model/places/rhondda.yaml` | With every recorded tip at step 2, the wet decade put seven tips above a school or the railway at step 3 and "well" was impossible. Now sorting by homes passes in a dry spell and fails lifelines in the wet decade; a well trio exists in both. |
| 13 | Community-owned energy gains `heartland` +S in heartland authorities (needs partners) | none | +S | The coverage check (every strand helped by four cards) failed for culture; the design lists this card as a response to the language trend and the hydro option carries the Iaith flag. |

## Results (200 seeds, 30 runs each, after the changes)

Run on the model as of change 12 (the later heartland effect on community energy and the gap rescoring
are covered by `npm test`, not by this table). Results are medians over 200 seeds.

| Bot | Median | p10 | p90 | Lived | Left | Lived is lower | Caretaker terms per game | Well grades per game | Target |
|---|---|---|---|---|---|---|---|---|---|
| caretaker | 4.52 | 4.14 | 4.83 | 4.84 | 4.53 | 24% | 0.53 | 0 | 3.3 to 3.9: miss (high) |
| careless | 3.60 | 2.81 | 4.33 | 4.70 | 3.60 | 4% | 0.86 | 0 | 2.5 to 3.5: miss by 0.1 |
| average | 5.07 | 4.49 | 5.29 | 5.18 | 5.09 | 44% | 0.04 | 1.6 | 4.2 to 5.0: miss by 0.07 |
| thoughtful | 5.20 | 5.04 | 5.33 | 5.20 | 5.93 | 99% | 0.03 | 3.5 | 5.8 to 6.8: miss (low) |
| growth-only | 3.88 | | | | | | 0.99 | | at least 0.7 below thoughtful: ok |
| green-only | 4.41 | | | | | | 0.48 | | ok |
| borrower | 4.71 | | | | | | 0.12 | | miss (0.49 below) |
| prevention-only | 4.98 | | | | | | 0.15 | | miss |
| south-east-only | 5.15 | | | | | | 0.04 | | miss |
| ignore-places | 5.13 | | | | | | 0.06 | | miss |
| no-contingency | 5.22 | | | | | | 0.04 | | miss |
| end-game-dumper | 5.17 | | | | | | 0.03 | | miss |
| ceiling (best of 5,000 random games) | 5.35 | | | | | | | | at most 8.0: ok |

Card use in the top decile of the random-search games: every card at least 57 per cent (none rare),
but thirteen cards above 70 per cent. A game plays about fifteen of the twenty cards, so "played at
least once" is near-universal; this test needs redefining (for example play share per term, or lift
over all games) before it can discriminate.

## Where the targets stand, and why

What holds: the order careless < caretaker < average < thoughtful; growth-only and green-only are
well below thoughtful play; borrowing costs about half a point; the ceiling is far below 8; Trust
collapse is common for careless and growth-only play (a caretaker term in most games) and rare for
thoughtful play; well grades reward the board search (3.5 per game against 1.6 for average and 0 when
ignoring places); every strand change is traceable.

What does not: the absolute bands, and the spread. Thoughtful play beats the caretaker by about
0.7, against 2.5 in the targets. Two reasons, both structural rather than numbers to tune:

- **The start.** Real 2026 data put Lived at about 5.1 and Left at about 4.6. The design expected
  about 4.4. Every target was set against that lower start.
- **Lived cannot move fast.** Lived is 0.75 times the mean plus 0.25 times the worst term, and the
  worst term is usually the first, before most cards land (delays of 1 to 3 terms). A whole game of
  good play adds about 0.4 to the mean of wellbeing. The design's own arithmetic says the same: a
  national M moves one strand a third of a pip, so wellbeing by about 0.05; eighteen cards cannot
  add 1.5. Even with effect sizes 2.5 times the design's, the thoughtful bot's Lived stays near 5.2
  and Lived is the lower in nearly every thoughtful game, so Left (5.9) never binds.

The one-habit bots (ignore places, no contingency, dump at the end) sit within 0.1 of thoughtful
play because each habit is worth 0.1 to 0.2 here. That gap is real but small; making it 0.7 would
need much harsher penalties than section 4.2 sets.

## Open questions for the design lead

1. **Absolute targets versus the data start.** With the real 2026 data the starting Lived is about
   5.1 (the design expected about 4.4) and Left about 4.6. Lived counts the worst term at a quarter
   weight, and the worst term is usually the first, before any card has landed. So thoughtful play
   cannot reach a median of 5.8 to 6.8 without effect sizes so large that a single card moves a strand
   by two pips. Proposal: state the bot targets relative to the 2026 start (caretaker about one point
   below, thoughtful about one point above), or measure Lived from term 2.
2. **Single-strategy bots.** Ignore-places, no-contingency and end-game-dumper differ from thoughtful
   play by one habit, and the habit is worth well under 0.7. The design's mechanisms (grade 1.3, Trust
   +6, shock -6) are each worth about 0.1 to 0.2 of a result. Either accept a smaller gap for these
   three or make the habits costlier (for example a larger grade multiplier).
3. **Card dominance.** Thoughtful-style play leans on the cheap, broad cards; see the card table above.

---

# Design lead's decision, 26 November 2026 (decision 14)

*Full decision, formula, targets and the engine spec: `balance-decision.md`. This section records the
reasoning and the numbers. Check: `npx tsx scripts/balance-probe.ts --seeds 200 --ceiling 5000`.*

## What was really wrong

The engine lead's diagnosis is right, and the cause goes one step further. The 0 to 10 scale runs from
the worst UK region to a national milestone, and Wales starts on it from real data. A strand averages
about three indicators and the result averages seven strands, so one national card moves the result by
about a twentieth of a point whatever the effect sizes are. Raising S, M and L does not help, because
trends, shocks and side effects use the same sizes: I tried S 2.0, M 3.0 and thoughtful play got
slightly worse. Honest change over 24 years is a pip or two a strand. The old result hid that under
five points of level that no player chose, so a thoughtful game and a caretaker game looked alike.

Three other things were found on the way:

- **Stocks were on a different scale from flows.** Thoughtful play gained about 9 net strand pips of
  Left and 1.5 of Lived; health stock reached 10 out of 10. Left could never bind for a good player.
- **The worst-term rule punished investment.** On a rising path the worst term is the first, so a
  quarter of Lived was "the term before your cards landed".
- **Two bot habits are not what they say.** The thoughtful bot neglects regions as often as the
  south-east-only bot (about ten region-terms a game), and about 85 per cent of shocks count as
  "prepared", so the no-contingency bot rarely absorbs a full hit. These are bot and engine matters
  (see the spec), not tune values.

## The decision, in short

Judge the change since 2026, in net strand pips (seven times the weighted change), the lower of Lived
and Left. Lived is the mean of terms 2 to 6, less a quarter of the deepest fall below the 2026 start.
Bands: Diminished below -4, Held, just to -1, Handed on to +1, Handed on better to +4, A gift from +4.
The caretaker ghost is shown beside it ("about 5 pips ahead of a caretaker's Wales") but is not in the
score. Stocks were retuned in YAML to the scale of flows, shocks leave lasting scars, and debt is
priced at about a pip of Left a token.

I chose the change since 2026 over "relative to the caretaker" for the score because 2026 is the same
real number in every game and the ghost varies with the seed; the ghost does its work as a mark and a
sentence. I chose net strand pips over a rescaled 0 to 10 index because a rescaled index would be a
made-up number, and pips are what the player has watched all game.

## Changes 14a to 14j

Listed with from, to and why in `balance-decision.md` ("Done in YAML already"). Tried and put back:
effect sizes S 2.0, M 3.0; Trust neglect -7 (the thoughtful bot lost the seat in 0.3 games);
`floor_share` 0.6 and faster outflows of 0.25 to 0.3 (both moved every bot together, so they bought no
spread); early years stock at S (no effect).

## Numbers

Old measure (level, lower of Lived and Left), before any of this, 200 seeds: caretaker 4.52,
careless 3.60, average 5.07, thoughtful 5.20, ceiling 5.35. Spread caretaker to thoughtful: 0.68 of
a point on a scale of ten.

New measure, net strand pips since 2026, medians:

| Bot | Before (old tuning, judged over terms 2 to 6 as change, 30 seeds) | After (200 seeds) | p10 | p90 | Lived | Left | Lived is lower | Lost terms | Target |
|---|---|---|---|---|---|---|---|---|---|
| caretaker | -1.5 | -2.8 | -4.6 | -1.5 | -1.8 | -2.2 | 40% | 0.54 | -3.5 to -1.5: ok (Held, just) |
| careless | -5.8 | -6.9 | -9.5 | -4.3 | -3.1 | -6.9 | 5% | 0.86 | -10 to -4: ok (Diminished) |
| average | +0.7 | -0.4 | -3.4 | +2.1 | +1.4 | -0.1 | 27% | 0.04 | -1 to +1: ok (Handed on) |
| thoughtful | +1.5 | +2.3 | +0.4 | +3.5 | +2.5 | +4.2 | 78% | 0.01 | +1.5 to +3.5: ok (Handed on better) |
| growth-only | -4.8 | -6.2 | -8.1 | -4.4 | -2.9 | -6.2 | 8% | 1.00 | 1.5 below thoughtful: ok |
| green-only | -3.0 | -3.9 | -5.2 | -2.8 | -3.6 | -3.1 | 64% | 0.47 | ok |
| borrower | -0.2 | +0.5 | -3.6 | +2.9 | +2.0 | +1.0 | 35% | 0.12 | ok (1.8 below) |
| prevention-only | -0.2 | 0.0 | -2.1 | +1.5 | 0.0 | +5.0 | 100% | 0.14 | ok (2.3 below) |
| south-east-only | +1.3 | +2.0 | +0.2 | +3.1 | +2.0 | +5.3 | 97% | 0.03 | not above thoughtful: ok; cost 0.3 (bot fix needed, see spec) |
| ignore-places | +1.2 | +1.6 | -0.2 | +2.8 | +1.6 | +4.1 | 90% | 0.07 | ok; cost 0.8 at the median, 0.6 at p10 |
| no-contingency | +1.6 | +2.0 | -0.2 | +3.5 | +2.2 | +4.5 | 88% | 0.07 | ok; cost 0.3 at the median, 0.6 at p10 |
| end-game-dumper | +1.5 | +1.9 | -0.1 | +3.2 | +2.1 | +3.5 | 78% | 0.03 | ok; cost 0.4 |
| flow-greedy (diagnostic) | +1.7 | -0.2 | -2.9 | +2.4 | +2.8 | -0.2 | 8% | 0.01 | chasing Lived now costs 2.5 pips through Left |

Other checks, 200 seeds:

- Thoughtful minus caretaker on the same seed: median +5.0, p10 +3.1 (target at least +4, and p10 at
  least +2): ok. Before: +3.0. That is two bands apart, where before it was a fraction of one.
- Lived is the lower in 78 per cent of thoughtful games (target 50 to 80: ok, but near the edge) and
  Left is the lower in 73 per cent of average games (target at least 60: ok). Before, Lived was the
  lower in 99 to 100 per cent of thoughtful games.
- Ceiling: best of 5,000 random-search games +3.8 (target at most +6: ok). No random-search game
  reaches A gift (+4); the thoughtful bot's 90th percentile is +3.5, so A gift is rare and just
  within reach of better play than the bot's.
- Trust: thoughtful play loses the seat in 1 game in 100, the caretaker in about half its games,
  growth-only in every game. Well grades per game: thoughtful 3.6, average 1.6.

## What is still weak, honestly

- **Lived share, 78 per cent.** Good play is still limited by Lived more often than I would like.
  The next lever is the thoughtful bot's own weights (it values flow twice as much as stock) and the
  preparation rule, not more tuning.
- **One-habit costs are small** (0.3 to 0.8 of a pip at the median). I have accepted this and changed
  the target: see the reasons in `balance-decision.md`. The south-east-only figure means nothing
  until the thoughtful bot really rotates regions.
- **The engine still scores levels.** Resolved: the engine now judges the change (see "Decision 14 in the engine" below), and the bots test is restated in net pips.
- **Welsh.** Eight new shock notes in `model/curveballs.yaml` are drafts marked `cy_review`.

## Decision 14 in the engine (results, 200 seeds, 30 runs)

Implemented: the judged result (change since 2026 in net strand pips, Lived over terms 2 to 6 with the
dip rule, Left as change in stock level), letter bands from `judged_change`, the landed-and-reached
preparation rule, region rotation in the thoughtful bot (a region with no card last term gets one now,
by moving a chosen regional card, adding one or swapping the least valuable choice), and the card-use
check as plays per game. `npx tsx scripts/balance.ts --seeds 200 --runs 30 --ceiling 5000`:

| Bot | Median | p10 | p90 | Lived | Left | Lived lower | Neglect region-terms | Prepared shocks | Target |
|---|---|---|---|---|---|---|---|---|---|
| caretaker | -2.8 | -4.5 | -1.5 | -1.8 | -2.3 | 39% | 9.2 | 53% | -3.5 to -1.5: ok |
| careless | -6.8 | -9.4 | -4.3 | -3.2 | -6.8 | 5% | 10.9 | 43% | -10 to -4: ok |
| average | -0.6 | -3.5 | +1.9 | +1.4 | -0.3 | 26% | 6.2 | 66% | -1 to +1: ok |
| thoughtful (rotates) | +0.2 | -2.0 | +2.3 | +1.4 | +0.8 | 44% | 0.5 | 66% | +1.5 to +3.5: MISS |
| thoughtful without rotation (diagnostic) | +2.3 | +0.3 | +3.5 | +2.5 | +4.1 | 77% | 9.6 | 65% | (would pass) |
| growth-only | -5.7 | | | | | | | | 1.5 below thoughtful: ok |
| green-only | -4.2 | | | | | | | | ok |
| borrower | -3.2 | | | | | | | | ok |
| prevention-only | -0.8 | | | | | | | | MISS (1.0 below) |
| south-east-only | +1.9 | +0.2 | +3.1 | | | 96% | 10.2 | | not above thoughtful +0.3: MISS (1.8 above) |
| ignore-places | -0.4 | -2.3 | | | | | | | ok (costs 0.6 at the median, 0.3 at p10) |
| no-contingency | +0.1 | -2.6 | | | | | | | ok (0.0 median, 0.6 p10) |
| end-game-dumper | -0.1 | -2.1 | | | | | | | ok (0.3, 0.1) |

- Thoughtful minus caretaker, same seed: median +3.0, p10 +0.9 (target +4 and +2): miss.
- Lived the lower in 44% of thoughtful games (target 50 to 80): miss, close. Left the lower in 75% of
  average games (target at least 60): ok.
- Ceiling: best of 5,000 random-search games +4.0 (at most +6): ok; A gift reached in 0.0% (under 5): ok.
- Card use, plays per game in the top decile of random games: 0.62 to 1.42, all within 0.2 to 1.6: ok.
- Preparation: shocks met prepared fell from about 85 per cent to 53 to 66 per cent.

**Finding: rotating regions costs about two net pips, and concentrating on the South East wins.**
The rotation works (neglect falls from about ten region-terms a game to 0.5), but every card moved to
Mid or the North is diluted by population weighting, so the thoughtful bot drops from +2.3 to +0.2,
and south-east-only (+1.9) beats it by 1.8 pips despite ten neglect penalties. Tried and reverted, as
tune values cannot close it: Trust `neglect` -8 (south-east-only still +1.4 against -0.1; it only
costs it 0.5 lost terms) and `regional_size_step` 2 (lifts every regional play; south-east-only
still 1.3 ahead). No YAML values were changed in this round. The counterweight the design relies on,
`equal` being unweighted, does not bite: its gap components are measured on the five worst-off
authorities, four of which are in the South East, and no card moves `deprivation`, the only
unweighted-by-place component. Options for the design lead: weight some strands by region rather than
by population (each region a quarter), add a "spread" component to `equal` or `cohesive` (share of
regions that gained), or make Trust neglect bite on the card limit. Any of these needs a design
decision, not tuning.

---

# Design lead's decision 15, 27 November 2026: a national card reaches every region

*Decision and engine spec: `balance-decision.md`, "Balance decision 15".
Check: `npx tsx scripts/balance.ts --seeds 200 --runs 30`.*

## Reasoning

The engine lead found that the rotating thoughtful bot scores +0.2 and south-east-only +1.9, and put
it down to population weighting. I tested three explanations.

| Test | What changed | Result |
|---|---|---|
| Depth by region size | Regional cards: no size step in the South East, one in North and South West, two in Mid | Rotating thoughtful -0.5, south-east-only +1.4: the gap stays 1.9. Every bot falls about 0.6. |
| Cohesive counted by region | Each region a quarter in the cohesive strand (estimated by `scripts/region-probe.ts`, 60 seeds) | South-east-only falls 0.3, rotating thoughtful 0.1. |
| National cards count for neglect | `national_counts_for_neglect: true` | A player who does not force rotation has 0.2 neglected region-terms a game and scores +2.3; south-east-only +2.0. |

So the two pips are the price of obeying a rule that asked for two region-specific cards a term and
counted national cards for nobody, which crowds out the national cards that build Left (Left +4.1
without rotation, +0.8 with). The fix is to the rule: nothing landing in a region for two terms is
neglect; a national card lands everywhere. Population weighting stays, because it is true that half
of Wales lives in the South East, and weighting whole strands by region would count a person in
Powys seven times a person in Cardiff.

## Numbers (200 seeds, 30 runs, net strand pips since 2026)

Before is the engine lead's table above. After is with 15a switched on for the run. It is left off
in the repository until the bot fix lands, because with it on one bots test fails (the average bot
passes the still-rotating thoughtful bot on the test's 16 seeds); `npm test` is green as committed. The thoughtful bot still forces rotation
until the engine fix in the spec, so `thoughtful-no-rotate` shows what thoughtful play becomes.

| Bot | Before | After | Lived | Left | Lived lower | Lost terms | Neglect region-terms | Target |
|---|---|---|---|---|---|---|---|---|
| caretaker | -2.8 | -2.8 | -1.8 | -2.3 | 39% | 0.12 (was 0.53) | 1.9 (was 9.2) | -3.5 to -1.5: ok |
| careless | -6.8 | -7.0 | -3.4 | -7.0 | 5% | 0.65 | 4.9 | -10 to -4: ok |
| average | -0.6 | -0.2 | +1.6 | +0.1 | 30% | 0.03 | 0.3 | -1 to +1: ok |
| thoughtful (bot still forcing rotation) | +0.2 | +0.2 | +1.4 | +0.9 | 45% | 0.00 | 0.0 | +1.5 to +3.5: miss until the bot fix |
| thoughtful-no-rotate (what it becomes) | +2.3 | +2.3 | +2.5 | +4.4 | 81% | 0.00 | 0.2 (was 9.6) | +1.5 to +3.5: ok |
| south-east-only | +1.9 | +2.0 | +2.0 | +5.5 | 98% | 0.00 | 0.1 | not above thoughtful: ok against +2.3 (0.3 below) |
| prevention-only | -0.8 | -0.7 | -0.5 | +1.0 | 79% | 0.03 | 0.2 | 1.5 below thoughtful: ok against +2.3; it also inherits the forced rotation |
| growth-only | -5.7 | -5.7 | | | | 0.21 | 1.0 | ok |
| green-only | -4.2 | -4.2 | | | | 0.14 | 0.8 | ok |
| borrower | -3.2 | -3.1 | | | | 0.01 | 0.3 | ok |

- Thoughtful minus caretaker: +3.1 with the bot as it is; about +5 once it stops forcing rotation
  (+2.3 against -2.8).
- Lived is the lower in 81 per cent of `thoughtful-no-rotate` games (target 50 to 80): one point
  over, the same weak spot as in decision 14. The 44 per cent the engine lead saw was an effect of
  forced rotation emptying Left.
- The one-habit bots (ignore places, no contingency, end-game dumper) are all built on the rotating
  bot, so their figures (-0.3, +0.1, -0.1) are depressed in the same way and need rerunning after
  the fix.

## What this does not do, honestly

Concentrating on the South East is no longer ahead, but it is only 0.3 of a pip behind. The score
does not punish it, because under population weighting it is not wrong: it reaches half of Wales and
most of the worst-off authorities. What it costs is said in words: the uneven-hand letter (engine
spec, point 2) and the map. Trust neglect is now rare for any player who plays national cards, so
Trust is checked mainly by pips lost, broken pledges, gaps widening and shocks.

## Decision 15 in the engine (results, 200 seeds, 30 runs)

Implemented: `trust.national_counts_for_neglect: true` (15a); the thoughtful bot's rotation uses the
engine's rule (a national play counts for all four regions), so it no longer pushes out national
programmes; the `thoughtful-no-rotate` diagnostic is deleted; the uneven-hand letter fires when a
region got no regional card of its own in the whole game, or one region took more than two thirds of
regional plays, and names the overlooked region (ties to the more populous); the rule sentence is
`game.trust.neglect_note` and i18n keys `engine.rule.neglect`, `engine.trust.reason.neglect` in
`model/i18n/{en,cy}/engine.json`. No YAML tune values changed in this round: every target holds.

| Bot | Median | p10 | p90 | Lived | Left | Lived lower | Lost terms | Neglect region-terms | Target |
|---|---|---|---|---|---|---|---|---|---|
| caretaker | -2.8 | -4.5 | -1.5 | -1.8 | -2.3 | 39% | 0.12 | 1.9 | -3.5 to -1.5: ok |
| careless | -7.0 | -9.4 | -4.4 | -3.4 | -7.0 | 5% | 0.65 | 4.9 | -10 to -4: ok |
| average | -0.2 | -2.7 | +2.0 | +1.6 | +0.1 | 30% | 0.03 | 0.3 | -1 to +1: ok |
| thoughtful | +1.8 | -0.4 | +3.4 | +2.2 | +3.2 | 68% | 0.00 | 0.0 | +1.5 to +3.5: ok |
| growth-only | -6.2 | | | | | | 0.23 | 1.6 | 1.5 below thoughtful: ok |
| green-only | -4.0 | | | | | | 0.14 | 1.0 | ok |
| borrower | -0.7 | | | | | | 0.03 | 0.4 | ok (2.5 below) |
| prevention-only | -0.1 | | | | | | 0.04 | 0.2 | ok (1.9 below) |
| south-east-only | +2.0 | +0.3 | +3.2 | | | 98% | 0.00 | 0.1 | at most thoughtful +0.3: ok (+0.2) |
| ignore-places | +1.2 | -0.9 | | | | | 0.01 | 0.0 | ok (costs 0.7 median, 0.5 p10) |
| no-contingency | +1.8 | -0.8 | | | | | 0.00 | 0.0 | ok (0.0 median, 0.5 p10) |
| end-game-dumper | +1.5 | -0.7 | | | | | 0.01 | 0.0 | ok (0.3, 0.3) |

- Thoughtful minus caretaker, same seed: median +4.4, p10 +2.3 (target +4 and +2): ok.
- Lived the lower in 68% of thoughtful games (50 to 80): ok. Left the lower in 71% of average games (at least 60): ok.
- Ceiling: best of 5,000 random-search games +4.0 (at most +6): ok; A gift reached in 0.0% (under 5): ok.
- South-east-only now scores level with thoughtful play (+0.2 at the median, worse at p10 by 0.7):
  concentrating no longer wins, and the uneven letter answers it.
- `src/engine/bots.test.ts` now plays 40 seeds (6 runs each): at 16 seeds the borrower's gap to
  thoughtful play (2.5 pips at 200 seeds) read as 0.6.

## Playtest 1 fixes in the engine (results, 200 seeds, 30 runs)

Engine and model changes from `docs/design/playtest-1.md` (items 1 to 7 for the engine): visits graded
by tests held (all well, any adequately, none poorly) with an explanation per test; Rhondda exposure
needed scales with the threads the money covers and lifelines needs half of the top-risk lifeline tips
covered; tips made safe stay stitched and drop a risk step; a trigger card offers a visit only where it
landed; the letter's archetype follows the result band and names two ledger things; slips cover the
strands whose pips moved and every landed shock; each shock at most once a game; the pledge rotates;
voices do not repeat while fresh ones remain; R20 reads the Welsh-speaker share by change from 2021
(the band's goal is 33 per cent, so heartland scores sat at the clamp and read as below half in 2030).

YAML tune values changed, and why:

| # | Change | From | To | Why |
|---|---|---|---|---|
| P1a | `trust.debt_interest` | -2 | -4 per token per term | Three debts held Trust at Fair all game in the careless playtest. |
| P1b | `trust.repairs_overdue` (new) | none | -5 per overdue deferral per term | Repairs put off never showed during play. |
| P1c | `trust.first_term_floor` (new) | none | 45 | The guided first term dropped Trust to Thin in two of three playtest games. |
| P1d | `defer-maintenance` effects: `access` -S until repaired (a repair reverses every effect of the ticket) | none | -S | A strand cost the player sees on the row as soon as repairs are put off. |

| Bot | Median | p10 | p90 | Lived | Left | Lived lower | Target |
|---|---|---|---|---|---|---|---|
| caretaker | -2.3 | -4.4 | -1.0 | -0.9 | -2.1 | 28% | -3.5 to -1.5: ok |
| careless | -6.6 | -9.5 | -3.8 | -2.1 | -6.6 | 3% | -10 to -4: ok |
| average | +1.0 | -1.7 | +3.1 | +2.7 | +1.2 | 24% | -1 to +1: ok (at the edge) |
| thoughtful | +2.4 | +0.4 | +4.0 | +2.9 | +3.7 | 65% | +1.5 to +3.5: ok |
| growth-only | -5.8 | | | | | | 1.5 below thoughtful: ok |
| green-only | -3.9 | | | | | | ok |
| borrower | -0.1 | | | | | | ok (2.5 below) |
| prevention-only | +0.7 | | | | | | ok (1.7 below) |
| south-east-only | +2.7 | +0.9 | +3.7 | | | 95% | at most thoughtful +0.3: ok (+0.3) |
| ignore-places | +2.2 | +0.2 | | | | | ok (costs 0.2) |
| no-contingency | +2.7 | +0.8 | | | | | ok (+0.3) |
| end-game-dumper | +2.2 | +0.1 | | | | | ok (costs 0.2) |

- Thoughtful minus caretaker, same seed: median +4.7, p10 +2.9: ok.
- Lived the lower in 65% of thoughtful games; Left the lower in 76% of average games: ok.
- Ceiling +3.9, A gift 0.0%: ok. Card use 0.71 to 1.51 plays per game in the top decile: ok.
- Watch: average sits at the top edge of its band (+1.0), and south-east-only and no-contingency at
  the +0.3 allowance. Fairer visit grades lifted every visiting bot; the caretaker never visits.

## Playtest 2 fixes in the engine (results, 200 seeds, 30 runs)

Engine and model changes from `docs/design/playtest-2.md`: slips agree with tickets (no card named before
its first effects land, except a printed side effect that lands at once; none for a strand its ticket
does not show; a temporary hit wearing off is recovery; every landed shock has a slip with what the
response bought; each slip carries its own thread); `Card.helps` lists every strand a card moves and
`Card.mixed` the ones it can move either way; staged arrival (`Card.arrival`, `PostItem.firstTerm`);
the jobs ripple starts when a card's first effects land; returned cards are shuffled and a recent hand
is not dealt again; no voice repeats in a game; a place graded well twice runs itself; Bethesda counts
earlier threads; voices that name a choice are gated on it; the letter leads with promises when every
one was kept; `EndResult.worstFell`.

| # | Change | From | To | Why |
|---|---|---|---|---|
| P2a | `debt.left_penalty`, cap (and R35) | 0.15, 0.45 | 0.2, 0.6 | After the fixes Left was the lower in 59% of average games (target at least 60): the average bot borrows once and never repays. |

| Bot | Median | p10 | p90 | Lived | Left | Lived lower | Target |
|---|---|---|---|---|---|---|---|
| caretaker | -2.4 | -3.8 | -1.1 | -1.2 | -2.2 | 36% | -3.5 to -1.5: ok |
| careless | -7.2 | -10.1 | -4.4 | -2.3 | -7.2 | 1% | -10 to -4: ok |
| average | +0.5 | -2.2 | +2.4 | +1.8 | +0.9 | 38% | -1 to +1: ok |
| thoughtful | +2.0 | +0.1 | +3.5 | +2.5 | +3.8 | 73% | +1.5 to +3.5: ok |
| growth-only, green-only, borrower, prevention-only | -5.7, -3.9, -0.6, -0.0 | | | | | | at least 1.5 below thoughtful: ok |
| south-east-only, ignore-places, no-contingency, end-game-dumper | +2.0, +1.7, +2.0, +1.8 | | | | | | at most thoughtful +0.3: ok |

- Thoughtful minus caretaker, same seed: median +4.3, p10 +2.5: ok.
- Lived the lower in 73% of thoughtful games; Left the lower in 63% of average games: ok.
- Ceiling +4.1, A gift 0.1%: ok. Card use in the top decile within 0.2 to 1.6 plays per game: ok.

## Playtest 3 fixes in the engine (results, 200 seeds, 30 runs)

Engine changes from `docs/design/playtest-3.md`: per-card previews are paired marginals at the card's
own landing (flow and stock), with this term's change, landing term and year, and an after-2050 flag;
an invitation comes from the card that triggered it and names it, with the other place as a choice
when both are asked for, and the first game's script never overrides a card; two tests of three held
grade well; the promise result is always the first Trust reason; a shock's response is reported from
the term it landed; no held or unexpected slip for a strand that moved, nor the same one two terms
running; the last hand always holds a card that lands by 2050. No YAML values changed: every target holds.

| Bot | Median | p10 | p90 | Lived | Left | Lived lower | Target |
|---|---|---|---|---|---|---|---|
| caretaker | -2.4 | -3.8 | -1.1 | -1.2 | -2.2 | 36% | -3.5 to -1.5: ok |
| careless | -7.2 | -10.1 | -4.4 | -2.3 | -7.2 | 1% | -10 to -4: ok |
| average | +0.8 | -1.7 | +2.7 | +2.0 | +1.1 | 40% | -1 to +1: ok |
| thoughtful | +2.1 | +0.2 | +3.5 | +2.5 | +3.8 | 73% | +1.5 to +3.5: ok |
| growth-only, green-only, borrower, prevention-only | -5.7, -3.9, -0.6, +0.0 | | | | | | at least 1.5 below thoughtful: ok |
| south-east-only, ignore-places, no-contingency, end-game-dumper | +2.0, +1.7, +2.1, +1.8 | | | | | | at most thoughtful +0.3: ok |

- Thoughtful minus caretaker, same seed: median +4.3, p10 +2.5: ok.
- Lived the lower in 73% of thoughtful games; Left the lower in 61% of average games: ok.
- Ceiling +4.1, A gift 0.1%: ok. Card use in the top decile within 0.2 to 1.6 plays per game: ok.
- With majority grading the average bot earns about three well grades a game (was 1.4) and sits at +0.8,
  near the top of its band.

## Playtest 4 fixes in the engine (results, 200 seeds)

Engine changes from `docs/design/playtest-4.md`: a very well grade when every test holds with room to
spare (`grade_multiplier.very_well: 1.7`, `trust.visit.very_well: 8`, margins in `model/places/*.yaml`);
a caretaker term returns Trust no higher than Thin (`caretaker.return_trust_max: 44`); the scripted
Recession never also lands the term before, so no shock lands twice in two terms running; the last hand
always holds a card that lands in full by 2050 and works alone; a preview move under a pip against the
card's own ticket reads as nothing. No other values changed: every target holds.

- Thoughtful +2.0, caretaker -2.4, careless -7.2. Thoughtful minus caretaker, same seed: median +4.3, p10 +2.5.
- Lived the lower in 66% of thoughtful games; Left the lower in 64% of average games.
- No-contingency sits exactly at its +0.3 limit.

Open question: Early years previews a small fall in More equal because Blaenau Gwent and Newport are both
among the five worst-off places and among the middle authorities the gaps are measured from. Measuring the
gap from a middle that excludes the worst five fixes the cause, but moves every bot's Lived up by 1 to 2
pips and breaks two targets, so it waits for a retune.
