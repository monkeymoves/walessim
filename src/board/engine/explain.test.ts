/**
 * Every change of a quarter point or more in any council measure has a Why? that ends at a rule
 * and a cause (section 12), and the reasons add up to the change.
 */
import { describe, expect, it } from "vitest";
import { why } from "./explain";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { playGame } from "./test-play";
import { stepOfYear } from "./time";
import { MEASURE_IDS } from "./types";

const { cardiff, rct } = FIXTURE_COUNCILS;

describe("Why?", () => {
  const model = boardFixture();
  const ruleIds = new Set(model.rules.map((r) => r.id));
  const contentPage = /^(project|pair|law|event|place):/;

  for (const [n, start] of [[3, "work-valleys"], [44, "warm-homes"], [2050, "ready-weather"]] as const) {
    it(`explains every measure change, year by year (game ${n}, ${start})`, () => {
      const { state } = playGame(model, n, start);
      let checked = 0;
      for (let t = 0; t + 1 < state.history.length; t++) {
        const before = state.history[t]!;
        const after = state.history[t + 1]!;
        const span = { fromStep: before.step, toStep: after.step - 1 };
        for (const code of model.game.councils) {
          for (const m of MEASURE_IDS) {
            const change = after.councils[code]!.measures[m] - before.councils[code]!.measures[m];
            const reasons = why(model, state, { council: code, measure: m, ...span });
            const total = reasons.reduce((a, w) => a + w.delta, 0);
            expect(total, `${code} ${m} year ${before.year}`).toBeCloseTo(change, 3);
            if (Math.abs(change) < 0.25) continue;
            checked++;
            expect(reasons.length).toBeGreaterThan(0);
            for (const w of reasons) {
              expect(ruleIds.has(w.rule) || contentPage.test(w.rule), `rule ${w.rule}`).toBe(true);
              expect(w.cause.kind).toBeTruthy();
              expect(w.say.key).toMatch(/^board\.why\.line_(up|down)$/);
              expect(w.say.vars?.cause).toBe(`board.cause.${w.cause.kind}`);
              expect(w.year).toBe(before.year);
              expect(w.step).toBeGreaterThanOrEqual(span.fromStep);
              expect(w.step).toBeLessThanOrEqual(span.toStep);
            }
          }
        }
      }
      expect(checked).toBeGreaterThan(0);
    });
  }

  it("follows spread back to the project and the link", () => {
    const { state } = playGame(model, 3, "work-valleys");
    const travelled = state.ledger.find((c) => c.rule === "S1");
    if (!travelled) return;
    const [w] = why(model, state, { council: travelled.council!, measure: "work", fromStep: travelled.step, toStep: travelled.step }).filter((x) => x.rule === "S1");
    expect(w!.via).toMatchObject({ kind: "commute" });
    expect(w!.say.key).toBe(w!.delta >= 0 ? "board.why.line_up" : "board.why.line_down");
    expect(w!.say.vars).toHaveProperty("link");
    expect(w!.say.vars).toHaveProperty("from");
  });

  it("explains the coins too, as game rules", () => {
    const { state } = playGame(model, 3, "work-valleys");
    const coins = why(model, state, { measure: "coins", fromStep: 8, toStep: 11 });
    expect(coins.length).toBeGreaterThan(0);
    expect(coins.every((w) => w.honesty === "game_rule" && w.council === null)).toBe(true);
  });

  it("puts reasons largest first and gives report lines from them", () => {
    const { state, reports } = playGame(model, 3, "work-valleys");
    const all = why(model, state, { council: cardiff, measure: "work", fromStep: stepOfYear(model, 2030), toStep: stepOfYear(model, 2034) - 1 });
    for (let i = 1; i < all.length; i++) expect(Math.abs(all[i - 1]!.delta)).toBeGreaterThanOrEqual(Math.abs(all[i]!.delta));
    for (const r of reports) {
      for (const l of [...(r.yearLines ?? []), ...(r.term?.lines ?? [])]) {
        expect(l.say.key).toBe(l.delta >= 0 ? "board.report.up" : "board.report.down");
        expect(l.say.vars?.council).toEqual(l.why.say.vars?.council);
      }
    }
    expect(why(model, state, { council: rct, measure: "welsh", fromStep: 990, toStep: 999 })).toEqual([]);
  });

  it("names young adults moving as young adults moving, not people changing their minds (playtest 8: the circular Why?)", () => {
    const { state } = playGame(model, 3, "work-valleys");
    const young = state.ledger.filter((c) => c.rule === "S3" && c.council);
    expect(young.length).toBeGreaterThan(0);
    const c = young[0]!;
    const reasons = why(model, state, { council: c.council!, measure: c.quantity as never, fromStep: 0, toStep: state.step });
    const s3 = reasons.filter((r) => r.rule === "S3");
    expect(s3.length).toBeGreaterThan(0);
    for (const r of s3) expect(r.say.vars?.cause).toBe("board.cause.people_young");
  });
});
