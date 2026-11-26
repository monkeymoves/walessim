// Colours for the paper map, read from CSS custom properties on the host so
// the design system (docs/design/tokens.css) can theme the map. Every name
// here is documented in src/map/README.md. Fallbacks are the Papur v2 mockup.

export type RGB = [number, number, number];

export interface Palette {
  paper: string;
  paperEdge: string;
  /** Land beyond Wales (England): a plain blank sheet. */
  paperBeyond: string;
  /** The card under a place view, beyond its surveyed block. */
  board: string;
  ink: string;
  ink2: string;
  ink3: string;
  /** Halo behind labels. */
  halo: string;
  /** Deep sea, then five shelves from deep to shallow. */
  sea: string[];
  /** Twelve national relief sheets, lowland to summit. */
  relief: string[];
  /** Place relief stops, lowland to summit (interpolated to the place's levels). */
  reliefPlace: string[];
  /** Neutral relief under a lens: [low, high]. */
  reliefLens: [string, string];
  threadRed: string;
  threadRedDark: string;
  threadRedHi: string;
  threadStitch: string;
  threadStitchDark: string;
  threadStitchHi: string;
  warning: string;
  /** Sequential lens ramp, low to high (5 stops). */
  lensSeq: string[];
  /** Diverging lens ramp, low to high (5 stops, middle is the centre), worst to best when higherIsBetter. */
  lensDiv: string[];
  /** Diverging ramp for indicators with no better direction (5 stops). */
  lensDivNeutral: string[];
  /** Authorities with no value under a lens. */
  lensMissing: string;
  rail: string;
  placeWater: string;
  placeRiver: string;
  placeStream: string;
  placeWood: string;
  placeResidential: string;
  placeFlood: string;
  placeBuilding: string;
  placeBelow: string;
  placeBelowZone: string;
  placeRoad: string;
  /** Bus route threads, assigned to routes longest first. */
  bus: string[];
  fontSans: string;
  fontSerif: string;
}

export const DEFAULT_PALETTE: Palette = {
  paper: "#FAFAF6",
  paperEdge: "#D2D2CA",
  paperBeyond: "#E9E9E3",
  board: "#DDDCD4",
  ink: "#1F2A30",
  ink2: "#4E5B63",
  ink3: "#6B767C",
  halo: "rgba(246,246,240,.88)",
  sea: ["#7D96A0", "#8EA7AF", "#9DB4BA", "#AEC3C6", "#BFD0D0", "#CEDCD8"],
  relief: ["#C3CC9F", "#B3BF8E", "#A3B17F", "#94A373", "#A2A170", "#B39C67", "#A9855A", "#93745C", "#7F6A62", "#7A7672", "#959799", "#B4B6B6"],
  reliefPlace: ["#C3CDA0", "#B5C18F", "#A8B581", "#A3AC77", "#B0A875", "#B8A070", "#B0926B", "#A08872", "#968C84"],
  reliefLens: ["#F8F6EF", "#D6D2C4"],
  threadRed: "#B0262C",
  threadRedDark: "#6E1418",
  threadRedHi: "#FF9696",
  threadStitch: "#2C4E95",
  threadStitchDark: "#14244A",
  threadStitchHi: "#4A6FBF",
  warning: "#C98A2B",
  lensSeq: ["#F4EFDC", "#E8D6A4", "#D5B173", "#BB8A55", "#946543"],
  lensDiv: ["#B4583A", "#DDAA88", "#F2EDE0", "#9BC0BA", "#3F8483"],
  lensDivNeutral: ["#6A7AA0", "#B4BDD3", "#F2EDE0", "#DCC48C", "#B08834"],
  lensMissing: "#D9D8D0",
  rail: "#1F2A30",
  placeWater: "#9DB9C4",
  placeRiver: "#4D7F96",
  placeStream: "rgba(60,105,130,.42)",
  placeWood: "rgba(78,104,66,.26)",
  placeResidential: "rgba(238,234,222,.62)",
  placeFlood: "rgba(150,190,215,.32)",
  placeBuilding: "#FBFAF5",
  placeBelow: "#8E3B12",
  placeBelowZone: "rgba(201,138,43,.30)",
  placeRoad: "#F2EBD8",
  bus: ["#9C3B30", "#B8861E", "#2B3F63", "#7A4E7E", "#2F5B45", "#2D7A7A"],
  fontSans: '"Familjen Grotesk", "Helvetica Neue", Arial, sans-serif',
  fontSerif: '"Newsreader", Georgia, serif',
};

