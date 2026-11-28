/**
 * Where a needs-you target is on screen, and where the focus goes when the player asks for it
 * (v3-wales.md section 2). Each screen marks its own target with a data attribute, so the outline
 * finds it by what it is, not by its look:
 *
 * - `data-needs="answers"` the event card's answers (Respond.tsx), `"deals"` the deals to pick
 *   (DealChoice.tsx), `"visit-offer"` Go and visit with Carry on on a visit card (StopCard.tsx),
 *   `"visit"` a place visit's choices or its Done (place/), `"carry-on"` a card's
 *   Carry on (StopCard.tsx, TermReport.tsx), `"play"` and `"next"` the clock (Clock.tsx);
 * - `data-needs-close="<reading>"` on a sheet, Why?, a warning or a past term report: its first
 *   Close button is the target;
 * - `data-needs-card` on a card: asked for a card's target, the focus lands on the card's heading
 *   (its `aria-labelledby`), never on a button that answers (cold playtest 10, must fix 10).
 */
import type { NeedsTarget } from "./waiting";

/** Each group of answers by what it answers. */
const ANSWERS = { event: "answers", deal: "deals", visit: "visit-offer" } as const;

/** The CSS selector of a target's element. */
export function needsSelector(t: NeedsTarget): string {
  switch (t.kind) {
    case "answers": return `[data-needs="${ANSWERS[t.of]}"]`;
    case "visit": return `[data-needs="visit"]`;
    case "carryOn": return `[data-needs="carry-on"]`;
    case "close": return `[data-needs-close="${t.what}"] .btn-close`;
    case "play": return `[data-needs="play"]`;
    case "next": return `[data-needs="next"]`;
  }
}

const drawn = (el: Element): boolean => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** Every element on screen that is this target. The board draws exactly one (tests/e2e/board-needs.spec.ts). */
export const targetsOnScreen = (t: NeedsTarget, root: ParentNode = document): Element[] =>
  Array.from(root.querySelectorAll(needsSelector(t))).filter(drawn);

/** The target's element, or null while it is not drawn yet. */
export const findTarget = (t: NeedsTarget, root: ParentNode = document): HTMLElement | null =>
  (targetsOnScreen(t, root)[0] as HTMLElement | undefined) ?? null;

/** Move the focus to a target: a card's heading for a card, else the button itself. */
export function focusTarget(t: NeedsTarget): void {
  const el = findTarget(t);
  if (!el) return;
  const card = t.kind === "answers" || t.kind === "carryOn" || t.kind === "visit" ? el.closest("[data-needs-card]") : null;
  const headId = card?.getAttribute("aria-labelledby");
  const head = headId ? document.getElementById(headId) : null;
  if (head && !head.hasAttribute("tabindex")) head.setAttribute("tabindex", "-1");
  const to = head ?? el;
  to.focus({ preventScroll: true });
  to.scrollIntoView({ block: "nearest" });
}
