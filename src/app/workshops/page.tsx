import type { Workshop } from "@/hooks/useData";
import { GET as workshopsGET } from "@/app/api/workshops/route";
import { ssrGet } from "@/lib/ssrData";
import WorkshopsClient from "./WorkshopsClient";

// ISR: server-render workshop listings into HTML for SEO; 60s matches the API's CDN cache.
export const revalidate = 60;

export default async function WorkshopsPage() {
  return <WorkshopsClient initialWorkshops={await ssrGet<Workshop[]>(workshopsGET, "/api/workshops")} />;
}
