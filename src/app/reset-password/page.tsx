"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setDone(true);
        setTimeout(() => router.replace("/"), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-16 sm:px-6 flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-[27px] font-bold tracking-[0.5px]">New Password</h1>
          <p className="text-[14px] text-muted-foreground">
            {done ? "Password updated!" : "Choose a new password for your account"}
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center space-y-2 w-full">
            <p className="text-[15px] font-medium text-green-800">Password updated</p>
            <p className="text-[13px] text-green-700">Redirecting you now...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-[15px] rounded-xl"
              autoComplete="new-password"
              autoFocus
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 text-[15px] rounded-xl"
              autoComplete="new-password"
            />

            {error && (
              <p className="text-[13px] text-red-600 text-center">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full py-6 rounded-xl text-[15px] font-medium bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
