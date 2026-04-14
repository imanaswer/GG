import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, handleErr } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const { type = "games", context = "" } = await req.json().catch(() => ({}));
    const db = getDB();

    const openGames = db.games
      .filter(g => g.status === "open" && g.slotsLeft > 0)
      .map(({ description: _, rules: __, ...g }) => g)
      .slice(0, 15);

    const coaches = db.coaches
      .filter(c => c.seatsLeft > 0)
      .map(({ description: _, features: __, batches: _b, ...c }) => c)
      .slice(0, 15);

    let userCtx = "New user, no history.";
    if (session) {
      const user = db.users.find(u => u.id === session.id);
      const sportMap: Record<string, number> = {};
      db.gamePlayers.filter(gp => gp.userId === session.id).forEach(gp => {
        const g = db.games.find(x => x.id === gp.gameId);
        if (g) sportMap[g.sport] = (sportMap[g.sport] ?? 0) + 1;
      });
      const favSports = Object.entries(sportMap).sort((a, b) => b[1] - a[1]).map(([s]) => s);
      userCtx = `Player: ${user?.name}. Location: ${user?.location ?? "Kozhikode"}. Games played: ${user?.gamesPlayed}. Favourite sports: ${favSports.join(", ") || "none yet"}.`;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes("your-")) {
      return ok(fallback(type, openGames, coaches));
    }

    const items = type === "games" ? openGames : coaches;
    const prompt = `You are Game Ground's AI sports matchmaking engine.
User profile: ${userCtx}
Additional context: ${context || "none"}

Available ${type} (JSON):
${JSON.stringify(items, null, 2)}

Return ONLY a JSON array of the top 3 recommendations:
[{ "id": "...", "reason": "one concise sentence why this is a great fit" }]
No markdown, no explanation, just the array.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });

    if (!r.ok) return ok(fallback(type, openGames, coaches));

    const aiData = await r.json();
    let recs: { id: string; reason: string }[] = [];
    try { recs = JSON.parse(aiData.content?.[0]?.text ?? "[]"); } catch { return ok(fallback(type, openGames, coaches)); }

    const hydrated = recs
      .map(rec => {
        const item = (items as { id: string }[]).find(i => i.id === rec.id);
        return item ? { ...item, aiReason: rec.reason } : null;
      })
      .filter(Boolean);

    return ok({ items: hydrated, poweredBy: "claude" });
  } catch (e) { return handleErr(e); }
}

function fallback(type: string, games: Record<string, unknown>[], coaches: Record<string, unknown>[]) {
  const src = type === "games" ? games : coaches;
  const items = src.slice(0, 3).map((item, i) => ({
    ...item,
    aiReason: type === "games"
      ? ["Great game happening soon near you!", "Skill level matches your profile.", "Only a few spots left — join fast!"][i]
      : ["Top-rated in your area.", "Perfect for your skill level.", "Great availability right now."][i],
  }));
  return { items, poweredBy: "rule-based" };
}
