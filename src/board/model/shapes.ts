/**
 * Shapes of every model/board entry, mirroring src/board/engine/types-*.ts field for field.
 * If a type changes, change its shape here; `check.test.ts` runs the typed fixture through
 * every shape, so a drift between the two fails a test.
 */
import { GRADES, LINK_KINDS, MEASURE_IDS, RISK_KINDS } from "../engine/types";
import { anyOf, arr, bool, int, lit, nullable, num, obj, openObj, range, rec, str, tuple, variant, type Shape } from "./shape";

const strs = arr(str);
export const text: Shape = obj({ en: str, cy: str }, { cy_review: bool });
const textOrStr = anyOf(str, text);
const measure = lit(...MEASURE_IDS);
const linkKind = lit(...LINK_KINDS);
const risk = lit(...RISK_KINDS);
const grade = lit(...GRADES);
const tier = int(1, 3);
const step = int(0, 3);
const flag = lit("coal_valley", "valley", "city", "coast", "port", "rural", "heartland", "slate", "off_gas");
const feature = lit("rail", "river", "coal_tips", "coast", "city", "port", "valley");
const track = lit("weather", "economy", "prices");
const quantity = lit(...MEASURE_IDS, "young_adults", "backing", "risk_flood", "risk_tip", "risk_employer");
const honesty = lit("real", "game_estimate", "game_rule", "illustrative");
const xy = tuple(num, num);
const op = lit("below", "at_least");

export const condition: Shape = variant("kind", {
  feature: [{ feature }],
  flag: [{ flag }],
  tier_open: [{ branch: str, tier }],
  project: [{ where: lit("here", "within_link", "anywhere") }, { project: str, tag: str, branch: str, tier, min_level: tier, status: lit("building", "working", "run_down"), links: arr(linkKind), at_least: int(1) }],
  link_quality: [{ at_least: int(1, 3) }],
  risk: [{ risk, at_least: step }],
  measure: [{ measure, op: lit("below", "at_least", "rising", "falling") }, { value: range(0, 10), over_turns: int(1) }],
  share: [{ share: lit("young_adults", "age65"), op, value: range(0, 100) }],
  backing: [{ op, value: range(0, 10) }],
  track: [{ track, at_least: range(0, 1) }],
  year: [{}, { from: int(2026, 2050), to: int(2026, 2050) }],
  law: [{ law: str }],
}, { not: bool });
const conditions = arr(condition);

export const effect: Shape = variant("kind", {
  measure: [{ measure, points: num }, { jobs: bool }],
  risk: [{ risk, steps: int(-3, 3) }],
  link_quality: [{ steps: int(-2, 2) }],
  coins: [{ coins: num, every_turns: int(1) }],
  young_adults: [{ points: num }],
  backing: [{ points: num }, { group: str }],
  block: [{ spread: str, share: range(0, 1) }],
  boost: [{ spread: str, factor: range(0, 10) }],
  special: [{ special: lit("reverse_commute", "storm_step_down", "cluster_roots", "care_bill_off", "land_blocked") }],
}, {
  where: lit("here", "link_ends", "downstream", "linked", "flagged", "everywhere"),
  flag, only_if: conditions, after_turns: int(0), ramp_turns: int(0), rule: str,
});
const effects = arr(effect);

const param = obj({ default: num, min: num, max: num, unit: text, adjustable: bool }, { tune: bool, placeholder: bool });
const spread = obj({
  links: arr(linkKind, { min: 1 }), travel: lit("to_home", "to_work", "towards_better", "downstream", "both_ways"),
  input: quantity, output: quantity, sign: lit(1, -1), weight: lit("share", "strength", "one"), quality_multiplies: bool, lag: int(0),
}, { blocked_by_tags: strs, only_from_projects: bool });
const requires = obj({ applies_to: obj({}, { project: str, branch: str, tier, level: tier }), needs: conditions });

/** End conditions (endings, promises). */
export const endCondition: Shape = variant("kind", {
  keystones: [{}, { at_least: int(0), at_most: int(0) }],
  keystone: [{ project: str }],
  gap: [{ vs_2026: lit("closed", "wider") }],
  lowest_three: [{ vs_2026: lit("higher", "lower") }],
  young_adults: [{ vs_2026: lit("held", "fell") }, { flag }],
  measure: [{ measure, vs_2026: lit("up", "down") }, { flag, by: num }],
  wales: [{ vs_2026: lit("better", "worse") }, { by: num }],
  projects: [{}, { tier, at_least: int(0), at_most: int(0) }],
  links_upgraded: [{}, { at_least: int(0), at_most: int(0) }],
  risks_landed: [{ at_least: int(0) }],
});

