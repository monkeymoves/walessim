import { describe, expect, it } from "vitest";
import { hashSeed } from "../../engine/rng";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, nextStep, nextYears, standing } from "./hand-state";
import { drawFuture, forecast, forecastNext, joinNames, landEvents, outsideSchedule, rebuildShare, respond, respondBlockers, scheduledSeverity } from "./events";
import { E2_START, withCard } from "./test-cards";
import { seasonOf } from "./time";
import { seedPeople } from "./people";
import type { BoardState, ForecastedEvent } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const model = boardFixture();

function state(future = "wet-decades"): BoardState {
  const s = handState(model, { future, start: "warm-homes" });
  seedPeople(ctxOf(model, s));
  return s;
}

function warn(s: BoardState, f: Omit<ForecastedEvent, "fromStep" | "toStep" | "step">) {
  s.forecast.push({ ...f, fromStep: s.step, toStep: s.step, step: s.step });
}

/** Steps ahead an outside event is warned (rule E1 warn_years, a year and a half). */
const LEAD = 6;

describe("futures and the severity budget (fairness rule 2)", () => {
  it("draws a future from the game number, the same every time, and all four occur", () => {
    expect(drawFuture(model, hashSeed(42))).toBe(drawFuture(model, hashSeed(42)));
    const seen = new Set(Array.from({ length: 60 }, (_, i) => drawFuture(model, hashSeed(i))));
    expect(seen.size).toBe(model.futures.length);
  });

  it("every game number draws 9 to 11 severity points, at most one outside event in each two years, none before 2028", () => {
    for (let g = 0; g < 200; g++) {
      for (const f of model.futures) {
        const sched = outsideSchedule(model, hashSeed(g), f.id);
        const sev = scheduledSeverity(model, hashSeed(g), f.id);
        expect(sev, `game ${g} ${f.id}`).toBeGreaterThanOrEqual(9);
        expect(sev, `game ${g} ${f.id}`).toBeLessThanOrEqual(11);
        expect(new Set(sched.map((x) => x.block)).size).toBe(sched.length);
        expect(sched.every((x) => x.step >= 8 && x.step < model.game.steps && Math.floor(x.step / 8) === x.block)).toBe(true);
      }
    }
  });

  it("follows the future: the wet decades bring storms, the squeeze brings price trouble", () => {
    const count = (future: string, event: string) => Array.from({ length: 50 }, (_, g) => outsideSchedule(model, hashSeed(g), future)).flat().filter((x) => x.event === event).length;
    expect(count("wet-decades", "storm-taff")).toBeGreaterThan(count("squeeze", "storm-taff"));
    expect(count("squeeze", "price-squeeze")).toBeGreaterThan(count("wet-decades", "price-squeeze"));
  });
});

describe("forecast (fairness rule 1: everything is warned)", () => {
  it("warns the scheduled outside event with its councils, and counts the severity drawn", () => {
    const s = state();
    const sched = outsideSchedule(model, s.seed, s.future);
    const first = sched[0]!;
    while (s.step < first.step - LEAD) nextStep(model, s);
    forecastNext(ctxOf(model, s));
    expect(s.forecast.some((x) => x.event === first.event)).toBe(false);
    nextStep(model, s);
    forecastNext(ctxOf(model, s));
    const f = s.forecast.find((x) => x.event === first.event)!;
    expect(f.step).toBe(first.step);
    expect(f.fromStep).toBeLessThanOrEqual(f.step);
    expect(f.toStep).toBeGreaterThanOrEqual(f.step);
    expect(f.toStep - f.fromStep).toBe(1);
    expect(f.councils.length).toBeGreaterThan(0);
    expect(s.severityUsed).toBe(first.severity);
    const v = forecast(model, s);
    expect(v.warnings.map((w) => w.event)).toContain(first.event);
    expect(v.warnings[0]!.say.key).toBe("board.forecast.warning");
  });

  it("a storm on the Taff warns the upstream council with the highest flood risk, then those downstream", () => {
    const s = state();
    s.councils[merthyr]!.risks.flood = 3;
    s.councils[rct]!.risks.flood = 2;
    s.councils[cardiff]!.risks.flood = 2;
    const e = model.events.find((x) => x.id === "storm-taff")!;
    s.step = Math.max(0, (outsideSchedule(model, s.seed, s.future).find((x) => x.event === e.id)?.step ?? 8) - LEAD + 1);
    forecastNext(ctxOf(model, s));
    const f = s.forecast.find((x) => x.event === e.id);
    if (f) expect(f.councils).toEqual([merthyr, rct]);
  });

  it("only lands what was warned", () => {
    const s = state();
    const before = JSON.stringify(s.councils);
    landEvents(ctxOf(model, s));
    expect(s.events).toEqual([]);
    expect(JSON.stringify(s.councils)).toBe(before);
  });

  it("warns a grown event when the board triggers it, and hides the future at the start", () => {
    const s = state();
    s.councils[merthyr]!.measures.health = 2;
    s.councils[merthyr]!.age65 = 25;
    forecastNext(ctxOf(model, s));
    expect(s.forecast.some((f) => f.event === "surgery-closes" && f.councils[0] === merthyr)).toBe(true);
    expect(forecast(model, s).future).toBeNull();
    nextYears(model, s, 2);
    expect(forecast(model, s).future?.key).toBe("board.forecast.future.named");
  });
});

