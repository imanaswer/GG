"use client";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <LoginForm footerLink={<>Coaching with us? <Link href="/coach/login" className="reg-legal-link">Coach sign-in</Link></>} />
    </Suspense>
  );
}
