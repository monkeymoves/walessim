// Types for board-cy-lib.mjs, so tests/e2e/board-cy.spec.ts can import it.
export interface EnglishOnly { exact: Set<string>; patterns: RegExp[] }
/** Every English-only string of the board, from the copy files and the built model. */
export function englishOnly(root: string): EnglishOnly;
/** Faults in one Welsh screen line: English left, a name not mutated, an article not joined. */
export function welshFaults(line: string, eng: EnglishOnly): string[];
