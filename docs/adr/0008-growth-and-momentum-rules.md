# 0008: Growth, momentum and ways back are rule cards switched on one at a time

*28 November 2026. Accepted. Design: `docs/design/v2-board.md` sections 16.3 to 16.5. Builds on ADR 0002 (rules as data) and ADR 0005 (spread and requires).*

**Context.** Phase 1 measured a board where nothing the player did showed in the result: projects too small, a slide no choice could stop, focus punished, a lost election a doom spiral, and no reason to plan (16.1). The fixes are new mechanics: things grow, places tip, a lost election becomes a deal, and the game writes chapters. Five agents build them at once against one contract, and the game must keep working at every step of the way.

**Decision.**

- **Every new size is a rule card.** New cards, all `game_rule: true`, `evidence: placeholder`, with a plain note, in `model/board/rules/growth.yaml` (R1 to R4, package 8) and `rules/people.yaml` (E2, P6, package 9):
  - R1 roots: each working project's `roots` factor starts at 1 and grows each step, faster when it is joined (16.3.2).
  - R2 momentum: when a year closes a council is rising, steady or slipping against four years before, with two edges so it tips rather than wobbles (16.3.3).
  - R3 fresh start and R4 need: a first project in a slipping or low council costs less and counts as joined; a lift does more where the real 2026 figure is worst (16.3.2, 16.4).
  - E2 rebuild: after a severe event, builds there take half the time for a while (16.4).
  - P6 hung term: a lost election offers two deals with councils, instead of taking coins (16.4). It replaces B3.
- **Optional until present.** `RULE_IDS` names the new ids; `OPTIONAL_RULE_IDS` lists them and `REQUIRED_RULE_IDS` is the rest. The build and the cross checks require only the required ids. Engine code reads a phase 2 param with `optParam` or `ruleParam`, never `param`, so a model without the card behaves exactly as phase 1 did and the fixture tests keep passing.
- **Typed hooks the clock already calls.** `growRoots` and `freshStartHere` (roots.ts), `updateMomentum` (momentum.ts), `offerDeals`, `judgeDeals`, `dealBlockers`, `takeDeal` (deals.ts), `noteStep`, `nameChapter`, `story` (story.ts) and `timeline` (timeline.ts) exist with empty-safe bodies. Packages 8 and 9 fill the bodies; the signatures, the state fields (`ProjectState.roots`, `joined`, `CouncilState.momentum`, `BoardState.deals`, `story`), the `deal` action and pending, and the stops (`tipping`, `deal_due`, `chapter`, `purse_full`) are settled now.
- **Chapters are data.** `model/board/story.yaml` holds chapters with term conditions (`ChapterDef`, `TermCondition`). Until it is written every term is named by the fallback, "holding-on", and the build lists it to check.
- **The clock reports, the story weighs.** The clock builds `StepFacts` each step (what finished, landed, opened, tipped, the election, the chapter) and hands it to `noteStep`; moments and turning points are story.ts's.

**Consequences.** The board can be balanced card by card (16.7 order of blame), and each card can be read in the rule book as a game rule. A new mechanic that is not a card, or that reads a required param it may not have, breaks the fixture tests; that is on purpose. The cost is a few empty hooks in the engine until packages 8 and 9 land.
