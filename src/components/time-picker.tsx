"use client";

import { useState, useRef, useEffect } from "react";

interface TimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
  /** Selected date in "YYYY-MM-DD" format — used to fetch hourly weather */
  date?: string;
}

const TIME_SLOTS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00",
];

interface HourlyForecast {
  temp: number;
  weatherCode: number;
}

function formatTimeDisplay(time: string): string {
  if (!time) return "Select a time...";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "☁️";
  if (code <= 57) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

export function TimePicker({ value, onChange, date }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hourly, setHourly] = useState<Map<string, HourlyForecast>>(new Map());
  const ref = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const fetchedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll to selected time when opened
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [open]);

  // Fetch hourly weather for the selected date
  useEffect(() => {
    if (!open || !date || fetchedDateRef.current === date) return;
    fetchedDateRef.current = date;

    const lat = 35.7796;
    const lng = -78.6382;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.hourly) return;
        const map = new Map<string, HourlyForecast>();
        for (let i = 0; i < data.hourly.time.length; i++) {
          // data.hourly.time[i] is like "2026-03-14T06:00"
          const hour = data.hourly.time[i].split("T")[1]; // "06:00"
          map.set(hour, {
            temp: Math.round(data.hourly.temperature_2m[i]),
            weatherCode: data.hourly.weather_code[i],
          });
        }
        setHourly(map);
      })
      .catch(() => {});
  }, [open, date]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl border border-input bg-background px-3 py-3 text-[15px] cursor-pointer transition-colors hover:border-foreground/20 ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span>{formatTimeDisplay(value)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-background border border-border rounded-xl shadow-lg py-1.5 max-h-[240px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {TIME_SLOTS.map((slot) => {
            const isSelected = slot === value;
            // For :30 slots, use the :00 hour's weather
            const hourKey = slot.endsWith(":30") ? slot.replace(":30", ":00") : slot;
            const forecast = hourly.get(hourKey);

            return (
              <button
                key={slot}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => { onChange(slot); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isSelected
                    ? "text-sky-700 bg-sky-50"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <span>{formatTimeDisplay(slot)}</span>
                {forecast && (
                  <span className="flex items-center gap-1 text-muted-foreground opacity-60">
                    <span className="text-[11px]">{weatherIcon(forecast.weatherCode)}</span>
                    <span className="text-[11px]">{forecast.temp}°</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
