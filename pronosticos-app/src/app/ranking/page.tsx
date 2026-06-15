import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, Match, Prediction, TournamentPhase } from "@/lib/types";
import { calculateMatchPoints } from "@/lib/scoring";
import { LIVE_WINDOW_MINUTES, SCORING_MATRIX, ADVANCEMENT_BONUS, PHASE_LABELS } from "@/lib/scoring-rules";
import Leaderboard from "@/components/Leaderboard";
import UserAvatar from "@/components/UserAvatar";
import AutoRefresh from "@/components/AutoRefresh";

const PHASE_ORDER: TournamentPhase[] = [
  "group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final",
];

export default async function RankingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  type PredRow = {
    user_id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    matches: { status: string; home_score: number | null; away_score: number | null } | null;
  };

  const [{ data: profiles }, { data: allPreds }, { data: liveMatchRows }, { data: phaseRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, total_points")
      .eq("is_active", true)
      .order("total_points", { ascending: false }),
    supabase
      .from("predictions")
      .select("user_id, predicted_home_score, predicted_away_score, matches(status, home_score, away_score)"),
    supabase
      .from("matches")
      .select("id, phase, home_team, away_team, home_score, away_score, minute")
      .eq("status", "live")
      .gt("minute", LIVE_WINDOW_MINUTES)
      .limit(1),
    supabase
      .from("matches")
      .select("phase")
      .in("status", ["live", "scheduled"]),
  ]);

  // Fase más avanzada con partidos activos → determina qué matriz de puntos mostrar
  const activePhasesSet = new Set((phaseRows ?? []).map((r) => r.phase as TournamentPhase));
  const currentPhase = [...PHASE_ORDER].reverse().find((p) => activePhasesSet.has(p)) ?? "group";
  const matrix     = SCORING_MATRIX[currentPhase];
  const advBonus   = ADVANCEMENT_BONUS[currentPhase];
  const isKnockout = currentPhase !== "group";

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

  const entries: LeaderboardEntry[] = (profiles ?? [])
    .map((profile) => ({
      rank:         0,
      previousRank: 0,
      user: {
        id:        profile.id,
        name:      profile.display_name,
        avatar:    profile.display_name?.[0] ?? "?",
        avatarUrl: profile.avatar_url ?? undefined,
      },
      points:       profile.total_points,
      predictions:  predCounts.get(profile.id) ?? 0,
      exactResults: exactCounts.get(profile.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || b.exactResults - a.exactResults)
    .map((e, i) => ({ ...e, rank: i + 1, previousRank: i + 1 }));

  // ── Ranking virtual en vivo ───────────────────────────────────────────────
  type LiveMatchRow = {
    id: string;
    phase: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    minute: number | null;
  };
  type LivePredRow = {
    user_id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    prediction_mode: string;
  };

  const liveMatch = (liveMatchRows as unknown as LiveMatchRow[] | null)?.[0] ?? null;

  let displayEntries = entries;
  let liveMatchInfo: {
    homeTeam: string; awayTeam: string;
    homeScore: number; awayScore: number; minute: number;
  } | null = null;

  if (liveMatch && liveMatch.home_score !== null && liveMatch.away_score !== null) {
    try {
      const { data: livePreds } = await supabase
        .from("predictions")
        .select("user_id, predicted_home_score, predicted_away_score, prediction_mode")
        .eq("match_id", liveMatch.id);

      const provisionalMap = new Map<string, number>();
      const fakeMatch = { phase: liveMatch.phase as TournamentPhase, status: "live" } as Match;
      const result    = { homeScore: liveMatch.home_score, awayScore: liveMatch.away_score };

      for (const pred of (livePreds as unknown as LivePredRow[] | null) ?? []) {
        const fakePred: Prediction = {
          id: "", userId: pred.user_id, matchId: liveMatch.id,
          homeScore: pred.predicted_home_score,
          awayScore: pred.predicted_away_score,
          isLive:    pred.prediction_mode === "live",
        };
        const pts = calculateMatchPoints(fakeMatch, fakePred, result);
        provisionalMap.set(pred.user_id, pts.totalPoints);
      }

      displayEntries = entries
        .map((e) => ({
          ...e,
          previousRank:     e.rank,
          provisionalPoints: provisionalMap.get(e.user.id) ?? 0,
          points:            e.points + (provisionalMap.get(e.user.id) ?? 0),
        }))
        .sort((a, b) => b.points - a.points || b.exactResults - a.exactResults)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      liveMatchInfo = {
        homeTeam:  liveMatch.home_team,
        awayTeam:  liveMatch.away_team,
        homeScore: liveMatch.home_score,
        awayScore: liveMatch.away_score,
        minute:    liveMatch.minute ?? 0,
      };
    } catch {
      // Falla silenciosa — se muestra el ranking oficial
      displayEntries = entries;
    }
  }

  const myEntry = displayEntries.find((e) => e.user.id === user?.id);
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
              <p className="text-xs text-wc-red font-bold uppercase tracking-widest">
                {liveMatchInfo ? "Tu resumen provisional" : "Tu resumen"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black">#{myEntry.rank}</p>
              <p className="text-xs text-slate-400 mt-0.5">Posición</p>
            </div>
            <div>
              <p className="text-2xl font-black">{myEntry.points}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {liveMatchInfo ? "Pts provisorios" : "Puntos"}
              </p>
            </div>
            <div>
              <p className="text-2xl font-black">{myEntry.predictions}</p>
              <p className="text-xs text-slate-400 mt-0.5">Pronósticos</p>
            </div>
          </div>
        </div>
      )}

      {displayEntries.length > 0 ? (
        <Leaderboard
          entries={displayEntries}
          highlightUserId={user?.id}
          liveMatch={liveMatchInfo ?? undefined}
        />
      ) : (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-medium dark:text-slate-300">Todavía no hay jugadores</p>
          <p className="text-sm mt-1">El ranking se poblará cuando los jugadores se registren</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Sistema de puntos — {PHASE_LABELS[currentPhase]}
        </h3>
        <ul className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
          <li className="flex items-center gap-2">
            <span className="text-green-500 font-bold w-8 shrink-0">+{matrix.exact}</span>
            <span>Marcador exacto</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400 font-bold w-8 shrink-0">+{matrix.goalDiff}</span>
            <span>Diferencia de goles correcta</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-500 font-bold w-8 shrink-0">+{matrix.tendency}</span>
            <span>{isKnockout ? "Ganador correcto" : "Ganador o empate correcto"}</span>
          </li>
          {advBonus && (
            <li className="flex items-center gap-2">
              <span className="text-amber-400 font-bold w-8 shrink-0">+{advBonus}</span>
              <span>Bono clasificado (ganador correcto en eliminatoria)</span>
            </li>
          )}
          {matrix.consolation > 0 && (
            <li className="flex items-center gap-2">
              <span className="text-slate-400 font-bold w-8 shrink-0">+{matrix.consolation}</span>
              <span>Goles consuelo</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <span className="text-blue-400 font-bold w-8 shrink-0">+{matrix.liveExact}</span>
            <span>Marcador exacto en vivo (ventana primeros {LIVE_WINDOW_MINUTES} min)</span>
          </li>
        </ul>
      </div>

      {/* Refresca el server component cada 60s mientras hay partido vivo */}
      {liveMatchInfo && <AutoRefresh intervalMs={60000} />}
    </div>
  );
}
