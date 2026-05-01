import { prisma } from "@/lib/prisma";
import {
  computeReputation,
  getTier,
  monthsBetween,
  daysBetween,
  type ReputationInput,
  type Tier,
} from "@/lib/reputation";

export type RecomputeResult = {
  userId: string;
  score: number;
  tier: Tier;
  previousTier: Tier;
  promoted: boolean;
};

async function gatherInputs(userId: string, now: Date): Promise<{ input: ReputationInput; user: { createdAt: Date; tier: string } } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      lastActivityAt: true,
      gamesPlayed: true,
      gamesOrganized: true,
      attendanceRate: true,
      tier: true,
    },
  });
  if (!user) return null;

  const [reviewsGiven, campsCompleted, eventsParticipated, workshopsAttended] = await Promise.all([
    prisma.review.count({ where: { userId } }),
    prisma.campRegistration.count({
      where: { userId, paymentStatus: "paid", camp: { endDate: { lt: now } } },
    }),
    prisma.eventRegistration.count({
      where: { userId, paymentStatus: "paid", event: { endDate: { lt: now } } },
    }),
    prisma.workshopRegistration.count({
      where: { userId, paymentStatus: "paid", workshop: { endDate: { lt: now } } },
    }),
  ]);

  const accountAgeMonths = monthsBetween(user.createdAt, now);
  const lastActivity = user.lastActivityAt ?? user.createdAt;
  const daysSinceLastActivity = daysBetween(lastActivity, now);

  const input: ReputationInput = {
    gamesPlayed: user.gamesPlayed,
    gamesOrganized: user.gamesOrganized,
    attendanceRate: user.attendanceRate,
    reviewsGiven,
    campsCompleted,
    eventsParticipated,
    workshopsAttended,
    accountAgeMonths,
    daysSinceLastActivity,
  };

  return { input, user: { createdAt: user.createdAt, tier: user.tier } };
}

export async function recomputeUser(userId: string): Promise<RecomputeResult | null> {
  const now = new Date();
  const gathered = await gatherInputs(userId, now);
  if (!gathered) return null;

  const score = computeReputation(gathered.input);
  const tier = getTier(score);
  const previousTier = gathered.user.tier as Tier;
  const tierChanged = tier !== previousTier;

  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: score,
      tier,
      ...(tierChanged && { tierUpdatedAt: now }),
    },
  });

  return {
    userId,
    score,
    tier,
    previousTier,
    promoted: tierChanged && tierIndex(tier) > tierIndex(previousTier),
  };
}

export async function touchActivity(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { lastActivityAt: new Date() } });
}

export async function recomputeAll(opts: { batchSize?: number } = {}): Promise<{ processed: number; promoted: number }> {
  const batchSize = opts.batchSize ?? 200;
  let cursor: string | undefined;
  let processed = 0;
  let promoted = 0;

  for (;;) {
    const batch = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: batchSize,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { id: "asc" },
    });
    if (!batch.length) break;
    for (const { id } of batch) {
      const result = await recomputeUser(id);
      if (result) {
        processed += 1;
        if (result.promoted) promoted += 1;
      }
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < batchSize) break;
  }

  return { processed, promoted };
}

function tierIndex(t: Tier): number {
  return ["bronze", "silver", "gold", "elite", "pro"].indexOf(t);
}
