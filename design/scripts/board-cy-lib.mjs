// English left on a Welsh board screen (playtest 8, must-fix 19). Builds the set of English-only
// strings of the board (every board copy key and every model {en, cy} field whose Welsh differs),
// and finds any screen line that is one of them, or a Welsh line with a fault the grammar should
// have caught. Shared by design/scripts/board-fix1-cy.mjs and tests/e2e/board-cy.spec.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const AREAS = ["board", "boardui", "boardend", "boardclock"];

export function englishOnly(root) {
  const read = (lang, area) => JSON.parse(readFileSync(join(root, "model", "i18n", lang, `${area}.json`), "utf8"));
  const exact = new Set();
  const patterns = [];
  const cyAll = new Set();
  const add = (en, cy) => {
    if (typeof en !== "string" || typeof cy !== "string") return;
    cyAll.add(cy.trim());
    if (en.trim() === cy.trim()) return;
    // a single word or a figure can be the same in both languages; look for longer English only
    if (!/[A-Za-z]{3,}.*\s.*[A-Za-z]{3,}/.test(en.replace(/\{\w+\}/g, ""))) return;
    if (/\{\w+\}/.test(en)) {
      const body = en.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+?");
      if (body.replace(/\.\+\?/g, "").replace(/\\/g, "").trim().length >= 12) patterns.push(new RegExp(`^${body}$`));
    } else exact.add(en.trim());
  };
  for (const a of AREAS) {
    const en = read("en", a), cy = read("cy", a);
    for (const [k, v] of Object.entries(en)) if (!k.startsWith("_")) add(v, cy[k]);
  }
  const model = JSON.parse(readFileSync(join(root, "public", "board-model.json"), "utf8"));
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === "object") {
      if (typeof o.en === "string" && typeof o.cy === "string") return add(o.en, o.cy);
      Object.values(o).forEach(walk);
    }
  })(model);
  for (const c of cyAll) exact.delete(c);
  return { exact, patterns };
}

/** Faults in one Welsh screen line: English left, a name not mutated, an article not joined. */
export function welshFaults(line, eng) {
  const s = line.trim();
  const out = [];
  if (!s) return out;
  if (eng.exact.has(s) || eng.patterns.some((p) => p.test(s))) out.push("English");
  if (/(^|[\s(])(yn|Yn) (Casnewydd|Caerdydd|Caerffili|Blaenau Gwent|Bro Morgannwg|Pen-y-bont ar Ogwr|Tor-faen|Merthyr Tudful|Powys|Treorci|Tredegar|Penarth|Pendyrus|Bargod|Glynebwy|Pont-y-pŵl|Blaenafon|Trefynwy|Dowlais|Maesteg)\b/.test(s)) out.push("no nasal after yn");
  if (/(^|[\s(])(i|o|ar|am|at|gan|dros|drwy|heb|wrth) (Casnewydd|Caerdydd|Caerffili|Blaenau|Bro|Pen-y-bont|Tor-faen|Merthyr|Powys|Treorci|Tredegar|Penarth|Pendyrus|Bargod|Glynebwy|Pont-y-pŵl|Blaenafon|Trefynwy|Dowlais|Maesteg|Castell-nedd)\b/.test(s)) out.push("no soft mutation");
  if (/(^|[\s(])(i|o|a|â|gyda|mae|Mae) (y|yr) /.test(s)) out.push("article not joined");
  if (/[a-zâêîôûŵŷ] (Y|Yr) [a-zâêîôûŵŷ]/.test(s)) out.push("capital article mid-sentence");
  if (/\{\w+\}|undefined|NaN|\bboard(ui|end|clock)?\.[a-z]/.test(s)) out.push("raw key or empty slot");
  if (/\d,\d{3}/.test(s)) out.push("thousands comma");
  if (/\byn yn\b/.test(s)) out.push("yn twice");
  return out;
}
