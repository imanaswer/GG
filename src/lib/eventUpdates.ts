import { z } from "zod";

export type EventUpdateItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string; // ISO
};

/**
 * Order updates for display: pinned items first, then newest-first by createdAt.
 * Pure and non-mutating (returns a new array). Works on any row carrying
 * `pinned` + an ISO `createdAt` string.
 */
export function sortEventUpdates<T extends { pinned: boolean; createdAt: string }>(updates: T[]): T[] {
  return [...updates].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Admin input for posting an update. */
export const eventUpdateInputSchema = z.object({
  title: z.string().max(120).default(""),
  body: z.string().min(1, "Update body is required").max(2000),
  pinned: z.boolean().default(false),
});

export type EventUpdateInput = z.infer<typeof eventUpdateInputSchema>;
