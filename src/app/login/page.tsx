"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Loader } from "@/components/loader";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const {
    user, profile, loading,
    signInWithGoogle, signInWithApple,
    signInWithEmail, signUpWithEmail,
  } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (profile) {
        router.replace("/");
      } else {
        router.replace("/setup");
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return <Loader />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await signUpWithEmail(trimmedEmail, password);
        if (signUpError) {
          setError(signUpError);
        } else {
          setCheckEmail(true);
        }
      } else {
        const { error: signInError } = await signInWithEmail(trimmedEmail, password);
        if (signInError) {
          setError(signInError);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation email sent
  if (checkEmail) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-16 sm:px-6 flex flex-col items-center gap-8">
          <div className="text-center space-y-2">
            <h1 className="text-[32px] font-bold tracking-[0.5px]">Court Pulse</h1>
            <p className="text-[15px] text-muted-foreground">Check your email</p>
          </div>
          <div className="w-full text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 space-y-2">
              <p className="text-[15px] font-medium text-green-800">Confirmation email sent</p>
              <p className="text-[13px] text-green-700">
                We sent a link to <span className="font-medium">{email}</span>. Click it to verify your account, then come back to sign in.
              </p>
            </div>
            <button
              onClick={() => { setCheckEmail(false); setMode("signin"); }}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-16 sm:px-6 flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-[32px] font-bold tracking-[0.5px]">Court Pulse</h1>
          <p className="text-[15px] text-muted-foreground">
            Pickup Pickleball, Live
          </p>
        </div>

        {/* Email/password form */}
        <form onSubmit={handleEmailSubmit} className="w-full space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-[15px] rounded-xl"
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-[15px] rounded-xl"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
            {submitting
              ? "..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"
            }
          </Button>

          <div className="flex items-center justify-between text-[13px]">
            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "signin" ? "Create an account" : "Already have an account?"}
            </button>
            {mode === "signin" && (
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            )}
          </div>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-[12px] text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Social buttons */}
        <div className="w-full space-y-3">
          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="w-full py-6 rounded-xl text-[15px] font-medium bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-sm"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <Button
            onClick={signInWithApple}
            size="lg"
            className="w-full py-6 rounded-xl text-[15px] font-medium bg-black hover:bg-gray-900 text-white border border-gray-800 shadow-sm"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="white">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </Button>
        </div>

        <p className="text-[12px] text-muted-foreground text-center">
          See who&apos;s playing and signal you&apos;re ready for pickup pickleball
        </p>
      </div>
    </main>
  );
}
