// A place view: the authored zoom (the Rhondda, Dyffryn Ogwen) as a finer
// paper relief with buildings, roads, rail, rivers, landuse, flood zones,
// facilities, stations, bus routes and the selectable items (tips).
//
// The static sheet (terrain, features, quiet labels) is drawn to an offscreen
// canvas covering the viewport plus a margin. Panning slides that canvas;
// zooming scales it until the gesture rests, then it is redrawn crisp.
import { preparePlace, type PreparedPlace } from "../engine/place-analysis";
import { pointInRings } from "./hit";
import { rampColours, type Palette } from "./palette";
import { grainOver, haloText, linePath, multiPolygonPath, newCanvas, ringsPath, setShadow, sheet, type Ctx, type View } from "./paper";
import { preparePlaceRelief, type PlaceRelief } from "./relief";
import { facilityGlyph, numberTag, routePill, stationTicket, stitchRing, tipMound, tipOutline } from "./glyphs";
import type { BelowMask, Lang, Padding, PlaceData, PlaceSelectable, Pt, Ring } from "./types";

export interface PlaceViewState extends View { W: number; H: number; dpr: number }

interface SheetCache { canvas: HTMLCanvasElement; s: number; ox: number; oy: number; x0: number; y0: number; w: number; h: number; lang: Lang; fonts: number }

const MAX_ZOOM = 7;

export class PlaceSheet {
  readonly prep: PreparedPlace;
  readonly relief: PlaceRelief;
  readonly colours: string[];
  view: PlaceViewState = { W: 1, H: 1, dpr: 1, s: 1, ox: 0, oy: 0 };
  /** The fitted scale (zoom 1). */
  s0 = 1;
  lang: Lang = "en";
  fontsVersion = 0;
  selectable: PlaceSelectable[] = [];
  selected = new Set<string>();
  tokens = new Set<string>();
  hover: string | null = null;
  below: BelowMask | Ring[] | null = null;
  lastSheetMs = 0;
  private cache: SheetCache | null = null;
  private tags: { id: string; x: number; y: number; tx: number; ty: number; w: number }[] = [];
  private busColour = new Map<string, string>();
  private itemPaths = new Map<string, { key: string; path: Path2D }>();

  constructor(readonly place: PlaceData, public pal: Palette) {
    this.prep = preparePlace(place);
    const P = this.prep;
    this.relief = preparePlaceRelief(P.grid, P.w, P.h, P.x0, P.y0, P.c);
    this.colours = rampColours(pal.reliefPlace, this.relief.levels.length + 1);
    // bus routes keep one colour each, longest first
    const refs = [...(place.busRoutes ?? [])].sort((a, b) => (b.lengthKmInBbox ?? 0) - (a.lengthKmInBbox ?? 0)).map((r) => r.ref);
    for (const r of refs) if (!this.busColour.has(r)) this.busColour.set(r, pal.bus[this.busColour.size % pal.bus.length]!);
  }

  get zoom(): number { return this.view.s / this.s0; }
  get zoomed(): boolean { return this.zoom > 1.4; }

  /** Fits the place to the host: full height, and if too wide, the east kept whole with the west tucked under the left padding. */
  fit(W: number, H: number, dpr: number, pad: Padding): void {
    const b = this.place.bbox;
    const left = pad.left, right = W - pad.right, top = pad.top, bottom = H - pad.bottom;
    const sH = (bottom - top) / (b.y1 - b.y0);
    const sFull = (right - 8) / (b.x1 - b.x0);
    const s0 = Math.max(0.1, Math.min(sH, sFull));
    const w0 = (b.x1 - b.x0) * s0;
    const ox = w0 <= right - left ? (left + right) / 2 - ((b.x0 + b.x1) / 2) * s0 : right - b.x1 * s0;
    const oy = (top + bottom) / 2 - ((b.y0 + b.y1) / 2) * s0;
    const prevZoom = this.fitted ? this.view.s / this.s0 : 1;
    const centre = this.fitted ? this.centreKm() : null;
    this.fitted = true;
    this.s0 = s0;
    this.fitOx = ox;
    this.fitOy = oy;
    this.view = { W, H, dpr, s: s0, ox, oy };
    if (centre && prevZoom > 1.001) this.zoomAbout(centre, prevZoom * s0, [W / 2, H / 2]);
    this.cache = null;
  }