type Key = keyof Palette;
/** CSS custom property names for each single-valued palette key. */
const SINGLE: [Key, string][] = [
  ["paper", "--paper"], ["paperEdge", "--paper-edge"], ["paperBeyond", "--paper-beyond"], ["board", "--board"],
  ["ink", "--ink"], ["ink2", "--ink-2"], ["ink3", "--ink-3"], ["halo", "--map-halo"],
  ["threadRed", "--thread-red"], ["threadRedDark", "--thread-red-dark"], ["threadRedHi", "--thread-red-hi"],
  ["threadStitch", "--thread-stitch"], ["threadStitchDark", "--thread-stitch-dark"], ["threadStitchHi", "--thread-stitch-hi"],
  ["warning", "--map-warning"], ["lensMissing", "--lens-missing"], ["rail", "--map-rail"],
  ["placeWater", "--place-water"], ["placeRiver", "--place-river"], ["placeStream", "--place-stream"], ["placeWood", "--place-wood"],
  ["placeResidential", "--place-residential"], ["placeFlood", "--place-flood"], ["placeBuilding", "--place-building"],
  ["placeBelow", "--place-below"], ["placeBelowZone", "--place-below-zone"], ["placeRoad", "--place-road"],
];
/** Ramps: palette key, CSS prefix, first index. `--sea-0` .. `--sea-5`, `--relief-0` .. `--relief-11`, etc. */
const RAMPS: [Key, string, number][] = [
  ["sea", "--sea-", 0], ["relief", "--relief-", 0], ["reliefPlace", "--relief-place-", 0], ["reliefLens", "--relief-lens-", 0],
  ["lensSeq", "--lens-seq-", 1], ["lensDiv", "--lens-div-", 1], ["lensDivNeutral", "--lens-div-neutral-", 1], ["bus", "--map-bus-", 1],
];

/** Reads the palette from CSS custom properties on `el`, falling back to the mockup colours. */
export function readPalette(el: Element | null, overrides: Partial<Palette> = {}): Palette {
  const pal: Palette = structuredClone(DEFAULT_PALETTE);
  if (el && typeof getComputedStyle === "function") {
    const cs = getComputedStyle(el);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    for (const [k, name] of SINGLE) {
      const val = v(name);
      if (val) (pal as unknown as Record<string, unknown>)[k] = val;
    }
    for (const [k, prefix, first] of RAMPS) {
      const base = pal[k] as string[];
      const out = base.slice();
      for (let i = 0; i < base.length; i++) {
        const val = v(prefix + (i + first));
        if (val) out[i] = val;
      }
      (pal as unknown as Record<string, unknown>)[k] = out;
    }
    const sans = v("--font-sans") || v("--sans");
    const serif = v("--font-serif") || v("--serif");
    if (sans) pal.fontSans = sans;
    if (serif) pal.fontSerif = serif;
  }
  return { ...pal, ...overrides };
}

// ---------------------------------------------------------------------------
// colour parsing and mixing

const PARSED = new Map<string, RGB>();
let probe: CanvasRenderingContext2D | null = null;

/** Parses a CSS colour to sRGB 0-255. Hex and rgb() are parsed directly; anything else via a 1 px canvas. */
export function parseColour(css: string): RGB {
  const hit = PARSED.get(css);
  if (hit) return hit;
  let out: RGB | null = null;
  const s = css.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    out = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  } else {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
    if (m) out = [+m[1]!, +m[2]!, +m[3]!];
  }
  if (!out && typeof document !== "undefined") {
    if (!probe) {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      probe = c.getContext("2d", { willReadFrequently: true });
    }
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000";
      probe.fillStyle = s;
      probe.fillRect(0, 0, 1, 1);
      const d = probe.getImageData(0, 0, 1, 1).data;
      out = [d[0]!, d[1]!, d[2]!];
    }
  }
  out ??= [128, 128, 128];
  PARSED.set(css, out);
  return out;
}

const toLin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB to OKLab. */
export function toOklab([r, g, b]: RGB): RGB {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function fromOklab([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(toSrgb(Math.max(0, Math.min(1, v))))));
  return [c(R), c(G), c(B)];
}

/** Interpolates along a ramp of CSS colours in OKLab, t in [0, 1]. */
export function rampAt(stops: string[], t: number): RGB {
  if (!stops.length) return [128, 128, 128];
  if (stops.length === 1) return parseColour(stops[0]!);
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = toOklab(parseColour(stops[i]!)), b = toOklab(parseColour(stops[i + 1]!));
  return fromOklab([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
}

export const rgbCss = ([r, g, b]: RGB, a = 1) => (a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`);

/** n evenly spaced colours along a ramp. */
export function rampColours(stops: string[], n: number): string[] {
  return Array.from({ length: n }, (_, i) => rgbCss(rampAt(stops, n === 1 ? 0 : i / (n - 1))));
}
