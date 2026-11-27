# Needs from shared parts

Items 1 to 5 were raised by UI lead B against UI lead A's parts and resolved by B directly in
`src/ui/parts/` (with the lead's go-ahead while A was not running), keeping the parts API
backward compatible. Item 6 is for the content agent.

1. **Resolved. StrandMeter: ghost sharp or fuzzy.** `ghostSharp?: boolean` on `StrandMeter` and
   `ghostSharp?: Partial<Record<StrandId, boolean>>` on `StrandRow`: dashed when sharp, dotted
   when fuzzy.
2. **Resolved. StrandMeter: ghost visibility.** The ghost outline is thicker, taller and lightly
   filled. The game also writes the forecast in words under the strands a card touches ("about
   1 pip", "under a pip"), in `src/ui/game/Pieces.tsx` (`GhostRow`).
3. **Resolved. StrandMeter: per-strand attribute.** Each meter `li` carries `data-strand`.
4. **Resolved. Ticket: accessible name.** A pressable ticket (`onSelect`) now takes its name from
   its printed content and is described by the summary through `aria-describedby`; a ticket
   that is not pressable keeps its `aria-label`.
5. **Resolved. "no change" crowding.** The meter head shows a short level bar for no change, with
   the words kept for screen readers and the tooltip. `StrandRow` takes `labels` (and
   `StrandMeter` takes `label`), a `{en, cy}` pair per strand for tight bars; the game passes the
   short names from `model/i18n/*/game.json` (`strand_short.*`).
6. **Open. Model: Bethesda option positions.** `model/places/bethesda.yaml` options have no `x`,
   `y`. The board anchors them to real features in the place data (town, Gerlan, Llandygai, the
   school, the Afon Caseg and Afon Ogwen) in `src/ui/place/Bethesda.tsx`; authored positions
   would be better.
