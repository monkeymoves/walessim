import { describe, expect, it } from "vitest";
import { compileFromDisk, readModelFiles } from "../../scripts/model-files";
import { compileModel } from "./compile";
import { STRAND_IDS } from "./schema";

describe("the model build", () => {
  const r = compileFromDisk();
  it("compiles with no errors", () => {
    expect(r.errors).toEqual([]);
    expect(r.model).not.toBeNull();
  });
  const m = r.model!;
  it("has the 35 rules, 20 cards, 2 standing tickets, 12 curveballs and both boards", () => {
    expect(m.rules.length).toBe(35);
    expect(m.cards.length).toBe(20);
    expect(m.standing.length).toBe(2);
    expect(m.curveballs.length).toBe(12);
    expect(m.places.map((p) => p.id).sort()).toEqual(["bethesda", "rhondda"]);
  });
  it("cites a known source on every rule", () => {
    const ids = new Set(m.sources.map((s) => s.id));
    for (const rule of m.rules) for (const s of rule.sources) expect(ids.has(s), `${rule.id} ${s}`).toBe(true);
  });
  it("meets the deck coverage check: every strand helped by at least four cards and frayed by at least two (equal: by placement)", () => {
    for (const s of STRAND_IDS) {
      const helps = m.cards.filter((c) => c.helps!.includes(s)).length;
      const frays = m.cards.filter((c) => c.frays!.includes(s)).length;
      expect(helps, `${s} helped by ${helps}`).toBeGreaterThanOrEqual(4);
      // equal is frayed by where cards land (gains away from the five worst-off widen the gap), not by a card's face
      if (s !== "equal") expect(frays, `${s} frayed by ${frays}`).toBeGreaterThanOrEqual(2);
    }
  });
  it("lets every region be a legal target for at least eleven cards", () => {
    for (const r of m.regions) {
      const n = m.cards.filter((c) => c.scope === "national" || (c.regions ?? ["north", "mid", "southwest", "southeast"]).includes(r.id)).length;
      expect(n, r.id).toBeGreaterThanOrEqual(11);
    }
  });
  it("fails clearly on a dangling id, naming the file and id", () => {
    const raw = readModelFiles();
    const cards = structuredClone(raw.cards) as { cards: { id: string; effects: { rule?: string }[] }[] };
    cards.cards[0]!.effects[0]!.rule = "R99";
    const bad = compileModel({ ...raw, cards });
    expect(bad.model).toBeNull();
    expect(bad.errors.join("\n")).toMatch(/cards\.yaml: restore-upland-peat effect .*unknown rule R99/);
  });
  it("fails on a Text with no Welsh and no cy_review", () => {
    const raw = readModelFiles();
    const curveballs = structuredClone(raw.curveballs) as { curveballs: { name: { en: string; cy?: string; cy_review?: boolean } }[] };
    curveballs.curveballs[0]!.name = { en: "Only English" };
    expect(compileModel({ ...raw, curveballs }).errors.join("\n")).toMatch(/curveballs\.yaml: wet-decade: name has no Welsh/);
  });
  describe("card facts and lines (plain-wales 2.1, 6.1)", () => {
    type RawCard = { id: string; fact?: unknown; what?: unknown; catch?: unknown; picture?: unknown };
    const withCard = (edit: (c: RawCard) => void) => {
      const raw = readModelFiles();
      const cards = structuredClone(raw.cards) as { cards: RawCard[] };
      const c = cards.cards.find((x) => x.id === "build-flood-walls")!;
      edit(c);
      return compileModel({ ...raw, cards });
    };
    it("resolves a fact from the data: the highest area, its value, the Wales value, year and source", () => {
      const r = withCard((c) => { c.fact = { indicator: "flood_exposure", pick: "highest" }; });
      expect(r.errors).toEqual([]);
      const f = r.model!.cards.find((c) => c.id === "build-flood-walls")!.fact!;
      const d = r.model!.la_data.flood_exposure!;
      const top = Math.max(...r.model!.authorities.map((a) => d.values[a.code] ?? -Infinity));
      expect(f.value).toBe(top);
      expect(f.rank).toBe(1);
      expect(f.wales).toBe(d.values.W92000004);
      expect(f.year).toBe(String(d.year));
      expect(r.model!.sources.some((s) => s.id === f.source)).toBe(true);
    });
    it("resolves lowest, wales and a fixed area code", () => {
      const low = withCard((c) => { c.fact = { indicator: "welsh_speakers", pick: "lowest" }; }).model!.cards.find((c) => c.id === "build-flood-walls")!.fact!;
      expect(low.rank).toBe(22);
      const w = withCard((c) => { c.fact = { indicator: "welsh_speakers", pick: "wales" }; }).model!.cards.find((c) => c.id === "build-flood-walls")!.fact!;
      expect(w.la).toBeNull();
      expect(w.value).toBeNull();
      const fixed = withCard((c) => { c.fact = { indicator: "welsh_speakers", pick: "W06000002" }; }).model!.cards.find((c) => c.id === "build-flood-walls")!.fact!;
      expect(fixed.la).toBe("W06000002");
    });
    it("fails on an unknown indicator, an indicator with no data, or a bad pick", () => {
      expect(withCard((c) => { c.fact = { indicator: "no_such", pick: "highest" }; }).errors.join("\n")).toMatch(/cards\.yaml: build-flood-walls: fact names unknown indicator no_such/);
      expect(withCard((c) => { c.fact = { indicator: "flood_exposure", pick: "W06000099" }; }).errors.join("\n")).toMatch(/fact pick W06000099/);
      expect(withCard((c) => { c.fact = "flood_exposure"; }).errors.join("\n")).toMatch(/fact must be/);
      const raw = readModelFiles();
      const la = structuredClone(raw.laIndicators) as { indicators: Record<string, unknown> };
      delete la.indicators.flood_exposure;
      const cards = structuredClone(raw.cards) as { cards: RawCard[] };
      cards.cards.find((x) => x.id === "build-flood-walls")!.fact = { indicator: "flood_exposure", pick: "highest" };
      expect(compileModel({ ...raw, cards, laIndicators: la }).errors.join("\n")).toMatch(/fact indicator flood_exposure has no data/);
    });
    it("fails when the fact's source is not in sources.yaml", () => {
      const raw = readModelFiles();
      const inds = structuredClone(raw.indicators) as { indicators: { id: string; source?: string; sources?: string[] }[] } | { id: string; source?: string; sources?: string[] }[];
      const list = Array.isArray(inds) ? inds : inds.indicators;
      const i = list.find((x) => x.id === "flood_exposure")!;
      i.source = "nowhere";
      delete i.sources;
      const cards = structuredClone(raw.cards) as { cards: RawCard[] };
      cards.cards.find((x) => x.id === "build-flood-walls")!.fact = { indicator: "flood_exposure", pick: "highest" };
      expect(compileModel({ ...raw, cards, indicators: inds }).errors.join("\n")).toMatch(/has no source in sources\.yaml \(nowhere\)/);
    });
    it("checks what, catch and picture: bilingual, no dashes, and no number in a picture", () => {
      const ok = withCard((c) => {
        c.what = { en: "Strong walls by rivers.", cy: "Waliau cryf.", cy_review: true };
        c.catch = { en: "Walls need care.", cy: "Mae angen gofal.", cy_review: true };
        c.picture = { en: "A family sleeps through a storm.", cy: "Mae teulu'n cysgu.", cy_review: true };
      });
      expect(ok.errors).toEqual([]);
      const card = ok.model!.cards.find((c) => c.id === "build-flood-walls")!;
      expect(card.what!.en).toMatch(/Strong walls/);
      expect(card.catch!.en).toMatch(/care/);
      expect(withCard((c) => { c.picture = { en: "Ten homes stay dry.", cy: "Mae 10 cartref yn sych.", cy_review: true }; }).errors.join("\n")).toMatch(/picture .*must not contain a number/);
      expect(withCard((c) => { c.what = { en: "Walls \u2014 strong ones", cy: "Waliau", cy_review: true }; }).errors.join("\n")).toMatch(/what contains an em or en dash/);
      expect(withCard((c) => { c.catch = { en: "Only English" }; }).errors.join("\n")).toMatch(/catch has no Welsh/);
    });
    it("leaves the display-only lines out of the rule set hash", () => {
      const a = withCard((c) => { c.fact = { indicator: "flood_exposure", pick: "highest" }; }).model!.meta.hash;
      const b = withCard((c) => { c.fact = { indicator: "welsh_speakers", pick: "lowest" }; }).model!.meta.hash;
      expect(a).toBe(b);
    });
  });
});