  project(x: number, y: number): Pt { const v = this.view; return [v.ox + x * v.s, v.oy + y * v.s]; }
  unproject(px: number, py: number): Pt { const v = this.view; return [(px - v.ox) / v.s, (py - v.oy) / v.s]; }
  centreKm(): Pt { return this.unproject(this.view.W / 2, this.view.H / 2); }

  /** Sets the scale, keeping km point `at` under px point `px`. */
  zoomAbout(at: Pt, s: number, px: Pt): void {
    const v = this.view;
    v.s = Math.max(this.s0, Math.min(this.s0 * MAX_ZOOM, s));
    v.ox = px[0] - at[0] * v.s;
    v.oy = px[1] - at[1] * v.s;
    if (v.s <= this.s0 * 1.0001) {
      // back at the fit: restore the fitted framing exactly
      v.ox = this.fitOx; v.oy = this.fitOy;
    }
    this.clampPan();
  }

  private fitted = false;
  private fitOx = 0;
  private fitOy = 0;

  pan(dx: number, dy: number): void { this.view.ox += dx; this.view.oy += dy; this.clampPan(); }

  /** Keeps the view centre over the surveyed block. */
  private clampPan(): void {
    const v = this.view, b = this.place.bbox;
    if (v.s <= this.s0 * 1.0001) return;
    const [cx, cy] = this.centreKm();
    const nx = Math.max(b.x0, Math.min(b.x1, cx)), ny = Math.max(b.y0, Math.min(b.y1, cy));
    v.ox += (cx - nx) * v.s; v.oy += (cy - ny) * v.s;
  }

  // ---------------------------------------------------------------- the static sheet

  /** True when the cached sheet covers the viewport at the current scale. */
  sheetFresh(): boolean {
    const c = this.cache, v = this.view;
    if (!c || c.lang !== this.lang || c.fonts !== this.fontsVersion) return false;
    if (Math.abs(c.s / v.s - 1) > 0.002) return false;
    const dx = v.ox - c.ox, dy = v.oy - c.oy;
    return c.x0 + dx <= 0.5 && c.y0 + dy <= 0.5 && c.x0 + dx + c.w >= v.W - 0.5 && c.y0 + dy + c.h >= v.H - 0.5 || this.coversBlock(c, dx, dy);
  }

  private coversBlock(c: SheetCache, dx: number, dy: number): boolean {
    // at the fit the whole block is cached, which is all there is to see
    const b = this.place.bbox, v = this.view;
    const [bx0, by0] = this.project(b.x0, b.y0), [bx1, by1] = this.project(b.x1, b.y1);
    return c.x0 + dx <= Math.max(0, bx0 - 20) && c.y0 + dy <= Math.max(0, by0 - 20) && c.x0 + dx + c.w >= Math.min(v.W, bx1 + 20) && c.y0 + dy + c.h >= Math.min(v.H, by1 + 20);
  }

  /** Redraws the static sheet for the current view, with a margin around the viewport. */
  renderSheet(): void {
    const t0 = performance.now();
    const v = this.view, b = this.place.bbox;
    const [bx0, by0] = this.project(b.x0, b.y0), [bx1, by1] = this.project(b.x1, b.y1);
    const mx = v.W * 0.35, my = v.H * 0.35;
    const x0 = Math.floor(Math.max(-mx, bx0 - 24)), y0 = Math.floor(Math.max(-my, by0 - 24));
    const x1 = Math.ceil(Math.min(v.W + mx, bx1 + 24)), y1 = Math.ceil(Math.min(v.H + my, by1 + 24));
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const [cv, ctx] = newCanvas(w, h, v.dpr);
    const local: View = { s: v.s, ox: v.ox - x0, oy: v.oy - y0 };
    this.drawSheet(ctx, local, w, h);
    this.cache = { canvas: cv, s: v.s, ox: v.ox, oy: v.oy, x0, y0, w, h, lang: this.lang, fonts: this.fontsVersion };
    this.lastSheetMs = performance.now() - t0;
  }

