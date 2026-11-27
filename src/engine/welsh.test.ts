import { describe, expect, it } from "vitest";
import { fill, joinNames, softMutate, nasalMutate, aspirateMutate, unmutatedAfterTrigger } from "./welsh";

describe("Welsh slot filling", () => {
  it("soft-mutates after prepositions, keeping capitals", () => {
    expect(softMutate("Caerdydd")).toBe("Gaerdydd");
    expect(softMutate("Diwylliant")).toBe("Ddiwylliant");
    expect(softMutate("Gwynedd")).toBe("Wynedd");
    expect(softMutate("Llandudno")).toBe("Landudno");
    expect(softMutate("Rhosllannerchrugog")).toBe("Rosllannerchrugog");
    expect(softMutate("Ddinbych")).toBe("Ddinbych");
    expect(softMutate("Abertawe")).toBe("Abertawe");
    expect(nasalMutate("Treorci")).toBe("Nhreorci");
    expect(aspirateMutate("Caerffili")).toBe("Chaerffili");
  });
  it("fills slots with the right mutation and article", () => {
    expect(fill({ en: "Go to {place}", cy: "Mynd i {place}" }, { place: { en: "The Rhondda", cy: "Y Rhondda" } }).cy).toBe("Mynd i'r Rhondda");
    expect(fill({ en: "x", cy: "Mae {place} yn gofyn" }, { place: { en: "The Rhondda", cy: "Y Rhondda" } }).cy).toBe("Mae'r Rhondda yn gofyn");
    expect(fill({ en: "x", cy: "Gadewch i {thing} gwympo" }, { thing: { en: "Culture", cy: "Diwylliant" } }).cy).toBe("Gadewch i Ddiwylliant gwympo");
    expect(fill({ en: "x", cy: "Yn ôl yn {place}" }, { place: { en: "Treorchy", cy: "Treorci" } }, ["place"]).cy).toBe("Yn ôl yn Nhreorci");
    expect(fill({ en: "x", cy: "Cardiff a {place}" }, { place: { en: "Caerphilly", cy: "Caerffili" } }).cy).toBe("Cardiff a Chaerffili");
    expect(fill({ en: "{place}, 2050.", cy: "{place}, 2050." }, { place: { en: "Barry", cy: "Y Barri" } }).cy).toBe("Y Barri, 2050.");
    expect(fill({ en: "x", cy: "o {place}" }, { place: { en: "Barry", cy: "Y Barri" } }).cy).toBe("o'r Barri");
    expect(fill({ en: "In {year}", cy: "Yn {year}" }, { year: 2038 }).cy).toBe("Yn 2038");
    expect(fill({ en: "Hi {place}", cy: "x" }, { place: { en: "The Rhondda", cy: "Y Rhondda" } }).en).toBe("Hi The Rhondda");
  });
  it("says 'yng' and 'ym' before a nasal-mutated place, and 'ac' before a vowel (cold playtest 6, Welsh)", () => {
    expect(fill({ en: "x", cy: "Os chwaraewch chi hwn yn {place}" }, { place: { en: "North Wales", cy: "Gogledd Cymru" } }).cy).toBe("Os chwaraewch chi hwn yng Ngogledd Cymru");
    expect(fill({ en: "x", cy: "Yn {place}" }, { place: { en: "Powys", cy: "Powys" } }).cy).toBe("Ym Mhowys");
    expect(fill({ en: "x", cy: "yn {place}" }, { place: { en: "Bangor", cy: "Bangor" } }).cy).toBe("ym Mangor");
    expect(fill({ en: "x", cy: "yn {place}" }, { place: { en: "Swansea", cy: "Abertawe" } }).cy).toBe("yn Abertawe");
    expect(fill({ en: "x", cy: "cartrefi a {thing}" }, { thing: { en: "Reworking", cy: "Ailweithio" } }, []).cy).toBe("cartrefi ac Ailweithio");
    expect(joinNames([{ en: "Homes", cy: "Cartrefi" }, { en: "Reworking", cy: "Ailweithio" }]).cy).toBe("Cartrefi ac Ailweithio");
    expect(joinNames([{ en: "Homes", cy: "Cartrefi" }, { en: "Tips", cy: "Tomenni" }]).cy).toBe("Cartrefi a Thomenni");
  });
  it("finds unmutated words after a trigger", () => {
    expect(unmutatedAfterTrigger("Gadewch i Caerdydd gwympo")).toEqual(["i Caerdydd"]);
    expect(unmutatedAfterTrigger("am Gartrefi cynnes")).toEqual([]);
    expect(unmutatedAfterTrigger("Mynd i Y Rhondda")).toEqual(["i Y"]);
    expect(unmutatedAfterTrigger("Mynd i'r Rhondda a Chaerffili")).toEqual([]);
  });
});
