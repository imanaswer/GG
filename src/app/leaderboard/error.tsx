"use client";
import { useEffect } from "react";
import { RouteErrorView } from "@/components/RouteErrorBoundary";

export default function LeaderboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[leaderboard] render error:", error); }, [error]);
  return <RouteErrorView area="Leaderboard" error={error} reset={reset} />;
}
