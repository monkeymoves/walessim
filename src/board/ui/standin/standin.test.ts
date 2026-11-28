import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "../../engine/api";
import { act, newBoard, options, preview, seedScore } from "./build";
import { decodeRun, election, encodeRun, endTurn, why } from "./turn";

describe("the practice stand-in", () => {
  const model = boardFixture();

  it("seeds 2026 from the real indicators and bands, never a made-up number", () => {
    const s = newBoard(model, 1, model.starts[0]!.id);
    const merthyr = model.councils.find((c) => c.code === FIXTURE_COUNCILS.merthyr)!;
    // employment 68.4 on the v1 band 63.7 to 79.1 is about 3.05 out of 10
    const b = model.bands["employment"]!;
    expect(10 * (68.4 - b.floor) / (b.goal - b.floor)).toBeCloseTo(3.05, 1);
    expect(s.councils[merthyr.code]!.measures.work).toBeCloseTo(seedScore(model, merthyr, "work"), 10);
    expect(s.coins).toBe(model.rules.find((r) => r.id === "B1")!.params["base"]!.default);
  });

  it("offers projects with their real blockers, and builds one", () => {
    let s = newBoard(model, 1, "warm-homes");
    const opts = options(model, s, FIXTURE_COUNCILS.cardiff);
    const free = opts.find((o) => o.project === "warm-terraces" && o.action.kind === "build")!;
    expect(free.allowed).toBe(true);
    expect(free.cost).toBe(0);
    const keystone = opts.find((o) => o.project === "heat-and-homes")!;
    expect(keystone.allowed).toBe(false);
    expect(keystone.blockers.some((b) => b.kind === "needs")).toBe(true);
    expect(preview(model, s, free.action).changes.length).toBeGreaterThan(0);
    s = act(model, s, free.action);
    expect(s.projects).toHaveLength(1);
    expect(s.freeProject).toBeNull();
  });

  it("plays twelve turns to 2050 with five elections, and replays from its code", () => {
    let s = newBoard(model, 42, "work-valleys");
    let elections = 0;
    for (let turn = 0; turn < model.game.turns; turn++) {
      const o = options(model, s).find((x) => x.allowed && x.action.kind === "build");
      if (o) s = act(model, s, o.action);
      for (const p of s.pending) if (p.kind === "respond") s = act(model, s, { kind: "respond", event: p.event, response: model.events.find((e) => e.id === p.event)!.responses[0]!.id });
      const out = endTurn(model, s);
      if (out.report.election) elections++;
      s = out.state;
    }
    expect(s.phase).toBe("ended");
    expect(s.year).toBe(model.game.end_year);
    expect(elections).toBe(model.game.election_years.length);
    expect(s.history).toHaveLength(model.game.turns + 1);
    expect(election(model, s).councils).toHaveLength(model.game.councils.length);
    expect(JSON.stringify(decodeRun(model, encodeRun(s)))).toBe(JSON.stringify(s));
  });

  it("explains a change with its project", () => {
    let s = newBoard(model, 3, "warm-homes");
    s = act(model, s, { kind: "build", project: "warm-terraces", site: { council: FIXTURE_COUNCILS.rct } });
    s = endTurn(model, s).state;
    const reasons = why(model, s, { council: FIXTURE_COUNCILS.rct, measure: "work", turn: 0 });
    expect(reasons[0]?.cause).toMatchObject({ kind: "project", project: "warm-terraces" });
  });
});
