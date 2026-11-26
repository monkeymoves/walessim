// Etifeddiaeth: entry point. Styles first (fonts, tokens, base), then the app shell.
import "./styles";
import { render } from "solid-js/web";
import { App } from "./ui/shell/App";

const root = document.getElementById("app");
if (root) render(() => <App />, root);
