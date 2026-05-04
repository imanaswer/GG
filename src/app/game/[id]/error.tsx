"use client";
import { useEffect } from "react";
import { RouteErrorView } from "@/components/RouteErrorBoundary";

export default function GameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[game] render error:", error); }, [error]);
  return <RouteErrorView area="Game" error={error} reset={reset} />;
}
