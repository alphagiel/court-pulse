"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetError } = await resetPassword(trimmed);
      if (resetError) {
        setError(resetError);
      } else {
        setSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-16 sm:px-6 flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-[27px] font-bold tracking-[0.5px]">Reset Password</h1>
          <p className="text-[14px] text-muted-foreground">
            {sent ? "Check your email" : "Enter your email to receive a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="w-full space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 space-y-2 text-center">
              <p className="text-[15px] font-medium text-green-800">Reset link sent</p>
              <p className="text-[13px] text-green-700">
                We sent a password reset link to <span className="font-medium">{email}</span>. Check your inbox.
              </p>
            </div>
            <div className="text-center">
              <Link
                href="/login"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-[15px] rounded-xl"
              autoComplete="email"
              autoFocus
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
              {submitting ? "Sending..." : "Send Reset Link"}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
