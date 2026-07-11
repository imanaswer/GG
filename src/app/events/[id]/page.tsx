import type { SportEvent } from "@/hooks/useData";
import { GET as eventGET } from "@/app/api/events/[id]/route";
import { ssrGet } from "@/lib/ssrData";
import EventClient from "./EventClient";

// ISR per event: crawlers get full event HTML; session bits come from the client refetch.
export const revalidate = 60;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await ssrGet<SportEvent>(eventGET, `/api/events/${id}`, { id });
  return <EventClient params={params} initialEvent={event} />;
}
