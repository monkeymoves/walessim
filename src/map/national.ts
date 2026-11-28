// The national sheet: sea shelves, the relief of Wales, lens tints, labels,
// and the live layer (hover lift, red thread selection, stitches, markers).
// Expensive layers are cached to offscreen canvases per size; a lens change
// only recolours the authorities over a cached neutral relief.
import { pointInRings, type LaIndex } from "./hit";
import { clearLabels, textBox, type Box } from "./declutter";
import { lensColour } from "./lens";
import { rampColours, rgbCss, type Palette } from "./palette";
import { grainOver, grainTile, haloText, multiPolygonPath, newCanvas, ringsPath, setShadow, sheet, type Ctx, type View } from "./paper";
import type { NationalRelief } from "./relief";
import { house, peak, pinHead, siteDisc, stitchRing, stitchSign, tipMound, warningCircle, withAlpha } from "./glyphs";
import type { LaCode, Lang, Layers, LensSpec, Marker, Padding, Pt, Stitch, WalesGeo } from "./types";

export interface NationalView extends View { W: number; H: number; dpr: number }

interface Cached { key: string; canvas: HTMLCanvasElement }

export class NationalSheet {
  view: NationalView = { W: 1, H: 1, dpr: 1, s: 1, ox: 0, oy: 0 };
  lang: Lang = "en";
  layers: Layers;
  lens: LensSpec | null = null;
  selected: LaCode | null = null;
  hover: LaCode | null = null;
  highlight = new Set<LaCode>();
  stitches: Stitch[] = [];
  markers: Marker[] = [];
  /** A red thread from an authority to a host px point. */
  thread: { la: LaCode; to: Pt } | null = null;
  lastLensMs = 0;

  private base: Cached | null = null;
  private landNatural: Cached | null = null;
  private landNeutral: Cached | null = null;
  private landLens: Cached | null = null;
  private labels: Cached | null = null;
  private lensVersion = 0;
  private laPaths = new Map<LaCode, Path2D>();
  private walesPath: Path2D | null = null;
  private pathKey = "";
  readonly bbox: [number, number, number, number];

