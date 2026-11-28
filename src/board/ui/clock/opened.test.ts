// A new tier names the builds that opened it (cold playtest 9, should fix 5): for every gate in the
// model, a board where exactly that gate's builds work names them, and what the tier offers.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BoardModel, BoardState, Condition, ProjectState, StepReport } from "../../engine/api";
import { act, advance, boardFixture, keystoneLastStep, newBoard, options, stepsOf } from "../../engine/api";
import { acceptBoardModel } from "../../model";
import { keystoneOffer, openedBy } from "./opened";

const model = boardFixture();
const start = (): BoardState => newBoard(model, 1, model.starts[0]!.id);
const council = model.game.councils[0]!;
const built = (project: string, readyStep: number, n = 0): ProjectState => ({
  id: `${project}@${council}${n}`, project, site: { council }, level: 1, status: "working", startedStep: 0, readyStep, roots: 1, joined: false,
});

describe("what opened a tier", () => {
  for (const b of model.branches) {
    for (const tier of b.tiers.filter((x) => x.tier > 1)) {
      const cond = tier.opens.find((c): c is Extract<Condition, { kind: "project" }> => c.kind === "project");
      if (!cond) continue;
      it(`${b.id} tier ${tier.tier}: names the ${cond.at_least ?? 1} builds that opened it, latest first`, () => {
        const fit = model.projects.filter((p) => p.branch === cond.branch && p.tier === cond.tier);
        expect(fit.length).toBeGreaterThan(0);
        const need = cond.at_least ?? 1;
        const s = start();
        const mine = Array.from({ length: need }, (_, i) => built(fit[i % fit.length]!.id, i + 1, i));
        const other = model.projects.find((p) => p.branch !== b.id);
        s.projects = [...s.projects.filter((p) => p.status !== "working"), ...mine, ...(other ? [built(other.id, 9, 99)] : [])];
        const o = openedBy(model, s, `${b.id}:${tier.tier}`);
        expect(o?.kind).toBe("tier");
        if (o?.kind !== "tier") return;
        expect(o.by.map((p) => p.id)).toEqual([...mine].reverse().map((p) => p.id));
        expect(o.need).toBe(need);
        expect(o.offers.every((p) => p.branch === b.id && p.tier === tier.tier && !p.legacy_of)).toBe(true);
        expect(o.offers.length).toBeGreaterThan(0);
      });
    }
  }

  it("names the keystone a legacy project waits for", () => {
    const legacy = model.projects.find((p) => p.legacy_of);
    if (!legacy) return;
    const s = start();
    s.projects = [built(legacy.legacy_of!, 5)];
    const o = openedBy(model, s, `legacy:${legacy.id}`);
    expect(o).toMatchObject({ kind: "legacy", project: legacy.id, keystone: legacy.legacy_of });
    expect(o?.kind === "legacy" && o.at?.project).toBe(legacy.legacy_of);
  });

  it("gives nothing for a ref it cannot read", () => {
    expect(openedBy(model, start(), "nowhere:9")).toBeNull();
  });
});

// Cold playtest 10, must fix 12: "You can start Heat and homes for all now" in 2045 and 2048.
describe("the keystone line on a tier card, over whole games", () => {
  const realPath = join(__dirname, "..", "..", "..", "..", "public", "board-model.json");
  const real = ((): BoardModel => {
    try { if (existsSync(realPath)) return acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8"))); } catch { /* being rebuilt */ }
    return model;
  })();
  /** One branch only, the cheapest allowed project of it every `every` years: keystone tiers open early or late. */
  function oneBranch(branch: string, gameNumber: number, every: number): { state: BoardState; report: StepReport }[] {
    let s = newBoard(real, gameNumber, real.starts[gameNumber % real.starts.length]!.id);
    const seen: { state: BoardState; report: StepReport }[] = [];
    for (let year = 0; year < 40 && s.phase !== "ended"; year++) {
      for (const kind of ["respond", "deal"] as const) {
        const o = options(real, s).find((x) => x.allowed && x.action.kind === kind);
        if (o) s = act(real, s, o.action);
      }
      // every year, or every second or third: as many of the branch as the coins allow
      for (let k = 0; year % every === 0 && k < 6; k++) {
        const b = options(real, s).filter((x) => x.allowed && x.action.kind === "build" && x.branch === branch).sort((x, y) => x.cost - y.cost)[0];
        if (!b) break;
        s = act(real, s, b.action);
      }
      if (s.phase !== "play") continue;
      const r = advance(real, s, { maxSteps: stepsOf(real, 1), stopOn: ["tier_open"] });
      s = r.state;
      for (const rep of r.reports) if (rep.stops.some((x) => x.kind === "tier_open")) seen.push({ state: s, report: rep });
    }
    return seen;
  }
  const blockedFor = (s: BoardState, keystone: string) => new Set(options(real, s).filter((o) => o.action.kind === "build" && o.project === keystone).flatMap((o) => o.blockers.map((b) => b.kind)));

  it("says start now only while the engine lets a keystone start, and never after the last season", () => {
    let cards = 0;
    for (const b of real.branches) {
      for (const [n, every] of [[7, 1], [9, 3]] as const) {
        for (const { state, report } of oneBranch(b.id, n, every)) {
          for (const stop of report.stops.filter((x) => x.kind === "tier_open" && x.ref)) {
            const o = openedBy(real, state, stop.ref!);
            const keystone = o?.kind === "tier" ? o.offers.find((p) => p.keystone) : undefined;
            if (!keystone) continue;
            cards++;
            const offer = keystoneOffer(real, state, keystone.id);
            const blocked = blockedFor(state, keystone.id);
            expect(blocked.has("too_late"), `${keystone.id} at step ${state.step}`).toBe(offer === "late");
            if (offer === "now") expect(state.step).toBeLessThanOrEqual(keystoneLastStep(real));
            // the same card read a season after the last start says late, and in that season now, as the engine says
            if (offer !== "built") {
              const later = { ...state, step: keystoneLastStep(real) + 1 };
              expect(keystoneOffer(real, later, keystone.id)).toBe("late");
              expect(blockedFor(later, keystone.id).has("too_late")).toBe(true);
              const last = { ...state, step: keystoneLastStep(real) };
              expect(keystoneOffer(real, last, keystone.id)).toBe("now");
              expect(blockedFor(last, keystone.id).has("too_late")).toBe(false);
            }
          }
        }
      }
    }
    expect(cards).toBeGreaterThan(0);
  }, 60_000);
});
