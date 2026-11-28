/**
 * The honesty rules of docs/design/v2-board.md section 10, checked on the board model built from
 * the files on disk (the same build as `npm run board:build`, without writing public/board-model.json).
 *
 * - The 2026 start is real: every seeded figure is the figure in model/data/la-indicators.json,
 *   unadjusted, with a source, a period and a band.
 * - Every link says what it is: Census counts, a rail line, a river, or a labelled game estimate.
 * - Every rule card has a kind, a confidence and an evidence grade, and a design choice with no
 *   source is flagged as a game rule.
 * - Anything still to check, and every Welsh draft, is listed in `meta`.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel, type BoardInputs } from "../../scripts/board/assemble";
import { readBoardInputs } from "../../scripts/board/read-inputs";
import { MEASURE_IDS, type BoardModel, type MeasureId } from "./engine/types";

let inputs: Omit<BoardInputs, "v1Places" | "forceFallback" | "strict">;
let model: BoardModel;

beforeAll(() => {
  inputs = readBoardInputs();
  model = assembleBoardModel(inputs).model;
});

const score = (value: number, b: { floor: number; goal: number }) => Math.max(0, Math.min(10, (10 * (value - b.floor)) / (b.goal - b.floor)));
const byCode = (code: string) => model.councils.find((c) => c.code === code)!;

describe("the start is real", () => {
  it("has the ten South East councils and no stand-ins", () => {
    expect(model.councils.map((c) => c.name.en)).toEqual([
      "Bridgend", "Vale of Glamorgan", "Cardiff", "Rhondda Cynon Taf", "Caerphilly", "Blaenau Gwent", "Torfaen", "Monmouthshire", "Newport", "Merthyr Tydfil",
    ]);
    expect(model.meta.fixture).toBeFalsy();
  });

  it("uses the published figure for every seeded indicator, unadjusted", () => {
    for (const c of model.councils) {
      for (const ind of model.indicators) {
        const published = inputs.laIndicators.indicators[ind.id]?.values[c.code];
        expect(published, `${ind.id} for ${c.name.en}`).toBeTypeOf("number");
        expect(c.real[ind.id], `${ind.id} for ${c.name.en}`).toBe(published);
      }
    }
  });

  it("gives every indicator a source, a period and its direction, and every measure indicator a band", () => {
    const sources = new Set(model.sources.map((s) => s.id));
    for (const ind of model.indicators) {
      expect(sources.has(ind.source), `${ind.id} source ${ind.source}`).toBe(true);
      expect(ind.year, ind.id).toBe(inputs.laIndicators.indicators[ind.id]!.year);
    }
    for (const m of model.measures) {
      for (const id of m.indicators) {
        const b = model.bands[id];
        expect(b, `band for ${id}`).toBeDefined();
        expect(sources.has(b!.source), `band source for ${id}`).toBe(true);
        expect(b!.higher_is_better, id).toBe(model.indicators.find((i) => i.id === id)!.higher_is_better);
        expect(b!.floor).not.toBe(b!.goal);
      }
    }
  });

  it("builds bands from the published rule: v1 copied, the rest the 22 councils pushed out by a tenth", () => {
    const v1 = inputs.v1Indicators;
    expect(v1.length).toBeGreaterThan(0);
    let board = 0;
    for (const [id, b] of Object.entries(model.bands)) {
      if (b.origin === "v1") continue;
      board++;
      const values = Object.entries(inputs.laIndicators.indicators[id]!.values).filter(([code]) => code !== "W92000004").map(([, v]) => v);
      expect(values.length, id).toBe(22);
      const lo = Math.min(...values), hi = Math.max(...values), pad = 0.1 * (hi - lo);
      const [floor, goal] = b.higher_is_better ? [lo - pad, hi + pad] : [hi + pad, lo - pad];
      expect(b.floor, `${id} floor`).toBeCloseTo(floor, 3);
      expect(b.goal, `${id} goal`).toBeCloseTo(goal, 3);
    }
    expect(board).toBeGreaterThan(0);
  });

  it("scores every measure from 0 to 10 and keeps a real spread between the councils", () => {
    const scores = (code: string): Record<MeasureId, number> => {
      const c = byCode(code);
      return Object.fromEntries(model.measures.map((m) => [m.id, m.indicators.reduce((t, id) => t + score(c.real[id]!, model.bands[id]!), 0) / m.indicators.length])) as Record<MeasureId, number>;
    };
    for (const c of model.councils) for (const id of MEASURE_IDS) {
      const s = scores(c.code)[id];
      expect(s, `${c.name.en} ${id}`).toBeGreaterThanOrEqual(0);
      expect(s, `${c.name.en} ${id}`).toBeLessThanOrEqual(10);
    }
    // The real Wales: Cardiff has more work than Merthyr Tydfil, and Merthyr Tydfil has worse health.
    expect(scores("W06000015").work).toBeGreaterThan(scores("W06000024").work);
    expect(scores("W06000015").health).toBeGreaterThan(scores("W06000024").health);
  });
});

describe("links say what they are", () => {
  const sourceIds = () => new Set(model.sources.map((s) => s.id));
  const census = () => model.links.filter((l) => l.kind === "commute");

  it("never carries an illustrative link in the real build", () => {
    for (const l of model.links) expect(["real", "game_estimate"], l.id).toContain(l.honesty);
  });

  it("names a source that exists on every link, and a source for every real one", () => {
    const ids = sourceIds();
    for (const l of model.links) {
      if (l.honesty === "real") expect(l.sources.length, l.id).toBeGreaterThan(0);
      for (const s of l.sources) expect(ids.has(s), `${l.id} source ${s}`).toBe(true);
    }
  });

  it("has Census 2021 commuting shares between 0.01 and 1, never more than 1 in all from one council", () => {
    const source = model.sources.find((s) => s.id === "nomis_census_odwp01ew")!;
    expect(source.licence).toMatch(/Open Government Licence/);
    expect(source.note).toMatch(/pandemic/);
    expect(census().length).toBeGreaterThan(20);
    const total = new Map<string, number>();
    for (const l of census()) {
      expect(l.honesty, l.id).toBe("real");
      expect(l.sources, l.id).toContain("nomis_census_odwp01ew");
      expect(l.share, l.id).toBeGreaterThanOrEqual(0.01);
      expect(l.share, l.id).toBeLessThanOrEqual(1);
      expect(l.strength, l.id).toBeUndefined();
      total.set(l.from, (total.get(l.from) ?? 0) + l.share!);
    }
    for (const [from, t] of total) expect(t, from).toBeLessThan(1);
    expect(model.meta.to_check.some((t) => /Census 2021 was taken in the pandemic/.test(t))).toBe(true);
  });

  it("matches the Census table for Cardiff, the biggest jobs centre", () => {
    const toCardiff = census().filter((l) => l.to === "W06000015").map((l) => l.from);
    // Every other council in play except Merthyr Tydfil, Monmouthshire and Blaenau Gwent sends 1 in 100 or more.
    expect(toCardiff.length).toBeGreaterThanOrEqual(6);
    const cardiffToVale = census().find((l) => l.id === "commute:cardiff-vale-of-glamorgan")!;
    expect(cardiffToVale.share).toBeCloseTo(0.0351, 3);
  });

  it("marks links to places off the board as outside, and only those", () => {
    const stubs = new Set(model.stubs.map((s) => s.id));
    for (const l of model.links) expect(Boolean(l.outside), l.id).toBe(stubs.has(l.to) || stubs.has(l.from));
  });

  it("derives rail links from the railway data, between councils that both have stations", () => {
    const rail = model.links.filter((l) => l.kind === "rail");
    expect(rail.length).toBeGreaterThanOrEqual(8);
    for (const l of rail) {
      expect(l.honesty, l.id).toBe("real");
      expect(l.sources, l.id).toContain("osm_rail_wales");
      expect(l.quality, l.id).toBe(1);
      expect(byCode(l.from).features, l.id).toContain("rail");
      expect(byCode(l.to).features, l.id).toContain("rail");
    }
    expect(rail.some((l) => l.from === "W06000016" && l.to === "W06000015")).toBe(true); // the Taff line, RCT to Cardiff
  });

  it("keeps every river row marked to check until the data is checked, and lists them in meta", () => {
    const rivers = model.links.filter((l) => l.kind === "river");
    expect(rivers.length).toBeGreaterThanOrEqual(9);
    expect(rivers.every((l) => l.to_check === true)).toBe(true);
    expect(model.meta.to_check.some((t) => /river rows still to check/.test(t))).toBe(true);
    const merthyr = rivers.find((l) => l.from === "W06000024");
    expect(merthyr?.to).toBe("W06000016"); // the Taff runs from Merthyr Tydfil to Rhondda Cynon Taf
  });

  it("falls back to labelled game estimates if the Census table is missing or not open", () => {
    for (const variant of [{ commute: undefined }, { forceFallback: true }, { sources: inputs.sources.map((s) => (s.id === "nomis_census_odwp01ew" ? { ...s, licence: "All rights reserved" } : s)) }]) {
      const built = assembleBoardModel({ ...inputs, ...variant });
      const commute = built.model.links.filter((l) => l.kind === "commute");
      expect(built.commute).toBe("fallback");
      expect(commute.length).toBeGreaterThan(8);
      for (const l of commute) {
        expect(l.honesty, l.id).toBe("game_estimate");
        expect(l.share, l.id).toBeUndefined();
        expect([1, 2, 3], l.id).toContain(l.strength);
        expect(l.sources, l.id).toContain("nomis_jobs_density");
        expect(l.outside, l.id).toBeUndefined();
      }
      expect(built.model.meta.to_check.some((t) => /fallback links are a game estimate/.test(t))).toBe(true);
    }
  });
});

describe("rules and words are labelled", () => {
  it("gives every rule card a kind, a confidence and an evidence grade", () => {
    expect(model.rules.length).toBeGreaterThan(0);
    for (const r of model.rules) {
      expect(["linear", "saturating", "stock", "threshold", "spread", "requires"], r.id).toContain(r.kind);
      expect(["high", "medium", "low"], r.id).toContain(r.confidence);
      expect(["assessed", "published", "expert", "placeholder"], r.id).toContain(r.evidence);
      expect(typeof r.game_rule, r.id).toBe("boolean");
    }
  });

  it("flags as a game rule every rule with no source", () => {
    for (const r of model.rules) if (r.sources.length === 0) expect(r.game_rule, r.id).toBe(true);
  });

  it("lists every Welsh draft for review, and every English word has a Welsh one", () => {
    const welsh = (v: unknown): { en: string; cy: string; cy_review?: boolean }[] =>
      Array.isArray(v) ? v.flatMap(welsh) : v && typeof v === "object" ? ("en" in v && "cy" in v && typeof v.en === "string" ? [v as { en: string; cy: string; cy_review?: boolean }] : Object.values(v).flatMap(welsh)) : [];
    const texts = welsh({ measures: model.measures, indicators: model.indicators, links: model.links, stubs: model.stubs, councils: model.councils });
    expect(texts.length).toBeGreaterThan(50);
    for (const t of texts) expect(t.cy.length, t.en).toBeGreaterThan(0);
    const listed = new Set(model.meta.cy_review);
    for (const section of ["measures", "indicators", "stubs"] as const) {
      for (const x of model[section] as { id: string }[]) expect(listed.has(`${section}:${x.id}`), `${section}:${x.id} is not in meta.cy_review`).toBe(true);
    }
    expect(model.meta.cy_review).toEqual([...model.meta.cy_review].sort());
  });

  it("uses no em or en dash anywhere in the model", () => {
    expect(new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]").test(JSON.stringify(model))).toBe(false);
  });
});
