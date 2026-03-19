"use client";

import { useState, useEffect } from "react";

// Raleigh, NC — default for Triangle-area app
const LAT = 35.7796;
const LNG = -78.6382;

interface DayForecast {
  date: Date;
  high: number;
  low: number;
  code: number; // WMO weather code
}

// WMO weather codes → icon + label
function weatherInfo(code: number): { icon: React.ReactNode; label: string } {
  // Clear
  if (code === 0) return { icon: <SunIcon />, label: "Clear" };
  // Partly cloudy
  if (code <= 2) return { icon: <PartlyCloudyIcon />, label: "Partly cloudy" };
  // Overcast
  if (code === 3) return { icon: <CloudIcon />, label: "Overcast" };
  // Fog
  if (code <= 48) return { icon: <CloudIcon />, label: "Foggy" };
  // Drizzle
  if (code <= 57) return { icon: <DrizzleIcon />, label: "Drizzle" };
  // Rain
  if (code <= 67) return { icon: <RainIcon />, label: "Rain" };
  // Snow
  if (code <= 77) return { icon: <SnowIcon />, label: "Snow" };
  // Showers
  if (code <= 82) return { icon: <RainIcon />, label: "Showers" };
  // Snow showers
  if (code <= 86) return { icon: <SnowIcon />, label: "Snow showers" };
  // Thunderstorm
  return { icon: <ThunderIcon />, label: "Thunderstorm" };
}

function dayLabel(date: Date, index: number): string {
  if (index === 0) return "Today";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function WeatherForecast() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=7`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.daily) {
          const days: DayForecast[] = data.daily.time.map((t: string, i: number) => ({
            date: new Date(t + "T12:00:00"),
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            code: data.daily.weather_code[i],
          }));
          setForecast(days);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[88px] h-[100px] rounded-xl bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (forecast.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] text-muted-foreground font-medium tracking-wide uppercase">
          7-Day Forecast — Raleigh
        </p>
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          Open-Meteo
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {forecast.map((day, i) => {
          const isToday = i === 0;
          const { icon, label } = weatherInfo(day.code);
          return (
            <div
              key={day.date.toISOString()}
              title={label}
              className={`flex-shrink-0 w-[88px] rounded-xl border p-2.5 flex flex-col gap-1.5 transition-colors ${
                isToday
                  ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                  : "border-border bg-muted/40"
              }`}
            >
              {/* Header: date number + day name */}
              <div className="flex items-baseline justify-between">
                <span className={`text-[15px] font-bold ${isToday ? "text-amber-700 dark:text-amber-400" : ""}`}>
                  {day.date.getDate()}
                </span>
                <span className={`text-[11px] ${isToday ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                  {dayLabel(day.date, i)}
                </span>
              </div>
              {/* Icon */}
              <div className="flex justify-center py-0.5">
                {icon}
              </div>
              {/* Temps */}
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-[15px] font-bold">{day.high}°</span>
                <span className="text-[12px] text-muted-foreground">{day.low}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Weather SVG Icons (32x32, warm tones matching the screenshot) ---

function SunIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="7" fill="#F59E0B" />
      <g stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="2" x2="16" y2="5" />
        <line x1="16" y1="27" x2="16" y2="30" />
        <line x1="2" y1="16" x2="5" y2="16" />
        <line x1="27" y1="16" x2="30" y2="16" />
        <line x1="6.1" y1="6.1" x2="8.2" y2="8.2" />
        <line x1="23.8" y1="23.8" x2="25.9" y2="25.9" />
        <line x1="6.1" y1="25.9" x2="8.2" y2="23.8" />
        <line x1="23.8" y1="8.2" x2="25.9" y2="6.1" />
      </g>
    </svg>
  );
}

function PartlyCloudyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="12" r="6" fill="#F59E0B" />
      <g stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
        <line x1="20" y1="2" x2="20" y2="4" />
        <line x1="28" y1="12" x2="30" y2="12" />
        <line x1="25.7" y1="6.3" x2="27.1" y2="4.9" />
        <line x1="25.7" y1="17.7" x2="27.1" y2="19.1" />
      </g>
      <path d="M8 26h14a5 5 0 0 0 .5-9.97A7 7 0 0 0 9 18a5 5 0 0 0-1 9.9Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 25h16a6 6 0 0 0 1-11.93A8 8 0 0 0 9 16a6 6 0 0 0-1 9Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
    </svg>
  );
}

function DrizzleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 21h14a5 5 0 0 0 .5-9.97A7 7 0 0 0 9 13a5 5 0 0 0-1 8Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
      <g stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round">
        <line x1="11" y1="24" x2="11" y2="26" />
        <line x1="16" y1="24" x2="16" y2="26" />
        <line x1="21" y1="24" x2="21" y2="26" />
      </g>
    </svg>
  );
}

function RainIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 20h14a5 5 0 0 0 .5-9.97A7 7 0 0 0 9 12a5 5 0 0 0-1 8Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
      <g stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round">
        <line x1="10" y1="23" x2="9" y2="27" />
        <line x1="15" y1="23" x2="14" y2="27" />
        <line x1="20" y1="23" x2="19" y2="27" />
        <line x1="25" y1="23" x2="24" y2="27" />
      </g>
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 20h14a5 5 0 0 0 .5-9.97A7 7 0 0 0 9 12a5 5 0 0 0-1 8Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
      <g fill="#93C5FD">
        <circle cx="11" cy="24" r="1.5" />
        <circle cx="16" cy="26" r="1.5" />
        <circle cx="21" cy="24" r="1.5" />
        <circle cx="13.5" cy="28" r="1" />
        <circle cx="18.5" cy="28" r="1" />
      </g>
    </svg>
  );
}

function ThunderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 19h14a5 5 0 0 0 .5-9.97A7 7 0 0 0 9 11a5 5 0 0 0-1 8Z" fill="#94A3B8" stroke="#64748B" strokeWidth="0.5" />
      <path d="M16 21l-2 5h4l-2 5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
