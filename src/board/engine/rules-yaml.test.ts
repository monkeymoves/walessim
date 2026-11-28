/**
 * model/board/rules/spread.yaml, budget.yaml and growth.yaml (packages 2 and 8): the right shape,
 * every card and param the engine reads, game rules flagged, Welsh marked for review, no dashes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { checkBoardFile } from "../model";
import type { BoardRule } from "./types";

const DIR = resolve(__dirname, "../../../model/board/rules");
/** The en dash and the em dash, written by code point so this file contains neither. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const load = (name: string) => yaml.load(readFileSync(resolve(DIR, name), "utf8")) as { rules: BoardRule[] };

const NEEDED: Record<string, Record<string, string[]>> = {
  "spread.yaml": {
    S1: ["coef", "quality_step"],
    S2: ["coef"],
    S3: [
      "max_per_year", "pull_per_year", "links_per_council", "floor_share", "ceiling_share", "work_per_point", "work_gain_per_point",
      "welsh_per_point", "welsh_gain_per_point", "homes_per_point", "tag_block", "reverse_pull_points",
    ],
    S4: ["steps", "storm_weaken"],
  },
  "budget.yaml": {
    B1: ["base_per_year", "growth_per_year", "per_work_points", "purse_max", "running_share", "opening"],
    B2: ["care_bill_per_year", "from_year", "hubs_needed"],
  },
  "growth.yaml": {
    R1: ["grow_alone_per_year", "grow_joined_per_year", "max_factor", "quick_max_factor"],
    R2: [
      "over_years", "rise_at", "slip_at", "settle_band", "pull_points", "roots_bonus", "backing_per_year", "coins_per_year",
      "region_turn_councils", "region_turn_coins_per_year",
    ],
    R3: ["discount", "min_cost", "joined_years", "lowest_count"],
    R4: ["base", "per_point", "min_factor", "max_factor"],
  },
};

describe("package 2 and 8 rule cards", () => {
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
        if (r.kind === "spread") expect(r.spread?.lag_years).toBe(r.lag_years);
      }
      expect(readFileSync(resolve(DIR, file), "utf8")).not.toMatch(DASHES);
    });
  }
});
