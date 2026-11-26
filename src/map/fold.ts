// The fold between scales, as in the Papur v2 mockup: the national sheet
// creases through the place and its two halves fold away while the place
// relief settles in; folding up runs it backwards. About 1.2 s; instant with
// reduced motion.

export const FOLD_MS = 1200;
const EASE_DOWN = "cubic-bezier(.55,0,.25,1)";
const EASE_UP = "cubic-bezier(.45,0,.2,1)";

interface Halves { layer: HTMLDivElement; halves: HTMLDivElement[] }

/** Two halves of a snapshot of `src`, creased at x = creaseX (CSS px). */
function snapshotHalves(root: HTMLElement, src: HTMLCanvasElement, W: number, H: number, creaseX: number): Halves {
  const layer = document.createElement("div");
  Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "5", pointerEvents: "none", transformStyle: "preserve-3d" });
  const halves = (["l", "r"] as const).map((side) => {
    const half = document.createElement("div");
    Object.assign(half.style, {
      position: "absolute", top: "0", bottom: "0", overflow: "hidden", backfaceVisibility: "hidden",
      transformStyle: "preserve-3d", boxShadow: "0 0 30px rgba(0,0,0,.25)",
    });
    if (side === "l") Object.assign(half.style, { left: "0", width: `${creaseX}px`, transformOrigin: "100% 50%" });
    else Object.assign(half.style, { left: `${creaseX}px`, right: "0", transformOrigin: "0 50%" });
    const c = document.createElement("canvas");
    c.width = src.width; c.height = src.height;
    Object.assign(c.style, { position: "absolute", top: "0", left: `${side === "l" ? 0 : -creaseX}px`, width: `${W}px`, height: `${H}px` });
    c.getContext("2d")!.drawImage(src, 0, 0);
    const shade = document.createElement("div");
    Object.assign(shade.style, {
      position: "absolute", inset: "0", opacity: "0",
      background: side === "l" ? "linear-gradient(90deg,rgba(255,255,255,.15),rgba(20,25,25,.55))" : "linear-gradient(90deg,rgba(20,25,25,.55),rgba(255,255,255,.1))",
    });
    shade.dataset.shade = "1";
    half.append(c, shade);
    layer.appendChild(half);
    return half;
  });
  root.appendChild(layer);
  return { layer, halves };
}

const done = (anims: Animation[]) => Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined);

/**
 * Folds the national sheet away into the place. `origin` is the crease point in CSS px
 * (the place on the national map). Resolves when the place view is settled.
 */
export async function foldDown(root: HTMLElement, national: HTMLCanvasElement, place: HTMLCanvasElement, W: number, H: number, origin: [number, number], reduced: boolean): Promise<void> {
  if (reduced || typeof Element.prototype.animate !== "function") return;
  const { layer, halves } = snapshotHalves(root, national, W, H, Math.max(1, Math.min(W - 1, origin[0])));
  layer.style.transformOrigin = `${origin[0]}px ${origin[1]}px`;
  const anims = [
    layer.animate([{ transform: "scale(1)" }, { transform: "scale(2.6)" }], { duration: FOLD_MS, easing: EASE_DOWN, fill: "forwards" }),
    halves[0]!.animate([{ transform: "rotateY(0deg)", opacity: 1 }, { transform: "rotateY(0deg)", opacity: 1, offset: 0.12 }, { transform: "rotateY(80deg)", opacity: 1, offset: 0.8 }, { transform: "rotateY(100deg)", opacity: 0 }], { duration: FOLD_MS, easing: EASE_DOWN, fill: "forwards" }),
    halves[1]!.animate([{ transform: "rotateY(0deg)", opacity: 1 }, { transform: "rotateY(0deg)", opacity: 1, offset: 0.12 }, { transform: "rotateY(-80deg)", opacity: 1, offset: 0.8 }, { transform: "rotateY(-100deg)", opacity: 0 }], { duration: FOLD_MS, easing: EASE_DOWN, fill: "forwards" }),
    ...halves.map((h) => h.querySelector<HTMLElement>("[data-shade]")!.animate([{ opacity: 0 }, { opacity: 0.9 }], { duration: FOLD_MS - 100, easing: "ease-in", fill: "forwards" })),
    place.animate([{ opacity: 0, transform: "translateY(-16px) scale(1.035)" }, { opacity: 1, transform: "none" }], { duration: 820, delay: 420, easing: "cubic-bezier(.2,.75,.25,1)", fill: "backwards" }),
  ];
  await done(anims);
  layer.remove();
}

/** Folds the national sheet back up over the place. `national` must already show the national map. */
export async function foldUp(root: HTMLElement, national: HTMLCanvasElement, place: HTMLCanvasElement, W: number, H: number, origin: [number, number], reduced: boolean): Promise<void> {
  if (reduced || typeof Element.prototype.animate !== "function") return;
  const { layer, halves } = snapshotHalves(root, national, W, H, Math.max(1, Math.min(W - 1, origin[0])));
  layer.style.transformOrigin = `${origin[0]}px ${origin[1]}px`;
  national.style.visibility = "hidden";
  const D = FOLD_MS - 50;
  const anims = [
    place.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-18px) scale(.96)" }], { duration: 520, easing: "ease-in", fill: "forwards" }),
    layer.animate([{ transform: "scale(2.6)" }, { transform: "scale(1)" }], { duration: D, easing: EASE_UP, fill: "forwards" }),
    halves[0]!.animate([{ transform: "rotateY(100deg)", opacity: 0 }, { transform: "rotateY(80deg)", opacity: 1, offset: 0.2 }, { transform: "rotateY(0deg)", opacity: 1 }], { duration: D, easing: EASE_UP, fill: "forwards" }),
    halves[1]!.animate([{ transform: "rotateY(-100deg)", opacity: 0 }, { transform: "rotateY(-80deg)", opacity: 1, offset: 0.2 }, { transform: "rotateY(0deg)", opacity: 1 }], { duration: D, easing: EASE_UP, fill: "forwards" }),
    ...halves.map((h) => h.querySelector<HTMLElement>("[data-shade]")!.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: D, easing: "ease-out", fill: "forwards" })),
  ];
  await done(anims);
  national.style.visibility = "";
  place.getAnimations().forEach((a) => a.cancel());
  layer.remove();
}
