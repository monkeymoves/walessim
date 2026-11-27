// A finished game's save string for the end-screen screenshot (plain-wales, agent B).
// Usage: npx tsx design/scripts/plain-b-saves.ts > saves.json
import * as E from "../../src/engine/api";
import { playBot, averageBot } from "../../src/engine/bots";
import { compileFromDisk } from "../../scripts/model-files";
const m = compileFromDisk().model!;
const g = playBot(m, averageBot, 17, { runs: 40, caretakerGhost: true });
process.stdout.write(JSON.stringify({ ended: E.saveGame(g) }));
