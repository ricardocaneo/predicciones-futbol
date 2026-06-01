import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TeamFlag from "@/components/TeamFlag";
import MatchCard from "@/components/MatchCard";
import { rowToMatch, type MatchRow as MapperMatchRow } from "@/lib/supabase/match-mapper";

// ─── Types ───────────────────────────────────────────────────────────────────

type StandingRow = {
  team_id: string;
  group_id: string;
  draw_order: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  teams: { id: string; name: string; country_code: string } | null;
};

type DbMatchRow = {
  id: string;
  phase: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  minute: number | null;
};

type ScorerRow = {
  id: string;
  goals: number;
  assists: number;
  matches_played: number;
  penalties: number;
  players: { id: string; name: string; team_id: string } | null;
};

type PlayerRow = {
  id: string;
  name: string;
  position: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortStandings(rows: StandingRow[]): (StandingRow & { _pos: number })[] {
  return [...rows]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goals_for - a.goals_against;
      const gdB = b.goals_for - b.goals_against;
      if (gdB !== gdA) return gdB - gdA;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return (a.draw_order ?? 99) - (b.draw_order ?? 99);
    })
    .map((s, i) => ({ ...s, _pos: i + 1 }));
}

const POSITION_LABEL: Record<string, string> = {
  GK: "Porteros", DEF: "Defensas", MID: "Mediocampistas", FWD: "Delanteros",
  goalkeeper: "Porteros", defender: "Defensas", midfielder: "Mediocampistas", forward: "Delanteros",
};

