"use client";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (e: string, cb: (p: unknown) => void) => void };
  }
}

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (resp: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
};

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay requires a browser"));
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay"))); return; }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loader = null; reject(new Error("Failed to load Razorpay")); };
    document.body.appendChild(s);
  });
  return loader;
}

export type CheckoutArgs = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

export async function openRazorpayCheckout(args: CheckoutArgs): Promise<RazorpaySuccess> {
  await loadRazorpay();
  if (!window.Razorpay) throw new Error("Razorpay SDK unavailable");
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: args.keyId,
      amount: args.amount,
      currency: args.currency,
      name: args.name,
      description: args.description,
      order_id: args.orderId,
      prefill: args.prefill,
      theme: { color: "#e63946" },
      handler: (resp) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}

export async function createPaymentOrder(input: { amount: number; entityType: "camp" | "event" | "game"; entityId: string }): Promise<{ orderId: string; amount: number; currency: string; keyId: string; devMode?: boolean }> {
  const r = await fetch("/api/payments/create-order", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error ?? "Failed to create payment order");
  return j.data;
}

export type VerifyRegistration =
  | { entityType: "camp"; childName: string; childAge: number }
  | { entityType: "event"; teamName?: string }
  | { entityType: "game" };

export async function verifyPayment(input: {
  success: RazorpaySuccess;
  entityType: "camp" | "event" | "game";
  entityId: string;
  amount: number;
  registration: VerifyRegistration;
  devMode?: boolean;
}): Promise<void> {
  const r = await fetch("/api/payments/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input.success,
      entityType: input.entityType,
      entityId: input.entityId,
      amount: input.amount,
      registration: input.registration,
      devMode: input.devMode ?? false,
    }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error ?? "Payment verification failed");
}
