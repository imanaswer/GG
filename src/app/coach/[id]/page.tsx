import type { Coach } from "@/hooks/useData";
import { GET as coachGET } from "@/app/api/coaches/[id]/route";
import { ssrGet } from "@/lib/ssrData";
import CoachClient from "./CoachClient";

// ISR per coach: crawlers get full profile HTML; the cookie-less SSR call means
// userBooking is always null in cached HTML — the client refetch fills it in.
export const revalidate = 60;

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coach = await ssrGet<Coach>(coachGET, `/api/coaches/${id}`, { id });
  return <CoachClient params={params} initialCoach={coach} />;
}
