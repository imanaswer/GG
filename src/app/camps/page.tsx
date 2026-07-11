import type { Camp } from "@/hooks/useData";
import { GET as campsGET } from "@/app/api/camps/route";
import { ssrGet } from "@/lib/ssrData";
import CampsClient from "./CampsClient";

// ISR: server-render camp listings into HTML for SEO; 60s matches the API's CDN cache.
export const revalidate = 60;

export default async function CampsPage() {
  return <CampsClient initialCamps={await ssrGet<Camp[]>(campsGET, "/api/camps")} />;
}
