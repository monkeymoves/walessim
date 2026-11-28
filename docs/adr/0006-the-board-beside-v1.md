# 0006: The board sits beside v1, with two-year turns and per-council state

*27 November 2026. Accepted. Amends ADR 0004 for the board route only.*

**Context.** v1 (`#/yfory`) is live, public and tuned. The board (`docs/design/v2-board.md`) changes the turn, the unit of state and the action model. Changing v1 in place would break saved games, the balance work and the playtest history, and six agents build the board at once.

**Decision.**

- **Beside, not inside.** The board lives under `src/board/` (engine, model loader, UI) and `model/board/`, at route `#/bwrdd`. v1 is frozen: no board work edits `src/engine/`, `src/ui/game/`, `src/ui/end/`, `model/cards.yaml`, `model/curveballs.yaml`, `model/rules/` or `model/game.yaml`. The only shared v1 files are listed in v2-board.md section 12, each with one owner, and changes there only add lines.
- **Imports one way.** `src/board/engine` imports only itself, `src/engine/rng.ts` and `src/engine/places.ts`. `src/board/ui` reaches the engine only through `src/board/engine/api.ts`. `src/board/model` imports only itself and the engine's type files. Nothing in v1 imports the board except the one route line in `src/ui/shell/App.tsx`. `src/board/boundaries.test.ts` checks all of this.
- **Two-year turns.** The board has twelve turns from 2026 to 2050. Delays count in turns of two years. Elections in 2030, 2034, 2038, 2042 and 2046 (the real Senedd calendar) fall at the end of every second turn. v1 keeps its six four-year terms (ADR 0004).
- **Per-council state.** The board's state is held per council: six measures (0 to 10), people and their shares, Backing, three risk steps, standing projects, plus rail link quality. Wales level readings (Fairness, the two scores) are computed from councils, never stored as their own stocks. The prototype plays ten South East councils; the model holds all 22 so later regions are data.
- **Plain data, replayable.** `BoardState` is JSON. It holds the game number, the start and every step; replaying the steps from the game number gives a byte equal state. That is the save format, the run code and the determinism test in one. Saves use their own key prefix, `etifeddiaeth.board.v1.`, set and removed singly.
- **Its own compiled model.** `scripts/build-board-model.ts` writes `public/board-model.json` (type `BoardModel`), versioned by `meta.version`. Only `src/board/model/` knows its format. A three council fixture (`src/board/engine/fixture.ts`) lets engine and UI work start before the real data lands.

**Consequences.** v1 keeps working and keeps its tests. Two models and two engines exist for a while, and the board reuses v1 pieces (the map, place grading, i18n, parts) by import, never by copy or edit. If the board passes the bar in v2-board.md section 13 on all of Wales, v1 becomes "the short game".
