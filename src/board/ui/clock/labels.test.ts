// Time line labels never overlap (cold playtest 10, must fix 11), over whole games and at the
// narrow and wide track widths of 1280 and 1440 screens.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardModel } from "../../engine/api";
import { boardFixture, timeline } from "../../engine/api";
import { acceptBoardModel } from "../../model";
import { statesForTest } from "../testStates";
import { layoutTimeline, type TimelineItem } from "../timelineLayout";
import { labelPx, labelSpan, placeLabels } from "./labels";

const realPath = join(__dirname, "..", "..", "..", "..", "public", "board-model.json");
function load(): BoardModel {
  try { if (existsSync(realPath)) return acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8"))); } catch { /* being rebuilt */ }
  return boardFixture();
}
const model = load();
// the longest words a label can show: the keystone mark, and a council name
const WORDS = "Keystones: start by here";
const widthOf = (px: number) => (i: Extract<TimelineItem, { kind: "warning" | "mark" }>) => labelPx(i.kind === "mark" && i.mark === "keystone_last_start" ? WORDS : "Rhondda Cynon Taf") / px;

describe("time line labels", () => {
  const states = [...statesForTest(model, 2026), ...statesForTest(model, 3131, model.starts[1]?.id ?? model.starts[0]!.id)];

  for (const px of [760, 1000]) {
    it(`never meet each other or another warning's block on a ${px}px track`, () => {
      let labels = 0;
      for (const s of states) {
        if (s.phase === "ended") continue;
        const items = placeLabels(layoutTimeline(model, s, timeline(model, s)), widthOf(px));
        const shown = items.filter((i) => (i.kind === "warning" || i.kind === "mark") && i.labelled);
        const spans = shown.map((i) => labelSpan(i, widthOf(px)(i as never))!);
        labels += spans.length;
        for (let a = 0; a < spans.length; a++) {
          expect(spans[a]![0]).toBeGreaterThanOrEqual(0);
          expect(spans[a]![1]).toBeLessThanOrEqual(1.0001);
          for (let b = a + 1; b < spans.length; b++) expect(spans[a]![0] < spans[b]![1] && spans[b]![0] < spans[a]![1], `${shown[a]!.key} and ${shown[b]!.key}`).toBe(false);
        }
        for (const w of items) {
          if (w.kind !== "warning") continue;
          for (let a = 0; a < shown.length; a++) if (shown[a]!.key !== w.key) expect(spans[a]![0] < w.to && w.from < spans[a]![1]).toBe(false);
        }
      }
      expect(labels).toBeGreaterThan(0);
    });
  }

  it("always labels the first mark it can, so the keystone date is named while it is ahead", () => {
    const s = states[1]!;
    const items = placeLabels(layoutTimeline(model, s, timeline(model, s)), widthOf(1000));
    const key = items.find((i) => i.kind === "mark" && i.mark === "keystone_last_start");
    if (key && key.kind === "mark") {
      const before = items.filter((i) => (i.kind === "mark" || i.kind === "warning") && i.labelled && labelSpan(i, widthOf(1000)(i as never))![1] > (key.at));
      // either the keystone mark is labelled, or a label already shown covers its place
      expect(key.labelled || before.length > 0).toBe(true);
    }
  });
});
