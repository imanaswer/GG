"use client";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function CoachLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <LoginForm
        title="Coach sign-in."
        subtitle={<>See your profile, batches and booking requests. Not a coach yet?{" "}<Link href="/register/coach" className="reg-link">Apply to coach</Link></>}
        defaultRedirect="/coach/dashboard"
        requireRole="coach"
        showGoogle={false}
        footerLink={<>Here to play? <Link href="/login" className="reg-legal-link">Player sign-in</Link></>}
      />
    </Suspense>
  );
}
