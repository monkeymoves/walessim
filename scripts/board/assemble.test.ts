import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel, BoardBuildError, boardIds, type BoardInputs } from "./assemble";
import { otherBoardsProjects, withoutOtherBoards } from "./other-boards";
import { readBoardInputs } from "./read-inputs";
import { playGame } from "../../src/board/engine/test-play";
import { allBots, playGame as botGame } from "../../src/board/engine/bots";
import type { BoardFile, BoardModel, BranchDef, ProjectDef, StartDef } from "../../src/board/engine/types";

type Inputs = Omit<BoardInputs, "v1Places" | "forceFallback" | "strict">;
let inputs: Inputs;
let southEast: BoardModel;
beforeAll(() => {
  inputs = readBoardInputs();
  southEast = assembleBoardModel(inputs).model;
});

const folder = (id: string) => inputs.boards[id]!;
const flagsOf = (code: string) => inputs.authorities.find((a) => a.code === code)!.flags;

describe("assembleBoardModel", () => {
  it("builds the default board, the South East, passing every check with a stable hash", () => {
    const a = southEast;
    const b = assembleBoardModel(inputs).model;
    expect(boardIds(inputs)[0]).toBe("southeast");
    expect(a.meta.hash).toMatch(/^[0-9a-f]{12}$/);
    expect(a.meta.hash).toBe(b.meta.hash);
    expect(a.game.board).toBe("southeast");
    expect(a.game.councils).toEqual((folder("southeast")["board.yaml"] as BoardFile).councils);
    expect(a.game.save_key).toBe("etifeddiaeth.board.v2.southeast.");
  });

  it("gives the South East's areas the councils its flags name: core the cities, edge the valleys", () => {
    const g = southEast.game;
    expect(g.areas.core).toEqual(g.councils.filter((c) => flagsOf(c).includes("city")));
    expect(g.areas.edge).toEqual(g.councils.filter((c) => flagsOf(c).includes("valley")));
    expect(g.areas.core).toHaveLength(2);
    expect(g.areas.edge).toHaveLength(6);
  });

  it("folds the board's folder in as if its content were written in the shared files", () => {
    const own = folder("southeast");
    const branch = own["branch.yaml"] as { branch: BranchDef; projects: ProjectDef[] };
    const tree = inputs.files["tree.yaml"] as { branches: BranchDef[] };
    const projects = (inputs.files["projects.yaml"] as { projects: ProjectDef[] }).projects;
    const flat: Inputs = {
      ...inputs,
      files: {
        ...inputs.files,
        "tree.yaml": { ...tree, branches: [branch.branch, ...tree.branches] },
        "projects.yaml": { projects: [...branch.projects, ...projects] },
        "starts.yaml": own["starts.yaml"],
      },
      boards: { southeast: { "board.yaml": own["board.yaml"] } },
    };
    expect(assembleBoardModel(flat).model).toEqual(southEast);
  });

  it("keeps each branch's projects together in tree order, legacy projects last", () => {
    const at = (p: ProjectDef) => (p.legacy_of ? 10 : 0) + southEast.branches.findIndex((b) => b.id === p.branch);
    const order = southEast.projects.map(at);
    expect(order).toEqual([...order].sort((x, y) => x - y));
    expect(southEast.branches[0]!.id).toBe("valleys");
  });

  it("leaves out a content file that fails its shape check, with a warning, and stops when strict", () => {
    const broken = { ...inputs, files: { ...inputs.files, "futures.yaml": { futures: [{ id: "x" }] } } };
    const built = assembleBoardModel(broken);
    expect(built.warnings.some((w) => w.includes("futures.yaml is left out"))).toBe(true);
    expect(built.model.futures.length).toBeGreaterThan(0);
    expect(() => assembleBoardModel({ ...broken, strict: true })).toThrow(BoardBuildError);
  });

  it("always stops on a problem in a file this package owns, or in a board's board.yaml", () => {
    const measures = inputs.files["measures.yaml"] as { measures: { indicators: string[] }[] };
    const bad = { ...inputs.files, "measures.yaml": { measures: [{ ...measures.measures[0], indicators: ["no_such_indicator"] }, ...measures.measures.slice(1)] } };
    expect(() => assembleBoardModel({ ...inputs, files: bad })).toThrow(/no_such_indicator/);
    const noBands = { ...inputs.files };
    delete noBands["bands.yaml"];
    expect(() => assembleBoardModel({ ...inputs, files: noBands })).toThrow(/bands.yaml is missing/);
    const board = { ...(folder("southeast")["board.yaml"] as BoardFile), areas: { core: ["town"] } };
    expect(() => assembleBoardModel({ ...inputs, boards: { southeast: { ...folder("southeast"), "board.yaml": board } } })).toThrow(/areas.core\[0\]/);
    expect(() => assembleBoardModel({ ...inputs, board: "atlantis" })).toThrow(/no folder model\/board\/boards\/atlantis/);
  });

  it("stops if a council has no real value for a seeded indicator", () => {
    const la = structuredClone(inputs.laIndicators);
    delete la.indicators.employment!.values["W06000024"];
    expect(() => assembleBoardModel({ ...inputs, laIndicators: la })).toThrow(/no real value for employment in Merthyr Tydfil/);
  });

  it("stops if a source the data names has no entry", () => {
    const sources = inputs.sources.filter((s) => s.id !== "nomis_aps");
    expect(() => assembleBoardModel({ ...inputs, sources })).toThrow(/nomis_aps/);
  });

  it("strict mode refuses content filled in from the fixture", () => {
    const own = ["measures.yaml", "bands.yaml", "links.yaml", "indicators.yaml", "game.yaml"];
    const files = Object.fromEntries(Object.entries(inputs.files).filter(([n]) => own.includes(n)));
    const boards = { southeast: { "board.yaml": folder("southeast")["board.yaml"] } };
    expect(() => assembleBoardModel({ ...inputs, files, boards, places: {}, strict: true })).toThrow(/not all written yet/);
    const built = assembleBoardModel({ ...inputs, files, boards, places: {} }).model;
    expect(built.meta.to_check.some((t) => t.startsWith("content: endings"))).toBe(true);
    expect(built.councils).toHaveLength(10);
  });
});

