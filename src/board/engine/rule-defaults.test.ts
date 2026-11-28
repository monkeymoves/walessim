/** Package 3's model files are sound, and the engine's fallback params match them. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { checkBoardFile } from "../model/files";
import { RULE_DEFAULTS } from "./rule-defaults";
import { RULE_IDS, type BoardGame, type BoardRule, type FutureDef, type GroupDef } from "./types";

const ROOT = resolve(__dirname, "../../../model/board");
const read = (name: string): unknown => load(readFileSync(resolve(ROOT, name), "utf8"));
/** The en dash and the em dash, written by code point so this file contains neither. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const FILES = ["rules/people.yaml", "groups.yaml", "futures.yaml", "game.yaml"];

describe("package 3 model files", () => {
  for (const name of FILES) {
    it(`${name} has the board shape and no dashes`, () => {
      expect(checkBoardFile(name, read(name))).toEqual([]);
      expect(readFileSync(resolve(ROOT, name), "utf8")).not.toMatch(DASHES);
    });
  }

  const rules = (read("rules/people.yaml") as { rules: BoardRule[] }).rules;

  it("people.yaml holds every people, score and severity rule the engine reads", () => {
    for (const key of ["moods", "backingStart", "passedOver", "election", "everyone", "score", "severity"] as const) {
      expect(rules.map((r) => r.id)).toContain(RULE_IDS[key]);
    }
  });

  it("the engine's fallback params equal the YAML defaults", () => {
    for (const [id, params] of Object.entries(RULE_DEFAULTS)) {
      const card = rules.find((r) => r.id === id);
      expect(card, id).toBeDefined();
      for (const [name, value] of Object.entries(params)) expect(card!.params[name]?.default, `${id}.${name}`).toBe(value);
    }
  });

  it("every rule is a game rule with a placeholder grade, and defaults sit inside their ranges", () => {
    for (const r of rules) {
      expect(r.game_rule).toBe(true);
      for (const [name, p] of Object.entries(r.params)) {
        expect(p.default, `${r.id}.${name}`).toBeGreaterThanOrEqual(p.min);
        expect(p.default, `${r.id}.${name}`).toBeLessThanOrEqual(p.max);
      }
    }
  });

  it("every future has one value a turn on every track", () => {
    const game = read("game.yaml") as BoardGame;
    for (const f of (read("futures.yaml") as { futures: FutureDef[] }).futures) {
      for (const v of Object.values(f.tracks)) expect(v).toHaveLength(game.turns);
    }
    expect(game.end_year).toBe(game.first_year + game.turns * game.turn_years);
  });

  it("every group but Everyone takes a real share; Everyone has a base weight", () => {
    const groups = (read("groups.yaml") as { groups: GroupDef[] }).groups;
    expect(groups).toHaveLength(5);
    for (const g of groups) expect(g.share_from === null ? g.base_weight !== undefined : g.sources.length > 0).toBe(true);
  });
});
