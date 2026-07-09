import type { NextConfig } from "next";

// Content-Security-Policy. Allow-lists the exact third parties this app loads:
// Razorpay checkout (script + frame + api), Google Maps JS, PostHog, Cloudinary
// upload, and the image hosts in `images.remotePatterns` below.
// 'unsafe-inline'/'unsafe-eval' on script-src are required because Next.js ships
// inline hydration bootstrap scripts (no nonce pipeline here) and Maps/PostHog use
// eval; the real win is that only these hosts can load *external* scripts.
// ponytail: static allow-list CSP; upgrade path is nonce-based script-src via
// middleware if 'unsafe-inline' must go. MUST be smoke-tested in a browser on
// staging (checkout opens, maps render, posthog events, images load) before prod.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://maps.googleapis.com https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com https://api.dicebear.com https://maps.gstatic.com https://*.googleapis.com https://*.posthog.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.razorpay.com https://api.cloudinary.com https://maps.googleapis.com https://*.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com",
  "frame-src 'self' https://*.razorpay.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Strict-Transport-Security is Vercel/HTTPS-only; harmless on HTTP since browsers ignore it.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.30.10.236'],
  images: {
    qualities: [75, 80, 85],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
};

export default nextConfig;
