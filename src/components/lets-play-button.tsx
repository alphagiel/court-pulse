"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { Park } from "@/types/database";

interface LetsPlayButtonProps {
  onPress: (parkId: string, targetTime: string | null) => void;
  onCancel: () => void;
  isActive: boolean;
  loading: boolean;
  activeTargetLabel: string | null;
  activeParkName: string | null;
  expiresAt: string | null;
  parks: Park[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getAvailableHours(): { label: string; value: string | null }[] {
  const now = new Date();
  const currentHour = now.getHours();
  const closingHour = 21; // 9 PM

  const slots: { label: string; value: string | null }[] = [
    { label: "Now", value: null },
  ];

  for (let h = currentHour + 1; h <= closingHour; h++) {
    const date = new Date();
    date.setHours(h, 0, 0, 0);
    const label = h === 0 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
    slots.push({ label, value: date.toISOString() });
  }

  return slots;
}

export function LetsPlayButton({
  onPress,
  onCancel,
  isActive,
  loading,
  activeTargetLabel,
  activeParkName,
  expiresAt,
  parks,
}: LetsPlayButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const availableHours = useMemo(() => getAvailableHours(), []);

  const expiresAtFormatted = expiresAt ? formatTime(new Date(expiresAt)) : null;

  const handleMainTap = () => {
    if (isActive) {
      onCancel();
      setPickerOpen(false);
      setSelectedParkId(null);
    } else {
      setPickerOpen(!pickerOpen);
      setSelectedParkId(null);
    }
  };

  const handleParkTap = (parkId: string) => {
    setSelectedParkId(parkId);
  };

  const handleSlotTap = (value: string | null) => {
    if (!selectedParkId) return;
    onPress(selectedParkId, value);
    setPickerOpen(false);
    setSelectedParkId(null);
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleMainTap}
        disabled={loading}
        size="lg"
        className={`w-full py-8 rounded-xl transition-all flex flex-col items-center gap-1 ${
          isActive
            ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25"
            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
        }`}
      >
        <span className="text-[17px] font-semibold leading-tight">
          {loading
            ? "Sending..."
            : isActive
              ? "You're Down to Play!"
              : "I'm Down to Play"}
        </span>
        {!loading && (
          <span className="text-[12px] font-normal opacity-80 leading-tight">
            {isActive
              ? `${activeParkName || "Park"} · ${activeTargetLabel || "Now"} · Until ${expiresAtFormatted || "..."} · Tap to cancel`
              : "Tap to pick a court"}
          </span>
        )}
      </Button>

      {/* Step 1: Park picker */}
      {pickerOpen && !isActive && !selectedParkId && (
        <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
          <p className="text-[12px] text-muted-foreground text-center">Where are you playing?</p>
          <div className="flex flex-col gap-2">
            {parks.map((park) => (
              <button
                key={park.id}
                onClick={() => handleParkTap(park.id)}
                className="px-4 py-2.5 rounded-lg border border-border/50 bg-background text-[13px] font-medium hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors text-left"
              >
                {park.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Hour picker */}
      {pickerOpen && !isActive && selectedParkId && (
        <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
          <p className="text-[12px] text-muted-foreground text-center">
            {parks.find((p) => p.id === selectedParkId)?.name} — When are you free?
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {availableHours.map((slot) => (
              <button
                key={slot.label}
                onClick={() => handleSlotTap(slot.value)}
                className="shrink-0 px-4 py-2 rounded-lg border border-border/50 bg-background text-[13px] font-medium hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
