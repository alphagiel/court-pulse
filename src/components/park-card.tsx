"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ParkActivity, IntentTimeBuckets, IntentGroup, SkillLevel } from "@/types/database";

interface ParkCardProps {
  activity: ParkActivity;
  onPaddleDown: (parkId: string) => void;
  onPaddleUp: (parkId: string) => void;
  paddleLoading: boolean;
  userCheckedIn: boolean;
  checkInExpiresAt: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function getBuckets(breakdown: Record<SkillLevel, number>) {
  return {
    beginner: (breakdown["2.5"] || 0) + (breakdown["3.0"] || 0),
    intermediate: (breakdown["3.5"] || 0) + (breakdown["4.0"] || 0),
    advanced: (breakdown["4.5"] || 0) + (breakdown["5.0"] || 0),
  };
}

function getDetailRows(breakdown: Record<SkillLevel, number>) {
  const levels: SkillLevel[] = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];
  return levels
    .filter((level) => (breakdown[level] || 0) > 0)
    .map((level) => ({ level, count: breakdown[level] }));
}

export function ParkCard({
  activity,
  onPaddleDown,
  onPaddleUp,
  paddleLoading,
  userCheckedIn,
  checkInExpiresAt,
}: ParkCardProps) {
  const [skillExpanded, setSkillExpanded] = useState(false);
  const [interestExpanded, setInterestExpanded] = useState(false);
  const {
    park, totalPlayers, totalInterested, intentGroups, intentTimeBuckets,
    skillBreakdown, lastActivity, distanceMiles,
  } = activity;

  const isActive = totalPlayers > 0 || totalInterested > 0;
  const buckets = getBuckets(skillBreakdown);
  const detailRows = getDetailRows(skillBreakdown);
  const hasPlayers = totalPlayers > 0;
  const hasInterested = totalInterested > 0;
  const checkOutTime = checkInExpiresAt
    ? new Date(checkInExpiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <Card
      className={`transition-all ${
        isActive
          ? "border-green-400/60 bg-green-50/40 dark:bg-green-950/20 shadow-sm"
          : "border-border/60"
      }`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header: Park name + distance */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base leading-tight">{park.name}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {distanceMiles !== null
                ? `${distanceMiles} mi · ~${Math.max(1, Math.round(distanceMiles * 2))} min drive`
                : park.address || "Location pending"}
            </p>
          </div>
          {park.court_count > 0 && (
            <Badge variant="outline" className="text-[11px] shrink-0">
              {park.court_count} court{park.court_count !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Status table */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-[13px]">
            <tbody>
              <Row
                label="Here now"
                value={
                  totalPlayers > 0 ? (
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {totalPlayers} player{totalPlayers !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No one yet</span>
                  )
                }
              />
              <Row
                label="Last update"
                value={
                  <span className="text-muted-foreground">
                    {lastActivity ? timeAgo(lastActivity) : "No activity"}
                  </span>
                }
                isLast
              />
            </tbody>
          </table>
        </div>

        {/* Who's interested — time buckets */}
        <div>
          <button
            type="button"
            className="w-full text-left"
            onClick={() => hasInterested && setInterestExpanded(!interestExpanded)}
          >
            <p className="text-[12px] text-muted-foreground mb-2 flex items-center justify-between">
              <span>Who&apos;s interested</span>
              {hasInterested && (
                <span className="text-[11px]">{interestExpanded ? "Hide detail" : "Tap for detail"}</span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <TimeBucket label="Morning" sublabel="before 12 PM" count={intentTimeBuckets.morning} active={hasInterested} color="blue" />
              <TimeBucket label="Afternoon" sublabel="12 – 5 PM" count={intentTimeBuckets.afternoon} active={hasInterested} color="blue" />
              <TimeBucket label="Evening" sublabel="5 – 9 PM" count={intentTimeBuckets.evening} active={hasInterested} color="blue" />
            </div>
          </button>

          {/* Animated hourly detail */}
          {intentGroups.length > 0 && (
            <AnimatedPanel open={interestExpanded}>
              <div className="mt-2 rounded-lg border border-border/40 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/30">
                      <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Time</th>
                      <th className="py-1.5 px-3 text-right text-muted-foreground font-medium">Players</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intentGroups.map((group, i) => (
                      <tr key={group.label} className={i < intentGroups.length - 1 ? "border-b border-border/20" : ""}>
                        <td className="py-1.5 px-3">{group.label}</td>
                        <td className="py-1.5 px-3 text-right font-medium">{group.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedPanel>
          )}
        </div>

        {/* Skill levels on court */}
        <div>
          <button
            type="button"
            className="w-full text-left"
            onClick={() => hasPlayers && setSkillExpanded(!skillExpanded)}
          >
            <p className="text-[12px] text-muted-foreground mb-2 flex items-center justify-between">
              <span>Skill levels on court</span>
              {hasPlayers && (
                <span className="text-[11px]">{skillExpanded ? "Hide detail" : "Tap for detail"}</span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <TimeBucket label="Beginner" sublabel="2.5 – 3.0" count={buckets.beginner} active={hasPlayers} color="green" />
              <TimeBucket label="Inter." sublabel="3.5 – 4.0" count={buckets.intermediate} active={hasPlayers} color="green" />
              <TimeBucket label="Advanced" sublabel="4.5 – 5.0" count={buckets.advanced} active={hasPlayers} color="green" />
            </div>
          </button>

          {/* Animated skill detail */}
          {detailRows.length > 0 && (
            <AnimatedPanel open={skillExpanded}>
              <div className="mt-2 rounded-lg border border-border/40 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/30">
                      <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Level</th>
                      <th className="py-1.5 px-3 text-right text-muted-foreground font-medium">Players</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((row, i) => (
                      <tr key={row.level} className={i < detailRows.length - 1 ? "border-b border-border/20" : ""}>
                        <td className="py-1.5 px-3">{row.level}</td>
                        <td className="py-1.5 px-3 text-right font-medium">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedPanel>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          {userCheckedIn ? (
            <Button
              size="sm"
              className="flex-1 h-auto py-2 text-[13px] font-medium bg-amber-600 hover:bg-amber-700 text-white flex flex-col items-center gap-0.5"
              onClick={() => onPaddleUp(park.id)}
              disabled={paddleLoading}
            >
              <span>{paddleLoading ? "Leaving..." : "Paddle Up"}</span>
              {checkOutTime && (
                <span className="text-[10px] font-normal opacity-80">
                  Auto check-out at {checkOutTime}
                </span>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 h-9 text-[13px] font-medium bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onPaddleDown(park.id)}
              disabled={paddleLoading}
            >
              {paddleLoading ? "Checking in..." : "I'm Here"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-[13px] font-medium self-stretch"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`,
                "_blank"
              )
            }
          >
            Directions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeBucket({
  label,
  sublabel,
  count,
  active,
  color,
}: {
  label: string;
  sublabel: string;
  count: number;
  active: boolean;
  color: "green" | "blue";
}) {
  const hasValue = count > 0 && active;

  const activeStyles = color === "blue"
    ? "border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800"
    : "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800";

  const countColor = color === "blue"
    ? "text-blue-700 dark:text-blue-400"
    : "text-foreground";

  return (
    <div
      className={`rounded-lg border text-center py-2.5 px-1 transition-colors ${
        hasValue ? activeStyles : "border-border/30 bg-muted/20"
      }`}
    >
      <div
        className={`text-[18px] leading-none font-semibold ${
          hasValue ? countColor : "text-muted-foreground/40"
        }`}
      >
        {hasValue ? count : "–"}
      </div>
      <div
        className={`text-[11px] mt-1 font-medium ${
          hasValue ? "text-foreground/70" : "text-muted-foreground/40"
        }`}
      >
        {label}
      </div>
      <div
        className={`text-[10px] ${
          hasValue ? "text-muted-foreground" : "text-muted-foreground/30"
        }`}
      >
        {sublabel}
      </div>
    </div>
  );
}

function AnimatedPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [open, children]);

  return (
    <div
      className="overflow-hidden transition-all duration-250 ease-out"
      style={{
        maxHeight: open ? height : 0,
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0)" : "translateY(-4px)",
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <tr className={isLast ? "" : "border-b border-border/30"}>
      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap w-[110px]">{label}</td>
      <td className="py-2 px-3">{value}</td>
    </tr>
  );
}
