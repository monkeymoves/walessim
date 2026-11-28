/**
 * The first-minute guide's rules (v2-board.md 11.1, playtest 8 should fix 4), pure so they can be
 * tested. Three notes: the map, the council, the build menu. A note is shown only while the thing
 * it talks about is on screen: the council note never talks about bars with no council open, and
 * no note is shown over a sheet it does not describe (so none covers the Build button). "Got it"
 * moves past the note that is showing; doing what a note asks moves on too.
 *
 * Pause and speed are taught by the clock itself (Clock.tsx), the first time time runs, whether
 * or not the guide was skipped.
 */

export const GUIDE_NOTES = ["map", "council", "build"] as const;
export type GuideNote = (typeof GUIDE_NOTES)[number];
export const GUIDE_DONE = -1;

export interface GuideCtx {
  /** A council is selected, so its bars and its Build button are on screen. */
  selected: boolean;
  /** The build menu is open. */
  buildOpen: boolean;
  /** Anything else is over the board: another sheet, Why?, a visit, a warning, a stop, an answer. */
  otherOpen: boolean;
  /** The player has built something. */
  built: boolean;
}

const fits: Record<GuideNote, (c: GuideCtx) => boolean> = {
  map: (c) => !c.selected && !c.buildOpen,
  council: (c) => c.selected && !c.buildOpen,
  build: (c) => c.buildOpen,
};

/** The note to show at guide position `n`, or null: the first note from `n` on whose subject is on screen. */
export function guideNote(n: number, c: GuideCtx): { note: GuideNote; index: number } | null {
  if (n < 0 || c.otherOpen || c.built) return null;
  for (let i = n; i < GUIDE_NOTES.length; i++) {
    const note = GUIDE_NOTES[i]!;
    if (fits[note](c)) return { note, index: i };
  }
  return null;
}

/** Where the guide goes when the player does something: on past what they did, or done once they have built. */
export function guideAfter(n: number, c: GuideCtx): number {
  if (n < 0) return n;
  if (c.built) return GUIDE_DONE;
  if (c.buildOpen) return Math.max(n, 2);
  if (c.selected) return Math.max(n, 1);
  return n;
}

/** "Got it" on the note showing at `index`: the next note, or done after the last. */
export const guideGotIt = (index: number): number => (index + 1 >= GUIDE_NOTES.length ? GUIDE_DONE : index + 1);
