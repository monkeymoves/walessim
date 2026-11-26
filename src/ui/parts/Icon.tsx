// Hand-cut icons (design-system section 5): solid silhouettes on a 40 unit grid, straight cuts,
// detail removed with the knife. Cut-outs are holes (even-odd), so the stock beneath shows.
import type { JSX } from "solid-js";

interface Glyph {
  /** Body and cut-outs in one path, filled even-odd. */
  d: string;
  /** Things standing on the land get a ground line. */
  ground?: boolean;
}

const G = "M0 35h40v3H0z";

const GLYPHS = {
  tip: { d: "M2 34 15 9l5 3 4-5 14 27zM13 20l9-2-1 3-10 3zM9 27l19-4 1 3-22 5z", ground: true },
  pit: { d: "M8 35 17 8h6l9 27h-5l-2-7H15l-2 7zM16 24h8l-2-7h-4zM12 2h16v6H12zM18 3.5h4v3h-4z", ground: true },
  chapel: { d: "M6 35V17L20 4l14 13v18zM17 35V27l3-4 3 4v8zM11 19h4v8h-4zM25 19h4v8h-4zM18 11h4v5h-4z", ground: true },
  terrace: { d: "M2 35V21l6-6 6 6 6-6 6 6 6-6 6 6v14zM5 25h4v10H5zM18 25h4v10h-4zM31 25h4v10h-4zM10 8h4v9h-4zM26 8h4v9h-4z", ground: true },
  wind: { d: "M18.5 18h3l1.5 17h-6zM20 17 17 1h4zM21 16l15 7-2 3zM19 16 4 23l2 3z", ground: true },
  river: { d: "M0 14c5-5 9-5 14 0s9 5 13 0 8-5 13 0v6c-5-5-9-5-13 0s-9 5-13 0-9-5-14 0zM0 27c5-5 9-5 14 0s9 5 13 0 8-5 13 0v6c-5-5-9-5-13 0s-9 5-13 0-9-5-14 0z" },
  language: { d: "M3 6h34v24H19l-9 8v-8H3zM9 12h3v12H9zM9 21h8v3H9zM20 12h3v12h-3zM20 21h8v3h-8z" },
  envelope: { d: "M3 9h34v23H3zM7 12l13 10 13-10h-4.5L20 18.6 11.5 12z" },
  railway: { d: "M1 15 20 6l19 9v4H1zM5 19h3v16H5zM32 19h3v16h-3zM14 23h12v12H14zM17 26h6v4h-6z", ground: true },
  school: { d: "M5 35V18L20 9l15 9v17zM17 35v-8h6v8zM9 21h5v5H9zM26 21h5v5h-5zM17.5 3h5v7h-5z", ground: true },
  surgery: { d: "M5 8h30v27H5zM17 12h6v7h7v6h-7v7h-6v-7h-7v-6h7z", ground: true },
  farm: { d: "M6 13h21l4 3h5v7h-4l-3 3v9h-3v-8H14v8h-3v-9l-5-4zM29 16h3v3h-3z", ground: true },
  quarry: { d: "M2 35V29h9v-6h8v-6h8v-6h11v24zM29 14h6v3h-6z", ground: true },
  peat: { d: "M2 35V22h13l3 4h20v9zM9 22 7.5 11h3zM25 26l1-12h3zM6 11h5v3H6zM24 13h6v3h-6z", ground: true },
  bus: { d: "M3 8h34v22h-3v5h-6v-5H12v5H6v-5H3zM7 12h8v7H7zM17 12h7v7h-7zM26 12h7v7h-7z" },
  harbour: { d: "M0 24h27v11H0zM9 17h6v7H9zM8 15h8v3H8zM30 28c3-3 6-3 10 0v3c-4-3-7-3-10 0z" },
  book: { d: "M3 7h15l2 2 2-2h15v25H22l-2 2-2-2H3zM18.5 10h3v20h-3zM7 12h8v2H7zM7 17h8v2H7zM25 12h8v2h-8z" },
  lens: { d: "M3 9l10-3 14 4 10-3v26l-10 3-14-4-10 3zM12 9h2.5v23H12zM26 13h2.5v23H26z" },
  thread: { d: "M7 35 31 5l3 2.5L10 37zM28.5 9.5l2-2.5 1.2 1-2 2.5z" },
  key: { d: "M4 26h26v8H4zM8 18h26v6H8zM12 10h24v6H12z" },
  signal: { d: "M18 5h3v30h-3zM21 7h15l-3 5H21zM15 20h9v3h-9z", ground: true },
  house: { d: "M5 35V18L20 5l15 13v17zM16 35v-9h8v9zM9 20h5v5H9z", ground: true },
  woodland: { d: "M20 2l12 17h-6l9 12H22v4h-4v-4H5l9-12H8z", ground: true },
  works: { d: "M2 35V19l8 5v-5l8 5v-5l8 5V7h6v28zM7 27h4v4H7zM15 27h4v4h-4z", ground: true },
  mast: { d: "M18 10h4l5 25h-4l-3-14-3 14h-4zM9 6l3 2a10 10 0 0 0 0 9l-3 2a14 14 0 0 1 0-13zM31 6l-3 2a10 10 0 0 1 0 9l3 2a14 14 0 0 0 0-13z", ground: true },
  wall: { d: "M2 17h36v18H2zM2 23h36v1.5H2zM2 29h36v1.5H2zM12 17h1.5v6H12zM26 17h1.5v6H26zM19 23.5h1.5v6H19z", ground: true },
  scales: { d: "M18.5 6h3v26h-3zM7 9h26v3H7zM2 22l6-10 6 10a6 4 0 0 1-12 0zM26 22l6-10 6 10a6 4 0 0 1-12 0zM12 32h16v3H12z" },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;
export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
  /** Accessible name; when absent the icon is decorative (aria-hidden). */
  label?: string;
}

export function Icon(props: IconProps): JSX.Element {
  const g = () => GLYPHS[props.name] as Glyph;
  return (
    <svg
      viewBox="0 0 40 40"
      width={props.size ?? 20}
      height={props.size ?? 20}
      class={props.class}
      role={props.label ? "img" : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : "true"}
    >
      <path fill="currentColor" fill-rule="evenodd" d={g().d} />
      {g().ground ? <path fill="currentColor" d={G} /> : null}
    </svg>
  );
}

/** A sensible icon for a card from its id and tags (cards carry no icon field). */
export function cardIcon(card: { id: string; tags?: string[] }): IconName {
  const s = `${card.id} ${(card.tags ?? []).join(" ")}`;
  const rules: [RegExp, IconName][] = [
    [/tip|coal/, "tip"],
    [/peat|upland/, "peat"],
    [/wall/, "wall"],
    [/flood|flow|river/, "river"],
    [/wind|renewable|grid|energy|power/, "wind"],
    [/welsh|iaith|language|childcare/, "language"],
    [/bus|rail|transport/, "railway"],
    [/online|broadband|digital/, "mast"],
    [/warm|retrofit/, "house"],
    [/home|housing/, "terrace"],
    [/health|hospital|care/, "surgery"],
    [/skill|apprentic|school|early/, "school"],
    [/employer|growth|industry|manufactur/, "works"],
    [/farm|nature|land/, "farm"],
    [/tree|wood|forest/, "woodland"],
    [/tourism|visitor|port|harbour/, "harbour"],
    [/compact|cooperation|partner/, "scales"],
    [/borrow|debt|defer|maintenance/, "book"],
  ];
  for (const [re, name] of rules) if (re.test(s)) return name;
  return "signal";
}
