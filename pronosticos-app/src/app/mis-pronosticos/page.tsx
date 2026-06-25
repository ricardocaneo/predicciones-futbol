import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rowToMatch, type MatchRow, type PredictionRow } from "@/lib/supabase/match-mapper";
import { calculateMatchPoints } from "@/lib/scoring";
import type { Match, Prediction } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

function StatCard({
  value,
  label,
  color,
  tooltip,
  extra,
}: {
  value: number;
  label: string;
  color: string;
  tooltip: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-center cursor-default">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {extra}
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {/* Tooltip */}
      <div className="hidden sm:block pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl bg-slate-800 dark:bg-slate-700 px-3 py-2 text-xs text-slate-100 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 shadow-xl">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
      </div>
    </div>
  );
}

type PredWithMatch = Prediction & { match: Match };

export default async function MisPronosticosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: predRows }, { data: allScheduled }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, total_points")
      .eq("id", user.id)
      .single(),

    supabase
      .from("predictions")
      .select("id, match_id, predicted_home_score, predicted_away_score, prediction_mode, matches(id, phase, group_name, home_team, away_team, starts_at, status, home_score, away_score, minute, home_team_id, away_team_id)")
      .eq("user_id", user.id),

    supabase
      .from("matches")
      .select("id, phase, group_name, home_team, away_team, starts_at, status, home_score, away_score, minute, home_team_id, away_team_id")
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true }),
  ]);

  const myPredictions: PredWithMatch[] = (predRows ?? []).map((row) => {
    const matchRow = row.matches as unknown as MatchRow;
    const match = rowToMatch(matchRow);
    const prediction: Prediction = {
      id: row.id,
      userId: user.id,
      matchId: row.match_id,
      homeScore: row.predicted_home_score,
      awayScore: row.predicted_away_score,
      isLive: row.prediction_mode === "live",
    };
    return { ...prediction, match };
  });

  const predictedIds = new Set(myPredictions.map((p) => p.matchId));
  const pending: Match[] = (allScheduled ?? [])
    .filter((m) => !predictedIds.has(m.id))
    .map((m) => rowToMatch(m as MatchRow));

  const finished  = myPredictions.filter((p) => p.match.status === "finished");
  const live      = myPredictions.filter((p) => p.match.status === "live");
  const scheduled = myPredictions.filter((p) => p.match.status === "scheduled");

  // Stats
  let totalPoints = 0;
  let provisionalPoints = 0;
  let exactResults = 0;
  let correctResults = 0;

  for (const p of [...finished, ...live]) {
    const { homeScore, awayScore } = p.match;
    if (homeScore === undefined || awayScore === undefined) continue;
    const result = { homeScore, awayScore };
    const r = calculateMatchPoints(p.match, p, result);
    if (!r.isProvisional) totalPoints += r.totalPoints;
    if (r.isProvisional)  provisionalPoints += r.totalPoints;
    if (r.breakdown.category === "exact" || r.breakdown.category === "live") exactResults++;
    if (r.totalPoints > 0) correctResults++;
  }

  return (
    <div className="space-y-8">
      {profile && (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3">
          <UserAvatar displayName={profile.display_name} avatarUrl={profile.avatar_url ?? undefined} size={44} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 dark:text-white leading-tight">{profile.display_name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{profile.total_points} pts</p>
          </div>
          <Link href="/perfil" className="shrink-0 text-xs font-semibold text-wc-red hover:underline">
            Ver perfil →
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Mis Pronósticos</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Mira cómo te está yendo con tus predicciones
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          value={totalPoints}
          label="Puntos"
          color="text-slate-900 dark:text-white"
          tooltip="Puntos confirmados en partidos ya finalizados. No incluye puntos provisorios de partidos en curso."
          extra={provisionalPoints > 0 ? (
            <p className="text-xs text-amber-500">+{provisionalPoints} prov.</p>
          ) : undefined}
        />
        <StatCard
          value={exactResults}
          label="Exactos"
          color="text-green-500"
          tooltip="Partidos donde acertaste el marcador exacto. Vale tanto para pronósticos pre-partido como en vivo."
        />
        <StatCard
          value={correctResults}
          label="Con puntos"
          color="text-amber-500"
          tooltip="Partidos donde sumaste al menos 1 punto: marcador exacto, diferencia de goles, tendencia (quién gana/empata) o punto de consolación."
        />
      </div>

      {live.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <SectionHeading>En vivo</SectionHeading>
          </div>
          <div className="space-y-3">
            {live.map((p) => (
              <MatchCard key={p.id} match={p.match} prediction={p} allowPrediction />
            ))}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <SectionHeading>Próximos — ya pronosticados</SectionHeading>
          <div className="space-y-3">
            {scheduled.map((p) => (
              <MatchCard key={p.id} match={p.match} prediction={p} allowPrediction />
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <SectionHeading>Sin pronosticar</SectionHeading>
          <p className="text-xs text-slate-400 -mt-1 mb-3">Todavía puedes pronosticar estos partidos</p>
          <div className="space-y-3">
            {pending.map((match) => (
              <MatchCard key={match.id} match={match} allowPrediction />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <SectionHeading>Finalizados</SectionHeading>
          <div className="space-y-3">
            {finished.map((p) => (
              <MatchCard key={p.id} match={p.match} prediction={p} />
            ))}
          </div>
        </section>
      )}

      {myPredictions.length === 0 && pending.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-medium dark:text-slate-300">No tienes pronósticos todavía</p>
          <p className="text-sm mt-1">Ve a Partidos para hacer tu primer pronóstico</p>
        </div>
      )}
    </div>
  );
}
