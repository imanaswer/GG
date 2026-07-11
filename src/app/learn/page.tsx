import type { Coach } from "@/hooks/useData";
import { GET as coachesGET } from "@/app/api/coaches/route";
import { ssrGet } from "@/lib/ssrData";
import LearnClient from "./LearnClient";

// ISR: server-render coach listings into HTML for SEO; 60s matches the API's CDN cache.
export const revalidate = 60;

export default async function LearnPage() {
  return <LearnClient initialCoaches={await ssrGet<Coach[]>(coachesGET, "/api/coaches")} />;
}
