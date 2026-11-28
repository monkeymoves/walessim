/**
 * Local truth for the river links of model/board/links.yaml (playtest 8, should-fix 12: "The Ely
 * flooded Barry", though the Ely reaches the sea at Cardiff). Each river runs one way, one hop at
 * a time, and ends where the real river does. Water runs downhill (S4) and storms name the river,
 * so a fork or a wrong mouth puts a flood in the wrong town.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

interface River { id: string; kind: string; from: string; to: string; name: { en: string } }
const links = (yaml.load(readFileSync(resolve(__dirname, "../../../model/board/links.yaml"), "utf8")) as { links: River[] }).links
  .filter((l) => l.kind === "river");

/** Council codes of the board, by name, for readable expectations. */
const C = {
  bridgend: "W06000013", vale: "W06000014", cardiff: "W06000015", rct: "W06000016", caerphilly: "W06000018",
  blaenauGwent: "W06000019", torfaen: "W06000020", monmouthshire: "W06000021", newport: "W06000022", merthyr: "W06000024",
} as const;

/**
 * Each river's course through the councils in play, source to sea (OS mapping of the river
 * lines; the towns are in the links.yaml header).
 */
const COURSES: Record<string, string[]> = {
  Taff: [C.merthyr, C.rct, C.cardiff],
  Rhymney: [C.caerphilly, C.cardiff],
  Ebbw: [C.blaenauGwent, C.caerphilly, C.newport],
  "Afon Lwyd": [C.torfaen, C.newport],
  Usk: [C.monmouthshire, C.newport],
  Ely: [C.rct, C.vale, C.cardiff],
  Ogmore: [C.bridgend, C.vale],
};

describe("river links follow the real rivers", () => {
  it("every river in links.yaml is one known course, link by link, and nothing else", () => {
    const byRiver = new Map<string, River[]>();
    for (const l of links) byRiver.set(l.name.en, [...(byRiver.get(l.name.en) ?? []), l]);
    expect([...byRiver.keys()].sort()).toEqual(Object.keys(COURSES).sort());
    for (const [river, course] of Object.entries(COURSES)) {
      const hops = course.slice(1).map((to, i) => `${course[i]}>${to}`).sort();
      expect((byRiver.get(river) ?? []).map((l) => `${l.from}>${l.to}`).sort(), river).toEqual(hops);
    }
  });

  it("no river forks: a council sends each river on to one council at most", () => {
    const seen = new Set<string>();
    for (const l of links) {
      const k = `${l.name.en}|${l.from}`;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  it("the Ely ends at Cardiff, not in the Vale", () => {
    const ely = links.filter((l) => l.name.en === "Ely");
    const mouths = ely.filter((l) => !ely.some((m) => m.from === l.to)).map((l) => l.to);
    expect(mouths).toEqual([C.cardiff]);
  });
});
