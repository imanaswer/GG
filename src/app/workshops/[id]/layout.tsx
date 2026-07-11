import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id },
      select: { title: true, sport: true, location: true, imageUrl: true },
    });
    if (!workshop) return {};
    return pageMeta(
      `${workshop.title} — ${workshop.sport} Workshop in ${workshop.location || "Kozhikode"}`,
      `Join ${workshop.title}, a ${workshop.sport} workshop in Kozhikode (Calicut). Register on Game Ground.`.slice(0, 160),
      `/workshops/${id}`,
      workshop.imageUrl || undefined,
    );
  } catch {
    return {}; // DB hiccup degrades to default metadata
  }
}

export default function WorkshopDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
