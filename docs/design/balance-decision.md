# Balance decision 14: judge the inheritance by how it changed

*Design lead, 26 November 2026. Answers the three open questions in `balance-log.md`. Supersedes
game-design 5.1 (Lived, Left, result bands) and 11.2 (bot targets). Everything else in the design stands.*

## The decision

1. **The result is the change since 2026, not the level.** The game is called Inheritance and the band
   names are already about change (Diminished, Held, Handed on, Handed on better, A gift). Wales
   starts from real data and the 0 to 10 scale runs from the worst UK region to a national
   milestone, so 24 years of good government honestly moves it by a pip or two. Judging the level
   hides that under five points nobody chose. Judging the change shows only what the player did.
2. **The unit is net strand pips.** Seven times the weighted change, so "+2" reads as "two strand
   pips up, net, across the seven strands". It is the unit the player has watched all game. It is
   shown in whole pips with "about", never with a decimal.
3. **Lived counts the terms the player shaped.** The first term is inherited: its cards have not
   landed. Lived is the mean of terms 2 to 6.
4. **The worst-term rule is restated against the inheritance.** The old rule (a quarter weight on the
   worst term) punished every delayed investment, because on a rising path the worst term is simply
   the first one. Now a term only counts extra if people lived worse in it than in 2026.
5. **The result is still the lower of Lived and Left**, both as change. Nothing is relative to the
   caretaker in the score itself (the ghost depends on the seed and would add noise), but the end
   screen says how far the player finished from the caretaker's Wales on the same seed.
6. **Stocks were retuned to the same scale as flows** (done in YAML, below), so that Left does not
   run away from Lived: building what is handed on now takes sustained play.
7. **Shocks leave scars and debt is priced in pips** (done in YAML), so contingency and borrowing are
   felt in Left in 2050 and not only in a one-term dip.

Honesty rules are kept: no decimals shown, place counts never summed (the unit is strand pips, as on
the strand rows), Wales still starts from the real 2026 data, every change still has a thread.

## Engine spec (for the engine agent)

Values are in `model/game.yaml` under `judged_change`; the YAML block is already there and passes the
build. `result_bands` and `letter_bands` (old, level based) can be removed once this is in.

### Formula

Let `n` be the number of strands (7), `w_s` the weights (sum 1), `W_t` the weighted flow at the end of
term `t` (1 to 6, as now), `W_0` the weighted flow at the 2026 start, `S_0` the weighted stock at the
2026 start, `F = judged_change.lived_first_term` (2), `d = judged_change.dip_weight` (0.25).

```
counted      = W_F .. W_6
lived_level  = mean(counted) - d * max(0, W_0 - min(counted))
left_level   = weighted 2050 stocks, with cards in the post by 2058, minus the debt penalty   (unchanged)
lived        = n * (lived_level - W_0)
left         = n * (left_level  - S_0)
result       = min(lived, left)          which = "lived" if lived <= left, else "left"
```

- Compute per run exactly the same way for the p10 to p90 edge (each run against the same `W_0`, `S_0`).
- Band: the last entry of `judged_change.bands` whose `min` is at or below the value.

| Band | Net strand pips since 2026 | Name |
|---|---|---|
| 1 | below -4 | Diminished |
| 2 | -4 to below -1 | Held, just |
| 3 | -1 to below +1 | Handed on |
| 4 | +1 to below +4 | Handed on better |
| 5 | +4 and over | A gift |

- Letter archetype: `level()` uses `judged_change.letter_bands` (low below -1, high from +1) on the
  same change values.
- `EndResult`: `lived`, `left` and `result` carry the change as `value` (with `p10`, `p90`, `band`).
  Add `livedLevel` and `leftLevel` (the 0 to 10 levels) so the woven bands can still be drawn from
  real levels. `start` stays. `worstTerm` becomes the lowest of the counted terms, and add
  `dippedBelowStart: boolean`.
- `perStrand`: `lived` and `left` become the strand's own change in pips (same formula with that
  strand's flow terms and its start; no factor `n`), `lower` by change.
- `caretakerGhost`: the same three change values for the caretaker on the same seed. Add
  `vsCaretaker = result.value - caretakerGhost.result`.
- Changing the weights recomputes everything, `W_0` and `S_0` included.

### What the end screen should say (for the UI agent, wording through i18n)

- "Lived: about 2 pips up on what you inherited. Left: about 4 up. Your result is the lower: Lived,
  Handed on better." Round to whole pips; between -0.5 and +0.5 say "level with 2026".
- "A caretaker's Wales on the same seed: about 3 down. You finished about 5 pips ahead of it."
- The two woven bands stay as levels (real data), with the 2026 mark and the ghost mark. The six
  term columns grey out term 1 with the label "inherited" and mark any counted term below the 2026
  line in rust.
- Fuzzy edge: "between about 1 and 3 up" from p10 and p90.

### Bots and tests

- `scripts/balance-probe.ts` already judges games by this formula from the published end result. Once
  the engine has it, fold the probe's targets into `scripts/balance.ts` (or keep the probe and delete
  the old targets).
