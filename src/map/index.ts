// The paper relief map module. See README.md for the API and the CSS custom properties it reads.
export { PaperMap, type PlaceControls } from "./PaperMap";
export { loadGeo, loadPlace, decodeGeo, normalisePlace, normaliseRail, lonLatToKm } from "./geo";
export { readPalette, DEFAULT_PALETTE, type Palette } from "./palette";
export { lensColour, lensLegend, lensPosition, lensStops } from "./lens";
export * from "./types";
