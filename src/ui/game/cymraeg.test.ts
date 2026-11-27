import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../../i18n";
import { andCy, iPlace, maePlace, soft, softYn, tw, ynPlace } from "./cymraeg";

describe("Welsh helpers", () => {
  it("mutates and handles the article", () => {
    expect(maePlace("Y Rhondda")).toBe("Mae’r Rhondda");
    expect(iPlace("Y Rhondda")).toBe("i’r Rhondda");
    expect(iPlace("Bethesda a Dyffryn Ogwen")).toBe("i Fethesda a Dyffryn Ogwen");
    expect(soft("Diwylliant, iaith")).toBe("Ddiwylliant, iaith");
    expect(softYn("Cryf")).toBe("Gryf");
    expect(softYn("Gweddol")).toBe("Weddol");
    expect(softYn("Tenau")).toBe("Denau");
    expect(andCy("Caerffili")).toBe("a Chaerffili");
    expect(andCy("Abertawe")).toBe("ac Abertawe");
    expect(ynPlace("Gogledd Cymru")).toBe("yng Ngogledd Cymru");
    expect(ynPlace("Canolbarth Cymru")).toBe("yng Nghanolbarth Cymru");
  });
});

describe("copy with a name after a preposition (playtest 4)", () => {
  afterEach(() => setLang("en"));
  it("soft-mutates a strand after \"ar\" in the promise reasons", () => {
    setLang("cy");
    expect(tw("game.trust.reason.pledge_kept", { detail: "Llewyrchus" }, [])).toContain("ar Lewyrchus");
    expect(tw("game.trust.reason.pledge_broken", { detail: "Cydnerth" }, [])).toContain("ar Gydnerth");
    expect(tw("game.trust.reason.pledge_kept", { detail: "Iachach" }, [])).toContain("ar Iachach");
  });
  it("leaves English as it is", () => {
    setLang("en");
    expect(tw("game.trust.reason.pledge_kept", { detail: "Prosperous" }, [])).toBe("You kept your promise on Prosperous.");
  });
  it("elides the article after \"i\"", () => {
    setLang("cy");
    expect(tw("game.end.prompt.no_well", { place: "Y Rhondda" })).toMatch(/i'r Rhondda/);
    expect(tw("game.end.prompt.no_well", { place: "Bethesda a Dyffryn Ogwen" })).toMatch(/i Fethesda/);
  });
});
