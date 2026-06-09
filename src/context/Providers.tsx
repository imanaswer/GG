"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "./AuthContext";
import { TierAnnouncementToast } from "@/components/TierAnnouncementToast";
import { PostHogProvider } from "@/components/PostHogProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  }));
  return (
    <PostHogProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <TierAnnouncementToast />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}
