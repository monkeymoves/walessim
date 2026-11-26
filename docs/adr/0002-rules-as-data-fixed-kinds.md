# 0002: Rules are data, in a fixed vocabulary of kinds

*26 November 2026. Accepted.*

**Context.** The relationships in the model will be argued about. People must be able to find, read and change them without reading code, and the game must show them ("pull the thread").

**Decision.** Every relationship is a YAML rule card under `model/rules/`, with `id`, bilingual name and plain-words note, `kind`, inputs, output, parameters (default, range, unit, adjustable), lag, `sources`, `confidence` (high, medium, low) and `evidence` (assessed, published, expert, placeholder). The engine supports only these kinds:

| Kind | Meaning |
|---|---|
| `linear` | output changes by `coef * input` (optionally per LA), after `lag` terms |
| `saturating` | as linear, but the effect flattens towards a ceiling |
| `stock` | a stock with inflows and outflows per term, including slow decay or ageing |
| `threshold` | when an input crosses a level, trigger an effect or an event |
| `fcm` | the SoNaRR nature model: pressures move ecosystem condition through the Fuzzy Cognitive Map |
| `io` | spending in a sector creates jobs and GVA through the 2022 input-output multipliers (near term only) |

No free-text equations and no expression parser. A new kind needs an ADR.

**Consequences.** Every rule renders automatically as a sentence and an equation in the model book. Validation is strict and simple. Some subtle relationships will be approximated by these kinds; that is visible and arguable, which is the point.
