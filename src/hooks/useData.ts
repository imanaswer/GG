"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ─── shared fetcher ───────────────────────────────────────────────────────────
async function f<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: "include", ...opts });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error ?? "Request failed");
  return j.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type Coach = {
  id: string; name: string; sport: string; type: string; skillLevel: string;
  price: string; priceMin: number; priceMax: number; timing: string;
  location: string; address: string; phone: string; email: string;
  description: string; features: string[]; imageUrl: string; coverImageUrl?: string; photos?: string[];
  lat?: number | null; lng?: number | null;
  rating: number; reviewCount: number; totalSeats: number; seatsLeft: number;
  batches?: Batch[]; reviews?: CoachReview[];
  userBooking?: { id: string; status: string } | null;
};
export type Batch = { id: string; coachId: string; day: string; time: string; level: string; seats: number };
export type CoachReview = { id: string; rating: number; text: string; reviewerName: string; createdAt: string };

export type Game = {
  id: string; sport: string; title: string; location: string; address: string;
  scheduledAt: string; duration: number; slots: number; slotsLeft: number;
  skillLevel: string; organizerId: string; organizerName?: string;
  organizerRating?: number; organizerGames?: number;
  cost: string; costAmount: number; description: string; rules: string[];
  imageUrl: string; status: string; createdAt: string;
  lat?: number | null; lng?: number | null;
  players?: { id: string; userId: string; name: string; username: string; avatarUrl?: string; rating: number; tier?: string; reputationScore?: number; joinedAt: string }[];
  playerCount?: number;
};

export type Booking = {
  id: string; userId: string; coachId: string; batchId?: string;
  status: string; note?: string; coachName?: string; sport?: string;
  imageUrl?: string; location?: string; createdAt: string; updatedAt: string;
  rejectionReason?: string | null;
  approvedAt?: string | null; rejectedAt?: string | null;
  completedAt?: string | null; cancelledAt?: string | null;
};

export type ProfileGameItem = {
  id: string; sport: string; title: string; location: string; scheduledAt: string;
  status: string; role: "player" | "organizer"; groupStatus: "upcoming" | "completed" | "cancelled";
};
export type ProfileRegItem = {
  id: string; title: string; startDate?: string; endDate?: string;
  status: string; paymentStatus: string; groupStatus: "upcoming" | "completed" | "cancelled";
  entityId?: string; rejectionReason?: string | null;
};
export type ProfileUpcoming = {
  type: "coach" | "game" | "workshop" | "camp" | "event";
  id: string; title: string; date: string | null; location?: string; status?: string; href: string;
};
export type ProfileSeason = { id: string; label: string; daysLeft: number; rep: number; rank: number };
export type ProfileCompletion = { pct: number; items: { key: string; label: string; done: boolean }[] };

export type UserProfile = {
  id: string; name: string; username: string; email?: string; location?: string;
  bio?: string; avatarUrl?: string; role: string;
  reliabilityScore: number; gamesPlayed: number; gamesOrganized: number; attendanceRate: number;
  reputationScore: number; tier: string; tierUpdatedAt?: string;
  playerRank?: number; playerCount?: number;
  sports: string[];
  sportActivity: { sport: string; games: number; level: string }[];
  games: ProfileGameItem[];
  upcoming?: ProfileUpcoming;
  bookings?: Booking[];
  registrations?: { camps: ProfileRegItem[]; events: ProfileRegItem[]; workshops: ProfileRegItem[] };
  profileCompletion?: ProfileCompletion;
  season: ProfileSeason;
  createdAt: string;
};

export type AIResult = { items: Record<string, unknown>[]; poweredBy: string };

// ─── Coaches ──────────────────────────────────────────────────────────────────
export type CoachFilters = { q?: string; sport?: string; skillLevel?: string; type?: string; available?: string };

export function useCoaches(filters: CoachFilters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  return useQuery<Coach[]>({ queryKey: ["coaches", filters], queryFn: () => f(`/api/coaches?${params}`) });
}
export function useCoach(id: string) {
  return useQuery<Coach>({ queryKey: ["coach", id], queryFn: () => f(`/api/coaches/${id}`), enabled: !!id });
}

// ─── Games ────────────────────────────────────────────────────────────────────
export type GameFilters = { q?: string; sport?: string; skillLevel?: string; cost?: string };

