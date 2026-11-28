/**
 * The running clock (docs/design/v2-board.md 16.2.2): a frame loop that counts the time that has
 * passed while running and calls `onStep` each time a step's worth has gone by. It knows nothing
 * of the engine or the screen. It holds no chance: the engine's state depends only on the action
 * log, never on when the frames fall, so the same actions give the same game at any speed.
 *
 * `progress()` is how far into the current step the clock is (0 to 1), for the sliding pin and
 * the pulses along links. Paused, it does not move.
 */

export interface Frames {
  now(): number;
  request(cb: () => void): number;
  cancel(id: number): void;
}

/** requestAnimationFrame in the browser. In a hidden tab the browser stops the frames, and the board pauses too. */
export const browserFrames: Frames = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(() => cb()),
  cancel: (id) => cancelAnimationFrame(id),
};

export class ClockRunner {
  private running = false;
  private ms = 3000;
  private acc = 0;
  private last = 0;
  private frame = 0;
  private listeners = new Set<(p: number) => void>();

  /** `onStep` is called once for each whole step that passes; it may stop the runner. */
  constructor(private readonly onStep: () => void, private readonly frames: Frames = browserFrames) {}

  get isRunning(): boolean { return this.running; }

  /** How far into the current step, 0 to 1. */
  progress(): number { return Math.min(1, this.acc / this.ms); }

  /** Called every frame while running with the progress, and once on each stop and reset. */
  onProgress(fn: (p: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Change the length of a step. The progress through the current step is kept as a share. */
  setSpeed(msPerStep: number): void {
    const share = this.progress();
    this.ms = Math.max(1, msPerStep);
    this.acc = share * this.ms;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = this.frames.now();
    this.frame = this.frames.request(() => this.loop());
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.frames.cancel(this.frame);
    this.emit();
  }

  /** Back to the start of a step (after a step was taken by hand, or a stop). */
  reset(): void {
    this.acc = 0;
    this.last = this.frames.now();
    this.emit();
  }

  private loop(): void {
    if (!this.running) return;
    const now = this.frames.now();
    // a long gap (the tab was asleep) counts as one step at most, so nothing races ahead
    this.acc += Math.min(now - this.last, this.ms);
    this.last = now;
    if (this.acc >= this.ms) {
      this.acc -= this.ms;
      this.onStep();
      if (!this.running) { this.acc = 0; this.emit(); return; }
    }
    this.emit();
    this.frame = this.frames.request(() => this.loop());
  }

  private emit(): void {
    const p = this.progress();
    for (const fn of this.listeners) fn(p);
  }
}