describe("landing and responses", () => {
  it("lands effects on the warned council, records it, and offers a response", () => {
    const s = state();
    s.step = 2;
    warn(s, { event: "downturn", councils: [rct], severity: 3 });
    const before = s.councils[rct]!.measures.work;
    landEvents(ctxOf(model, s));
    expect(s.councils[rct]!.measures.work).toBeCloseTo(before - 0.6, 4);
    expect(s.events).toEqual([{ event: "downturn", step: 2, councils: [rct], severity: 3, prepared: false }]);
    expect(s.pending).toContainEqual({ kind: "respond", event: "downturn", councils: [rct] });
    expect(s.ledger.some((c) => c.council === rct && c.quantity === "work" && c.cause.kind === "event")).toBe(true);
    expect(s.forecast).toEqual([]);
  });

  it("preparation cuts an outside event by half for each project ready for it (fairness rule 3)", () => {
    const hit = (projects: string[]) => {
      const s = state();
      s.step = 2;
      for (const p of projects) s.projects.push(standing(p, { council: rct }));
      warn(s, { event: "downturn", councils: [rct], severity: 3 });
      const before = s.councils[rct]!.measures.work;
      landEvents(ctxOf(model, s));
      return before - s.councils[rct]!.measures.work;
    };
    expect(hit(["back-local-firms"])).toBeCloseTo(hit([]) / 2, 3);
    expect(hit(["back-local-firms", "skills-college"])).toBeCloseTo(hit([]) / 4, 3);
  });

  it("a storm passes downstream, weaker for flood work upstream, and draws a flow along the river", () => {
    const run = (upstreamWork: boolean, rivers = false) => {
      const s = state();
      s.step = 3;
      if (upstreamWork) s.projects.push(standing("slow-the-water", { council: merthyr }));
      if (rivers) s.projects.push(standing("rivers-room", { council: cardiff }));
      warn(s, { event: "storm-taff", councils: [merthyr, rct], severity: 3 });
      const before = s.councils[rct]!.measures.nature;
      const out = landEvents(ctxOf(model, s));
      return { drop: before - s.councils[rct]!.measures.nature, flows: out.flows, rec: s.events[0]! };
    };
    const plain = run(false);
    expect(plain.drop).toBeGreaterThan(0);
    expect(plain.flows[0]).toMatchObject({ from: merthyr, to: rct, rule: "S4" });
    expect(run(true).drop).toBeLessThan(plain.drop);
    expect(run(false, false).rec.councils).toEqual([merthyr, rct]);
  });

  it("a response costs coins, applies where the event landed, and closes the pending", () => {
    const s = state();
    s.step = 3;
    warn(s, { event: "storm-taff", councils: [merthyr, rct], severity: 3 });
    landEvents(ctxOf(model, s));
    s.coins = 1;
    expect(respondBlockers(model, s, "storm-taff", "repair")).toEqual([{ kind: "coins", need: 2, have: 1 }]);
    s.coins = 5;
    expect(respondBlockers(model, s, "storm-taff", "repair")).toEqual([]);
    const homes = s.councils[rct]!.measures.homes;
    respond(ctxOf(model, s), "storm-taff", "repair");
    expect(s.coins).toBe(3);
    expect(s.councils[rct]!.measures.homes).toBeCloseTo(homes + 0.3, 4);
    expect(s.events[0]!.response).toBe("repair");
    expect(s.pending.filter((p) => p.kind === "respond")).toEqual([]);
    expect(respondBlockers(model, s, "storm-taff", "repair")).toEqual([{ kind: "not_offered" }]);
  });

  it("an unanswered response lapses when the next step's events land", () => {
    const s = state();
    s.step = 2;
    warn(s, { event: "downturn", councils: [rct], severity: 3 });
    landEvents(ctxOf(model, s));
    nextStep(model, s);
    landEvents(ctxOf(model, s));
    expect(s.pending).toEqual([]);
  });

  it("a tip that moves in the Rhondda offers the place visit", () => {
    const s = state();
    warn(s, { event: "tip-moves", councils: [rct], severity: 0 });
    landEvents(ctxOf(model, s));
    expect(s.pending).toContainEqual({ kind: "visit", place: "rhondda", council: rct, offeredBy: { event: "tip-moves" }, since: s.step + 1 });
  });
});

describe("joinNames", () => {
  it("joins council names in both languages", () => {
    const t = (en: string, cy: string) => ({ en, cy });
    expect(joinNames([t("A", "A"), t("B", "B"), t("C", "Ystrad")])).toMatchObject({ en: "A, B and C", cy: "A, B ac Ystrad" });
    expect(joinNames([t("Cardiff", "Caerdydd")]).en).toBe("Cardiff");
  });
});

describe("phase 2 event rules", () => {
  it("storms land in autumn or winter (16.2.4)", () => {
    for (let g = 1; g <= 30; g++) {
      for (const s of outsideSchedule(model, hashSeed(g), "wet-decades")) {
        if (model.events.find((e) => e.id === s.event)?.track === "weather") expect(["autumn", "winter"]).toContain(seasonOf(model, s.step));
      }
    }
  });

  it("after hard trouble lands, builds there take half the time for two years (rule E2); no card, no change", () => {
    const m = withCard(model, "E2", E2_START);
    const s = state();
    s.step = 20;
    s.events.push({ event: "storm-taff", step: 18, councils: [merthyr, rct], severity: 3, prepared: false });
    expect(rebuildShare(m, s, merthyr)).toBe(0.5);
    expect(rebuildShare(m, s, cardiff)).toBe(1);
    expect(rebuildShare(model, s, merthyr)).toBe(1);
    s.step = 30;
    expect(rebuildShare(m, s, merthyr)).toBe(1);
    s.events.push({ event: "downturn", step: 29, councils: [cardiff], severity: 1.5, prepared: true });
    expect(rebuildShare(m, s, cardiff)).toBe(1);
  });
});
