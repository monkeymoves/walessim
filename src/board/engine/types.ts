/**
 * Every shared type of the board (docs/design/v2-board.md sections 4 to 8 and 11), frozen by
 * package 0. Engine modules import from here; the UI imports the same names from `./api`.
 *
 * Split by subject to keep files small:
 * - types-model.ts: ids, text, councils, links, bands, rule cards, the calendar
 * - types-content.ts: conditions, effects, projects, tree, pairs, laws, groups, places
 * - types-story.ts: events, futures, starts, endings, letters, `BoardModel`
 * - types-state.ts: `BoardState`, actions, explanation records, frames
 * - types-views.ts: what the API returns (options, previews, reports, Why?, views, the ending)
 */
export * from "./types-model";
export * from "./types-content";
export * from "./types-story";
export * from "./types-state";
export * from "./types-views";
