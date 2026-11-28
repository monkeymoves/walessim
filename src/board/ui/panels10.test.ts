/**
 * Contradiction tests for the board panels after cold playtest 10 (package C, fix round 3), each
 * over whole bot games: the councils that tip the next election (the critic's one change), one
 * count on the election card and in the strip (must-fix 6), law counts from live backing on an
 * election step (must-fix 2), Why? on backing never empty and summing to the change, with causes
 * never worded against it (must-fix 3), what holds a council under the line (must-fix 4), deals
 * that say which builds count, as the engine judges them (must-fix 1), and no placeholder shown as
 * a source (must-fix 9).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { setLang } from "../../i18n";
import type { BoardModel, BoardState } from "../engine/api";
import { act, advance, election, newBoard, options, stepOfYear, stepsOf, why } from "../engine/api";
import { acceptBoardModel } from "../model";
import { backingHolds } from "./backingHolds";
import { whyCauseWords } from "./causes";
import { dealBuildWords, dealProjectLines } from "./dealWords";
import { backersNow, electionCounts, electionTargets, p4 } from "./electionTargets";
import { lawCost } from "./lawCost";
import { statesForTest } from "./testStates";
import { boardSource, openWhy, shownReasons } from "./whyWords";
import { nameIdsFrom } from "./words";

const root = join(__dirname, "..", "..", "..");
const realPath = join(root, "public", "board-model.json");

/** A careless player: builds the cheapest thing every third year and takes any deal, so elections are lost. */
function careless(model: BoardModel, gameNumber: number, every = 3): BoardState[] {
  let s = newBoard(model, gameNumber, model.starts[0]!.id);
  const out: BoardState[] = [s];
  for (let year = 0; year < 40 && s.phase !== "ended"; year++) {
    for (const kind of ["respond", "visit", "deal"] as const) {
      const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
      if (o) s = act(model, s, o.action);
    }
    if (year % every === 0) {
      const b = options(model, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => x.cost - y.cost)[0];
      if (b) s = act(model, s, b.action);
    }
    out.push(s);
    if (s.phase !== "play") continue;
    s = advance(model, s, { maxSteps: stepsOf(model, 1) }).state;
  }
  out.push(s);
  return out;
}

const shareOf = (model: BoardModel, s: BoardState) => Object.fromEntries(election(model, s).councils.map((c) => [c.code, c.peopleShare]));

