"use client";

import { useState, useEffect, useRef } from "react";

export interface HourlyForecast {
  temp: number;
  weatherCode: number;
}

export interface DayForecast {
  date: string;
  tempHigh: number;
  weatherCode: number;
}

// Default: Raleigh, NC
const DEFAULT_LAT = 35.7796;
const DEFAULT_LNG = -78.6382;

/** WMO weather code → emoji */
export function weatherIcon(code: number): string {
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

/**
 * Fetch hourly weather for a given date and location.
 * Returns a Map keyed by "HH:00" → { temp, weatherCode }.
 */
export function useHourlyWeather(
  date: string | undefined,
  enabled: boolean,
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG,
) {
  const [hourly, setHourly] = useState<Map<string, HourlyForecast>>(new Map());
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !date) return;
    const key = `${lat},${lng},${date}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.hourly) return;
        const map = new Map<string, HourlyForecast>();
        for (let i = 0; i < data.hourly.time.length; i++) {
          const hour = data.hourly.time[i].split("T")[1]; // "06:00"
          map.set(hour, {
            temp: Math.round(data.hourly.temperature_2m[i]),
            weatherCode: data.hourly.weather_code[i],
          });
        }
        setHourly(map);
      })
      .catch(() => {});
  }, [enabled, date, lat, lng]);

  return hourly;
}

/**
 * Fetch daily weather forecasts for a location (16 days).
 * Returns a Map keyed by "YYYY-MM-DD" → { date, tempHigh, weatherCode }.
 */
export function useDailyWeather(
  enabled: boolean,
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG,
) {
  const [forecasts, setForecasts] = useState<Map<string, DayForecast>>(new Map());
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const key = `${lat},${lng}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=16`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.daily) return;
        const map = new Map<string, DayForecast>();
        for (let i = 0; i < data.daily.time.length; i++) {
          map.set(data.daily.time[i], {
            date: data.daily.time[i],
            tempHigh: Math.round(data.daily.temperature_2m_max[i]),
            weatherCode: data.daily.weather_code[i],
          });
        }
        setForecasts(map);
      })
      .catch(() => {});
  }, [enabled, lat, lng]);

  return forecasts;
}
