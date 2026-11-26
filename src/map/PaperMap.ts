// PaperMap: the paper relief map of Wales, framework free. See README.md.
import { foldDown, foldUp } from "./fold";
import { LaIndex } from "./hit";
import { NationalSheet } from "./national";
import { readPalette, type Palette } from "./palette";
import { PlaceSheet } from "./place";
import { prepareNationalRelief, type NationalRelief } from "./relief";
import type {
  BelowMask, HoverInfo, LaCode, Lang, Layers, LensSpec, MapEvents, MapStats, Marker, Padding, PaperMapOptions,
  PlaceData, PlaceSelectable, Pt, Ring, Stitch, WalesGeo,
} from "./types";

const DEFAULT_LAYERS: Layers = { rail: true, towns: true, sites: true, peaks: true, labels: true, markers: true, stitches: true };
const DEFAULT_PADDING: Padding = { top: 12, right: 10, bottom: 12, left: 12 };

type Listeners = { [K in keyof MapEvents]: Set<MapEvents[K]> };

/** The place view controls, available as `map.place`. State set before enterPlace is kept and applied on entry. */
export interface PlaceControls {
  setSelectable(items: PlaceSelectable[]): void;
  setSelected(ids: string[]): void;
  setTokens(ids: string[]): void;
  /** A BelowMask from analyseBelow, polygon rings in km, or null to clear. */
  setBelowZone(zone: BelowMask | Ring[] | null): void;
  zoomIn(): void;
  zoomOut(): void;
  resetZoom(): void;
  /** Zooms to a km point at a zoom factor (1 = fitted). */
  zoomTo(x: number, y: number, zoom: number): void;
  /** Pans (and zooms in if at the fit) to bring an item into view. */
  focusItem(id: string): void;
  /** Host px of an item's tag, for popovers; null when not drawn. */
  anchorOf(id: string): Pt | null;
  readonly zoom: number;
}

export class PaperMap {
  readonly root: HTMLDivElement;
  readonly index: LaIndex;
  readonly place: PlaceControls;
  readonly stats: MapStats = { prepareMs: 0, firstRenderMs: 0, lastLensMs: 0, lastFrameMs: 0, placePrepareMs: 0, placeSheetMs: 0 };

  private readonly geo: WalesGeo;
  private readonly natCanvas: HTMLCanvasElement;
  private readonly placeCanvas: HTMLCanvasElement;
  private readonly relief: NationalRelief;
  private readonly nat: NationalSheet;
  private pal: Palette;
  private paletteOverrides: Partial<Palette>;
  private lang: Lang;
  private padding: Padding;
  private reducedOpt: boolean | undefined;
  private maxDpr: number;
  private sheet: PlaceSheet | null = null;
  private warm: PlaceSheet | null = null;
  private mode: "national" | "place" | "folding" = "national";
  private creaseOrigin: Pt = [0, 0];
  private listeners: Listeners = { hover: new Set(), select: new Set(), placeItem: new Set(), placeHover: new Set(), view: new Set() };
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private sheetTimer = 0;
  private zoomAnim = 0;
  private destroyed = false;
  private size = { W: 0, H: 0, dpr: 1 };
  private placeState: { selectable: PlaceSelectable[]; selected: string[]; tokens: string[]; below: BelowMask | Ring[] | null } = { selectable: [], selected: [], tokens: [], below: null };
  private ptr: { id: number; x: number; y: number; moved: boolean; ox: number; oy: number } | null = null;
  private pinch = new Map<number, { x: number; y: number }>();
  private pinchStart: { d: number; s: number; mid: Pt; at: Pt } | null = null;

