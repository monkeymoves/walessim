// What the game waits for (v3-wales.md section 2): the rows of the table one by one, then whole
// games on the real model, played on the clock, step by step and with "hold while I read" off,
// checking at every moment that a clock held for the player has exactly one thing to act on, that
// it is drawn, that it is not under something else, and that nothing is outlined while time runs.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardModel, BoardState } from "../../engine/api";
import { act, boardFixture, newBoard, options, tick } from "../../engine/api";
import { acceptBoardModel } from "../../model";
import { ruleParamOf } from "../rules";
import { holdOf, overlays, type Reading, type SheetKind } from "./hold";
import { defaultPrefs } from "./prefs";
import { liveQueue, runUpStops, stopsToShow, type QueuedStop } from "./stops";
import { heldForPlayer, targetName, waitingOn, type NeedsTarget, type WaitingSession } from "./waiting";

const realPath = join(__dirname, "..", "..", "..", "..", "public", "board-model.json");
let real = false;
/** The real model when it is built and checks; the fixture while another package has it half changed. */
function load(): BoardModel {
  try { if (existsSync(realPath)) { const m = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8"))); real = true; return m; } } catch { /* being rebuilt */ }
  return boardFixture();
}

const calm: WaitingSession = {
  phase: "play", answerWaiting: false, queued: 0, hidden: false, holdWhileReading: true,
  sheet: null, selected: false, why: false, visit: false, warning: false, term: false,
  dealWaiting: false, visitOffer: false, stepByStep: false, playing: true, justOpened: false, idle: false,
};
const on = (over: Partial<WaitingSession>): NeedsTarget | null => waitingOn({ ...calm, ...over });

describe("the table, row by row", () => {
  it("an event to answer: its answers", () => {
    expect(on({ phase: "respond", answerWaiting: true })).toEqual({ kind: "answers", of: "event" });
    expect(on({ phase: "respond", answerWaiting: true, playing: false })).toEqual({ kind: "answers", of: "event" });
  });
  it("a deal to pick on the term report: the deals", () => {
    expect(on({ queued: 1, dealWaiting: true })).toEqual({ kind: "answers", of: "deal" });
  });
  it("a card offering a place visit: Go and visit with Carry on, a choice", () => {
    expect(on({ queued: 1, visitOffer: true })).toEqual({ kind: "answers", of: "visit" });
    expect(on({ queued: 1, visitOffer: true, playing: false })).toEqual({ kind: "answers", of: "visit" });
  });
  it("a place visit: its choices", () => {
    expect(on({ visit: true })).toEqual({ kind: "visit" });
    expect(on({ visit: true, playing: false, idle: true })).toEqual({ kind: "visit" });
  });
  it("a card: its Carry on, paused or not, and the last card in 2050 too", () => {
    expect(on({ queued: 1 })).toEqual({ kind: "carryOn" });
    expect(on({ queued: 2, playing: false })).toEqual({ kind: "carryOn" });
    expect(on({ queued: 1, phase: "ended" })).toEqual({ kind: "carryOn" });
  });
  it("a sheet or Why? holding the clock: its Close", () => {
    for (const sheet of ["tree", "laws", "settings"] as SheetKind[]) expect(on({ sheet })).toEqual({ kind: "close", what: sheet });
    expect(on({ sheet: "build", selected: true })).toEqual({ kind: "close", what: "build" });
    expect(on({ why: true })).toEqual({ kind: "close", what: "why" });
    expect(on({ warning: true })).toEqual({ kind: "close", what: "warning" });
    expect(on({ term: true })).toEqual({ kind: "close", what: "term" });
  });
  it("Why? or the settings over a card: closed first, so the outline is never under them", () => {
    expect(on({ queued: 1, why: true })).toEqual({ kind: "close", what: "why" });
    expect(on({ phase: "respond", answerWaiting: true, sheet: "settings" })).toEqual({ kind: "close", what: "settings" });
  });
  it("just opened, or paused and left alone: Play", () => {
    expect(on({ playing: false, justOpened: true })).toEqual({ kind: "play" });
    expect(on({ playing: false, idle: true })).toEqual({ kind: "play" });
    expect(on({ playing: false, idle: true, why: true })).toEqual({ kind: "play" });
  });
  it("step by step: Next season, under any sheet", () => {
    expect(on({ stepByStep: true, playing: false })).toEqual({ kind: "next" });
    expect(on({ stepByStep: true, playing: false, sheet: "tree" })).toEqual({ kind: "next" });
  });
  it("nothing while time runs, while the player has just paused, or on a hidden page", () => {
    expect(on({})).toBeNull();
    expect(on({ sheet: "tree", holdWhileReading: false })).toBeNull();
    expect(on({ playing: false })).toBeNull();
    expect(on({ playing: false, sheet: "laws" })).toBeNull();
    expect(on({ hidden: true, queued: 1 })).toBeNull();
    expect(on({ phase: "ended" })).toBeNull();
    expect(on({ phase: null, justOpened: true, playing: false })).toBeNull();
  });
});

// ---------- whole games ----------

const model = load();
const purse = ruleParamOf(model, "B1", "purse_max", 0);
interface Variant { name: string; stepByStep: boolean; holdWhileReading: boolean }
const VARIANTS: Variant[] = [
  { name: "on the clock", stepByStep: false, holdWhileReading: true },
  { name: "on the clock, not held while reading", stepByStep: false, holdWhileReading: false },
  { name: "step by step", stepByStep: true, holdWhileReading: true },
];
const READ_IN_TURN: (Reading | null)[] = ["build", null, "why", "tree", null, "laws", "settings", null, "warning", "term"];
const nothingOpen = { sheet: null as SheetKind, selected: false, why: false, visit: false, warning: false, term: false };

/** Checks one moment; returns the target's name, or a fault in words. */
function judge(sess: WaitingSession): { seen: string | null; fault: string | null } {
  const tg = waitingOn(sess);
  const shown = overlays(sess);
  const card = shown.includes("answer") || shown.includes("stop");
  const play = sess.phase === "play";
  const held = card || (play && (sess.stepByStep || (sess.playing && holdOf(sess) !== null) || (!sess.playing && (sess.justOpened || sess.idle))));
  const fault = (why: string) => ({ seen: tg && targetName(tg), fault: `${why}: ${JSON.stringify(sess)} -> ${JSON.stringify(tg)}` });
  if (sess.hidden) return tg ? fault("outlined on a hidden page") : { seen: null, fault: null };
  if (held !== heldForPlayer(sess)) return fault("held is read two ways");
  if (held && !tg) return fault("held for the player with nothing to act on");
  if (!held && tg) return fault("outlined while the clock is not waiting for the player");
  if (!tg) return { seen: null, fault: null };
  // the target is drawn
  const drawn = tg.kind === "answers" ? (tg.of === "event" ? shown.includes("answer") : shown.includes("stop") && (tg.of === "deal" ? sess.dealWaiting : sess.visitOffer && !sess.dealWaiting))
    : tg.kind === "carryOn" ? shown.includes("stop") && !sess.dealWaiting && !sess.visitOffer
    : tg.kind === "close" ? shown.includes(tg.what)
    : tg.kind === "visit" ? shown.includes("visit")
    : tg.kind === "play" ? play && !sess.stepByStep && !sess.playing
    : play && sess.stepByStep;
  if (!drawn) return fault("the target is not on screen");
  // nothing covers it
  if (shown.includes("visit") && tg.kind !== "visit") return fault("outlined under the place visit");
  if ((tg.kind === "answers" || tg.kind === "carryOn") && (shown.includes("why") || shown.includes("settings"))) return fault("outlined under Why? or the settings");
  return { seen: targetName(tg), fault: null };
}

/** One game played by a player who reads, pauses and answers as it goes, judging every moment. */
function playGame(gameNumber: number, v: Variant): { seen: Set<string>; faults: string[]; moments: number } {
  const prefs = { ...defaultPrefs(model, false), stepByStep: v.stepByStep, holdWhileReading: v.holdWhileReading };
  const seen = new Set<string>();
  const faults: string[] = [];
  let moments = 0;
  let s: BoardState = newBoard(model, gameNumber, model.starts[gameNumber % model.starts.length]!.id);
  let queue: QueuedStop[] = [];
  let playing = false;
  let justOpened = true;
  let open = { ...nothingOpen };
  const look = (idle = false, hidden = false) => {
    const head = queue[0];
    const sess: WaitingSession = {
      phase: s.phase, answerWaiting: s.phase === "respond", queued: queue.length, hidden, holdWhileReading: v.holdWhileReading, ...open,
      dealWaiting: !!head?.term && head.stop.kind !== "ended" && s.pending.some((p) => p.kind === "deal"),
      visitOffer: head?.stop.kind === "visit" && !!head.stop.ref,
      stepByStep: v.stepByStep, playing, justOpened, idle,
    };
    const j = judge(sess);
    moments++;
    if (j.seen) seen.add(j.seen);
    if (j.fault && faults.length < 5) faults.push(`game ${gameNumber}, step ${s.step}: ${j.fault}`);
  };
  const first = (kind: string) => options(model, s).find((o) => o.allowed && o.action.kind === kind);

  // the board has just opened: nothing has run yet
  look();
  look(false, true);
  if (!v.stepByStep) { playing = true; justOpened = false; }

  for (let guard = 0; guard < model.game.steps * 6; guard++) {
    const r = (s.step * 7 + gameNumber) % 11;
    // every card, one at a time, as the player meets it
    while (s.phase === "respond" || queue.length) {
      look();
      if (r % 4 === 0) { open = { ...open, why: true }; look(); open = { ...open, why: false }; }
      if (s.phase === "respond") {
        const o = first("respond");
        if (!o) { faults.push(`game ${gameNumber}: an event with no answer`); return { seen, faults, moments }; }
        s = act(model, s, o.action);
        continue;
      }
      const head = queue[0]!;
      const deal = first("deal");
      if (head.term && head.stop.kind !== "ended" && deal) { s = act(model, s, deal.action); look(); continue; }
      if (head.stop.kind === "visit" && head.stop.ref && r % 2 === 0 && s.phase === "play") {
        // Go and visit: Look pauses and drops the soft cards behind; the visit holds until it is done
        playing = false;
        queue = queue.slice(1).filter((q) => q.stop.hard);
        open = { ...open, visit: true };
        look();
        look(true);
        const visit = options(model, s).find((o) => o.allowed && o.action.kind === "visit" && o.action.place === head.stop.ref);
        if (visit) s = act(model, s, visit.action);
        open = { ...open, visit: false };
        look();
        look(true);
        if (!v.stepByStep) playing = true;
        continue;
      }
      queue = liveQueue(queue.slice(1), s, purse);
    }
    if (s.phase === "ended") { look(); break; }
    // now and then the player builds, which brings visits, tiers and keystones
    if (s.step % 6 === 1) { const b = options(model, s).filter((o) => o.allowed && o.action.kind === "build").sort((a, b2) => a.cost - b2.cost)[0]; if (b) s = act(model, s, b.action); }
    // the player reads something while time runs (or is set to)
    const reading = READ_IN_TURN[s.step % READ_IN_TURN.length]!;
    if (reading) {
      const term = reading === "term" && s.election.records.length > 0;
      open = reading === "build" ? { ...open, sheet: "build", selected: true }
        : reading === "why" || reading === "warning" ? { ...open, [reading]: true }
        : reading === "term" ? { ...open, term }
        : { ...open, sheet: reading as SheetKind };
      look();
      open = { ...nothingOpen };
    }
    // now and then the player pauses: no outline at once, Play once left alone
    if (!v.stepByStep && s.step % 9 === 4) { playing = false; look(); look(true); playing = true; }
    look();
    // a season passes
    const t = tick(model, s);
    s = t.state;
    queue = liveQueue([...queue, ...stopsToShow(model, prefs, [t.report]), ...runUpStops(model, [t.report], s)], s, purse);
  }
  if (s.phase !== "ended") faults.push(`game ${gameNumber} (${v.name}): did not reach 2050`);
  return { seen, faults, moments };
}

describe("over whole games, a held clock always has exactly one thing to act on", () => {
  const GAMES = [3, 11, 27, 58, 101, 404];
  const all = new Set<string>();
  for (const v of VARIANTS) {
    it(`${v.name}, ${GAMES.length} games`, () => {
      let moments = 0;
      for (const g of GAMES) {
        const out = playGame(g, v);
        expect(out.faults).toEqual([]);
        out.seen.forEach((x) => all.add(x));
        moments += out.moments;
      }
      expect(moments).toBeGreaterThan(GAMES.length * 150);
    }, 120_000);
  }
  it("met every kind of target on the way", () => {
    // the fixture's few projects rarely offer a visit or lose an election; the real model does both
    const kinds = ["answers-event", "carryOn", "play", "next", "close-why", "close-build", "close-tree", "close-laws", "close-settings", "close-term", ...(real ? ["visit", "answers-deal", "answers-visit"] : [])];
    for (const k of kinds) {
      expect([...all], k).toContain(k);
    }
  });
});
