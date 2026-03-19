"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { theme } from "@/lib/theme";
import type { Park } from "@/types/database";

const L = theme.ladder;

interface EditProposalModalProps {
  proposalId: string;
  mode: "singles" | "doubles";
  currentParkId: string;
  currentTime: string; // ISO string
  currentMessage: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProposalModal({
  proposalId,
  mode,
  currentParkId,
  currentTime,
  currentMessage,
  onClose,
  onSaved,
}: EditProposalModalProps) {
  const isDoubles = mode === "doubles";

  // Parse current date/time from ISO
  const currentDate = new Date(currentTime);
  const initDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  const initTime = `${String(currentDate.getHours()).padStart(2, "0")}:${String(currentDate.getMinutes()).padStart(2, "0")}`;

  const [parkId, setParkId] = useState(currentParkId);
  const [date, setDate] = useState(initDate);
  const [time, setTime] = useState(initTime);
  const [message, setMessage] = useState(currentMessage || "");
  const [parks, setParks] = useState<Park[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("parks").select("*").order("name").then(({ data }) => {
      if (data) setParks(data);
    });
  }, []);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const maxDateStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        message: message.trim() || null,
      };

      if (!isDoubles) {
        updates.proposed_time = new Date(`${date}T${time}:00`).toISOString();
        updates.park_id = parkId;
      }

      await supabase
        .from("proposals")
        .update(updates)
        .eq("id", proposalId);

      onSaved();
      onClose();
    } catch (err) {
      console.error("Edit proposal error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Check if anything actually changed
  const hasChanges = isDoubles
    ? message.trim() !== (currentMessage || "")
    : (
        message.trim() !== (currentMessage || "") ||
        parkId !== currentParkId ||
        date !== initDate ||
        time !== initTime
      );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[85vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Edit Proposal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Doubles warning */}
          {isDoubles && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1">
              <p className="text-[13px] font-medium text-amber-800">Only the note can be edited</p>
              <p className="text-[12px] text-amber-700 leading-snug">
                Changing the date, time, or court for doubles causes scheduling conflicts with participants. Email everyone first if you need to adjust.
              </p>
            </div>
          )}

          {/* Park (singles only) */}
          {!isDoubles && (
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Court</label>
              <Dropdown
                value={parkId}
                onChange={setParkId}
                options={parks.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select a court..."
              />
            </div>
          )}

          {/* Date (singles only) */}
          {!isDoubles && (
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Date</label>
              <DatePicker
                value={date}
                onChange={setDate}
                minDate={new Date(todayStr + "T00:00:00")}
                maxDate={new Date(maxDateStr + "T00:00:00")}
              />
            </div>
          )}

          {/* Time (singles only) */}
          {!isDoubles && (
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Time</label>
              <TimePicker value={time} onChange={setTime} date={date} />
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label className="text-[14px] font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
              <span className={`text-[11px] tabular-nums ${message.length > 70 ? "text-amber-600" : "text-muted-foreground"}`}>
                {message.length}/80
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => { if (e.target.value.length <= 80) setMessage(e.target.value); }}
              placeholder="e.g. Running 10 mins late"
              rows={2}
              maxLength={80}
              className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex-1 ${L.button}`}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
