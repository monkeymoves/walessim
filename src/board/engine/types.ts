/**
 * Every shared type of the board (docs/design/v2-board.md sections 4 to 8, 11 and 16), owned by
 * package 7 (the contract and the clock, ADR 0007). Engine modules import from here; the UI imports
 * the same names from `./api`.
 *
 * Split by subject to keep files small:
 * - types-model.ts: ids, text, councils, links, bands, rule cards, the calendar and the step
 * - types-content.ts: conditions, effects, projects, tree, pairs, laws, groups, places
 * - types-story.ts: events, futures, starts, endings, letters, chapters, `BoardModel`
 * - types-state.ts: `BoardState`, actions and the log, explanation records, frames, deals, the story
 * - types-views.ts: what the API returns (options, previews, reports, Why?, forecasts, views, the ending)
 * - types-clock.ts: the calendar, seasons, stops, step and term reports, the time line, momentum, deals and the story
 */
export * from "./types-model";
export * from "./types-content";
export * from "./types-story";
export * from "./types-state";
export * from "./types-views";
export * from "./types-clock";
