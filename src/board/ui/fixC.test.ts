/**
 * Contradiction tests for the board panels' words (playtest 8, package C): one rule for "backs
 * you", no figure with more than one decimal, a reason for every locked project, "Look" goes to the
 * council its sentence names, and every Why? ends in readable, concrete words.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { setLang, t } from "../../i18n";
import type { Source } from "../../model/schema";
import type { BoardModel, BoardState, Condition } from "../engine/api";
import { councilView, MEASURE_IDS, options, why } from "../engine/api";
import { acceptBoardModel } from "../model";
import { blockerWords, conditionWords } from "./blockers";
import { roadWords } from "./BranchRoad";
import { branchPath } from "./branchPath";
import { whyCauseWords } from "./causes";
import { replayWithReports } from "./clock/replay";
import { backsAtOf } from "./mapLinks";
import { playForTest } from "./testPlay";
import { statesForTest } from "./testStates";
import { ruleHref, ruleLabel, sourceLabels } from "./whyWords";
import { backingShown, councilName, nameIdsFrom, num, outOf10, say, signed, wholeCoins } from "./words";

const realPath = join(__dirname, "..", "..", "..", "public", "board-model.json");
const LONG_DECIMAL = /\d[.,]\d{2,}/;

describe("one rule for backs you", () => {
  it("never shows a figure of 5 or more for a council that does not back you, or less for one that does", () => {
    for (let i = 0; i <= 10000; i++) {
      const v = i / 1000;
      expect(backingShown(v) >= 5, `backing ${v} shows ${backingShown(v)}`).toBe(v >= 5);
    }
    for (const v of [4.95, 4.96, 4.999999, 4.9999999999999, 5, 5.0000001, 5.04]) expect(backingShown(v) >= 5).toBe(v >= 5);
  });

  it("prints at most one decimal", () => {
    expect(num(1.8132)).toBe("1.8");
    expect(num(6.5002)).toBe("6.5");
    expect(num(2035)).toBe("2035");
    expect(wholeCoins(1.99999995)).toBe(2);
    expect(wholeCoins(1.8132)).toBe(1);
  });
});

describe.skipIf(!existsSync(realPath))("board panel words in a real game", () => {
  const model: BoardModel = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")));
  nameIdsFrom(model);
  const states: BoardState[] = statesForTest(model, 2026);
  const end = states[states.length - 1]!;

  it("says backs you exactly when the shown backing is at the line, in every council, every year", () => {
    const at = backsAtOf(model);
    for (const s of states) {
      for (const code of model.game.councils) {
        const v = councilView(model, s, code);
        expect(backingShown(v.backing) >= at, `${code} ${s.year} backing ${v.backing}`).toBe(v.backs);
      }
    }
  });

  it("gives every condition in the model its own reason, in both languages", () => {
    const conds: Condition[] = [
      ...model.projects.flatMap((p) => p.needs),
      ...model.branches.flatMap((b) => b.tiers.flatMap((tr) => tr.opens)),
    ];
    for (const lang of ["en", "cy"] as const) {
      setLang(lang);
      for (const c of conds) {
        const w = conditionWords(model, c);
        expect(w, JSON.stringify(c)).not.toMatch(/\{\w+\}|^boardui\.|undefined/);
        expect(w.length).toBeGreaterThan(8);
      }
    }
    setLang("en");
  });

  it("names the keystone a legacy project waits for", () => {
    for (const p of model.projects.filter((x) => x.legacy_of)) {
      const keystone = model.projects.find((x) => x.id === p.legacy_of)!;
      const o = options(model, states[0]!).find((x) => x.project === p.id);
      expect(o?.allowed).toBe(false);
      const words = o!.blockers.map((b) => blockerWords(model, b)).join(" ");
      expect(words).toContain(keystone.name.en);
    }
  });

  it("counts the road to each keystone as the engine opens it", () => {
    for (const s of states.filter((x) => x.phase === "play")) {
      const opts = options(model, s);
      for (const b of model.branches) {
        const path = branchPath(model, s, b);
        for (const g of path.gates) {
          // the engine's own word: a project of that step is blocked by the gate exactly while it is shut
          const gated = opts.filter((o) => o.branch === b.id && o.tier === g.tier && !model.projects.find((p) => p.id === o.project)?.legacy_of);
          expect(gated.length).toBeGreaterThan(0);
          const shut = gated.some((o) => o.blockers.some((x) => x.kind === "needs" && x.condition.kind === "project" && x.condition.branch === b.id && x.condition.tier === g.from));
          expect(g.open, `${b.id} tier ${g.tier} in ${s.year}`).toBe(!shut);
        }
        expect(roadWords(path, s.year)).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("shows no figure with more than one decimal in any reason, score, backing or Why?", () => {
    const seen: string[] = [];
    for (const s of states) {
      for (const code of model.game.councils) {
        for (const o of options(model, s, code)) seen.push(...o.blockers.map((b) => blockerWords(model, b)), num(o.cost));
        const v = councilView(model, s, code);
        seen.push(num(backingShown(v.backing)), ...v.measures.map((m) => outOf10(m.score)), ...v.real.map((r) => num(r.value)));
        seen.push(...v.measures.map((m) => signed(m.change)));
      }
      for (const o of options(model, s)) seen.push(...o.blockers.map((b) => blockerWords(model, b)));
    }
    for (const code of model.game.councils) {
      for (const measure of MEASURE_IDS) {
        for (const w of why(model, end, { council: code, measure, fromStep: 0, toStep: model.game.steps })) seen.push(whyCauseWords(model, w, end), signed(w.delta));
      }
    }
    const bad = seen.filter((x) => LONG_DECIMAL.test(x));
    expect([...new Set(bad)]).toEqual([]);
  });

  it("ends every Why? in readable words: a rule name, a page of the book, distinct sources, a concrete cause", () => {
    const pages = ["", "projects", "events", "links", "endings", "chapters"];
    const sources = (ids: string[]) => ids.map((id) => (model.sources.find((x) => x.id === id) as unknown as Source) ?? null);
    let n = 0;
    for (const code of model.game.councils) {
      for (const measure of [...MEASURE_IDS, "young_adults", "backing"] as const) {
        for (const w of why(model, end, { council: code, measure, fromStep: 0, toStep: model.game.steps })) {
          n++;
          const r = ruleLabel(model, w.rule);
          expect(r.name, w.rule).not.toMatch(/^[a-z_]+:[\w-]+$|undefined/);
          expect(r.name.length).toBeGreaterThan(1);
          const href = ruleHref(model, w.rule);
          const page = decodeURIComponent(href.replace("#/llyfr/bwrdd", "").replace(/^\//, ""));
          expect(pages.includes(page) || model.rules.some((x) => x.id === page), href).toBe(true);
          // the publisher alone is the harshest shortener: "ONS" twice, "Various" often
          const labels = sourceLabels(sources(w.sources), (x) => x.publisher ?? "");
          expect(new Set(labels).size, labels.join(" | ")).toBe(labels.length);
          for (const l of labels) expect(l).not.toMatch(/^Various\b/i);
          const cause = whyCauseWords(model, w, end);
          expect(cause).not.toMatch(/\{\w+\}|undefined|^People moving and changing their minds/);
          expect(cause.length).toBeGreaterThan(5);
          if (w.cause.kind === "people" && w.cause.group === "young") expect(cause).toMatch(/\d/);
        }
      }
    }
    expect(n).toBeGreaterThan(50);
  });

  it("sends Look to the council its sentence names, and the button says which", () => {
    const played = playForTest(model, 2027);
    const { reports } = replayWithReports(model, played.gameNumber, played.start, played.log, played.step);
    const names = model.game.councils.map((c) => councilName(model, c));
    let checked = 0;
    for (const r of reports) {
      for (const stop of r.stops) {
        if (!stop.council) continue;
        const line = say(stop.say);
        const own = councilName(model, stop.council);
        const named = names.filter((x) => line.includes(x));
        if (named.length) { expect(named, line).toContain(own); checked++; }
        expect(t("boardui.stop.lookAt", { council: own })).toContain(own);
      }
    }
    expect(checked).toBeGreaterThan(5);
  });
});
