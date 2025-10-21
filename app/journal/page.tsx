"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function JournalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel-bg">
        <div className="text-panel-text">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-panel-bg">
      <div className="mx-auto flex max-w-[960px] flex-col px-4 py-8 sm:px-10">
        <h1 className="pb-4 text-left text-3xl font-bold leading-tight tracking-tight text-panel-text sm:text-4xl">
          Journal
        </h1>
        
        <div className="rounded-xl border border-panel-border bg-panel-card p-8 text-center">
          <span className="material-symbols-outlined mb-4 text-6xl text-panel-primary">
            edit_note
          </span>
          <p className="text-lg text-panel-text">
            Journal feature coming soon...
          </p>
          <p className="mt-2 text-sm text-panel-muted">
            This is where you&apos;ll be able to track your daily thoughts and progress.
          </p>
        </div>
      </div>
    </div>
  );
}
