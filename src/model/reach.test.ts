import { describe, expect, it } from "vitest";
import { compileFromDisk } from "../../scripts/model-files";
import { cardReach, playRegions, reachFlags } from "./reach";

const model = compileFromDisk().model!;
const la = (code: string) => model.authorities.find((a) => a.code === code)!;
const card = (id: string) => model.cards.find((c) => c.id === id)!;

describe("cardReach", () => {
  it("reaches every council area of the chosen region for a plain regional card", () => {
    const got = cardReach(model, { card: "build-flood-walls", region: "north" });
    const north = model.regions.find((r) => r.id === "north")!.authorities;
    expect([...got].sort()).toEqual([...north].sort());
  });

  it("reaches all 22 council areas for a national play", () => {
    const national = model.cards.find((c) => c.scope === "national" && c.effects.every((e) => !e.where))!;
    expect(cardReach(model, { card: national.id })).toHaveLength(22);
  });

  it("narrows to the place type the effects name: coal tips in the South East are the coal valleys there", () => {
    const got = cardReach(model, { card: "make-coal-tips-safe", region: "southeast" });
    expect(got.length).toBeGreaterThan(0);
    for (const c of got) {
      expect(la(c).region).toBe("southeast");
      expect(la(c).flags).toContain("coal_valley");
    }
    expect(got).toContain("W06000016"); // Rhondda Cynon Taf
    expect(got).not.toContain("W06000015"); // Cardiff
    expect(reachFlags(card("make-coal-tips-safe"))).toEqual(["coal_valley"]);
  });

  it("covers both regions of a two-region play", () => {
    const got = cardReach(model, { card: "build-flood-walls", regions: ["north", "mid"] });
    expect(new Set(got.map((c) => la(c).region))).toEqual(new Set(["north", "mid"]));
  });

  it("keeps model order and reaches nothing for an unknown card", () => {
    const got = cardReach(model, { card: "build-flood-walls", region: "southeast" });
    const order = model.authorities.map((a) => a.code).filter((c) => got.includes(c));
    expect(got).toEqual(order);
    expect(cardReach(model, { card: "no-such-card" })).toEqual([]);
  });

  it("reads a region play's regions, and null for all of Wales", () => {
    expect(playRegions(card("build-flood-walls"), { card: "build-flood-walls", region: "mid" })).toEqual(["mid"]);
    const national = model.cards.find((c) => c.scope === "national")!;
    expect(playRegions(national, { card: national.id })).toBeNull();
  });
});
