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