  private drawSheet(ctx: Ctx, V: View, W: number, H: number): void {
    const place = this.place, pal = this.pal, s = V.s, k = Math.min(1.6, s / 50);
    const b = place.bbox;
    const bx0 = V.ox + b.x0 * s, by0 = V.oy + b.y0 * s, bx1 = V.ox + b.x1 * s, by1 = V.oy + b.y1 * s;
    const block = new Path2D(); block.rect(bx0, by0, bx1 - bx0, by1 - by0);
    sheet(ctx, block, this.colours[0]!, { c: "rgba(20,25,25,.45)", b: 10, x: 4, y: 6 }, false);
    ctx.save();
    ctx.clip(block);
    this.relief.bands.forEach((mp, i) => sheet(ctx, multiPolygonPath(mp, V), this.colours[i + 1]!, { c: "rgba(40,30,20,.32)", b: 3.2 * k, x: 1.3 * k, y: 1.9 * k }));
    grainOver(ctx, W, H, 0.4);
    const areas = (rows: { rings: Ring[] }[]) => { const p = new Path2D(); for (const r of rows) ringsPath(r.rings, V, true, p); return p; };
    const landuse = place.landuse ?? [];
    // woodland: a darker, slightly felted paper
    ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = pal.placeWood; ctx.fill(areas(landuse.filter((l) => l.class === "woodland")), "evenodd"); ctx.restore();
    // where people live: residential land as pale card
    const res = areas(landuse.filter((l) => l.class === "residential"));
    ctx.save(); ctx.fillStyle = pal.placeResidential; ctx.fill(res, "evenodd"); ctx.strokeStyle = "rgba(120,110,95,.35)"; ctx.lineWidth = 0.6; ctx.stroke(res); ctx.restore();
    // flood zones: faint blue tracing with a fine hatch
    const fl = areas(place.flood ?? []);
    const hc = document.createElement("canvas"); hc.width = hc.height = 8;
    const hg = hc.getContext("2d")!; hg.strokeStyle = "rgba(60,110,150,.55)"; hg.lineWidth = 1; hg.beginPath(); hg.moveTo(0, 8); hg.lineTo(8, 0); hg.stroke();
    ctx.save(); ctx.fillStyle = pal.placeFlood; ctx.fill(fl, "evenodd"); ctx.fillStyle = ctx.createPattern(hc, "repeat")!; ctx.globalAlpha = 0.7; ctx.fill(fl, "evenodd"); ctx.restore();
    sheet(ctx, areas(place.water ?? []), pal.placeWater, null);
    // rivers and streams
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const streams = new Path2D(), rivers = new Path2D();
    for (const r of place.rivers ?? []) linePath([r.pts], V, r.kind === "river" ? rivers : streams);
    ctx.strokeStyle = pal.placeStream; ctx.lineWidth = 0.7 * k; ctx.stroke(streams);
    ctx.strokeStyle = pal.placeRiver; ctx.lineWidth = 2 * k; ctx.stroke(rivers); ctx.strokeStyle = "rgba(190,220,232,.7)"; ctx.lineWidth = 0.6 * k; ctx.stroke(rivers);
    // roads: scored into the paper
    const byC = new Map<string, Path2D>();
    for (const r of place.roads ?? []) { const c = r.class ?? "minor"; let p = byC.get(c); if (!p) byC.set(c, (p = new Path2D())); linePath([r.pts], V, p); }
    const path = byC.get("path"), track = byC.get("track");
    if (path || track) { ctx.setLineDash([1.5, 2.5]); ctx.strokeStyle = "rgba(90,70,50,.35)"; ctx.lineWidth = 0.6; if (path) ctx.stroke(path); if (track) ctx.stroke(track); ctx.setLineDash([]); }
    const service = byC.get("service");
    if (service) { ctx.strokeStyle = "rgba(250,248,240,.5)"; ctx.lineWidth = 0.6 * k; ctx.stroke(service); }
    for (const c of ["residential", "minor"]) { const p = byC.get(c); if (!p) continue; ctx.strokeStyle = "rgba(70,60,50,.35)"; ctx.lineWidth = 1.5 * k; ctx.stroke(p); ctx.strokeStyle = "rgba(252,250,244,.85)"; ctx.lineWidth = 0.9 * k; ctx.stroke(p); }
    const major = byC.get("major");
    if (major) { ctx.strokeStyle = "rgba(60,50,40,.5)"; ctx.lineWidth = 3 * k; ctx.stroke(major); ctx.strokeStyle = pal.placeRoad; ctx.lineWidth = 2 * k; ctx.stroke(major); }
    // old colliery lines: faint dashes
    const rail = place.rail ?? [];
    const old = new Path2D(); for (const r of rail) if (r.status !== "active") linePath([r.pts], V, old);
    ctx.setLineDash([3, 2.5]); ctx.strokeStyle = "rgba(50,45,40,.42)"; ctx.lineWidth = 1; ctx.stroke(old); ctx.setLineDash([]);
    // buildings: thousands of tiny raised blocks, one path, one shadow
    // drawn in batches on their own layer, which then casts a single shadow (much faster than one huge path)
    const blds = place.buildings ?? [];
    const dpr = this.view.dpr;
    const [lc, lg] = newCanvas(W, H, dpr);
    const batches: Path2D[] = [];
    for (let i = 0; i < blds.length; i += 400) {
      const p = new Path2D();
      for (let j = i; j < Math.min(blds.length, i + 400); j++) ringsPath([blds[j]!], V, true, p);
      batches.push(p);
    }
    lg.fillStyle = pal.placeBuilding; lg.strokeStyle = pal.placeBuilding; lg.lineWidth = s < 70 ? 1.25 : s < 110 ? 0.9 : 0.5;
    for (const p of batches) { lg.fill(p); lg.stroke(p); }
    ctx.save(); setShadow(ctx, { c: "rgba(30,25,20,.55)", b: 0.8 * k, x: 0.7 * k, y: 1 * k });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lc, 0, 0); ctx.restore();
    ctx.strokeStyle = "rgba(60,55,50,.35)"; ctx.lineWidth = 0.25;
    for (const p of batches) ctx.stroke(p);
    // railway in use: ink on a raised paper strip, with sleepers
    const act = new Path2D(); for (const r of rail) if (r.status === "active") linePath([r.pts], V, act);
    ctx.save(); setShadow(ctx, { c: "rgba(20,20,20,.45)", b: 2, x: 1, y: 1.4 }); ctx.strokeStyle = "#FBFBF7"; ctx.lineWidth = 6 * k; ctx.stroke(act); ctx.restore();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6 * k; ctx.stroke(act);
    ctx.setLineDash([0.9, 3.2]); ctx.lineWidth = 4 * k; ctx.stroke(act); ctx.setLineDash([]);
    // buses: thin coloured thread, each route nudged so shared roads show every colour
    (place.busRoutes ?? []).forEach((br, i) => {
      const p = new Path2D(); linePath(br.lines, V, p);
      ctx.save(); ctx.translate(((i % 3) - 1) * 0.9, ((i % 2) - 0.5) * 0.9); ctx.strokeStyle = this.busColour.get(br.ref) ?? "#555"; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.3 * Math.min(1.3, k); ctx.stroke(p); ctx.restore();
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.strokeRect(bx0 + 0.5, by0 + 0.5, bx1 - bx0 - 1, by1 - by0 - 1); ctx.restore();
    this.drawQuietOverlay(ctx, V, W, H);
  }

  /** Stops, route numbers, facilities, stations, rivers and place names. */
  private drawQuietOverlay(ctx: Ctx, V: View, W: number, H: number): void {
    const place = this.place, pal = this.pal, lang = this.lang, zoomed = this.zoomed;
    const P = (x: number, y: number): Pt => [V.ox + x * V.s, V.oy + y * V.s];
    const inView = (x: number, y: number, m = 0) => x > -m && y > -m && x < W + m && y < H + m;
    const sans = pal.fontSans, serif = pal.fontSerif;
    ctx.save();
    for (const b of place.busStops ?? []) {
      const [x, y] = P(b.x, b.y); if (!inView(x, y)) continue;
      ctx.beginPath(); ctx.arc(x, y, zoomed ? 2.2 : 1.5, 0, Math.PI * 2); ctx.fillStyle = "#FBFBF8"; ctx.fill(); ctx.strokeStyle = "#3A4247"; ctx.lineWidth = 0.7; ctx.stroke();
    }
    const seen = new Set<string>();
    for (const br of [...(place.busRoutes ?? [])].sort((a, b) => (b.lengthKmInBbox ?? 0) - (a.lengthKmInBbox ?? 0))) {
      if (seen.has(br.ref) || !br.lines.length) continue;
      seen.add(br.ref);
      const ln = br.lines.reduce((m, l) => (l.length > m.length ? l : m), br.lines[0]!);
      const p = ln[Math.floor(ln.length * (0.42 + 0.16 * ((seen.size % 3) / 2)))];
      if (!p) continue;
      const [x, y] = P(p[0], p[1]);
      if (inView(x, y)) routePill(ctx, x, y, br.ref, this.busColour.get(br.ref) ?? "#555", `700 9.5px ${sans}`);
    }
    for (const f of place.facilities ?? []) { const [x, y] = P(f.x, f.y); if (inView(x, y)) facilityGlyph(ctx, f.kind, x, y, pal, !zoomed); }
    const placeNames = (place.places ?? []).map((p) => p.en.toLowerCase());
    for (const st of place.stations ?? []) {
      if (st.kind && st.kind !== "rail_station") continue;
      const [x, y] = P(st.x, st.y); if (!inView(x, y)) continue;
      stationTicket(ctx, x, y, pal);
      const n = (st.name ?? "").toLowerCase();
      if (st.name && (zoomed || !placeNames.some((p) => n.includes(p) || p.includes(n))))
        haloText(ctx, lang === "cy" ? st.cy || st.name : st.name, x + 7, y + 10, { font: `600 10.5px ${sans}`, fill: pal.ink, halo: "rgba(246,246,240,.9)", haloW: 2.6 });
    }
    for (const r of this.riverLabels()) {
      const [x, y] = P(r.x, r.y); if (!inView(x, y)) continue;
      haloText(ctx, r.name, x, y, { font: `italic 400 11.5px ${serif}`, fill: "#2E5C70", halo: "rgba(240,240,232,.8)", haloW: 2.4, rotate: r.angle, align: "center" });
    }
    for (const p of place.places ?? []) {
      const [x, y] = P(p.x, p.y); if (!inView(x, y, -10)) continue;
      const big = p.kind === "town", small = p.kind === "hamlet" || p.kind === "suburb";
      if (small && !zoomed) continue;
      haloText(ctx, lang === "cy" ? p.cy || p.en : p.en, x, y - 6, {
        font: big ? `700 13.5px ${sans}` : small ? `500 10.5px ${sans}` : `600 12px ${sans}`,
        fill: small ? "#3B464D" : pal.ink, halo: "rgba(246,246,240,.9)", haloW: 3, align: "center",
      });
    }
    ctx.restore();
  }

  private riverLabelCache: { name: string; x: number; y: number; angle: number }[] | null = null;
  /** One quiet label per named river, at the middle of its longest run, turned along it. */
  private riverLabels(): { name: string; x: number; y: number; angle: number }[] {
    if (this.riverLabelCache) return this.riverLabelCache;
    const best = new Map<string, Pt[]>();
    const len = (pts: Pt[]) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) : 0), 0);
    for (const r of this.place.rivers ?? []) {
      if (r.kind !== "river" || !r.name) continue;
      const cur = best.get(r.name);
      if (!cur || len(r.pts) > len(cur)) best.set(r.name, r.pts);
    }
    const out: { name: string; x: number; y: number; angle: number }[] = [];
    for (const [name, pts] of best) {
      const L = len(pts);
      if (L < 1.2) continue;
      let acc = 0, i = 1;
      for (; i < pts.length; i++) { const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); if (acc + d >= L / 2) break; acc += d; }
      const a = pts[Math.max(0, i - 3)]!, b = pts[Math.min(pts.length - 1, i + 2)]!, m = pts[Math.min(pts.length - 1, i)]!;
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
      // sit just beside the water, not on it
      out.push({ name, x: m[0] - Math.sin(ang) * 0.12, y: m[1] + Math.cos(ang) * -0.12, angle: ang });
    }
    return (this.riverLabelCache = out);
  }

  // ---------------------------------------------------------------- the frame

  render(ctx: Ctx): void {
    const v = this.view, pal = this.pal;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.fillStyle = pal.board; ctx.fillRect(0, 0, v.W, v.H);
    grainOver(ctx, v.W, v.H, 0.45);
    if (!this.cache) this.renderSheet();
    const c = this.cache!;
    const r = v.s / c.s;
    // place the cached sheet where its km frame now falls
    const dx = v.ox - c.ox * r, dy = v.oy - c.oy * r;
    ctx.drawImage(c.canvas, c.x0 * r + dx, c.y0 * r + dy, c.w * r, c.h * r);
    this.drawBelow(ctx);
    this.drawItems(ctx);
  }

  private drawBelow(ctx: Ctx): void {
    const B = this.below;
    if (!B) return;
    const pal = this.pal, v = this.view;
    ctx.save();
    if (Array.isArray(B)) {
      const p = ringsPath(B, v);
      ctx.fillStyle = pal.placeBelowZone; ctx.fill(p, "evenodd");
      ctx.setLineDash([4, 3]); ctx.strokeStyle = "rgba(31,42,48,.8)"; ctx.lineWidth = 1.2; ctx.stroke(p);
      ctx.restore();
      return;
    }
    const cell = B.cellKm * v.s;
    ctx.fillStyle = pal.placeBelowZone;
    ctx.beginPath();
    for (let j = 0; j < B.rows; j++) for (let i = 0; i < B.cols; i++) {
      if (!B.cells[j * B.cols + i]) continue;
      const [x, y] = this.project(B.x0 + i * B.cellKm, B.y0 + j * B.cellKm);
      ctx.rect(x, y, cell + 0.5, cell + 0.5);
    }
    ctx.fill();
    const blds = this.place.buildings ?? [];
    const bp = new Path2D();
    for (const i of B.buildings) { const r = blds[i]; if (r) ringsPath([r], v, true, bp); }
    ctx.fillStyle = pal.placeBelow; ctx.strokeStyle = pal.placeBelow; ctx.lineWidth = 0.8; ctx.fill(bp); ctx.stroke(bp);
    const [cx, cy] = this.project(B.centre[0], B.centre[1]);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = "rgba(31,42,48,.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, B.radiusKm * v.s, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  private itemPath(it: PlaceSelectable): Path2D | null {
    if (!it.rings?.length) return null;
    const v = this.view, key = `${v.s},${v.ox},${v.oy}`;
    const hit = this.itemPaths.get(it.id);
    if (hit?.key === key) return hit.path;
    const path = ringsPath(it.rings, v);
    this.itemPaths.set(it.id, { key, path });
    return path;
  }

  private drawItems(ctx: Ctx): void {
    const pal = this.pal, s = this.view.s, W = this.view.W, H = this.view.H;
    const tags: typeof this.tags = [];
    for (const it of this.selectable) {
      const [x, y] = this.project(it.x, it.y);
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      const p = this.itemPath(it);
      if (p) tipOutline(ctx, p);
      else tipMound(ctx, x, y, Math.max(4.2, Math.min(9, s * 0.09)));
      tags.push({ id: it.id, x, y, tx: x + 9, ty: y - 13, w: 17 });
    }
    // keep tags apart
    for (let it = 0; it < 80; it++) for (let a = 0; a < tags.length; a++) for (let b = a + 1; b < tags.length; b++) {
      const A = tags[a]!, B = tags[b]!, dx = B.tx - A.tx, dy = B.ty - A.ty;
      if (Math.abs(dx) < 21 && Math.abs(dy) < 17) {
        const push = (17 - Math.abs(dy)) / 2 + 0.5, sgn = dy >= 0 ? 1 : -1;
        A.ty -= push * sgn; B.ty += push * sgn;
        if (Math.abs(dx) < 4) { A.tx -= 3; B.tx += 3; }
      }
    }
    for (const t of tags) if (this.tokens.has(t.id)) stitchRing(ctx, t.x, t.y, Math.max(11, s * 0.14), 14, pal);
    const font = `700 10.5px ${pal.fontSans}`;
    for (const t of tags) {
      const it = this.selectable.find((i) => i.id === t.id)!;
      const sel = this.selected.has(t.id), tok = this.tokens.has(t.id), hov = this.hover === t.id;
      const fill = tok ? pal.threadStitch : sel ? pal.threadRed : hov ? "#3A4A54" : pal.ink;
      numberTag(ctx, t.x, t.y, t.tx, t.ty, it.tag ?? "", fill, sel ? "#FBFBF8" : null, font);
    }
    this.tags = tags;
  }

  /** The item under a px point: its tag first, then its outline or mound. */
  hit(px: number, py: number): string | null {
    for (let i = this.tags.length - 1; i >= 0; i--) {
      const t = this.tags[i]!;
      if (Math.abs(px - t.tx) <= 10 && Math.abs(py - t.ty) <= 9) return t.id;
    }
    let best: string | null = null, bestD = 11;
    for (const t of this.tags) { const d = Math.hypot(px - t.x, py - t.y); if (d < bestD) { bestD = d; best = t.id; } }
    if (best) return best;
    const [x, y] = this.unproject(px, py);
    for (const it of this.selectable) if (it.rings && pointInRings(it.rings, x, y)) return it.id;
    return null;
  }

  /** Where an item's tag sits, in host px (for popovers). */
  tagAnchor(id: string): Pt | null {
    const t = this.tags.find((g) => g.id === id);
    return t ? [t.tx, t.ty] : null;
  }

  invalidate(): void { this.cache = null; this.itemPaths.clear(); }
}
