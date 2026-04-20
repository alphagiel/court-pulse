"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SkillLevel } from "@/types/database";
import { skillToElo } from "@/lib/elo";
import { Loader } from "@/components/loader";

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "2.5", label: "2.5 — Beginner" },
  { value: "3.0", label: "3.0 — Beginner+" },
  { value: "3.5", label: "3.5 — Intermediate" },
  { value: "4.0", label: "4.0 — Intermediate+" },
  { value: "4.5", label: "4.5 — Advanced" },
  { value: "5.0", label: "5.0 — Advanced+" },
];

export default function SetupPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("3.5");
  const [zipCode, setZipCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && profile) {
      router.replace("/");
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Username is required");
      return;
    }
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    const trimmedZip = zipCode.trim();
    if (!trimmedZip) {
      setError("Zip code is required");
      return;
    }
    if (!/^\d{5}$/.test(trimmedZip)) {
      setError("Please enter a valid 5-digit zip code");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      username: trimmed,
      email: user.email || null,
      skill_level: skillLevel,
      zip_code: trimmedZip,
    });

    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
        setError("Username already taken");
      } else {
        setError(insertError.message);
      }
      setSaving(false);
      return;
    }

    // Auto-join the ladder so the user is counted in player totals
    const initialElo = skillToElo(skillLevel);
    await supabase.from("ladder_members").insert({ user_id: user.id });
    await supabase.from("ladder_ratings").insert([
      { user_id: user.id, elo_rating: initialElo, mode: "singles" },
      { user_id: user.id, elo_rating: initialElo, mode: "doubles" },
    ]);

    await refreshProfile();
    router.replace("/");
  };

  if (loading || !user) {
    return <Loader />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-16 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-[27px] font-bold tracking-[0.5px]">Set Up Your Profile</h1>
          <p className="text-[14px] text-muted-foreground">
            Pick a username, skill level, and zip code to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[13px] font-medium">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="h-11 text-[15px]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-medium">Skill Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setSkillLevel(level.value)}
                  className={`rounded-lg border py-3 px-3 text-[13px] font-medium transition-colors ${
                    skillLevel === level.value
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-700"
                      : "border-border/50 bg-background hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode" className="text-[13px] font-medium">
              Zip Code
            </Label>
            <Input
              id="zipCode"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 27601"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              maxLength={5}
              className="h-11 text-[15px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Used to determine ladder eligibility (NC Triangle area)
            </p>
          </div>

          {error && (
            <p className="text-[13px] text-red-600 text-center">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={saving}
            className="w-full py-6 rounded-xl text-[15px] font-medium bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving ? "Saving..." : "Let's Go"}
          </Button>
        </form>
      </div>
    </main>
  );
}
