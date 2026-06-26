import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABELS } from "@/lib/scoring-rules";
import { teamToCountryCode } from "@/lib/country-codes";
import TeamFlag from "@/components/TeamFlag";
import type { TournamentPhase } from "@/lib/types";

const PHASE_ORDER: TournamentPhase[] = [
  "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final",
];

const PH_RE = /^(Winner|Runner.up|Loser|3rd|Mejor|Por definir|G\.)/i;

function isPlaceholder(name: string) {
  return PH_RE.test(name.trim());
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", {
    day: "numeric", month: "short", timeZone: "America/Santiago",
  });
}

type KMatch = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  starts_at: string;
};

function MatchRow({ match }: { match: KMatch }) {
  const isFinished = match.status === "finished";
  const isLive     = match.status === "live";
  const homePH     = isPlaceholder(match.home_team);
  const awayPH     = isPlaceholder(match.away_team);

  const hasScore   = match.home_score !== null && match.away_score !== null;
  const homeWins   = hasScore && match.home_score! > match.away_score!;
  const awayWins   = hasScore && match.away_score! > match.home_score!;

  return (
    <div className={`rounded-xl overflow-hidden ${
      isFinished
        ? "bg-slate-50 dark:bg-slate-800/40"
        : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
    }`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Local */}
        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
          <span className={`text-sm truncate text-right ${
            homePH
              ? "text-slate-400 dark:text-slate-500 italic text-xs"
              : isFinished && homeWins
              ? "font-bold text-slate-900 dark:text-white"
              : "font-medium text-slate-700 dark:text-slate-200"
          }`}>
            {match.home_team}
          </span>
          {!homePH && <TeamFlag countryCode={teamToCountryCode(match.home_team)} name={match.home_team} size={16} shape="rect" />}
        </div>

        {/* Marcador / separador */}
        <div className="shrink-0 min-w-15 text-center">
          {isLive && hasScore ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-black text-lg tabular-nums text-slate-900 dark:text-white">
                {match.home_score} – {match.away_score}
              </span>
              <span className="text-xs font-bold text-green-500 leading-none">EN VIVO</span>
            </div>
          ) : isFinished && hasScore ? (
            <span className="font-black text-lg tabular-nums text-slate-900 dark:text-white">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 font-medium text-sm">vs</span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {!awayPH && <TeamFlag countryCode={teamToCountryCode(match.away_team)} name={match.away_team} size={16} shape="rect" />}
          <span className={`text-sm truncate ${
            awayPH
              ? "text-slate-400 dark:text-slate-500 italic text-xs"
              : isFinished && awayWins
              ? "font-bold text-slate-900 dark:text-white"
              : "font-medium text-slate-700 dark:text-slate-200"
          }`}>
            {match.away_team}
          </span>
        </div>
      </div>

      {!isFinished && (
        <div className="px-3 pb-2 -mt-1 text-right">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatDate(match.starts_at)}
          </span>
        </div>
      )}
    </div>
  );
}

export default async function KnockoutView() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, status, starts_at, phase")
    .neq("phase", "group")
    .order("starts_at", { ascending: true });

  const all = data ?? [];

  const byPhase = new Map<TournamentPhase, KMatch[]>();
  for (const m of all) {
    const phase = m.phase as TournamentPhase;
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    byPhase.get(phase)!.push(m as KMatch);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 flex-1">
          Los cruces se definen al finalizar la fase de grupos. El bracket sigue la estructura oficial del sorteo FIFA.
        </p>
        <Link
          href="/tabla-mundialera/bracket"
          className="ml-3 shrink-0 flex items-center gap-1.5 text-xs font-semibold text-wc-red hover:text-wc-red/80 transition-colors"
        >
          Ver diagrama
          <span aria-hidden>→</span>
        </Link>
      </div>

      {PHASE_ORDER.map((phase) => {
        const matches = byPhase.get(phase) ?? [];
        if (matches.length === 0) return null;
        const finished = matches.filter(m => m.status === "finished").length;
        return (
          <section key={phase}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight uppercase">
                {PHASE_LABELS[phase]}
              </h2>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                {finished}/{matches.length}
              </span>
            </div>
            <div className="space-y-2">
              {matches.map(m => <MatchRow key={m.id} match={m} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
