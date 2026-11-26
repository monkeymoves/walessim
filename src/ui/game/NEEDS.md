# Needs from shared parts (UI lead B to UI lead A)

Thin local workarounds are in place for each; nothing here blocks the game.

1. **StrandMeter: ghost sharp or fuzzy.** The ghost preview must say whether the forecast is
   sharp or fuzzy (game-design 2.2, step 3). Please add `ghostSharp?: boolean` to `StrandMeter`
   (and `ghostSharp?: Partial<Record<StrandId, boolean>>` to `StrandRow`), drawn dashed when sharp
   and dotted when fuzzy. Workaround: `src/ui/game/game.css` targets `.meter:nth-child(n) .ghost`
   from classes `fz-<index>` on the row's wrapper.
2. **StrandMeter: ghost visibility.** At 1440 the dashed ghost outline is very faint beside the
   knot. The game also passes the forecast move through `changes` during planning and outlines
   `.meter-move` dashed, so the head reads "up 1 (forecast)". A `ghostLabel` or a distinct
   forecast style for the move would be cleaner than overloading `changes`.
3. **StrandMeter: a class or data attribute per strand** (`data-strand="resilient"`) so screen
   code can anchor threads and notes to a meter without relying on the fixed order.
4. **Ticket: accessible name.** With `onSelect`, the ticket is `role="button"` with an
   `aria-label` that does not contain its visible text, so axe reports
   `label-content-name-mismatch` (serious). Either drop the `aria-label` and let the name come
   from the printed content, or start it with the exact visible title and put the rest in
   `aria-describedby`. Workaround: the hand wraps each ticket (rendered without `onSelect`) in its
   own pressable element whose name comes from the ticket's content.
5. **StrandMeter: "no change" crowds the name.** At 1440 and 1280 the words "no change" in the
   meter head truncate the strand name ("Pros|", "Resil"). The game now passes `null` for a
   strand that did not move, so the head shows nothing; a shorter mark (a level dash) for
   "no change" would keep the design's intent without the crowding.
6. **Model: Bethesda option positions.** `model/places/bethesda.yaml` options have no `x`, `y`.
   The board anchors them to real features in the place data (town, Gerlan, Llandygai, the
   school, the Afon Caseg and Afon Ogwen) in `src/ui/place/Bethesda.tsx`; authored positions
   would be better (for the content agent, not UI lead A).
