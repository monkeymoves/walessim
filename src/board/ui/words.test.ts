/**
 * Every sentence the engine sends in a real game reads whole on screen, in both languages: no
 * stop, year line, Why?, moment or turning point is dropped for a missing key or an empty slot.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { setLang } from "../../i18n";
import type { BoardModel, Say } from "../engine/api";
import { MEASURE_IDS, story, why } from "../engine/api";
import { acceptBoardModel } from "../model";
import { replayWithReports } from "./clock/replay";
import { playForTest } from "./testPlay";
import { nameIdsFrom, say } from "./words";

const realPath = join(__dirname, "..", "..", "..", "public", "board-model.json");

/** Every sentence of one game: its stops, year lines, every Why? of every measure, its moments and turning points. */
function sentences(model: BoardModel): Say[] {
  const played = playForTest(model, 2026);
  const { state, reports } = replayWithReports(model, played.gameNumber, played.start, played.log, played.step);
  const out: Say[] = [];
  for (const r of reports) {
    out.push(...r.stops.map((x) => x.say));
    for (const l of r.yearLines ?? []) out.push(l.say, l.why.say);
  }
  for (const council of model.game.councils) {
    for (const measure of MEASURE_IDS) out.push(...why(model, state, { council, measure, fromStep: 0, toStep: model.game.steps }).map((w) => w.say));
  }
  out.push(...state.story.moments.map((m) => m.say), ...story(model, state).turningPoints.map((m) => m.say));
  return out;
}

describe("numbers in engine sentences", () => {
  it("print a year as a year, with no thousands comma", () => {
    expect(say({ key: "board.stop.year", vars: { year: 2035 } })).toContain("2035");
  });
});

describe.skipIf(!existsSync(realPath))("engine sentences on screen", () => {
  const model = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")));
  nameIdsFrom(model);
  const sent = sentences(model);
  for (const lang of ["en", "cy"] as const) {
    it(`every sentence of a real game reads whole in ${lang}`, () => {
      setLang(lang);
      expect(sent.length).toBeGreaterThan(100);
      const dropped = sent.filter((s) => say(s) === "").map((s) => s.key);
      setLang("en");
      expect([...new Set(dropped)]).toEqual([]);
    });
  }
});
