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
 * - different games with the same ending do not all open on the same letter;
 * - (playtest 9, must-fix 3) the Wales you did not build is never one you built or whose keystone
 *   stands; no gap line says the opposite of a gap chapter; every year given for a keystone (the
 *   letter, the evidence, its moment, its chapter's term) is the year it opened; an ending about an
 *   event (The gamble) names one council in its evidence, its letter and the chapter of that term;
 *   where a letter's council turned a corner, the project it names had opened by then;
 * - (should-fix 2) a town the board never shows is always named with its council, and a chapter's
 *   {town} is in its {council}.
 * - (playtest 10) every year the end gives for a project or a flood is the year the board's season
 *   words give it (should-fix 10: a letter said 2034 where the build said Spring 2035); one flood is
 *   on one river in every telling (must-fix 7); The gamble's summary, evidence and letter agree on
 *   whether work came back (must-fix 8); the record gives every deal its year, never one line
 *   twice (must-fix 1), and ends on the backing the top strip shows in 2050 (must-fix 6); the end
 *   screen offers the letters the engine offers.
 * The games include careless and losing ones: idle games that build nothing, careless gamblers who
 * land one big employer and nothing else, and extra Random and Scatter games.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { act, advance, newBoard } from "./clock";
import { allBots, playGame, startFor } from "./bots";
import { siteCouncil, siteCouncils } from "./conditions";
import { flagged } from "./end-conditions";
import { ending, firstRise, focusOf, gapClosed, gapTold, letterChoices, notBuildable, pickEnding } from "./endings";
import { eventRiver, eventRiverAt, shownYear, townOf } from "./story-terms";
import { frameAtYear } from "./frame";
import { countBacking } from "./people";
import { fairnessGap } from "./score";
import { isRiverEvent } from "./story-terms";
import { stepOfYear, yearOfStep } from "./time";
import { backingAtEnd, dealsOf } from "../ui/end/record";
import { letterChoicesOf } from "../ui/end/view";
import type { BoardModel, BoardState, ChapterRecord, Ending, SayVar, Text } from "./types";

let model: BoardModel;
const games: { label: string; state: BoardState; end: Ending }[] = [];

/**
 * A player who builds nothing and answers every event the cheapest way: the hardest game, which
 * loses most elections (playtest 8: "a losing game"). Its story must still tell no contradiction.
 */
function idleGame(m: BoardModel, n: number, gamble?: string): BoardState {
  let s = newBoard(m, n, m.starts[n % m.starts.length]!.id);
  for (let guard = 0; guard < 2000 && s.phase !== "ended"; guard++) {
    // a careless gambler: lands one big employer as soon as the purse allows, and nothing else
    if (gamble && s.phase !== "respond" && !s.projects.some((p) => p.project === "big-employer")) {
      try { s = act(m, s, { kind: "build", project: "big-employer", site: { council: gamble } }); } catch { /* not yet affordable */ }
    }
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

/** Games per bot, each with its own game number and start; then idle games and extra careless ones. */
const GAMES_PER_BOT = 2;
const CARELESS = ["random", "scatter"];

beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
  const bots = allBots(model);
  const play = (bot: (typeof bots)[number], n: number, start: string) => {
    const state = playGame(model, bot, n, start);
    games.push({ label: `${bot.id} game ${n}`, state, end: ending(model, state) });
  };
  for (let round = 0; round < GAMES_PER_BOT; round++) {
    bots.forEach((bot, i) => play(bot, 4100 + round * 97 + i * 13, startFor(model, i + round)));
  }
  for (const bot of bots.filter((b) => CARELESS.includes(b.id))) {
    for (const n of [5203, 5311, 5419]) play(bot, n, startFor(model, n));
  }
  for (const n of [31, 34, 37]) {
    const state = idleGame(model, n);
    games.push({ label: `idle game ${n}`, state, end: ending(model, state) });
  }
  // careless gamblers in the valleys, so The gamble is judged whatever the bots do
  const valleys = flagged(model, "valley");
  for (const n of [41, 43, 47, 53]) {
    const state = idleGame(model, n, valleys[n % valleys.length]);
    games.push({ label: `gambler game ${n}`, state, end: ending(model, state) });
  }
}, 900_000);

const en = (v: SayVar | undefined): string => (v === undefined ? "" : typeof v === "object" ? (v as Text).en : String(v));
const fill = (text: Text, vars: Record<string, SayVar>): string => text.en.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? en(vars[k]) : all));
const councilByName = (name: string) => model.councils.find((c) => c.name.en === name)?.code;
const chapterDef = (rec: ChapterRecord) => model.chapters.find((c) => c.id === rec.chapter)!;
const youngMean = (board: Record<string, { young: number }> | undefined, codes: string[]) => codes.reduce((a, c) => a + (board?.[c]?.young ?? 0), 0) / codes.length;

