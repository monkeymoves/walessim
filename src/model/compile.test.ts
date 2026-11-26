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
});
