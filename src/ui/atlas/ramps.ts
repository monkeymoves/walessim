// One sequential map ramp per goal, so a measure is drawn in its goal's colour everywhere: in the
// atlas, in the "Where?" map during play, and in every legend. Hue says which goal; how dark says
// how much. Each ramp has five steps at the same OKLCH lightness (0.95, 0.84, 0.72, 0.59, 0.45),
// so "darker means more" reads the same in every goal. Hues come from the goal yarns in
// docs/design/tokens.css section 6, with two nudges: Climate is a stronger blue than the grey sea so
// it never reads as water, and Welsh and culture leans violet to stand apart from Climate.
// Change-over-time measures keep the woad to peat diverging ramp; measures with no goal keep peat.
import type { StrandId } from "../../model/schema";

export const STRAND_RAMPS: Record<StrandId, readonly string[]> = {
  prosperous: ["#F6EDDD", "#DFC79B", "#C49E53", "#AA6F00", "#7D4500"], // gorse gold to umber
  resilient: ["#E6F2E8", "#B2D5B8", "#7CB488", "#478F59", "#236436"], // bracken green
  healthier: ["#E3F2F0", "#AAD5CF", "#6EB4AB", "#2C8E85", "#00635C"], // lichen teal
  equal: ["#F5EAF8", "#DDBEE3", "#C091C9", "#9D64A8", "#703F79"], // heather
  cohesive: ["#FDEAE5", "#EFBDB1", "#DA8E7C", "#B9604B", "#873B2A"], // brick rose
  culture: ["#EBEDFC", "#C3C7EF", "#999FDB", "#7175BD", "#4B4E8B"], // woad violet
  global: ["#E2F1FC", "#A9D0EF", "#6CACDC", "#2C84BE", "#005B8B"], // sky to deep blue
};
