"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader } from "@/components/loader";

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    } else if (!authLoading && user && !profile) {
      router.replace("/setup");
    } else if (!authLoading && user && profile) {
      router.replace("/ladder");
    }
  }, [authLoading, user, profile, router]);

  return <Loader />;
}
