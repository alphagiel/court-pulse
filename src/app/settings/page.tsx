"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Loader } from "@/components/loader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isTriangleZip } from "@/lib/geo";

interface EmailPreferences {
  singles_emails: boolean;
  doubles_emails: boolean;
  digest_emails: boolean;
  all_emails: boolean;
}

const DEFAULT_PREFS: EmailPreferences = {
  singles_emails: true,
  doubles_emails: true,
  digest_emails: true,
  all_emails: true,
};

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [prefs, setPrefs] = useState<EmailPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Zip code editing
  const [editingZip, setEditingZip] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [zipSaving, setZipSaving] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipSaved, setZipSaved] = useState(false);

  useEffect(() => {
    if (profile) setZipCode(profile.zip_code || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPrefs({
          singles_emails: data.singles_emails,
          doubles_emails: data.doubles_emails,
          digest_emails: data.digest_emails,
          all_emails: data.all_emails,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  const handleToggle = async (key: keyof EmailPreferences) => {
    const newPrefs = { ...prefs };

    if (key === "all_emails") {
      const newVal = !prefs.all_emails;
      newPrefs.all_emails = newVal;
      if (!newVal) {
        newPrefs.singles_emails = false;
        newPrefs.doubles_emails = false;
        newPrefs.digest_emails = false;
      }
    } else {
      newPrefs[key] = !prefs[key];
      // If all individual toggles are on, turn master on too
      if (newPrefs.singles_emails && newPrefs.doubles_emails && newPrefs.digest_emails) {
        newPrefs.all_emails = true;
      }
      // If any individual toggle is off, master can't be fully "on"
      // but we keep it as-is unless user explicitly toggles it
      // If turning something off and master is on, keep master on (it just means "not explicitly off")
    }

    setPrefs(newPrefs);
    setSaving(true);
    setSaved(false);

    await supabase.from("email_preferences").upsert(
      {
        user_id: user!.id,
        ...newPrefs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (authLoading || loading) return <Loader />;

  const allOff = !prefs.all_emails;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-6">
        <AppHeader
          title="Settings"
          subtitle="Manage your preferences"
          backHref="/ladder"
        />

        {/* Profile — Zip Code */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h2 className="text-[16px] font-semibold">Profile</h2>

            <div className="space-y-1">
              <p className="text-[13px] font-medium text-muted-foreground">Zip Code</p>
              {editingZip ? (
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 27601"
                      value={zipCode}
                      onChange={(e) => {
                        setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5));
                        setZipError(null);
                      }}
                      maxLength={5}
                      className="h-9 text-[14px]"
                      autoFocus
                    />
                    {zipError && (
                      <p className="text-[12px] text-red-600">{zipError}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={zipSaving}
                    onClick={async () => {
                      const trimmed = zipCode.trim();
                      if (!/^\d{5}$/.test(trimmed)) {
                        setZipError("Enter a valid 5-digit zip code");
                        return;
                      }
                      setZipSaving(true);
                      setZipError(null);
                      await supabase
                        .from("profiles")
                        .update({ zip_code: trimmed })
                        .eq("id", user!.id);
                      await refreshProfile();
                      setZipSaving(false);
                      setEditingZip(false);
                      setZipSaved(true);
                      setTimeout(() => setZipSaved(false), 2000);
                    }}
                    className="h-9"
                  >
                    {zipSaving ? "..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingZip(false);
                      setZipCode(profile?.zip_code || "");
                      setZipError(null);
                    }}
                    className="h-9"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium">
                      {profile?.zip_code || "Not set"}
                    </p>
                    {profile?.zip_code && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                        isTriangleZip(profile.zip_code)
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {isTriangleZip(profile.zip_code) ? "Triangle" : "Outside Triangle"}
                      </span>
                    )}
                    {zipSaved && (
                      <span className="text-[11px] text-green-600 font-medium">Saved</span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingZip(true)}
                    className="text-[13px] text-sky-600 hover:text-sky-700 font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h2 className="text-[16px] font-semibold">Appearance</h2>
            {mounted && (
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${
                      currentTheme === t
                        ? "bg-sky-600 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "light" && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                    )}
                    {t === "dark" && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                    )}
                    {t === "system" && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                    )}
                    {t}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Preferences */}
        <Card>
          <CardContent className="pt-5 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-semibold">Email Notifications</h2>
                <p className="text-[12px] text-muted-foreground">
                  Choose which emails you receive
                </p>
              </div>
              {saving && (
                <span className="text-[11px] text-muted-foreground">Saving...</span>
              )}
              {saved && (
                <span className="text-[11px] text-green-600 font-medium">Saved</span>
              )}
            </div>

            {/* Master toggle */}
            <ToggleRow
              label="All emails"
              description="Master switch — turns everything off"
              checked={prefs.all_emails}
              onChange={() => handleToggle("all_emails")}
              bold
            />

            <div className="border-t border-border my-3" />

            {/* Individual toggles */}
            <ToggleRow
              label="Singles match emails"
              description="New proposals, accepted matches, disputes"
              checked={prefs.singles_emails}
              onChange={() => handleToggle("singles_emails")}
              disabled={allOff}
            />

            <ToggleRow
              label="Doubles match emails"
              description="New proposals, team filled, partner invites"
              checked={prefs.doubles_emails}
              onChange={() => handleToggle("doubles_emails")}
              disabled={allOff}
            />

            <ToggleRow
              label="Digest & announcements"
              description="Season updates, registration, news"
              checked={prefs.digest_emails}
              onChange={() => handleToggle("digest_emails")}
              disabled={allOff}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  bold,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  bold?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-full flex items-center justify-between py-3 px-1 rounded-lg transition-colors text-left ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50 cursor-pointer"
      }`}
    >
      <div className="pr-4">
        <p className={`text-[14px] ${bold ? "font-semibold" : "font-medium"}`}>{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      <div
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
          checked ? "bg-green-600" : "bg-muted-foreground/30"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