describe.skipIf(!existsSync(realPath))("board panels after playtest 10", () => {
  const model: BoardModel = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")));
  nameIdsFrom(model);
  const games = [
    ...statesForTest(model, 2026), ...statesForTest(model, 2031, model.starts[1]?.id ?? model.starts[0]!.id),
    ...careless(model, 2029), ...careless(model, 4759, 4), ...careless(model, 77, 2),
  ];
  const playing = games.filter((s) => s.phase !== "ended");
  const atElection = games.filter((s) => s.election.records.at(-1)?.step === s.step);
  afterAll(() => setLang("en"));

  it("names the councils that would tip the next election, the fewest points of backing first", () => {
    const { backsAt, winShare, strongShare } = p4(model);
    let lost = 0, won = 0, held = 0;
    for (const s of playing) {
      const tg = electionTargets(model, s);
      if (!tg) { expect(model.game.election_years.every((y) => stepOfYear(model, y) <= s.step)).toBe(true); continue; }
      const shares = shareOf(model, s);
      const now = backersNow(model, s);
      expect(tg.backers).toBe(now.backers.length);
      // the projection the engine makes mid term counts the same
      if (!atElection.includes(s)) expect(election(model, s).backers).toBe(now.backers.length);
      if (tg.result === "lost") {
        lost++;
        expect(tg.win).not.toEqual([]);
        if (!tg.win) continue;
        for (const c of tg.win) {
          expect(s.councils[c.code]!.backing).toBeLessThan(backsAt);
          expect(Math.abs(c.gap - (backsAt - s.councils[c.code]!.backing))).toBeLessThan(1e-9);
        }
        const total = now.peopleShare + tg.win.reduce((a, c) => a + (shares[c.code] ?? 0), 0);
        expect(total).toBeGreaterThan(winShare);
        // no council in it is spare: without any one, it does not win
        for (const c of tg.win) expect(total - (shares[c.code] ?? 0)).toBeLessThanOrEqual(winShare + 1e-9);
      } else {
        won++;
        expect(tg.win).toEqual([]);
        for (const c of tg.hold) {
          held++;
          expect(now.backers).toContain(c.code);
          const without = now.peopleShare - (shares[c.code] ?? 0);
          const drop = tg.result === "strong_win" ? without < strongShare - 1e-9 : without <= winShare + 1e-9;
          expect(drop, c.code).toBe(true);
        }
      }
      if (tg.well && tg.well.length) expect(now.peopleShare + tg.well.reduce((a, c) => a + (shares[c.code] ?? 0), 0)).toBeGreaterThanOrEqual(strongShare - 1e-9);
    }
    expect(lost).toBeGreaterThan(3);
    expect(won).toBeGreaterThan(3);
    expect(held).toBeGreaterThan(0);
  });

  it("gives the election card and the strip one count from one state", () => {
    expect(atElection.length).toBeGreaterThan(5);
    for (const s of atElection) {
      const view = election(model, s);
      const c = electionCounts(model, s, view);
      // the count held, and who backs you now by the same rule, agree until something moves backing
      const live = model.game.councils.filter((x) => s.councils[x]!.backing >= p4(model).backsAt).length;
      expect(c.now).toBe(live);
      expect(c.differs).toBe(c.now !== c.held);
    }
    // straight after the clock holds it, nothing has moved: the two are one
    for (const g of [5, 6, 7]) {
      let s = newBoard(model, g, model.starts[0]!.id);
      while (s.phase !== "ended" && s.election.records.length < 2) {
        const o = options(model, s).find((x) => x.allowed && x.action.kind === "respond");
        if (o) { s = act(model, s, o.action); continue; }
        s = advance(model, s, { maxSteps: 1 }).state;
        if (s.election.records.at(-1)?.step === s.step) expect(electionCounts(model, s, election(model, s)).differs).toBe(false);
      }
    }
  });

  it("counts a law's backers from live backing, on an election step too", () => {
    let checked = 0;
    for (const s of atElection) {
      for (const law of model.laws) {
        const c = lawCost(model, s, law.id, !s.laws.includes(law.id));
        expect(c).not.toBeNull();
        const after = act(model, { ...s, lawChangesLeft: Math.max(1, s.lawChangesLeft) }, { kind: "law", law: law.id, pass: !s.laws.includes(law.id) });
        const live = (x: BoardState) => model.game.councils.filter((k) => x.councils[k]!.backing >= p4(model).backsAt);
        expect(c!.backersNow).toBe(live(s).length);
        expect(c!.backersAfter).toBe(live(after).length);
        expect(c!.lost).toEqual(live(s).filter((k) => !live(after).includes(k)));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("never leaves Why? on backing empty when backing moved, and its causes sum to the change", () => {
    const start = model.rules.find((r) => r.id === "P2")?.params["start"]?.default ?? 5;
    let opened = 0;
    for (const s of playing.filter((_, i) => i % 3 === 0)) {
      if (s.step === 0) continue;
      for (const code of model.game.councils) {
        const all = why(model, s, { council: code, measure: "backing", fromStep: 0, toStep: s.step });
        const sum = all.reduce((a, w) => a + w.delta, 0);
        expect(Math.abs(sum - (s.councils[code]!.backing - start)), `${code} at ${s.step}`).toBeLessThan(0.02);
        const target = openWhy(model, s, { council: code, measure: "backing", fromStep: Math.max(0, s.step - stepsOf(model, 1)), toStep: s.step });
        const shown = shownReasons(model, s, target);
        if (Math.abs(s.councils[code]!.backing - start) >= 0.15) { expect(shown.length, `${code} at ${s.step}: ${JSON.stringify(target)} ${JSON.stringify(all.map((w) => [w.rule, w.cause.kind, w.delta, w.step]))}`).toBeGreaterThan(0); opened++; }
      }
    }
    expect(opened).toBeGreaterThan(50);
  });

  it("never words a backing cause against its change", () => {
    const upWords = [/has got better in the last four years/, /You kept the promise/, /handled well/, /Young people can stay/, /are close by/, /Nothing has fallen much/];
    const downWords = [/has got worse/, /did not keep the promise/, /left to run its course/, /are leaving/, /too far away/, /fell most/];
    let falls = 0, rises = 0;
    for (const s of playing.filter((_, i) => i % 4 === 0)) {
      for (const code of model.game.councils) {
        for (const w of why(model, s, { council: code, measure: "backing", fromStep: Math.max(0, s.step - stepsOf(model, 4)), toStep: s.step })) {
          const words = whyCauseWords(model, w, s);
          expect(words).not.toMatch(/\bEveryone here are\b/);
          if (w.cause.kind === "people" && w.delta < -0.05) { falls++; for (const re of upWords) expect(words, words).not.toMatch(re); }
          if (w.cause.kind === "people" && w.delta > 0.05) { rises++; for (const re of downWords) expect(words, words).not.toMatch(re); }
          const cause = w.cause;
          if (cause.kind === "deal" && w.delta > 0 && s.deals.some((d) => d.council === cause.council && d.kept === false)) expect(words).toMatch(/fading/);
        }
      }
    }
    expect(falls).toBeGreaterThan(10);
    expect(rises).toBeGreaterThan(10);
  });

  it("says what holds a council under the line, and what would lift it", () => {
    let under = 0, named = 0, lifted = 0;
    for (const s of playing.filter((_, i) => i % 3 === 0)) {
      if (s.year < 2031) continue;
      for (const code of model.game.councils) {
        if (s.councils[code]!.backing >= p4(model).backsAt) continue;
        under++;
        const h = backingHolds(model, s, code);
        if (h.lines.length) named++;
        if (h.lifts.length) lifted++;
        for (const l of h.lines) expect(l).not.toMatch(/\{\w+\}|undefined|NaN/);
        for (const l of h.lifts) expect(l.lifts.every((x) => x.delta > 0)).toBe(true);
      }
    }
    expect(under).toBeGreaterThan(10);
    expect(named / under).toBeGreaterThan(0.9);
    expect(lifted / under).toBeGreaterThan(0.5);
  });

  it("says on the deal and on each build whether it counts, as the engine then judges it", () => {
    let keeps = 0, late = 0, old = 0;
    const open = games.filter((s) => s.phase === "play" && s.deals.some((d) => d.kept === null));
    expect(open.length).toBeGreaterThan(0);
    for (const s of open.filter((_, i) => i % 2 === 0)) {
      const d = s.deals.find((x) => x.kept === null)!;
      for (const line of dealProjectLines(model, s, d)) if (/before this deal/.test(line)) old++;
      for (const o of options(model, s, d.council)) {
        if (!o.allowed || o.action.kind !== "build") continue;
        const words = dealBuildWords(model, s, o);
        expect(words.length).toBeGreaterThan(0);
        if (!/^Keeps|^Too slow/.test(words)) continue;
        // build it, then let time run to the deal's judgement with nothing else built
        let after = act(model, s, o.action);
        for (let guard = 0; guard < 80 && after.phase !== "ended" && after.deals.find((x) => x.madeStep === d.madeStep && x.council === d.council)!.kept === null; guard++) {
          const r = options(model, after).find((x) => x.allowed && x.action.kind === "respond");
          after = r ? act(model, after, r.action) : advance(model, after, { maxSteps: 1 }).state;
        }
        const judged = after.deals.find((x) => x.madeStep === d.madeStep && x.council === d.council)!.kept;
        if (/^Keeps/.test(words)) { keeps++; expect(judged, words).toBe(true); } else { late++; expect(judged === false || dealProjectLines(model, s, d).some((l) => /keeps it/.test(l)), words).toBe(true); }
        if (keeps + late > 24) break;
      }
    }
    expect(keeps).toBeGreaterThan(0);
    void late; void old;
  }, 60_000);

  it("never shows a placeholder or a to-check mark as a source's note", () => {
    for (const lang of ["en", "cy"] as const) {
      setLang(lang);
      for (const src of model.sources) {
        const b = boardSource(model, src.id) as unknown as { note?: unknown; notes?: unknown };
        const n = b.note ?? b.notes;
        const text = typeof n === "string" ? n : n && typeof n === "object" ? String((n as Record<string, unknown>)[lang] ?? (n as Record<string, unknown>)["en"] ?? "") : "";
        expect(text, src.id).not.toMatch(/placeholder|(^|[.,;]\s*)to check\b/i);
      }
    }
    setLang("en");
  });
});
