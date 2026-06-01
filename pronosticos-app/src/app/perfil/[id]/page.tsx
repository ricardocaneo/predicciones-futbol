import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rowToMatch, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match, Prediction } from "@/lib/types";
import { MASTER_TOUCH_LOCK_DATE } from "@/lib/scoring-rules";
import UserAvatar from "@/components/UserAvatar";
import TeamFlag from "@/components/TeamFlag";
import MatchCard from "@/components/MatchCard";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

type PredWithMatch = Prediction & { match: Match };

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: predRows }, { data: masterTouchRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, favorite_team, total_points")
      .eq("id", id)
      .single(),

    supabase
      .from("predictions")
      .select("id, match_id, predicted_home_score, predicted_away_score, prediction_mode, matches(id, phase, group_name, home_team, away_team, starts_at, status, home_score, away_score, minute)")
      .eq("user_id", id),

    supabase
      .from("toque_maestro_predictions")
      .select(`
        champion_team_id,
        runner_up_team_id,
        golden_boot_player_id,
        champion:teams!champion_team_id(name, country_code),
        runner_up:teams!runner_up_team_id(name, country_code),
        golden_boot:players!golden_boot_player_id(name, teams(country_code))
      `)
      .eq("user_id", id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const isOwnProfile = user?.id === id;
  const masterTouchLocked = new Date() >= MASTER_TOUCH_LOCK_DATE;
  // El Toque Maestro se muestra: siempre en el propio perfil, o para otros solo después del cierre
  const showMasterTouch = masterTouchRow && (isOwnProfile || masterTouchLocked);

  type TeamJoin   = { name: string; country_code: string } | null;
  type PlayerJoin = { name: string; teams: { country_code: string } | null } | null;
  const champion   = masterTouchRow?.champion   as TeamJoin;
  const runnerUp   = masterTouchRow?.runner_up  as TeamJoin;
  const goldenBoot = masterTouchRow?.golden_boot as PlayerJoin;

  const predictions: PredWithMatch[] = (predRows ?? []).map((row) => {
    const matchRow = row.matches as unknown as MatchRow;
    const match = rowToMatch(matchRow);
    const prediction: Prediction = {
      id: row.id,
      userId: id,
      matchId: row.match_id,
      homeScore: row.predicted_home_score,
      awayScore: row.predicted_away_score,
      isLive: row.prediction_mode === "live",
    };
    return { ...prediction, match };
  }).sort((a, b) => {
    const order: Record<string, number> = { live: 0, finished: 1, scheduled: 2 };
    return (order[a.match.status] ?? 2) - (order[b.match.status] ?? 2);
  });

  const live     = predictions.filter((p) => p.match.status === "live");
  const finished = predictions.filter((p) => p.match.status === "finished");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <UserAvatar
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url ?? undefined}
          size={80}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {profile.display_name}
          </h1>
          {isOwnProfile && (
            <p className="text-xs text-wc-red font-semibold mt-0.5">Tú</p>
          )}
          {profile.favorite_team && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="mr-1">❤</span>{profile.favorite_team}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-wc-navy rounded-2xl px-5 py-4 text-white">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-4xl font-black text-wc-gold">{profile.total_points}</p>
            <p className="text-sm text-slate-400 mt-1">Puntos totales</p>
          </div>
          <div>
            <p className="text-4xl font-black text-white">{predictions.length}</p>
            <p className="text-sm text-slate-400 mt-1">Pronósticos cerrados</p>
          </div>
        </div>
      </div>

      {/* Toque Maestro */}
      {showMasterTouch && (
        <section>
          <SectionHeading>Toque Maestro ⭐</SectionHeading>
          <div className="bg-wc-navy rounded-2xl px-5 py-4 space-y-3">
            {champion && (
              <div className="flex items-center gap-3">
                <TeamFlag countryCode={champion.country_code} name={champion.name} size={32} />
                <div>
                  <p className="text-xs text-slate-400">Campeón</p>
                  <p className="text-sm font-bold text-white">{champion.name}</p>
                </div>
              </div>
            )}
            {runnerUp && (
              <div className="flex items-center gap-3">
                <TeamFlag countryCode={runnerUp.country_code} name={runnerUp.name} size={32} />
                <div>
                  <p className="text-xs text-slate-400">Subcampeón</p>
                  <p className="text-sm font-bold text-white">{runnerUp.name}</p>
                </div>
              </div>
            )}
            {goldenBoot && (
              <div className="flex items-center gap-3">
                <TeamFlag countryCode={goldenBoot.teams?.country_code ?? ""} name={goldenBoot.name} size={32} />
                <div>
                  <p className="text-xs text-slate-400">Bota de Oro</p>
                  <p className="text-sm font-bold text-white">{goldenBoot.name}</p>
                </div>
              </div>
            )}
            {!masterTouchLocked && isOwnProfile && (
              <p className="text-xs text-slate-500 pt-1">
                Solo vos podés ver esto hasta el {MASTER_TOUCH_LOCK_DATE.toLocaleDateString("es", { day: "numeric", month: "long", timeZone: "America/Santiago" })}.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Pronósticos cerrados */}
      {live.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <SectionHeading>En vivo</SectionHeading>
          </div>
          <div className="space-y-3">
            {live.map((p) => (
              <MatchCard key={p.id} match={p.match} prediction={p} />
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

      {predictions.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-medium dark:text-slate-300">
            {isOwnProfile
              ? "Todavía no tenés pronósticos cerrados"
              : "Todavía no hay pronósticos visibles de este jugador"}
          </p>
          <p className="text-sm mt-1">
            Los pronósticos se muestran una vez que el partido comienza
          </p>
        </div>
      )}
    </div>
  );
}
