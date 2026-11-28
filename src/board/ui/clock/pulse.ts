/**
 * How the needs-you outline moves (docs/design/v3-wales.md section 2): it pulses once a second
 * between full strength and 40 in 100, never to nothing, for 5 seconds, then stays steady. Under
 * prefers-reduced-motion, or with "Flashing outline" off in the clock settings, it is steady from
 * the start. One pulse a second is far under the three flashes a second that can harm.
 *
 * NeedsYou.tsx sets the outline's opacity from `ringStrength` on each frame, so the rule tested
 * here is the one on screen and this file is the one home of its numbers.
 */
export const NEEDS_PULSE = { periodMs: 1000, pulses: 5, low: 0.4 } as const;

/** The outline moves only when the player has not asked for less motion and has the setting on. */
export const ringMoves = (reducedMotion: boolean, flashingOutline: boolean): boolean => flashingOutline && !reducedMotion;

/** The outline's strength (1 is full) `ms` after it appeared: a smooth pulse, low at each half second, then steady. */
export function ringStrength(ms: number, moves: boolean): number {
  const { periodMs, pulses, low } = NEEDS_PULSE;
  if (!moves || ms < 0 || ms >= periodMs * pulses) return 1;
  const phase = (ms % periodMs) / periodMs;
  return low + (1 - low) * (0.5 + 0.5 * Math.cos(2 * Math.PI * phase));
}

