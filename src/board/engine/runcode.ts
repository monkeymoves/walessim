/**
 * Run codes: the game number, the start and every step, short enough to paste (section 8, item 7).
 * Decoding replays the steps from the game number, so a code is also a save and a proof that the
 * engine is deterministic.
 *
 * Format: "B1" then base64url of a JSON array
 * `[version, hash8, gameNumber, start, dictionary, steps]`. Ids are written once in the
 * dictionary; steps refer to them by base 36 index:
 * `e` (or `e3` for three ends of turn), `b<p>:<site>`, `u<p>:<site>` (site `c<i>` or `l<i>`),
 * `l<i>+` or `l<i>-` (law), `r<e>:<r>` (respond), `v<p>:<i>/<i>` (visit picks).
 */
import { BoardRunError } from "./errors";
import { act, endTurn, newBoard } from "./turn";
import type { Action, BoardModel, BoardState, RunStep, Site, StartId } from "./types";

const PREFIX = "B1";
const VERSION = 1;
const hash8 = (h: string): string => h.slice(0, 8);

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63]!;
    if (i + 2 < bytes.length) out += B64[n & 63]!;
  }
  return out;
}

export function fromBase64Url(code: string): string {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of code) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new BoardRunError("The run code has a character it should not have");
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 255);
    }
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
}

function encodeSteps(steps: RunStep[], dict: string[]): string {
  const idx = (id: string): string => {
    let i = dict.indexOf(id);
    if (i < 0) i = dict.push(id) - 1;
    return i.toString(36);
  };
  const site = (s: Site): string => (s.council !== undefined ? `c${idx(s.council)}` : `l${idx(s.link!)}`);
  const out: string[] = [];
  let ends = 0;
  const flush = () => {
    if (ends > 0) out.push(ends === 1 ? "e" : `e${ends.toString(36)}`);
    ends = 0;
  };
  for (const s of steps) {
    if (s.kind === "end_turn") { ends++; continue; }
    flush();
    if (s.kind === "build" || s.kind === "upgrade") out.push(`${s.kind === "build" ? "b" : "u"}${idx(s.project)}:${site(s.site)}`);
    else if (s.kind === "law") out.push(`l${idx(s.law)}${s.pass ? "+" : "-"}`);
    else if (s.kind === "respond") out.push(`r${idx(s.event)}:${idx(s.response)}`);
    else out.push(`v${idx(s.place)}:${s.picks.map(idx).join("/")}`);
  }
  flush();
  return out.join(",");
}

function decodeSteps(text: string, dict: string[]): RunStep[] {
  const id = (s: string): string => {
    const v = dict[parseInt(s, 36)];
    if (v === undefined || !/^[0-9a-z]+$/.test(s)) throw new BoardRunError("The run code refers to something it does not list");
    return v;
  };
  const site = (s: string): Site => (s[0] === "c" ? { council: id(s.slice(1)) } : s[0] === "l" ? { link: id(s.slice(1)) } : (() => { throw new BoardRunError("Bad site in run code"); })());
  const out: RunStep[] = [];
  for (const tok of text ? text.split(",") : []) {
    const head = tok[0];
    const body = tok.slice(1);
    if (head === "e") {
      const n = body ? parseInt(body, 36) : 1;
      if (!Number.isFinite(n) || n < 1 || n > 100) throw new BoardRunError("Bad end of turn in run code");
      for (let i = 0; i < n; i++) out.push({ kind: "end_turn" });
    } else if (head === "b" || head === "u") {
      const [p, s] = body.split(":");
      out.push({ kind: head === "b" ? "build" : "upgrade", project: id(p ?? ""), site: site(s ?? "") });
    } else if (head === "l") {
      const sign = body.slice(-1);
      if (sign !== "+" && sign !== "-") throw new BoardRunError("Bad law in run code");
      out.push({ kind: "law", law: id(body.slice(0, -1)), pass: sign === "+" });
    } else if (head === "r") {
      const [e, r] = body.split(":");
      out.push({ kind: "respond", event: id(e ?? ""), response: id(r ?? "") });
    } else if (head === "v") {
      const [p, picks] = body.split(":");
      out.push({ kind: "visit", place: id(p ?? ""), picks: picks ? picks.split("/").map(id) : [] });
    } else throw new BoardRunError("The run code has a step it cannot read");
  }
  return out;
}

/** A short code: the game number, the start and the steps. Paste to replay. */
export function encodeRun(state: BoardState): string {
  const dict: string[] = [];
  const steps = encodeSteps(state.steps, dict);
  return PREFIX + toBase64Url(JSON.stringify([VERSION, hash8(state.modelHash), state.gameNumber, state.start, dict, steps]));
}

/** Replay steps from a game number and start. Throws whatever `act` or `endTurn` throws. */
export function replay(model: BoardModel, gameNumber: number | string, start: StartId, steps: readonly RunStep[]): BoardState {
  let state = newBoard(model, gameNumber, start);
  for (const s of steps) state = s.kind === "end_turn" ? endTurn(model, state).state : act(model, state, s as Action);
  return state;
}

/** Replay a run code into a state. Throws `BoardRunError` if it cannot be read or was made with another model. */
export function decodeRun(model: BoardModel, code: string): BoardState {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new BoardRunError("That is not a board run code");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)));
  } catch (e) {
    throw e instanceof BoardRunError ? e : new BoardRunError("The run code could not be read");
  }
  if (!Array.isArray(parsed) || parsed.length !== 6) throw new BoardRunError("The run code could not be read");
  const [version, hash, gameNumber, start, dict, steps] = parsed as unknown[];
  if (version !== VERSION) throw new BoardRunError(`Run code version ${String(version)} is not supported`);
  if (hash !== hash8(model.meta.hash)) throw new BoardRunError("The run code was made with a different version of the board");
  if ((typeof gameNumber !== "number" && typeof gameNumber !== "string") || typeof start !== "string" || typeof steps !== "string"
    || !Array.isArray(dict) || !dict.every((d) => typeof d === "string")) throw new BoardRunError("The run code could not be read");
  try {
    return replay(model, gameNumber, start, decodeSteps(steps, dict as string[]));
  } catch (e) {
    if (e instanceof BoardRunError) throw e;
    throw new BoardRunError(`The run code does not replay: ${(e as Error).message}`);
  }
}
