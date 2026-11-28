/**
 * Cross-reference checks on a whole board model: ids are unique, every reference resolves, every
 * seeded figure has a value and a source, rule ids the engine needs exist, and the fairness rule's
 * data conditions hold (section 7.3). Shape checks run first, in check.ts.
 */
import { MEASURE_IDS, REQUIRED_RULE_IDS, type BoardModel, type Condition, type Effect, type EndCondition } from "../engine/types";
import { crossCheckAreas } from "./cross-areas";
import type { Issue } from "./shape";

const DASHES = /[\u2013\u2014]/;

export function crossCheck(m: BoardModel): Issue[] {
  const out: Issue[] = [];
  const bad = (path: string, message: string) => out.push({ path, message });

  const ids = (name: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    list.forEach((x, i) => {
      if (seen.has(x.id)) bad(`${name}[${i}].id`, `duplicate id ${x.id}`);
      seen.add(x.id);
    });
    return seen;
  };
  const sources = ids("sources", m.sources);
  const indicators = ids("indicators", m.indicators);
  const rules = ids("rules", m.rules);
  const branches = ids("branches", m.branches);
  const projects = ids("projects", m.projects);
  ids("pairs", m.pairs);
  const laws = ids("laws", m.laws);
  const groups = ids("groups", m.groups);
  const events = ids("events", m.events);
  ids("futures", m.futures);
  ids("starts", m.starts);
  const endings = ids("endings", m.endings);
  ids("letters", m.letters);
  const places = ids("places", m.places);
  ids("links", m.links);
  const councils = new Set(m.councils.map((c) => c.code));
  const nodes = new Set([...councils, ...m.stubs.map((s) => s.id)]);
  const tags = new Set(m.projects.flatMap((p) => p.tags));

  const need = (set: Set<string>, id: string | undefined, path: string, what: string) => {
    if (id !== undefined && !set.has(id)) bad(path, `unknown ${what} ${id}`);
  };

  const cond = (c: Condition, path: string) => {
    if (c.kind === "tier_open") need(branches, c.branch, path, "branch");
    if (c.kind === "project") {
      need(projects, c.project, path, "project");
      need(branches, c.branch, path, "branch");
      need(tags, c.tag, path, "project tag");
    }
    if (c.kind === "law") need(laws, c.law, path, "law");
    if (c.kind === "keystone" && c.project !== undefined) {
      need(projects, c.project, path, "project");
      if (!m.projects.find((p) => p.id === c.project)?.keystone) bad(path, `${c.project} is not a keystone`);
    }
  };
  const conds = (cs: Condition[], path: string) => cs.forEach((c, i) => cond(c, `${path}[${i}]`));
  const effs = (es: Effect[], path: string) =>
    es.forEach((e, i) => {
      const p = `${path}[${i}]`;
      need(rules, e.rule, p, "rule");
      if (e.kind === "block" || e.kind === "boost") {
        need(rules, e.spread, p, "rule");
        if (!m.rules.find((r) => r.id === e.spread)?.spread) bad(p, `${e.spread} is not a spread rule`);
      }
      if (e.kind === "backing") need(groups, e.group, p, "group");
      if (e.only_if) conds(e.only_if, `${p}.only_if`);
      if (e.where === "flagged" && !e.flag) bad(p, "where: flagged needs a flag");
    });
  const ends = (cs: EndCondition[], path: string) =>
    cs.forEach((c, i) => {
      if (c.kind === "keystone") {
        need(projects, c.project, `${path}[${i}]`, "project");
        if (!m.projects.find((p) => p.id === c.project)?.keystone) bad(`${path}[${i}]`, `${c.project} is not a keystone`);
      }
      if (c.kind === "event_landed") need(events, c.event, `${path}[${i}]`, "event");
    });

  // The calendar (16.2.1): whole steps, elections on a step, one track value per block.
  const g = m.game;
  if (Math.abs((g.end_year - g.first_year) / g.years_per_step - g.steps) > 1e-9) bad("game.steps", `expected (end_year - first_year) / years_per_step = ${(g.end_year - g.first_year) / g.years_per_step}`);
  g.election_years.forEach((y, i) => {
    const at = (y - g.first_year) / g.years_per_step;
    if (Math.abs(at - Math.round(at)) > 1e-9 || at <= 0 || at >= g.steps) bad(`game.election_years[${i}]`, `${y} does not fall on a step inside the game`);
  });
  if ((g.end_year - g.first_year) % g.track_years !== 0) bad("game.track_years", "must divide the years of the game");
  if (!g.speeds.some((s) => s.id === g.default_speed)) bad("game.default_speed", `no speed ${g.default_speed}`);
  for (const k of ["respond", "election", "ended"] as const) if (!g.stops[k]?.hard) bad(`game.stops.${k}`, "must be a hard stop");
  out.push(...crossCheckAreas(m));

  // Councils, measures and seeds: the build fails if a seeded indicator lacks a source or a value.
  m.game.councils.forEach((c, i) => need(councils, c, `game.councils[${i}]`, "council"));
  for (const id of MEASURE_IDS) if (!m.measures.some((x) => x.id === id)) bad("measures", `no measure ${id}`);
  const seeded = new Set(["pop", "young_adults", "age65", ...m.measures.flatMap((x) => x.indicators)]);
  for (const ind of seeded) {
    need(indicators, ind, "measures", "indicator");
    if (m.measures.some((x) => x.indicators.includes(ind)) && !m.bands[ind]) bad(`bands.${ind}`, "missing band for a seeded indicator");
    m.councils.forEach((c, i) => {
      if (typeof c.real[ind] !== "number") bad(`councils[${i}].real.${ind}`, `no value for ${c.code}`);
    });
  }
  m.indicators.forEach((x, i) => need(sources, x.source, `indicators[${i}].source`, "source"));
  for (const [k, b] of Object.entries(m.bands)) need(sources, b.source, `bands.${k}.source`, "source");

  m.links.forEach((l, i) => {
    need(nodes, l.from, `links[${i}].from`, "council or stub");
    need(nodes, l.to, `links[${i}].to`, "council or stub");
    l.sources.forEach((s, j) => need(sources, s, `links[${i}].sources[${j}]`, "source"));
    if (l.honesty === "real" && l.sources.length === 0) bad(`links[${i}]`, "a real link needs a source");
    if (l.kind === "commute" && l.share === undefined && l.strength === undefined) bad(`links[${i}]`, "a commute link needs a share or a strength");
  });

  for (const id of REQUIRED_RULE_IDS) if (!rules.has(id)) bad("rules", `missing rule ${id} that the engine reads`);
  m.rules.forEach((r, i) => {
    r.sources.forEach((s, j) => need(sources, s, `rules[${i}].sources[${j}]`, "source"));
    if (r.kind === "spread" && !r.spread) bad(`rules[${i}]`, "a spread rule needs a spread block");
    if (r.kind === "requires" && !r.requires) bad(`rules[${i}]`, "a requires rule needs a requires block");
    if (r.requires) conds(r.requires.needs, `rules[${i}].requires.needs`);
    if (r.evidence === "placeholder" && r.confidence === "high" && !r.game_rule) bad(`rules[${i}]`, "a placeholder cannot be high confidence unless it is a game rule");
  });

  m.branches.forEach((b, i) => b.tiers.forEach((t, j) => {
    conds(t.opens, `branches[${i}].tiers[${j}].opens`);
    need(rules, t.rule, `branches[${i}].tiers[${j}].rule`, "rule");
  }));
  m.projects.forEach((p, i) => {
    const at = `projects[${i}]`;
    need(branches, p.branch, `${at}.branch`, "branch");
    if (p.keystone !== (p.tier === 3)) bad(at, "keystone must be true exactly for tier 3");
    conds(p.needs, `${at}.needs`);
    effs(p.effects, `${at}.effects`);
    need(places, p.visit, `${at}.visit`, "place");
    need(rules, p.rule, `${at}.rule`, "rule");
  });
  m.pairs.forEach((p, i) => {
    need(projects, p.project, `pairs[${i}].project`, "project");
    p.partners.forEach((x, j) => {
      if ("project" in x) need(projects, x.project, `pairs[${i}].partners[${j}]`, "project");
      if ("tag" in x) need(tags, x.tag, `pairs[${i}].partners[${j}]`, "project tag");
    });
    effs(p.effects, `pairs[${i}].effects`);
  });
  m.laws.forEach((l, i) => {
    effs(l.effects, `laws[${i}].effects`);
    l.backing.forEach((b, j) => need(groups, b.group, `laws[${i}].backing[${j}]`, "group"));
  });
  m.groups.forEach((g, i) => {
    need(indicators, g.share_from ?? undefined, `groups[${i}].share_from`, "indicator");
    if (g.share_from === null && g.base_weight === undefined) bad(`groups[${i}]`, "a group with no real share needs a base_weight");
  });
  m.events.forEach((e, i) => {
    const at = `events[${i}]`;
    conds(e.trigger, `${at}.trigger`);
    effs(e.effects, `${at}.effects`);
    e.size.forEach((s, j) => conds(s.when, `${at}.size[${j}].when`));
    e.prepared_by.forEach((p, j) => need(projects, p, `${at}.prepared_by[${j}]`, "project"));
    e.responses.forEach((r, j) => effs(r.effects, `${at}.responses[${j}].effects`));
    need(places, e.visit, `${at}.visit`, "place");
    if (e.origin === "outside" && !e.track) bad(at, "an outside event needs a track");
    if (e.origin === "outside" && e.prepared_by.length < 2) bad(at, "fairness rule 3: an outside event needs two tier 1 projects that cut it");
    if (e.origin === "grown" && e.severity !== 0) bad(at, "grown events have severity 0");
  });
  const blocks = Math.round((g.end_year - g.first_year) / g.track_years);
  m.futures.forEach((f, i) => {
    for (const [k, v] of Object.entries(f.tracks)) if (v.length !== blocks) bad(`futures[${i}].tracks.${k}`, `needs ${blocks} values (one each ${g.track_years} years), has ${v.length}`);
  });
  m.events.forEach((e, i) => {
    if (e.responses.length > 0 && !e.responses.some((r) => r.cost === 0)) bad(`events[${i}].responses`, "a response holds the clock, so one must cost nothing");
  });
  m.projects.forEach((p, i) => {
    if (p.legacy_of !== undefined && !m.projects.find((x) => x.id === p.legacy_of)?.keystone) bad(`projects[${i}].legacy_of`, `${p.legacy_of} is not a keystone`);
  });
  m.chapters.forEach((c, i) => {
    c.when.forEach((w, j) => { if (w.kind === "tier_opened" && w.tier === 1) bad(`chapters[${i}].when[${j}]`, "tier 1 is always open"); });
  });
  ids("chapters", m.chapters);
  if (m.chapters.length > 0 && !m.chapters.some((c) => c.when.length === 0)) bad("chapters", "one chapter must have no conditions (the fallback)");
  m.starts.forEach((s, i) => {
    need(projects, s.free_project, `starts[${i}].free_project`, "project");
    if (m.projects.find((p) => p.id === s.free_project)?.tier !== 1) bad(`starts[${i}].free_project`, "the free project must be tier 1");
    ends(s.promise.kept_when, `starts[${i}].promise.kept_when`);
    s.backing.forEach((b, j) => need(councils, b.council, `starts[${i}].backing[${j}]`, "council"));
  });
  m.endings.forEach((e, i) => ends(e.when, `endings[${i}].when`));
  if (!m.endings.some((e) => e.when.length === 0)) bad("endings", "one ending must have no conditions (the fallback)");
  m.letters.forEach((l, i) => need(endings, l.ending, `letters[${i}].ending`, "ending"));
  for (const e of m.endings) if (!m.letters.some((l) => l.ending === e.id)) bad("letters", `no letter for ending ${e.id}`);
  m.places.forEach((p, i) => {
    need(councils, p.council, `places[${i}].council`, "council");
    p.offered_by.projects?.forEach((x, j) => need(projects, x, `places[${i}].offered_by.projects[${j}]`, "project"));
    p.offered_by.events?.forEach((x, j) => need(events, x, `places[${i}].offered_by.events[${j}]`, "event"));
    need(projects, p.scales, `places[${i}].scales`, "project");
    if (p.template === "T3" && !p.options) bad(`places[${i}]`, "a T3 place needs options");
    if (p.template !== "T3" && !p.v1_place) bad(`places[${i}]`, "a T1 or T2 place names its v1 board");
    p.options?.forEach((o, j) => effs(o.effects, `places[${i}].options[${j}].effects`));
  });

  if (DASHES.test(JSON.stringify(m))) bad("model", "contains an em dash or en dash");
  return out;
}
