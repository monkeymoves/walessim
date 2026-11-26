// Small drawn marks: towns, peaks, sites, tips, stitches, stations, facilities.
import { parseColour, type Palette } from "./palette";
import { seeded, setShadow, withShadow, type Ctx } from "./paper";

const SITE_PATHS: Record<string, { d: string; fill?: string; w?: number }[]> = {
  coal: [{ d: "M-3 3.2 L0 -3 L3 3.2 M-1.9 1 H1.9" }, { d: "M1.2 -3 A1.2 1.2 0 1 1 -1.2 -3 A1.2 1.2 0 1 1 1.2 -3" }],
  slate: [{ d: "M-3.4 -1.6 L2.6 -2.8 M-3 .6 L3 -.6 M-2.6 2.8 L3.4 1.6" }],
  copper: [{ d: "M0 -3.4 L3.2 2.6 H-3.2Z", fill: "#A9643A", w: 0.8 }],
  steel: [{ d: "M-3 -3 H3 M-3 3 H3 M0 -3 V3", w: 1.3 }],
  energy: [{ d: "M0 0 L0 -3.6 M0 0 L3.1 1.8 M0 0 L-3.1 1.8" }, { d: "M.9 0 A.9 .9 0 1 1 -.9 0 A.9 .9 0 1 1 .9 0", fill: "ink" }],
  heritage: [{ d: "M-3.2 3 V-.6 A3.2 3.2 0 0 1 3.2 -.6 V3 M-1.2 3 V.4 A1.2 1.2 0 0 1 1.2 .4 V3" }],
  water: [{ d: "M-3.4 -1 q1.7 -1.6 3.4 0 t3.4 0 M-3.4 2 q1.7 -1.6 3.4 0 t3.4 0" }],
};
const PATH_CACHE = new Map<string, Path2D>();
const path = (d: string) => { let p = PATH_CACHE.get(d); if (!p) PATH_CACHE.set(d, (p = new Path2D(d))); return p; };

/** A small white disc with the site's line glyph. */
export function siteDisc(ctx: Ctx, x: number, y: number, kind: string, pal: Palette, r = 6.2): void {
  ctx.save();
  ctx.translate(x, y);
  withShadow(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = pal.paper; ctx.fill(); });
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.scale(r / 6.2, r / 6.2);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const part of SITE_PATHS[kind] ?? []) {
    const p = path(part.d);
    if (part.fill) { ctx.fillStyle = part.fill === "ink" ? pal.ink : part.fill; ctx.fill(p); }
    ctx.strokeStyle = pal.ink; ctx.lineWidth = part.w ?? 1; ctx.stroke(p);
  }
  ctx.restore();
}

/** A folded paper house: white lit face, shaded (or inked, for cities) roof side. */
export function house(ctx: Ctx, x: number, y: number, w: number, h: number, city: boolean, pal: Palette): void {
  const a = w / 2, r = h * 0.42;
  ctx.save();
  ctx.translate(x, y);
  const outline = new Path2D(`M${-a} ${h / 2} V${-h / 2 + r} L0 ${-h / 2} L${a} ${-h / 2 + r} V${h / 2}Z`);
  withShadow(ctx, () => { ctx.fillStyle = "#FFF"; ctx.fill(outline); });
  ctx.fillStyle = city ? pal.ink : "#C2C3BB";
  ctx.fill(new Path2D(`M0 ${-h / 2} L${a} ${-h / 2 + r} V${h / 2} H0Z`));
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.7; ctx.lineJoin = "round"; ctx.stroke(outline);
  ctx.restore();
}

export function peak(ctx: Ctx, x: number, y: number, pal: Palette): void {
  const p = new Path2D(`M${x - 3.6} ${y + 2.6} L${x} ${y - 3.6} L${x + 3.6} ${y + 2.6}Z`);
  withShadow(ctx, () => { ctx.fillStyle = pal.ink; ctx.fill(p); });
  ctx.strokeStyle = "#FBFBF8"; ctx.lineWidth = 0.8; ctx.stroke(p);
}

/** A rough ellipse, jittered so it reads as torn paper rather than a vector disc. */
function roughEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rnd: () => number, j: number): Path2D {
  const p = new Path2D(), n = 22;
  const off = Array.from({ length: n }, () => (rnd() - 0.5) * j);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + off[i % n]! / Math.max(rx, 1);
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath();
  void ctx;
  return p;
}

