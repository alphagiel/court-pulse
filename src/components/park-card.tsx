"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { ParkActivity, SkillLevel, Intent, CheckIn } from "@/types/database";
import type { PlayerProfile } from "@/lib/hooks";

interface ParkCardProps {
  activity: ParkActivity;
  onTap: (parkId: string) => void;
  onQuickJoin?: (parkId: string) => void;
  isUserGoing: boolean;
  userCheckedIn: boolean;
  userId?: string;
  playerProfiles: Record<string, PlayerProfile>;
  hasActiveIntent?: boolean;
}

type TimeBucketKey = "morning" | "afternoon" | "evening";
type SkillBucket = "beginner" | "intermediate" | "advanced";

interface PlayerDot {
  id: string;
  userId: string;
  skillLevel: SkillLevel;
  skillBucket: SkillBucket;
  timeBucket: TimeBucketKey;
  targetTime: string | null;
  isHere: boolean;
  createdAt: string;
}

function getSkillBucket(level: SkillLevel): SkillBucket {
  const n = parseFloat(level);
  if (n <= 3.0) return "beginner";
  if (n <= 4.0) return "intermediate";
  return "advanced";
}

function getTimeBucket(targetTime: string | null): TimeBucketKey {
  let hour: number;
  if (targetTime) {
    hour = new Date(targetTime).getHours();
  } else {
    hour = new Date().getHours();
  }
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function formatDotTime(targetTime: string | null): string {
  if (!targetTime) return "Now";
  const d = new Date(targetTime);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildDots(intents: Intent[], checkIns: CheckIn[]): PlayerDot[] {
  const dots: PlayerDot[] = [];

  for (const ci of checkIns) {
    dots.push({
      id: ci.id,
      userId: ci.user_id,
      skillLevel: ci.skill_level,
      skillBucket: getSkillBucket(ci.skill_level),
      timeBucket: getTimeBucket(null),
      targetTime: null,
      isHere: true,
      createdAt: ci.created_at,
    });
  }

  const checkedInUsers = new Set(checkIns.map((ci) => ci.user_id));
  for (const intent of intents) {
    if (checkedInUsers.has(intent.user_id)) continue;
    dots.push({
      id: intent.id,
      userId: intent.user_id,
      skillLevel: intent.skill_level,
      skillBucket: getSkillBucket(intent.skill_level),
      timeBucket: getTimeBucket(intent.target_time),
      targetTime: intent.target_time,
      isHere: false,
      createdAt: intent.created_at,
    });
  }

  dots.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return dots;
}

const SKILL_BUCKETS: { key: SkillBucket; label: string }[] = [
  { key: "beginner", label: "2.5–3.0" },
  { key: "intermediate", label: "3.5–4.0" },
  { key: "advanced", label: "4.5–5.0" },
];

const TIME_ROWS: { key: TimeBucketKey; label: string }[] = [
  { key: "morning", label: "AM" },
  { key: "afternoon", label: "Day" },
  { key: "evening", label: "PM" },
];

export function ParkCard({
  activity,
  onTap,
  onQuickJoin,
  isUserGoing,
  userCheckedIn,
  userId,
  playerProfiles,
  hasActiveIntent,
}: ParkCardProps) {
  const { park, totalPlayers, totalInterested, distanceMiles } = activity;
  const isActive = totalPlayers > 0 || totalInterested > 0;
  const [tappedDot, setTappedDot] = useState<string | null>(null);
  const [showCancelHint, setShowCancelHint] = useState(false);

  const dots = buildDots(activity.activeIntents, activity.activeCheckIns);

  const grid: Record<string, PlayerDot[]> = {};
  for (const row of TIME_ROWS) {
    for (const col of SKILL_BUCKETS) {
      grid[`${row.key}-${col.key}`] = [];
    }
  }
  for (const dot of dots) {
    const key = `${dot.timeBucket}-${dot.skillBucket}`;
    if (grid[key]) grid[key].push(dot);
  }

  return (
    <Card
      className={`!overflow-visible transition-all ${
        isUserGoing
          ? "border-green-500 bg-green-50/60 dark:bg-green-950/30 shadow-md shadow-green-500/10 ring-1 ring-green-400/30"
          : isActive
            ? "border-green-400/60 bg-green-50/40 dark:bg-green-950/20 shadow-sm"
            : "border-border/60"
      }`}
    >
      <div className="px-3 pt-3 pb-2.5 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-[13px] leading-tight">
                {park.name}
              </h3>
              {park.court_count > 0 && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {park.court_count}ct
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {distanceMiles !== null
                  ? `${distanceMiles} mi`
                  : park.address || ""}
              </span>
              {totalPlayers > 0 && (
                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                  {totalPlayers} here
                </span>
              )}
              {totalInterested > 0 && (
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  {totalInterested} going
                </span>
              )}
            </div>
          </div>
          {/* Quick join pill */}
          {!isUserGoing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasActiveIntent) {
                  setShowCancelHint(true);
                  setTimeout(() => setShowCancelHint(false), 2500);
                } else {
                  onTap(park.id);
                }
              }}
              className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50 active:scale-95 transition-all cursor-pointer"
            >
              I&apos;m in
            </button>
          )}
          {isUserGoing && (
            <span className="relative shrink-0">
              <span
                className={`absolute inset-[-5px] rounded-full animate-pulse ${
                  userCheckedIn ? "bg-green-400/15" : "bg-amber-400/15"
                }`}
                style={{ animationDuration: "2.5s" }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onTap(park.id); }}
                className={`relative shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer active:scale-95 transition-all ${
                  userCheckedIn
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/60"
                    : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-0.5"><path d="M20 6 9 17l-5-5"/></svg>
                {userCheckedIn ? "Here" : "Going"}
              </button>
            </span>
          )}
        </div>

        {/* Dot chart grid */}
        <div className="overflow-visible">
          {/* Column headers */}
          <div className="grid grid-cols-[24px_1fr_1px_1fr_1px_1fr] gap-0">
            <div />
            {SKILL_BUCKETS.map((col, i) => (
              <div key={col.key} className="contents">
                {i > 0 && <div className="bg-border/60" />}
                <div className="text-center py-0.5">
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {col.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {TIME_ROWS.map((row) => (
            <div key={row.key}>
              <div className="h-px bg-border/60" />

              <div className="grid grid-cols-[24px_1fr_1px_1fr_1px_1fr] gap-0">
                <div className="flex items-center justify-center py-1.5">
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {row.label}
                  </span>
                </div>

                {SKILL_BUCKETS.map((col, colIdx) => {
                  const cellDots = grid[`${row.key}-${col.key}`];
                  return (
                    <div key={col.key} className="contents">
                      {colIdx > 0 && <div className="bg-border/60" />}
                      <div className="flex flex-wrap gap-[3px] items-center justify-center py-1.5 px-0.5 min-h-[22px]">
                        {cellDots.map((dot) => {
                          const profile = playerProfiles[dot.userId];
                          const isMe = userId === dot.userId;
                          const isOpen = tappedDot === dot.id;
                          return (
                            <span
                              key={dot.id}
                              className="relative"
                              onMouseEnter={() => setTappedDot(dot.id)}
                              onMouseLeave={() => setTappedDot(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTappedDot(isOpen ? null : dot.id);
                              }}
                            >
                              {/* Radar ping for current user — only when here */}
                              {isMe && dot.isHere && (
                                <span
                                  className="absolute -inset-1 rounded-full animate-ping bg-amber-400/50"
                                  style={{ animationDuration: "1.8s" }}
                                />
                              )}
                              <span
                                className={`relative block w-2 h-2 rounded-full shrink-0 transition-all cursor-pointer ${
                                  isMe
                                    ? "bg-amber-500 dark:bg-amber-400"
                                    : dot.isHere
                                      ? "bg-green-500 dark:bg-green-400"
                                      : "bg-blue-400 dark:bg-blue-500"
                                } ${isMe ? "ring-1 ring-offset-1 ring-amber-400/40" : ""} ${isOpen ? "ring-2 ring-offset-1 ring-foreground/30 scale-125" : ""}`}
                              />
                              {/* Tooltip */}
                              {isOpen && (
                                <span
                                  className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded-lg bg-foreground text-background text-[11px] shadow-lg overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Header */}
                                  <span className="block px-3 pt-2 pb-1.5 font-semibold text-[12px] whitespace-nowrap">
                                    {isMe ? "You" : "Player"}
                                    <span className="font-normal opacity-60 text-[10px]">
                                      {" "}{dot.skillLevel}
                                      {profile?.elo != null && ` | ${Math.round(profile.elo)} elo`}
                                    </span>
                                  </span>
                                  {/* Arrival row */}
                                  <span className="block border-t border-background/15">
                                    <span className="grid grid-cols-[auto_1fr] gap-x-4 px-3 py-1.5 pb-2 whitespace-nowrap">
                                      <span className="opacity-60">Arrival</span>
                                      <span className="text-right font-medium">
                                        {dot.isHere ? "Here now" : formatDotTime(dot.targetTime)}
                                      </span>
                                    </span>
                                  </span>
                                  {/* Arrow */}
                                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground" />
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cancel hint */}
        {showCancelHint && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center pb-1">
            Cancel your current court first
          </p>
        )}
      </div>
    </Card>
  );
}
