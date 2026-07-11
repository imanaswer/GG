import type { Camp } from "@/hooks/useData";
import { GET as campGET } from "@/app/api/camps/[id]/route";
import { ssrGet } from "@/lib/ssrData";
import CampClient from "./CampClient";

// ISR per camp: crawlers get full camp HTML; session bits come from the client refetch.
export const revalidate = 60;

export default async function CampPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const camp = await ssrGet<Camp>(campGET, `/api/camps/${id}`, { id });
  return <CampClient params={params} initialCamp={camp} />;
}
