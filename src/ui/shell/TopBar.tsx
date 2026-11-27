// The top bar: the year slot (the one loud thing), the three ways round the app, an open
// middle (strands and Trust in Yfory), the modified rule set notice, and the language toggle.
// UI lead B renders this bar in the game with `year` and `middle` filled.
import { For, Show, type JSX } from "solid-js";
import { Pair, t, textOf } from "../../i18n";
import { LangToggle } from "../parts";
import { ModifiedBadge } from "./ModifiedBadge";
import { route, type RouteName } from "./router";

export interface TopBarProps {
  /** The year slot. Pass `year` for the big Besley figure, or `slot` for anything else. */
  year?: number | string;
  /** One or two lines beside the year ("Term 2, the 2030s"). */
  yearNote?: JSX.Element;
  slot?: JSX.Element;
  /** Fills the space between the nav and the language toggle (strand row, Trust). */
  middle?: JSX.Element;
  /** Hide the nav (in play, where the space goes to the strands). */
  hideNav?: boolean;
}

const NAV: { id: RouteName; href: string; key: string }[] = [
  { id: "heddiw", href: "#/heddiw", key: "shell.nav.heddiw" },
  { id: "yfory", href: "#/yfory", key: "shell.nav.yfory" },
  { id: "llyfr", href: "#/llyfr", key: "shell.nav.llyfr" },
];

export function TopBar(props: TopBarProps): JSX.Element {
  return (
    <header class="topbar">
      <Show when={route().name !== "title"}>
        <a class="topbar-home" href="#/" title={t("shell.home")} data-testid="home">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M3 9.5 10 3l7 6.5M5 8v9h4v-5h2v5h4V8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          </svg>
          <span>{t("shell.home_short")}</span>
        </a>
      </Show>
      <div class="topbar-slot">
        <Show
          when={props.slot}
          fallback={
            <Show
              when={props.year != null}
              fallback={
                <a class="wordmark" href="#/" title={t("shell.home")}>
                  <span class="wordmark-name" lang="cy">Etifeddiaeth</span>
                  <span class="wordmark-sub">{t("shell.subtitle")}</span>
                </a>
              }
            >
              <span class="t-year topbar-year">{props.year}</span>
              <span class="topbar-yearnote">{props.yearNote}</span>
            </Show>
          }
        >
          {props.slot}
        </Show>
      </div>
      <Show when={!props.hideNav}>
        <nav class="topnav well" aria-label={t("shell.nav.label")}>
          <For each={NAV}>
            {(n) => (
              <a class="topnav-tab" href={n.href} aria-current={route().name === n.id ? "page" : undefined}>
                <Pair text={textOf(n.key)} class="topnav-pair" />
              </a>
            )}
          </For>
        </nav>
      </Show>
      <div class="topbar-middle">{props.middle}</div>
      <ModifiedBadge />
      <LangToggle class="topbar-lang" />
    </header>
  );
}
