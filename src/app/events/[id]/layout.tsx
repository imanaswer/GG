import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { pageMeta, jsonLdScript } from "@/lib/seo";

// cache() dedupes the fetch between generateMetadata and the layout render.
const getEvent = cache(async (id: string) => {
  try {
    return await prisma.sportEvent.findUnique({
      where: { id, published: true },
      select: { title: true, sport: true, location: true, address: true, startDate: true, endDate: true, imageUrl: true },
    });
  } catch {
    return null; // DB hiccup degrades to default metadata instead of a 500
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return {};
  return pageMeta(
    `${event.title} — ${event.sport} Event in ${event.location || "Kozhikode"}`,
    `Register for ${event.title}, a ${event.sport} event in Kozhikode (Calicut) at ${event.location}. Book your entry on Game Ground.`.slice(0, 160),
    `/events/${id}`,
    event.imageUrl || undefined,
  );
}

export default async function EventDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return children;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.title,
    sport: event.sport,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    image: event.imageUrl || undefined,
    location: {
      "@type": "Place",
      name: event.location,
      address: { "@type": "PostalAddress", streetAddress: event.address, addressLocality: "Kozhikode", addressRegion: "Kerala", addressCountry: "IN" },
    },
  };
  return (
    <>
      <script {...jsonLdScript(jsonLd)} />
      {children}
    </>
  );
}
