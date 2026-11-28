/**
 * The practice stand-in, part 2: two years pass, the forecast, the election and Why?. See build.ts
 * for what it does and does not do. Every number it applies comes from the model.
 */
import type {
  BoardModel, BoardState, CoinsReport, Contribution, CouncilCode, ElectionResult, ElectionView, EventRecord, Forecast,
  ReportLine, TurnReport, Why, WhyTarget,
} from "../../engine/api";
import { act, effectCouncils, fairnessGap, frameOf, newBoard, ruleParam } from "./build";

function electionOf(model: BoardModel, state: BoardState, held: boolean, year: number): ElectionView {
  const backsAt = ruleParam(model, "P4", "backs_at", 5);
  const total = Object.values(state.councils).reduce((a, c) => a + c.pop, 0) || 1;
  const councils = model.game.councils.map((code) => {
    const c = state.councils[code]!;
    return { code, backing: c.backing, backs: c.backing >= backsAt, peopleShare: c.pop / total };
  });
  const share = councils.filter((c) => c.backs).reduce((a, c) => a + c.peopleShare, 0);
  const result: ElectionResult = share >= ruleParam(model, "P4", "strong_share", 2 / 3) ? "strong_win" : share > ruleParam(model, "P4", "win_share", 0.5) ? "win" : "lost";
  const next = model.game.election_years.find((y) => y > year) ?? null;
  return {
    year, held, councils, backers: councils.filter((c) => c.backs).length, councilCount: councils.length, peopleShare: share,
    result, says: [{ key: `boardui.standin.election.${result}` }], nextYear: next,
  };
}

export function election(model: BoardModel, state: BoardState): ElectionView {
  const last = state.election.records[state.election.records.length - 1];
  const next = model.game.election_years.find((y) => y >= state.year + model.game.turn_years) ?? model.game.end_year;
  if (last && state.year === last.year) return electionOf(model, state, true, last.year);
  return electionOf(model, state, false, next);
}

export function forecast(model: BoardModel, state: BoardState): Forecast {
  const warnings = state.forecast.filter((f) => f.turn === state.turn).map((f) => {
    const def = model.events.find((e) => e.id === f.event)!;
    return {
      event: f.event, name: def.name, councils: f.councils, good: def.good, preparedBy: def.prepared_by, cutBy: [],
      say: { key: "boardui.standin.warning", vars: { text: def.warning } },
    };
  });
  const future = model.futures.find((x) => x.id === state.future);
  return { turn: state.turn, year: state.year, warnings, future: state.turn >= 2 && future ? { key: "boardui.standin.future", vars: { name: future.name } } : null };
}

/** Draw next turn's warned outside event from the future's tracks (the first track at 0.6 or more). */
function warnNext(model: BoardModel, s: BoardState): void {
  const future = model.futures.find((x) => x.id === s.future);
  const max = ruleParam(model, "E1", "max", 11);
  if (!future || s.turn >= model.game.turns) return;
  const ev = model.events.find((e) => e.origin === "outside" && e.track && (future.tracks[e.track]?.[s.turn] ?? 0) >= 0.6 && s.severityUsed + e.severity <= max);
  if (!ev) return;
  const riskOf = ev.target.pick === "highest_risk" ? ev.target.risk : "flood";
  const councils = [...model.game.councils].sort((a, b) => s.councils[b]!.risks[riskOf] - s.councils[a]!.risks[riskOf]).slice(0, 2);
  s.forecast.push({ event: ev.id, turn: s.turn, councils, severity: ev.severity });
  s.severityUsed += ev.severity;
}

