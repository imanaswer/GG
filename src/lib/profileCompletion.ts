export interface CompletionInput {
  hasAvatar: boolean;
  hasFavoriteSport: boolean;
  gamesPlayed: number;
  hasCompletedBooking: boolean;
}
export interface CompletionItem { key: string; label: string; done: boolean; }
export interface CompletionResult { pct: number; items: CompletionItem[]; }

export function computeProfileCompletion(input: CompletionInput): CompletionResult {
  const items: CompletionItem[] = [
    { key: "photo",   label: "Add a profile photo",     done: input.hasAvatar },
    { key: "sport",   label: "Add a favorite sport",    done: input.hasFavoriteSport },
    { key: "game",    label: "Join your first game",    done: input.gamesPlayed >= 1 },
    { key: "booking", label: "Complete your first booking", done: input.hasCompletedBooking },
  ];
  const done = items.filter(i => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}
