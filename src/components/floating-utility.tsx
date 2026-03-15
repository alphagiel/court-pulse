"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export function FloatingUtility() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      message: message.trim(),
    });
    setSending(false);
    if (!error) {
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    }
  };

  return (
    <>
      {/* Side-edge tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 bottom-6 z-40 flex items-center justify-center text-white rounded-l-md shadow-lg transition-all hover:pr-3"
          style={{
            writingMode: "vertical-rl",
            padding: "12px 7px",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            background: "linear-gradient(180deg, #7c3aed, #3b82f6)",
            boxShadow: "-2px 0 12px rgba(139, 92, 246, 0.3)",
          }}
        >
          Feedback
        </button>
      )}

      {/* Slide-down panel anchored to tab position */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="fixed right-0 bottom-6 w-72 bg-card border border-border border-r-0 rounded-l-lg shadow-xl p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Feedback</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[12px] text-muted-foreground">
              Bug, suggestion, or anything else — let us know.
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind..."
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
              maxLength={2000}
            />

            {sent ? (
              <div className="text-center py-2 text-[13px] font-medium text-green-600">
                Sent — thanks!
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={sending || !message.trim()}
                className="w-full py-2 rounded-lg font-medium text-[13px] text-white transition-colors disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
              >
                {sending ? "Sending..." : "Submit"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
