// A small hash router: #/, #/heddiw, #/heddiw/<laCode>, #/yfory, #/llyfr, #/llyfr/<page>[/<id>].
import { createRoot, createSignal } from "solid-js";

export type RouteName = "title" | "heddiw" | "yfory" | "llyfr" | "bwrdd";
export interface Route {
  name: RouteName;
  /** Path parts after the route name. */
  parts: string[];
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const head = parts.shift();
  if (head === "heddiw" || head === "yfory" || head === "llyfr") return { name: head, parts };
  // the board (v2), beside v1: docs/design/v2-board.md
  if (head === "bwrdd") return { name: head, parts };
  return { name: "title", parts: [] };
}

const store = createRoot(() => {
  const [route, setRoute] = createSignal<Route>(typeof location === "undefined" ? { name: "title", parts: [] } : parseHash(location.hash));
  if (typeof window !== "undefined") {
    window.addEventListener("hashchange", () => setRoute(parseHash(location.hash)));
  }
  return { route, setRoute };
});

export const route = store.route;

/** Go to a hash route ("#/heddiw/W06000015"). `replace` avoids a history entry. */
export function navigate(hash: string, replace = false): void {
  const h = hash.startsWith("#") ? hash : `#${hash}`;
  if (location.hash === h) return;
  if (replace) {
    history.replaceState(history.state, "", location.pathname + location.search + h);
    store.setRoute(parseHash(h));
  } else {
    location.hash = h;
  }
}
