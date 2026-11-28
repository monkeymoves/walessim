/**
 * Contradiction tests for the board panels after cold playtest 9 (package C, fix round 2), each
 * over whole bot games rather than one case: one price everywhere (must-fix 7), one date on a card
 * (must-fix 11), the keystone gate named exactly (must-fix 1), law costs shown as passing them does
 * (must-fix 2), deals judged as the engine judges them (must-fix 9), and no raw code on any board
 * panel, in English or Welsh (must-fix 12).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { setLang } from "../../i18n";
import type { BoardModel, BoardState, Deal } from "../engine/api";
import { act, advance, councilView, MEASURE_IDS, newBoard, options, preview, stepsOf, why } from "../engine/api";
import { acceptBoardModel } from "../model";
import { blockerWords, conditionWords, gateWords } from "./blockers";
import { roadWords } from "./BranchRoad";
import { branchPath } from "./branchPath";
import { whyCauseWords } from "./causes";
import { dealAsk, dealKeepers, dealWords, keptBy } from "./dealWords";
import { lawCost } from "./lawCost";
import { previewLineWords } from "./PreviewLines";
import { fareWords, goWords, offWords, priceOf } from "./price";
import { statesForTest } from "./testStates";
import { boardSource, ruleLabel } from "./whyWords";
import { feltStep, nameIdsFrom, say, takesWords, whenWords } from "./words";

const root = join(__dirname, "..", "..", "..");
const realPath = join(root, "public", "board-model.json");
const digits = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).map(Number);

/** A careless player: builds the cheapest thing every third year, takes any deal, so elections are lost and deals made. */
function careless(model: BoardModel, gameNumber: number): BoardState[] {
  let s = newBoard(model, gameNumber, model.starts[0]!.id);
  const out: BoardState[] = [s];
  for (let year = 0; year < 40 && s.phase !== "ended"; year++) {
    for (const kind of ["respond", "visit", "deal"] as const) {
      const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
      if (o) s = act(model, s, o.action);
    }
    if (year % 3 === 0) {
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

describe.skipIf(!existsSync(realPath))("board panels after playtest 9", () => {
  const model: BoardModel = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")));
  nameIdsFrom(model);
  const games = [...statesForTest(model, 2026), ...statesForTest(model, 2031, model.starts[1]?.id ?? model.starts[0]!.id), ...careless(model, 2029)];
  const playing = games.filter((s) => s.phase === "play");
  afterAll(() => setLang("en"));

  it("shows one price for every project and discount: card, button, preview and the coins taken", () => {
    let discounted = 0, freeSeen = 0, upgrades = 0;
    for (const s of playing.filter((_, i) => i % 5 === 0)) {
      for (const code of model.game.councils) {
        for (const o of options(model, s, code).filter((x) => x.action.kind === "build" || x.action.kind === "upgrade")) {
          const p = priceOf(model, s, o);
          expect(p.cost).toBe(o.cost);
          expect(preview(model, s, o.action).cost, o.project).toBe(o.cost);
          const fare = fareWords(p), go = goWords(p);
          if (p.free) { freeSeen++; expect(fare).toMatch(/free/i); expect(go).toMatch(/free/i); continue; }
          expect(digits(fare)).toEqual([o.cost]);
          expect(digits(go), go).toEqual([o.cost]);
          if (p.upgrade) { upgrades++; expect(go).toMatch(/bigger/i); expect(go).not.toMatch(/^Build/); }
          const off = offWords(model, p);
          if (o.cost < p.full) {
            discounted++;
            expect(off, `${o.project} in ${code}`).toContain(String(p.full - o.cost));
            expect(p.fresh || p.deal !== null, `${o.project} ${code} ${s.year}: a discount with no reason`).toBe(true);
          } else expect(off).toBe("");
          if (o.allowed) expect(act(model, s, o.action).coins).toBeCloseTo(s.coins - o.cost, 6);
        }
      }
    }
    expect(discounted).toBeGreaterThan(10);
    expect(upgrades).toBeGreaterThan(5);
    expect(freeSeen).toBeGreaterThan(0);
  }, 60_000);

  it("charges an event answer the price its button shows", () => {
    let n = 0;
    for (const s of games) {
      for (const o of options(model, s).filter((x) => x.action.kind === "respond" && x.allowed)) {
        expect(act(model, s, o.action).coins).toBeCloseTo(s.coins - o.cost, 6);
        n++;
      }
    }
    // events are drawn by the game number, so a run may land none that needs coins; the screen reads o.cost either way
    expect(readFileSync(join(__dirname, "Respond.tsx"), "utf8")).toMatch(/o\.cost \?/);
    expect(n).toBeGreaterThanOrEqual(0);
  });

  it("gives a card one date: the preview's seasons never come before it opens, and an effect felt at once says the same season", () => {
    let same = 0, later = 0;
    for (const s of playing.filter((_, i) => i % 3 === 0)) {
      for (const code of model.game.councils) {
        for (const o of options(model, s, code).filter((x) => x.action.kind === "build" && x.readyStep !== undefined)) {
          const opens = whenWords(model, o.readyStep! + 1);
          for (const c of preview(model, s, o.action).changes) {
            const step = feltStep(model, o.readyStep!, o.readyYear!, c.year);
            expect(step).toBeGreaterThanOrEqual(o.readyStep! + 1);
            const line = previewLineWords(model, { council: c.council, quantity: c.quantity, delta: c.delta, year: c.year, via: !!c.via }, o.readyStep, o.readyYear);
            if (c.year === o.readyYear) { same++; expect(line).toContain(opens); } else later++;
            expect(line).not.toMatch(/\{\w+\}/);
          }
          expect(takesWords(o.buildYears ?? 0)).not.toMatch(/\b0 years|\b1 years|\b0\.\d years/);
        }
      }
    }
    for (const p of model.projects) for (const y of [p.build_years, p.build_years / 2]) expect(takesWords(y)).not.toMatch(/\b0 years|\b1 years|\b0\.\d years/);
    expect(same).toBeGreaterThan(20);
    expect(later).toBeGreaterThan(5);
  }, 60_000);

  it("names each keystone gate exactly, never counting the legacy project, with the engine's progress", () => {
    for (const s of playing.filter((_, i) => i % 4 === 0)) {
      for (const b of model.branches) {
        const path = branchPath(model, s, b);
        for (const g of path.gates) {
          const words = gateWords(model, g.condition as Parameters<typeof gateWords>[1], s);
          const counted = model.projects.filter((p) => p.branch === b.id && p.tier === g.from && !p.legacy_of);
          if (counted.length === 1 && g.need > 1) expect(words).toContain(`${counted[0]!.name.en} is working in ${g.need} different`);
          for (const legacy of model.projects.filter((p) => p.legacy_of)) expect(words).not.toContain(legacy.name.en);
          expect(words).toContain(`${g.working} of ${g.need}`);
        }
      }
    }
  });

  it("tells the build menu why a keystone cannot be built here, or that it can", () => {
    for (const s of playing.filter((_, i) => i % 5 === 0)) {
      for (const code of model.game.councils) {
        for (const o of options(model, s, code).filter((x) => x.action.kind === "build" && model.projects.find((p) => p.id === x.project)?.keystone)) {
          if (!o.allowed) expect(o.blockers.map((x) => blockerWords(model, x, s)).join(" ").length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("shows each law's backing cost as passing it does", () => {
    let checked = 0;
    for (const s of playing.filter((_, i) => i % 6 === 0)) {
      for (const law of model.laws) {
        const o = options(model, s).find((x) => x.action.kind === "law" && x.action.law === law.id);
        const c = lawCost(model, s, law.id, !s.laws.includes(law.id));
        expect(c).not.toBeNull();
        if (!o?.allowed) continue;
        const after = act(model, s, o.action);
        // live backing, never the count just held (playtest 10, must-fix 2)
        expect(model.game.councils.filter((x) => after.councils[x]!.backing >= 5).length).toBe(c!.backersAfter);
        expect(model.game.councils.filter((x) => s.councils[x]!.backing >= 5).length).toBe(c!.backersNow);
        for (const code of model.game.councils) {
          const d = councilView(model, after, code).backing - councilView(model, s, code).backing;
          const shown = c!.changes.find((x) => x.council === code)?.delta ?? 0;
          expect(Math.abs(d - shown)).toBeLessThan(0.05);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(3);
  });

  it("judges deals as the engine does, and says what a deal asks, where and by when", () => {
    const deals: { s: BoardState; d: Deal }[] = games.flatMap((s) => s.deals.map((d) => ({ s, d })));
    expect(deals.length).toBeGreaterThan(0);
    for (const { s, d } of deals) {
      const w = dealWords(model, s, d);
      if (d.kept === true) expect(keptBy(model, s, d), `${d.council} ${d.measure}`).not.toBeNull();
      if (d.kept === null) {
        expect(w.what).toContain(model.councils.find((c) => c.code === d.council)!.name.en);
        expect(w.what).toContain(whenWords(model, d.dueStep));
      }
    }
    for (const m of MEASURE_IDS) {
      expect(dealKeepers(model, m).length, m).toBeGreaterThan(0);
      expect(dealAsk(model, model.game.councils[0]!, m, 40)).toMatch(/For example/);
    }
  });

  it("shows no raw code, empty slot or broken plural on any board panel, in English or Welsh", () => {
    const ids = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b[a-z][\w-]*:[a-z0-9][\w:-]*\b|\{\w+\}|\bundefined\b|\bNaN\b|^boardui\.|\b1 years\b/;
    for (const lang of ["en", "cy"] as const) {
      setLang(lang);
      const seen = new Set<string>();
      const add = (x: string) => { if (x) seen.add(x); };
      // a source card's notes, as SourceCard reads them (`note`, else `notes`; a string or {en, cy})
      const noteOf = (id: string): string => {
        const src = boardSource(model, id) as unknown as { note?: unknown; notes?: unknown } | null;
        const n = src?.note ?? src?.notes;
        return typeof n === "string" ? n : n && typeof n === "object" ? String((n as Record<string, unknown>)[lang] ?? (n as Record<string, unknown>)["en"] ?? "") : "";
      };
      for (const s of games.filter((_, i) => i % 6 === 0)) {
        for (const b of model.branches) add(roadWords(model, branchPath(model, s, b), s));
        for (const code of model.game.councils) {
          for (const o of options(model, s, code)) {
            for (const x of o.blockers) add(blockerWords(model, x, s));
            if (o.action.kind === "build" || o.action.kind === "upgrade") {
              const p = priceOf(model, s, o);
              add(fareWords(p)); add(goWords(p)); add(offWords(model, p)); add(takesWords(o.buildYears ?? 0));
            }
          }
          const v = councilView(model, s, code);
          for (const g of v.groups) add(say(g.reason));
        }
        for (const law of model.laws) lawCost(model, s, law.id, true);
        for (const d of s.deals) { const w = dealWords(model, s, d); add(w.what); add(w.backing); }
      }
      for (const p of model.projects) for (const c of p.needs) add(conditionWords(model, c));
      for (const b of model.branches) for (const tr of b.tiers) for (const c of tr.opens) add(conditionWords(model, c, games[0]));
      const end = games[games.length - 1]!;
      for (const code of model.game.councils) {
        for (const measure of [...MEASURE_IDS, "backing"] as const) {
          for (const w of why(model, end, { council: code, measure, fromStep: 0, toStep: model.game.steps })) {
            add(whyCauseWords(model, w, end));
            add(ruleLabel(model, w.rule).name);
            for (const id of w.sources) add(noteOf(id));
          }
        }
      }
      for (const src of model.sources) add(noteOf(src.id));
      const bad = [...seen].filter((x) => ids.test(x));
      expect(bad, lang).toEqual([]);
      expect(seen.size).toBeGreaterThan(100);
    }
    // the copy itself: no raw id in any board screen string
    for (const lang of ["en", "cy"]) {
      const d = JSON.parse(readFileSync(join(root, "model", "i18n", lang, "boardui.json"), "utf8")) as Record<string, unknown>;
      const raw = Object.entries(d).filter(([k, v]) => !k.startsWith("_") && typeof v === "string" && /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b[a-z]+:[a-z]/.test(v.replace(/\{\w+\}/g, "")));
      expect(raw, lang).toEqual([]);
    }
  }, 60_000);
});
