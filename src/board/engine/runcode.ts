/**
 * Run codes: the game number, the start, the step reached and every action with its step, short
 * enough to paste (section 8 item 7, 16.2.8). Decoding replays the log from the game number, so
 * a code is also a save and a proof that the engine is deterministic.
 *
 * Format: "b3." then base64url of a JSON array
 * `[version, board, hash8, gameNumber, start, stepReached, dictionary, actions]`. The board id
 * comes first after the version, so a screen can read which board a code is for (`runBoard`) and
 * load that board before replaying it (ADR 0009). Ids are written once in
 * the dictionary; `actions` is a comma list of `<at>@<action>`, the step in base 36, and the
 * action as `b<p>:<site>`, `u<p>:<site>` (site `c<i>` or `l<i>`), `l<i>+` or `l<i>-` (law),
 * `r<e>:<r>` (respond), `v<p>:<i>/<i>` (visit picks), `d<c>:<m>` (deal), ids by base 36 index.
 * A code from an older version ("B1", or "b2" from before boards) is refused with a plain message.
 */
import { BoardRunError } from "./errors";
import { replay } from "./clock";
import type { Action, BoardId, BoardModel, BoardState, LoggedAction, Site } from "./types";

const PREFIX = "b3.";
const VERSION = 3;
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

function encodeLog(log: readonly LoggedAction[], dict: string[]): string {
  const idx = (id: string): string => {
    let i = dict.indexOf(id);
    if (i < 0) i = dict.push(id) - 1;
    return i.toString(36);
  };
  const site = (s: Site): string => (s.council !== undefined ? `c${idx(s.council)}` : `l${idx(s.link!)}`);
  const token = (a: Action): string => {
    if (a.kind === "build" || a.kind === "upgrade") return `${a.kind === "build" ? "b" : "u"}${idx(a.project)}:${site(a.site)}`;
    if (a.kind === "law") return `l${idx(a.law)}${a.pass ? "+" : "-"}`;
    if (a.kind === "respond") return `r${idx(a.event)}:${idx(a.response)}`;
    if (a.kind === "deal") return `d${idx(a.council)}:${idx(a.measure)}`;
    return `v${idx(a.place)}:${a.picks.map(idx).join("/")}`;
  };
  return log.map((e) => `${e.at.toString(36)}@${token(e.action)}`).join(",");
}

function decodeLog(text: string, dict: string[]): LoggedAction[] {
  const id = (s: string): string => {
    const v = dict[parseInt(s, 36)];
    if (v === undefined || !/^[0-9a-z]+$/.test(s)) throw new BoardRunError("The run code refers to something it does not list");
    return v;
  };
  const site = (s: string): Site => (s[0] === "c" ? { council: id(s.slice(1)) } : s[0] === "l" ? { link: id(s.slice(1)) } : (() => { throw new BoardRunError("Bad site in run code"); })());
  const action = (tok: string): Action => {
    const head = tok[0];
    const body = tok.slice(1);
    if (head === "b" || head === "u") {
      const [p, s] = body.split(":");
      return { kind: head === "b" ? "build" : "upgrade", project: id(p ?? ""), site: site(s ?? "") };
    }
    if (head === "l") {
      const sign = body.slice(-1);
      if (sign !== "+" && sign !== "-") throw new BoardRunError("Bad law in run code");
      return { kind: "law", law: id(body.slice(0, -1)), pass: sign === "+" };
    }
    if (head === "r") {
      const [e, r] = body.split(":");
      return { kind: "respond", event: id(e ?? ""), response: id(r ?? "") };
    }
    if (head === "d") {
      const [c, m] = body.split(":");
      return { kind: "deal", council: id(c ?? ""), measure: id(m ?? "") as Extract<Action, { kind: "deal" }>["measure"] };
    }
    if (head === "v") {
      const [p, picks] = body.split(":");
      return { kind: "visit", place: id(p ?? ""), picks: picks ? picks.split("/").map(id) : [] };
    }
    throw new BoardRunError("The run code has a step it cannot read");
  };
  return (text ? text.split(",") : []).map((entry) => {
    const at = entry.indexOf("@");
    const step = at > 0 ? parseInt(entry.slice(0, at), 36) : NaN;
    if (!Number.isInteger(step) || step < 0 || !/^[0-9a-z]+$/.test(entry.slice(0, at))) throw new BoardRunError("Bad step in run code");
    return { at: step, action: action(entry.slice(at + 1)) };
  });
}

/** A short code: the board, the game number, the start, the step reached and the log. Paste to replay. */
export function encodeRun(state: BoardState): string {
  const dict: string[] = [];
  const log = encodeLog(state.log, dict);
  return PREFIX + toBase64Url(JSON.stringify([VERSION, state.board, hash8(state.modelHash), state.gameNumber, state.start, state.step, dict, log]));
}

/** The parsed array of a run code. Throws `BoardRunError` if it cannot be read or is from an older version. */
function readRun(code: string): unknown[] {
  const trimmed = code.trim();
  if (/^b[12]/i.test(trimmed)) throw new BoardRunError("This code is from an older version of the game.");
  if (!trimmed.startsWith(PREFIX)) throw new BoardRunError("That is not a board run code");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)));
  } catch (e) {
    throw e instanceof BoardRunError ? e : new BoardRunError("The run code could not be read");
  }
  if (!Array.isArray(parsed) || parsed.length !== 8 || typeof parsed[1] !== "string") throw new BoardRunError("The run code could not be read");
  if (parsed[0] !== VERSION) throw new BoardRunError(`Run code version ${String(parsed[0])} is not supported`);
  return parsed;
}

/** The board a run code was made on, to load before replaying it. Throws `BoardRunError` as `decodeRun` does. */
export function runBoard(code: string): BoardId {
  return readRun(code)[1] as BoardId;
}

/** Replay a run code into a state. Throws `BoardRunError` if it cannot be read, is from an older version, or was made on another board or model. */
export function decodeRun(model: BoardModel, code: string): BoardState {
  const [, board, hash, gameNumber, start, reached, dict, log] = readRun(code);
  if (board !== model.game.board) throw new BoardRunError(`The run code is for another board (${String(board)})`);
  if (hash !== hash8(model.meta.hash)) throw new BoardRunError("The run code was made with a different version of the board");
  if ((typeof gameNumber !== "number" && typeof gameNumber !== "string") || typeof start !== "string" || typeof log !== "string"
    || typeof reached !== "number" || !Number.isInteger(reached) || reached < 0 || reached > model.game.steps
    || !Array.isArray(dict) || !dict.every((d) => typeof d === "string")) throw new BoardRunError("The run code could not be read");
  const entries = decodeLog(log, dict as string[]);
  try {
    return replay(model, gameNumber, start, entries, reached);
  } catch (e) {
    throw new BoardRunError(`The run code does not replay: ${(e as Error).message}`);
  }
}
