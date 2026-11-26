// Dev page for the paper map: `npx vite`, then open /src/map/demo.html.
// Exposes window.__demo for the screenshot script.
import { analyseBelow, placeItems } from "../engine/place-analysis";
import { loadGeo, loadPlace } from "./geo";
import { PaperMap } from "./PaperMap";
import type { LensSpec, PlaceData, Stitch } from "./types";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const status = $("#status");

const t0 = performance.now();
const geo = await loadGeo("/data/");
const tLoad = performance.now();
const map = new PaperMap($("#stage"), { geo, lang: "en", ariaLabel: "Paper relief model of Wales" });
status.textContent = `data ${(tLoad - t0).toFixed(0)} ms; relief ${map.stats.prepareMs.toFixed(0)} ms; first render ${map.stats.firstRenderMs.toFixed(0)} ms`;

let lang: "en" | "cy" = "en";
let place: PlaceData | null = null;
const stitches: Stitch[] = [];
let selected: string | null = null;
let selectedTip: string | null = null;
const tokens: string[] = [];

map.on("select", (code) => { selected = code; map.setSelected(code); });
map.on("hover", (code, info) => { if (code && info) status.textContent = `${info.name}${info.value != null ? `: ${info.value}` : ""}`; });

// lenses from the mockup's approximate figures (dev only)
const speakers = Object.fromEntries(geo.las.map((l) => [l.code, l.approx?.["welsh_speakers_pct"] ?? null]));
const vals = Object.values(speakers).filter((v): v is number => v != null);
const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
const LENSES: Record<string, LensSpec | null> = {
  none: null,
  seq: { values: speakers, domain: [Math.min(...vals), Math.max(...vals)], ramp: "sequential", higherIsBetter: null },
  div: { values: speakers, domain: [Math.min(...vals), Math.max(...vals)], ramp: "diverging", higherIsBetter: true, centre: mean },
};
function setLens(id: string): void {
  map.setLens(LENSES[id] ?? null);
  document.querySelectorAll<HTMLButtonElement>("[data-lens]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lens === id)));
  if (id !== "none") status.textContent = `lens recolour ${map.stats.lastLensMs.toFixed(1)} ms`;
}
document.querySelectorAll<HTMLButtonElement>("[data-lens]").forEach((b) => b.addEventListener("click", () => setLens(b.dataset.lens!)));

let regionOn = false;
$("[data-region]").addEventListener("click", (e) => {
  regionOn = !regionOn;
  const r = geo.regions.find((g) => g.id === (e.currentTarget as HTMLElement).dataset.region);
  map.setHighlight(regionOn && r ? r.authorities : []);
  (e.currentTarget as HTMLElement).setAttribute("aria-pressed", String(regionOn));
});
$("#stitch").addEventListener("click", () => {
  if (!selected) return;
  stitches.push({ id: `s${stitches.length}`, at: { la: selected }, kind: "made-safe" });
  map.setStitches(stitches);
});
$("#lang").addEventListener("click", (e) => {
  lang = lang === "en" ? "cy" : "en";
  map.setLang(lang);
  (e.currentTarget as HTMLElement).textContent = lang === "en" ? "CY" : "EN";
});

// fetch and warm the place in the background, so the fold starts at once
const placeReady = loadPlace("rhondda").then((p) => { place ??= p; setTimeout(() => map.warmPlace(p), 50); return p; });

async function enter(): Promise<void> {
  place ??= await placeReady;
  const items = placeItems(place);
  map.place.setSelectable(items.map((i) => ({ id: i.id, x: i.x, y: i.y, rings: i.rings, tag: String(i.n), name: i.name ?? undefined })));
  const t = performance.now();
  await map.enterPlace(place, { focusLa: "W06000016", ariaLabel: "Paper relief model of the Rhondda valleys" });
  status.textContent = `place prepare ${map.stats.placePrepareMs.toFixed(0)} ms; sheet ${map.stats.placeSheetMs.toFixed(0)} ms; fold ${(performance.now() - t).toFixed(0)} ms`;
}
function pickTip(id: string | null): void {
  selectedTip = id === selectedTip ? null : id;
  map.place.setSelected(selectedTip ? [selectedTip] : []);
  if (!selectedTip || !place) { map.place.setBelowZone(null); return; }
  const t = performance.now();
  const B = analyseBelow(place, selectedTip, { distanceM: 1000, minDropM: 10 });
  map.place.setBelowZone(B.belowMask);
  status.textContent = `${selectedTip}: ${B.residentialHa} ha homes land below, ${B.buildings} buildings, schools ${B.schools.length}, flood zone ${B.floodZone || "none"}, WIMD ${B.wimdRank ?? "n/a"} (${(performance.now() - t).toFixed(1)} ms)`;
}
map.on("placeItem", (id) => pickTip(id));
$("#enter").addEventListener("click", () => void enter());
$("#exit").addEventListener("click", () => void map.exitPlace());
$("#zin").addEventListener("click", () => map.zoomIn());
$("#zout").addEventListener("click", () => map.zoomOut());

function stitchTip(id: string): void {
  const i = tokens.indexOf(id);
  if (i >= 0) tokens.splice(i, 1); else tokens.push(id);
  map.place.setTokens(tokens);
}

// national markers: the tip clusters from the mockup, as warnings and mounds
map.setMarkers([
  { id: "w1", kind: "warning", x: 132.4, y: 207.4, size: 7 / 6 },
  { id: "w2", kind: "warning", x: 137.4, y: 196.4, size: 6.2 / 6 },
  { id: "w3", kind: "warning", x: 148.4, y: 191.8, size: 5.6 / 6 },
  ...[[129.6, 206.2, 1], [133.6, 211.2, 0.9], [131.0, 203.6, 0.75], [135.6, 207.2, 0.7], [135.4, 192.2, 1], [139.6, 197.6, 0.95], [136.4, 199.8, 0.7], [147.0, 188.8, 0.9], [150.8, 194.0, 1], [146.6, 194.8, 0.7]]
    .map(([x, y, z], i) => ({ id: `t${i}`, kind: "tip", x: x!, y: y!, size: z })),
]);

Object.assign(window, {
  __map: map,
  __demo: {
    setLens, enter, pickTip, stitchTip,
    exit: () => map.exitPlace(),
    select: (code: string | null) => { selected = code; map.setSelected(code); },
    stitch: (code: string, kind: Stitch["kind"] = "made-safe") => { stitches.push({ id: `s${stitches.length}`, at: { la: code }, kind }); map.setStitches(stitches); },
    highlight: (codes: string[]) => map.setHighlight(codes),
    items: () => (place ? placeItems(place) : []),
    ready: () => placeReady.then(() => new Promise((r) => setTimeout(r, 100))),
    lang: (l: "en" | "cy") => map.setLang(l),
  },
});
