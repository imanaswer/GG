"use client";
import { useEffect } from "react";
import { RouteErrorView } from "@/components/RouteErrorBoundary";

export default function ProfileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[profile] render error:", error); }, [error]);
  return <RouteErrorView area="Profile" error={error} reset={reset} />;
}
