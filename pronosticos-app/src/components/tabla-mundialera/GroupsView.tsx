import { createAdminClient } from "@/lib/supabase/server";
import TeamFlag from "@/components/TeamFlag";
import Link from "next/link";

type StandingRow = {
  team_id:      string;
  group_id:     string;
  position?:    number;   // calculado en JS
  draw_order:   number;   // orden del sorteo oficial (1 = cabeza de serie)
  played:       number;
  won:          number;
  drawn:        number;
  lost:         number;
  goals_for:    number;
  goals_against: number;
  points:       number;
  teams: { id: string; name: string; country_code: string } | null;
};

type MatchRow = {
  id:           string;
  group_name:   string | null;
  home_team:    string;
  away_team:    string;
  starts_at:    string;
  status:       string;
  home_score:   number | null;
  away_score:   number | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type WCGroup = { id: string; name: string };

type GroupInfo = { id: string; letter: string; standings: StandingRow[] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric", month: "short", timeZone: "America/Santiago",
  });
}

function StandingsTable({ standings, codeMap }: { standings: StandingRow[]; codeMap: Map<string, string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <th className="text-left px-2 py-1.5 w-6 font-medium">#</th>
            <th className="text-left px-2 py-1.5 font-medium">Equipo</th>
            <th className="text-center px-1.5 py-1.5 w-7 font-medium">PJ</th>
            <th className="text-center px-1.5 py-1.5 w-7 font-medium">G</th>
            <th className="text-center px-1.5 py-1.5 w-7 font-medium">E</th>
            <th className="text-center px-1.5 py-1.5 w-7 font-medium">P</th>
            <th className="text-center px-1.5 py-1.5 w-7 font-medium">GF</th>
            <th className="text-center px-1.5 py-1.5 w-7 font-medium">GC</th>
            <th className="text-center px-1.5 py-1.5 w-8 font-medium">DG</th>
            <th className="text-center px-1.5 py-1.5 w-8 font-bold text-slate-600 dark:text-slate-300">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isDirectQ   = (s.position ?? 0) <= 2;
            const isBestThird = s.position === 3;
            const gd          = s.goals_for - s.goals_against;
            const cc          = s.teams?.country_code ?? codeMap.get(s.team_id) ?? "";
            return (
              <tr
                key={s.team_id ?? i}
                className={`border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${
                  isDirectQ
                    ? "border-l-2 border-l-green-500 bg-green-50/60 dark:bg-green-900/10"
                    : isBestThird
                    ? "border-l-2 border-l-amber-400 bg-amber-50/60 dark:bg-amber-900/10"
                    : "border-l-2 border-l-transparent"
                }`}
              >
                <td className="px-2 py-2 text-center">
                  <span className={`font-bold ${isDirectQ ? "text-green-600 dark:text-green-400" : isBestThird ? "text-amber-500" : "text-slate-400"}`}>
                    {s.position}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <Link href={`/equipos/${s.team_id}`} className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
                    <TeamFlag countryCode={cc} name={s.teams?.name ?? ""} size={18} />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-22.5">
                      {s.teams?.name ?? "—"}
                    </span>
                  </Link>
                </td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.played}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.won}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.drawn}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.lost}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.goals_for}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.goals_against}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="px-1.5 py-2 text-center tabular-nums font-black text-slate-900 dark:text-white">
                  {s.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatchRow({ match, codeMap }: { match: MatchRow; codeMap: Map<string, string> }) {
  const isFinished = match.status === "finished";
  const homeCode   = match.home_team_id ? codeMap.get(match.home_team_id) ?? "" : "";
  const awayCode   = match.away_team_id ? codeMap.get(match.away_team_id) ?? "" : "";
  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-lg">
      <TeamFlag countryCode={homeCode} name={match.home_team} size={16} />
      {match.home_team_id ? (
        <Link href={`/equipos/${match.home_team_id}`} className="flex-1 text-right font-medium text-slate-700 dark:text-slate-200 truncate min-w-0 hover:opacity-75">
          {match.home_team}
        </Link>
      ) : (
        <span className="flex-1 text-right font-medium text-slate-700 dark:text-slate-200 truncate min-w-0">{match.home_team}</span>
      )}
      <span className="shrink-0 font-black tabular-nums text-slate-900 dark:text-white min-w-11 text-center">
        {isFinished ? `${match.home_score} – ${match.away_score}` : "vs"}
      </span>
      {match.away_team_id ? (
        <Link href={`/equipos/${match.away_team_id}`} className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate min-w-0 hover:opacity-75">
          {match.away_team}
        </Link>
      ) : (
        <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate min-w-0">{match.away_team}</span>
      )}
      <TeamFlag countryCode={awayCode} name={match.away_team} size={16} />
      <span className="shrink-0 text-slate-400 dark:text-slate-500 ml-1 hidden sm:inline">
        {formatDate(match.starts_at)}
      </span>
    </div>
  );
}

function GroupCard({ group, matches, codeMap }: { group: GroupInfo; matches: MatchRow[]; codeMap: Map<string, string> }) {
  const finished = matches.filter((m) => m.status === "finished");
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
          Grupo {group.letter}
        </h2>
      </div>
      <StandingsTable standings={group.standings} codeMap={codeMap} />
      {finished.length > 0 && (
        <div className="px-3 pb-3 pt-2 space-y-1 border-t border-slate-100 dark:border-slate-800 mt-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1.5">Resultados</p>
          {finished.map((m) => <MatchRow key={m.id} match={m} codeMap={codeMap} />)}
        </div>
      )}
    </div>
  );
}

