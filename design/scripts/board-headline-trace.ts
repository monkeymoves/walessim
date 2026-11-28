/**
 * Headline trace: Left for 2050 year by year for a few bots, to see how early play moves it.
 *   npx tsx design/scripts/board-headline-trace.ts [games]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashSeed } from "../../src/engine/rng";
import { acceptBoardModel } from "../../src/board/model/load";
import { allBots, playTurn, realEngine, startFor, stepsToDecision, BOT_STOPS } from "../../src/board/engine/bots";
import { answerAll, buildOptions, type BotView } from "../../src/board/engine/bots-common";
import type { Bot } from "../../src/board/engine/bots-strategies";
import { scores } from "../../src/board/engine/score";

const model = acceptBoardModel(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../public/board-model.json"), "utf8")));
// Explore without a rebuild: OVR="R1.quick_max_factor=3,B1.opening=8" sets rule params.
for (const kv of (process.env.OVR ?? "").split(",").filter(Boolean)) {
  const [path, v] = kv.split("=");
  const [id, name] = path!.split(".");
  const r = model.rules.find((x) => x.id === id);
  if (!r?.params[name!]) throw new Error(`no param ${path}`);
  r.params[name!]!.default = Number(v);
}
// QSCALE=0.75 scales quick projects' measure lifts; T1SCALE, T2SCALE, T3SCALE scale tiers (keystones are tier 3).
for (const d of model.projects) {
  const k = Number(d.quick ? process.env.QSCALE ?? 1 : 1) * Number(process.env[`T${d.tier}SCALE`] ?? 1);
  if (k !== 1) for (const e of d.effects) if (e.kind === "measure") (e as { points: number }).points *= k;
}
const games = Number(process.argv[2] ?? 6);
const want = new Set((process.argv[3] ?? "autopilot,skilled,branch-valleys,branch-homes,branch-made_here,branch-landscape,random").split(","));
const years = [2026, 2027, 2028, 2029, 2030, 2032, 2034, 2036, 2038, 2042, 2046, 2050];
/** Low effort probes: spend on the big employer wherever it is allowed, or on the cheapest build. */
const employer: Bot = { id: "employer", careful: false, next: (v) => buildOptions(v).filter((o) => o.project === "big-employer").sort((a, b) => a.cost - b.cost)[0] ?? null };
const cheapest: Bot = { id: "cheapest", careful: false, next: (v) => buildOptions(v).sort((a, b) => a.cost - b.cost)[0] ?? null };
for (const bot of [...allBots(model), employer, cheapest].filter((b) => want.has(b.id))) {
  const rows: number[][] = [];
  for (let g = 1; g <= games; g++) {
    const v: BotView = { model, engine: realEngine, state: realEngine.newBoard(model, g, startFor(model, g)), seed: hashSeed(`${bot.id}:${g}`), tried: new Set() };
    const seen: Record<number, number> = {};
    const start = scores(model, v.state).start;
    for (let guard = 0; guard < 400 && v.state.phase !== "ended"; guard++) {
      playTurn(v, bot);
      v.state = answerAll(realEngine, model, v.state);
      const y = v.state.year + (v.state.step % 4) / 4;
      for (const yy of years) if (seen[yy] === undefined && v.state.step >= (yy - 2026) * 4) seen[yy] = scores(model, v.state).result - start;
      if (v.state.phase !== "play") break;
      v.state = realEngine.advance(model, v.state, { maxSteps: stepsToDecision(model, v.state.step), stopOn: BOT_STOPS }).state;
      void y;
    }
    seen[2050] = scores(model, v.state).result - start;
    if (process.env.BUILT && g === 1) {
      const n: Record<string, number> = {};
      for (const p of v.state.projects) n[p.project] = (n[p.project] ?? 0) + 1;
      console.log(bot.id, JSON.stringify(n));
    }
    rows.push(years.map((yy) => seen[yy] ?? NaN));
    if (process.env.EACH) console.log(bot.id, g, years.map((yy) => (seen[yy] ?? NaN).toFixed(1)).join(" "));
  }
  const med = years.map((_, i) => { const s = rows.map((r) => r[i]!).sort((a, b) => a - b); return s[Math.floor(s.length / 2)]!; });
  console.log(bot.id.padEnd(18), years.map((y, i) => `${y}:${med[i]!.toFixed(1)}`).join(" "));
}
