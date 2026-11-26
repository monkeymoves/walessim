/**
 * `npm run model:build`: validate everything under model/ and write public/model.json.
 * Also copies the place data and rail file into public/data/ when the map agent has not
 * (never overwrites). Fails (exit 1) on structural errors; prints warnings for missing optional data.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileFromDisk, ROOT } from "./model-files";

const result = compileFromDisk();
for (const w of result.warnings) console.warn("warning:", w);
if (!result.model) {
  for (const e of result.errors) console.error("error:", e);
  console.error(`model:build failed with ${result.errors.length} error(s)`);
  process.exit(1);
}
const model = result.model;
const pub = join(ROOT, "public");
mkdirSync(join(pub, "data", "places"), { recursive: true });
writeFileSync(join(pub, "model.json"), JSON.stringify(model));

const copyIfAbsent = (from: string, to: string) => {
  if (existsSync(from) && !existsSync(to)) {
    copyFileSync(from, to);
    console.log("copied", to.replace(ROOT + "/", ""));
  }
};
const placesDir = join(ROOT, "model", "data", "places");
if (existsSync(placesDir)) for (const f of readdirSync(placesDir).filter((f) => f.endsWith(".json"))) copyIfAbsent(join(placesDir, f), join(pub, "data", "places", f));
copyIfAbsent(join(ROOT, "model", "data", "wales-rail.json"), join(pub, "data", "wales-rail.json"));
copyIfAbsent(join(ROOT, "model", "data", "wales-geo.json"), join(pub, "data", "wales-geo.json"));

console.log(
  `model.json written: ${model.rules.length} rules, ${model.cards.length} cards, ${model.curveballs.length} curveballs, ` +
    `${model.places.length} places, ${model.voices.length} voices, ${model.letters.length} letters; hash ${model.meta.hash}; ` +
    `${model.meta.cy_review.length} Welsh strings awaiting review` +
    (model.meta.missing.length ? `; missing: ${model.meta.missing.join(", ")}` : ""),
);
