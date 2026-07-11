import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Sports Workshops in Kozhikode (Calicut)",
  "Join hands-on sports workshops in Kozhikode (Calicut) led by experienced coaches. Single sessions and multi-day programs — register online.",
  "/workshops",
);

export default function WorkshopsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
