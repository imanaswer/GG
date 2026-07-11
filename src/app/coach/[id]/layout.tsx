import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { pageMeta, jsonLdScript } from "@/lib/seo";

// cache() dedupes the fetch between generateMetadata and the layout render.
const getCoach = cache(async (id: string) => {
  try {
    return await prisma.coach.findUnique({
      where: { id, status: "active" },
      select: { name: true, sport: true, location: true, description: true, imageUrl: true },
    });
  } catch {
    return null; // DB hiccup degrades to default metadata instead of a 500
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const coach = await getCoach(id);
  if (!coach) return {};
  return pageMeta(
    `${coach.name} — ${coach.sport} Coach in ${coach.location || "Kozhikode"}`,
    `Book ${coach.sport} coaching with ${coach.name} in Kozhikode (Calicut). ${coach.description}`.slice(0, 160),
    `/coach/${id}`,
    coach.imageUrl || undefined,
  );
}

export default async function CoachDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coach = await getCoach(id);
  if (!coach) return children;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: coach.name,
    jobTitle: `${coach.sport} Coach`,
    image: coach.imageUrl || undefined,
    address: { "@type": "PostalAddress", addressLocality: coach.location || "Kozhikode", addressRegion: "Kerala", addressCountry: "IN" },
  };
  return (
    <>
      <script {...jsonLdScript(jsonLd)} />
      {children}
    </>
  );
}
