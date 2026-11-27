/**
 * The curveball schedule (game-design 7.1), drawn once from the game seed: which slow trend is
 * revealed at each term's opening and which shock (if any) lands at step 5. All uncertainty runs
 * share it. The player's choices never change it, so peeking only reveals what is already set.
 */
import { uniform } from "./rng";
import type { Ctx } from "./scores";

export interface TermSchedule {
  /** Curveball revealed at this term's opening, or null. */
  newTrend: string | null;
  /** Curveball whose shock lands at step 5, or null. */
  shock: string | null;
}

/** Number of active trends that ripple to curveball `id`. */
function rippleCount(ctx: Ctx, active: string[], id: string): number {
  const target = ctx.curveballs.get(id)!;
  let n = 0;
  for (const a of active) {
    const cb = ctx.curveballs.get(a)!;
    if (cb.ripples_to.some((t) => target.trends.includes(t))) n++;
  }
  return n;
}

function drawTrend(ctx: Ctx, seed: number, term: number, active: string[]): string | null {
  const pool = ctx.model.curveballs.filter((c) => !active.includes(c.id));
  if (!pool.length) return null;
  const g = ctx.model.game.curveballs;
  const weights = pool.map((c) => Math.pow(g.ripple_weight, rippleCount(ctx, active, c.id)));
  const total = weights.reduce((a, b) => a + b, 0);
  let u = uniform(seed, "trend", term) * total;
  for (let i = 0; i < pool.length; i++) {
    u -= weights[i]!;
    if (u < 0) return pool[i]!.id;
  }
  return pool[pool.length - 1]!.id;
}

export function buildSchedule(ctx: Ctx, seed: number, firstGame: boolean): TermSchedule[] {
  const g = ctx.model.game.curveballs;
  const active: string[] = [];
  const fired = new Set<string>();
  const out: TermSchedule[] = [];
  const terms = ctx.model.game.years.length;
  for (let term = 0; term < terms; term++) {
    let newTrend: string | null = null;
    if (firstGame && term < g.first_game_order.length) newTrend = g.first_game_order[term]!;
    else if (firstGame && term === g.first_game_shock.term - 1 && !active.includes(g.first_game_shock.curveball)) newTrend = g.first_game_shock.curveball;
    else if (term === 0) newTrend = drawTrend(ctx, seed, term, active);
    else if (uniform(seed, "reveal", term) < g.new_trend_chance) newTrend = drawTrend(ctx, seed, term, active);
    if (newTrend && !active.includes(newTrend)) active.push(newTrend);
    else newTrend = null;

    let shock: string | null = null;
    // the first game's curated shock is kept for its own term: drawn early it landed twice, in
    // consecutive terms (playtest 4: Recession in 2034 and again in 2038)
    const curated = firstGame ? g.first_game_shock : null;
    if (curated && term === curated.term && !fired.has(curated.curveball)) shock = curated.curveball;
    else if (term > 0) {
      // active trends in order of age: ties go to the trend active longest; each shock lands at most
      // once a game (playtest 1), so never in two terms running
      for (const id of active) {
        const cb = ctx.curveballs.get(id)!;
        if (!cb.shock || fired.has(id)) continue;
        if (curated && id === curated.curveball && term < curated.term) continue;
        const chance = g.shock_chance + g.ripple_shock_bonus * rippleCount(ctx, active, id);
        if (uniform(seed, "shock", term, id) < chance) {
          shock = id;
          break;
        }
      }
    }
    if (shock) fired.add(shock);
    out.push({ newTrend, shock });
  }
  return out;
}
