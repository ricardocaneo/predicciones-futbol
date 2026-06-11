import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rowToMatch, rowToPrediction, type MatchRow, type PredictionRow } from "@/lib/supabase/match-mapper";
import type { Match, Prediction, LeaderboardEntry } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import Leaderboard from "@/components/Leaderboard";

const GRACE_MS = 20 * 60 * 1000;

type PredRow = {
  user_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  matches: { status: string; home_score: number | null; away_score: number | null } | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: matchRows }, { data: profiles }, { data: allPreds }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, phase, group_name, home_team, away_team, starts_at, status, home_score, away_score, minute, home_team_id, away_team_id, updated_at")
      .order("starts_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, total_points")
      .eq("is_active", true)
      .order("total_points", { ascending: false })
      .limit(3),
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

  const topEntries: LeaderboardEntry[] = (profiles ?? []).map((profile, index) => ({
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

  const now = Date.now();
  const recentlyFinishedIds = new Set<string>(
    (matchRows ?? [])
      .filter((r) => {
        if (r.status !== "finished") return false;
        const updatedAt = (r as unknown as Record<string, unknown>).updated_at as string | null;
        if (!updatedAt) return false;
        return now - new Date(updatedAt).getTime() <= GRACE_MS;
      })
      .map((r) => r.id)
  );

  const matches: Match[] = ((matchRows ?? []) as unknown as MatchRow[]).map(rowToMatch);
  const liveMatches = matches.filter((m) => m.status === "live" || recentlyFinishedIds.has(m.id));
  const nextMatches = matches.filter((m) => m.status === "scheduled").slice(0, 2);

  let predictionMap = new Map<string, Prediction>();
  if (user) {
    const visibleIds = [...liveMatches, ...nextMatches].map((m) => m.id);
    if (visibleIds.length > 0) {
      const { data: predRows } = await supabase
        .from("predictions")
        .select("id, match_id, predicted_home_score, predicted_away_score, prediction_mode")
        .eq("user_id", user.id)
        .in("match_id", visibleIds);
      if (predRows) {
        for (const row of predRows) {
          predictionMap.set(row.match_id, rowToPrediction(row as PredictionRow, user.id));
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-wc-navy rounded-2xl px-6 py-7 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-wc-red font-bold text-xs uppercase tracking-widest mb-2">
            Mundial 2026 · USA · CAN · MEX
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            El Juego<br />del Mundial
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Pronosticá cada partido y competí con tus amigos por el título de campeón del Mundial
          </p>
          {!user && (
            <div className="flex gap-3 mt-5">
              <Link
                href="/registro"
                className="bg-wc-red text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
              >
                Unirse al juego
              </Link>
              <Link
                href="/login"
                className="bg-white/10 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/20 transition-colors"
              >
                Ingresar
              </Link>
            </div>
          )}
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[80px] opacity-[0.07] select-none pointer-events-none">
          🏆
        </div>
      </div>

      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">En vivo ahora</h2>
          </div>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionMap.get(match.id)}
                allowPrediction={!!user}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Próximos partidos</h2>
          <Link href="/partidos" className="text-sm text-wc-red font-medium hover:underline">
            Ver todos →
          </Link>
        </div>
        {nextMatches.length === 0 ? (
          <p className="text-sm text-slate-400">No hay partidos próximos</p>
        ) : (
          <div className="space-y-3">
            {nextMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionMap.get(match.id)}
                allowPrediction={!!user}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Top 3 ranking</h2>
          <Link href="/ranking" className="text-sm text-wc-red font-medium hover:underline">
            Ver completo →
          </Link>
        </div>
        {topEntries.length > 0 ? (
          <Leaderboard entries={topEntries} highlightUserId={user?.id} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">
            El ranking se llenará cuando haya jugadores registrados
          </p>
        )}
      </section>
    </div>
  );
}
