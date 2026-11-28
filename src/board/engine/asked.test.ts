/**
 * Rule P7, asked and answered (playtest 10 must-fix 4), and the expectation part of P1: a council
 * under 5 has a lever a player can see (what it asks for) and pull (a new project that lifts it),
 * the backing it gives is on the build's preview, stands while its thanks last and fades evenly,
 * and a lost election eases what people expect.
 */
import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { act, newBoard, tick } from "./clock";
import { answersOf, askingFor } from "./asked";
import { expectedGain } from "./people-moods";
import { preview } from "./preview";
import { councilView } from "./view";
import { withCard } from "./test-cards";
import type { BoardModel, BoardState, MeasureId } from "./types";

const { merthyr } = FIXTURE_COUNCILS;
const P7 = { points: 0.6, years: 4, asked_count: 2 };
const plain = boardFixture();
// Events off, so the clock is never held for an answer.
const model: BoardModel = { ...withCard(plain, "P7", P7), events: [] };

/** A project that lifts one of the measures Merthyr asks for, where it is built. */
function answering(s: BoardState): { id: string; measure: MeasureId } {
  const asked = askingFor(model, s, merthyr);
  const def = model.projects.find((d) => d.site === "council" && !d.keystone && d.tier === 1
    && d.effects.some((e) => e.kind === "measure" && e.points > 0 && (e.where ?? "here") === "here" && asked.includes(e.measure)))!;
  return { id: def.id, measure: asked.find((m) => def.effects.some((e) => e.kind === "measure" && e.measure === m && e.points > 0))! };
}

describe("asked and answered (rule P7)", () => {
  it("the council panel's 'asking for' is the list P7 judges", () => {
    const s = newBoard(model, 3, model.starts[0]!.id);
    expect(councilView(model, s, merthyr).asking).toEqual(askingFor(model, s, merthyr));
  });

  it("a build that lifts what a council asks for shows its backing on the preview, gives it once working, and the thanks fade evenly", () => {
    let s = newBoard(model, 3, model.starts[0]!.id);
    s = structuredClone({ ...s, coins: 30 });
    const { id } = answering(s);
    const def = model.projects.find((d) => d.id === id)!;
    // A council that backs you is not answered: it is the lever on a council under the line.
    s.councils[merthyr]!.backing = 5.2;
    expect(answersOf(model, s, def, { council: merthyr })).toEqual([]);
    s.councils[merthyr]!.backing = 4.6;
    const action = { kind: "build" as const, project: id, site: { council: merthyr } };
    const pv = preview(model, s, action);
    expect(pv.changes.some((c) => c.council === merthyr && c.quantity === "backing" && c.rule === "P7" && c.delta === 0.6)).toBe(true);
    expect(pv.notes.some((n) => n.key === "board.build.answers")).toBe(true);
    s = act(model, s, action);
    const p = s.projects.find((x) => x.project === id)!;
    expect(p.answers?.[0]?.council).toBe(merthyr);
    const parts = () => s.ledger.filter((c) => c.rule === "P7" && c.council === merthyr).reduce((a, c) => a + c.delta, 0);
    while (s.step < p.readyStep) s = tick(model, s).state;
    expect(parts()).toBeCloseTo(0, 6);
    s = tick(model, s).state;
    expect(parts()).toBeCloseTo(0.6, 4);
    const fade: number[] = [];
    for (let y = 0; y < 5; y++) {
      const was = parts();
      for (let i = 0; i < 4; i++) s = tick(model, s).state;
      fade.push(Math.round((parts() - was) * 1000) / 1000);
    }
    expect(fade).toEqual([-0.15, -0.15, -0.15, -0.15, 0]);
  });

  it("without the P7 card nothing is answered", () => {
    const s = newBoard(plain, 3, plain.starts[0]!.id);
    const def = model.projects.find((d) => d.site === "council")!;
    expect(answersOf(plain, s, def, { council: merthyr })).toEqual([]);
  });
});

describe("people expect more each win, and a loss eases it (rule P1)", () => {
  it("counts wins less losses, never below nothing", () => {
    const s = newBoard(model, 3, model.starts[0]!.id);
    const p1 = model.rules.find((r) => r.id === "P1")!;
    const rise = p1.params.expect_rise?.default ?? 0;
    const eases = p1.params.loss_eases?.default ?? 0;
    const rec = (result: "win" | "lost" | "strong_win") => ({ year: 2030, step: 16, result, backers: [], peopleShare: 0 });
    s.election.records = [rec("win"), rec("strong_win")];
    expect(expectedGain(model, s)).toBeCloseTo((p1.params.expect_points?.default ?? 0) + rise * 2, 6);
    s.election.records = [rec("win"), rec("strong_win"), rec("lost")];
    expect(expectedGain(model, s)).toBeCloseTo((p1.params.expect_points?.default ?? 0) + rise * Math.max(0, 2 - eases), 6);
  });
});
