/**
 * The second fixture board (ADR 0009): the lower Taff, Rhondda Cynon Taf and Cardiff, cut from the
 * three council fixture the way the build cuts a board from shared content. It has its own id,
 * name, save key and areas, two map groups, Merthyr Tydfil as a stub at the map edge, and only the
 * links, places and visits on it. Tests play whole games on both fixture boards, so nothing in the
 * engine assumes one board. Illustrative, like the first: `meta.fixture` is true.
 */
import { boardFixture } from "./fixture";
import { CARDIFF, MERTHYR, RCT, tx } from "./fixture-geo";
import type { BoardModel } from "./types";

const MERTHYR_STUB = "stub:merthyr";

export function boardFixtureTwo(): BoardModel {
  const m = boardFixture();
  const councils = [RCT, CARDIFF];
  m.meta = { ...m.meta, hash: "fixture-two" };
  m.game = {
    ...m.game,
    board: "fixture-two",
    region: tx("The lower Taff (two council fixture)", "Taf isaf (gosodiad dau gyngor)"),
    councils,
    areas: { core: [CARDIFF], edge: [RCT], valleys: [RCT], city: [CARDIFF] },
    map_groups: [{ id: "valleys", name: tx("The valleys", "Y cymoedd") }, { id: "city", name: tx("The city", "Y ddinas") }],
    save_key: "etifeddiaeth.board.v2.fixture-two.",
  };
  m.councils = m.councils.filter((c) => councils.includes(c.code));
  m.stubs = [...m.stubs, { id: MERTHYR_STUB, name: tx("Merthyr Tydfil", "Merthyr Tudful"), centre: [137.3, 194.8] }];
  // Links between councils on the board stay; work in Merthyr Tydfil becomes a fixed outside flow to its stub.
  m.links = m.links.flatMap((l) => {
    if (councils.includes(l.from) && councils.includes(l.to)) return [l];
    if (l.kind === "commute" && councils.includes(l.from) && l.to === MERTHYR) return [{ ...l, id: `${l.id}-stub`, to: MERTHYR_STUB, outside: true }];
    return [];
  });
  m.places = m.places.filter((p) => councils.includes(p.council));
  const on = new Set(m.places.map((p) => p.id));
  for (const x of [...m.projects, ...m.events]) if (x.visit && !on.has(x.visit)) delete x.visit;
  return m;
}
