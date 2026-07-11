import type { SportEvent } from "@/hooks/useData";
import { GET as eventsGET } from "@/app/api/events/route";
import { ssrGet } from "@/lib/ssrData";
import EventsClient from "./EventsClient";

// ISR: server-render event listings into HTML for SEO; 60s matches the API's CDN cache.
export const revalidate = 60;

export default async function EventsPage() {
  return <EventsClient initialEvents={await ssrGet<SportEvent[]>(eventsGET, "/api/events")} />;
}
