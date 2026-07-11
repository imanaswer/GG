import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const camp = await prisma.camp.findUnique({
      where: { id },
      select: { title: true, sport: true, location: true, imageUrl: true },
    });
    if (!camp) return {};
    return pageMeta(
      `${camp.title} — ${camp.sport} Camp in ${camp.location || "Kozhikode"}`,
      `Register for ${camp.title}, a ${camp.sport} camp in Kozhikode (Calicut). Book your spot on Game Ground.`.slice(0, 160),
      `/camps/${id}`,
      camp.imageUrl || undefined,
    );
  } catch {
    return {}; // DB hiccup degrades to default metadata
  }
}

export default function CampDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
