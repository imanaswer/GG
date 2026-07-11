import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Search Coaches, Games & Events in Kozhikode",
  "Search Game Ground for coaches, pickup games, grounds, events, camps and workshops in Kozhikode (Calicut).",
  "/search",
);

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