export const shapes = {
  source: obj({ id: str, title: textOrStr }, { publisher: str, url: str, licence: str, year: anyOf(str, num), note: textOrStr }),
  indicator: obj({ id: str, name: text, unit: text, year: str, source: str, higher_is_better: nullable(bool) }),
  measure: obj({ id: measure, name: text, note: text, indicators: arr(str, { min: 1 }) }),
  band: obj({ floor: num, goal: num, higher_is_better: bool, origin: lit("v1", "board"), source: str }),
  council: obj({ code: str, name: text, flags: arr(flag), features: arr(feature), towns: arr(text), real: rec(num), centre: xy }),
  stub: obj({ id: str, name: text, centre: xy }),
  link: obj({ id: str, kind: linkKind, from: str, to: str, honesty, sources: strs }, {
    share: range(0, 1), strength: int(1, 3), name: text, quality: int(1, 3), outside: bool, to_check: bool,
  }),
  rule: obj({
    id: str, theme: lit("spread", "budget", "people", "projects", "events", "score"), name: text, note: text,
    kind: lit("linear", "saturating", "stock", "threshold", "spread", "requires"), params: rec(param),
    sources: strs, confidence: lit("high", "medium", "low"), evidence: lit("assessed", "published", "expert", "placeholder"), game_rule: bool,
  }, { lag: int(0), spread, requires }),
  branch: obj({ id: str, name: text, note: text, tiers: tuple(...[1, 2, 3].map(() => obj({ tier, opens: conditions }, { rule: str }))) }),
  project: obj({
    id: str, branch: str, tier, keystone: bool, name: text, what: text, example: text, site: lit("council", "link"),
    cost: int(0, 20), build_turns: int(0, 6), needs: conditions, effects, level_factor: tuple(num, num, num), tags: strs, sources: strs,
  }, { catch: text, running: obj({ coins: num, every_turns: int(1) }), upgrade_costs: tuple(int(0, 20), int(0, 20)), visit: str, rule: str }),
  pair: obj({
    id: str, kind: lit("together", "apart"), project: str,
    partners: arr(anyOf(obj({ project: str }), obj({ tag: str }), obj({ link_quality: int(1, 3) })), { min: 1 }),
    within: lit("here", "within_link"), effects, name: text, note: text,
  }, { rule: str }),
  law: obj({ id: str, name: text, what: text, catch: text, effects, backing: arr(obj({ points: num }, { flag, group: str })) }, { rule: str }),
  group: obj({ id: str, name: text, share_from: nullable(str), cares: arr(lit(...MEASURE_IDS, "fell_most", "promises", "crises", "services", "young_adults")), sources: strs }, { base_weight: range(0, 1) }),
  event: obj({
    id: str, name: text, origin: lit("outside", "grown"), good: bool, severity: range(0, 10), trigger: conditions,
    target: variant("pick", { highest_risk: [{ risk }], lowest_measure: [{ measure }], highest_measure: [{ measure }], any: [{}], all: [{}] }),
    warning: text, landed: text, effects, size: arr(obj({ when: conditions, factor: range(0, 5) })), prepared_by: strs,
    responses: arr(obj({ id: str, name: text, what: text, cost: int(0, 20), effects, handled_well: bool })), sources: strs,
  }, { track, travels: lit("downstream"), visit: str, once: bool }),
  future: obj({ id: str, name: text, note: text, tracks: obj({ weather: arr(range(0, 1)), economy: arr(range(0, 1)), prices: arr(range(0, 1)) }) }),
  start: obj({
    id: str, name: text, pitch: text, free_project: str,
    promise: obj({ text, by_year: int(2026, 2050), kept_when: arr(endCondition) }),
    backing: arr(obj({ points: num }, { flag, council: str })),
  }),
  ending: obj({
    id: str, name: text, summary: text, route: text, priority: int(0), when: arr(endCondition), not_built: text,
    evidence: arr(obj({ kind: lit("young_adults_change", "measure_change", "no_event_since", "project_standing", "gap_change"), up: text, down: text }, { measure, flag })),
  }),
  letter: obj({ id: str, ending: str, lower: lit("life", "left", "either"), salutation: text, body: text, named: text, signoff: text }),
  place: obj({
    id: str, council: str, template: lit("T1", "T2", "T3"), name: text, prompt: text, why_hard: text,
    offered_by: obj({}, { projects: strs, events: strs }), sources: strs, confidence: lit("high", "medium", "low"),
  }, {
    scales: str, v1_place: lit("rhondda", "bethesda"), board: openObj,
    options: arr(obj({ id: str, name: text, gain: text, loss: text, effects, grades: arr(obj({ when: conditions, grade })), default_grade: grade }, { branch: str }), { min: 2, max: 3 }),
  }),
  game: obj({
    region: text, councils: arr(str, { min: 1 }), first_year: int(2000, 2100), turn_years: int(1, 5), turns: int(1, 40), end_year: int(2000, 2100),
    election_years: arr(int(2000, 2100)), keystone_last_start_year: int(2000, 2100), visits_per_turn: int(0, 3), report_lines_max: int(1, 10), save_key: str,
  }),
  meta: obj({ version: int(1), generated: str, hash: str, cy_review: strs, to_check: arr(str) }, { fixture: bool }),
};
