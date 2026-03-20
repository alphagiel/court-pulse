"use client";

import { useRouter } from "next/navigation";
import type { ActionBanner } from "@/lib/ladder-hooks";

interface ActionBannerStackProps {
  banners: ActionBanner[];
  onDismiss: (id: string) => void;
}

export function ActionBannerStack({ banners, onDismiss }: ActionBannerStackProps) {
  const router = useRouter();

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((banner) => (
        <button
          key={banner.id}
          onClick={() => {
            onDismiss(banner.id);
            router.push(banner.url);
          }}
          className={`w-full text-left rounded-xl border p-3.5 transition-all active:scale-[0.98] ${
            banner.type === "singles_accepted"
              ? "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30"
              : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg flex-shrink-0">
              {banner.type === "singles_accepted" ? "\u{1F3BE}" : "\u{1F3C6}"}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold ${
                banner.type === "singles_accepted"
                  ? "text-sky-800 dark:text-sky-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}>
                {banner.type === "singles_accepted" ? "Proposal Accepted" : "Doubles Ready"}
              </p>
              <p className={`text-[12px] truncate ${
                banner.type === "singles_accepted"
                  ? "text-sky-700 dark:text-sky-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}>
                {banner.message}
              </p>
            </div>
            <svg className="w-4 h-4 flex-shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
