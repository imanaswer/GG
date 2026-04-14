import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/context/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Game Ground — Learn. Play. Connect.", template: "%s | Game Ground" },
  description: "Kozhikode's hyperlocal sports platform. Find quality coaches, join pickup games, sign up for summer camps and tournaments.",
  keywords: ["sports", "Kozhikode", "Kerala", "basketball", "football", "cricket", "badminton", "coaches", "pickup games", "summer camps", "tournaments"],
  authors: [{ name: "Game Ground" }],
  creator: "Game Ground",
  publisher: "Game Ground",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://gameground.in"),
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
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#e63946",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
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
