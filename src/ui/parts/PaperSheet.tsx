// A sheet of cartridge paper: square cut, lit north-west lip, hard shadow to the south-east.
// Height says what it is doing: flat (glued down), sheet (resting), lifted, held (open drawer).
import { splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface PaperSheetProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: string;
  height?: "flat" | "sheet" | "lifted" | "held";
  /** Paper stock: cartridge (default), second sheet, tracing paper for Yfory. */
  stock?: "paper" | "paper-2" | "yfory";
}

export function PaperSheet(props: PaperSheetProps): JSX.Element {
  const [own, rest] = splitProps(props, ["as", "height", "stock", "class", "children"]);
  return (
    <Dynamic
      component={own.as ?? "div"}
      {...rest}
      class={`papersheet h-${own.height ?? "sheet"} stock-${own.stock ?? "paper"}${own.class ? " " + own.class : ""}`}
    >
      {own.children}
    </Dynamic>
  );
}
