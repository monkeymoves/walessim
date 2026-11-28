import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { handState, nextStep, standing } from "./hand-state";
import { endHolds } from "./end-conditions";
import { councilMean } from "./score";
import { ending, evidenceLine, ghostFrame, mostChanged, nearestNotBuilt, pickEnding } from "./endings";
import type { BoardModel, BoardState } from "./types";
import { MEASURE_IDS } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const model: BoardModel = boardFixture();

/** A 2050 board: 2026 seeds, then `shape` changes the board, then 96 steps pass. */
function at2050(shape: (s: BoardState) => void): BoardState {
  const s = handState(model, { start: "warm-homes" });
  shape(s);
  while (s.step < model.game.steps) nextStep(model, s);
  s.phase = "ended";
  return s;
}
const lift = (s: BoardState, by: number, codes = [merthyr, rct, cardiff]) => {
  for (const c of codes) for (const m of MEASURE_IDS) s.councils[c]!.measures[m] = Math.max(0, Math.min(10, s.councils[c]!.measures[m] + by));
};
/** With three councils the gap is the middle less the mean of all three: lifting the lowest a little closes it. */
const lowest = (s: BoardState) => [merthyr, rct, cardiff].sort((a, b) => councilMean(s.councils[a]!) - councilMean(s.councils[b]!))[0]!;
const tier1 = (s: BoardState) => {
  s.projects.push(standing("buses-meet-trains", { council: merthyr }), standing("social-homes", { council: rct }),
    standing("welsh-school", { council: cardiff }), standing("back-local-firms", { council: rct }));
};

describe("every ending is reachable on the fixture", () => {
  const cases: [string, (s: BoardState) => void][] = [
    ["drift", (s) => lift(s, -0.2)],
    ["patchwork", (s) => { tier1(s); lift(s, 0.3); }],
    ["city-bedrooms", (s) => { s.linkQuality["rail:merthyr-rct"] = 2; s.councils[merthyr]!.young -= 1; s.councils[rct]!.young -= 1; }],
    ["warm-country", (s) => { s.projects.push(standing("heat-and-homes", { council: cardiff })); lift(s, 0.4); }],
    ["green-valleys", (s) => { s.projects.push(standing("rivers-room", { council: rct })); lift(s, 0.2); }],
    ["workshop", (s) => { s.projects.push(standing("cluster-roots", { council: cardiff })); lift(s, 0.2); }],
    ["joined-up-valleys", (s) => { s.projects.push(standing("work-up-the-line", { council: merthyr })); lift(s, 0.2, [lowest(s)]); }],
    ["two-countries", (s) => { s.projects.push(standing("cluster-roots", { council: cardiff })); lift(s, -0.5, [merthyr, rct]); }],
  ];
  for (const [id, shape] of cases) {
    it(id, () => expect(pickEnding(model, at2050(shape)).id).toBe(id));
  }

  it("covers all eight endings in the model", () => {
    expect(cases.map(([id]) => id).sort()).toEqual(model.endings.map((e) => e.id).sort());
  });
});

describe("end conditions", () => {
  it("a keystone being built does not stand yet", () => {
    const s = at2050((x) => x.projects.push(standing("rivers-room", { council: rct }, 10, "building")));
    expect(endHolds(model, s, { kind: "keystones", at_least: 1 })).toBe(false);
    expect(endHolds(model, s, { kind: "keystones", at_most: 0 })).toBe(true);
  });
});

