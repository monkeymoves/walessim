/**
 * The keystones' and legacy projects' specials (docs/design/v2-board.md section 16.3.5), the one
 * keystone of each kind, and the build discounts on the real board model built from disk.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { careBillOff, projectCoins } from "./budget";
import { hitFactor } from "./events-land";
import { responseCost } from "./events";
import { applyLinkQuality, heldTargets } from "./held";
import { handState, standing } from "./hand-state";
import { blockers, buildYears, costOf } from "./projects";
import { carries } from "./specials";
import { lastLandingStep } from "./time";
import type { BoardModel, BoardState, ForecastedEvent } from "./types";
import { MEASURE_IDS } from "./types";

let model: BoardModel;
let at: string;

beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
  at = model.game.councils[0]!;
});

const def = (id: string) => model.projects.find((p) => p.id === id)!;
const withProjects = (...ids: string[]): BoardState => {
  const s = handState(model);
  s.projects = ids.map((id) => standing(id, { council: at }));
  return s;
};

describe("each keystone and legacy project carries its special", () => {
  it("names the specials of 16.3.5 in projects.yaml", () => {
    expect(carries(def("cluster-roots"), "cluster_roots")).toBe(true);
    expect(carries(def("heat-and-homes"), "no_care_bill")).toBe(true);
    expect(carries(def("evening-trains"), "links_up")).toBe(true);
    expect(carries(def("firms-train-own"), "colleges_up")).toBe(true);
    expect(carries(def("farms-hold-water"), "storm_no_coins")).toBe(true);
    expect(carries(def("homes-pay-bills"), "running_halved")).toBe(true);
  });
});

describe("what the specials change", () => {
  it("Heat and homes for all switches the care bill off", () => {
    expect(careBillOff(model, handState(model))).toBe(false);
    expect(careBillOff(model, withProjects("heat-and-homes"))).toBe(true);
  });

  it("Homes that pay their own bills cuts every running cost to B1 running_share", () => {
    const running = (s: BoardState) => projectCoins(model, s, 5).filter((x) => x.running).reduce((a, x) => a + x.coins, 0);
    const s = withProjects("frequent-trains", "evening-trains");
    s.projects = s.projects.map((p) => ({ ...p, site: def(p.project).site === "link" ? { link: model.links.find((l) => l.kind === "rail")!.id } : p.site }));
    const full = running(s);
    expect(full).toBeLessThan(0);
    s.projects.push(standing("homes-pay-bills", { council: at }));
    expect(running(s)).toBeCloseTo(full * 0.5, 6);
  });

  it("Farms paid to hold water makes answers to storms free", () => {
    const storm = model.events.find((e) => e.track === "weather" && e.responses.some((r) => r.cost > 0))!;
    const paid = storm.responses.find((r) => r.cost > 0)!;
    expect(responseCost(model, handState(model), storm.id, paid.id)).toBe(paid.cost);
    expect(responseCost(model, withProjects("farms-hold-water"), storm.id, paid.id)).toBe(0);
  });

  it("A cluster that roots takes less from a downturn where a skills college stands", () => {
    const downturn = model.events.find((e) => e.id === "downturn")!;
    const f: ForecastedEvent = { event: downturn.id, step: 10, fromStep: 4, toStep: 10, councils: [at], severity: downturn.severity };
    const college = hitFactor(model, withProjects("skills-college"), downturn, f, at);
    expect(hitFactor(model, withProjects("skills-college", "cluster-roots"), downturn, f, at)).toBeCloseTo(college * 0.5, 6);
  });

  it("Trains all evening and on Sundays lifts every upgraded link one more step", () => {
    const link = model.links.find((l) => l.kind === "rail" && (l.quality ?? 1) === 1)!;
    const s = handState(model);
    s.projects = [standing("frequent-trains", { link: link.id })];
    applyLinkQuality(model, s);
    const upgraded = s.linkQuality[link.id]!;
    s.projects.push(standing("evening-trains", { council: at }));
    applyLinkQuality(model, s);
    expect(s.linkQuality[link.id]).toBe(Math.min(3, upgraded + 1));
  });

  it("Firms that train their own make every skills college work a level higher", () => {
    const lift = (s: BoardState) => heldTargets(model, s, 40).filter((h) => h.cause.kind === "project" && h.cause.project === "skills-college" && MEASURE_IDS.includes(h.quantity as never) && h.rule !== "R4" && h.rule !== "R1")
      .reduce((a, h) => a + h.target, 0);
    const base = lift(withProjects("skills-college"));
    const [l1, l2] = def("skills-college").level_factor;
    expect(lift(withProjects("skills-college", "firms-train-own"))).toBeCloseTo((base * l2!) / l1!, 6);
  });
});

describe("one of each keystone, and the discounts", () => {
  it("a keystone standing anywhere cannot be built again elsewhere", () => {
    const s = withProjects("cluster-roots");
    s.coins = 50;
    const other = model.game.councils[1]!;
    expect(blockers(model, s, { kind: "build", project: "cluster-roots", site: { council: other } })).toContainEqual({ kind: "one_keystone" });
  });

  it("an open deal takes a coin off a build that serves it, and trouble halves the build time (P6, E2)", () => {
    const s = handState(model);
    const project = def("skills-college");
    const lifted = project.effects.find((e) => e.kind === "measure" && e.points > 0);
    if (lifted?.kind !== "measure") throw new Error("skills college lifts nothing");
    s.deals = [{ council: at, measure: lifted.measure, madeStep: 0, dueStep: 16, kept: null }];
    s.coins = 10;
    expect(costOf(model, s, { kind: "build", project: project.id, site: { council: at } })).toBe(project.cost - 1);
    expect(buildYears(model, s, project, { council: at })).toBe(project.build_years);
    s.step = 12;
    s.events = [{ event: "downturn", step: 10, councils: [at], severity: 2 }];
    expect(buildYears(model, s, project, { council: at })).toBe(project.build_years * 0.5);
  });

  it("no event lands on the last step, where its answer could change nothing", () => {
    expect(lastLandingStep(model)).toBe(model.game.steps - 2);
  });
});
