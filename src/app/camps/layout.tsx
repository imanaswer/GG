import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Sports Camps in Kozhikode (Calicut) — Summer & Training Camps",
  "Sign up for summer camps and sports training camps in Kozhikode (Calicut). Coached programs for all ages and skill levels — book your spot online.",
  "/camps",
);

export default function CampsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
