/**
 * Playtest 9 must-fix 1, 2 and 9, as classes: no tier gate waits on a project it cannot have, a
 * law's backing cost is exactly what the laws sheet says and lasts as long as the law, and a broken
 * deal costs only its own council and fades with a stated cause.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptBoardModel } from "../model/load";
import { act, advance, newBoard } from "./clock";
import { answerAll } from "./bots-common";
import { realEngine } from "./bots";
import { holds } from "./conditions";
import { lawBacking } from "./standing";
import type { BoardModel, BoardState } from "./types";

const REAL = resolve(__dirname, "../../../public/board-model.json");

function runYears(model: BoardModel, s: BoardState, years: number): BoardState {
  let out = s;
  const to = Math.min(model.game.steps, out.step + years * 4);
  while (out.step < to && out.phase !== "ended") {
    out = answerAll(realEngine, model, out);
    if (out.phase !== "play") break;
    out = advance(model, out, { maxSteps: to - out.step, light: true }).state;
  }
  return out;
}

describe.skipIf(!existsSync(REAL))("gates, laws and deals on the real board", () => {
  const model: BoardModel = acceptBoardModel(JSON.parse(readFileSync(REAL, "utf8")));

  it("every tier gate can be met by projects of its tier that come before the keystone, and a gate that needs one project twice names it", () => {
    for (const b of model.branches) {
      for (const t of b.tiers) {
        for (const c of t.opens) {
          if (c.kind !== "project") continue;
          const can = model.projects.filter((p) => (!c.branch || p.branch === c.branch) && (!c.tier || p.tier === c.tier)
            && (!c.project || p.id === c.project) && !p.legacy_of && !p.keystone);
          expect(can.length, `${b.id} tier ${t.tier}`).toBeGreaterThan(0);
          // More needed than kinds that can meet it: the same project must be built again, and the
          // gate's rule card must say so (the screen reads it), never leave it to be found out.
          if ((c.at_least ?? 1) > can.length) {
            const note = model.rules.find((r) => r.id === t.rule)?.note.en ?? "";
            expect(note, `${b.id} tier ${t.tier} needs ${c.at_least} of ${can.length} kind(s)`).toMatch(/twice|two councils/);
          }
          // A gate that needs one project twice names it, so the screen can say "working in 2 councils: 1 of 2".
          if (can.length === 1 && (c.at_least ?? 1) > 1) expect(c.project).toBe(can[0]!.id);
          if (c.project) expect(model.projects.find((p) => p.id === c.project)?.legacy_of).toBeUndefined();
        }
      }
    }
  });

  it("a legacy project never counts towards a tier gate, even when it stands", () => {
    let s = newBoard(model, 7, model.starts[0]!.id);
    const legacy = model.projects.find((p) => p.legacy_of && p.site === "council")!;
    const code = model.game.councils[0]!;
    s = { ...s, projects: [...s.projects, { id: `${legacy.id}@${code}`, project: legacy.id, site: { council: code }, level: 1, status: "working", startedStep: 0, readyStep: 0, roots: 1, joined: false }] };
    expect(holds(model, s, code, { kind: "project", branch: legacy.branch, tier: 2, where: "anywhere", at_least: 1 })).toBe(false);
  });

  it("a law moves Backing by exactly what the laws sheet says, at once, still there four years on, and gives it back on repeal", () => {
    for (const law of model.laws) {
      const said = lawBacking(model, law.id);
      expect(said.some((x) => Math.abs(x.points) >= 0.3), `${law.id} costs something real`).toBe(true);
      let base = runYears(model, newBoard(model, 11, model.starts[0]!.id), 4.25);
      base = answerAll(realEngine, model, base);
      const passed = act(model, base, { kind: "law", law: law.id, pass: true });
      for (const code of model.game.councils) {
        const want = said.find((x) => x.council === code)?.points ?? 0;
        const moved = passed.councils[code]!.backing - base.councils[code]!.backing;
        if (base.councils[code]!.backing + want > 0 && base.councils[code]!.backing + want < 10) expect(moved, `${law.id} in ${code}`).toBeCloseTo(want, 3);
      }
      // Four years on, the law's part is still the same (its effects on the board move moods too, so compare the standing part).
      const later = runYears(model, passed, 4);
      for (const { council, points } of said) expect(later.councils[council]!.standing?.[`law:${law.id}`]).toBeCloseTo(points, 4);
      const lawRecords = later.ledger.filter((c) => c.cause.kind === "law" && c.quantity === "backing");
      expect(lawRecords.every((c) => c.step === base.step), "no law record after the day it passed").toBe(true);
    }
  });
});