const TIP_COLS = ["#1F1C1A", "#342F2B", "#4B443E", "#655C54", "#81776D"];
/** A coal tip: five stacked dark mounds with a hard shadow. */
export function tipMound(ctx: Ctx, x: number, y: number, r: number, seed = 1): void {
  const rnd = seeded(Math.round(x * 7 + y * 13 + seed));
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const rr = r * (1 - i * 0.19);
    const p = roughEllipse(ctx, x - i * r * 0.17, y - i * r * 0.25, rr, rr * 0.78, rnd, 1.1);
    if (i === 0) {
      ctx.save(); setShadow(ctx, { c: "rgba(18,15,12,.6)", b: 2.2, x: 1.6, y: 2.2 }); ctx.fillStyle = TIP_COLS[0]!; ctx.fill(p); ctx.restore();
      ctx.strokeStyle = "#141211"; ctx.lineWidth = 0.7; ctx.stroke(p);
    } else {
      ctx.fillStyle = TIP_COLS[i]!; ctx.fill(p);
      ctx.strokeStyle = "rgba(140,130,120,.35)"; ctx.lineWidth = 0.5; ctx.stroke(p);
    }
  }
  ctx.restore();
}

/** A tip drawn from its mapped outline: a dark heap with a pale lit edge. */
export function tipOutline(ctx: Ctx, p: Path2D): void {
  ctx.save();
  setShadow(ctx, { c: "rgba(18,15,12,.6)", b: 2.2, x: 1.6, y: 2.2 });
  ctx.fillStyle = "#24201E"; ctx.fill(p);
  ctx.restore();
  ctx.strokeStyle = "#141211"; ctx.lineWidth = 0.8; ctx.stroke(p);
  ctx.save(); ctx.translate(-1, -1.4); ctx.strokeStyle = "rgba(150,140,130,.6)"; ctx.lineWidth = 1; ctx.stroke(p); ctx.restore();
}

/** The player's mark: a ring of carthen cross-stitches. */
export function stitchRing(ctx: Ctx, x: number, y: number, r: number, n: number, pal: Palette): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  const k = 2.1;
  for (const [col, w] of [[pal.threadStitchDark, 2.6], [pal.threadStitchHi, 1.4]] as const) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, cx = Math.cos(a) * r, cy = Math.sin(a) * r;
      ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k);
      ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A tiny sign inside a stitch ring saying what was done. */
export function stitchSign(ctx: Ctx, x: number, y: number, kind: string, pal: Palette): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = pal.threadStitchDark; ctx.fillStyle = pal.threadStitch; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (kind === "made-safe") {
    // a tip with green bands across it
    ctx.fillStyle = "#2B2826"; ctx.fill(new Path2D("M-4.5 3 L0 -3.5 L4.5 3Z"));
    ctx.strokeStyle = "#93A274"; ctx.lineWidth = 1.2; ctx.stroke(new Path2D("M-2.6 1 H2.6 M-1.4 -1 H1.4"));
  } else if (kind === "planted") {
    ctx.fillStyle = "#3E6B3A"; ctx.fill(new Path2D("M0 -4.5 L3.6 1.5 H-3.6Z")); ctx.strokeStyle = "#3E2E22"; ctx.stroke(new Path2D("M0 1.5 V4"));
  } else if (kind === "built") {
    ctx.fillStyle = pal.paper; const p = new Path2D("M-3.6 3.6 V-.6 L0 -3.8 L3.6 -.6 V3.6Z"); ctx.fill(p); ctx.strokeStyle = pal.threadStitchDark; ctx.lineWidth = 1; ctx.stroke(p);
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A dashed amber circle, for warnings and ripples. */
export function warningCircle(ctx: Ctx, x: number, y: number, r: number, pal: Palette): void {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(pal.warning, 0.13); ctx.fill();
  ctx.setLineDash([3, 2.4]); ctx.strokeStyle = pal.warning; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.restore();
}

/** A red map pin head with a dark rim (the thread's anchor). */
export function pinHead(ctx: Ctx, x: number, y: number, pal: Palette, r = 3.4): void {
  withShadow(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = pal.threadRed; ctx.fill(); }, { c: "rgba(58,10,12,.45)", b: 2, x: 0.8, y: 1.4 });
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = pal.threadRedDark; ctx.lineWidth = 0.8; ctx.stroke();
}