export function useGames(filters: GameFilters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  return useQuery<Game[]>({ queryKey: ["games", filters], queryFn: () => f(`/api/games?${params}`) });
}
export function useGame(id: string) {
  return useQuery<Game>({ queryKey: ["game", id], queryFn: () => f(`/api/games/${id}`), enabled: !!id });
}
export function useJoinGame() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation<{ joined?: boolean; waitlisted?: boolean; position?: number; slotsLeft?: number }, Error, string, { previous?: Game }>({
    mutationFn: id => f(`/api/games/${id}`, { method: "POST" }),

    // Optimistically add the current user to the game's player list and decrement slots.
    onMutate: async (id) => {
      if (!user) return {};
      await qc.cancelQueries({ queryKey: ["game", id] });
      const previous = qc.getQueryData<Game>(["game", id]);
      if (previous && previous.slotsLeft > 0) {
        const optimisticPlayer = {
          id: `__optimistic_${user.id}`,
          userId: user.id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl ?? undefined,
          rating: 4.5,
          tier: "bronze",
          reputationScore: 0,
          joinedAt: new Date().toISOString(),
        };
        const slotsLeft = previous.slotsLeft - 1;
        qc.setQueryData<Game>(["game", id], {
          ...previous,
          slotsLeft,
          status: slotsLeft === 0 ? "full" : previous.status,
          players: [...(previous.players ?? []), optimisticPlayer],
          playerCount: (previous.playerCount ?? previous.players?.length ?? 0) + 1,
        });
      }
      return { previous };
    },

    onError: (e, id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["game", id], ctx.previous);
      toast.error(e.message);
    },

    onSuccess: (data) => {
      if (data.waitlisted) toast.success(`Added to waitlist at position ${data.position}`);
      else toast.success("You've joined the game! 🎉");
    },

    onSettled: (_, __, id) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", id] });
    },
  });
}
export function useLeaveGame() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation<unknown, Error, string, { previous?: Game }>({
    mutationFn: id => f(`/api/games/${id}`, { method: "DELETE" }),

    onMutate: async (id) => {
      if (!user) return {};
      await qc.cancelQueries({ queryKey: ["game", id] });
      const previous = qc.getQueryData<Game>(["game", id]);
      if (previous) {
        const players = (previous.players ?? []).filter(p => p.userId !== user.id);
        qc.setQueryData<Game>(["game", id], {
          ...previous,
          slotsLeft: previous.slotsLeft + 1,
          status: previous.status === "full" ? "open" : previous.status,
          players,
          playerCount: Math.max(0, (previous.playerCount ?? previous.players?.length ?? 0) - 1),
        });
      }
      return { previous };
    },

    onError: (e, id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["game", id], ctx.previous);
      toast.error(e.message);
    },

    onSuccess: () => toast.success("You've left the game."),

    onSettled: (_, __, id) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", id] });
    },
  });
}
export function useCreateGame() {
  const qc = useQueryClient();
  return useMutation<Game, Error, Record<string, unknown>>({
    mutationFn: data => f("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["games"] }); toast.success("Game created! 🎉"); },
    onError: e => toast.error(e.message),
  });
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
export function useBookings() {
  return useQuery<Booking[]>({ queryKey: ["bookings"], queryFn: () => f("/api/bookings") });
}
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, { coachId: string; batchId?: string; note?: string; phone?: string }>({
    mutationFn: data => f("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["coaches"] });
      qc.invalidateQueries({ queryKey: ["coach"] });
      toast.success("Booking request sent! Coach will confirm within 24h.");
    },
    onError: e => toast.error(e.message),
  });
}
export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: id => f("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "cancelled" }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["coaches"] });
      qc.invalidateQueries({ queryKey: ["coach"] });
      toast.success("Booking cancelled.");
    },
    onError: e => toast.error(e.message),
  });
}

// ─── User profile ─────────────────────────────────────────────────────────────
export function useUserProfile(id: string) {
  return useQuery<UserProfile>({ queryKey: ["user", id], queryFn: () => f(`/api/users/${id}`), enabled: !!id });
}

