import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MASTER_TOUCH_LOCK_DATE } from "@/lib/scoring-rules";
import UserAvatar from "@/components/UserAvatar";
import TeamFlag from "@/components/TeamFlag";

export const metadata: Metadata = {
  title: "Mi Perfil — La Pollita Mundialera",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const [{ data: profile }, { data: predCount }, { data: mt }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url, bio, favorite_team, total_points")
      .eq("id", user.id)
      .single(),
    supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("toque_maestro_predictions")
      .select(`
        champion:teams!champion_team_id(name, country_code),
        runner_up:teams!runner_up_team_id(name, country_code),
        golden_boot:players!golden_boot_player_id(name, teams(country_code))
      `)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile) redirect("/login");

  type TeamJoin   = { name: string; country_code: string } | null;
  type PlayerJoin = { name: string; teams: { country_code: string } | null } | null;
  const champion   = mt?.champion   as unknown as TeamJoin;
  const runnerUp   = mt?.runner_up  as unknown as TeamJoin;
  const goldenBoot = mt?.golden_boot as unknown as PlayerJoin;
  const masterTouchLocked = new Date() >= MASTER_TOUCH_LOCK_DATE;

  const totalPreds = (predCount as unknown as { count: number } | null)?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <UserAvatar displayName={profile.display_name} avatarUrl={profile.avatar_url ?? undefined} size={80} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {profile.display_name}
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{profile.email}</p>
          {profile.favorite_team && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="mr-1">❤</span>{profile.favorite_team}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">{profile.bio}</p>
          )}
        </div>
        <Link href="/perfil/editar" className="shrink-0 text-xs font-semibold text-slate-400 hover:text-wc-red transition-colors mt-1">
          Editar
        </Link>
      </div>

      {/* Stats */}
      <div className="bg-wc-navy rounded-2xl px-5 py-4 text-white">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-4xl font-black text-wc-gold">{profile.total_points}</p>
            <p className="text-sm text-slate-400 mt-1">Puntos totales</p>
          </div>
          <div>
            <p className="text-4xl font-black text-white">{totalPreds}</p>
            <p className="text-sm text-slate-400 mt-1">Pronósticos</p>
          </div>
        </div>
      </div>

      {/* Pronósticos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-5">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          Mis Pronósticos
        </p>
        {totalPreds > 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tenés <strong>{totalPreds}</strong> pronóstico{totalPreds !== 1 ? "s" : ""} registrado{totalPreds !== 1 ? "s" : ""}.
          </p>
        ) : (
          <p className="text-sm text-slate-400">Todavía no tenés pronósticos.</p>
        )}
        <Link href="/mis-pronosticos" className="inline-block mt-2 text-xs text-wc-red font-semibold hover:underline">
          Ver mis pronósticos →
        </Link>
      </div>

      {/* Toque Maestro */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-5">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          ⭐ Toque Maestro
        </p>
        {mt ? (
          <div className="space-y-3">
            {champion && (
              <div className="flex items-center gap-3">
                <TeamFlag countryCode={champion.country_code} name={champion.name} size={28} />
                <div>
                  <p className="text-xs text-slate-400">Campeón</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{champion.name}</p>
                </div>
              </div>
            )}
            {runnerUp && (
              <div className="flex items-center gap-3">
                <TeamFlag countryCode={runnerUp.country_code} name={runnerUp.name} size={28} />
                <div>
                  <p className="text-xs text-slate-400">Subcampeón</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{runnerUp.name}</p>
                </div>
              </div>
            )}
            {goldenBoot && (
              <div className="flex items-center gap-3">
                <TeamFlag countryCode={goldenBoot.teams?.country_code ?? ""} name={goldenBoot.name} size={28} />
                <div>
                  <p className="text-xs text-slate-400">Bota de Oro</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{goldenBoot.name}</p>
                </div>
              </div>
            )}
            {!masterTouchLocked && (
              <Link href="/toque-maestro" className="inline-block text-xs text-wc-red font-semibold hover:underline pt-1">
                Editar →
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400">No has completado tu Toque Maestro todavía.</p>
            <Link href="/toque-maestro" className="text-xs text-wc-red font-semibold hover:underline mt-1 inline-block">
              Completarlo ahora →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
