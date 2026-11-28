/**
 * On the way (playtest 8, should-fix 1: nothing seemed to move for ten years). Left for 2050 counts
 * what is built or started but not yet on the board, so the headline moves when a choice is made,
 * and it does not dip on the day a slow build opens or while its lift ramps up (package B's
 * contradiction). `headway` says how much is still on the way and when the last of it lands.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { act, newBoard, tick } from "./clock";
import { onTheWay } from "./on-the-way";
import { headway, scores } from "./score";
import { yearOfStep } from "./time";
import type { BoardModel, BoardState } from "./types";

let quiet: BoardModel;
beforeAll(() => {
  // Events off, so only the build and the board's own drift move the score.
  quiet = { ...assembleBoardModel(readBoardInputs()).model, events: [] };
});

const MERTHYR = "W06000024";
const build = { kind: "build" as const, project: "welsh-school", site: { council: MERTHYR } };

function run(s0: BoardState, steps: number, withBuild: boolean): number[] {
  let s = withBuild ? act(quiet, s0, build) : s0;
  const out = [scores(quiet, s).left];
  for (let i = 0; i < steps && s.phase === "play"; i++) {
    s = tick(quiet, s).state;
    out.push(scores(quiet, s).left);
  }
  return out;
}

describe("on the way", () => {
  it("a build moves Left for 2050 at once, by about its whole lift, and its share never dips as it opens and ramps up", () => {
    const s0 = newBoard(quiet, 5, quiet.starts[0]!.id);
    const steps = 40; // two years building, six of ramp, two more
    const withIt = run(s0, steps, true);
    const without = run(s0, steps, false);
    const share = withIt.map((v, i) => v - without[i]!);
    expect(share[0]).toBeGreaterThan(0.05);
    for (let i = 1; i < share.length; i++) expect(share[i]!, `step ${i}`).toBeGreaterThan(share[i - 1]! - 0.02);
  });

  it("a project being built is wholly on the way, and nothing is once it has fully grown in", () => {
    let s = newBoard(quiet, 5, quiet.starts[0]!.id);
    expect(headway(quiet, s).comingBy).toBeNull();
    s = act(quiet, s, build);
    const coming = onTheWay(quiet, s)[MERTHYR]?.welsh ?? 0;
    expect(coming).toBeGreaterThan(0);
    const h = headway(quiet, s);
    expect(h.comingPoints).toBeGreaterThan(0);
    const p = s.projects.find((x) => x.project === "welsh-school")!;
    const ramp = quiet.projects.find((d) => d.id === "welsh-school")!.effects.find((e) => e.kind === "measure")!;
    expect(h.comingBy).toBe(yearOfStep(quiet, p.readyStep + 4 * (ramp.after_years ?? 0) + 4 * (ramp.ramp_years ?? 0)));
    for (let i = 0; i < 40; i++) s = tick(quiet, s).state;
    expect(onTheWay(quiet, s)[MERTHYR]?.welsh ?? 0).toBeCloseTo(0, 4);
    expect(headway(quiet, s).comingBy).toBeNull();
  });
});

describe("on the way, quick builds and upgrades (playtest 10 should-fix 4)", () => {
  it("a build or upgrade that works at once moves Left for 2050 the moment it is made, before the next step lays it on the board", () => {
    let s = newBoard(quiet, 5, quiet.starts[0]!.id);
    s = act(quiet, s, build);
    for (let i = 0; i < 60; i++) s = tick(quiet, s).state;
    const before = scores(quiet, s).left;
    // As an upgrade (or a build after a win that makes builds faster) leaves it: working now, at a
    // new level, with nothing yet on the board for the difference.
    const after = structuredClone(s);
    after.projects.find((p) => p.project === "welsh-school")!.level = 2;
    expect(scores(quiet, after).left).toBeGreaterThan(before + 0.01);
  });
});
