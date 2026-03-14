"use client";

import { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** "form" = full-width input style, "compact" = small pill style */
  variant?: "form" | "compact";
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  variant = "form",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label || placeholder || "Select...";
  const isPlaceholder = !selected;

  const isCompact = variant === "compact";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          isCompact
            ? `flex items-center gap-1 bg-background rounded-full pl-3 pr-2 py-1.5 text-[13px] font-semibold cursor-pointer shadow-sm hover:bg-muted/80 transition-colors`
            : `w-full flex items-center justify-between rounded-xl border border-input bg-background px-3 py-3 text-[15px] cursor-pointer transition-colors hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring ${
                isPlaceholder ? "text-muted-foreground" : "text-foreground"
              }`
        }
      >
        <span className={isCompact ? "" : "truncate"}>{displayLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={isCompact ? 12 : 16}
          height={isCompact ? 12 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted-foreground shrink-0 transition-transform ${isCompact ? "" : "ml-2"} ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-background border border-border rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-150 ${
            isCompact
              ? "top-full left-0 mt-1.5 min-w-[90px]"
              : "top-full left-0 right-0 mt-1.5 max-h-[240px] overflow-y-auto"
          }`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[13px] font-medium transition-colors ${
                o.value === value
                  ? "text-green-700 bg-green-50"
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
