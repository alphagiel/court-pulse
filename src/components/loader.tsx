"use client";

/**
 * Themed loader — spinning ring in the app's green accent.
 *
 * Variants:
 *  - "page"   → centered full-screen (for page-level loading)
 *  - "inline" → compact, fits inside a section (for partial loading)
 */
export function Loader({
  variant = "page",
  label,
}: {
  variant?: "page" | "inline";
  label?: string;
}) {
  const spinner = (
    <svg
      className="w-8 h-8 animate-[spin_1.1s_cubic-bezier(0.4,0,0.2,1)_infinite]"
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Track */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-green-500/15"
      />
      {/* Arc */}
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-green-500"
      />
    </svg>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        {spinner}
        {label && (
          <p className="text-[13px] text-muted-foreground">{label}</p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      {spinner}
      {label && (
        <p className="text-[13px] text-muted-foreground">{label}</p>
      )}
    </main>
  );
}
