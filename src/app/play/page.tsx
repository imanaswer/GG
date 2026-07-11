import type { Game } from "@/hooks/useData";
import { GET as gamesGET } from "@/app/api/games/route";
import { ssrGet } from "@/lib/ssrData";
import PlayClient from "./PlayClient";

// ISR: server-render open games into HTML for SEO; 60s keeps listings fresh.
export const revalidate = 60;

export default async function PlayPage() {
  return <PlayClient initialGames={await ssrGet<Game[]>(gamesGET, "/api/games")} />;
}
