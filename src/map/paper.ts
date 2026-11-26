// Shared canvas helpers: paper sheets with soft shadows, grain, paths, labels.
import type { KmMultiPolygon } from "./relief";
import type { Pt, Ring } from "./types";

export type Ctx = CanvasRenderingContext2D;

/** A view transform from km to CSS px: px = ox + x * s. */
export interface View { s: number; ox: number; oy: number }

/** Device pixel ratio per context: canvas shadows ignore the transform, so they are scaled by hand. */
const DPR = new WeakMap<Ctx, number>();
export const ctxDpr = (ctx: Ctx) => DPR.get(ctx) ?? 1;
export function setCtxDpr(ctx: Ctx, dpr: number): void { DPR.set(ctx, dpr); }

export function newCanvas(W: number, H: number, dpr: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(W * dpr));
  c.height = Math.max(1, Math.round(H * dpr));
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  DPR.set(g, dpr);
  return [c, g];
}

/** Applies a shadow in CSS px, whatever the device pixel ratio. */
export function setShadow(ctx: Ctx, sh: Shadow): void {
  const d = ctxDpr(ctx);
  ctx.shadowColor = sh.c; ctx.shadowBlur = sh.b * d; ctx.shadowOffsetX = sh.x * d; ctx.shadowOffsetY = sh.y * d;
}

export function ringsPath(rings: Ring[], v: View, closed = true, into = new Path2D()): Path2D {
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const x = v.ox + r[i]![0] * v.s, y = v.oy + r[i]![1] * v.s;
      if (i) into.lineTo(x, y); else into.moveTo(x, y);
    }
    if (closed && r.length) into.closePath();
  }
  return into;
}

export function linePath(lines: Pt[][], v: View, into = new Path2D()): Path2D {
  return ringsPath(lines, v, false, into);
}

export function multiPolygonPath(mp: KmMultiPolygon, v: View): Path2D {
  const p = new Path2D();
  for (const poly of mp) for (const ring of poly) {
    for (let i = 0; i < ring.length; i++) {
      const x = v.ox + ring[i]![0]! * v.s, y = v.oy + ring[i]![1]! * v.s;
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.closePath();
  }
  return p;
}

export interface Shadow { c: string; b: number; x: number; y: number }

/** A paper sheet: filled with a soft drop shadow, then a light top-left bevel and a dark lower edge. */
export function sheet(ctx: Ctx, path: Path2D, fill: string | CanvasPattern, sh: Shadow | null, bevel = true): void {
  ctx.save();
  if (sh) setShadow(ctx, sh);
  ctx.fillStyle = fill;
  ctx.fill(path, "evenodd");
  ctx.restore();
  if (!bevel) return;
  ctx.save();
  ctx.clip(path, "evenodd");
  ctx.translate(0.8, 0.9); ctx.strokeStyle = "rgba(255,255,255,.32)"; ctx.lineWidth = 1.5; ctx.stroke(path);
  ctx.translate(-1.6, -1.8); ctx.strokeStyle = "rgba(40,30,20,.16)"; ctx.lineWidth = 1.4; ctx.stroke(path);
  ctx.restore();
}

/** Small seeded generator (mulberry32), so the grain is the same on every load. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tile of paper grain: speckle plus a few short fibres. */
export function makeGrain(size: number, lo: number, hi: number, fibres: number, seed = 7): HTMLCanvasElement {
  const rnd = seeded(seed);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const id = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = lo + rnd() * (hi - lo);
    id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v - 2; id.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  g.lineCap = "round";
  for (let i = 0; i < fibres; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * 6.28, l = 4 + rnd() * 12;
    g.strokeStyle = `rgba(${rnd() < 0.5 ? "110,100,90" : "255,255,255"},${0.12 + rnd() * 0.14})`;
    g.lineWidth = 0.5 + rnd() * 0.6;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

let GRAIN: HTMLCanvasElement | null = null;
export const grainTile = () => (GRAIN ??= makeGrain(220, 214, 255, 260));

export function grainOver(ctx: Ctx, W: number, H: number, alpha: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(grainTile(), "repeat")!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A label with a paper halo behind it. */
export function haloText(ctx: Ctx, text: string, x: number, y: number, o: { font: string; fill: string; halo?: string; haloW?: number; align?: CanvasTextAlign; rotate?: number; letterSpacing?: string }): void {
  ctx.save();
  ctx.font = o.font;
  ctx.textAlign = o.align ?? "start";
  ctx.textBaseline = "alphabetic";
  if (o.letterSpacing && "letterSpacing" in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = o.letterSpacing;
  ctx.translate(x, y);
  if (o.rotate) ctx.rotate(o.rotate);
  if (o.halo && o.haloW) {
    ctx.lineJoin = "round";
    ctx.strokeStyle = o.halo;
    ctx.lineWidth = o.haloW;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = o.fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A soft drop shadow for small raised glyphs (as the mockup's #sh filter). */
export function withShadow(ctx: Ctx, draw: () => void, sh: Shadow = { c: "rgba(32,38,31,.5)", b: 1.6, x: 1.1, y: 1.5 }): void {
  ctx.save();
  setShadow(ctx, sh);
  draw();
  ctx.restore();
}