- `src/engine/bots.test.ts` currently fails two tests, because it compares levels under the old
  formula with the new tuning. Restate it in net pips: order careless, caretaker, average, thoughtful;
  careless below -3; growth-only and borrower at least 1.5 below thoughtful; no whole-game strategy
  above thoughtful.
- **Thoughtful bot fix needed.** It loses about as much Trust to neglect as the south-east-only bot
  (about ten region-terms a game), so its "rotates regions" habit is not working (`neglectBonus` 0.08
  is too weak). Make it give a card to any region two terms without one. Until then the
  south-east-only comparison tests nothing.
- **Preparation is too common.** A shock counts as prepared in about 85 per cent of cases, because
  any response card played in the last two terms qualifies and each curveball lists three or four.
  Proposed rule: prepared only if a response card has landed (not merely been played) in an
  authority the shock reaches. I softened the effect in YAML meanwhile (prepared multiplier 0.7).
- **Card-use check, redefined** (open question 3): count plays per game, not "played at least once".
  In the top decile of random-search games no card should average more than 1.6 plays per game or
  fewer than 0.2.

### New targets (medians over 200 seeds, net strand pips since 2026)

| Bot | Target | Band it should sit in |
|---|---|---|
| Caretaker | -3.5 to -1.5 | Held, just |
| Careless | -10 to -4 | Diminished |
| Average | -1 to +1 | Handed on |
| Thoughtful | +1.5 to +3.5 | Handed on better |
| Thoughtful minus caretaker, same seed | median at least +4, p10 at least +2 | two bands apart |
| Whole-game strategies (growth only, green only, borrower, prevention only) | at least 1.5 below thoughtful | |
| One-habit bots (south east only, ignore places, no contingency, end-game dumper) | not above thoughtful (0.3 allowed for noise); the cost is reported at the median and at p10 | |
| Ceiling, best of 5,000 random-search games | at most +6; A gift reached in fewer than 5 per cent | |
| Lived is the lower | 50 to 80 per cent of thoughtful games; Left the lower in at least 60 per cent of average games | |

Why the one-habit target is softer than the old "0.7 below": each habit is one kind of decision in a
six-term game and is honestly worth under a pip at the median. Contingency is insurance, so its value
shows in bad games (p10), not in the middle one. These habits are taught by the letter, the ledger
stamps and Trust, not by a band.

Why the Lived share target moved from 35 to 65: on a change scale a balanced builder is limited by
flows (they are slow, which is what the data says), while under-investors, borrowers and flow chasers
are limited by Left. Both ways of losing are live across styles of play, which is what the rule was
for.

## Done in YAML already

| # | Change | From | To | Why |
|---|---|---|---|---|
| 14a | Positive stock effects on cards (`model/cards.yaml`) | peat M, tips L, community energy assets M, childcare speakers M, social homes M, woodland M, health before hospital L, early years L | one size smaller each (S, M, S, S, S, S, S, M); health before hospital to S because healthier has a single stock | Thoughtful play gained about 9 net pips of Left against 1.5 of Lived, and health stock hit 10. Skills stays M. |
| 14b | Stock gains fade faster unless renewed: `outflow` on R15, R21, R33 | 0.1, 0.15, 0.05 | 0.15, 0.2, 0.1 (top of their ranges) | Left should need sustained play. |
| 14c | R10 `ageing` | -0.25 | -0.2 | No card rebuilds infrastructure, so this is a loss the player cannot answer; keep it mild. |
| 14d | Lasting scars on shocks (`model/curveballs.yaml`): a stock effect with no `duration` on eight shocks | none | M on infrastructure, health, housing, skills, community assets or river pollution, as fits the shock | An absorbed shock was a one-term dip. Now it is still there in 2050 unless the player responded. |
| 14e | `curveballs.shock_scale` | 0.5 | 1.0 | Shocks were not felt. |
| 14f | `response_multiplier.prepared` | 0.5 | 0.7 | Preparation is nearly universal (see above), so it made contingency pointless. |
| 14g | `contingency_carry` | 1 | 2 | Holding two pips back should not cost a card every term; unspent contingency comes back. |
| 14h | `grade_multiplier` | 0.6, 1.0, 1.3 | 0.5, 1.0, 1.5 | A well-handled visit should be seen on the strand row. |
| 14i | `debt.left_penalty`, cap (and R35) | 0.5, 1.5 | 0.15, 0.45 | On the change scale 0.5 was 3.5 net pips a token. Now a token left in 2050 costs about one pip of Left, three at most. |
| 14j | `judged_change` block in `model/game.yaml` | none | first term 2, dip weight 0.25, bands -4, -1, +1, +4, letter bands -1, +1 | For the engine to read. |

Not changed: effect sizes S, M, L (raising them scales trends and side effects too, so it does not
buy agency), baseline pressures, Trust numbers (neglect was tried at -7 and put back to -4, because it
punished the thoughtful bot as hard as the south-east-only bot).
