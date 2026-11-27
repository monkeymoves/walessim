import { describe, expect, it } from "vitest";
import { andCy, iPlace, maePlace, soft, softYn, ynPlace } from "./cymraeg";

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
