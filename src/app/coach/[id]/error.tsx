"use client";
import { useEffect } from "react";
import { RouteErrorView } from "@/components/RouteErrorBoundary";

export default function CoachError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[coach] render error:", error); }, [error]);
  return <RouteErrorView area="Coach" error={error} reset={reset} />;
}