describe("the end screen", () => {
  const s = at2050((x) => { x.projects.push(standing("heat-and-homes", { council: cardiff }, 5)); lift(x, 0.4); lift(x, 1, [merthyr]); x.councils[merthyr]!.young += 1; });

  it("names the ending, three evidence lines, the most changed councils and a letter from the first", () => {
    const e = ending(model, s);
    expect(e.id).toBe("warm-country");
    expect(e.evidence).toHaveLength(3);
    expect(e.evidence.every((l) => l.say.key === "board.ending.evidence" && !!l.say.vars?.line)).toBe(true);
    expect(e.mostChanged[0]).toBe(merthyr);
    expect(e.letter.from).toBe(merthyr);
    expect(e.letter.letter).toBe("letter-warm-country");
    expect(e.letter.slots.council).toEqual(model.councils.find((c) => c.code === merthyr)!.name);
    expect(e.scores.result).toBe(e.scores.left);
    expect(e.autopilot.start).toBeCloseTo(e.scores.start, 6);
  });

  it("the young adults line names the valley council that changed most, and its direction", () => {
    const line = evidenceLine(model, s, model.endings[0]!.evidence[0]!);
    expect(line.council).toBe(merthyr);
    expect(line.say.vars?.line).toEqual(model.endings[0]!.evidence[0]!.up);
  });

  it("the Wales not built is another ending with conditions, the nearest first", () => {
    const built = pickEnding(model, s);
    const other = nearestNotBuilt(model, s, built);
    expect(other.id).not.toBe(built.id);
    expect(other.when.length).toBeGreaterThan(0);
    expect(mostChanged(model, s)).toHaveLength(3);
  });
});

describe("the four endings added in 16.5.3", () => {
  const extra = (id: string, priority: number, when: BoardModel["endings"][number]["when"]) => ({ ...model.endings[0]!, id, priority, when });
  const twelve: BoardModel = {
    ...model,
    endings: [
      ...model.endings.map((e) => ({ ...e, priority: e.priority + 10 })),
      extra("comeback", 1, [{ kind: "elections_lost", at_least: 1 }, { kind: "deals_kept", at_least: 1 }, { kind: "lowest_three", vs_2026: "higher" }]),
      extra("long-game", 2, [{ kind: "keystone_finished_after", year: 2044, at_least: 2 }]),
      extra("gamble", 3, [{ kind: "event_landed", event: "employer-leaves" }]),
      extra("holding-line", 4, [{ kind: "keystones", at_most: 0 }, { kind: "events_prepared", share: 1 }, { kind: "no_council_lower" }]),
    ],
  };
  const pick = (shape: (s: BoardState) => void) => pickEnding(twelve, at2050(shape)).id;

  it("a recovery after a lost election and a kept deal is the comeback", () => {
    expect(pick((s) => {
      s.election.records.push({ year: 2030, step: 16, result: "lost", backers: [], peopleShare: 0.2 });
      s.deals.push({ council: merthyr, measure: "homes", madeStep: 16, dueStep: 32, kept: true });
      lift(s, 0.3);
    })).toBe("comeback");
  });

  it("two keystones opened after 2044 are the long game", () => {
    expect(pick((s) => s.projects.push({ ...standing("rivers-room", { council: rct }), readyStep: 80 }, { ...standing("cluster-roots", { council: cardiff }), readyStep: 84 }))).toBe("long-game");
  });

  it("a big employer that left is the gamble; every storm met and nothing lower is holding the line", () => {
    expect(pick((s) => s.events.push({ event: "employer-leaves", step: 50, councils: [rct], severity: 0 }))).toBe("gamble");
    expect(pick((s) => { s.events.push({ event: "storm-taff", step: 50, councils: [merthyr], severity: 1.5, prepared: true }); lift(s, 0.1); })).toBe("holding-line");
  });
});

describe("the ghost map of the Wales you did not build", () => {
  it("plays the same game number with the branch bot of that ending's keystone, and none for an ending with no keystone", () => {
    const s = at2050(() => undefined);
    const workshop = model.endings.find((e) => e.id === "workshop")!;
    const frame = ghostFrame(model, s, workshop);
    expect(frame?.step).toBe(model.game.steps);
    const plain = model.endings.find((e) => !e.when.some((c) => c.kind === "keystone"))!;
    expect(ghostFrame(model, s, plain)).toBeNull();
  });
});