  constructor(
    readonly geo: WalesGeo,
    readonly relief: NationalRelief,
    readonly index: LaIndex,
    public pal: Palette,
    layers: Layers,
  ) {
    this.layers = layers;
    const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const e of index.entries) { b[0] = Math.min(b[0], e.bbox[0]); b[1] = Math.min(b[1], e.bbox[1]); b[2] = Math.max(b[2], e.bbox[2]); b[3] = Math.max(b[3], e.bbox[3]); }
    this.bbox = b;
  }

  /** A km box to fit instead of the whole of Wales (a zoom to an area or region), or null. */
  focus: [number, number, number, number] | null = null;

  /** The view that fits Wales (or the focus box, at most `maxZoom` times closer) inside the host, keeping the padding clear. */
  viewFor(W: number, H: number, dpr: number, pad: Padding, focus = this.focus, maxZoom = 4): NationalView {
    const fitBox = (b: [number, number, number, number]) => {
      const [x0, y0, x1, y1] = b;
      const left = pad.left, right = W - pad.right, top = pad.top, bottom = H - pad.bottom;
      const s = Math.max(0.1, Math.min((bottom - top) / Math.max(1, y1 - y0), (right - left) / Math.max(1, x1 - x0)));
      return { s, cx: (left + right) / 2, cy: (top + bottom) / 2, mx: (x0 + x1) / 2, my: (y0 + y1) / 2 };
    };
    const whole = fitBox(this.bbox);
    // a focus only ever zooms in: a padded box around most of Wales never shrinks Wales (playtest 7)
    const fb = focus ? fitBox(focus) : whole;
    const f = fb.s > whole.s ? fb : whole;
    const s = Math.min(f.s, whole.s * maxZoom);
    return { W, H, dpr, s, ox: f.cx - f.mx * s, oy: f.cy - f.my * s };
  }

  /** Fits Wales (or the focus box) inside the host, keeping the padding clear. */
  fit(W: number, H: number, dpr: number, pad: Padding): void {
    this.view = this.viewFor(W, H, dpr, pad);
  }

  project(x: number, y: number): Pt { const v = this.view; return [v.ox + x * v.s, v.oy + y * v.s]; }
  unproject(px: number, py: number): Pt { const v = this.view; return [(px - v.ox) / v.s, (py - v.oy) / v.s]; }

  invalidate(what: "all" | "lens" | "labels" = "all"): void {
    if (what === "all") { this.base = this.landNatural = this.landNeutral = this.landLens = this.labels = null; this.pathKey = ""; }
    else if (what === "lens") { this.landLens = null; this.lensVersion++; }
    else this.labels = null;
  }

  private sizeKey(): string { const v = this.view; return `${v.W}x${v.H}@${v.dpr}:${v.s.toFixed(4)}:${v.ox.toFixed(2)},${v.oy.toFixed(2)}`; }

  private paths(): void {
    const key = this.sizeKey();
    if (this.pathKey === key) return;
    this.laPaths.clear();
    for (const e of this.index.entries) this.laPaths.set(e.la.code, ringsPath(e.la.rings, this.view));
    this.walesPath = ringsPath(this.geo.las.flatMap((l) => l.rings), this.view);
    this.pathKey = key;
  }
  laPath(code: LaCode): Path2D | undefined { this.paths(); return this.laPaths.get(code); }

  // ---------------------------------------------------------------- caches

  private getBase(): HTMLCanvasElement {
    const key = this.sizeKey();
    if (this.base?.key === key) return this.base.canvas;
    const { W, H, dpr, s } = this.view, k = s / 3, pal = this.pal;
    const [cv, ctx] = newCanvas(W, H, dpr);
    ctx.fillStyle = pal.sea[0]!; ctx.fillRect(0, 0, W, H);
    this.relief.sea.forEach((mp, i) => sheet(ctx, multiPolygonPath(mp, this.view), pal.sea[i + 1] ?? pal.sea[pal.sea.length - 1]!, { c: "rgba(20,40,55,.28)", b: 5 * k, x: 1.3 * k, y: 1.8 * k }));
    grainOver(ctx, W, H, 0.5);
    sheet(ctx, multiPolygonPath(this.relief.beyond, this.view), pal.paperBeyond, { c: "rgba(20,35,40,.4)", b: 7 * k, x: 2.4 * k, y: 3.2 * k });
    // England carries on east of the surveyed grid: no straight-edged white box when Wales is small
    // (east of the grid, and north and south of it from the border's last point on each edge)
    const pts = this.relief.beyond.flat(2);
    if (pts.length) {
      let east = -Infinity, top = Infinity, bot = -Infinity;
      for (const p of pts) { east = Math.max(east, p[0]!); top = Math.min(top, p[1]!); bot = Math.max(bot, p[1]!); }
      const xAt = (y: number) => Math.min(...pts.filter((p) => Math.abs(p[1]! - y) < 0.6).map((p) => p[0]!));
      const [ex, ty] = this.project(east, top), by = this.project(east, bot)[1], tx = this.project(xAt(top), top)[0], bx = this.project(xAt(bot), bot)[0];
      ctx.fillStyle = pal.paperBeyond;
      if (ex - 4 < W) ctx.fillRect(ex - 4, ty, W - ex + 4, by - ty);
      if (ty > 0 && tx < W) ctx.fillRect(tx, 0, W - tx, ty + 4);
      if (by < H && bx < W) ctx.fillRect(bx, by - 4, W - bx, H - by + 4);
    }
    // Wales casts its shadow once here, so the land and lens layers need no blur of their own
    this.paths();
    ctx.save();
    setShadow(ctx, { c: "rgba(15,30,35,.5)", b: 8 * k, x: 2.8 * k, y: 3.8 * k });
    ctx.fillStyle = pal.relief[0]!; ctx.fill(this.walesPath!, "evenodd");
    ctx.restore();
    this.base = { key, canvas: cv };
    return cv;
  }

  /** The relief of Wales in the given sheet colours (12, lowland to summit), clipped to the coast. */
  private drawLand(colours: string[]): HTMLCanvasElement {
    this.paths();
    const { W, H, dpr, s } = this.view, k = s / 3;
    const wales = this.walesPath!;
    const [tc, t] = newCanvas(W, H, dpr);
    t.fillStyle = colours[0]!; t.fill(wales, "evenodd");
    t.save(); t.clip(wales, "evenodd");
    this.relief.bands.forEach((mp, i) => sheet(t, multiPolygonPath(mp, this.view), colours[Math.min(colours.length - 1, i + 1)]!, { c: "rgba(40,30,20,.42)", b: 4 * k, x: 1.8 * k, y: 2.5 * k }));
    t.globalCompositeOperation = "multiply"; t.globalAlpha = 0.38; t.fillStyle = t.createPattern(grainTile(), "repeat")!; t.fillRect(0, 0, W, H);
    t.restore();
    t.save(); t.clip(wales, "evenodd"); t.translate(0.7, 0.8); t.strokeStyle = "rgba(255,255,255,.45)"; t.lineWidth = 1.4; t.stroke(wales); t.restore();
    return tc;
  }

  private boundaries(ctx: Ctx, sheets: boolean): void {
    this.paths();
    const wales = this.walesPath!;
    const all = new Path2D();
    for (const [, p] of this.laPaths) all.addPath(p);
    ctx.save(); ctx.clip(wales, "evenodd");
    if (sheets) {
      // each authority a separate sheet: an embossed seam, lit one side and shaded the other
      ctx.save();
      ctx.translate(1, 1.2); ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1.6; ctx.stroke(all);
      ctx.translate(-2, -2.4); ctx.strokeStyle = "rgba(40,30,20,.2)"; ctx.lineWidth = 1.6; ctx.stroke(all);
      ctx.restore();
    }
    ctx.translate(0.6, 0.6); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 0.8; ctx.stroke(all);
    ctx.translate(-0.6, -0.6); ctx.strokeStyle = "rgba(38,40,38,.5)"; ctx.lineWidth = 0.7; ctx.setLineDash([2.2, 1.4]); ctx.stroke(all);
    ctx.restore();
  }

  private getLandNatural(): HTMLCanvasElement {
    const key = this.sizeKey();
    if (this.landNatural?.key === key) return this.landNatural.canvas;
    const c = this.drawLand(this.pal.relief);
    this.boundaries(c.getContext("2d")!, false);
    this.landNatural = { key, canvas: c };
    return c;
  }

  /** Builds the neutral relief ahead of the first lens, so that lens is a recolour only. */
  warmLens(): void { this.getLandNeutral(); }

  private getLandNeutral(): HTMLCanvasElement {
    const key = this.sizeKey();
    if (this.landNeutral?.key === key) return this.landNeutral.canvas;
    const c = this.drawLand(rampColours(this.pal.reliefLens, 12));
    this.landNeutral = { key, canvas: c };
    return c;
  }

  private getLandLens(): HTMLCanvasElement {
    const key = this.sizeKey() + "|" + this.lensVersion;
    if (this.landLens?.key === key) return this.landLens.canvas;
    const t0 = performance.now();
    this.paths();
    const neutral = this.getLandNeutral();
    const { W, H, dpr } = this.view, lens = this.lens!;
    const [cv, ctx] = newCanvas(W, H, dpr);
    const wales = this.walesPath!;
    ctx.save(); ctx.clip(wales, "evenodd");
    const hatch = this.hatchPattern(ctx);
    for (const [code, p] of this.laPaths) {
      const c = lensColour(lens, lens.values[code], this.pal);
      ctx.fillStyle = c ? rgbCss(c) : this.pal.lensMissing;
      ctx.fill(p, "evenodd");
      if (!c && hatch) { ctx.fillStyle = hatch; ctx.fill(p, "evenodd"); }
    }
    ctx.globalCompositeOperation = "multiply";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(neutral, 0, 0);
    ctx.restore();
    this.boundaries(ctx, true);
    this.landLens = { key, canvas: cv };
    this.lastLensMs = performance.now() - t0;
    return cv;
  }

  private hatchPattern(ctx: Ctx): CanvasPattern | null {
    const c = document.createElement("canvas");
    c.width = c.height = 6;
    const g = c.getContext("2d")!;
    g.strokeStyle = "rgba(60,60,55,.35)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 6); g.lineTo(6, 0); g.stroke();
    return ctx.createPattern(c, "repeat");
  }

  private land(): HTMLCanvasElement { return this.lens ? this.getLandLens() : this.getLandNatural(); }

  private getLabels(): HTMLCanvasElement {
    const L = this.layers;
    const key = `${this.sizeKey()}|${this.lang}|${L.rail}${L.towns}${L.sites}${L.peaks}${L.labels}|${this.fontsVersion}`;
    if (this.labels?.key === key) return this.labels.canvas;
    const { W, H, dpr, s } = this.view, pal = this.pal, lang = this.lang;
    const [cv, ctx] = newCanvas(W, H, dpr);
    const P = (x: number, y: number) => this.project(x, y);
    const nm = (o: { en: string; cy?: string | null }) => (lang === "cy" ? o.cy || o.en : o.en);
    // clearance first: town names (cities first), then hills and seas, each kept only where it is clear
    const width = (text: string, font: string, spacing = 0) => { ctx.save(); ctx.font = font; const w = ctx.measureText(text).width; ctx.restore(); return w + spacing * text.length; };
    const townFont = (c: boolean) => `${c ? 700 : 500} ${c ? 13 : 11.5}px ${pal.fontSans}`;
    const towns = L.towns ? this.geo.towns.map((t, i) => ({ t, i })).sort((a, b) => Number(b.t.kind === "city") - Number(a.t.kind === "city")) : [];
    const houses = L.towns ? this.geo.towns.map((t, i) => { const [x, y] = P(t.x, t.y); return { box: [x - 6, y - 9, x + 6, y + 2] as Box, owner: i }; }) : [];
    const townBoxes = towns.map(({ t, i }) => {
      const [x, y] = P(t.x, t.y), c = t.kind === "city", [dx, dy, a] = t.label ?? [7, 4, "start"];
      return { box: textBox(x + dx, y + dy, width(nm(t), townFont(c)), c ? 13 : 11.5, anchor(a)), always: c, own: i };
    });
    const keptTowns = clearLabels(townBoxes, houses);
    const townShown = new Set(towns.filter((_, k) => keptTowns.has(k)).map((x) => x.i));
    const taken: { box: Box }[] = [...townBoxes.filter((_, k) => keptTowns.has(k)), ...houses];
    const clear = (b: Box) => clearLabels([{ box: b }], taken).size > 0 && (taken.push({ box: b }), true);
    if (L.labels) {
      for (const g of this.geo.labels) {
        const [x, y] = P(g.x, g.y);
        const size = g.kind === "sea" ? Math.max(14, s * 5.6) : g.kind === "beyond" ? 12 : Math.max(13, s * 5.2);
        if (!clear(textBox(x, y, width(nm(g), `italic 400 ${size.toFixed(1)}px ${pal.fontSerif}`, size * (g.kind === "beyond" ? 0.2 : 0.1)), size, "center"))) continue;
        if (g.kind === "sea") haloText(ctx, nm(g), x, y, { font: `italic 400 ${Math.max(14, s * 5.6).toFixed(1)}px ${pal.fontSerif}`, fill: "rgba(32,62,74,.72)", align: "center", letterSpacing: "0.12em" });
        else if (g.kind === "beyond") haloText(ctx, nm(g), x, y, { font: `400 12px ${pal.fontSans}`, fill: "rgba(60,64,60,.55)", align: "center", letterSpacing: "0.2em" });
        else haloText(ctx, nm(g), x, y, { font: `italic 400 ${Math.max(13, s * 5.2).toFixed(1)}px ${pal.fontSerif}`, fill: "rgba(40,35,30,.62)", halo: "rgba(236,232,220,.45)", haloW: 2.4, align: "center", letterSpacing: "0.06em" });
      }
    }
    if (L.rail && this.geo.rail) this.drawRail(ctx);
    if (L.peaks) {
      for (const p of this.geo.peaks) {
        const [x, y] = P(p.x, p.y), [dx, dy, a] = p.label ?? [7, 4, "start"];
        if (!clear(textBox(x + dx, y + dy, width(nm(p), `italic 400 12.5px ${pal.fontSerif}`), 12.5, anchor(a)))) continue;
        peak(ctx, x, y, pal);
        haloText(ctx, nm(p), x + dx, y + dy, { font: `italic 400 12.5px ${pal.fontSerif}`, fill: "#2A2522", halo: "rgba(240,238,230,.8)", haloW: 2.6, align: anchor(a) });
      }
    }
    if (L.sites) {
      for (const t of this.geo.sites) {
        const [x, y] = P(t.x, t.y), [hx, hy] = t.head ?? [0, -10];
        ctx.strokeStyle = "#3A4247"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + hx, y + hy); ctx.stroke();
        ctx.fillStyle = "#3A4247"; ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
        siteDisc(ctx, x + hx, y + hy, t.kind, pal);
      }
    }
    if (L.towns) {
      for (const t of this.geo.towns) { const [x, y] = P(t.x, t.y), c = t.kind === "city"; house(ctx, x, y, c ? 11 : 8, c ? 9 : 7, c, pal); }
      this.geo.towns.forEach((t, i) => {
        if (!townShown.has(i)) return;
        const [x, y] = P(t.x, t.y), c = t.kind === "city", [dx, dy, a] = t.label ?? [7, 4, "start"];
        haloText(ctx, nm(t), x + dx, y + dy, { font: townFont(c), fill: pal.ink, halo: pal.halo, haloW: 3, align: anchor(a) });
      });
    }
    this.labels = { key, canvas: cv };
    return cv;
  }
  fontsVersion = 0;

  private drawRail(ctx: Ctx): void {
    const rail = this.geo.rail!, v = this.view;
    const main = new Path2D(), heritage = new Path2D();
    for (const l of rail.lines) ringsPath([l.pts], v, false, l.kind === "heritage" ? heritage : main);
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = withAlpha(this.pal.paper, 0.6); ctx.lineWidth = 2.4; ctx.stroke(main);
    ctx.strokeStyle = this.pal.rail; ctx.lineWidth = 1.15; ctx.globalAlpha = 0.9; ctx.stroke(main);
    ctx.setLineDash([2.5, 2]); ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6; ctx.stroke(heritage);
    ctx.restore();
    if (v.s >= 4.5) {
      ctx.save();
      for (const st of rail.stations) {
        const [x, y] = this.project(st.x, st.y);
        ctx.fillStyle = this.pal.paper; ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
        ctx.strokeStyle = this.pal.rail; ctx.lineWidth = 0.8; ctx.strokeRect(x - 1.6, y - 1.6, 3.2, 3.2);
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- frame

  /** The lift offset of the selected authority, in px. */
  liftOf(kind: "selected" | "hover"): Pt { const k = this.view.s / 3; return kind === "selected" ? [-3.2 * k, -4.8 * k] : [-1.2 * k, -1.9 * k]; }

  /** Where a stitch or thread anchors for an authority: its label point, lifted when selected. */
  anchorOf(code: LaCode): Pt | null {
    const e = this.index.byCode.get(code);
    if (!e) return null;
    const [x, y] = this.project(e.label[0], e.label[1]);
    if (code === this.selected) { const [lx, ly] = this.liftOf("selected"); return [x + lx, y + ly]; }
    return [x, y];
  }

  render(ctx: Ctx): void {
    this.paths();
    const { dpr } = this.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.getBase(), 0, 0);
    const land = this.land();
    ctx.drawImage(land, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.highlight.size) {
      ctx.save();
      ctx.fillStyle = withAlpha(this.pal.paper, 0.4);
      for (const [code, p] of this.laPaths) if (!this.highlight.has(code)) ctx.fill(p, "evenodd");
      ctx.strokeStyle = this.pal.ink; ctx.lineWidth = 1.3; ctx.lineJoin = "round";
      for (const code of this.highlight) { const p = this.laPaths.get(code); if (p) ctx.stroke(p); }
      ctx.restore();
    }
    if (this.hover && this.hover !== this.selected) this.lift(ctx, land, this.hover, "hover");
    if (this.selected) this.lift(ctx, land, this.selected, "selected");

    // markers sit on the paper, under the names; stitches and the thread lie on top
    if (this.layers.markers) this.drawMarkers(ctx);
    if (this.links.length) this.drawLinks(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.getLabels(), 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.thread) this.drawThread(ctx, this.thread);
    if (this.layers.stitches) this.drawStitches(ctx);
  }

  private lift(ctx: Ctx, land: HTMLCanvasElement, code: LaCode, kind: "selected" | "hover"): void {
    const p = this.laPaths.get(code);
    if (!p) return;
    const k = this.view.s / 3, [lx, ly] = this.liftOf(kind), sel = kind === "selected", pal = this.pal;
    ctx.save();
    ctx.translate(lx, ly);
    setShadow(ctx, sel ? { c: "rgba(15,20,20,.6)", b: 12 * k, x: 5 * k, y: 7 * k } : { c: "rgba(15,20,20,.45)", b: 6 * k, x: 2 * k, y: 3 * k });
    ctx.fillStyle = pal.relief[3]!; ctx.fill(p, "evenodd");
    ctx.shadowColor = "transparent";
    ctx.save();
    ctx.clip(p, "evenodd");
    ctx.drawImage(land, 0, 0, this.view.W, this.view.H);
    ctx.fillStyle = sel ? "rgba(255,250,240,.16)" : "rgba(255,250,240,.12)"; ctx.fillRect(-20, -20, this.view.W + 40, this.view.H + 40);
    ctx.restore();
    ctx.lineJoin = "round";
    if (sel) {
      // twisted red thread: a cord, its twist, and a light catching the fibres
      // a pale under-stroke keeps the thread legible over dark lens tints
      ctx.strokeStyle = this.lens ? "rgba(250,248,240,.6)" : "rgba(250,248,240,.3)"; ctx.lineWidth = 4.2; ctx.stroke(p);
      ctx.save(); setShadow(ctx, { c: "rgba(60,10,10,.45)", b: 2, x: 0.8, y: 1.2 });
      ctx.strokeStyle = pal.threadRed; ctx.lineWidth = 2.4; ctx.stroke(p); ctx.restore();
      ctx.strokeStyle = withAlpha(pal.threadRedDark, 0.7); ctx.lineWidth = 2.4; ctx.setLineDash([1.3, 2.1]); ctx.stroke(p);
      ctx.strokeStyle = withAlpha(pal.threadRedHi, 0.55); ctx.lineWidth = 0.6; ctx.setLineDash([2, 1.4]); ctx.stroke(p);
    } else {
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1; ctx.stroke(p);
    }
    ctx.restore();
  }

  private drawThread(ctx: Ctx, th: { la: LaCode; to: Pt }): void {
    const a = this.anchorOf(th.la);
    if (!a) return;
    const [sx, sy] = a, [ex, ey] = th.to, pal = this.pal;
    const p = new Path2D();
    p.moveTo(sx, sy);
    p.quadraticCurveTo((sx + ex) / 2, Math.max(sy, ey) + 46, ex, ey);
    ctx.save();
    ctx.lineCap = "round";
    setShadow(ctx, { c: "rgba(58,10,12,.45)", b: 2, x: 0.8, y: 1.4 });
    ctx.strokeStyle = pal.threadRed; ctx.lineWidth = 1.8; ctx.stroke(p);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = withAlpha(pal.threadRedDark, 0.7); ctx.setLineDash([1.2, 2.2]); ctx.stroke(p);
    ctx.restore();
    pinHead(ctx, sx, sy, pal);
  }

  private drawMarkers(ctx: Ctx): void {
    const s = this.view.s, pal = this.pal;
    // warnings first, under everything else
    const order = [...this.markers].sort((a, b) => (a.kind === "warning" ? 0 : 1) - (b.kind === "warning" ? 0 : 1));
    for (const m of order) {
      const [x, y] = this.project(m.x, m.y), size = m.size ?? 1;
      switch (m.kind) {
        case "warning": warningCircle(ctx, x, y, size * 6 * s, pal); break;
        case "tip": tipMound(ctx, x, y, 6 * size * Math.max(0.8, s / 3)); break;
        case "site": siteDisc(ctx, x, y, m.glyph ?? "heritage", pal); break;
        case "town": house(ctx, x, y, 8 * size, 7 * size, false, pal); break;
        case "stamp": {
          // a small inked notebook stamp: this area has been looked at
          const r = 6 * size;
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.stroke();
          ctx.restore();
          break;
        }
        default: pinHead(ctx, x, y, pal, 3.4 * size);
      }
      if (m.label) haloText(ctx, m.label, x + 8, y + 4, { font: `600 11px ${pal.fontSans}`, fill: pal.ink, halo: pal.halo, haloW: 3 });
    }
  }

  private drawStitches(ctx: Ctx): void {
    const pal = this.pal, seen = new Map<string, number>();
    for (const st of this.stitches) {
      let base: Pt | null;
      let key: string;
      if ("la" in st.at) { base = this.anchorOf(st.at.la); key = st.at.la; }
      else { base = this.project(st.at.x, st.at.y); key = `${st.at.x.toFixed(1)},${st.at.y.toFixed(1)}`; }
      if (!base) continue;
      const i = seen.get(key) ?? 0;
      seen.set(key, i + 1);
      const a = i * 2.4, r = i ? 26 * Math.sqrt(i) : 0;
      const x = base[0] + Math.cos(a) * r, y = base[1] + Math.sin(a) * r;
      stitchRing(ctx, x, y, 13, 12, pal);
      stitchSign(ctx, x, y, st.kind, pal);
      if (st.label) haloText(ctx, st.label, x, y + 27, { font: `600 11px ${pal.fontSans}`, fill: pal.threadStitchDark, halo: pal.halo, haloW: 3, align: "center" });
    }
  }

  // ---------------------------------------------------------------- links (the board, v2)

  /** Real links between places (commuting, rail, rivers), drawn under the names. Set by PaperMap.setLinks. */
  links: MapLink[] = [];

  private linkEnd(end: MapLinkEnd): Pt | null {
    return "la" in end ? this.anchorOf(end.la) : this.project(end.x, end.y);
  }

  /**
   * One link's curve in host px: a single smooth sag, bowed to one side by kind so that a rail
   * line, a commute and a river between the same two places lie side by side, not on top.
   */
  linkCurve(l: MapLink): { a: Pt; c: Pt; b: Pt } | null {
    const a = this.linkEnd(l.from), b = this.linkEnd(l.to);
    if (!a || !b) return null;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const bow = (l.kind === "commute" ? 0.16 : l.kind === "river" ? -0.16 : 0.04) * len;
    // the bow is to the same side of the pair whichever end is "from", so pairs never cross over
    const sign = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? 1 : -1;
    const c: Pt = [(a[0] + b[0]) / 2 - (dy / len) * bow * sign, (a[1] + b[1]) / 2 + (dx / len) * bow * sign];
    return { a, c, b };
  }

  private drawLinks(ctx: Ctx): void {
    const pal = this.pal;
    const at = (q: { a: Pt; c: Pt; b: Pt }, t: number): Pt => {
      const u = 1 - t;
      return [u * u * q.a[0] + 2 * u * t * q.c[0] + t * t * q.b[0], u * u * q.a[1] + 2 * u * t * q.c[1] + t * t * q.b[1]];
    };
    const order = (l: MapLink) => (l.state === "lit" ? 2 : l.state === "dim" ? 0 : 1);
    const sorted = [...this.links].sort((x, y) => order(x) - order(y));
    ctx.save();
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    for (const l of sorted) {
      const q = this.linkCurve(l);
      if (!q) continue;
      const w = Math.max(1, Math.min(3, l.weight ?? 1));
      const p = new Path2D();
      p.moveTo(q.a[0], q.a[1]);
      p.quadraticCurveTo(q.c[0], q.c[1], q.b[0], q.b[1]);
      ctx.globalAlpha = l.state === "dim" ? 0.28 : 1;
      // a pale underlay keeps every line legible over the relief and over dark lens tints
      ctx.setLineDash([]);
      ctx.strokeStyle = withAlpha(pal.paper, 0.7);
      ctx.lineWidth = 1.6 + w * 1.4;
      ctx.stroke(p);
      if (l.kind === "rail") {
        // the map symbol for a railway: a line with cross ties
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.9 + w * 0.6; ctx.stroke(p);
        ctx.lineWidth = 1;
        const n = Math.max(3, Math.round(Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]) / 9));
        for (let i = 1; i < n; i++) {
          const [x0, y0] = at(q, (i - 0.02) / n), [x1, y1] = at(q, (i + 0.02) / n);
          const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, h = 2.2 + w;
          const [x, y] = at(q, i / n);
          ctx.beginPath(); ctx.moveTo(x - (dy / d) * h, y + (dx / d) * h); ctx.lineTo(x + (dy / d) * h, y - (dx / d) * h); ctx.stroke();
        }
      } else if (l.kind === "river") {
        ctx.strokeStyle = "#2C5778"; ctx.lineWidth = 0.8 + w * 0.7; ctx.stroke(p);
        ctx.strokeStyle = "rgba(195,213,223,.9)"; ctx.lineWidth = 0.6; ctx.setLineDash([5, 4]); ctx.stroke(p);
      } else {
        // commuting: a dotted path of people going to work, heavier for a bigger share
        ctx.strokeStyle = pal.ink2; ctx.lineWidth = 0.9 + w * 0.5; ctx.setLineDash([1.5, 3.5 + w * 0.5]); ctx.stroke(p);
      }
      if (l.state === "lit") {
        // the player's own preview: a cobalt running stitch along the line
        ctx.globalAlpha = 1;
        ctx.setLineDash([11, 6]);
        ctx.strokeStyle = withAlpha(pal.paper, 0.85); ctx.lineWidth = 5; ctx.stroke(p);
        ctx.strokeStyle = pal.threadStitch; ctx.lineWidth = 3; ctx.stroke(p);
      }
      if (l.pulse != null && l.pulse >= 0 && l.pulse <= 1) {
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        const t = l.reverse ? 1 - l.pulse : l.pulse;
        const [x, y] = at(q, t), r = 3.2 + w * 0.8;
        ctx.fillStyle = pal.paper; ctx.beginPath(); ctx.arc(x, y, r + 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = l.state === "lit" ? pal.threadStitchDark : pal.ink; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Which authority is under a px point. The lifted selection is tested at its lifted position first. */
  hit(px: number, py: number): LaCode | null {
    if (this.selected) {
      const [lx, ly] = this.liftOf("selected"), [x, y] = this.unproject(px - lx, py - ly);
      const e = this.index.byCode.get(this.selected);
      if (e && pointInRings(e.la.rings, x, y)) return this.selected;
    }
    const [x, y] = this.unproject(px, py);
    return this.index.at(x, y);
  }
}

const anchor = (a: string): CanvasTextAlign => (a === "middle" ? "center" : a === "end" ? "end" : "start");

/** One end of a link: an authority (its label point) or a point in the km frame (a stub at the edge). */
export type MapLinkEnd = { la: LaCode } | { x: number; y: number };

/** A real connection between two places, for the board (docs/design/v2-board.md section 4.2). */
export interface MapLink {
  id: string;
  from: MapLinkEnd;
  to: MapLinkEnd;
  /** "rail" is drawn as a line with cross ties, "river" in woad, "commute" as a dotted path. */
  kind: "commute" | "rail" | "river" | string;
  /** 1 to 3: line weight (rail quality, a commuting share step). */
  weight?: number;
  /** "rest" (default), "lit" (the player's preview, a cobalt running stitch on top) or "dim". */
  state?: "rest" | "lit" | "dim";
  /** 0 to 1: a bead travelling along the link, from `from` to `to` (or back with `reverse`). */
  pulse?: number | null;
  reverse?: boolean;
}
