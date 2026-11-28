/**
 * The end screen never says two things that cannot both be true (playtest 8, must-fix 4 and 5).
 * Bots play many games on the real model, built from the files on disk as `npm run board:build`
 * does, and every game's ending, evidence, letter and chapters are checked against the board:
 *
 * - no chapter name is told twice, and none is left with an empty slot;
 * - "The second floor" is told only for the term the first tier 2 opened;
 * - "Coming home" only when the valleys gained young adults that term, "The leaving years" only
 *   when they lost them;
 * - a chapter about a keystone names that keystone, opened that term, in its own council;
 * - a chapter about a river flood names a river of the council it names, where a flood landed;
 * - the summary and the evidence never say the gap closed and grew, and agree with the board;
 * - an evidence line or letter that names a project names one working in that council, opened
 *   in that year;
 * - a keystone ending's letter comes from the keystone's own council;
 * - different games with the same ending do not all open on the same letter.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { act, advance, newBoard } from "./clock";
import { allBots, playGame, startFor } from "./bots";
import { siteCouncil, siteCouncils } from "./conditions";
import { flagged } from "./end-conditions";
import { ending, letterChoices, pickEnding } from "./endings";
import { frameAtYear } from "./frame";
import { fairnessGap } from "./score";
import { isRiverEvent } from "./story-terms";
import { stepOfYear, yearOfStep } from "./time";
import type { BoardModel, BoardState, ChapterRecord, Ending, SayVar, Text } from "./types";

let model: BoardModel;
const games: { label: string; state: BoardState; end: Ending }[] = [];

/**
 * A player who builds nothing and answers every event the cheapest way: the hardest game, which
 * loses most elections (playtest 8: "a losing game"). Its story must still tell no contradiction.
 */
function idleGame(m: BoardModel, n: number): BoardState {
  let s = newBoard(m, n, m.starts[n % m.starts.length]!.id);
  for (let guard = 0; guard < 2000 && s.phase !== "ended"; guard++) {
    if (s.phase === "respond") {
      for (const p of s.pending) {
        if (p.kind !== "respond") continue;
        const def = m.events.find((d) => d.id === p.event)!;
        s = act(m, s, { kind: "respond", event: p.event, response: (def.responses.find((r) => r.cost === 0) ?? def.responses[0]!).id });
      }
      continue;
    }
    s = advance(m, s, { maxSteps: 4 }).state;
  }
  return s;
}

/** One game per bot, each with its own game number and start, and two idle games. */
const GAMES_PER_BOT = 1;

beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
  const bots = allBots(model);
  for (let round = 0; round < GAMES_PER_BOT; round++) {
    bots.forEach((bot, i) => {
      const n = 4100 + round * 97 + i * 13;
      const state = playGame(model, bot, n, startFor(model, i + round));
      games.push({ label: `${bot.id} game ${n}`, state, end: ending(model, state) });
    });
  }
  for (const n of [31, 34]) {
    const state = idleGame(model, n);
    games.push({ label: `idle game ${n}`, state, end: ending(model, state) });
  }
}, 600_000);

const en = (v: SayVar | undefined): string => (v === undefined ? "" : typeof v === "object" ? (v as Text).en : String(v));
const fill = (text: Text, vars: Record<string, SayVar>): string => text.en.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? en(vars[k]) : all));
const councilByName = (name: string) => model.councils.find((c) => c.name.en === name)?.code;
const chapterDef = (rec: ChapterRecord) => model.chapters.find((c) => c.id === rec.chapter)!;
const youngMean = (board: Record<string, { young: number }> | undefined, codes: string[]) => codes.reduce((a, c) => a + (board?.[c]?.young ?? 0), 0) / codes.length;

/** The end of a term as a board: the yearly frame of its closing year (2050 is the state itself). */
const boardAt = (s: BoardState, year: number) => (year >= model.game.end_year ? s.councils : frameAtYear(s, year)?.councils);

