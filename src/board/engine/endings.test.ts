import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { handState, nextTurn, standing } from "./hand-state";
import { endHolds } from "./end-conditions";
import { councilMean } from "./score";
import { ending, evidenceLine, mostChanged, nearestNotBuilt, pickEnding } from "./endings";
import type { BoardModel, BoardState } from "./types";
import { MEASURE_IDS } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const model: BoardModel = boardFixture();

/** A 2050 board: 2026 seeds, then `shape` changes the board, then twelve turns pass. */
function at2050(shape: (s: BoardState) => void): BoardState {
  const s = handState(model, { start: "warm-homes" });
  shape(s);
  while (s.turn < model.game.turns) nextTurn(model, s);
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
    expect(e.evidence.every((l) => l.say.key === "ending.evidence" && !!l.say.vars?.line)).toBe(true);
    expect(e.mostChanged[0]).toBe(merthyr);
    expect(e.letter.from).toBe(merthyr);
    expect(e.letter.letter).toBe("letter-warm-country");
    expect(e.letter.slots.council).toEqual(model.councils.find((c) => c.code === merthyr)!.name);
    expect(e.scores.result).toBe(Math.min(e.scores.life, e.scores.left));
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
