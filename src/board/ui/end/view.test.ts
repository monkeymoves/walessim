// The end screen's working on a played game: a small seeded player plays to 2050 through the API
// (the fixture, and the real model when it is built), then every piece the end screen draws is
// checked: frames, the time-lapse timing, stills, then and now, chapters, the letter, the run code.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as api from "../../engine/api";
import type { BoardModel, BoardState } from "../../engine/api";
import { acceptBoardModel } from "../../model";
import {
  bandKey, changes, chapterOf, easeValues, fillText, frameAt, lapseAt, lapseLength, lapseMsOf, letterOf, LAPSE,
  scaleOf, termsOf, termStills, turningFrames, valuesOf,
} from "./view";
import { playForTest } from "../testPlay";
import { linksOf, markersOf, stitchesOf } from "./lapseMap";

const realPath = join(__dirname, "..", "..", "..", "..", "public", "board-model.json");
const models: [string, () => BoardModel][] = [["fixture", () => api.boardFixture()]];
if (existsSync(realPath)) models.push(["real model", () => acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")))]);

describe("time-lapse timing", () => {
  it("plays each year in 0.6 s and holds 1.5 s on a turning point", () => {
    expect(lapseLength(25, [])).toBe(24 * LAPSE.yearMs);
    expect(lapseLength(25, [3, 3, 10])).toBe(24 * LAPSE.yearMs + 2 * LAPSE.holdMs);
    expect(lapseAt(25, [], 0)).toMatchObject({ index: 0, t: 0, holding: null, done: false });
    expect(lapseAt(25, [], 900)).toMatchObject({ index: 1, holding: null });
    expect(lapseAt(25, [0], 100)).toMatchObject({ index: 0, holding: 0 });
    expect(lapseAt(25, [0], LAPSE.holdMs + 10).holding).toBeNull();
    expect(lapseAt(25, [], 1e9)).toMatchObject({ index: 24, done: true });
    expect(lapseAt(25, [5], lapseMsOf(5, [5]))).toMatchObject({ index: 5, holding: 5 });
  });
});

describe("model text slots", () => {
  it("fills slots from Text, numbers and strings, and leaves unknown ones", () => {
    const text = { en: "{town} in {year}, {x}", cy: "{town} yn {year}, {x}" };
    expect(fillText(text, { town: { en: "Ebbw Vale", cy: "Glynebwy" }, year: 2031 }, "cy")).toBe("Glynebwy yn 2031, {x}");
  });
});

for (const [name, load] of models) {
  describe(`the end screen on a played game (${name})`, () => {
    const model = load();
    const state = playForTest(model, 20261128);
    const ending = api.ending(model, state);
    const frames = api.frames(model, state);

    it("reaches 2050 with a frame for every year", () => {
      expect(state.phase).toBe("ended");
      expect(frames.length).toBe(model.game.end_year - model.game.first_year + 1);
      expect(frames[0]!.year).toBe(model.game.first_year);
      expect(frames.at(-1)!.year).toBe(model.game.end_year);
    });

    it("colours every council in play on one scale for each lens", () => {
      for (const by of ["all", "work", "young"] as const) {
        const v = valuesOf(model, frames.at(-1)!, by);
        expect(Object.keys(v).sort()).toEqual([...model.game.councils].sort());
        const sc = scaleOf(model, frames, by);
        for (const x of Object.values(v)) { expect(x).toBeGreaterThanOrEqual(sc.domain[0]); expect(x).toBeLessThanOrEqual(sc.domain[1]); }
      }
      const half = easeValues(model, frames[0]!, frames[1]!, "all", 0.5);
      const a = valuesOf(model, frames[0]!, "all"), b = valuesOf(model, frames[1]!, "all");
      for (const c of model.game.councils) expect(half[c]).toBeCloseTo((a[c]! + b[c]!) / 2, 9);
    });

    it("shows six term stills and the frame for any year", () => {
      const stills = termStills(model, frames);
      expect(stills.length).toBe(6);
      expect(stills.at(-1)!.year).toBe(model.game.end_year);
      expect(frameAt(frames, 2031.5)!.year).toBe(2031);
    });

    it("draws the map from each frame", () => {
      for (const f of frames) {
        expect(stitchesOf(model, f).length).toBeLessThanOrEqual(f.projects.length);
        for (const l of linksOf(model, f, 0.5)) expect(l.weight).toBeGreaterThanOrEqual(1);
        expect(markersOf(model, f).length).toBeLessThanOrEqual(f.events.length);
      }
      expect(frames.at(-1)!.projects.length).toBeGreaterThan(0);
    });

    it("names six terms and places turning points in frames", () => {
      const story = api.story(model, state);
      const terms = termsOf(model, story.chapters);
      expect(terms.map((x) => [x.fromYear, x.toYear])).toEqual([[2026, 2030], [2030, 2034], [2034, 2038], [2038, 2042], [2042, 2046], [2046, 2050]]);
      expect(story.chapters.length).toBe(6);
      for (const c of story.chapters) {
        const named = chapterOf(model, c, "en");
        if (named) expect(named.name).not.toMatch(/\{\w+\}/);
      }
      for (const p of turningFrames(frames, story.turningPoints)) expect(frames[p.index]).toBeDefined();
    });

    it("ranks then and now by change, and the band has words", () => {
      const rows = changes(model, frames[0]!, frames.at(-1)!, "all");
      expect(rows.length).toBe(model.game.councils.length);
      for (let i = 1; i < rows.length; i++) expect(Math.abs(rows[i - 1]!.delta)).toBeGreaterThanOrEqual(Math.abs(rows[i]!.delta));
      expect(bandKey(ending.scores.band)).toMatch(/^boardend\.band\./);
    });

    it("writes the letter with every slot filled, when the model has one", () => {
      const letter = letterOf(model, ending, "en");
      if (model.letters.some((l) => l.id === ending.letter.letter)) {
        expect(letter).not.toBeNull();
        expect(letter!.body.length).toBeGreaterThan(20);
        expect(Object.values(letter!).join(" ")).not.toMatch(/\{\w+\}/);
      }
    });

    it("round trips the run code to the same ending", () => {
      const code = api.encodeRun(state);
      const back = api.decodeRun(model, code);
      expect(api.encodeRun(back)).toBe(code);
      expect(api.ending(model, back).id).toBe(ending.id);
    });
  });
}
