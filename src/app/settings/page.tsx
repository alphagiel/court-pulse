"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Loader } from "@/components/loader";

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<EmailPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
