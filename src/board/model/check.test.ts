import { describe, expect, it } from "vitest";
import { boardFixture } from "../engine/fixture";
import { acceptBoardModel, BoardModelLoadError, loadBoardIndex, loadBoardModel } from "./load";
import { checkBoardModel } from "./check";
import { BOARD_FILES, BOARD_FOLDER_FILES, checkBoardFile } from "./files";

describe("board model checks", () => {
  it("the typed fixture passes every shape and cross check", () => {
    expect(checkBoardModel(boardFixture())).toEqual([]);
  });

  it("each fixture section passes as its own model/board file", () => {
    const m = boardFixture();
    const { board, region, councils, areas, map_groups: _groups, ...calendar } = m.game;
    const files: Record<string, unknown> = {
      "game.yaml": { ...calendar, save_key: "etifeddiaeth.board.v2.", boards: [board] },
      "measures.yaml": { measures: m.measures },
      "bands.yaml": { bands: m.bands },
      "links.yaml": { links: m.links.filter((l) => l.kind === "river") },
      "rules/spread.yaml": { rules: m.rules.filter((r) => r.theme === "spread") },
      "rules/budget.yaml": { rules: m.rules.filter((r) => r.theme === "budget") },
      "rules/people.yaml": { rules: m.rules.filter((r) => r.theme === "people") },
      "rules/growth.yaml": { rules: m.rules.filter((r) => r.theme === "growth") },
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
      "story.yaml": { chapters: [{ id: "holding-on", name: { en: "Holding on", cy: "Dal ati" }, line: { en: "You held on.", cy: "Fe wnaethoch chi ddal ati." }, priority: 99, when: [] }] },
      "data/board-commute.json": { links: m.links.filter((l) => l.kind === "commute") },
    };
    expect(Object.keys(files).sort()).toEqual(Object.keys(BOARD_FILES).sort());
    for (const [name, parsed] of Object.entries(files)) expect(checkBoardFile(name, parsed), name).toEqual([]);
    for (const p of m.places) expect(checkBoardFile(`places/${p.id}.yaml`, p)).toEqual([]);
    const folder: Record<string, unknown> = {
      "board.yaml": { name: region, councils, areas: { core: ["city"], edge: ["valley"] }, map_groups: [], stubs: m.stubs, stops: { year: { on: true } } },
      "branch.yaml": { branch: m.branches[0], projects: m.projects.filter((p) => p.branch === m.branches[0]!.id) },
      "starts.yaml": { starts: m.starts },
      "events.yaml": { events: m.events },
      "words.yaml": { endings: { drift: { name: { en: "The slow drift", cy: "Y drifft araf", cy_review: true } } } },
    };
    expect(Object.keys(folder).sort()).toEqual(Object.keys(BOARD_FOLDER_FILES).sort());
    for (const [name, parsed] of Object.entries(folder)) expect(checkBoardFile(`boards/${board}/${name}`, parsed), name).toEqual([]);
    expect(Object.keys(areas)).toEqual(["core", "edge"]);
    expect(checkBoardFile("boards/x/board.yaml", { ...(folder["board.yaml"] as object), areas: { core: ["town"] } }).map((i) => i.path)).toEqual(["boards/x/board.yaml.areas.core[0]"]);
    expect(checkBoardFile("boards/x/other.yaml", {})[0]?.message).toBe("not a known board model file");
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
    expect(acceptBoardModel(structuredClone(m)).game.steps).toBe(96);
    expect(() => acceptBoardModel({ ...m, meta: { ...m.meta, version: 99 } })).toThrow(BoardModelLoadError);
    expect(() => acceptBoardModel({ ...m, endings: [] })).toThrow(/problem/);
    const asked: string[] = [];
    const fakeFetch = (async (url: string) => (asked.push(url), new Response(JSON.stringify(m)))) as unknown as typeof fetch;
    await expect(loadBoardModel(undefined, fakeFetch)).resolves.toMatchObject({ meta: { fixture: true } });
    await expect(loadBoardModel("fixture", fakeFetch)).resolves.toMatchObject({ game: { board: "fixture" } });
    expect(asked.map((u) => u.split("/").pop())).toEqual(["board-model.json", "board-model.fixture.json"]);
    await expect(loadBoardModel("north", fakeFetch)).rejects.toThrow(/holds board fixture, not north/);
    const missing = (async () => new Response("", { status: 404 })) as typeof fetch;
    await expect(loadBoardModel(undefined, missing)).rejects.toThrow(/404/);
  });

  it("the board list loads, and an empty one is refused", async () => {
    const list = { boards: [{ id: "fixture", name: { en: "F", cy: "F" }, councils: [], file: "board-model.fixture.json", hash: "x" }] };
    await expect(loadBoardIndex((async () => new Response(JSON.stringify(list))) as typeof fetch)).resolves.toEqual(list);
    await expect(loadBoardIndex((async () => new Response(JSON.stringify({ boards: [] }))) as typeof fetch)).rejects.toThrow(/no boards/);
  });

  it("checks the board's areas: its own councils, core and edge defined, map groups with no overlap, and every named area", () => {
    const issues = (f: (m: ReturnType<typeof boardFixture>) => void) => {
      const m = boardFixture();
      f(m);
      return checkBoardModel(m).map((i) => i.message);
    };
    expect(issues(() => {})).toEqual([]);
    expect(issues((m) => { m.game.areas.core = ["W06000001"]; })).toContain("W06000001 is not a council in play");
    expect(issues((m) => { delete m.game.areas.edge; })).toEqual(expect.arrayContaining([expect.stringMatching(/no area edge/), "unknown area edge"]));
    expect(issues((m) => { m.game.areas.north = [m.game.councils[0]!]; m.game.areas.south = m.game.councils.slice(0, 2); m.game.map_groups = [{ id: "north", name: m.game.region }, { id: "south", name: m.game.region }]; }))
      .toEqual(expect.arrayContaining([expect.stringMatching(/is in map groups north and south/), expect.stringMatching(/is in no map group/)]));
    expect(issues((m) => { m.starts[0]!.backing.push({ area: "coast", points: 1 }); })).toContain("unknown area coast");
  });
});