/** A station: a punched paper ticket on the line. */
export function stationTicket(ctx: Ctx, x: number, y: number, pal: Palette, scale = 1): void {
  const w = 9 * scale, h = 6.4 * scale;
  withShadow(ctx, () => { ctx.fillStyle = "#FBFBF8"; ctx.fillRect(x - w / 2, y - h / 2, w, h); });
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.beginPath(); ctx.arc(x, y, 1.3 * scale, 0, Math.PI * 2); ctx.fillStyle = pal.threadRed; ctx.fill();
}

export function facilityGlyph(ctx: Ctx, kind: string, x: number, y: number, pal: Palette, small: boolean): void {
  ctx.save();
  if (small && kind === "place_of_worship") {
    ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fillStyle = "#4A4F52"; ctx.fill(); ctx.restore(); return;
  }
  switch (kind) {
    case "school":
      ctx.fillStyle = "#FBFBF8"; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.strokeRect(x - 3, y - 3, 6, 6);
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - 6.5); ctx.lineTo(x + 3, y - 5.3); ctx.lineTo(x, y - 4.1); ctx.fillStyle = pal.ink; ctx.fill(); ctx.lineWidth = 0.6; ctx.stroke();
      break;
    case "place_of_worship": {
      const p = new Path2D(`M${x - 2.4} ${y + 2.6}V${y - 0.6}L${x} ${y - 3.2}L${x + 2.4} ${y - 0.6}V${y + 2.6}Z`);
      ctx.fillStyle = "#4A4F52"; ctx.fill(p); ctx.strokeStyle = "#FBFBF8"; ctx.lineWidth = 0.6; ctx.stroke(p);
      break;
    }
    case "doctors": case "clinic": case "hospital":
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fillStyle = "#FBFBF8"; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y + 2); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); ctx.strokeStyle = "#2F7575"; ctx.lineWidth = 1.4; ctx.stroke();
      break;
    case "institute":
      ctx.beginPath(); ctx.arc(x, y, 4.4, 0, Math.PI * 2); ctx.fillStyle = "#FBFBF8"; ctx.fill(); ctx.strokeStyle = "#9C3B30"; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 2.4, y + 2.2); ctx.lineTo(x - 2.4, y - 0.4); ctx.arc(x, y - 0.4, 2.4, Math.PI, 0); ctx.lineTo(x + 2.4, y + 2.2); ctx.lineWidth = 1; ctx.stroke();
      break;
    default:
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = pal.ink3; ctx.fill();
  }
  ctx.restore();
}

/** A small square number tag with a leader line to its item. */
export function numberTag(ctx: Ctx, x: number, y: number, tx: number, ty: number, text: string, fill: string, ring: string | null, font: string): void {
  ctx.save();
  ctx.strokeStyle = "#1F2A30"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.font = font;
  const w = Math.max(17, ctx.measureText(text).width + 8);
  withShadow(ctx, () => { ctx.fillStyle = fill; ctx.fillRect(tx - w / 2, ty - 7.5, w, 15); });
  if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 1.2; ctx.strokeRect(tx - w / 2, ty - 7.5, w, 15); }
  ctx.fillStyle = "#FAFAF6"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, tx + 0.5, ty + 0.8);
  ctx.restore();
}

/** A rounded route-number pill in the route's colour. */
export function routePill(ctx: Ctx, x: number, y: number, ref: string, colour: string, font: string): void {
  ctx.save();
  ctx.font = font;
  const w = Math.max(14, ctx.measureText(ref).width + 9);
  withShadow(ctx, () => { ctx.beginPath(); ctx.roundRect(x - w / 2, y - 6.5, w, 13, 6.5); ctx.fillStyle = colour; ctx.fill(); });
  ctx.fillStyle = "#FFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ref, x, y + 0.6);
  ctx.restore();
}

export function withAlpha(css: string, a: number): string {
  const [r, g, b] = parseColour(css);
  return `rgba(${r},${g},${b},${a})`;
}
