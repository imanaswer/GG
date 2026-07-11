import type { Workshop } from "@/hooks/useData";
import { GET as workshopGET } from "@/app/api/workshops/[id]/route";
import { ssrGet } from "@/lib/ssrData";
import WorkshopClient from "./WorkshopClient";

// ISR per workshop: crawlers get full workshop HTML; session bits come from the client refetch.
export const revalidate = 60;

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workshop = await ssrGet<Workshop>(workshopGET, `/api/workshops/${id}`, { id });
  return <WorkshopClient params={params} initialWorkshop={workshop} />;
}
