import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Sports Events & Tournaments in Kozhikode (Calicut)",
  "Discover upcoming sports events and tournaments in Kozhikode (Calicut) — football, basketball, cricket, badminton and more. Register and book your entry online.",
  "/events",
);

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
