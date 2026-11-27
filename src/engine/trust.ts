/**
 * Trust (game-design 4): what moves it each term, the bands and the card limit. Pure.
 * The player never sees the points, only the band, the dial and the two largest reasons.
 */
import type { GameTuning, Grade, RegionId, StrandId, TrustBand } from "../model/schema";
import { STRAND_IDS } from "../model/schema";
import type { ShockResponse, TrustReason } from "./api";

export interface TrustFacts {
  before: number;
  /** Displayed flow pips per strand (strand order) before and after the term. */
  pipsBefore: number[];
  pipsAfter: number[];
  /** Delayed cards that arrived as forecast this term. */
  arrivals: number;
  pledge: { strand: StrandId; kept: boolean } | null;
  /** Change of the mean gap score (positive: the gap narrowed). */
  gapChange: number;
  shock: { prepared: boolean; response: ShockResponse } | null;
  visit: Grade | null;
  neglected: RegionId[];
  /** Debt tokens charged interest this term. */
  debtTokens: number;
  /** Deferred repairs from earlier terms still not done. */
  repairsOverdue?: number;
  /** Other reasons (curveballs, card side effects, tips moving). */
  extra: TrustReason[];
  returning: boolean;
}

export function bandFor(g: GameTuning, trust: number): { id: TrustBand; cards: number } {
  const bands = [...g.trust.bands].sort((a, b) => b.min - a.min);
  for (const b of bands) if (trust >= b.min && b.id !== "collapsed") return { id: b.id, cards: b.cards };
  return { id: "collapsed", cards: 0 };
}

export function computeTrust(g: GameTuning, f: TrustFacts): { after: number; reasons: TrustReason[]; top: TrustReason[] } {
  const T = g.trust;
  const reasons: TrustReason[] = [];
  const add = (code: TrustReason["code"], points: number, detail?: string) => {
    if (points !== 0) reasons.push({ code, points, ...(detail ? { detail } : {}) });
  };
  let gained = 0;
  let anyUp = false;
  STRAND_IDS.forEach((s, i) => {
    const d = f.pipsAfter[i]! - f.pipsBefore[i]!;
    if (d > 0) {
      anyUp = true;
      if (T.pip_gained_strands.includes(s)) gained += d;
    }
    if (d < 0) add("pips_lost", T.pip_lost * -d, s);
  });
  add("pips_gained", Math.min(T.pip_gained_cap, T.pip_gained * gained));
  add("promise_kept", Math.min(T.promise_kept_cap, T.promise_kept * f.arrivals));
  if (f.pledge) f.pledge.kept ? add("pledge_kept", T.pledge_kept, f.pledge.strand) : add("pledge_broken", T.pledge_broken, f.pledge.strand);
  if (f.gapChange > T.gap_tolerance) add("gap_narrowed", T.gap_narrowed);
  else if (f.gapChange < -T.gap_tolerance) add("gap_widened", T.gap_widened);
  if (f.shock) {
    if (f.shock.prepared) add("shock_prepared", T.shock_prepared);
    else if (f.shock.response > 0) add("shock_responded", T.shock_responded);
    else add("shock_absorbed", T.shock_absorbed);
  }
  if (f.visit) add("visit", T.visit[f.visit], f.visit);
  for (const r of f.neglected) add("neglect", T.neglect, r);
  add("debt_interest", T.debt_interest * f.debtTokens);
  add("repairs_overdue", (T.repairs_overdue ?? 0) * (f.repairsOverdue ?? 0));
  if (!anyUp && f.arrivals === 0) add("nothing_visible", T.nothing_visible);
  for (const x of f.extra) add(x.code, x.points, x.detail);
  const sum = reasons.reduce((a, r) => a + r.points, 0);
  const drift = T.drift * (T.drift_to - f.before);
  if (Math.abs(drift) >= 0.05) reasons.push({ code: "drift", points: Math.round(drift * 10) / 10 });
  const net = Math.max(-T.clamp, Math.min(T.clamp, sum + drift));
  let after = Math.max(0, Math.min(100, f.before + net));
  if (f.returning) after = Math.max(20, after);
  return { after, reasons, top: topReasons(reasons, f.before, after) };
}

/** Which way Trust moved, as the results step says it ("went up", "went down", "stayed the same"). */
export function trustDirection(before: number, after: number): "up" | "down" | "same" {
  return after > before + 0.5 ? "up" : after < before - 0.5 ? "down" : "same";
}

/**
 * The reasons shown under "Trust went up / down" (at most three). The promise result comes first
 * (playtest 3), then the largest other. Bars that fell count as one reason, not one per goal. When
 * Trust fell, at least one reason shown pulled it down, and when it rose, at least one pushed it up
 * (cold playtest 6, item 7: "Trust went down" over two good reasons, because three small losses and
 * the drift back to the middle each lost to a bigger gain).
 */
export function topReasons(reasons: TrustReason[], before: number, after: number): TrustReason[] {
  const merged: TrustReason[] = [];
  for (const r of reasons) {
    const same = r.code === "pips_lost" ? merged.find((m) => m.code === "pips_lost") : undefined;
    if (same) same.points += r.points;
    else merged.push({ ...r });
  }
  const promise = merged.find((r) => r.code === "pledge_kept" || r.code === "pledge_broken");
  const others = merged.filter((r) => r.code !== "drift" && r !== promise).sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  const top = [...(promise ? [promise] : []), ...others].slice(0, 2);
  const dir = trustDirection(before, after);
  if (dir === "same") return top;
  const agrees = (r: TrustReason) => (dir === "down" ? r.points < 0 : r.points > 0);
  if (top.some(agrees)) return top;
  const best = merged.filter(agrees).sort((a, b) => Math.abs(b.points) - Math.abs(a.points))[0];
  if (!best) return top;
  // replace the weaker of the shown reasons that is not the promise, else add it
  const k = top.length >= 2 && top[top.length - 1] !== promise ? top.length - 1 : -1;
  if (k >= 0) top[k] = best;
  else top.push(best);
  return top;
}