export function endTurn(model: BoardModel, state: BoardState): { state: BoardState; report: TurnReport } {
  const s = structuredClone(state);
  const turn = s.turn, fromYear = s.year, toYear = s.year + model.game.turn_years;
  const before = s.coins;
  const add = (c: Contribution) => {
    s.ledger.push(c);
    const cs = c.council ? s.councils[c.council] : null;
    if (cs && (c.quantity as string) in cs.measures) cs.measures[c.quantity as keyof typeof cs.measures] = Math.max(0, Math.min(10, cs.measures[c.quantity as keyof typeof cs.measures] + c.delta));
  };
  // builds finish, and their effects start (held while they stand: applied once here)
  const finished: string[] = [];
  for (const p of s.projects) {
    if (p.status !== "building" || p.readyTurn > turn) continue;
    p.status = "working";
    finished.push(p.id);
    const def = model.projects.find((d) => d.id === p.project)!;
    const factor = def.level_factor[p.level - 1]! - (p.level > 1 ? def.level_factor[p.level - 2]! : 0);
    for (const e of def.effects) {
      if (e.kind !== "measure") continue;
      for (const c of effectCouncils(model, def, p.site, e.where ?? (def.site === "link" ? "link_ends" : "here"), e.flag)) {
        add({ turn, council: c, quantity: e.measure, delta: e.points * factor, rule: e.rule ?? def.rule ?? def.id, cause: { kind: "project", project: def.id, site: p.site } });
      }
    }
    for (const e of def.effects) if (e.kind === "link_quality" && p.site.link) s.linkQuality[p.site.link] = Math.min(3, (s.linkQuality[p.site.link] ?? 1) + e.steps) as 1 | 2 | 3;
  }
  // the warned event lands
  const events: EventRecord[] = [];
  for (const f of s.forecast.filter((x) => x.turn === turn)) {
    const def = model.events.find((e) => e.id === f.event);
    if (!def) continue;
    for (const e of def.effects) if (e.kind === "measure") add({ turn, council: f.councils[0] ?? null, quantity: e.measure, delta: e.points, rule: e.rule ?? "E1", cause: { kind: "event", event: def.id } });
    const rec: EventRecord = { event: def.id, turn, councils: f.councils, severity: f.severity };
    s.events.push(rec);
    events.push(rec);
    if (def.responses.length > 1) s.pending.push({ kind: "respond", event: def.id, councils: f.councils });
  }
  // coins: the base, plus carry over
  const carry = Math.min(s.coins, ruleParam(model, "B1", "carry_max", 2));
  const base = ruleParam(model, "B1", "base", 6);
  const weak = s.election.weakUntil !== null && turn <= s.election.weakUntil ? ruleParam(model, "B3", "lost_coins", 2) : 0;
  s.coins = Math.max(0, base + carry - weak);
  const coins: CoinsReport = { before, income: base, running: 0, charges: weak, carried: carry, after: s.coins };
  // election at the end of the turn that reaches an election year
  let electionView: ElectionView | undefined;
  if (model.game.election_years.includes(toYear)) {
    electionView = electionOf(model, s, true, toYear);
    s.election.records.push({ year: toYear, turn, result: electionView.result, backers: electionView.councils.filter((c) => c.backs).map((c) => c.code), peopleShare: electionView.peopleShare });
    s.election.weakUntil = electionView.result === "lost" ? turn + 2 : null;
    s.election.strongUntil = electionView.result === "strong_win" ? turn + 2 : null;
    s.lawChangesLeft = electionView.result === "lost" ? 0 : electionView.result === "strong_win" ? 2 : 1;
  }
  s.turn += 1;
  s.year = toYear;
  s.visitsThisTurn = 0;
  s.steps.push({ kind: "end_turn" });
  const frame = frameOf(s, fairnessGap(s));
  frame.events = events.map((e) => ({ event: e.event, councils: e.councils }));
  s.history.push(frame);
  const ended = s.turn >= model.game.turns;
  s.phase = ended ? "ended" : "build";
  if (!ended) warnNext(model, s);
  const lines: ReportLine[] = whyAll(model, s, turn).slice(0, model.game.report_lines_max).map((w) => ({ council: w.council, quantity: w.quantity, delta: w.delta, say: w.say, why: w }));
  const report: TurnReport = { turn, fromYear, toYear, lines, finished, flows: [], events, election: electionView, coins, pending: s.pending, ended };
  return { state: s, report };
}

function whyOf(model: BoardModel, state: BoardState, parts: Contribution[]): Why {
  const c = parts[0]!;
  const def = c.cause.kind === "project" ? model.projects.find((p) => p.id === (c.cause as { project: string }).project) : null;
  const ev = c.cause.kind === "event" ? model.events.find((e) => e.id === (c.cause as { event: string }).event) : null;
  const delta = parts.reduce((a, p) => a + p.delta, 0);
  return {
    council: c.council, quantity: c.quantity, turn: c.turn, year: model.game.first_year + (c.turn + 1) * model.game.turn_years, delta, cause: c.cause, rule: c.rule,
    say: { key: def ? "boardui.standin.why.project" : ev ? "boardui.standin.why.event" : "boardui.standin.why.other", vars: { name: def?.name ?? ev?.name ?? "" } },
    honesty: "game_estimate", sources: def?.sources ?? ev?.sources ?? [], parts,
  };
}

function whyAll(model: BoardModel, state: BoardState, turn: number, filter: (c: Contribution) => boolean = () => true): Why[] {
  const groups = new Map<string, Contribution[]>();
  for (const c of state.ledger) {
    if (c.turn !== turn || !filter(c)) continue;
    const key = `${c.council}|${c.quantity}|${JSON.stringify(c.cause)}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.values()].map((p) => whyOf(model, state, p)).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function why(model: BoardModel, state: BoardState, target: WhyTarget): Why[] {
  return whyAll(model, state, target.turn, (c) => c.quantity === target.measure && (target.council === undefined || c.council === target.council));
}

export function encodeRun(state: BoardState): string {
  const json = JSON.stringify({ g: state.gameNumber, s: state.start, x: state.steps });
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeRun(model: BoardModel, code: string): BoardState {
  const run = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as { g: number | string; s: string; x: BoardState["steps"] };
  let s = newBoard(model, run.g, run.s);
  for (const step of run.x) s = step.kind === "end_turn" ? endTurn(model, s).state : act(model, s, step);
  return s;
}

/** Councils with a project of the player within reach this turn, for the map. */
export function councilsWithWork(state: BoardState): CouncilCode[] {
  return [...new Set(state.projects.flatMap((p) => (p.site.council ? [p.site.council] : [])))];
}