/** The end of a term as a board: the yearly frame of its closing year (2050 is the state itself). */
const boardAt = (s: BoardState, year: number) => (year >= model.game.end_year ? s.councils : frameAtYear(s, year)?.councils);

/** Every sentence the end screen fills from a game, in English, with where it came from. */
function saidOf(g: (typeof games)[number]): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const c of g.end.story.chapters) {
    const def = chapterDef(c);
    out.push({ where: `chapter ${c.chapter}`, text: `${fill(def.name, c.slots)}. ${fill(def.line, c.slots)}` });
  }
  for (const l of g.end.evidence) out.push({ where: "evidence", text: fill(l.say.vars!.line as Text, l.say.vars!) });
  const letter = model.letters.find((l) => l.id === g.end.letter.letter);
  const slots = g.end.letter.slots as Record<string, SayVar>;
  if (letter) for (const part of [letter.salutation, letter.body, letter.named, letter.signoff]) out.push({ where: `letter ${letter.id}`, text: fill(part, slots) });
  return out;
}

/** The year a project opened, as its build card says it ("Working from Spring 2035"). */
const openYear = (p: { readyStep: number }) => shownYear(model, p.readyStep + 1);
const projectNamed = (name: string) => model.projects.find((d) => d.name.en === name);

describe("the end screen tells no contradictions (bot games on the real model)", () => {
  it("plays enough games to judge, careless and losing ones among them", () => {
    expect(games.length).toBeGreaterThanOrEqual(30);
    expect(games.some((g) => g.state.election.records.some((r) => r.result === "lost")), "a game with an election lost").toBe(true);
    expect(games.some((g) => g.end.scores.band.endsWith("worse")), "a game left worse than 2026").toBe(true);
  });

  it("the Wales you did not build is not one you built, nor one whose keystone stands", () => {
    for (const g of games) {
      const other = model.endings.find((e) => e.id === g.end.notBuilt.id)!;
      expect(other.id, g.label).not.toBe(g.end.id);
      expect(notBuildable(model, g.state, other), `${g.label}: offered ${other.id}`).toBe(false);
      for (const c of other.when) {
        if (c.kind !== "keystone") continue;
        expect(g.state.projects.some((p) => p.project === c.project && p.status === "working"), `${g.label}: ${other.id} keystone stands`).toBe(false);
      }
    }
  });

  it("no gap line says the opposite of a gap chapter", () => {
    const closed = /\bgap\b[^.]*\b(closed|smallest|narrower|smaller|catch up)\b/i;
    const wider = /\bgap\b[^.]*\b(wide|wider|grown|widened)\b/i;
    for (const g of games) {
      const told = gapTold(model, g.state);
      const lines = g.end.evidence.map((l) => fill(l.say.vars!.line as Text, l.say.vars!));
      if (told.has("closed")) for (const l of lines) expect(l, `${g.label}: a gap chapter said it closed`).not.toMatch(wider);
      if (told.has("wider")) for (const l of lines) expect(l, `${g.label}: a gap chapter said it grew`).not.toMatch(closed);
      // and the line reads the same measure the chapters read
      for (const l of lines) {
        if (closed.test(l)) expect(gapClosed(model, g.state), `${g.label}: ${l}`).toBe(true);
        if (wider.test(l)) expect(gapClosed(model, g.state), `${g.label}: ${l}`).toBe(false);
      }
    }
  });

  it("every year given for a keystone is the year it opened", () => {
    for (const g of games) {
      const keystones = g.state.projects.filter((p) => p.status === "working" && model.projects.find((d) => d.id === p.project)?.keystone);
      for (const k of keystones) {
        const def = model.projects.find((d) => d.id === k.project)!;
        const year = openYear(k);
        for (const m of g.state.story.moments.filter((x) => x.kind === "keystone" && x.ref === k.project)) {
          expect(m.year, `${g.label}: ${def.name.en} moment`).toBe(year);
        }
        for (const c of g.end.story.chapters.filter((x) => x.chapter === "keystone-opened" && en(x.slots.project) === def.name.en)) {
          expect(year >= c.fromYear && year <= c.toYear, `${g.label}: ${def.name.en} opened ${year}, chapter ${c.fromYear} to ${c.toYear}`).toBe(true);
        }
        const slots = g.end.letter.slots as Record<string, SayVar>;
        if (en(slots.project) === def.name.en) expect(slots.year, `${g.label}: letter`).toBe(year);
        for (const l of g.end.evidence) if (en(l.say.vars!.project) === def.name.en) expect(l.say.vars!.year, `${g.label}: evidence`).toBe(year);
      }
    }
  });

  it("an ending about an event names one council: its evidence, its letter and the chapter of that term", () => {
    let seen = 0;
    for (const g of games) {
      const def = model.endings.find((e) => e.id === g.end.id)!;
      const focus = focusOf(model, g.state, def);
      if (!focus) continue;
      seen++;
      expect(g.end.letter.from, g.label).toBe(focus);
      for (const l of g.end.evidence) if (l.council) expect(l.council, `${g.label}: ${fill(l.say.vars!.line as Text, l.say.vars!)}`).toBe(focus);
    }
    // a chapter about unprepared economic trouble, in a term the big employer left unprepared, names the council it left
    for (const g of games) {
      for (const e of g.state.events.filter((x) => x.event === "employer-leaves" && !x.prepared)) {
        const year = yearOfStep(model, e.step);
        for (const c of g.end.story.chapters.filter((x) => x.chapter === "work-went" && e.step >= stepOfYear(model, x.fromYear) && e.step < stepOfYear(model, x.toYear))) {
          expect(en(c.slots.council), `${g.label}: employer left ${year}`).toBe(model.councils.find((x) => x.code === e.councils[0])!.name.en);
        }
      }
    }
    expect(seen, "games that ended in The gamble").toBeGreaterThanOrEqual(1);
  });

  it("where a letter's council turned a corner, the project it names had opened by then", () => {
    for (const g of games) {
      const slots = g.end.letter.slots as Record<string, SayVar>;
      if (slots.project === undefined) continue;
      const def = model.endings.find((e) => e.id === g.end.id)!;
      const own = projectNamed(en(slots.project));
      const about = def.when.some((c) => (c.kind === "keystone" && c.project === own?.id)) || (own?.id === "big-employer" && def.id === "gamble");
      const rose = firstRise(g.state, g.end.letter.from);
      if (about || rose === null) continue;
      const opened = g.state.projects.filter((p) => p.status !== "building" && siteCouncils(model, p).includes(g.end.letter.from) && p.readyStep + 1 <= rose);
      if (opened.length === 0) continue;
      const named = g.state.projects.find((p) => p.project === own?.id && siteCouncils(model, p).includes(g.end.letter.from) && openYear(p) === slots.year);
      expect(named && named.readyStep + 1 <= rose, `${g.label}: ${en(slots.project)} ${String(slots.year)}, turned ${yearOfStep(model, rose)}`).toBe(true);
    }
  });

  it("a town the board never shows is named with its council, and a chapter's town is in its council", () => {
    for (const g of games) {
      for (const { where, text } of saidOf(g)) {
        for (const c of model.councils.filter((x) => model.game.councils.includes(x.code))) {
          for (const town of c.towns.filter((x) => x.en !== c.name.en)) {
            const bare = new RegExp(`\\b${town.en}\\b(?!, in ${c.name.en})`);
            expect(text, `${g.label} ${where}`).not.toMatch(bare);
          }
        }
      }
      for (const c of g.end.story.chapters) {
        if (c.slots.town === undefined || c.slots.council === undefined) continue;
        const code = councilByName(en(c.slots.council))!;
        expect(en(c.slots.town), `${g.label}: ${c.chapter}`).toBe(townOf(model, code).en);
      }
    }
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

  it("no turning point says valley young adults left in a term told as Coming home, or came in a term told as The leaving years", () => {
    const valleys = flagged(model, "valley");
    for (const g of games) {
      for (const c of g.end.story.chapters) {
        const against = c.chapter === "coming-home" ? "down" : c.chapter === "leaving-years" ? "up" : null;
        if (!against) continue;
        const clash = g.end.story.turningPoints.filter((m) => m.kind === "people" && m.ref === against && valleys.includes(m.council ?? "")
          && m.step >= stepOfYear(model, c.fromYear) && m.step < stepOfYear(model, c.toYear));
        expect(clash.map((m) => `${m.council} ${m.year}`), `${g.label}: ${c.chapter} ${c.fromYear} to ${c.toYear}`).toEqual([]);
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
        && (!at || siteCouncils(model, x).includes(at)) && openYear(x) === vars.year);
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
  it("one flood is on one river in every telling: chapters, evidence and the turns not taken", () => {
    let told = 0;
    for (const g of games) {
      const floods = g.state.events.filter((e) => isRiverEvent(model, e.event) && !model.events.find((d) => d.id === e.event)?.good);
      // a chapter's river is the river of a flood that landed in its council that term
      for (const c of g.end.story.chapters.filter((x) => x.slots.river !== undefined && /\{river\}/.test(`${chapterDef(x).name.en} ${chapterDef(x).line.en}`))) {
        const where = councilByName(en(c.slots.council));
        const term = floods.filter((e) => e.step >= stepOfYear(model, c.fromYear) && e.step < stepOfYear(model, c.toYear));
        const rivers = term.filter((e) => !where || e.councils[0] === where).map((e) => eventRiver(model, e)?.en);
        expect(rivers, `${g.label}: ${fill(chapterDef(c).name, c.slots)} (${c.fromYear} to ${c.toYear})`).toContain(en(c.slots.river));
        told++;
      }
      // an evidence line that names a flood's year names that flood's river
      for (const l of g.end.evidence) {
        const v = l.say.vars!;
        if (v.river === undefined || !l.council || !(v.line as Text).en.includes("{river}")) continue;
        const there = floods.filter((e) => e.councils.includes(l.council!));
        const last = there[there.length - 1];
        if (last) expect(en(v.river), `${g.label}: ${fill(v.line as Text, v)}`).toBe(eventRiverAt(model, last, l.council)!.en);
      }
    }
    expect(told, "river chapters told").toBeGreaterThanOrEqual(1);
  });

  it("every year said for a flood is the year the board's season words give it", () => {
    for (const g of games) {
      for (const l of g.end.evidence) {
        const v = l.say.vars!;
        if (v.river === undefined || v.year === undefined || !l.council || !(v.line as Text).en.includes("{river}")) continue;
        const there = g.state.events.filter((e) => e.councils.includes(l.council!) && isRiverEvent(model, e.event) && !model.events.find((d) => d.id === e.event)?.good);
        const last = there[there.length - 1];
        expect(v.year, `${g.label}: ${fill(v.line as Text, v)}`).toBe(last ? shownYear(model, last.step) : model.game.first_year);
      }
      for (const m of g.state.story.moments) {
        if (m.kind === "keystone" || m.kind === "election") continue;
        expect(m.year, `${g.label}: ${m.kind} at step ${m.step}`).toBe(shownYear(model, m.step));
      }
    }
  });

  it("The gamble's summary, evidence and letter agree on whether work came back", () => {
    const back = /found new work|work in .* again/i;
    const fell = /picking up the pieces|Work and pay fell|Work and pay in .* is lower/i;
    let gambles = 0;
    for (const g of games) {
      const said = [g.end.summary.en, ...saidOf(g).map((x) => x.text)];
      const saysBack = said.filter((x) => back.test(x)), saysFell = said.filter((x) => fell.test(x));
      expect(saysBack.length > 0 && saysFell.length > 0, `${g.label}: ${[...saysBack, ...saysFell].join(" | ")}`).toBe(false);
      if (g.end.id !== "gamble") continue;
      gambles++;
      const from = g.end.letter.from;
      const change = g.state.councils[from]!.measures.work - g.state.history[0]!.councils[from]!.measures.work;
      if (saysBack.length) expect(change, `${g.label}: says work came back in ${from}`).toBeGreaterThanOrEqual(0);
      if (saysFell.length) expect(change, `${g.label}: says work fell in ${from}`).toBeLessThan(0);
    }
    expect(gambles, "games that ended in The gamble").toBeGreaterThanOrEqual(1);
  });

  it("the end screen offers the letters the engine offers, each one sayable whole", () => {
    for (const g of games) {
      const built = model.endings.find((e) => e.id === g.end.id)!;
      const engine = letterChoices(model, g.state, built, g.end.scores.lower, g.end.letter.slots as Record<string, unknown>).map((l) => l.id);
      const screen = letterChoicesOf(model, g.end);
      expect([...screen].sort(), g.label).toEqual([...engine].sort());
      expect(screen[0], g.label).toBe(g.end.letter.letter);
      expect(screen.length, `${g.label}: ${g.end.id}`).toBeGreaterThanOrEqual(1);
      for (const part of saidOf(g).filter((x) => x.where.startsWith("letter"))) {
        const def = model.letters.find((l) => `letter ${l.id}` === part.where)!;
        if (part.text === fill(def.named, g.end.letter.slots as Record<string, SayVar>)) continue;
        expect(part.text, `${g.label} ${part.where}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("every ending offers at least two letters whichever way work went", () => {
    const g = games[0]!;
    const name = model.councils[0]!.name;
    for (const e of model.endings) {
      for (const lower of ["life", "left"] as const) {
        for (const work of [{ work_back_in: name }, { work_fell_in: name }]) {
          const slots = { council: name, town: name, place: name, ...work };
          expect(letterChoices(model, g.state, e, lower, slots).length, `${e.id} ${lower} ${Object.keys(work)[0]}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("the record gives every deal its year, no line twice, and ends on the backing the top strip shows", () => {
    let deals = 0;
    for (const g of games) {
      const lines = dealsOf(model, g.state);
      deals += lines.length;
      const keys = lines.map((d) => `${d.council}:${d.measure}:${d.kept}:${d.year}`);
      expect(new Set(keys).size, `${g.label}: ${keys.join(" / ")}`).toBe(keys.length);
      for (const d of lines) {
        expect(d.year, `${g.label}: ${d.council}`).toBeGreaterThanOrEqual(d.made);
        expect(d.year, g.label).toBeLessThanOrEqual(model.game.end_year);
      }
      const years = lines.map((d) => d.year);
      expect(years, g.label).toEqual([...years].sort((a, b) => a - b));
      const end = backingAtEnd(model, g.state)!;
      expect(end.backers, g.label).toBe(countBacking(model, g.state).backers.length);
      expect(end.year).toBe(model.game.end_year);
    }
    expect(deals, "deals judged across the games").toBeGreaterThanOrEqual(3);
  });
});
