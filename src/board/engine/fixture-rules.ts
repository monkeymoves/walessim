/**
 * Fixture, part 2: the rule cards the engine reads by id (RULE_IDS), with starting values marked
 * (tune) in the design. Every number here is a game rule or a rough guess, and says so.
 * The real cards live in model/board/rules/*.yaml (packages 2 and 3).
 */
import { tx } from "./fixture-geo";
import type { BoardParam, BoardRule, BoardRuleKind, RuleTheme, SpreadSpec, Text } from "./types";

const p = (def: number, min: number, max: number, unit: Text, tune = true): BoardParam => ({ default: def, min, max, unit, adjustable: true, tune });
const u = {
  share: tx("share", "cyfran"),
  points: tx("points out of 10", "pwyntiau allan o 10"),
  coins: tx("coins", "darnau arian"),
  turns: tx("turns", "troeon"),
  years: tx("years", "blynyddoedd"),
  steps: tx("steps", "camau"),
  year: tx("year", "blwyddyn"),
  count: tx("count", "nifer"),
};

function card(id: string, theme: RuleTheme, kind: BoardRuleKind, name: Text, note: Text, params: Record<string, BoardParam>, extra: Partial<BoardRule> = {}): BoardRule {
  return { id, theme, kind, name, note, params, sources: [], confidence: "low", evidence: "placeholder", game_rule: true, ...extra };
}
const spread = (s: SpreadSpec): Partial<BoardRule> => ({ spread: s, lag: s.lag });

