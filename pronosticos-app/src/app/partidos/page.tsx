import { createClient } from "@/lib/supabase/server";
import { rowToMatch, rowToPrediction, type MatchRow, type PredictionRow } from "@/lib/supabase/match-mapper";
import type { Match, Prediction } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import PreviousMatchesSection from "@/components/PreviousMatchesSection";

const STATUS_ORDER: Record<string, number> = { live: 0, scheduled: 1, finished: 2 };
const GRACE_MS = 20 * 60 * 1000;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 dark:text-slate-400">
      <p className="text-4xl mb-4">🏟️</p>
      <p className="font-semibold text-slate-700 dark:text-slate-300">
        Los partidos aún no fueron cargados
      </p>
      <p className="text-sm mt-1">Volvé a intentar en unos minutos.</p>
    </div>
  );
}

export default async function PartidosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, phase, group_name, home_team, away_team, starts_at, status, home_score, away_score, minute, home_team_id, away_team_id, pen_score, updated_at")
    .order("starts_at", { ascending: true });

  let predictionMap = new Map<string, Prediction>();

  if (user && matchRows && matchRows.length > 0) {
    const matchIds = matchRows.map((m) => m.id);
    const { data: predRows } = await supabase
      .from("predictions")
      .select("id, match_id, predicted_home_score, predicted_away_score, prediction_mode, advancing_team_id")
      .eq("user_id", user.id)
      .in("match_id", matchIds);

    if (predRows) {
      for (const row of predRows) {
        predictionMap.set(row.match_id, rowToPrediction(row as PredictionRow, user.id));
      }
    }
  }

  if (!matchRows || matchRows.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Partidos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Pronósticos abiertos hasta el inicio de cada partido · ventana en vivo hasta el min 30
          </p>
        </div>
        <EmptyState />
      </div>
    );
  }

  const now = Date.now();
  const recentlyFinishedIds = new Set<string>(
    matchRows
      .filter((r) => {
        if (r.status !== "finished") return false;
        const updatedAt = (r as unknown as Record<string, unknown>).updated_at as string | null;
        if (!updatedAt) return false;
        return now - new Date(updatedAt).getTime() <= GRACE_MS;
      })
      .map((r) => r.id)
  );

  const matches: Match[] = (matchRows as unknown as MatchRow[]).map(rowToMatch);
  const sorted = [...matches].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const live             = sorted.filter((m) => m.status === "live");
  const recentlyFinished = sorted.filter((m) => recentlyFinishedIds.has(m.id));
  const scheduled        = sorted.filter((m) => m.status === "scheduled");
  const finished         = sorted.filter((m) => m.status === "finished" && !recentlyFinishedIds.has(m.id));

  const predObj: Record<string, Prediction> = Object.fromEntries(predictionMap);
  const liveSection = [...live, ...recentlyFinished];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Partidos</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Pronósticos abiertos hasta el inicio de cada partido · ventana en vivo hasta el min 30
        </p>
      </div>

      {liveSection.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <SectionHeading>En vivo</SectionHeading>
          </div>
          <div className="space-y-3">
            {liveSection.map((match) => (
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

      <PreviousMatchesSection
        matches={finished}
        predictions={predObj}
        allowPrediction={!!user}
      />

      {scheduled.length > 0 && (
        <section>
          <SectionHeading>Próximos</SectionHeading>
          <div className="space-y-3">
            {scheduled.map((match) => (
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
    </div>
  );
}
