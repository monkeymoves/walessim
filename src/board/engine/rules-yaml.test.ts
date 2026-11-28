/**
 * model/board/rules/spread.yaml and budget.yaml (package 2): the right shape, every card and
 * param the engine reads, game rules flagged, Welsh marked for review.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { checkBoardFile } from "../model";
import type { BoardRule } from "./types";

const DIR = resolve(__dirname, "../../../model/board/rules");
const load = (name: string) => yaml.load(readFileSync(resolve(DIR, name), "utf8")) as { rules: BoardRule[] };

const NEEDED: Record<string, Record<string, string[]>> = {
  "spread.yaml": {
    S1: ["coef", "quality_step"],
    S2: ["coef"],
    S3: ["share", "pull"],
    S4: ["steps", "storm_weaken"],
  },
  "budget.yaml": {
    B1: ["base", "per_work_points", "carry_max"],
    B2: ["care_bill", "from_year", "hubs_needed"],
    B3: ["lost_coins"],
  },
};

describe("package 2 rule cards", () => {
  for (const [file, cards] of Object.entries(NEEDED)) {
    it(`${file} has the right shape and every card and param the engine reads`, () => {
      const parsed = load(file);
      expect(checkBoardFile(`rules/${file}`, parsed)).toEqual([]);
      for (const [id, params] of Object.entries(cards)) {
        const card = parsed.rules.find((r) => r.id === id);
        expect(card, id).toBeDefined();
        for (const p of params) expect(card!.params[p], `${id}.${p}`).toBeDefined();
      }
    });

    it(`${file} flags every card as a game rule, with params inside their ranges and Welsh for review`, () => {
      for (const r of load(file).rules) {
        expect(r.game_rule).toBe(true);
        expect(r.name.cy_review && r.note.cy_review).toBe(true);
        for (const [name, p] of Object.entries(r.params)) {
          expect(p.default, `${r.id}.${name}`).toBeGreaterThanOrEqual(p.min);
          expect(p.default, `${r.id}.${name}`).toBeLessThanOrEqual(p.max);
          expect(p.unit.cy_review).toBe(true);
        }
        if (r.kind === "spread") expect(r.spread?.lag).toBe(r.lag);
      }
    });
  }
});