export const fixtureRules: BoardRule[] = [
  card("S1", "spread", "spread", tx("Jobs travel home", "Mae swyddi'n teithio adref"),
    tx("New work in a place also lifts Work and pay in the places its workers come from.", "Mae gwaith newydd mewn lle hefyd yn codi Gwaith a chyflog yn y llefydd y daw ei weithwyr ohonynt."),
    { coef: p(1, 0.5, 2, u.share), quality_step: p(0.5, 0, 1, u.share) },
    spread({ links: ["commute"], travel: "to_home", input: "work", output: "work", sign: 1, weight: "share", quality_multiplies: true, lag: 0, only_from_projects: true })),
  card("S2", "spread", "spread", tx("Prices travel up the line", "Mae prisiau'n teithio i fyny'r lein"),
    tx("When a place booms, homes get dearer along the lines into it.", "Pan mae lle'n ffynnu, mae cartrefi'n mynd yn ddrutach ar hyd y llinellau iddo."),
    { coef: p(0.4, 0.1, 1, u.share) },
    spread({ links: ["commute"], travel: "to_home", input: "work", output: "homes", sign: -1, weight: "share", quality_multiplies: true, lag: 0, blocked_by_tags: ["homes"] })),
  card("S3", "spread", "spread", tx("Young people follow work and homes", "Mae pobl ifanc yn dilyn gwaith a chartrefi"),
    tx("Young adults move towards places with work they can reach and homes they can afford.", "Mae oedolion ifanc yn symud tuag at lefydd gyda gwaith y gallant ei gyrraedd a chartrefi y gallant eu fforddio."),
    { share: p(0.3, 0.1, 1, tx("percentage points a turn", "pwyntiau canran y tro")), pull: p(0.1, 0, 0.5, u.share) },
    spread({ links: ["commute", "rail"], travel: "towards_better", input: "work", output: "young_adults", sign: 1, weight: "one", quality_multiplies: true, lag: 0 })),
  card("S4", "spread", "spread", tx("Water runs downhill", "Mae dŵr yn rhedeg i lawr y bryn"),
    tx("What is done upstream is felt downstream.", "Mae'r hyn sy'n cael ei wneud i fyny'r afon yn cael ei deimlo i lawr yr afon."),
    { steps: p(1, 0, 2, u.steps), storm_weaken: p(0.25, 0, 0.5, u.share) },
    spread({ links: ["river"], travel: "downstream", input: "risk_flood", output: "risk_flood", sign: 1, weight: "one", quality_multiplies: false, lag: 1 })),
  card("B1", "budget", "linear", tx("Coins each turn", "Darnau arian bob tro"),
    tx("You get coins each turn, and more as Work and pay grows.", "Rydych chi'n cael darnau arian bob tro, a mwy wrth i Waith a chyflog dyfu."),
    { base: p(6, 4, 8, u.coins), per_work_points: p(4, 2, 8, u.points), carry_max: p(2, 0, 4, u.coins, false) }),
  card("B2", "budget", "stock", tx("The care bill", "Y bil gofal"),
    tx("From 2038 care costs a coin a turn, unless health hubs stand in enough places.", "O 2038 mae gofal yn costio darn arian y tro, oni bai bod canolfannau iechyd mewn digon o lefydd."),
    { care_bill: p(1, 0, 2, u.coins), from_year: p(2038, 2034, 2042, u.year, false), hubs_needed: p(2, 1, 4, u.count) }),
  card("B3", "budget", "threshold", tx("A weak hand", "Llaw wan"),
    tx("After a lost election you have fewer coins for four years.", "Ar ôl colli etholiad mae gennych lai o ddarnau arian am bedair blynedd."),
    { lost_coins: p(2, 1, 3, u.coins) }),
  card("P1", "people", "stock", tx("Moods move slowly", "Mae hwyliau'n symud yn araf"),
    tx("Each group compares what it cares about with four years ago and with the middle council.", "Mae pob grŵp yn cymharu'r hyn sy'n bwysig iddo gyda phedair blynedd yn ôl a gyda'r cyngor canol."),
    { memory: p(0.6, 0.3, 0.9, u.share), compare_years: p(4, 2, 8, u.years, false), pull: p(0.8, 0.2, 2, u.points) }),
  card("P2", "people", "linear", tx("Backing at the start", "Cefnogaeth ar y dechrau"),
    tx("Every council starts at 5 out of 10. What you were elected on nudges it.", "Mae pob cyngor yn dechrau ar 5 allan o 10. Mae'r hyn y cawsoch eich ethol arno yn ei symud."),
    { start: p(5, 5, 5, u.points, false), start_nudge: p(1, 0, 2, u.points) }),
  card("P3", "people", "threshold", tx("Passed over", "Wedi'u hanwybyddu"),
    tx("A place with nothing built within reach for 8 years backs you less.", "Mae lle heb ddim wedi'i adeiladu o fewn cyrraedd am 8 mlynedd yn eich cefnogi llai."),
    { years: p(8, 4, 12, u.years), loss: p(0.5, 0.1, 1, u.points) }),
  card("P4", "people", "threshold", tx("Elections", "Etholiadau"),
    tx("A council backs you at 5 out of 10 or more. You win with more than half the people.", "Mae cyngor yn eich cefnogi ar 5 allan o 10 neu fwy. Rydych chi'n ennill gyda mwy na hanner y bobl."),
    { backs_at: p(5, 5, 5, u.points, false), win_share: p(0.5, 0.5, 0.5, u.share, false), strong_share: p(0.667, 0.6, 0.75, u.share, false), refuse_cost: p(4, 3, 7, u.coins) }),
  card("P5", "people", "linear", tx("Everyone", "Pawb"),
    tx("A fixed weight for everyone, a game rule with no figure behind it.", "Pwysau sefydlog i bawb, rheol gêm heb ffigur y tu ôl iddi."),
    { base_weight: p(0.3, 0.1, 0.5, u.share) }),
  card("G1", "score", "linear", tx("The two scores", "Y ddwy sgôr"),
    tx("A quarter of each score comes from the three lowest councils.", "Daw chwarter pob sgôr o'r tri chyngor isaf."),
    { fairness_share: p(0.25, 0.1, 0.4, u.share), lowest_count: p(3, 1, 3, u.count, false), future_years: p(8, 0, 8, u.years, false) }),
  card("E1", "events", "threshold", tx("The same weight of trouble", "Yr un pwysau o drafferth"),
    tx("Every game draws the same amount of outside trouble. Only the kind and timing differ.", "Mae pob gêm yn tynnu'r un faint o drafferth o'r tu allan. Dim ond y math a'r amseru sy'n wahanol."),
    { min: p(9, 9, 9, tx("severity points", "pwyntiau difrifoldeb"), false), max: p(11, 11, 11, tx("severity points", "pwyntiau difrifoldeb"), false) }),
];