describe("the end screen tells no contradictions (bot games on the real model)", () => {
  it("plays enough games to judge", () => {
    expect(games.length).toBeGreaterThanOrEqual(12);
  });

  it("no chapter name twice, no empty slot", () => {
    for (const g of games) {
      const names = g.end.story.chapters.map((c) => fill(chapterDef(c).name, c.slots));
      expect(new Set(names).size, `${g.label}: ${names.join(" / ")}`).toBe(names.length);
      for (const c of g.end.story.chapters) {
        const line = `${fill(chapterDef(c).name, c.slots)} ${fill(chapterDef(c).line, c.slots)}`;
        expect(line, g.label).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("the second floor is the term the first tier 2 opened", () => {
    for (const g of games) {
      const first = g.state.story.moments.filter((m) => m.kind === "tier_open" && m.ref?.endsWith(":2") && !m.ref.startsWith("legacy:")).sort((a, b) => a.step - b.step)[0];
      for (const c of g.end.story.chapters.filter((x) => x.chapter === "second-floor")) {
        expect(first, g.label).toBeDefined();
        const year = yearOfStep(model, first!.step);
        expect(year >= c.fromYear && year <= c.toYear, `${g.label}: tier 2 opened ${year}, chapter ${c.fromYear} to ${c.toYear}`).toBe(true);
      }
    }
  });

  it("young people come home only in a term the valleys gained them, and leave only when they lost them", () => {
    const valleys = flagged(model, "valley");
    for (const g of games) {
      for (const c of g.end.story.chapters) {
        if (c.chapter !== "coming-home" && c.chapter !== "leaving-years") continue;
        const change = youngMean(boardAt(g.state, c.toYear), valleys) - youngMean(boardAt(g.state, c.fromYear), valleys);
        const said = `${g.label}: ${c.chapter} ${c.fromYear} to ${c.toYear}, valley young adults moved ${change.toFixed(2)}`;
        if (c.chapter === "coming-home") expect(change, said).toBeGreaterThan(0);
        else expect(change, said).toBeLessThan(0);
      }
    }
  });

  it("a keystone chapter names a keystone that opened that term, in the council it names", () => {
    for (const g of games) {
      for (const c of g.end.story.chapters.filter((x) => x.chapter === "keystone-opened")) {
        const name = en(c.slots.project), where = councilByName(en(c.slots.council));
        const k = g.state.projects.find((p) => model.projects.find((d) => d.id === p.project)?.name.en === name && p.status === "working"
          && p.readyStep >= stepOfYear(model, c.fromYear) && p.readyStep < stepOfYear(model, c.toYear));
        expect(k, `${g.label}: ${name} in ${en(c.slots.council)}, ${c.fromYear} to ${c.toYear}`).toBeDefined();
        expect(siteCouncil(model, k!), g.label).toBe(where);
      }
    }
  });

  it("a river chapter names a river of the council it names, where a flood landed that term", () => {
    for (const g of games) {
      for (const c of g.end.story.chapters.filter((x) => x.slots.river !== undefined && /\{river\}/.test(chapterDef(x).line.en))) {
        const where = councilByName(en(c.slots.council))!;
        const rivers = model.links.filter((l) => l.kind === "river" && (l.from === where || l.to === where)).map((l) => l.name?.en);
        expect(rivers, `${g.label}: ${en(c.slots.river)} in ${en(c.slots.council)}`).toContain(en(c.slots.river));
        const flood = g.state.events.some((e) => isRiverEvent(model, e.event) && e.councils.includes(where)
          && e.step >= stepOfYear(model, c.fromYear) && e.step < stepOfYear(model, c.toYear));
        expect(flood, `${g.label}: no river flood in ${en(c.slots.council)} ${c.fromYear} to ${c.toYear}`).toBe(true);
      }
    }
  });

  it("the summary and the evidence agree about the gap, and with the board", () => {
    const closed = /\bgap\b[^.]*\b(closed|smallest|narrower|catch up)\b/i;
    const wider = /\bgap\b[^.]*\b(wide|wider|grown|widened)\b/i;
    for (const g of games) {
      const said = [g.end.summary.en, ...g.end.evidence.map((l) => fill(l.say.vars!.line as Text, l.say.vars!))];
      const saysClosed = said.some((x) => closed.test(x)), saysWider = said.some((x) => wider.test(x));
      expect(saysClosed && saysWider, `${g.label}: ${said.join(" | ")}`).toBe(false);
      const then = g.state.history[0]!.councils;
      const change = fairnessGap(model, g.state.councils) - fairnessGap(model, then);
      if (saysClosed) expect(change, `${g.label}: says the gap closed`).toBeLessThanOrEqual(0);
      if (saysWider) expect(change, `${g.label}: says the gap grew`).toBeGreaterThan(0);
    }
  });

  it("an evidence line or letter that names a project names one working there, opened that year", () => {
    const check = (label: string, s: BoardState, vars: Record<string, SayVar>, at: string | undefined) => {
      if (vars.project === undefined) return;
      const p = s.projects.find((x) => x.status === "working" && model.projects.find((d) => d.id === x.project)?.name.en === en(vars.project)
        && (!at || siteCouncils(model, x).includes(at)) && yearOfStep(model, x.readyStep + 1) === vars.year);
      expect(p, `${label}: ${en(vars.project)} in ${at}, ${String(vars.year)}`).toBeDefined();
      expect(en(vars.project), label).not.toBe(en(vars.town));
    };
    for (const g of games) {
      for (const l of g.end.evidence) check(g.label, g.state, l.say.vars!, l.council ?? undefined);
      check(`${g.label} letter`, g.state, g.end.letter.slots as Record<string, SayVar>, g.end.letter.from);
      for (const l of g.end.evidence) expect(fill(l.say.vars!.line as Text, l.say.vars!), g.label).not.toMatch(/\{\w+\}/);
    }
  });

  it("a keystone ending's letter comes from the keystone's own council", () => {
    for (const g of games) {
      const def = model.endings.find((e) => e.id === g.end.id)!;
      const key = def.when.find((c) => c.kind === "keystone");
      if (key?.kind !== "keystone") continue;
      const p = g.state.projects.find((x) => x.project === key.project && x.status === "working")!;
      expect(g.end.letter.from, g.label).toBe(siteCouncil(model, p));
    }
  });

  it("different game numbers open on different letters for the same ending", () => {
    const g = games[0]!;
    const built = pickEnding(model, g.state);
    const firsts = new Set<string>();
    for (let seed = 0; seed < 6; seed++) firsts.add(letterChoices(model, { ...g.state, seed }, built, g.end.scores.lower)[0]!.id);
    expect(firsts.size).toBeGreaterThanOrEqual(2);
    for (const e of model.endings) {
      for (const lower of ["life", "left"] as const) {
        expect(letterChoices(model, g.state, e, lower).length, `${e.id} ${lower}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
