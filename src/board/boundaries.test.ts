/**
 * The import rules of docs/design/v2-board.md section 12, checked by reading the source:
 * - src/board/engine imports only itself, src/engine/rng.ts and src/engine/places.ts, and never
 *   uses Math.random, the DOM or Solid.
 * - src/board/model imports only itself and src/board/engine/types (the type files).
 * - src/board/ui imports the board engine only through src/board/engine/api.ts.
 * - Nothing in v1 imports from src/board/, except the one route line in src/ui/shell/App.tsx.
 * - No board file uses the em dash or en dash, or clears all of localStorage.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(SRC, "..");
const rel = (abs: string) => relative(ROOT, abs).split("\\").join("/");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** Every module specifier a file imports or re-exports, static or dynamic. */
export function specifiers(source: string): string[] {
  const out: string[] = [];
  const patterns = [/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']/g, /import\s*["']([^"']+)["']/g, /import\s*\(\s*["']([^"']+)["']\s*\)/g];
  for (const re of patterns) for (const m of source.matchAll(re)) out.push(m[1]!);
  return out;
}

/** Resolve a relative specifier to a repo path with its extension, or return the bare name. */
function target(file: string, spec: string): string {
  if (!spec.startsWith(".")) return spec;
  const base = resolve(dirname(file), spec);
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return rel(base + ext);
  }
  return rel(base);
}

const imports = (file: string) => specifiers(readFileSync(file, "utf8")).map((s) => ({ spec: s, to: target(file, s) }));

describe("board boundaries", () => {
  it("the parser finds the usual import forms", () => {
    const src = `import a from "./a";\nimport type { B } from "../b";\nexport * from "./c";\nimport "./d";\nconst e = await import("./e");\nimport {\n  f,\n} from "./f";`;
    expect(specifiers(src).sort()).toEqual(["../b", "./a", "./c", "./d", "./e", "./f"]);
  });

  it("the engine imports only itself, rng.ts and places.ts", () => {
    const allowed = (to: string) => to.startsWith("src/board/engine/") || to === "src/engine/rng.ts" || to === "src/engine/places.ts";
    for (const file of walk(join(SRC, "board", "engine"))) {
      if (file.endsWith(".test.ts")) continue;
      for (const { spec, to } of imports(file)) expect(allowed(to), `${rel(file)} imports ${spec}`).toBe(true);
    }
  });

  it("the engine stays pure: no Math.random, DOM or Solid", () => {
    for (const file of walk(join(SRC, "board", "engine"))) {
      if (file.endsWith(".test.ts")) continue;
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, rel(file)).not.toMatch(/Math\.random|\bdocument\.|\bwindow\.|localStorage|solid-js/);
    }
  });

  it("the model loader imports only itself and the engine's types", () => {
    for (const file of walk(join(SRC, "board", "model"))) {
      if (file.endsWith(".test.ts")) continue;
      for (const { spec, to } of imports(file)) {
        const ok = to.startsWith("src/board/model/") || /^src\/board\/engine\/types(-[a-z]+)?\.ts$/.test(to);
        expect(ok, `${rel(file)} imports ${spec}`).toBe(true);
      }
    }
  });

  it("the board UI reaches the engine only through api.ts", () => {
    for (const file of walk(join(SRC, "board", "ui"))) {
      for (const { spec, to } of imports(file)) {
        if (to.startsWith("src/board/engine/")) expect(to, `${rel(file)} imports ${spec}`).toBe("src/board/engine/api.ts");
      }
    }
  });

  it("v1 does not import the board, except the route in App.tsx", () => {
    const allowed = new Set(["src/ui/shell/App.tsx"]);
    const v1 = walk(SRC).filter((f) => !rel(f).startsWith("src/board/"));
    for (const file of v1) {
      if (allowed.has(rel(file))) continue;
      for (const { spec, to } of imports(file)) expect(to.startsWith("src/board/"), `${rel(file)} imports ${spec}`).toBe(false);
    }
  });

  it("board files use no em or en dash and never clear all storage", () => {
    const files = [...walk(join(SRC, "board")), ...walk(join(ROOT, "model", "board"))];
    for (const dir of [join(ROOT, "model", "board")]) {
      if (!existsSync(dir)) continue;
      const yamls = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? yamls(join(d, n)) : n.endsWith(".yaml") ? [join(d, n)] : []));
      files.push(...yamls(dir));
    }
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(/[\u2013\u2014]/.test(text), `${rel(file)} has an em or en dash`).toBe(false);
      expect(/localStorage\.clear\s*\(/.test(text), `${rel(file)} clears all of localStorage`).toBe(false);
    }
  });
});
