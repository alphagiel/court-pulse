"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function getRedirectPath(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();
  return data ? "/" : "/setup";
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
<<<<<<< Updated upstream
    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data }) => {
        const path = data.session?.user
          ? await getRedirectPath(data.session.user.id)
          : "/login";
        router.replace(path);
      });
    } else {
      // Implicit flow (Apple) — session auto-detected from hash fragment
      supabase.auth.getSession().then(async ({ data }) => {
        const path = data.session?.user
          ? await getRedirectPath(data.session.user.id)
          : "/login";
        router.replace(path);
      });
    }
=======
    let redirected = false;

    async function handleUser(userId: string) {
      if (redirected) return;
      redirected = true;
      const path = await getRedirectPath(userId);
      router.replace(path);
    }

    // Supabase v2 auto-exchanges the code/token from the URL (detectSessionInUrl: true).
    // Listen for SIGNED_IN to handle the async case.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        handleUser(session.user.id);
      }
    });

    // Also check if session is already available (exchange may have completed synchronously).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        handleUser(data.session.user.id);
      }
    });

    return () => subscription.unsubscribe();
>>>>>>> Stashed changes
  }, [router]);

  return null;
}
