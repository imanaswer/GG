"use client";
import { useEffect } from "react";
import { RouteErrorView } from "@/components/RouteErrorBoundary";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[admin] render error:", error); }, [error]);
  return <RouteErrorView area="Admin" error={error} reset={reset} />;
}
