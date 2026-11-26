// Screen width signals. Under 900 px wide the game asks for a bigger screen and the atlas
// stacks into one column.
import { createRoot, createSignal } from "solid-js";

export const NARROW_QUERY = "(max-width: 899px)";

const narrow = createRoot(() => {
  const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(NARROW_QUERY) : null;
  const [isNarrow, setNarrow] = createSignal(mq?.matches ?? false);
  mq?.addEventListener("change", (e) => setNarrow(e.matches));
  return isNarrow;
});

/** True under 900 px wide (reactive). */
export function useNarrow(): () => boolean {
  return narrow;
}