export type ActivityItem = {
  id: string;
  kind: "joined" | "organized" | "tier-up" | "registration" | "review";
  icon: string;
  text: string;
  href?: string;
  ts: string;
};
export type ActivityResponse = {
  items: ActivityItem[];
  streakWeeks: number;
  heatmap: { dayCounts: Record<string, number>; total: number; mostActiveDay: string | null; windowDays: number };
};
export function useUserActivity(id: string) {
  return useQuery<ActivityResponse>({
    queryKey: ["user-activity", id],
    queryFn: () => f(`/api/users/${id}/activity`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export type Teammate = {
  id: string; name: string; username: string; avatarUrl?: string | null;
  tier: string; sharedGames: number; lastPlayedAt: string;
};
export function useUserTeammates(id: string) {
  return useQuery<{ teammates: Teammate[] }>({
    queryKey: ["user-teammates", id],
    queryFn: () => f(`/api/users/${id}/teammates`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export type LeaderboardType = "players" | "organizers";
export type LeaderboardPeriod = "all" | "month";
export type LeaderboardRow = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  location?: string | null;
  tier: string;
  reputationScore: number;
  gamesPlayed: number;
  gamesOrganized: number;
  attendanceRate: number;
  reliabilityScore: number;
  rank: number;
};
export type LeaderboardResponse = {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  generatedAt: string;
  rows: LeaderboardRow[];
};

export function useLeaderboard(type: LeaderboardType, period: LeaderboardPeriod) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", type, period],
    queryFn: () => f(`/api/leaderboard?type=${type}&period=${period}`),
    staleTime: 60_000,
  });
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export function useAIRecommendations(type: "games" | "coaches") {
  return useQuery<AIResult>({
    queryKey: ["ai", type],
    queryFn: () => f("/api/ai/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) }),
    staleTime: 120_000,
  });
}


// ─── Camps ────────────────────────────────────────────────────────────────────
export type Camp = {
  id: string; title: string; sport: string; duration: string; dates: string;
  startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string;
  price: number; priceDisplay: string;
  ageGroup: string; skillLevel: string; rating: number; reviews: number;
  participants: number; maxParticipants: number;
  description: string; highlights: string[]; included: string[]; whatToBring: string[];
  coaches: { name: string; experience: string; specialty: string }[];
  dailySchedule: { time: string; activity: string }[];
  testimonials: { name: string; age: number; text: string; rating: number }[];
  imageUrl: string; featured: boolean; status: string;
  tags: string[]; organizer: string; organizerContact: string;
  registrations?: { id: string; childName: string; childAge: number }[];
  registeredCount?: number;
  userRegistration?: { id: string; paymentStatus: string; childName: string; childAge: number } | null;
};

export type CampFilters = { q?: string; sport?: string; skillLevel?: string; duration?: string; ageGroup?: string };

export function useCamps(filters: CampFilters = {}) {
  const p = new URLSearchParams(Object.entries(filters).filter(([,v]) => v) as [string,string][]);
  return useQuery<Camp[]>({ queryKey: ["camps", filters], queryFn: () => f(`/api/camps?${p}`) });
}
export function useCamp(id: string) {
  return useQuery<Camp>({ queryKey: ["camp", id], queryFn: () => f(`/api/camps/${id}`), enabled: !!id });
}
export function useRegisterCamp() {
  const qc = useQueryClient();
  return useMutation<{ registered: boolean }, Error, { campId: string; childName: string; childAge: number }>({
    mutationFn: ({ campId, ...data }) => f(`/api/camps/${campId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: (_, { campId }) => { qc.invalidateQueries({ queryKey: ["camps"] }); qc.invalidateQueries({ queryKey: ["camp", campId] }); toast.success("Registered for camp! 🎉 See you there."); },
    onError: (e) => toast.error(e.message),
  });
}
export function useCancelCamp() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: campId => f(`/api/camps/${campId}`, { method: "DELETE" }),
    onSuccess: (_, campId) => {
      qc.invalidateQueries({ queryKey: ["camps"] });
      qc.invalidateQueries({ queryKey: ["camp", campId] });
      toast.success("Registration cancelled.");
    },
    onError: e => toast.error(e.message),
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────
export type ScheduleItem = { title: string; date: string; time: string; location: string };
export type LegacyScheduleItem = { day: string; time: string; event: string };

export type SportEvent = {
  id: string; title: string; sport: string;
  type: string; date: string; startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string;
  participants: number; maxParticipants: number;
  prizePool: string; entryFee: string; entryFeeAmount: number;
  difficulty: string; imageUrl: string; featured: boolean; status: string;
  description: string; format: string[]; prizes: string[]; requirements: string[];
  schedule: (ScheduleItem | LegacyScheduleItem)[];
  organizer: string; organizerContact: string; tags: string[];
  // Slice 1 additions (optional — older rows may omit when narrowed)
  published?: boolean; thumbnailUrl?: string;
  aboutLong?: string; whatYouGet?: string[]; venueInfo?: string;
  matchFormat?: string; teamSize?: string; numRounds?: string; structure?: string; eligibility?: string; rules?: string[];
  additionalRewards?: string[];
  city?: string; state?: string; country?: string; pincode?: string; mapsLink?: string;
  lat?: number | null; lng?: number | null;
  approvalMode?: string; currency?: string; gstPercent?: number; convenienceFeePct?: number;
  registrations?: { id: string; teamName?: string }[];
  registeredCount?: number;
  userRegistration?: { id: string; paymentStatus: string; teamName?: string | null; status?: string; rejectionReason?: string | null } | null;
};

export type EventFilters = { q?: string; sport?: string; type?: string; difficulty?: string; when?: string };

export function useEvents(filters: EventFilters = {}) {
  const p = new URLSearchParams(Object.entries(filters).filter(([,v]) => v) as [string,string][]);
  return useQuery<SportEvent[]>({ queryKey: ["events", filters], queryFn: () => f(`/api/events?${p}`), refetchInterval: 30_000 });
}
export function useEvent(id: string) {
  return useQuery<SportEvent>({ queryKey: ["event", id], queryFn: () => f(`/api/events/${id}`), enabled: !!id, refetchInterval: 15_000 });
}
export function useRegisterEvent() {
  const qc = useQueryClient();
  return useMutation<{ registered: boolean }, Error, { eventId: string; teamName?: string }>({
    mutationFn: ({ eventId, ...data }) => f(`/api/events/${eventId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: (_, { eventId }) => { qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["event", eventId] }); toast.success("Registered for event! 🏆"); },
    onError: (e) => toast.error(e.message),
  });
}
export function useCancelEvent() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: eventId => f(`/api/events/${eventId}`, { method: "DELETE" }),
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Registration cancelled.");
    },
    onError: e => toast.error(e.message),
  });
}

// ─── Workshops ───────────────────────────────────────────────────────────────
export type Workshop = {
  id: string; title: string; sport: string; description: string;
  sessionType: string; sessionCount: number; sessionDuration: string;
  sessions: { date: string; time: string; topic: string; description: string }[];
  startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string;
  price: number; priceDisplay: string;
  ageGroup: string; audienceType: string; skillLevel: string;
  rating: number; reviewCount: number;
  participants: number; maxParticipants: number;
  instructor: { name: string; bio: string; imageUrl: string; credentials: string };
  testimonials: { name: string; text: string; rating: number }[];
  imageUrl: string; featured: boolean; status: string;
  tags: string[]; highlights: string[]; requirements: string[];
  organizer: string; organizerContact: string;
  registeredCount?: number;
  userRegistration?: {
    id: string; paymentStatus: string;
    participantName: string; participantAge?: number; registrationType: string;
  } | null;
};

export type WorkshopFilters = { q?: string; sport?: string; skillLevel?: string; sessionType?: string; audienceType?: string };

export function useWorkshops(filters: WorkshopFilters = {}) {
  const p = new URLSearchParams(Object.entries(filters).filter(([,v]) => v) as [string,string][]);
  return useQuery<Workshop[]>({ queryKey: ["workshops", filters], queryFn: () => f(`/api/workshops?${p}`) });
}
export function useWorkshop(id: string) {
  return useQuery<Workshop>({ queryKey: ["workshop", id], queryFn: () => f(`/api/workshops/${id}`), enabled: !!id });
}
export function useRegisterWorkshop() {
  const qc = useQueryClient();
  return useMutation<{ registered: boolean }, Error, { workshopId: string; participantName: string; participantAge?: number; registrationType: string }>({
    mutationFn: ({ workshopId, ...data }) => f(`/api/workshops/${workshopId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: (_, { workshopId }) => { qc.invalidateQueries({ queryKey: ["workshops"] }); qc.invalidateQueries({ queryKey: ["workshop", workshopId] }); toast.success("Registered for workshop!"); },
    onError: (e) => toast.error(e.message),
  });
}
export function useCancelWorkshop() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: workshopId => f(`/api/workshops/${workshopId}`, { method: "DELETE" }),
    onSuccess: (_, workshopId) => {
      qc.invalidateQueries({ queryKey: ["workshops"] });
      qc.invalidateQueries({ queryKey: ["workshop", workshopId] });
      toast.success("Registration cancelled.");
    },
    onError: e => toast.error(e.message),
  });
}