export default async function GroupsView() {
  const supabase = createAdminClient();

  const [
    { data: groupData,    error: groupErr    },
    { data: standingData, error: standingErr },
    { data: matchData },
  ] = await Promise.all([
    supabase
      .from("worldcup_groups")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("group_standings")
      .select("team_id, group_id, draw_order, played, won, drawn, lost, goals_for, goals_against, points, teams(id, name, country_code)")
      .order("group_id", { ascending: true })
      .limit(200),
    supabase
      .from("matches")
      .select("id, group_name, home_team, away_team, starts_at, status, home_score, away_score, home_team_id, away_team_id")
      .eq("phase", "group")
      .order("starts_at", { ascending: true }),
  ]);

  // Debug: mostrar errores si los hay
  if (groupErr || standingErr) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400 space-y-1">
        {groupErr    && <p><strong>worldcup_groups:</strong> {groupErr.message}</p>}
        {standingErr && <p><strong>group_standings:</strong> {standingErr.message}</p>}
      </div>
    );
  }

  const wcGroups     = (groupData    ?? []) as WCGroup[];
  const allStandings = (standingData ?? []) as unknown as StandingRow[];
  const allMatches   = (matchData    ?? []) as unknown as MatchRow[];

  // UUID → letra del grupo  (worldcup_groups.id → worldcup_groups.name)
  const groupLetterMap = new Map<string, string>(wcGroups.map((g) => [g.id, g.name]));

  // team_id → country_code (para banderas en partidos)
  const codeMap = new Map<string, string>();
  for (const s of allStandings) {
    if (s.team_id && s.teams?.country_code) codeMap.set(s.team_id, s.teams.country_code);
  }

  // Agrupar standings por group_id y calcular posición en JS
  const groupMap = new Map<string, GroupInfo>();
  for (const s of allStandings) {
    const letter = groupLetterMap.get(s.group_id) ?? s.group_id;
    if (!groupMap.has(s.group_id)) {
      groupMap.set(s.group_id, { id: s.group_id, letter, standings: [] });
    }
    groupMap.get(s.group_id)!.standings.push(s);
  }

  // Ordenar equipos dentro de cada grupo y asignar posición
  for (const group of groupMap.values()) {
    group.standings.sort((a, b) => {
      // Estadísticas primero (cuando hay partidos jugados)
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goals_for - a.goals_against;
      const gdB = b.goals_for - b.goals_against;
      if (gdB !== gdA)           return gdB - gdA;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      // Tiebreaker final: orden del sorteo (cabeza de serie primero)
      return (a.draw_order ?? 99) - (b.draw_order ?? 99);
    });
    group.standings.forEach((s, i) => { s.position = i + 1; });
  }

  // Ordenar grupos por letra A→L
  const groups = [...groupMap.values()].sort((a, b) => a.letter.localeCompare(b.letter));

  // Mejor tercero
  const thirds = allStandings
    .filter((s) => s.position === 3)
    .sort((a, b) => {
      const gdA = a.goals_for - a.goals_against;
      const gdB = b.goals_for - b.goals_against;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA)           return gdB - gdA;
      return b.goals_for - a.goals_for;
    });

  // Mostrar diagnóstico si aún no hay grupos armados pero sí datos parciales
  if (groups.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm space-y-1 text-amber-800 dark:text-amber-300">
        <p className="font-semibold">Diagnóstico de datos:</p>
        <p>worldcup_groups: {wcGroups.length} filas</p>
        <p>group_standings: {allStandings.length} filas</p>
        <p>matches (group): {allMatches.length} filas</p>
        {wcGroups.length > 0 && <p>Grupos: {wcGroups.map(g => `${g.name}(${g.id.slice(0,8)})`).join(", ")}</p>}
        {allStandings.length > 0 && <p>Primer group_id en standings: {allStandings[0].group_id}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0" />
          Clasificado directo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
          Posible mejor tercero
        </span>
      </div>

      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          matches={allMatches.filter((m) => m.group_name === group.letter)}
          codeMap={codeMap}
        />
      ))}

      {thirds.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-sm font-black text-amber-700 dark:text-amber-400">Mejores terceros</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Clasifican los 8 mejores de 12 grupos</span>
          </div>
          <div className="space-y-2">
            {thirds.map((t, i) => {
              const gd     = t.goals_for - t.goals_against;
              const cc     = t.teams?.country_code ?? codeMap.get(t.team_id) ?? "";
              const letter = groupLetterMap.get(t.group_id) ?? "";
              return (
                <div key={t.team_id ?? i} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    i < 8 ? "bg-amber-400 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}>{i + 1}</span>
                  <TeamFlag countryCode={cc} name={t.teams?.name ?? ""} size={20} />
                  <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{t.teams?.name ?? "—"}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Grupo {letter}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {t.points} pts · DG {gd > 0 ? `+${gd}` : gd}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Clasificación provisional hasta completar la fase grupal.
          </p>
        </div>
      )}
    </div>
  );
}
