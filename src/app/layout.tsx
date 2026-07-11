import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Providers } from "@/context/Providers";
import { PWARegister } from "@/components/PWARegister";
import { PostHogPageView } from "@/components/PostHogPageView";
import { siteUrl } from "@/lib/siteUrl";
import { jsonLdScript } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Game Ground — Learn. Play. Connect.", template: "%s | Game Ground" },
  description: "Kozhikode (Calicut)'s hyperlocal sports platform. Book certified coaches, find grounds and turfs, join pickup games, and register for camps, tournaments and workshops.",
  keywords: [
    "sports", "Kozhikode", "Calicut", "Kerala",
    "sports coach Kozhikode", "coach Calicut", "coaching", "book coach",
    "ground booking", "turf booking Kozhikode", "sports ground Calicut",
    "play", "pickup games", "bookings", "venue booking",
    "basketball", "football", "cricket", "badminton",
    "summer camps", "tournaments", "sports events Kozhikode", "workshops",
  ],
  authors: [{ name: "Game Ground" }],
  creator: "Game Ground",
  publisher: "Game Ground",
  metadataBase: new URL(siteUrl()),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Game Ground",
    title: "Game Ground — Learn. Play. Connect.",
    description: "Kozhikode's hyperlocal sports platform. Find coaches, join games, sign up for camps.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Game Ground — Kozhikode's Sports Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Ground — Learn. Play. Connect.",
    description: "Kozhikode's hyperlocal sports platform.",
    images: ["/og-image.png"],
  },
  // Paste the token from Search Console's HTML-tag method into this env var.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#e63946",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Sitewide structured data: local sports business + site search box.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "SportsActivityLocation"],
      name: "Game Ground",
      url: siteUrl(),
      logo: `${siteUrl()}/icon-512.png`,
      description: "Hyperlocal sports platform for Kozhikode (Calicut): coaches, grounds, pickup games, camps, tournaments and workshops.",
      areaServed: { "@type": "City", name: "Kozhikode (Calicut)", containedInPlace: { "@type": "State", name: "Kerala" } },
      address: { "@type": "PostalAddress", addressLocality: "Kozhikode", addressRegion: "Kerala", addressCountry: "IN" },
    },
    {
      "@type": "WebSite",
      name: "Game Ground",
      url: siteUrl(),
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body suppressHydrationWarning>
        <script {...jsonLdScript(siteJsonLd)} />
        <Providers>
          <Suspense>
            <PostHogPageView />
          </Suspense>
          {children}
          <PWARegister />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: { background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
