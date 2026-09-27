"use client";
import { useEffect } from "react";
import { RouteErrorView } from "@/components/RouteErrorBoundary";

// Root boundary: every public route without its own error.tsx used to fall
// through to Next's blank default screen.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[app] render error:", error); }, [error]);
  return <RouteErrorView area="Game Ground" error={error} reset={reset} />;
}
