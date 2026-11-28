// The running clock counts time by frames and steps once per step's worth, pauses cleanly, and
// never steps while stopped.
import { describe, expect, it } from "vitest";
import { ClockRunner, type Frames } from "./runner";

function fakeFrames() {
  let t = 0;
  const queue = new Map<number, () => void>();
  let id = 0;
  const frames: Frames = {
    now: () => t,
    request: (cb) => { queue.set(++id, cb); return id; },
    cancel: (n) => { queue.delete(n); },
  };
  /** Move time on in frames of `dt` ms. */
  const run = (ms: number, dt = 16) => {
    for (let gone = 0; gone < ms; gone += dt) {
      t += dt;
      const due = [...queue.entries()];
      queue.clear();
      for (const [, cb] of due) cb();
    }
  };
  return { frames, run, pending: () => queue.size };
}

describe("ClockRunner", () => {
  it("steps once for each step's worth of time", () => {
    const f = fakeFrames();
    let steps = 0;
    const r = new ClockRunner(() => { steps++; }, f.frames);
    r.setSpeed(100);
    r.start();
    f.run(1000, 10);
    expect(steps).toBe(10);
  });

  it("does nothing while stopped, and keeps no frame waiting", () => {
    const f = fakeFrames();
    let steps = 0;
    const r = new ClockRunner(() => { steps++; }, f.frames);
    r.setSpeed(100);
    r.start();
    f.run(250, 10);
    r.stop();
    expect(f.pending()).toBe(0);
    f.run(1000, 10);
    expect(steps).toBe(2);
    expect(r.isRunning).toBe(false);
  });

  it("can be stopped by its own step, as a stop does", () => {
    const f = fakeFrames();
    let steps = 0;
    const r = new ClockRunner(() => { steps++; r.stop(); }, f.frames);
    r.setSpeed(50);
    r.start();
    f.run(1000, 10);
    expect(steps).toBe(1);
    expect(r.progress()).toBe(0);
  });

  it("keeps the share of the step when the speed changes", () => {
    const f = fakeFrames();
    const r = new ClockRunner(() => undefined, f.frames);
    r.setSpeed(200);
    r.start();
    f.run(100, 10);
    expect(r.progress()).toBeCloseTo(0.5, 1);
    r.setSpeed(100);
    expect(r.progress()).toBeCloseTo(0.5, 1);
  });

  it("counts a long gap as one step at most", () => {
    const f = fakeFrames();
    let steps = 0;
    const r = new ClockRunner(() => { steps++; }, f.frames);
    r.setSpeed(100);
    r.start();
    f.run(5000, 5000);
    expect(steps).toBe(1);
  });
});
