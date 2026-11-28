import { describe, expect, it } from "vitest";
import { boardFixture } from "../engine/fixture";
import { acceptBoardModel, BoardModelLoadError, loadBoardModel } from "./load";
import { checkBoardModel } from "./check";
import { BOARD_FILES, checkBoardFile } from "./files";

describe("board model checks", () => {
  it("the typed fixture passes every shape and cross check", () => {
    expect(checkBoardModel(boardFixture())).toEqual([]);
  });

  it("each fixture section passes as its own model/board file", () => {
    const m = boardFixture();
    const files: Record<string, unknown> = {
      "game.yaml": m.game,
      "measures.yaml": { measures: m.measures },
      "bands.yaml": { bands: m.bands },
      "links.yaml": { links: m.links.filter((l) => l.kind === "river"), stubs: m.stubs },
      "rules/spread.yaml": { rules: m.rules.filter((r) => r.theme === "spread") },
      "rules/budget.yaml": { rules: m.rules.filter((r) => r.theme === "budget") },
      "rules/people.yaml": { rules: m.rules.filter((r) => r.theme === "people") },
      "projects.yaml": { projects: m.projects },
      "tree.yaml": { branches: m.branches },
      "pairs.yaml": { pairs: m.pairs },
      "laws.yaml": { laws: m.laws },
      "groups.yaml": { groups: m.groups },
      "events.yaml": { events: m.events, note: "fixture" },
      "futures.yaml": { futures: m.futures },
      "starts.yaml": { starts: m.starts },
      "endings.yaml": { endings: m.endings },
      "letters.yaml": { letters: m.letters },
      "data/board-commute.json": { links: m.links.filter((l) => l.kind === "commute") },
    };
    expect(Object.keys(files).sort()).toEqual(Object.keys(BOARD_FILES).sort());
    for (const [name, parsed] of Object.entries(files)) expect(checkBoardFile(name, parsed), name).toEqual([]);
    for (const p of m.places) expect(checkBoardFile(`places/${p.id}.yaml`, p)).toEqual([]);
  });

  it("reports a typo, a wrong value and a missing field with their paths", () => {
    const issues = checkBoardFile("projects.yaml", {
      projects: [{ ...boardFixture().projects[0], cots: 3, site: "valley", name: undefined }],
    });
    const paths = issues.map((i) => i.path);
    expect(paths).toContain("projects.yaml.projects[0].cots");
    expect(paths).toContain("projects.yaml.projects[0].site");
    expect(paths).toContain("projects.yaml.projects[0].name");
  });

  it("checks inside conditions and effects", () => {
    const p = { ...boardFixture().projects[0]!, needs: [{ kind: "feature", feature: "volcano" }], effects: [{ kind: "measure", measure: "joy", points: 1 }] };
    const paths = checkBoardFile("projects.yaml", { projects: [p] }).map((i) => i.path);
    expect(paths).toContain("projects.yaml.projects[0].needs[0].feature");
    expect(paths).toContain("projects.yaml.projects[0].effects[0].measure");
  });

  it("finds broken references across files", () => {
    const m = boardFixture();
    m.pairs[0]!.project = "no-such-project";
    m.starts[0]!.free_project = "heat-and-homes";
    m.events[0]!.prepared_by = ["slow-the-water"];
    delete m.councils[0]!.real.employment;
    m.rules = m.rules.filter((r) => r.id !== "S3");
    const messages = checkBoardModel(m).map((i) => `${i.path}: ${i.message}`).join("\n");
    expect(messages).toContain("unknown project no-such-project");
    expect(messages).toContain("the free project must be tier 1");
    expect(messages).toContain("fairness rule 3");
    expect(messages).toContain("councils[0].real.employment");
    expect(messages).toContain("missing rule S3");
  });

  it("refuses an em dash anywhere in the model", () => {
    const m = boardFixture();
    m.projects[0]!.what.en = `Trains ${String.fromCharCode(0x2014)} more of them`;
    expect(checkBoardModel(m).some((i) => i.message.includes("em dash"))).toBe(true);
  });

  it("the loader checks the version and the contents", async () => {
    const m = boardFixture();
    expect(acceptBoardModel(structuredClone(m)).game.turns).toBe(12);
    expect(() => acceptBoardModel({ ...m, meta: { ...m.meta, version: 99 } })).toThrow(BoardModelLoadError);
    expect(() => acceptBoardModel({ ...m, endings: [] })).toThrow(/problem/);
    const fakeFetch = (async () => new Response(JSON.stringify(m))) as typeof fetch;
    await expect(loadBoardModel("board-model.json", fakeFetch)).resolves.toMatchObject({ meta: { fixture: true } });
    const missing = (async () => new Response("", { status: 404 })) as typeof fetch;
    await expect(loadBoardModel("board-model.json", missing)).rejects.toThrow(/404/);
  });
});
