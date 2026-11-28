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
 * `boardFixture()` returns a fresh copy each call, so a test cannot leak changes into another.
 */
import { CARDIFF, MERTHYR, RCT, fixtureBands, fixtureCouncils, fixtureIndicators, fixtureLinks, fixtureMeasures, fixtureSources, fixtureStubs, tx } from "./fixture-geo";
import { fixtureRules } from "./fixture-rules";
import { fixtureBranches, fixtureGroups, fixtureLaws, fixturePairs, fixturePlaces, fixtureProjects } from "./fixture-content";
import { fixtureEndings, fixtureEvents, fixtureFutures, fixtureLetters, fixtureStarts } from "./fixture-story";
import type { BoardModel, BoardRule, BranchDef } from "./types";

/** The fixture's councils, upstream first. */
export const FIXTURE_COUNCILS = { merthyr: MERTHYR, rct: RCT, cardiff: CARDIFF } as const;

/**
 * The build turns every tier gate into a `requires` rule card (ADR 0005), id
 * `need:<branch>:<tier>`, so a locked project's Why? ends at a rule page. Done the same way here.
 */
export function gateRules(branches: BranchDef[]): BoardRule[] {
  const out: BoardRule[] = [];
  for (const b of branches) {
    for (const t of b.tiers) {
      if (t.opens.length === 0) continue;
      const id = `need:${b.id}:${t.tier}`;
      t.rule = id;
      const needs = t.tier === 2 ? "three tier 1 projects" : "two tier 2 projects";
      const needsCy = t.tier === 2 ? "tri phrosiect haen 1" : "dau brosiect haen 2";
      out.push({
        id, theme: "projects", kind: "requires",
        name: tx(`${b.name.en}: tier ${t.tier} opens`, `${b.name.cy}: haen ${t.tier} yn agor`),
        note: tx(`Tier ${t.tier} opens when ${needs} of this branch are working anywhere.`, `Mae haen ${t.tier} yn agor pan fydd ${needsCy} o'r gangen hon yn gweithio yn unrhyw le.`),
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
    meta: { version: 1, generated: "2026-11-27", hash: "fixture-1", cy_review: [], to_check: ["links: illustrative shares"], fixture: true },
    game: {
      region: tx("South East Wales (three council fixture)", "De Ddwyrain Cymru (gosodiad tri chyngor)"),
      councils: [MERTHYR, RCT, CARDIFF],
      first_year: 2026, turn_years: 2, turns: 12, end_year: 2050,
      election_years: [2030, 2034, 2038, 2042, 2046],
      keystone_last_start_year: 2042, visits_per_turn: 1, report_lines_max: 3,
      save_key: "etifeddiaeth.board.v1.",
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
  };
  return structuredClone(model);
}
