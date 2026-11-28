/**
 * The three council fixture model: Merthyr Tydfil, Rhondda Cynon Taf and Cardiff on the Taff.
 * Small enough to reason about by hand, rich enough to run every engine rule and render every
 * screen: all four branches to their keystones, pairs, laws, five groups, outside and grown
 * events (good and bad), four futures, three starts, all eight endings and two places.
 *
 * Real: the councils' 2026 indicator values, their sources and the bands.
 * Illustrative: link shares, project and event numbers, futures. `meta.fixture` is true so no
 * screen ever presents it as the real board. The real model is public/board-model.json.
 *
 * `boardFixture()` returns a fresh copy each call, so a test cannot leak changes into another. It
 * runs on the clock at a quarter year step, keystones start by 2042 as in phase 1, and no phase 2
 * rule card (R1 to R4, E2, P6) is in it, so it behaves as phase 1 did (ADR 0007).
 */
import { CARDIFF, MERTHYR, RCT, fixtureBands, fixtureCouncils, fixtureIndicators, fixtureLinks, fixtureMeasures, fixtureSources, fixtureStubs, tx } from "./fixture-geo";
import { fixtureRules } from "./fixture-rules";
import { fixtureBranches, fixtureGroups, fixtureLaws, fixturePairs, fixturePlaces, fixtureProjects } from "./fixture-content";
import { fixtureEndings, fixtureEvents, fixtureFutures, fixtureLetters, fixtureStarts } from "./fixture-story";
import type { BoardGame, BoardModel, BoardRule, BranchDef, Text } from "./types";

/** Which stops are hard and which are on by default (docs/design/v2-board.md 16.2.5), as game.yaml has them. */
export const FIXTURE_STOPS: BoardGame["stops"] = {
  respond: { hard: true }, election: { hard: true }, ended: { hard: true },
  warning: { on: true }, keystone: { on: true }, tier_open: { on: true }, visit: { on: true }, tipping: { on: true },
  chapter: { on: true }, deal_due: { on: true }, purse_full: { on: true }, finished: { on: false }, year: { on: false },
};

/** The fixture's councils, upstream first. */
export const FIXTURE_COUNCILS = { merthyr: MERTHYR, rct: RCT, cardiff: CARDIFF } as const;

/**
 * The build turns every tier gate into a `requires` rule card (ADR 0005), id
 * `need:<branch>:<tier>`, so a locked project's Why? ends at a rule page. Done the same way here.
 */
export function gateRules(branches: BranchDef[], notes: Record<string, Text> = {}): BoardRule[] {
  const out: BoardRule[] = [];
  for (const b of branches) {
    for (const t of b.tiers) {
      if (t.opens.length === 0) continue;
      const id = `need:${b.id}:${t.tier}`;
      t.rule = id;
      // The notes are data in tree.yaml `gate_notes` (the Welsh pass owns them); these are the fixture's.
      // Playtest 9 must-fix 1: the keystone's gate is the branch's one bigger project working in two
      // councils, said exactly. The project after the keystone (legacy) never counts.
      const note = notes[String(t.tier)] ?? (t.tier === 2
        ? tx("Bigger projects open when three starter projects of this branch are working anywhere. The same one in two councils counts twice.",
          "Mae prosiectau mwy yn agor pan fydd tri phrosiect cychwynnol o'r gangen hon yn gweithio, unrhyw le. Mae'r un prosiect mewn dau gyngor yn cyfrif ddwywaith.")
        : tx("The keystone opens when this branch's bigger project is working in two councils. The project that comes after the keystone does not count.",
          "Mae'r maen clo yn agor pan fydd prosiect mwy'r gangen hon yn gweithio mewn dau gyngor. Dydy'r prosiect sy'n dod ar ôl y maen clo ddim yn cyfrif."));
      out.push({
        id, theme: "projects", kind: "requires",
        name: tx(`${b.name.en}: tier ${t.tier} opens`, `${b.name.cy}: haen ${t.tier} yn agor`),
        note,
        params: {}, sources: [], confidence: "high", evidence: "placeholder", game_rule: true,
        requires: { applies_to: { branch: b.id, tier: t.tier }, needs: t.opens },
      });
    }
  }
  return out;
}

export function boardFixture(): BoardModel {
  const branches: BranchDef[] = structuredClone(fixtureBranches);
  const model: BoardModel = {
    meta: { version: 2, generated: "2026-11-28", hash: "fixture-2", cy_review: [], to_check: ["links: illustrative shares"], fixture: true },
    game: {
      region: tx("South East Wales (three council fixture)", "De Ddwyrain Cymru (gosodiad tri chyngor)"),
      councils: [MERTHYR, RCT, CARDIFF],
      first_year: 2026, end_year: 2050, years_per_step: 0.25, steps: 96,
      seasons: ["summer", "autumn", "winter", "spring"],
      election_years: [2030, 2034, 2038, 2042, 2046], track_years: 2,
      keystone_last_start_year: 2042, visit_open_years: 1, term_report_lines_max: 3, year_lines_max: 2,
      speeds: [{ id: "steady", ms_per_step: 3000 }, { id: "brisk", ms_per_step: 1500 }, { id: "fast", ms_per_step: 750 }],
      default_speed: "steady",
      stops: FIXTURE_STOPS,
      save_key: "etifeddiaeth.board.v2.",
    },
    sources: fixtureSources,
    indicators: fixtureIndicators,
    measures: fixtureMeasures,
    bands: fixtureBands,
    councils: fixtureCouncils,
    stubs: fixtureStubs,
    links: fixtureLinks,
    rules: [...fixtureRules, ...gateRules(branches)],
    branches,
    projects: fixtureProjects,
    pairs: fixturePairs,
    laws: fixtureLaws,
    groups: fixtureGroups,
    events: fixtureEvents,
    futures: fixtureFutures,
    starts: fixtureStarts,
    endings: fixtureEndings,
    letters: fixtureLetters,
    places: fixturePlaces,
    chapters: [],
  };
  return structuredClone(model);
}