  constructor(host: HTMLElement, opts: PaperMapOptions) {
    const t0 = performance.now();
    this.geo = opts.geo;
    this.lang = opts.lang ?? "en";
    this.padding = { ...DEFAULT_PADDING, ...opts.padding };
    this.reducedOpt = opts.reducedMotion;
    this.maxDpr = opts.maxDpr ?? 2;
    this.paletteOverrides = opts.palette ?? {};

    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    this.root = document.createElement("div");
    this.root.className = "paper-map";
    Object.assign(this.root.style, { position: "absolute", inset: "0", overflow: "hidden", perspective: "1800px", touchAction: "none", userSelect: "none" });
    const mk = (cls: string) => {
      const c = document.createElement("canvas");
      c.className = cls;
      Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
      c.setAttribute("role", "img");
      this.root.appendChild(c);
      return c;
    };
    this.natCanvas = mk("paper-map-national");
    this.placeCanvas = mk("paper-map-place");
    this.placeCanvas.style.display = "none";
    if (opts.ariaLabel) this.natCanvas.setAttribute("aria-label", opts.ariaLabel);
    host.appendChild(this.root);

    this.pal = readPalette(host, this.paletteOverrides);
    this.relief = prepareNationalRelief(this.geo);
    this.index = new LaIndex(this.geo.las);
    this.nat = new NationalSheet(this.geo, this.relief, this.index, this.pal, { ...DEFAULT_LAYERS, ...opts.layers });
    this.nat.lang = this.lang;
    this.stats.prepareMs = performance.now() - t0;

    this.place = this.placeControls();
    this.bindPointer();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.root);
    }
    this.watchFonts();
    this.measure();
    this.renderNow();
    this.stats.firstRenderMs = performance.now() - t0;
    // build the neutral relief a lens recolours, once the first frame is up
    this.idle(() => this.nat.warmLens());
  }

  private idle(fn: () => void): void {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const run = () => { if (!this.destroyed) fn(); };
    if (ric) ric(run, { timeout: 1500 }); else setTimeout(run, 200);
  }

  // ---------------------------------------------------------------- events

  on<K extends keyof MapEvents>(name: K, fn: MapEvents[K]): () => void {
    (this.listeners[name] as Set<MapEvents[K]>).add(fn);
    return () => this.off(name, fn);
  }
  off<K extends keyof MapEvents>(name: K, fn: MapEvents[K]): void { (this.listeners[name] as Set<MapEvents[K]>).delete(fn); }
  private emit<K extends keyof MapEvents>(name: K, ...args: Parameters<MapEvents[K]>): void {
    for (const fn of this.listeners[name]) (fn as (...a: Parameters<MapEvents[K]>) => void)(...args);
  }

  // ---------------------------------------------------------------- national API

  get view(): "national" | "place" | "folding" { return this.mode; }
  /** Authority codes in keyboard reading order (north to south, west to east). */
  get laOrder(): LaCode[] { return this.index.order; }
  /** The nearest authority in a direction, for arrow-key navigation. */
  neighbour(code: LaCode, dir: "up" | "down" | "left" | "right"): LaCode | null { return this.index.neighbour(code, dir); }

  setLang(lang: Lang): void {
    if (lang === this.lang) return;
    this.lang = lang;
    this.nat.lang = lang;
    this.nat.invalidate("labels");
    if (this.sheet) { this.sheet.lang = lang; this.sheet.invalidate(); }
    this.requestRender();
  }

  setLens(lens: LensSpec | null): void {
    this.nat.lens = lens;
    this.nat.invalidate("lens");
    // recolour now so the cost is measurable and the next frame is a blit
    if (lens && this.mode === "national") { this.renderNow(); this.stats.lastLensMs = this.nat.lastLensMs; }
    else this.requestRender();
  }

  setSelected(code: LaCode | null): void {
    if (this.nat.selected === code) return;
    this.nat.selected = code;
    this.requestRender();
  }

  setHighlight(codes: LaCode[]): void {
    this.nat.highlight = new Set(codes);
    this.requestRender();
  }

  setStitches(stitches: Stitch[]): void { this.nat.stitches = stitches.slice(); this.requestRender(); }
  setMarkers(markers: Marker[]): void { this.nat.markers = markers.slice(); this.requestRender(); }

  setLayers(layers: Partial<Layers>): void {
    this.nat.layers = { ...this.nat.layers, ...layers };
    this.nat.invalidate("labels");
    this.requestRender();
  }

  /** A red thread from an authority to a point in host px (for example a panel's edge); null removes it. */
  setThread(thread: { la: LaCode; to: Pt } | null): void { this.nat.thread = thread; this.requestRender(); }

  setPadding(p: Partial<Padding>): void { this.padding = { ...this.padding, ...p }; this.resize(true); }

  setAriaLabel(national: string, place?: string): void {
    this.natCanvas.setAttribute("aria-label", national);
    if (place) this.placeCanvas.setAttribute("aria-label", place);
  }

  /** Keyboard focus: lifts the authority as if hovered and emits hover with source "keyboard". */
  focusLa(code: LaCode | null): void {
    this.nat.hover = code;
    this.requestRender();
    this.emit("hover", code, code ? this.hoverInfo(code, null, "keyboard") : null);
  }

  /** Host px of an authority's anchor (its label point, lifted when selected). */
  anchorOf(code: LaCode): Pt | null { return this.nat.anchorOf(code); }
  /** km frame to host px in the current view. */
  project(x: number, y: number): Pt { return this.mode === "place" && this.sheet ? this.sheet.project(x, y) : this.nat.project(x, y); }
  unproject(px: number, py: number): Pt { return this.mode === "place" && this.sheet ? this.sheet.unproject(px, py) : this.nat.unproject(px, py); }

  /** Re-reads the CSS custom properties (after a theme change) and redraws. */
  refreshPalette(): void {
    this.pal = readPalette(this.root.parentElement, this.paletteOverrides);
    this.nat.pal = this.pal;
    this.nat.invalidate("all");
    if (this.sheet) { this.sheet.pal = this.pal; this.sheet.invalidate(); }
    if (this.warm !== this.sheet) this.warm = null;
    this.requestRender();
  }

  zoomIn(): void { this.place.zoomIn(); }
  zoomOut(): void { this.place.zoomOut(); }

  // ---------------------------------------------------------------- place

  /** Builds a place's relief and sheet without showing it, so a later enterPlace folds at once. */
  warmPlace(place: PlaceData): void {
    if (this.warm?.place === place && this.warm.pal === this.pal) return;
    const t0 = performance.now();
    const sheet = new PlaceSheet(place, this.pal);
    sheet.lang = this.lang;
    sheet.fontsVersion = this.nat.fontsVersion;
    const { W, H, dpr } = this.size;
    sheet.fit(W, H, dpr, this.padding);
    this.stats.placePrepareMs = performance.now() - t0;
    sheet.selectable = this.placeState.selectable;
    sheet.renderSheet();
    this.stats.placeSheetMs = sheet.lastSheetMs;
    this.warm = sheet;
  }

  /** Folds the national sheet down into an authored place. Resolves when the place view has settled. */
  async enterPlace(place: PlaceData, opts: { focusLa?: LaCode; ariaLabel?: string } = {}): Promise<void> {
    if (this.mode !== "national") throw new Error("enterPlace: not on the national view");
    this.warmPlace(place);
    const sheet = this.warm!;
    const { W, H } = this.size;
    if (sheet.lang !== this.lang || sheet.fontsVersion !== this.nat.fontsVersion) { sheet.lang = this.lang; sheet.fontsVersion = this.nat.fontsVersion; sheet.invalidate(); }
    this.sheet = sheet;
    this.applyPlaceState();
    if (opts.ariaLabel) this.placeCanvas.setAttribute("aria-label", opts.ariaLabel);

    const b = place.bbox;
    this.creaseOrigin = (opts.focusLa && this.nat.anchorOf(opts.focusLa)) || this.nat.project((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
    this.nat.hover = null;
    this.drawNational();
    this.mode = "folding";
    this.emit("view", "folding");
    this.placeCanvas.style.display = "block";
    this.drawPlace();
    const fold = foldDown(this.root, this.natCanvas, this.placeCanvas, W, H, this.creaseOrigin, this.reduced());
    this.natCanvas.style.visibility = "hidden";
    await fold;
    if (this.destroyed) return;
    this.natCanvas.style.display = "none";
    this.natCanvas.style.visibility = "";
    this.mode = "place";
    this.emit("view", "place");
    this.requestRender();
  }

  /** Folds back up to the national sheet. */
  async exitPlace(): Promise<void> {
    if (this.mode !== "place") return;
    cancelAnimationFrame(this.zoomAnim);
    this.mode = "folding";
    this.emit("view", "folding");
    this.natCanvas.style.display = "block";
    this.drawNational();
    const { W, H } = this.size;
    await foldUp(this.root, this.natCanvas, this.placeCanvas, W, H, this.creaseOrigin, this.reduced());
    if (this.destroyed) return;
    this.placeCanvas.style.display = "none";
    const { W: w2, H: h2, dpr: d2 } = this.size;
    this.sheet?.fit(w2, h2, d2, this.padding);
    this.sheet = null;
    this.idle(() => { if (this.mode === "national" && this.warm && !this.warm.sheetFresh()) this.warm.renderSheet(); });
    this.mode = "national";
    this.emit("view", "national");
    this.requestRender();
  }

  private applyPlaceState(): void {
    const s = this.sheet;
    if (!s) return;
    s.selectable = this.placeState.selectable;
    s.selected = new Set(this.placeState.selected);
    s.tokens = new Set(this.placeState.tokens);
    s.below = this.placeState.below;
  }

  private placeControls(): PlaceControls {
    const self = this;
    const st = this.placeState;
    const sync = () => { self.applyPlaceState(); self.requestRender(); };
    const zoomBy = (f: number, at?: Pt) => {
      const s = self.sheet;
      if (!s || self.mode !== "place") return;
      const c = at ?? s.centreKm();
      self.animateZoom(c, s.view.s * f);
    };
    return {
      setSelectable(items) { st.selectable = items.slice(); sync(); },
      setSelected(ids) { st.selected = ids.slice(); sync(); },
      setTokens(ids) { st.tokens = ids.slice(); sync(); },
      setBelowZone(zone) { st.below = zone; sync(); },
      zoomIn() {
        const s = self.sheet;
        if (!s) return;
        const sel = st.selectable.find((i) => st.selected.includes(i.id));
        zoomBy(1.8, s.zoom < 1.05 && sel ? [sel.x, sel.y] : undefined);
      },
      zoomOut() { zoomBy(1 / 1.8); },
      resetZoom() { const s = self.sheet; if (s) self.animateZoom(s.centreKm(), s.s0); },
      zoomTo(x, y, zoom) { const s = self.sheet; if (s) self.animateZoom([x, y], s.s0 * zoom, true); },
      focusItem(id) {
        const s = self.sheet, it = st.selectable.find((i) => i.id === id);
        if (!s || !it) return;
        self.animateZoom([it.x, it.y], Math.max(s.view.s, s.s0 * 2.6), true);
      },
      anchorOf(id) { return self.sheet?.tagAnchor(id) ?? null; },
      get zoom() { return self.sheet?.zoom ?? 1; },
    };
  }

  /** Eases the place view to scale `s`; with `centre` the km point ends in the middle, otherwise it stays put. */
  private animateZoom(at: Pt, s: number, centre = false): void {
    const sh = this.sheet;
    if (!sh) return;
    cancelAnimationFrame(this.zoomAnim);
    const v = sh.view, s1 = Math.max(sh.s0, Math.min(sh.s0 * 7, s));
    const startS = v.s, startPx = sh.project(at[0], at[1]);
    const endPx: Pt = centre ? [this.padding.left + (v.W - this.padding.left - this.padding.right) / 2, v.H / 2] : startPx;
    const finish = () => { sh.zoomAbout(at, s1, endPx); this.requestRender(); this.scheduleSheet(); };
    if (this.reduced()) { finish(); return; }
    const t0 = performance.now(), D = 280;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / D), e = 1 - (1 - t) ** 3;
      const sc = startS * (s1 / startS) ** e;
      sh.zoomAbout(at, sc, [startPx[0] + (endPx[0] - startPx[0]) * e, startPx[1] + (endPx[1] - startPx[1]) * e]);
      this.drawPlace();
      if (t < 1) this.zoomAnim = requestAnimationFrame(step);
      else finish();
    };
    this.zoomAnim = requestAnimationFrame(step);
  }

  private scheduleSheet(): void {
    clearTimeout(this.sheetTimer);
    this.sheetTimer = window.setTimeout(() => {
      const s = this.sheet;
      if (!s || this.destroyed || s.sheetFresh()) return;
      s.renderSheet();
      this.stats.placeSheetMs = s.lastSheetMs;
      this.requestRender();
    }, 140);
  }

  // ---------------------------------------------------------------- size and drawing

  private reduced(): boolean {
    if (this.reducedOpt != null) return this.reducedOpt;
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private measure(): boolean {
    const r = this.root.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    const dpr = Math.min(this.maxDpr, globalThis.devicePixelRatio || 1);
    if (W === this.size.W && H === this.size.H && dpr === this.size.dpr) return false;
    this.size = { W, H, dpr };
    for (const c of [this.natCanvas, this.placeCanvas]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    this.nat.fit(W, H, dpr, this.padding);
    this.nat.invalidate("all");
    if (this.sheet) this.sheet.fit(W, H, dpr, this.padding);
    if (this.warm && this.warm !== this.sheet) this.warm.fit(W, H, dpr, this.padding);
    return true;
  }

  /** Re-measures the host (also called by the ResizeObserver). */
  resize(force = false): void {
    if (this.destroyed) return;
    const changed = this.measure();
    if (force && !changed) {
      this.nat.fit(this.size.W, this.size.H, this.size.dpr, this.padding);
      this.nat.invalidate("all");
      this.sheet?.fit(this.size.W, this.size.H, this.size.dpr, this.padding);
    }
    if (changed || force) this.renderNow();
  }

  private requestRender(): void {
    if (this.raf || this.destroyed) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.renderNow(); });
  }

  private renderNow(): void {
    if (this.destroyed) return;
    const t0 = performance.now();
    if (this.mode === "place") this.drawPlace();
    else if (this.mode === "national") this.drawNational();
    this.stats.lastFrameMs = performance.now() - t0;
  }

  private drawNational(): void {
    const ctx = this.natCanvas.getContext("2d")!;
    this.nat.render(ctx);
  }

  private drawPlace(): void {
    const s = this.sheet;
    if (!s) return;
    const ctx = this.placeCanvas.getContext("2d")!;
    s.render(ctx);
    if (!s.sheetFresh()) this.scheduleSheet();
  }

  private watchFonts(): void {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) return;
    let pending = 0;
    const bump = () => {
      // coalesce bursts of font loads into one redraw
      if (this.destroyed || pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        if (this.destroyed) return;
        this.nat.fontsVersion++;
        this.nat.invalidate("labels");
        if (this.sheet) { this.sheet.fontsVersion = this.nat.fontsVersion; this.sheet.invalidate(); }
        const w = this.warm;
        if (w && w !== this.sheet) this.idle(() => { w.fontsVersion = this.nat.fontsVersion; w.invalidate(); w.renderSheet(); });
        this.requestRender();
      }, 30);
    };
    const fam = (css: string) => css.split(",")[0]!.trim();
    const sans = fam(this.pal.fontSans), serif = fam(this.pal.fontSerif);
    // every face the map draws with, so labels never settle on a fallback
    Promise.all(["400", "500", "600", "700"].map((w) => fonts.load(`${w} 12px ${sans}`)).concat([fonts.load(`italic 400 12px ${serif}`), fonts.load(`400 12px ${serif}`)])).then(bump, () => undefined);
    fonts.addEventListener?.("loadingdone", bump);
    this.unwatchFonts = () => fonts.removeEventListener?.("loadingdone", bump);
  }
  private unwatchFonts: () => void = () => undefined;

  // ---------------------------------------------------------------- pointer

  private local(e: PointerEvent | WheelEvent): Pt {
    const r = this.root.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  private hoverInfo(code: LaCode, px: Pt | null, source: "pointer" | "keyboard"): HoverInfo {
    const e = this.index.byCode.get(code)!;
    const at = px ?? this.nat.anchorOf(code) ?? [0, 0];
    const [x, y] = px ? this.nat.unproject(px[0], px[1]) : e.label;
    return {
      code, en: e.la.en, cy: e.la.cy, name: this.lang === "cy" ? e.la.cy : e.la.en,
      value: this.nat.lens ? (this.nat.lens.values[code] ?? null) : undefined,
      px: at[0], py: at[1], x, y, source,
    };
  }

  private bindPointer(): void {
    const el = this.root;
    const onMove = (e: PointerEvent) => {
      const p = this.local(e);
      if (this.pinch.has(e.pointerId)) {
        this.pinch.set(e.pointerId, { x: p[0], y: p[1] });
        if (this.pinch.size === 2 && this.pinchStart && this.sheet) {
          const [a, b] = [...this.pinch.values()];
          const d = Math.hypot(a!.x - b!.x, a!.y - b!.y), mid: Pt = [(a!.x + b!.x) / 2, (a!.y + b!.y) / 2];
          this.sheet.zoomAbout(this.pinchStart.at, this.pinchStart.s * (d / this.pinchStart.d), mid);
          this.requestRender();
          return;
        }
      }
      if (this.ptr && this.ptr.id === e.pointerId) {
        const dx = p[0] - this.ptr.x, dy = p[1] - this.ptr.y;
        if (!this.ptr.moved && Math.hypot(dx, dy) > 4) this.ptr.moved = true;
        if (this.ptr.moved && this.mode === "place" && this.sheet && this.sheet.zoom > 1.001) {
          this.sheet.view.ox = this.ptr.ox; this.sheet.view.oy = this.ptr.oy;
          this.sheet.pan(dx, dy);
          el.style.cursor = "grabbing";
          this.requestRender();
        }
        return;
      }
      this.updateHover(p);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const p = this.local(e);
      this.pinch.set(e.pointerId, { x: p[0], y: p[1] });
      if (this.pinch.size === 2 && this.sheet && this.mode === "place") {
        const [a, b] = [...this.pinch.values()];
        const mid: Pt = [(a!.x + b!.x) / 2, (a!.y + b!.y) / 2];
        this.pinchStart = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1, s: this.sheet.view.s, mid, at: this.sheet.unproject(mid[0], mid[1]) };
        this.ptr = null;
        return;
      }
      const v = this.sheet?.view;
      this.ptr = { id: e.pointerId, x: p[0], y: p[1], moved: false, ox: v?.ox ?? 0, oy: v?.oy ?? 0 };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    };
    const onUp = (e: PointerEvent) => {
      this.pinch.delete(e.pointerId);
      if (this.pinch.size < 2) this.pinchStart = null;
      const ptr = this.ptr;
      if (!ptr || ptr.id !== e.pointerId) return;
      this.ptr = null;
      el.style.cursor = "";
      const p = this.local(e);
      if (ptr.moved) { this.scheduleSheet(); this.updateHover(p); return; }
      if (this.mode === "national") this.emit("select", this.nat.hit(p[0], p[1]));
      else if (this.mode === "place" && this.sheet) this.emit("placeItem", this.sheet.hit(p[0], p[1]));
    };
    const onLeave = () => {
      if (this.ptr) return;
      if (this.mode === "national" && this.nat.hover) { this.nat.hover = null; this.requestRender(); this.emit("hover", null, null); }
      if (this.mode === "place" && this.sheet?.hover) { this.sheet.hover = null; this.requestRender(); this.emit("placeHover", null, null); }
      el.style.cursor = "";
    };
    const onWheel = (e: WheelEvent) => {
      if (this.mode !== "place" || !this.sheet) return;
      e.preventDefault();
      cancelAnimationFrame(this.zoomAnim);
      const p = this.local(e), s = this.sheet;
      const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018));
      s.zoomAbout(s.unproject(p[0], p[1]), s.view.s * f, p);
      this.requestRender();
      this.scheduleSheet();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    this.unbind = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
    };
  }
  private unbind: () => void = () => undefined;

  private updateHover(p: Pt): void {
    if (this.mode === "national") {
      const code = this.nat.hit(p[0], p[1]);
      this.root.style.cursor = code ? "pointer" : "";
      if (code !== this.nat.hover) {
        this.nat.hover = code;
        this.requestRender();
        this.emit("hover", code, code ? this.hoverInfo(code, p, "pointer") : null);
      }
    } else if (this.mode === "place" && this.sheet) {
      const id = this.sheet.hit(p[0], p[1]);
      this.root.style.cursor = id ? "pointer" : this.sheet.zoom > 1.001 ? "grab" : "";
      if (id !== this.sheet.hover) {
        this.sheet.hover = id;
        this.requestRender();
        this.emit("placeHover", id, id ? { px: p[0], py: p[1] } : null);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.zoomAnim);
    clearTimeout(this.sheetTimer);
    this.ro?.disconnect();
    this.unbind();
    this.unwatchFonts();
    for (const k of Object.keys(this.listeners) as (keyof MapEvents)[]) this.listeners[k].clear();
    this.root.remove();
    this.sheet = this.warm = null;
  }
}
