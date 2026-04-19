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
  }, [router]);

  return null;
}
