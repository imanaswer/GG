import { okCached, handleErr } from "@/lib/api";
import { SPORTS, SKILL_LEVELS, COACH_TYPES, EVENT_TYPES } from "@/lib/taxonomy";

/**
 * Public reference data. taxonomy.ts is a server module, so non-web clients
 * (the mobile app) had no way to read it and kept a hand-copied list that
 * drifted. This is the one place that list is published from.
 * No auth — none of it is user-specific.
 */
export async function GET() {
  try {
    return okCached(
      {
        sports: SPORTS,
        skillLevels: SKILL_LEVELS,
        coachTypes: COACH_TYPES,
        eventTypes: EVENT_TYPES,
      },
      3600,
    );
  } catch (e) { return handleErr(e); }
}