/**
 * A second board written only as a folder, over the real shared content: the Taff and the Ely,
 * four councils. It reuses the South East's branch by reference (test data, not a copied file),
 * replaces one start, adds map groups and renames an ending.
 */
describe("a second board from a folder", () => {
  const TAFF = ["W06000024", "W06000016", "W06000015", "W06000014"];
  let taff: BoardModel;
  beforeAll(() => {
    const se = folder("southeast");
    const starts = (se["starts.yaml"] as { starts: StartDef[] }).starts;
    const board: BoardFile = {
      name: { en: "The Taff and the Ely", cy: "Taf ac Elái" },
      councils: TAFF,
      areas: { core: ["city"], edge: ["valley", "rural"] },
      map_groups: [
        { id: "upper", name: { en: "Up the valley", cy: "I fyny'r cwm" }, councils: ["W06000024", "W06000016"] },
        { id: "lower", name: { en: "Down by the sea", cy: "I lawr wrth y môr" }, councils: ["W06000015", "W06000014"] },
      ],
      stubs: (se["board.yaml"] as BoardFile).stubs.filter((s) => s.id === "stub:powys" || s.id === "stub:npt"),
      stops: { year: { on: true } },
    };
    const warm = { ...starts.find((s) => s.id === "warm-homes")!, name: { en: "Warm homes by the Taff", cy: "Cartrefi cynnes ger y Taf" } };
    taff = assembleBoardModel({
      ...inputs,
      // The South East's starts stand in for shared ones here, so the board's own can replace one.
      files: { ...inputs.files, "starts.yaml": { starts } },
      strict: true,
      board: "taff",
      boards: {
        ...inputs.boards,
        taff: {
          "board.yaml": board,
          "branch.yaml": se["branch.yaml"],
          "starts.yaml": { starts: [warm] },
          "words.yaml": { endings: { drift: { name: { en: "The slow drift", cy: "Y drifft araf" } } } },
        },
      },
    }).model;
  });

  it("compiles strictly with its own councils, areas, map groups, stops and save key", () => {
    const g = taff.game;
    expect(g.board).toBe("taff");
    expect(g.councils).toEqual(TAFF);
    expect(g.areas.core).toEqual(["W06000015"]);
    expect(g.areas.edge).toEqual(["W06000024", "W06000016"]);
    expect(g.areas.upper).toEqual(["W06000024", "W06000016"]);
    expect(g.map_groups.map((x) => x.id)).toEqual(["upper", "lower"]);
    expect(g.stops.year).toEqual({ on: true });
    expect(g.save_key).toBe("etifeddiaeth.board.v2.taff.");
    expect(taff.meta.hash).not.toBe(southEast.meta.hash);
  });

  it("takes only the links, stubs and places on it, and offers no visit to a place off it", () => {
    const on = new Set([...TAFF, ...taff.stubs.map((s) => s.id)]);
    for (const l of taff.links) expect(on.has(l.from) && on.has(l.to), l.id).toBe(true);
    expect(taff.links.some((l) => l.kind === "river")).toBe(true);
    expect(taff.places.map((p) => p.id)).toEqual(["rhondda"]);
    for (const x of [...taff.projects, ...taff.events]) if (x.visit) expect(x.visit).toBe("rhondda");
  });

  it("overrides shared content by id and renames words, without touching the South East", () => {
    expect(taff.starts.map((s) => s.id)).toEqual(southEast.starts.map((s) => s.id));
    expect(taff.starts.find((s) => s.id === "warm-homes")!.name.en).toBe("Warm homes by the Taff");
    expect(taff.endings.find((e) => e.id === "drift")!.name.en).toBe("The slow drift");
    expect(southEast.endings.find((e) => e.id === "drift")!.name.en).not.toBe("The slow drift");
  });

  it("refuses a rename of something not on the board", () => {
    const bad = { ...inputs, board: "taff", boards: { taff: { "board.yaml": folder("southeast")["board.yaml"], "words.yaml": { endings: { atlantis: { name: { en: "x", cy: "x" } } } } } } };
    expect(() => assembleBoardModel(bad)).toThrow(/no endings entry atlantis/);
  });

  it("plays whole games with the test player and every balance bot", () => {
    for (const start of taff.starts.map((s) => s.id)) {
      const { state } = playGame(taff, 9, start);
      expect(state.phase).toBe("ended");
      expect(state.board).toBe("taff");
    }
    for (const bot of allBots(taff)) expect(botGame(taff, bot, 3, taff.starts[0]!.id).phase, bot.id).toBe("ended");
  }, 120_000);
});

