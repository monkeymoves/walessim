// Public types of the paper map module. See src/map/README.md.
import type { Palette } from "./palette";
import type { BelowMask, PlaceData, Pt, Ring } from "../engine/place-analysis";

export type { PlaceData, BelowMask, Pt, Ring };
export type LaCode = string;
export type Lang = "en" | "cy";
export interface Bilingual { en: string; cy: string }

export interface LocalAuthority {
  code: LaCode;
  en: string;
  cy: string;
  /** Polygon rings in the km frame; islands and holes combine even-odd. */
  rings: Ring[];
  approx?: Record<string, number>;
}
export interface Region { id: string; name: Bilingual; authorities: LaCode[] }
export type LabelAnchor = "start" | "middle" | "end";
export interface Town { en: string; cy: string; x: number; y: number; kind: "city" | "town" | string; label?: [number, number, LabelAnchor] }
export interface Site { en: string; cy: string; x: number; y: number; kind: string; head?: [number, number] }
export interface Peak { en: string; cy: string; x: number; y: number; kind?: string; label?: [number, number, LabelAnchor] }
export interface GeoLabel { en: string; cy: string; x: number; y: number; kind: "upland" | "sea" | "beyond" | string }

/** National geography, decoded from public/data/wales-geo.json by decodeGeo(). */
export interface WalesGeo {
  note?: string;
  width: number;
  height: number;
  cellKm: number;
  /** Metres, row-major north to south; -1 sea, -2 land outside Wales. */
  elevation: Int16Array;
  las: LocalAuthority[];
  regions: Region[];
  towns: Town[];
  sites: Site[];
  peaks: Peak[];
  labels: GeoLabel[];
  rail?: NationalRail | null;
}

export interface NationalRail {
  lines: { kind?: string; name?: string | null; pts: Pt[] }[];
  stations: { name?: string | null; cy?: string | null; x: number; y: number }[];
}

export interface LensSpec {
  values: Record<LaCode, number | null | undefined>;
  domain: [number, number];
  ramp: "sequential" | "diverging";
  /** true: high is good, false: low is good, null: no better direction (neutral hues). */
  higherIsBetter: boolean | null;
  /** Diverging centre (for example the Wales value). Defaults to the middle of the domain. */
  centre?: number;
}

export type StitchKind = "made-safe" | "planted" | "built" | "generic";
export interface Stitch { id: string; at: { la: LaCode } | { x: number; y: number }; kind: StitchKind; label?: string }

export type MarkerKind = "tip" | "warning" | "site" | "town" | "pin" | "stamp";
export interface Marker {
  id: string;
  x: number;
  y: number;
  kind: MarkerKind | string;
  label?: string;
  /** Size multiplier (tip mounds, warning circles in km radius). */
  size?: number;
  /** Site glyph when kind is "site": coal, slate, copper, steel, energy, heritage, water. */
  glyph?: string;
}

export interface Layers {
  rail: boolean;
  towns: boolean;
  sites: boolean;
  peaks: boolean;
  /** Upland, sea and England names. */
  labels: boolean;
  markers: boolean;
  stitches: boolean;
}

export interface Padding { top: number; right: number; bottom: number; left: number }

export interface PaperMapOptions {
  geo: WalesGeo;
  lang?: Lang;
  /** Overrides on top of the CSS custom properties. */
  palette?: Partial<Palette>;
  /** Forces reduced motion on or off; by default follows prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Space kept clear of the map, in CSS px (for panels drawn over it). */
  padding?: Partial<Padding>;
  layers?: Partial<Layers>;
  /** Accessible name for the canvas (role img). */
  ariaLabel?: string;
  /** Caps the device pixel ratio (default 2). */
  maxDpr?: number;
}

export interface HoverInfo {
  code: LaCode;
  name: string;
  en: string;
  cy: string;
  /** Lens value, when a lens is on. */
  value?: number | null;
  /** Pointer position in CSS px relative to the host, or the authority's label point when from focusLa. */
  px: number;
  py: number;
  /** km frame position. */
  x: number;
  y: number;
  source: "pointer" | "keyboard";
}

/** An item the player may pick in a place view (a tip in the Rhondda). */
export interface PlaceSelectable {
  id: string;
  x: number;
  y: number;
  rings?: Ring[];
  /** The tag text, for example the tip number. */
  tag?: string;
  /** Tooltip and accessible name. */
  name?: string;
  kind?: "tip" | string;
}

export interface MapEvents {
  hover: (code: LaCode | null, info: HoverInfo | null) => void;
  select: (code: LaCode | null) => void;
  placeItem: (id: string | null) => void;
  placeHover: (id: string | null, info: { px: number; py: number } | null) => void;
  view: (view: "national" | "place" | "folding") => void;
}

export interface MapStats {
  prepareMs: number;
  firstRenderMs: number;
  lastLensMs: number;
  lastFrameMs: number;
  placePrepareMs: number;
  placeSheetMs: number;
}
