"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface NominatimResult {
  display_name: string;
}

export function AddressAutocomplete({ value, onChange, placeholder }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data.map((r) => r.display_name));
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 500);
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value.slice(0, 200))}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-input bg-background px-3 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
        maxLength={200}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => handleSelect(s)}
              className={`px-3 py-2.5 text-[13px] cursor-pointer transition-colors ${
                i === activeIndex ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
