import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types";
import Leaderboard from "@/components/Leaderboard";
import UserAvatar from "@/components/UserAvatar";

export default async function RankingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  type PredRow = {
    user_id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    matches: { status: string; home_score: number | null; away_score: number | null } | null;
  };

  const [{ data: profiles }, { data: allPreds }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, total_points")
      .order("total_points", { ascending: false }),
    supabase
      .from("predictions")
      .select("user_id, predicted_home_score, predicted_away_score, matches(status, home_score, away_score)"),
  ]);

  const predCounts  = new Map<string, number>();
  const exactCounts = new Map<string, number>();

  for (const row of (allPreds ?? [])) {
    const p = row as unknown as PredRow;
    predCounts.set(p.user_id, (predCounts.get(p.user_id) ?? 0) + 1);

    const m = p.matches;
    if (
      m?.status === "finished" &&
      m.home_score !== null && m.away_score !== null &&
      p.predicted_home_score === m.home_score &&
      p.predicted_away_score === m.away_score
    ) {
      exactCounts.set(p.user_id, (exactCounts.get(p.user_id) ?? 0) + 1);
    }
  }

  const entries: LeaderboardEntry[] = (profiles ?? []).map((profile, index) => ({
    rank:         index + 1,
    previousRank: index + 1,
    user: {
      id:        profile.id,
      name:      profile.display_name,
      avatar:    profile.display_name?.[0] ?? "?",
      avatarUrl: profile.avatar_url ?? undefined,
    },
    points:       profile.total_points,
    predictions:  predCounts.get(profile.id) ?? 0,
    exactResults: exactCounts.get(profile.id) ?? 0,
  }));

  const myEntry   = entries.find((e) => e.user.id === user?.id);
  const myProfile = (profiles ?? []).find((p) => p.id === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ranking</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Posiciones actuales del torneo</p>
      </div>

      {myEntry && (
        <div className="bg-wc-navy rounded-2xl px-5 py-5 text-white">
          <div className="flex items-center gap-3 mb-4">
            <UserAvatar
              displayName={myEntry.user.name}
              avatarUrl={myProfile?.avatar_url ?? undefined}
              size={44}
            />
            <div>
              <p className="font-bold text-white leading-tight">{myEntry.user.name}</p>
              <p className="text-xs text-wc-red font-bold uppercase tracking-widest">Tu resumen</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black">#{myEntry.rank}</p>
              <p className="text-xs text-slate-400 mt-0.5">Posición</p>
            </div>
            <div>
              <p className="text-2xl font-black">{myEntry.points}</p>
              <p className="text-xs text-slate-400 mt-0.5">Puntos</p>
            </div>
            <div>
              <p className="text-2xl font-black">{myEntry.predictions}</p>
              <p className="text-xs text-slate-400 mt-0.5">Pronósticos</p>
            </div>
          </div>
        </div>
      )}

      {entries.length > 0 ? (
        <Leaderboard entries={entries} highlightUserId={user?.id} />
      ) : (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-medium dark:text-slate-300">Todavía no hay jugadores</p>
          <p className="text-sm mt-1">El ranking se poblará cuando los jugadores se registren</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Sistema de puntos</h3>
        <ul className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
          <li className="flex items-center gap-2">
            <span className="text-green-500 font-bold">+5</span>
            <span>Resultado exacto (marcador correcto)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-500 font-bold">+3</span>
            <span>Ganador o empate correcto</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">+0</span>
            <span>Pronóstico incorrecto</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
