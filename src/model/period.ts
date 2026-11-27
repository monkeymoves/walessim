// A data period as the reader's language says it (cold playtest 6, Welsh: "ONS, Jul 2025 to Jun 2026"
// in Cymraeg mode). The pipeline writes periods in English ("Jul 2025 to Jun 2026", "2015 to 2025",
// "WIMD 2025"); in Welsh the months, "to" and the deprivation index's name are given in Welsh.
const CY_MONTHS: Record<string, string> = {
  Jan: "Ion", Feb: "Chwef", Mar: "Maw", Apr: "Ebr", May: "Mai", Jun: "Meh",
  Jul: "Gorff", Aug: "Awst", Sep: "Medi", Oct: "Hyd", Nov: "Tach", Dec: "Rhag",
};

export function periodIn(lang: "en" | "cy", period: string): string {
  if (lang !== "cy") return period;
  return period
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => CY_MONTHS[m] ?? m)
    .replace(/ to /g, " i ")
    .replace(/\bWIMD\b/g, "MAALlC");
}
