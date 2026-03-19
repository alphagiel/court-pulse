"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { Loader } from "@/components/loader";
import { theme } from "@/lib/theme";
import { WeatherForecast } from "@/components/weather-forecast";

type Route = "pickup" | "ladder";

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState<Route>("pickup");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    } else if (!authLoading && user && !profile) {
      router.replace("/setup");
    }
  }, [authLoading, user, profile, router]);

  if (authLoading || !user || !profile) {
    return <Loader />;
  }

  const t = theme[active];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-6">
        <AppHeader
          title="Court Pulse"
          subtitle="Your local pickleball hub."
        />

        <hr />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActive("pickup")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 shadow-sm transition-colors ${
              active === "pickup"
                ? theme.pickup.cardActive
                : "border-border bg-muted/40 hover:bg-muted/60"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m8 12 3 3 5-5" />
            </svg>
            <span className="text-[15px] font-semibold">Pickup</span>
            <span className="text-[12px] text-muted-foreground">Play now</span>
          </button>
          <button
            onClick={() => setActive("ladder")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 shadow-sm transition-colors ${
              active === "ladder"
                ? theme.ladder.cardActive
                : "border-border bg-muted/40 hover:bg-muted/60"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
            <span className="text-[15px] font-semibold">Ladder</span>
            <span className="text-[12px] text-muted-foreground">
              Compete & rank
            </span>
          </button>
        </div>

        <div
          key={active}
          className="text-center py-8 space-y-4 animate-fade-in-up"
        >
          <p className="text-[14px] text-muted-foreground">
            {active === "pickup"
              ? "Let people know you're down to play — just your skill level, time, and court show up, not your name. Check who else is heading out and pick the best spot."
              : "Play singles or doubles against people at your level. Set up matches, track your rating, and see how you stack up."}
          </p>
          <button
            onClick={() =>
              router.push(active === "pickup" ? "/pickup" : "/ladder")
            }
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${t.button}`}
          >
            {active === "pickup" ? "Go to Pickup" : "Go to Ladder"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <WeatherForecast />
      </div>

      <footer className="fixed bottom-0 inset-x-0 py-2">
        <p className="text-center text-[10px] text-muted-foreground/40">
          &copy; 2026 Court Pulse Raleigh
        </p>
      </footer>
    </main>
  );
}
