/**
 * Global theme config — single source of truth for section colors.
 * Change a value here and it propagates everywhere.
 */

export const theme = {
  pickup: {
    bg: "bg-green-50/40 dark:bg-green-950/10",
    cardActive: "border-green-400 bg-green-50 dark:bg-green-950/20",
    button: "bg-green-600 hover:bg-green-700 text-white",
    buttonOutline: "border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400",
    accent: "text-green-600",
    accentBold: "text-green-600 font-bold",
    badge: "text-green-700 bg-green-50 border-green-200",
    rowHighlight: "bg-green-50/60 hover:bg-green-50",
    rowExpanded: "bg-green-100/80",
    rowDetail: "bg-green-50/40",
    dot: "bg-green-500",
    toggle: "bg-green-600",
  },
  ladder: {
    bg: "bg-sky-50/40 dark:bg-sky-950/10",
    cardActive: "border-sky-400 bg-sky-50 dark:bg-sky-950/20",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
    buttonOutline: "border-sky-300 text-sky-700 hover:bg-sky-50 hover:border-sky-400",
    accent: "text-sky-600",
    accentBold: "text-sky-600 font-bold",
    badge: "text-sky-700 bg-sky-50 border-sky-200",
    rowHighlight: "bg-sky-50/60 hover:bg-sky-50",
    rowExpanded: "bg-sky-100/80",
    rowDetail: "bg-sky-50/40",
    dot: "bg-sky-500",
    toggle: "bg-sky-600",
  },
  // Semantic colors (shared across sections)
  win: "text-green-600",
  winBold: "text-green-600 font-bold",
  loss: "text-red-500",
  lossBold: "text-red-500 font-bold",
} as const;