/**
 * Shared content that names another board's projects (scripts/board/other-boards.ts): on a board
 * whose own branch has none of the valleys projects, the pairs, event sizes and preparations and
 * the place that name them are left out; on the South East they stay. Any other unknown name
 * still fails the cross check.
 */
describe("lines naming another board's projects", () => {
  const VALLEYS = ["frequent-trains", "buses-meet-trains", "station-quarter", "work-up-the-line", "evening-trains"];
  const named = (m: BoardModel) => JSON.stringify({ pairs: m.pairs, events: m.events, places: m.places.map(({ board: _b, ...p }) => p) });

  it("are left out on a board without them and kept where the board has them", () => {
    const other = { ...inputs.boards, coast: { "board.yaml": folder("southeast")["board.yaml"] } };
    const away = otherBoardsProjects(other, "coast");
    expect([...away].sort()).toEqual([...VALLEYS].sort());
    expect(otherBoardsProjects(other, "southeast").size).toBe(0);
    const { files, places } = withoutOtherBoards(inputs.files, inputs.places, away);
    const text = JSON.stringify({ pairs: files["pairs.yaml"], events: files["events.yaml"], places });
    for (const id of VALLEYS) expect(text.includes(`"${id}"`), id).toBe(false);
    expect(Object.keys(places)).not.toContain("ebbw-vale");
    for (const id of ["buses-meet-trains", "station-quarter"]) expect(named(southEast).includes(`"${id}"`), id).toBe(true);
  });

  it("leaves an unknown name that is on no board for the cross check to refuse", () => {
    const events = (inputs.files["events.yaml"] as { events: { prepared_by: string[] }[] }).events;
    const typo = { ...inputs.files, "events.yaml": { events: [{ ...events[0]!, prepared_by: [...events[0]!.prepared_by, "buses-meet-trainz"] }, ...events.slice(1)] } };
    const out = withoutOtherBoards(typo, inputs.places, new Set(VALLEYS)).files["events.yaml"] as { events: { prepared_by: string[] }[] };
    expect(out.events[0]!.prepared_by).toContain("buses-meet-trainz");
    expect(() => assembleBoardModel({ ...inputs, files: typo, strict: true })).toThrow(/buses-meet-trainz/);
  });
});
