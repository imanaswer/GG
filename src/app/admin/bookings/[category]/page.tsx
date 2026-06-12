"use client";
import { use, Suspense } from "react";
import { notFound } from "next/navigation";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { CATEGORY_CONFIGS } from "@/lib/adminBookings/config";
import { BookingsCategoryView } from "@/components/admin/bookings/BookingsCategoryView";
import type { CategoryKey } from "@/lib/adminBookings/types";

const VALID: CategoryKey[] = ["coaches", "play-sessions", "workshops", "camps", "events"];

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);

  if (!VALID.includes(category as CategoryKey)) return notFound();

  return (
    <AdminGuard>
      <AdminShell>
        <Suspense fallback={null}>
          <BookingsCategoryView config={CATEGORY_CONFIGS[category as CategoryKey]} />
        </Suspense>
      </AdminShell>
    </AdminGuard>
  );
}
