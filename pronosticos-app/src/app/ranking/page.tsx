import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, Match, Prediction, TournamentPhase } from "@/lib/types";
import { calculateMatchPoints } from "@/lib/scoring";
import { LIVE_WINDOW_MINUTES, SCORING_MATRIX, ADVANCEMENT_BONUS, PHASE_LABELS } from "@/lib/scoring-rules";
import Leaderboard from "@/components/Leaderboard";
import UserAvatar from "@/components/UserAvatar";
import AutoRefresh from "@/components/AutoRefresh";
import RankingLayout from "./RankingLayout";
import type { ChatMessage } from "@/components/ChatBox";

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

  const [{ data: profiles }, { data: liveMatchRows }, { data: phaseRows }, { data: chatRows }, { data: tmRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, total_points, last_read_at")
      .eq("is_active", true)
      .order("total_points", { ascending: false }),
    supabase
      .from("matches")
      .select("id, phase, home_team, away_team, home_score, away_score, minute, time, home_team_id, away_team_id")
      .eq("status", "live")
      .limit(5),
    supabase
      .from("matches")
      .select("phase")
      .in("status", ["live", "finished"]),
    supabase
      .from("chat_messages")
      .select("id, user_id, message, created_at, profiles(display_name, avatar_url)")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("toque_maestro_predictions")
      .select("user_id, points, points_breakdown")
      .not("points", "is", null),
  ]);

  // Paginación para superar el límite de 1000 filas de PostgREST
  const allPreds: PredRow[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("predictions")
      .select("user_id, predicted_home_score, predicted_away_score, matches(status, home_score, away_score)")
      .range(offset, offset + PAGE - 1);
    const rows = (batch as unknown as PredRow[] | null) ?? [];
    allPreds.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  // Fase más avanzada con partidos activos → determina qué matriz de puntos mostrar
  const activePhasesSet = new Set((phaseRows ?? []).map((r) => r.phase as TournamentPhase));
  const currentPhase = [...PHASE_ORDER].reverse().find((p) => activePhasesSet.has(p)) ?? "group";
  const matrix     = SCORING_MATRIX[currentPhase];
  const advBonus   = ADVANCEMENT_BONUS[currentPhase];
  const isKnockout = currentPhase !== "group";

  const predCounts  = new Map<string, number>();
  const exactCounts = new Map<string, number>();

  for (const row of allPreds) {
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

  type TmRow = { user_id: string; points: number; points_breakdown: Record<string, number> | null };
  const tmMap = new Map<string, TmRow>(
    ((tmRows ?? []) as unknown as TmRow[]).map((r) => [r.user_id, r])
  );
  const showMasterTouch = tmMap.size > 0 && [...tmMap.values()].some((r) => (r.points ?? 0) > 0);

  const entries: LeaderboardEntry[] = (profiles ?? [])
    .map((profile) => {
      const tm = tmMap.get(profile.id);
      const tmPts = tm?.points ?? 0;
      const tmBd = tm?.points_breakdown ?? null;
      return {
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
        ...(showMasterTouch && {
          masterTouchPoints: tmPts,
          masterTouchBreakdown: tmBd ? {
            champion:    tmBd.champion    ?? 0,
            runner_up:   tmBd.runner_up   ?? 0,
            golden_boot: tmBd.golden_boot ?? 0,
            casi_casi:   tmBd.casi_casi   ?? 0,
            total:       tmBd.total       ?? tmPts,
          } : undefined,
        }),
      };
    })
    .sort((a, b) => {
      const totalA = a.points + (a.masterTouchPoints ?? 0);
      const totalB = b.points + (b.masterTouchPoints ?? 0);
      return totalB - totalA || b.exactResults - a.exactResults;
    })
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
    time: string | null;
    home_team_id: string | null;
    away_team_id: string | null;
  };
  type LivePredRow = {
    user_id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    prediction_mode: string;
    points: number;
    advancing_team_id: string | null;
  };

  // Partidos que deben mostrar ranking provisional:
  // - minuto > 30 (ventana cerrada), O
  // - minute = null pero hay estado especial (HT, ET, PEN)
  const qualifiedLiveMatches = ((liveMatchRows as unknown as LiveMatchRow[] | null) ?? []).filter((m) =>
    (m.minute !== null && m.minute > LIVE_WINDOW_MINUTES) ||
    (m.minute === null && m.time !== null && m.time !== "")
  );
  const validLiveMatches = qualifiedLiveMatches.filter(
    (m) => m.home_score !== null && m.away_score !== null
  );

  let displayEntries = entries;
  let liveMatchInfoList: {
    homeTeam: string; awayTeam: string;
    homeScore: number; awayScore: number;
    minute: number | null; time: string | null;
    phase: string;
  }[] = [];

  if (validLiveMatches.length > 0) {
    try {
      // Fetch predicciones de todos los partidos en vivo en paralelo
      const allPredsResults = await Promise.all(
        validLiveMatches.map((m) =>
          supabase
            .from("predictions")
            .select("user_id, predicted_home_score, predicted_away_score, prediction_mode, points, advancing_team_id")
            .eq("match_id", m.id)
        )
      );

      // Por usuario: array de puntos y pronósticos, uno por partido en vivo
      const provisionalPerMatchMap = new Map<string, number[]>();
      const provisionalPredMap     = new Map<string, { homeScore: number | null; awayScore: number | null; advancingTeamName: string | null }[]>();

      validLiveMatches.forEach((m, idx) => {
        const preds = (allPredsResults[idx].data as unknown as LivePredRow[] | null) ?? [];
        const fakeMatch = { phase: m.phase as TournamentPhase, status: "live" } as Match;
        const result    = { homeScore: m.home_score!, awayScore: m.away_score! };

        for (const pred of preds) {
          // Si ya tiene puntos calculados, edge_save_points_batch ya corrió y esos puntos
          // están en total_points — no sumar provisional encima para evitar doble conteo.
          if (pred.points > 0) continue;

          const fakePred: Prediction = {
            id: "", userId: pred.user_id, matchId: m.id,
            homeScore: pred.predicted_home_score,
            awayScore: pred.predicted_away_score,
            isLive:    pred.prediction_mode === "live",
          };
          const pts = calculateMatchPoints(fakeMatch, fakePred, result);

          const advancingTeamName = pred.advancing_team_id === m.home_team_id ? m.home_team
            : pred.advancing_team_id === m.away_team_id ? m.away_team
            : null;

          const currentPts  = provisionalPerMatchMap.get(pred.user_id) ?? new Array(validLiveMatches.length).fill(0);
          currentPts[idx]   = pts.totalPoints;
          provisionalPerMatchMap.set(pred.user_id, currentPts);

          const currentPred = provisionalPredMap.get(pred.user_id) ??
            Array.from({ length: validLiveMatches.length }, () => ({ homeScore: null as number | null, awayScore: null as number | null, advancingTeamName: null as string | null }));
          currentPred[idx]  = { homeScore: pred.predicted_home_score, awayScore: pred.predicted_away_score, advancingTeamName };
          provisionalPredMap.set(pred.user_id, currentPred);
        }
      });

      displayEntries = entries
        .map((e) => {
          const perMatch = provisionalPerMatchMap.get(e.user.id) ?? new Array(validLiveMatches.length).fill(0);
          const perPred  = provisionalPredMap.get(e.user.id) ??
            Array.from({ length: validLiveMatches.length }, () => ({ homeScore: null as number | null, awayScore: null as number | null }));
          const totalProvisional = perMatch.reduce((sum, p) => sum + p, 0);
          return {
            ...e,
            previousRank:           e.rank,
            provisionalPoints:      perMatch,
            provisionalPredictions: perPred,
            points:                 e.points + totalProvisional,
          };
        })
        .sort((a, b) => b.points - a.points || b.exactResults - a.exactResults)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      liveMatchInfoList = validLiveMatches.map((m) => ({
        homeTeam:  m.home_team,
        awayTeam:  m.away_team,
        homeScore: m.home_score!,
        awayScore: m.away_score!,
        minute:    m.minute,
        time:      m.time ?? null,
        phase:     m.phase,
      }));
    } catch {
      // Falla silenciosa — se muestra el ranking oficial
      displayEntries = entries;
    }
  }

  const isLive = liveMatchInfoList.length > 0;

  const myEntry = displayEntries.find((e) => e.user.id === user?.id);
  const myProfile = (profiles ?? []).find((p) => p.id === user?.id);

  // Chat
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url ?? null }])
  );

  const lastReadAt = (profiles ?? []).find((p) => p.id === user?.id)?.last_read_at ?? null;
  const { count: unreadCount } = lastReadAt
    ? await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastReadAt)
    : { count: 0 };

  type ChatRow = {
    id: string; user_id: string; message: string; created_at: string;
    profiles: { display_name: string; avatar_url: string | null } | null;
  };
  const initialMessages: ChatMessage[] = ((chatRows ?? []) as unknown as ChatRow[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    message: r.message,
    created_at: r.created_at,
    display_name: r.profiles?.display_name ?? "Usuario",
    avatar_url: r.profiles?.avatar_url ?? null,
  }));

  return (
    <RankingLayout
      initialMessages={initialMessages}
      profileMap={profileMap}
      currentUserId={user?.id ?? null}
      initialUnread={unreadCount ?? 0}
      headerSlot={
        <>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ranking</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Posiciones actuales del torneo</p>
            <p className="text-slate-400 dark:text-slate-500 mt-0.5 text-xs">Ranking provisional en vivo a partir del minuto {LIVE_WINDOW_MINUTES} de cada partido, cuando cierra la ventana de pronósticos</p>
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
                    {isLive ? "Tu resumen provisional" : "Tu resumen"}
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
                    {isLive ? "Pts provisorios" : "Puntos"}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black">{myEntry.predictions}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Pronósticos</p>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      {displayEntries.length > 0 ? (
        <Leaderboard
          entries={displayEntries}
          highlightUserId={user?.id}
          liveMatches={liveMatchInfoList.length > 0 ? liveMatchInfoList : undefined}
          showMasterTouch={showMasterTouch}
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
      {isLive && <AutoRefresh intervalMs={60000} />}
    </RankingLayout>
  );
}
