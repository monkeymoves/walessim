// A resumed game is the same game: replaying the log through the public API, keeping the
// reports, reaches the state the engine's own run code replay reaches, byte for byte.
import { describe, expect, it } from "vitest";
import { boardFixture, decodeRun, encodeRun } from "../../engine/api";
import { playForTest } from "../testPlay";
import { replayWithReports } from "./replay";

describe("replayWithReports", () => {
  const model = boardFixture();

  it("reaches the same state as decodeRun, with one report a step", () => {
    const played = { state: playForTest(model, 4242) };
    const code = encodeRun(played.state);
    const decoded = decodeRun(model, code);
    const out = replayWithReports(model, decoded.gameNumber, decoded.start, decoded.log, decoded.step);
    expect(JSON.stringify(out.state)).toBe(JSON.stringify(decoded));
    expect(out.reports.length).toBe(decoded.step);
    expect(out.reports.filter((r) => r.term).length).toBeGreaterThan(0);
  });

  it("stops part way through a game where the save was made", () => {
    const played = { state: playForTest(model, 77) };
    const mid = played.state.log.find((e) => e.at > 10)?.at ?? 12;
    const log = played.state.log.filter((e) => e.at <= mid);
    const out = replayWithReports(model, 77, model.starts[0]!.id, log, mid);
    expect(out.state.step).toBe(mid);
  });
});
