"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface AppHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Badge shown below title (e.g. status pill) */
  badge?: React.ReactNode;
  /** URL to navigate on back. If undefined, no back button shown. */
  backHref?: string;
  /** Custom back handler instead of backHref */
  onBack?: () => void;
  /** Action element shown to the right of the title (left-aligns title when present) */
  action?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  badge,
  backHref,
  onBack,
  action,
}: AppHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_IDS || "").split(",").map((s) => s.trim());
  const isAdmin = user && adminIds.includes(user.id);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleBack = () => {
    if (onBack) onBack();
    else if (backHref) router.push(backHref);
  };

  const username = profile?.username || "Player";

  return (
    <div className="space-y-2">
      {/* Row 1: Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {(backHref || onBack) && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-[13px] text-muted-foreground font-medium border border-border bg-muted/50 rounded-full px-3 py-1 hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 relative" ref={menuRef}>
          <span className="text-[12px] text-muted-foreground font-medium truncate max-w-[80px]">
            Hi {username}
          </span>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors shrink-0"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/");
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/pickup");
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Pickup
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/ladder");
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Ladder
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/about");
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                About
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Settings
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/admin");
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <hr className="border-border my-2 py-1" />

      {/* Row 2: Title + subtitle */}
      <div
        className={
          action ? "flex items-center justify-between gap-4" : "text-center"
        }
      >
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-[0.5px] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
          {badge}
        </div>
        {action}
      </div>
    </div>
  );
}