const POSITION_ORDER: Record<string, number> = {
  GK: 0, goalkeeper: 0,
  DEF: 1, defender: 1,
  MID: 2, midfielder: 2,
  FWD: 3, forward: 3,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-black tabular-nums ${highlight ? "text-wc-red" : "text-slate-900 dark:text-white"}`}>
        {value}
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}

function GroupMiniTable({
  standings,
  focusedTeamId,
}: {
  standings: (StandingRow & { _pos: number })[];
  focusedTeamId: string;
}) {
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
            <th className="text-center px-1.5 py-1.5 w-8 font-medium">DG</th>
            <th className="text-center px-1.5 py-1.5 w-8 font-bold text-slate-600 dark:text-slate-300">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const isFocused = s.team_id === focusedTeamId;
            const isQ = s._pos <= 2;
            const gd = s.goals_for - s.goals_against;
            return (
              <tr
                key={s.team_id}
                className={`border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${
                  isFocused
                    ? "bg-wc-red/5 dark:bg-wc-red/10 border-l-2 border-l-wc-red"
                    : isQ
                    ? "border-l-2 border-l-green-500"
                    : "border-l-2 border-l-transparent"
                }`}
              >
                <td className="px-2 py-2 text-center">
                  <span className={`font-bold ${isQ ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                    {s._pos}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <Link href={`/equipos/${s.team_id}`} className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
                    <TeamFlag countryCode={s.teams?.country_code ?? ""} name={s.teams?.name ?? ""} size={16} />
                    <span className={`font-medium truncate max-w-20 ${isFocused ? "text-slate-900 dark:text-white font-black" : "text-slate-700 dark:text-slate-200"}`}>
                      {s.teams?.name ?? "—"}
                    </span>
                  </Link>
                </td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.played}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.won}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.drawn}</td>
                <td className="px-1.5 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{s.lost}</td>
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EquipoPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const [
    { data: myStanding },
    { data: groupData },
    { data: matchData },
    { data: scorerData },
    { data: playersData },
  ] = await Promise.all([
    supabase
      .from("group_standings")
      .select("team_id, group_id, draw_order, played, won, drawn, lost, goals_for, goals_against, points, teams(id, name, country_code)")
      .eq("team_id", teamId)
      .single(),

    supabase
      .from("worldcup_groups")
      .select("id, name"),

    supabase
      .from("matches")
      .select("id, phase, group_name, home_team, away_team, starts_at, status, home_score, away_score, home_team_id, away_team_id, minute")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order("starts_at", { ascending: true }),

    supabase
      .from("top_scorers")
      .select("id, goals, assists, matches_played, penalties, players(id, name, team_id)")
      .order("goals", { ascending: false })
      .limit(200),

    supabase
      .from("players")
      .select("id, name, position")
      .eq("team_id", teamId)
      .order("name"),
  ]);

  if (!myStanding) notFound();

  // Group letter
  const groupLetterMap = new Map<string, string>((groupData ?? []).map((g) => [g.id, g.name]));
  const groupLetter = groupLetterMap.get(myStanding.group_id) ?? myStanding.group_id;

  // All standings in this group
  const { data: groupStandingData } = await supabase
    .from("group_standings")
    .select("team_id, group_id, draw_order, played, won, drawn, lost, goals_for, goals_against, points, teams(id, name, country_code)")
    .eq("group_id", myStanding.group_id);

  const groupStandings = sortStandings((groupStandingData ?? []) as unknown as StandingRow[]);
  const myPos = groupStandings.find((s) => s.team_id === teamId)?._pos ?? 0;

  const standing = myStanding as unknown as StandingRow;
  const team = standing.teams;
  const matches = ((matchData ?? []) as unknown as DbMatchRow[]).map((row) =>
    rowToMatch(row as unknown as MapperMatchRow)
  );
  const scorers = ((scorerData ?? []) as unknown as ScorerRow[]).filter(
    (s) => (s.players as unknown as { team_id?: string } | null)?.team_id === teamId
  );
  const players = (playersData ?? []) as unknown as PlayerRow[];

  // Group players by position
  const byPosition = new Map<string, PlayerRow[]>();
  for (const p of players) {
    const pos = p.position ?? "SIN POSICIÓN";
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)!.push(p);
  }
  const positionGroups = [...byPosition.entries()].sort(
    ([a], [b]) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99)
  );

  const gd = standing.goals_for - standing.goals_against;
  const posLabel = myPos ? `${myPos}°` : "—";

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/tabla-mundialera"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        ← Tabla mundialera
      </Link>

      {/* Hero */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex items-center gap-5">
        <TeamFlag countryCode={team?.country_code ?? ""} name={team?.name ?? ""} size={64} shape="rect" />
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {team?.name ?? "Equipo"}
          </h1>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Grupo {groupLetter}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Posición en el grupo
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 divide-x divide-slate-100 dark:divide-slate-800">
          <StatBox label="Pos." value={posLabel} highlight />
          <StatBox label="Pts"  value={standing.points} highlight />
          <StatBox label="PJ"   value={standing.played} />
          <StatBox label="G"    value={standing.won} />
          <StatBox label="E"    value={standing.drawn} />
          <StatBox label="P"    value={standing.lost} />
          <StatBox label="GF"   value={standing.goals_for} />
          <StatBox label="GC"   value={standing.goals_against} />
        </div>
        {standing.played > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
            Diferencia de gol: {gd > 0 ? `+${gd}` : gd}
          </p>
        )}
      </div>

      {/* Group table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Grupo {groupLetter}
          </h2>
        </div>
        <GroupMiniTable standings={groupStandings} focusedTeamId={teamId} />
      </div>

      {/* Matches */}
      {matches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Partidos
          </h2>
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {/* Squad */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Plantel
          </h2>
        </div>
        {players.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">
            Plantel pendiente de actualización oficial.
          </p>
        ) : positionGroups.length > 0 && positionGroups[0][0] !== "SIN POSICIÓN" ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {positionGroups.map(([pos, group]) => (
              <div key={pos} className="px-4 py-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {POSITION_LABEL[pos] ?? pos}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {group.map((p) => (
                    <span key={p.id} className="text-sm text-slate-700 dark:text-slate-200 truncate py-0.5">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {players.map((p) => (
                <span key={p.id} className="text-sm text-slate-700 dark:text-slate-200 truncate py-0.5">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scorers */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">Goleadores</h2>
        </div>
        {scorers.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">Sin goles aún.</p>
        ) : (
          <div className="px-4 pb-3 divide-y divide-slate-50 dark:divide-slate-800/50">
            {scorers.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl font-black tabular-nums text-slate-900 dark:text-white w-8 text-center">
                  {s.goals}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {s.players?.name ?? "—"}
                  </p>
                  {s.assists > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {s.assists} asistencia{s.assists !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {s.penalties > 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                    {s.penalties} pen.
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
