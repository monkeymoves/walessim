/**
 * Every rule size the screens read must exist in the rules (fix round 2 join). `ruleParamOf` falls
 * back to a number written in the code when a param is missing, so a renamed param (P6 `broken`
 * became `broken_here`) left the deal card saying "0.5 in every council" while the engine took 1.5
 * in one council. This scans every board screen file for a literal `ruleParamOf(model, "ID",
 * "param", ...)` and fails on any the built model does not carry.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardModel } from "../engine/api";

const realPath = join(__dirname, "..", "..", "..", "public", "board-model.json");
const CALL = /ruleParamOf\(\s*[\w.()]+\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}

describe.runIf(existsSync(realPath))("rule sizes read by the screens", () => {
  it("names only rule params the model carries", () => {
    const model = JSON.parse(readFileSync(realPath, "utf8")) as BoardModel;
    const missing: string[] = [];
    let seen = 0;
    for (const file of sources(__dirname)) {
      for (const m of readFileSync(file, "utf8").matchAll(CALL)) {
        seen++;
        const rule = model.rules.find((r) => r.id === m[1]);
        if (!rule?.params[m[2]!]) missing.push(`${file.slice(__dirname.length + 1)}: ${m[1]}.${m[2]}`);
      }
    }
    expect(seen).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });
});
