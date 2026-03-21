/**
 * Global theme config — single source of truth for section colors.
 * Change a value here and it propagates everywhere.
 */

export const theme = {
  pickup: {
    bg: "bg-green-50/40 dark:bg-green-950/10",
    cardActive: "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/20",
    button: "bg-green-600 hover:bg-green-700 text-white",
    buttonOutline: "border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30 dark:hover:border-green-600",
    accent: "text-green-600 dark:text-green-400",
    accentBold: "text-green-600 dark:text-green-400 font-bold",
    badge: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-800",
    rowHighlight: "bg-green-50/60 hover:bg-green-50 dark:bg-green-950/20 dark:hover:bg-green-950/30",
    rowExpanded: "bg-green-100/80 dark:bg-green-950/30",
    rowDetail: "bg-green-50/40 dark:bg-green-950/20",
    dot: "bg-green-500",
    toggle: "bg-green-600",
  },
  ladder: {
    bg: "bg-sky-50/40 dark:bg-sky-950/10",
    cardActive: "border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/20",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
    buttonOutline: "border-sky-300 text-sky-700 hover:bg-sky-50 hover:border-sky-400 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30 dark:hover:border-sky-600",
    accent: "text-sky-600 dark:text-sky-400",
    accentBold: "text-sky-600 dark:text-sky-400 font-bold",
    badge: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/40 dark:border-sky-800",
    rowHighlight: "bg-sky-50/60 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/30",
    rowExpanded: "bg-sky-100/80 dark:bg-sky-950/30",
    rowDetail: "bg-sky-50/40 dark:bg-sky-950/20",
    dot: "bg-sky-500",
    toggle: "bg-sky-600",
  },
  doubles: {
    bg: "bg-amber-50/40 dark:bg-amber-950/10",
    cardActive: "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
    buttonOutline: "border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 dark:hover:border-amber-600",
    accent: "text-amber-600 dark:text-amber-400",
    accentBold: "text-amber-600 dark:text-amber-400 font-bold",
    badge: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    rowHighlight: "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
    rowExpanded: "bg-amber-100/80 dark:bg-amber-950/30",
    rowDetail: "bg-amber-50/40 dark:bg-amber-950/20",
    dot: "bg-amber-500",
    toggle: "bg-amber-600",
  },
  // Semantic colors (shared across sections)
  win: "text-green-600 dark:text-green-400",
  winBold: "text-green-600 dark:text-green-400 font-bold",
  loss: "text-red-500 dark:text-red-400",
  lossBold: "text-red-500 dark:text-red-400 font-bold",
} as const;

export type ThemeSection = { [K in keyof typeof theme.ladder]: string };

/** Returns the theme for a given match mode — sky for singles, amber for doubles. */
export function modeTheme(mode: "singles" | "doubles"): ThemeSection {
  return mode === "doubles" ? theme.doubles : theme.ladder;
}
