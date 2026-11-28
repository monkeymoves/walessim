# 0005: Two new rule kinds for the board, `spread` and `requires`

*27 November 2026. Accepted. Applies to the board route (`#/bwrdd`) only; v1's rules and kinds are unchanged.*

**Context.** ADR 0002 fixes the rule kinds and says a new kind needs an ADR. The board (`docs/design/v2-board.md`) needs two relationships the six kinds cannot say plainly:

1. An effect that **travels along a real link** from one council to another (rules S1 to S4: jobs travel home, prices travel up the line, young people follow work and homes, water runs downhill).
2. A project, a tier or a level that is **open only when something else stands** (tier gates, "needs a rail line", "a keystone must start by 2042").

Both could be faked with `linear` and `threshold` cards plus code, but then the Why? chain would end in code, not at a rule page, and the rule book could not show them.

**Decision.** The board's rule cards (`model/board/rules/*.yaml`, type `BoardRule` in `src/board/engine/types-model.ts`) use the ADR 0002 kinds `linear`, `saturating`, `stock` and `threshold`, plus:

| Kind | Meaning | Data |
|---|---|---|
| `spread` | A change in `input` at one end of a link moves `output` at the other end, one hop only, `lag` turns later, weighted by the link (the real commuting share, a fallback strength step, or 1) and, for rail, its quality. | A `spread` block: link kinds, direction of travel (`to_home`, `to_work`, `towards_better`, `downstream`, `both_ways`), input, output, sign, weight, lag, the project tags that block it at the receiving end, and whether only project-made changes count. Sizes are params with ranges. |
| `requires` | Something must hold on the board before a project, tier or level opens. | A `requires` block: what it applies to (project, branch and tier, level) and a list of `Condition`s from a fixed vocabulary (feature, flag, tier open, projects counted here, within a link or anywhere, link quality, risk step, measure, share, backing, track, year, law). |

Rules:

- **One hop only.** A spread effect reaches direct neighbours on a link and stops. Two hop chains happen across turns. This keeps every change traceable to "your project in X, along link Y".
- **No free text, no formulas.** Conditions and effects are tagged unions with fixed kinds. Special keystone mechanics are a closed list (`EffectSpecial`), each named in the design.
- **Tier gates are rule cards.** `tree.yaml` writes each tier's `opens` conditions inline; the build turns each into a `requires` card with id `need:<branch>:<tier>` so a locked project's "why not" ends at a rule page. A project's own `needs` are checked the same way.
- **Engine reads rules by id.** The ids and param names the engine depends on are listed in `RULE_IDS` (`types-model.ts`). Tuning changes YAML, never code.
- Every card still carries sources, confidence, evidence grade, and `game_rule: true` where the size is a design choice. Spread strengths are mostly "a rough guess" and say so.

**Consequences.** The rule book can render spread and requires cards like any other. `src/board/model/` checks both shapes, and `crossCheck` fails the build when a card the engine needs is missing or a reference does not resolve. Anything that cannot be said in these kinds needs another ADR.
