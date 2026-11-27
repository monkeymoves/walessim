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
  // the promise result is always the first reason shown (playtest 3), then the largest other
  const promise = reasons.find((r) => r.code === "pledge_kept" || r.code === "pledge_broken");
  const others = reasons.filter((r) => r.code !== "drift" && r !== promise).sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  const top = [...(promise ? [promise] : []), ...others].slice(0, 2);
  return { after, reasons, top };
}
