"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  description: string; features: string[]; imageUrl: string;
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
  players?: { id: string; userId: string; name: string; username: string; avatarUrl?: string; rating: number; joinedAt: string }[];
  playerCount?: number;
};

export type Booking = {
  id: string; userId: string; coachId: string; batchId?: string;
  status: string; note?: string; coachName?: string; sport?: string;
  imageUrl?: string; location?: string; createdAt: string; updatedAt: string;
};

export type UserProfile = {
  id: string; name: string; username: string; email?: string; location?: string;
  bio?: string; avatarUrl?: string; role: string;
  reliabilityScore: number; gamesPlayed: number; gamesOrganized: number; attendanceRate: number;
  sports: { sport: string; games: number; level: string }[];
  upcomingGames: Game[];
  organizedGames: Game[];
  achievements: { title: string; description: string; icon: string }[];
  bookings?: Booking[];
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
  return useMutation<{ joined?: boolean; waitlisted?: boolean; position?: number; slotsLeft?: number }, Error, string>({
    mutationFn: id => f(`/api/games/${id}`, { method: "POST" }),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", id] });
      if (data.waitlisted) toast.success(`Added to waitlist at position ${data.position}`);
      else toast.success("You've joined the game! 🎉");
    },
    onError: e => toast.error(e.message),
  });
}
export function useLeaveGame() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: id => f(`/api/games/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", id] });
      toast.success("You've left the game.");
    },
    onError: e => toast.error(e.message),
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
  return useMutation<Booking, Error, { coachId: string; batchId?: string; note?: string }>({
    mutationFn: data => f("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Booking request sent! Coach will confirm within 24h.");
    },
    onError: e => toast.error(e.message),
  });
}
export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: bookingId => f("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); toast.success("Booking cancelled."); },
    onError: e => toast.error(e.message),
  });
}

// ─── User profile ─────────────────────────────────────────────────────────────
export function useUserProfile(id: string) {
  return useQuery<UserProfile>({ queryKey: ["user", id], queryFn: () => f(`/api/users/${id}`), enabled: !!id });
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
export type SportEvent = {
  id: string; title: string; sport: string;
  type: string; date: string; startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string;
  participants: number; maxParticipants: number;
  prizePool: string; entryFee: string; entryFeeAmount: number;
  difficulty: string; imageUrl: string; featured: boolean; status: string;
  description: string; format: string[]; prizes: string[]; requirements: string[];
  schedule: { day: string; time: string; event: string }[];
  organizer: string; organizerContact: string; tags: string[];
  registrations?: { id: string; teamName?: string }[];
  registeredCount?: number;
  userRegistration?: { id: string; paymentStatus: string; teamName?: string | null } | null;
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
