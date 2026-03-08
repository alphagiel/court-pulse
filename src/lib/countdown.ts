"use client";

import { useState, useEffect } from "react";

export function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      return;
    }

    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const mins = Math.floor(diff / 60000);
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        setRemaining(`${hrs}h ${rem}m`);
      } else {
        setRemaining(`${mins}m`);
      }
    }

    update();
    const interval = setInterval(update, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}
