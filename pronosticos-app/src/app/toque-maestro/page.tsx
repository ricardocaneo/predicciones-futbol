import { createClient } from "@/lib/supabase/server";
import { canEditMasterTouch } from "@/lib/scoring";
import { MASTER_TOUCH_POINTS, MASTER_TOUCH_LOCK_DATE } from "@/lib/scoring-rules";
import MasterTouchForm from "@/components/MasterTouchForm";
import type { Team, Player } from "@/types";

type TeamRow = {
  id: string;
  name: string;
  short_name: string | null;
  country_code: string;
};

type PlayerRow = {
  id: string;
  name: string;
  team_id: string;
  teams: { country_code: string } | null;
};

type PredictionRow = {
  champion_team_id:      string | null;
  runner_up_team_id:     string | null;
  golden_boot_player_id: string | null;
};

export default async function ToqueMaestroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: teamRows }, { data: playerRows1 }, { data: playerRows2 }, { data: predRow }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, short_name, country_code")
      .order("name", { ascending: true }),

    supabase
      .from("players")
      .select("id, name, team_id, teams(country_code)")
      .order("name", { ascending: true })
      .range(0, 999),

    supabase
      .from("players")
      .select("id, name, team_id, teams(country_code)")
      .order("name", { ascending: true })
      .range(1000, 1999),

    user
      ? supabase
          .from("toque_maestro_predictions")
          .select("champion_team_id, runner_up_team_id, golden_boot_player_id")
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const playerRows = [...(playerRows1 ?? []), ...(playerRows2 ?? [])];

  const teams: Team[] = (teamRows ?? []).map((r: TeamRow) => ({
    id:          r.id,
    name:        r.name,
    shortName:   r.short_name ?? undefined,
    countryCode: r.country_code,
  }));

  const players: Player[] = (playerRows ?? []).map((r) => {
    const row = r as unknown as PlayerRow;
    return {
      id:          row.id,
      name:        row.name,
      teamId:      row.team_id,
      countryCode: row.teams?.country_code ?? "",
    };
  });

  const pred = predRow as PredictionRow | null;
  const initial = {
    userId:             user?.id ?? "",
    championTeamId:     pred?.champion_team_id      ?? undefined,
    runnerUpTeamId:     pred?.runner_up_team_id     ?? undefined,
    goldenBootPlayerId: pred?.golden_boot_player_id ?? undefined,
  };

  const canEdit    = !!user && canEditMasterTouch();
  const isLoggedIn = !!user;

  const lockDateLabel = MASTER_TOUCH_LOCK_DATE.toLocaleDateString("es", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires",
  });

  const totalPossible =
    MASTER_TOUCH_POINTS.champion +
    MASTER_TOUCH_POINTS.runnerUp +
    MASTER_TOUCH_POINTS.goldenBoot;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-wc-navy rounded-2xl px-6 py-7 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-wc-gold font-bold text-xs uppercase tracking-widest mb-2">
            Hasta {totalPossible} pts en juego
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            Toque<br />Maestro
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Predice el campeón, el subcampeón y la bota de oro del Mundial
          </p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[80px] opacity-[0.07] select-none pointer-events-none">
          ⭐
        </div>
      </div>

      {/* Points breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Campeón",    pts: MASTER_TOUCH_POINTS.champion   },
          { label: "Subcampeón", pts: MASTER_TOUCH_POINTS.runnerUp   },
          { label: "Bota de Oro",pts: MASTER_TOUCH_POINTS.goldenBoot },
        ].map(({ label, pts }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-center">
            <p className="text-xl font-black text-wc-gold">+{pts}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        {!isLoggedIn ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-2xl">🔐</p>
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Inicia sesión para participar
            </p>
            <p className="text-sm text-slate-400">
              Tu Toque Maestro se guarda hasta el {lockDateLabel}
            </p>
          </div>
        ) : (
          <MasterTouchForm
            teams={teams}
            players={players}
            initial={initial}
            canEdit={canEdit}
            lockDateLabel={lockDateLabel}
          />
        )}
      </div>
    </div>
  );
}
