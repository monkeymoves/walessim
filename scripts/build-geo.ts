// Builds the map data the paper relief renderer reads at runtime.
//
//   npx tsx scripts/build-geo.ts
//
// 1. design/mockups/data/wales.js (window.WALES) -> public/data/wales-geo.json
//    Same content, with the elevation grid packed as base64 little-endian Int16,
//    the four regions from model/regions.yaml, and the geographic labels and
//    label offsets the Papur v2 mockup placed by hand.
// 2. copyPlaces: model/data/places/*.json -> public/data/places/. While no
//    authored Rhondda file exists there yet, design/mockups/data/rhondda.js is
//    converted to public/data/places/rhondda.json for development.
// 3. model/data/wales-rail.json -> public/data/wales-rail.json when present.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...parts: string[]) => join(ROOT, ...parts);

/** Reads a mockup data file of the form `window.NAME = {...};` as JSON. */
export function readWindowJs(file: string): any {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`No object literal in ${file}`);
  return JSON.parse(src.slice(start, end + 1));
}

/** Packs a grid of integer rows into base64 little-endian Int16. */
export function packInt16(rows: number[][]): string {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const buf = Buffer.alloc(w * h * 2);
  for (let y = 0; y < h; y++) {
    const row = rows[y]!;
    if (row.length !== w) throw new Error(`Ragged elevation row ${y}`);
    for (let x = 0; x < w; x++) {
      const v = Math.round(row[x]!);
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, v)), (y * w + x) * 2);
    }
  }
  return buf.toString("base64");
}

// Hand placed in the mockup: label offsets in CSS pixels [dx, dy, anchor].
const TOWN_LBL: Record<string, [number, number, "start" | "middle" | "end"]> = {
  Cardiff: [8, 13, "start"], Swansea: [-8, -3, "end"], Newport: [8, 4, "start"], Wrexham: [7, 4, "start"],
  Bangor: [-6, -6, "end"], "St Davids": [-2, 14, "start"], "Merthyr Tydfil": [-8, -7, "end"], Aberystwyth: [-7, 4, "end"],
  Carmarthen: [0, -9, "middle"], "Llandrindod Wells": [7, 4, "start"], Holyhead: [-7, 4, "end"], "Pembroke Dock": [0, 14, "middle"],
  Rhyl: [0, -8, "middle"], Bridgend: [-6, 12, "end"], "Blaenau Ffestiniog": [7, 4, "start"], "Port Talbot": [-3, 14, "end"],
  Tonypandy: [-8, 8, "end"], "Ebbw Vale": [5, -8, "start"], Newtown: [7, 4, "start"], Caernarfon: [-7, 4, "end"],
  Llanelli: [-6, -5, "end"], Brecon: [7, 2, "start"], Dolgellau: [7, 1, "start"], Bethesda: [7, 2, "start"], Machynlleth: [7, 4, "start"],
};
const SITE_HEAD: Record<string, [number, number]> = {
  "Blaenavon industrial landscape": [9, -9], "Big Pit": [10, 6], "Penrhyn slate quarry": [10, 8], "Dinorwig power station": [-10, 3],
  "Hafod-Morfa copperworks": [3, -11], "Port Talbot steelworks": [9, 6], "Parys Mountain copper mine": [0, -11],
  "Pontcysyllte Aqueduct": [-9, 6], "Gwynt y Môr wind farm": [0, 9], "Llyn Celyn (Tryweryn)": [7, 9],
};
const PEAK_LBL: Record<string, [number, number, "start" | "middle" | "end"]> = {
  Snowdon: [7, 10, "start"], "Pen y Fan": [-7, 9, "end"], "Cadair Idris": [-7, 8, "end"], Plynlimon: [7, 5, "start"],
};
// Geographic names drawn on the sheet (km frame), from the mockup.
const LABELS = [
  { kind: "upland", en: "Eryri", cy: "Eryri", x: 103, y: 70 },
  { kind: "upland", en: "Cambrian Mountains", cy: "Mynyddoedd Cambria", x: 122, y: 131 },
  { kind: "upland", en: "Bannau Brycheiniog", cy: "Bannau Brycheiniog", x: 110, y: 170 },
  { kind: "sea", en: "Irish Sea", cy: "Môr Iwerddon", x: 14, y: 34 },
  { kind: "sea", en: "Cardigan Bay", cy: "Bae Ceredigion", x: 52, y: 110 },
  { kind: "sea", en: "Bristol Channel", cy: "Môr Hafren", x: 104, y: 232 },
  { kind: "beyond", en: "England", cy: "Lloegr", x: 187, y: 95 },
];

export function buildGeo(): void {
  const W = readWindowJs(p("design/mockups/data/wales.js"));
  const regionsDoc = yaml.load(readFileSync(p("model/regions.yaml"), "utf8")) as {
    regions: { id: string; name: { en: string; cy: string }; authorities: string[] }[];
  };
  const out = {
    _note: W._note,
    width: W.width,
    height: W.height,
    cellKm: W.cellKm,
    elevation: {
      legend: W.elevation.legend,
      encoding: "int16le-base64",
      width: W.width,
      height: W.height,
      data: packInt16(W.elevation.rows),
    },
    las: W.las,
    regions: regionsDoc.regions.map((r) => ({ id: r.id, name: r.name, authorities: r.authorities })),
    towns: W.towns.map((t: any) => ({ ...t, label: TOWN_LBL[t.en] ?? [7, 4, "start"] })),
    sites: W.sites.map((s: any) => ({ ...s, head: SITE_HEAD[s.en] ?? [0, -10] })),
    peaks: W.peaks.map((k: any) => ({ ...k, label: PEAK_LBL[k.en] ?? [7, 4, "start"] })),
    labels: LABELS,
  };
  const codes = new Set(W.las.map((l: any) => l.code));
  for (const r of out.regions) for (const c of r.authorities) if (!codes.has(c)) throw new Error(`Region ${r.id} names unknown authority ${c}`);
  mkdirSync(p("public/data"), { recursive: true });
  const json = JSON.stringify(out);
  writeFileSync(p("public/data/wales-geo.json"), json);
  console.log(`wrote public/data/wales-geo.json (${(json.length / 1024).toFixed(0)} KB)`);
}

export function copyPlaces(): void {
  const src = p("model/data/places");
  const dst = p("public/data/places");
  mkdirSync(dst, { recursive: true });
  const files = existsSync(src) ? readdirSync(src).filter((f) => f.endsWith(".json")) : [];
  for (const f of files) {
    copyFileSync(join(src, f), join(dst, f));
    console.log(`copied model/data/places/${f}`);
  }
  if (!files.includes("rhondda.json")) {
    // Development stand in until the authored place file lands.
    const R = readWindowJs(p("design/mockups/data/rhondda.js"));
    const place = { id: "rhondda", name: { en: "Rhondda", cy: "Y Rhondda" }, la: "W06000016", ...R };
    writeFileSync(join(dst, "rhondda.json"), JSON.stringify(place));
    console.log("converted design/mockups/data/rhondda.js -> public/data/places/rhondda.json (development stand in)");
  }
  const rail = p("model/data/wales-rail.json");
  if (existsSync(rail)) {
    copyFileSync(rail, p("public/data/wales-rail.json"));
    console.log("copied model/data/wales-rail.json");
  } else {
    console.log("no model/data/wales-rail.json yet; national rail layer stays empty");
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  buildGeo();
  copyPlaces();
}
