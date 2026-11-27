// The one-line key for sharp and fuzzy, drawn with the same marks as the yarn's end: a knot
// for sharp, a loose fringe for fuzzy.
import type { JSX } from "solid-js";
import { t } from "../../i18n";

export function KnotMark(props: { sharp: boolean }): JSX.Element {
  return props.sharp ? (
    <svg class="yf-knot" viewBox="0 0 10 12" width="10" height="12" aria-hidden="true"><path fill="currentColor" d="M5 0l5 6-5 6-5-6z" /></svg>
  ) : (
    <svg class="yf-fringe" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path fill="currentColor" d="M0 1h12l-3 1.5H0zM0 4.5h9l3 1.5H0zM0 8h12l-4 1.5H0z" />
    </svg>
  );
}

export function SharpKey(): JSX.Element {
  return (
    <p class="yf-sharpkey small">
      <KnotMark sharp />
      <KnotMark sharp={false} />
      <span>{t("game.sharpkey.line")}</span>
    </p>
  );
}
