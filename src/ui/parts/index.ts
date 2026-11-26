// Shared parts for every screen. See README.md in this folder for props.
import "./parts.css";

export { StampButton, TabButton, StitchButton, ThreadButton, CloseButton } from "./Buttons";
export { Ticket, serialOf, ticketScope, type TicketProps, type TicketCard, type TicketScope } from "./Ticket";
export { StrandRow, StrandMeter, strandGoal, strandName, type StrandRowProps, type StrandMeterProps, type StrandRowView } from "./StrandRow";
export { TrustGauge, type TrustGaugeProps } from "./TrustGauge";
export { CurveballSlip, type CurveballSlipProps } from "./CurveballSlip";
export { SourceTag, SourceCard, sourceShort, type SourceTagProps } from "./SourceTag";
export { ConfidenceMark } from "./ConfidenceMark";
export { PaperSheet, type PaperSheetProps } from "./PaperSheet";
export { Tooltip, TipSlip, type TooltipProps } from "./Tooltip";
export { LangToggle } from "./LangToggle";
export { WarnStrip, SevereNotice, Snip } from "./Notice";
export { Icon, cardIcon, ICON_NAMES, type IconName } from "./Icon";
export { strandVars, weaveUrl, YARN_HEX } from "./strands";
export { Pair, OtherLine } from "../../i18n";
