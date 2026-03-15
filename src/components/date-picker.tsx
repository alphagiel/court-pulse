"use client";

import { useState, useRef, useEffect } from "react";
import { useDailyWeather, weatherIcon } from "@/lib/use-weather";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Park latitude for weather (defaults to Raleigh) */
  lat?: number;
  /** Park longitude for weather (defaults to Raleigh) */
  lng?: number;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "Select a date...";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getDaysBetween(min: Date, max: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(min);
  current.setHours(0, 0, 0, 0);
  const end = new Date(max);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function DatePicker({ value, onChange, minDate, maxDate, lat, lng }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const forecasts = useDailyWeather(open, lat, lng);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const days = getDaysBetween(minDate || new Date(), maxDate || new Date());

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl border border-input bg-background px-3 py-3 text-[15px] cursor-pointer transition-colors hover:border-foreground/20 ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span>{formatDisplay(value)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-background border border-border rounded-xl shadow-lg p-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-5 gap-1.5">
            {days.map((day) => {
              const dateStr = toDateStr(day);
              const isSelected = dateStr === value;
              const today = isToday(day);
              const forecast = forecasts.get(dateStr);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : today
                        ? "border-sky-300 bg-sky-50 hover:bg-sky-100"
                        : "border-border/60 hover:bg-muted hover:border-foreground/20"
                  }`}
                >
                  <span className={`text-[10px] font-medium leading-tight ${isSelected ? "text-sky-100" : "text-muted-foreground"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-[15px] font-bold leading-tight mt-0.5">{day.getDate()}</span>
                  {forecast ? (
                    <div className={`flex items-center gap-0.5 mt-1 ${isSelected ? "opacity-80" : "opacity-50"}`}>
                      <span className="text-[10px] leading-none">{weatherIcon(forecast.weatherCode)}</span>
                      <span className={`text-[9px] font-medium leading-none ${isSelected ? "text-sky-100" : "text-muted-foreground"}`}>
                        {forecast.tempHigh}°
                      </span>
                    </div>
                  ) : (
                    <div className="h-3.5 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
